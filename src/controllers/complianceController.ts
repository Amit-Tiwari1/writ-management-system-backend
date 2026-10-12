import { Request, Response } from "express";
import { ComplianceRecord } from "../models/ComplianceRisk";
import { Case } from "../models/Case";
import { AuthRequest } from "../middlewares/authMiddleware";
import { NotificationService } from "../services/notificationService";
import { User } from "../models/User";

export const getActiveStaysRoster = async (req: Request, res: Response) => {
  try {
    const stays = await ComplianceRecord.find({
      recordType: "STAY",
      status: "ACTIVE",
    }).sort({ stayOrderDate: -1 }).lean();

    const today = new Date();
    let motionsDueCount = 0;
    let filedCount = 0;
    let totalStayDays = 0;

    const data = stays.map((item) => {
      const orderDate = item.stayOrderDate ? new Date(item.stayOrderDate) : today;
      const stayDurationDays = Math.max(0, Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)));
      totalStayDays += stayDurationDays;

      let daysRemainingForVacation = 999;
      if (item.vacationDeadline) {
        daysRemainingForVacation = Math.floor((new Date(item.vacationDeadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (item.vacationMotionStatus === "VACATION_FILED" || item.vacationMotionStatus === "LISTED FOR ARGUMENTS") {
        filedCount++;
      }
      if (daysRemainingForVacation <= 7 && daysRemainingForVacation >= 0) {
        motionsDueCount++;
      }

      return {
        _id: item._id,
        caseId: item.caseId,
        caseAndCnr: {
          writNumber: item.writNumber,
          cnrNumber: item.cnrNumber,
          fileNo: item.fileNo,
        },
        courtAndCoram: {
          court: item.court,
          coram: item.coramBench,
        },
        stayOrderScope: item.stayOrderScope,
        orderDateAndDuration: {
          orderDate: item.stayOrderDate,
          stayDurationDays,
        },
        vacationMotionStatus: item.vacationMotionStatus,
        vacationDeadline: item.vacationDeadline,
        oic: item.oicName,
      };
    });

    const averageStayDuration = stays.length > 0 ? Math.round(totalStayDays / stays.length) : 0;

    return res.status(200).json({
      success: true,
      metrics: {
        totalActiveStays: stays.length,
        vacationMotionsDueUnder7Days: motionsDueCount,
        vacationApplicationsFiled: filedCount,
        averageStayDurationDays: averageStayDuration,
      },
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const registerStayOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      stayOrderScope,
      stayOrderDate,
      vacationDeadline,
      vacationMotionStatus,
      oicName,
    } = req.body;

    const targetCaseId = String(caseId);

    const caseDoc = await Case.findById(targetCaseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const orderDate = stayOrderDate ? new Date(stayOrderDate) : new Date();
    // Default Rule: Art 226(3) Vacation Motion due within 14 days
    const defaultDeadline = new Date(orderDate);
    defaultDeadline.setDate(defaultDeadline.getDate() + 14);

    const record = await ComplianceRecord.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      writNumber: caseDoc.writNumber,
      cnrNumber: caseDoc.cnrNumber,
      court: caseDoc.court,
      coramBench: caseDoc.coramBench,
      petitionerName: caseDoc.leadPetitioner,
      oicName: oicName || caseDoc.assignedOIC,
      recordType: "STAY",
      stayOrderScope,
      stayOrderDate: orderDate,
      vacationDeadline: vacationDeadline ? new Date(vacationDeadline) : defaultDeadline,
      vacationMotionStatus: vacationMotionStatus || "URGENT ACTION REQUIRED",
      status: "ACTIVE",
    });

    caseDoc.hasActiveStay = true;
    caseDoc.stayScope = stayOrderScope;
    caseDoc.stayGrantedDate = orderDate;
    caseDoc.stayVacationDueDate = record.vacationDeadline;
    caseDoc.judicialStatus = "STAY_IN_FORCE";
    await caseDoc.save();

    const targetUserId = caseDoc.internalHold?.currentHolderId || req.user?.id;
    if (targetUserId) {
      NotificationService.sendNotification({
        recipientId: targetUserId,
        caseId: caseDoc._id,
        fileNo: caseDoc.fileNo,
        type: "STAY_ALERT",
        title: `Interim Stay Granted in ${caseDoc.writNumber}`,
        message: `High Court granted interim stay: ${stayOrderScope}. Article 226(3) vacation application deadline is initiated.`,
        isUrgent: true,
        senderName: req.user?.name || "Judicial Registry Desk",
        senderDesignation: "Compliance Cell",
        extraMeta: {
          writNo: caseDoc.writNumber,
          stayScope: stayOrderScope,
          vacationDeadline: record.vacationDeadline ? record.vacationDeadline.toLocaleDateString("en-GB") : "14 Days",
        },
      }).catch((err) => console.error("[Stay Notification Error]:", err.message));
    }

    return res.status(201).json({
      success: true,
      message: "Stay order registered in Active Stays Roster.",
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const triggerRedZoneAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const criticalCases = await ComplianceRecord.find({
      recordType: "CONTEMPT",
      status: "ACTIVE",
    }).lean();

    const today = new Date();
    const alertList = criticalCases.filter((c) => {
      if (!c.complianceDeadlineDate) return false;
      const diff = Math.floor((new Date(c.complianceDeadlineDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 3;
    });

    // Notification Trigger: Dispatch In-App + Email Alert for each critical contempt
    for (const item of alertList) {
      if (item.caseId) {
        // Send alert to current logged-in authority and OIC
        const recipientUser = await User.findOne({ name: new RegExp(item.oicName.trim(), "i") });
        const targetId = recipientUser?._id || req.user?.id;

        if (targetId) {
          NotificationService.sendNotification({
            recipientId: targetId,
            caseId: item.caseId,
            fileNo: item.fileNo,
            type: "CONTEMPT_NOTICE",
            title: `CRITICAL CONTEMPT: ${item.contemptNumber}`,
            message: `Less than 3 days left before judicial compliance expiry for ${item.petitionerName} (${item.contemptNumber}).`,
            isUrgent: true,
            senderName: req.user?.name || "Contempt Risk Engine",
            senderDesignation: "Automated Escalation Daemon",
            extraMeta: {
              contemptNo: item.contemptNumber,
              court: item.court,
              daysRemaining: 2,
              complianceDeadline: item.complianceDeadlineDate ? new Date(item.complianceDeadlineDate).toLocaleDateString("en-GB") : "Immediate",
            },
          }).catch((err) => console.error("[Contempt RedZone Notification Error]:", err.message));
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Triggered SMS/Email Escalation for ${alertList.length} Red-Zone Contempt notices.`,
      dispatchedCount: alertList.length,
      escalatedCases: alertList.map((a) => ({
        contemptNumber: a.contemptNumber,
        petitioner: a.petitionerName,
        contemnor: a.contemnorTitle,
        deadline: a.complianceDeadlineDate,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateVacationMotion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { vacationMotionStatus, vacationFilingDate } = req.body;

    const record = await ComplianceRecord.findById(id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });

    if (vacationMotionStatus) record.vacationMotionStatus = vacationMotionStatus;
    if (vacationFilingDate) record.vacationFilingDate = new Date(vacationFilingDate);
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Vacation motion status updated.",
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const getContemptRiskRadar = async (req: Request, res: Response) => {
  try {
    const records = await ComplianceRecord.find({
      recordType: "CONTEMPT",
      status: "ACTIVE",
    }).sort({ complianceDeadlineDate: 1 }).lean();

    const today = new Date();
    let criticalCount = 0;
    let highWarningCount = 0;
    let monitoredCount = 0;

    const data = records.map((item) => {
      let daysRemaining = 0;
      if (item.complianceDeadlineDate) {
        daysRemaining = Math.max(0, Math.floor((new Date(item.complianceDeadlineDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      }

      let severity: "CRITICAL" | "HIGH_WARNING" | "MONITORED" = "MONITORED";
      if (daysRemaining <= 3) {
        severity = "CRITICAL";
        criticalCount++;
      } else if (daysRemaining <= 7) {
        severity = "HIGH_WARNING";
        highWarningCount++;
      } else {
        monitoredCount++;
      }

      return {
        _id: item._id,
        caseId: item.caseId,
        severity,
        contemptCaseAndWrit: {
          contemptNumber: item.contemptNumber || "CONTEMPT / PENDING",
          originalWrit: item.writNumber,
          court: item.court,
        },
        petitionerAndContemnor: {
          petitioner: item.petitionerName,
          contemnor: item.contemnorTitle,
        },
        courtDirections: item.courtDirections,
        countdown: {
          daysRemaining,
          totalDays: item.totalComplianceDays || 42,
        },
        complianceProgress: item.complianceProgress,
        oic: item.oicName,
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalShowCauseMatters: records.length,
        level3CriticalUnder3Days: criticalCount,
        level2HighWarningUnder7Days: highWarningCount,
        level1MonitoredUnder14Days: monitoredCount,
      },
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const registerContemptNotice = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      contemptNumber,
      contemnorTitle,
      courtDirections,
      complianceDeadlineDate,
      totalComplianceDays = 42,
      complianceProgress,
      oicName,
    } = req.body;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const deadline = complianceDeadlineDate ? new Date(complianceDeadlineDate) : new Date(Date.now() + totalComplianceDays * 24 * 60 * 60 * 1000);
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
      coramBench: caseDoc.coramBench,
      petitionerName: caseDoc.leadPetitioner,
      oicName: oicName || caseDoc.assignedOIC,
      recordType: "CONTEMPT",
      contemptNumber,
      contemnorTitle: contemnorTitle || "Chairman UPPRPB",
      courtDirections,
      directionGivenDate: new Date(),
      complianceDeadlineDate: deadline,
      totalComplianceDays,
      complianceProgress: complianceProgress || "Compliance Note in Preparation",
      severityLevel: severity,
      status: "ACTIVE",
    });

    // Sync Case
    caseDoc.isContemptNotice = true;
    caseDoc.contemptDeadlineDate = deadline;
    caseDoc.judicialStatus = "CONTEMPT_NOTICE";
    await caseDoc.save();

    return res.status(201).json({
      success: true,
      message: "Contempt show cause notice docked into Contempt Risk Radar.",
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getArchivedComplianceRecords = async (req: Request, res: Response) => {
  try {
    const archives = await ComplianceRecord.find({
      status: "COMPLIED_AND_CLOSED",
    }).sort({ closedAt: -1 }).lean();

    const data = archives.map((item) => ({
      _id: item._id,
      caseId: item.caseId,
      caseNoAndCnr: {
        writNumber: item.writNumber,
        cnrNumber: item.cnrNumber,
      },
      petitionerAndCourt: {
        petitioner: item.petitionerName,
        court: item.court,
      },
      judicialDirectionGiven: item.courtDirections || item.stayOrderScope || "Relief considered on merit",
      actionTakenByBoard: item.actionTakenByBoard,
      complianceAffidavitFiled: {
        date: item.complianceAffidavitDate || item.closedAt,
        proofDocUrl: item.complianceProofDocUrl || "#",
      },
      closedByAndDate: {
        closedBy: item.closedByOfficerName || "SP Legal",
        closedAt: item.closedAt,
      },
      status: "COMPLIED & CLOSED",
    }));

    return res.status(200).json({
      success: true,
      count: archives.length,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const closeAndArchiveCase = async (req: AuthRequest, res: Response) => {
  try {
    const {
      caseId,
      actionTakenByBoard,
      complianceAffidavitDate,
      complianceProofDocUrl,
      complianceProofDocId,
    } = req.body;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    if (!actionTakenByBoard) {
      return res.status(400).json({
        success: false,
        message: "Action taken description by Board is required for permanent closeout.",
      });
    }

    // Update or create compliance archival record
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
    record.complianceAffidavitDate = complianceAffidavitDate ? new Date(complianceAffidavitDate) : closeTime;
    record.complianceProofDocUrl = complianceProofDocUrl || "";
    record.complianceProofDocId = complianceProofDocId || undefined;
    record.closedByOfficerName = req.user?.name || req.user?.username || "SP Legal";
    record.closedAt = closeTime;
    await record.save();

    // Mark Case file permanently archived
    caseDoc.judicialStatus = "DISPOSED";
    caseDoc.stage = "Case Complied & Archived";
    caseDoc.hasActiveStay = false;
    caseDoc.isContemptNotice = false;
    await caseDoc.save();

    return res.status(200).json({
      success: true,
      message: `Case ${caseDoc.fileNo} officially closed, complied, and archived.`,
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};