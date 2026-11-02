import { Request, Response } from "express";
import { Types } from "mongoose";
import { ComplianceRecord } from "../models/ComplianceRisk";
import { Case } from "../models/Case";
import { CaseHearingHistory } from "../models/CaseHearingHistory";
import { User } from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";
import { NotificationService } from "../services/notificationService";
import { logAuditEvent } from "../utils/auditLogger";
import { renderPdfDocument } from "../utils/pdfTemplate";

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

// Internal Helper to compute Stays + Metrics across ComplianceRecord & Active Case flags
const buildUnifiedStaysData = async () => {
  const today = new Date();

  // 1. Fetch compliance records
  const complianceStays = await ComplianceRecord.find({
    recordType: "STAY",
    status: "ACTIVE",
  })
    .sort({ stayOrderDate: -1 })
    .lean();

  // 2. Fetch Cases with active stay flag (hybrid safety)
  const caseStays = await Case.find({
    $or: [{ hasActiveStay: true }, { judicialStatus: "STAY_IN_FORCE" }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  const existingCaseIds = new Set(complianceStays.map((s) => s.caseId?.toString()));
  const combinedList: any[] = [];

  for (const item of complianceStays) {
    const orderDate = item.stayOrderDate ? new Date(item.stayOrderDate) : today;
    const stayDurationDays = Math.max(
      0,
      Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    let daysRemainingForVacation = 999;
    if (item.vacationDeadline) {
      daysRemainingForVacation = Math.floor(
        (new Date(item.vacationDeadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    combinedList.push({
      _id: item._id.toString(),
      caseId: item.caseId ? item.caseId.toString() : item._id.toString(),
      caseAndCnr: {
        writNumber: item.writNumber || item.fileNo || "Writ Matter",
        cnrNumber: item.cnrNumber || "Unassigned",
        fileNo: item.fileNo,
      },
      courtAndCoram: {
        court: item.court || "High Court of Judicature at Allahabad",
        coram: item.coramBench || "Hon'ble Bench",
      },
      stayOrderScope: item.stayOrderScope || "Interim stay in force on finalization of selection list.",
      orderDateAndDuration: {
        orderDate: orderDate.toISOString(),
        stayDurationDays,
      },
      vacationMotionStatus: item.vacationMotionStatus || "URGENT ACTION REQUIRED",
      vacationDeadline: item.vacationDeadline ? new Date(item.vacationDeadline).toISOString() : new Date(today.getTime() + 14 * 86400000).toISOString(),
      daysRemainingForVacation,
      oic: item.oicName || "SP Legal",
    });
  }

  for (const c of caseStays) {
    if (!existingCaseIds.has(c._id.toString())) {
      const orderDate = c.updatedAt || c.createdAt || today;
      const stayDurationDays = Math.max(
        0,
        Math.floor((today.getTime() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24))
      );

      const deadlineDate = new Date(new Date(orderDate).getTime() + 14 * 24 * 60 * 60 * 1000);
      const daysRemainingForVacation = Math.floor(
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      combinedList.push({
        _id: c._id.toString(),
        caseId: c._id.toString(),
        caseAndCnr: {
          writNumber: c.writNumber || "Awaiting Allotment",
          cnrNumber: c.cnrNumber || "Unassigned",
          fileNo: c.fileNo,
        },
        courtAndCoram: {
          court: c.court || "High Court of Judicature at Allahabad",
          coram: c.coramBench || c.courtRoomNo || "Hon'ble Bench",
        },
        stayOrderScope: c.stayScope || c.disputeSubject || "Interim stay on finalization of selection list.",
        orderDateAndDuration: {
          orderDate: new Date(orderDate).toISOString(),
          stayDurationDays,
        },
        vacationMotionStatus: (c as any).vacationMotionStatus || "URGENT ACTION REQUIRED",
        vacationDeadline: deadlineDate.toISOString(),
        daysRemainingForVacation,
        oic: c.assignedOIC || "Nodal Legal Desk",
      });
    }
  }

  let motionsDueCount = 0;
  let filedCount = 0;
  let totalStayDays = 0;

  for (const s of combinedList) {
    totalStayDays += s.orderDateAndDuration.stayDurationDays;
    if (s.vacationMotionStatus === "VACATION_FILED" || s.vacationMotionStatus === "LISTED FOR ARGUMENTS") {
      filedCount++;
    }
    if (s.daysRemainingForVacation <= 7 && s.daysRemainingForVacation >= 0) {
      motionsDueCount++;
    }
  }

  const averageStayDurationDays = combinedList.length > 0 ? Math.round(totalStayDays / combinedList.length) : 0;

  return {
    data: combinedList,
    metrics: {
      totalActiveStays: combinedList.length,
      vacationMotionsDueUnder7Days: motionsDueCount,
      vacationApplicationsFiled: filedCount,
      averageStayDurationDays,
    },
  };
};

/**
 * 5.1 Active Stays Roster — Metrics, Duration & Vacation Deadlines
 */
export const getActiveStaysRoster = async (req: Request, res: Response) => {
  try {
    const { data, metrics } = await buildUnifiedStaysData();
    return res.status(200).json({
      success: true,
      metrics,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Register Stay Order Directly or from Intake
 */
export const registerStayOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      stayOrderScope,
      stayOrderDate,
      vacationDeadline,
      vacationMotionStatus,
      oicName,
      actionMappingId,
      courtDecisionOutcome,
    } = req.body;

    const targetCaseId = getParam(caseId);

    const caseDoc = await Case.findById(targetCaseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const orderDate = stayOrderDate ? new Date(stayOrderDate) : new Date();
    const defaultDeadline = new Date(orderDate);
    defaultDeadline.setDate(defaultDeadline.getDate() + 14);

    const record = await ComplianceRecord.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      writNumber: caseDoc.writNumber,
      cnrNumber: caseDoc.cnrNumber,
      court: caseDoc.court,
      courtId: caseDoc.courtId,
      coramBench: caseDoc.coramBench,
      petitionerName: caseDoc.leadPetitioner,
      oicName: oicName || caseDoc.assignedOIC,
      recordType: "STAY",
      actionMappingId: actionMappingId ? new Types.ObjectId(actionMappingId) : undefined,
      courtDecisionOutcome: courtDecisionOutcome || "Interim Stay on Selection List",
      stayOrderScope: stayOrderScope || "Interim stay in operation",
      stayOrderDate: orderDate,
      vacationDeadline: vacationDeadline ? new Date(vacationDeadline) : defaultDeadline,
      vacationMotionStatus: vacationMotionStatus || "URGENT ACTION REQUIRED",
      severityLevel: "CRITICAL",
      status: "ACTIVE",
    });

    caseDoc.hasActiveStay = true;
    caseDoc.stayScope = stayOrderScope || record.stayOrderScope;
    caseDoc.stayGrantedDate = orderDate;
    caseDoc.stayVacationDueDate = record.vacationDeadline;
    caseDoc.judicialStatus = "STAY_IN_FORCE";
    await caseDoc.save();

    await CaseHearingHistory.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      hearingDate: orderDate,
      businessRecorded: `Interim Stay granted: ${record.stayOrderScope}. Vacation due by ${record.vacationDeadline?.toLocaleDateString("en-GB")}`,
      orderType: "STAY_GRANTED",
      source: "MANUAL_ENTRY",
      enteredByUserId: req.user?.id,
      enteredByOfficerName: req.user?.name || "Judicial Desk",
      enteredByDesignation: req.user?.designation || "Compliance Cell",
    });

    const targetUserId = caseDoc.internalHold?.currentHolderId || req.user?.id;
    if (targetUserId) {
      NotificationService.sendNotification({
        recipientId: targetUserId,
        caseId: caseDoc._id,
        fileNo: caseDoc.fileNo,
        type: "STAY_ALERT",
        title: `Interim Stay Granted in ${caseDoc.writNumber || caseDoc.fileNo}`,
        message: `High Court granted interim stay: ${record.stayOrderScope}. Vacation deadline initiated.`,
        isUrgent: true,
        senderName: req.user?.name || "Judicial Registry Desk",
        senderDesignation: "Compliance Cell",
        extraMeta: {
          writNo: caseDoc.writNumber,
          stayScope: record.stayOrderScope,
          vacationDeadline: record.vacationDeadline
            ? record.vacationDeadline.toLocaleDateString("en-GB")
            : "14 Days",
        },
      }).catch((err) => console.error("[Stay Notification Error]:", err.message));
    }

    await logAuditEvent(
      req,
      "STAY_ORDER_REGISTERED" as any,
      "COMPLIANCE",
      caseDoc._id.toString(),
      { fileNo: caseDoc.fileNo, scope: record.stayOrderScope },
      "WARNING"
    );

    return res.status(201).json({
      success: true,
      message: "Stay order registered in Active Stays Roster.",
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update Article 226(3) Vacation Motion Status
 */
export const updateVacationMotion = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const { vacationMotionStatus, vacationFilingDate } = req.body;

    let record = await ComplianceRecord.findById(id);

    // If ID belongs directly to a Case docket instead of ComplianceRecord
    if (!record) {
      const caseDoc = await Case.findById(id);
      if (caseDoc) {
        (caseDoc as any).vacationMotionStatus = vacationMotionStatus || "VACATION_FILED";
        if (vacationFilingDate) {
          (caseDoc as any).vacationFilingDate = new Date(vacationFilingDate);
        }
        await caseDoc.save();

        return res.status(200).json({
          success: true,
          message: "Vacation motion status updated on Case record.",
          data: caseDoc,
        });
      }
      return res.status(404).json({ success: false, message: "Stay record not found." });
    }

    if (vacationMotionStatus) record.vacationMotionStatus = vacationMotionStatus;
    if (vacationFilingDate) record.vacationFilingDate = new Date(vacationFilingDate);
    await record.save();

    await Case.findByIdAndUpdate(record.caseId, {
      $set: { vacationMotionStatus: record.vacationMotionStatus },
    });

    await logAuditEvent(
      req,
      "VACATION_MOTION_UPDATED" as any,
      "COMPLIANCE",
      record.caseId.toString(),
      { fileNo: record.fileNo, vacationMotionStatus },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: "Vacation motion status updated.",
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5.1.3 Export Active Stays MIS (Clean B&W PDF Sheet)
 */
export const exportStaysPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { data, metrics } = await buildUnifiedStaysData();

    const rowsHtml = data
      .map(
        (s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: 700;">${s.caseAndCnr.fileNo}</td>
        <td style="font-weight: 700;">${s.caseAndCnr.writNumber}</td>
        <td>${s.courtAndCoram.court}</td>
        <td style="line-height: 1.35;">${s.stayOrderScope}</td>
        <td style="text-align: center; font-weight: 700;">${s.orderDateAndDuration.stayDurationDays} Days</td>
        <td style="font-weight: 700;">${s.vacationMotionStatus}</td>
        <td style="font-size: 8.5px;">${new Date(s.vacationDeadline).toLocaleDateString("en-GB")}</td>
        <td>${s.oic}</td>
      </tr>`
      )
      .join("");

    const contentHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 4px;">
        EXECUTIVE SUMMARY & STATUTORY INJUNCTION AUDIT
      </div>
      <table class="data-table" style="margin-bottom: 12px;">
        <tbody>
          <tr>
            <th style="width: 25%;">Total Active Injunctions</th>
            <td style="font-weight: 700; width: 25%;">${metrics.totalActiveStays}</td>
            <th style="width: 25%;">Vacation Motions Due (&lt; 7 Days)</th>
            <td style="font-weight: 700; width: 25%;">${metrics.vacationMotionsDueUnder7Days}</td>
          </tr>
          <tr>
            <th>Applications Filed under Art 226(3)</th>
            <td style="font-weight: 700;">${metrics.vacationApplicationsFiled}</td>
            <th>Average Stay Duration</th>
            <td style="font-weight: 700;">${metrics.averageStayDurationDays} Days</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 12px 0 4px;">
        ROSTER OF ACTIVE JUDICIAL STAYS & VACATION DEADLINES (${data.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 95px;">File Docket</th>
            <th style="width: 100px;">Writ / Case No</th>
            <th style="width: 130px;">Judicial Bench</th>
            <th>Stay Order Injunction Scope</th>
            <th style="width: 55px; text-align: center;">Duration</th>
            <th style="width: 95px;">Motion Status</th>
            <th style="width: 70px;">Deadline</th>
            <th style="width: 90px;">Accountable OIC</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="9" style="text-align: center; color: #444; padding: 6px;">No active stays currently in force.</td></tr>'}
        </tbody>
      </table>
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle: "5.1 Active Stays & Judicial Injunctions Roster",
      reportSubtitle: "Statutory Vacation Tracking under Article 226(3) of Constitution of India",
      generatedBy: {
        name: req.user?.name || req.user?.username || "Legal Officer",
        designation: req.user?.designation,
        role: req.user?.role,
      },
      filterMetaText: `Active Injunctions: ${metrics.totalActiveStays} | Motions Pending: ${metrics.vacationMotionsDueUnder7Days}`,
      contentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlOutput);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5.2 Contempt Risk Radar — Active Show Cause Countdown & Severity Tiers
 */
export const getContemptRiskRadar = async (req: Request, res: Response) => {
  try {
    const records = await ComplianceRecord.find({
      recordType: "CONTEMPT",
      status: "ACTIVE",
    })
      .sort({ complianceDeadlineDate: 1 })
      .lean();

    const caseContempts = await Case.find({
      $or: [{ isContemptNotice: true }, { judicialStatus: "CONTEMPT_NOTICE" }],
    })
      .sort({ ndoh: 1 })
      .lean();

    const today = new Date();
    const existingCaseIds = new Set(records.map((r) => r.caseId?.toString()));
    const unifiedContempts: any[] = [];

    for (const item of records) {
      let daysRemaining = 0;
      if (item.complianceDeadlineDate) {
        daysRemaining = Math.max(
          0,
          Math.floor((new Date(item.complianceDeadlineDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        );
      }

      let severity: "CRITICAL" | "HIGH_WARNING" | "MONITORED" = "MONITORED";
      if (daysRemaining <= 3) severity = "CRITICAL";
      else if (daysRemaining <= 7) severity = "HIGH_WARNING";

      unifiedContempts.push({
        _id: item._id.toString(),
        caseId: item.caseId ? item.caseId.toString() : item._id.toString(),
        severity,
        contemptCaseAndWrit: {
          contemptNumber: item.contemptNumber || "CONTEMPT / PENDING",
          originalWrit: item.writNumber || "Writ Matter",
          court: item.court || "High Court of Judicature at Allahabad",
        },
        petitionerAndContemnor: {
          petitioner: item.petitionerName,
          contemnor: item.contemnorTitle || "Chairman UPPRPB & Ors",
        },
        courtDirections: item.courtDirections || "Speaking order compliance pending.",
        countdown: {
          daysRemaining,
          totalDays: item.totalComplianceDays || 90,
        },
        complianceProgress: item.complianceProgress || "In Progress",
        oic: item.oicName || "SP Legal",
      });
    }

    for (const c of caseContempts) {
      if (!existingCaseIds.has(c._id.toString())) {
        const targetDate = c.ndoh ? new Date(c.ndoh) : new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

        let severity: "CRITICAL" | "HIGH_WARNING" | "MONITORED" = "MONITORED";
        if (daysRemaining <= 3) severity = "CRITICAL";
        else if (daysRemaining <= 7) severity = "HIGH_WARNING";

        unifiedContempts.push({
          _id: c._id.toString(),
          caseId: c._id.toString(),
          severity,
          contemptCaseAndWrit: {
            contemptNumber: c.noticeNumber || c.writNumber || "CONT-APP/2026",
            originalWrit: c.writNumber || "WRIT-A Matter",
            court: c.court,
          },
          petitionerAndContemnor: {
            petitioner: c.leadPetitioner,
            contemnor: c.respondentString || "Chairman UPPRPB & Ors",
          },
          courtDirections: c.disputeSubject || "Speaking order compliance pending.",
          countdown: {
            daysRemaining,
            totalDays: 30,
          },
          complianceProgress: c.stage || "PWC Under Preparation",
          oic: c.assignedOIC || "SP Legal",
        });
      }
    }

    let criticalCount = 0;
    let highWarningCount = 0;
    let monitoredCount = 0;

    for (const item of unifiedContempts) {
      if (item.severity === "CRITICAL") criticalCount++;
      else if (item.severity === "HIGH_WARNING") highWarningCount++;
      else monitoredCount++;
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalShowCauseMatters: unifiedContempts.length,
        level3CriticalUnder3Days: criticalCount,
        level2HighWarningUnder7Days: highWarningCount,
        level1MonitoredUnder14Days: monitoredCount,
      },
      data: unifiedContempts,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Register Contempt Notice into Radar
 */
export const registerContemptNotice = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      contemptNumber,
      contemnorTitle,
      courtDirections,
      complianceDeadlineDate,
      totalComplianceDays = 90,
      complianceProgress,
      oicName,
      actionMappingId,
      courtDecisionOutcome,
    } = req.body;

    const targetCaseId = getParam(caseId);

    const caseDoc = await Case.findById(targetCaseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const deadline = complianceDeadlineDate
      ? new Date(complianceDeadlineDate)
      : new Date(Date.now() + totalComplianceDays * 24 * 60 * 60 * 1000);

    const today = new Date();
    const daysLeft = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let severity: "CRITICAL" | "HIGH_WARNING" | "MONITORED" = "MONITORED";
    if (daysLeft <= 3) severity = "CRITICAL";
    else if (daysLeft <= 7) severity = "HIGH_WARNING";

    const record = await ComplianceRecord.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      writNumber: caseDoc.writNumber,
      cnrNumber: caseDoc.cnrNumber,
      court: caseDoc.court,
      courtId: caseDoc.courtId,
      coramBench: caseDoc.coramBench,
      petitionerName: caseDoc.leadPetitioner,
      oicName: oicName || caseDoc.assignedOIC,
      recordType: "CONTEMPT",
      actionMappingId: actionMappingId ? new Types.ObjectId(actionMappingId) : undefined,
      courtDecisionOutcome: courtDecisionOutcome || "Disposed - Decide Representation by Speaking Order",
      contemptNumber: contemptNumber || `CONT/${new Date().getFullYear()}/${caseDoc.fileNo.split("/")[2] || "01"}`,
      contemnorTitle: contemnorTitle || "Chairman UPPRPB",
      courtDirections: courtDirections || "Speaking order compliance within statutory timeline",
      directionGivenDate: new Date(),
      complianceDeadlineDate: deadline,
      totalComplianceDays,
      complianceProgress: complianceProgress || "Speaking Order in Preparation",
      severityLevel: severity,
      status: "ACTIVE",
    });

    caseDoc.isContemptNotice = true;
    caseDoc.contemptDeadlineDate = deadline;
    caseDoc.judicialStatus = "CONTEMPT_NOTICE";
    await caseDoc.save();

    await CaseHearingHistory.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      hearingDate: new Date(),
      businessRecorded: `Contempt notice registered: ${record.contemptNumber}. Statutory compliance deadline: ${deadline.toLocaleDateString("en-GB")}`,
      orderType: "CONTEMPT_NOTICE_ISSUED",
      source: "MANUAL_ENTRY",
      enteredByUserId: req.user?.id,
      enteredByOfficerName: req.user?.name || "Judicial Desk",
      enteredByDesignation: req.user?.designation || "Compliance Cell",
    });

    await logAuditEvent(
      req,
      "CONTEMPT_NOTICE_REGISTERED" as any,
      "COMPLIANCE",
      caseDoc._id.toString(),
      { fileNo: caseDoc.fileNo, contemptNumber: record.contemptNumber },
      "CRITICAL"
    );

    return res.status(201).json({
      success: true,
      message: "Contempt show cause notice docked into Contempt Risk Radar.",
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5.2.2 Export Contempt Radar (Clean B&W PDF)
 */
export const exportContemptPdf = async (req: AuthRequest, res: Response) => {
  try {
    const contemptCases = await Case.find({
      $or: [{ isContemptNotice: true }, { judicialStatus: "CONTEMPT_NOTICE" }],
    })
      .sort({ ndoh: 1 })
      .lean();

    const now = new Date();
    const rowsHtml = contemptCases
      .map((c, idx) => {
        const targetDate = c.ndoh ? new Date(c.ndoh) : new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: 700;">${c.fileNo}</td>
          <td style="font-weight: 700;">${c.noticeNumber || c.writNumber || "CONT-APP"}</td>
          <td>${c.leadPetitioner}</td>
          <td>${c.court}</td>
          <td style="line-height: 1.35;">${c.disputeSubject}</td>
          <td style="text-align: center; font-weight: 800;">${daysRemaining} Days</td>
          <td style="font-weight: 700;">${c.stage || "Active"}</td>
          <td>${c.assignedOIC}</td>
        </tr>`;
      })
      .join("");

    const contentHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 4px;">
        CONTEMPT SHOW-CAUSE & SECTION 12 COMPLIANCE REGISTER (${contemptCases.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 90px;">File Docket</th>
            <th style="width: 100px;">Contempt No</th>
            <th style="width: 110px;">Petitioner</th>
            <th style="width: 120px;">Judicial Forum</th>
            <th>Judicial Direction Called</th>
            <th style="width: 65px; text-align: center;">Days Left</th>
            <th style="width: 90px;">Stage</th>
            <th style="width: 90px;">Assigned OIC</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="9" style="text-align: center; color: #444; padding: 6px;">No contempt notices pending.</td></tr>'}
        </tbody>
      </table>
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle: "5.2 Contempt Radar & Show Cause Monitoring",
      reportSubtitle: "Time-Bound Compliance Tracker under Contempt of Courts Act, 1971",
      generatedBy: {
        name: req.user?.name || req.user?.username || "Legal Officer",
        designation: req.user?.designation,
        role: req.user?.role,
      },
      filterMetaText: `Total Contempt Matters: ${contemptCases.length}`,
      contentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlOutput);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Trigger SMS/Email Notifications for Red Zone Contempt (<3 Days)
 */
export const triggerRedZoneAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const criticalCases = await ComplianceRecord.find({
      recordType: "CONTEMPT",
      status: "ACTIVE",
    }).lean();

    const today = new Date();
    const alertList = criticalCases.filter((c) => {
      if (!c.complianceDeadlineDate) return false;
      const diff = Math.floor(
        (new Date(c.complianceDeadlineDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff <= 3;
    });

    for (const item of alertList) {
      if (item.caseId) {
        const recipientUser = await User.findOne({
          name: new RegExp(item.oicName.trim(), "i"),
        });
        const targetId = recipientUser?._id || req.user?.id;

        if (targetId) {
          NotificationService.sendNotification({
            recipientId: targetId,
            caseId: item.caseId,
            fileNo: item.fileNo,
            type: "CONTEMPT_NOTICE",
            title: `CRITICAL CONTEMPT: ${item.contemptNumber || item.writNumber}`,
            message: `Less than 3 days left before judicial compliance expiry for ${item.petitionerName}.`,
            isUrgent: true,
            senderName: req.user?.name || "Contempt Risk Engine",
            senderDesignation: "Automated Escalation Daemon",
            extraMeta: {
              contemptNo: item.contemptNumber,
              court: item.court,
              daysRemaining: 3,
              complianceDeadline: item.complianceDeadlineDate
                ? new Date(item.complianceDeadlineDate).toLocaleDateString("en-GB")
                : "Immediate",
            },
          }).catch((err) => console.error("[Contempt RedZone Notification Error]:", err.message));
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Triggered alerts for ${alertList.length} Red-Zone Contempt notices.`,
      dispatchedCount: alertList.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5.3 Compliance Filing & Archival Records List
 */
export const getArchivedComplianceRecords = async (req: Request, res: Response) => {
  try {
    const archives = await ComplianceRecord.find({
      status: "COMPLIED_AND_CLOSED",
    })
      .sort({ closedAt: -1 })
      .lean();

    const disposedCases = await Case.find({
      $or: [{ stage: "Disposed Off / Closed" }, { judicialStatus: "DISPOSED" }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const existingCaseIds = new Set(archives.map((a) => a.caseId?.toString()));
    const unifiedArchives: any[] = [];

    for (const item of archives) {
      unifiedArchives.push({
        _id: item._id.toString(),
        caseId: item.caseId ? item.caseId.toString() : item._id.toString(),
        caseNoAndCnr: {
          writNumber: item.writNumber || item.fileNo,
          cnrNumber: item.cnrNumber || "Unassigned",
        },
        petitionerAndCourt: {
          petitioner: item.petitionerName,
          court: item.court,
        },
        judicialDirectionGiven: item.courtDirections || item.stayOrderScope || "Relief considered on merit",
        actionTakenByBoard: item.actionTakenByBoard || "Speaking order passed.",
        complianceAffidavitFiled: {
          date: item.complianceAffidavitDate || item.closedAt || new Date().toISOString(),
          proofDocUrl: item.complianceProofDocUrl || "#",
        },
        closedByAndDate: {
          closedBy: item.closedByOfficerName || "SP Legal",
          closedAt: item.closedAt || new Date().toISOString(),
        },
        status: "COMPLIED & CLOSED",
      });
    }

    for (const c of disposedCases) {
      if (!existingCaseIds.has(c._id.toString())) {
        unifiedArchives.push({
          _id: c._id.toString(),
          caseId: c._id.toString(),
          caseNoAndCnr: {
            writNumber: c.writNumber || c.fileNo,
            cnrNumber: c.cnrNumber || "Unassigned",
          },
          petitionerAndCourt: {
            petitioner: c.leadPetitioner,
            court: c.court,
          },
          judicialDirectionGiven: c.disputeSubject || "Matter concluded on merits.",
          actionTakenByBoard: (c as any).actionTakenByBoard || "Speaking order passed and compliance affidavit filed.",
          complianceAffidavitFiled: {
            date: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
            proofDocUrl: "/admin/documents?caseId=" + c._id,
          },
          closedByAndDate: {
            closedBy: c.assignedOIC || "Competent Authority",
            closedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
          },
          status: "COMPLIED & CLOSED",
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: unifiedArchives.length,
      data: unifiedArchives,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5.3.2 Export Archival Compliance (Clean B&W PDF)
 */
export const exportArchivesPdf = async (req: AuthRequest, res: Response) => {
  try {
    const disposedCases = await Case.find({
      $or: [{ stage: "Disposed Off / Closed" }, { judicialStatus: "DISPOSED" }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const rowsHtml = disposedCases
      .map(
        (c, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: 700;">${c.fileNo}</td>
        <td style="font-weight: 700;">${c.writNumber || "--"}</td>
        <td>${c.leadPetitioner}</td>
        <td>${c.court}</td>
        <td style="line-height: 1.35;">${c.disputeSubject}</td>
        <td style="line-height: 1.35;">${(c as any).actionTakenByBoard || "Speaking order complied."}</td>
        <td style="text-align: center;">${new Date(c.updatedAt).toLocaleDateString("en-GB")}</td>
        <td>${c.assignedOIC}</td>
      </tr>`
      )
      .join("");

    const contentHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 4px;">
        COMPLIANCE ARCHIVAL & DISPOSED WRIT LITIGATION CLOSEOUTS (${disposedCases.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 90px;">File Docket</th>
            <th style="width: 100px;">Writ No</th>
            <th style="width: 110px;">Petitioner</th>
            <th style="width: 120px;">Court</th>
            <th>Judicial Order Summary</th>
            <th>Action Taken / Board Compliance</th>
            <th style="width: 75px; text-align: center;">Closed Date</th>
            <th style="width: 90px;">OIC Desk</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="9" style="text-align: center; color: #444; padding: 6px;">No archived cases found.</td></tr>'}
        </tbody>
      </table>
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle: "5.3 Compliance Archival & Disposal Register",
      reportSubtitle: "Permanent Digital Archive of Complied High Court Mandates",
      generatedBy: {
        name: req.user?.name || req.user?.username || "Legal Officer",
        designation: req.user?.designation,
        role: req.user?.role,
      },
      filterMetaText: `Total Disposed & Complied: ${disposedCases.length}`,
      contentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlOutput);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Closeout & Archive Case / Compliance
 */
export const closeAndArchiveCase = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      actionTakenByBoard,
      complianceAffidavitDate,
      complianceProofDocUrl,
      complianceProofDocId,
    } = req.body;

    const targetCaseId = getParam(caseId);

    const caseDoc = await Case.findById(targetCaseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    if (!actionTakenByBoard) {
      return res.status(400).json({
        success: false,
        message: "Action taken description by Board is required for permanent closeout.",
      });
    }

    let record = await ComplianceRecord.findOne({ caseId: caseDoc._id });
    if (!record) {
      record = new ComplianceRecord({
        caseId: caseDoc._id,
        fileNo: caseDoc.fileNo,
        writNumber: caseDoc.writNumber,
        cnrNumber: caseDoc.cnrNumber,
        court: caseDoc.court,
        petitionerName: caseDoc.leadPetitioner,
        recordType: "GENERAL_DIRECTION",
      });
    }

    const closeTime = new Date();
    record.status = "COMPLIED_AND_CLOSED";
    record.actionTakenByBoard = actionTakenByBoard;
    record.complianceAffidavitDate = complianceAffidavitDate
      ? new Date(complianceAffidavitDate)
      : closeTime;
    record.complianceProofDocUrl = complianceProofDocUrl || "";
    record.complianceProofDocId = complianceProofDocId
      ? new Types.ObjectId(complianceProofDocId)
      : undefined;
    record.closedByOfficerName = req.user?.name || req.user?.username || "SP Legal";
    record.closedByUserId = req.user?.id ? new Types.ObjectId(req.user.id) : undefined;
    record.closedAt = closeTime;
    await record.save();

    caseDoc.judicialStatus = "DISPOSED";
    caseDoc.stage = "Case Complied & Archived";
    caseDoc.hasActiveStay = false;
    caseDoc.isContemptNotice = false;
    (caseDoc as any).actionTakenByBoard = actionTakenByBoard;
    await caseDoc.save();

    await CaseHearingHistory.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      hearingDate: closeTime,
      businessRecorded: `Dossier officially closed and complied: ${actionTakenByBoard}`,
      orderType: "FINAL_JUDGMENT",
      source: "MANUAL_ENTRY",
      enteredByUserId: req.user?.id,
      enteredByOfficerName: req.user?.name || "SP Legal",
      enteredByDesignation: req.user?.designation || "Apex Authority",
    });

    await logAuditEvent(
      req,
      "CASE_COMPLIANCE_ARCHIVED" as any,
      "COMPLIANCE",
      caseDoc._id.toString(),
      { fileNo: caseDoc.fileNo, actionTaken: actionTakenByBoard },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: `Case ${caseDoc.fileNo} officially closed, complied, and archived.`,
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};