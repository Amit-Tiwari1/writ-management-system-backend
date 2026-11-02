import { Request, Response } from "express";
import { Case } from "../models/Case";
import { Petitioner } from "../models/Petitioner";
import { Discovery } from "../models/Discovery";
import { CaseHearingHistory } from "../models/CaseHearingHistory";
import { CaseMovementHistory } from "../models/CaseMovementHistory";
import { Court, CaseType, CaseCategory, CaseSubCategory, CaseSubject } from "../models/Masters";
import { CaseService } from "../services/caseService";
import { MockJudicialService } from "../services/mockJudicialService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";
import { NotificationService } from "../services/notificationService";
import { User } from "../models/User";
import { renderPdfDocument } from "../utils/pdfTemplate";


const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};


const buildCasesFilterQuery = (queryParams: any) => {
  const {
    search,
    court,
    wing,
    caseType,
    category,
    subCategory,
    subject,
    oic,
    state,
    statusFilter,
    hearingDate,
  } = queryParams;

  const query: any = {};

  if (search && String(search).trim().length >= 3) {
    const searchRegex = new RegExp(String(search).trim(), "i");
    query.$or = [
      { fileNo: searchRegex },
      { noticeNumber: searchRegex },
      { writNumber: searchRegex },
      { cnrNumber: searchRegex },
      { leadPetitioner: searchRegex },
      { assignedOIC: searchRegex },
      { disputeSubject: searchRegex },
    ];
  }

  if (court && court !== "ALL" && court !== "All Courts") {
    query.$or = [
      ...(query.$or || []),
      { courtCode: String(court) },
      { court: new RegExp(String(court).trim(), "i") },
    ];
  }

  if (wing && wing !== "ALL" && wing !== "All Wings") {
    query.sectionWing = String(wing);
  }

  if (caseType && caseType !== "ALL" && caseType !== "All Case Types") {
    query.caseType = String(caseType);
  }

  if (category && category !== "ALL" && category !== "All Categories") {
    query.category = String(category);
  }

  if (subCategory && subCategory !== "ALL" && subCategory !== "All Sub-Categories") {
    query.subCategory = String(subCategory);
  }

  if (subject && subject !== "ALL" && subject !== "All Dispute Issues") {
    query.disputeSubject = String(subject);
  }

  if (oic && oic !== "ALL" && oic !== "All Nodal Officers") {
    query.assignedOIC = new RegExp(String(oic).trim(), "i");
  }

  if (state && state !== "ALL" && state !== "All States") {
    query.state = String(state);
  }

  if (hearingDate) {
    const start = new Date(String(hearingDate));
    start.setHours(0, 0, 0, 0);
    const end = new Date(String(hearingDate));
    end.setHours(23, 59, 59, 999);
    query.ndoh = { $gte: start, $lte: end };
  }
  if (statusFilter === "with_connected") {
    query["connectedWrits.0"] = { $exists: true };
  } else if (statusFilter === "advance_notice") {
    query.identifierTier = 2;
  } else if (statusFilter === "stay") {
    query.hasActiveStay = true;
  } else if (statusFilter === "contempt") {
    query.isContemptNotice = true;
  }

  return query;
};


export const getCasesRegister = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = buildCasesFilterQuery(req.query);

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [cases, total] = await Promise.all([
      Case.find(query)
        .populate("courtId", "courtName shortCode")
        .populate("caseTypeId", "caseTypeName shortName")
        .populate("categoryId", "categoryName")
        .populate("subCategoryId", "subCategoryName")
        .populate("subjectId", "subjectTitle")
        .sort({ ndoh: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Case.countDocuments(query),
    ]);
    const [allCount, connectedCount, noticeCount, stayCount, contemptCount] = await Promise.all([
      Case.countDocuments({}),
      Case.countDocuments({ "connectedWrits.0": { $exists: true } }),
      Case.countDocuments({ identifierTier: 2 }),
      Case.countDocuments({ hasActiveStay: true }),
      Case.countDocuments({ isContemptNotice: true }),
    ]);

    return res.status(200).json({
      success: true,
      data: cases,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      pillsMetrics: {
        all: allCount,
        withConnected: connectedCount,
        advanceNotice: noticeCount,
        stayInForce: stayCount,
        contemptAlerts: contemptCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const exportCasesController = async (req: AuthRequest, res: Response) => {
  try {
    const { format = "csv" } = req.query;
    const query = buildCasesFilterQuery(req.query);
    const cases = await Case.find(query).sort({ ndoh: 1, createdAt: -1 }).lean();

    if (format === "pdf") {
      const rowsHtml = cases
        .map(
          (c, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: 800; color: #0f2744;">${c.fileNo}</td>
          <td style="font-weight: 700; color: #1e40af;">${c.writNumber || c.noticeNumber || "--"}</td>
          <td>${c.court || "--"} <span style="color:#64748b;">(${c.benchLocation || "ALD"})</span></td>
          <td style="font-weight: 600;">${c.leadPetitioner || "--"}</td>
          <td>${c.assignedOIC || "Unassigned"}</td>
          <td style="font-size: 8.5px; font-weight: 700; text-align: center;">
            <span style="color: ${c.hasActiveStay ? "#b91c1c" : c.isContemptNotice ? "#c2410c" : "#1e293b"};">
              ${c.hasActiveStay ? "STAY ACTIVE" : c.isContemptNotice ? "CONTEMPT" : c.stage || "REGISTERED"}
            </span>
          </td>
        </tr>`
        )
        .join("");

      const contentHtml = `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">#</th>
              <th style="width: 110px;">File Docket No</th>
              <th style="width: 110px;">Writ / Notice No</th>
              <th>Court & Bench</th>
              <th>Lead Petitioner</th>
              <th>Assigned OIC</th>
              <th style="width: 90px; text-align: center;">Judicial Stage</th>
            </tr>
          </thead>
          <tbody>
            ${
              cases.length > 0
                ? rowsHtml
                : `<tr><td colspan="7" style="text-align:center; padding: 16px; color:#94a3b8;">No dockets matching filter criteria.</td></tr>`
            }
          </tbody>
        </table>
      `;

      const filterSummary = [
        req.query.court && req.query.court !== "ALL" ? `Court: ${req.query.court}` : null,
        req.query.caseType && req.query.caseType !== "ALL" ? `Type: ${req.query.caseType}` : null,
        req.query.category && req.query.category !== "ALL" ? `Category: ${req.query.category}` : null,
        req.query.wing && req.query.wing !== "ALL" ? `Wing: ${req.query.wing}` : null,
        req.query.oic && req.query.oic !== "ALL" ? `OIC: ${req.query.oic}` : null,
        req.query.search ? `Search: "${req.query.search}"` : null,
      ]
        .filter(Boolean)
        .join(" | ") || "All Registered Cases";

      const fullHtml = renderPdfDocument({
        reportTitle: "Writ Litigation Master Registry Register",
        reportSubtitle: `Consolidated Dossier · Total Filtered Records: ${cases.length}`,
        generatedBy: {
          name: req.user?.name || req.user?.username || "Legal Officer",
          designation: req.user?.designation,
          role: req.user?.role,
        },
        filterMetaText: filterSummary,
        contentHtml,
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(fullHtml);
    }

    const headers = [
      "File Docket No",
      "Writ Number",
      "Notice Number",
      "CNR Number",
      "Court",
      "Bench",
      "Case Type",
      "Category",
      "Sub Category",
      "Dispute Subject",
      "Lead Petitioner",
      "Respondent",
      "Assigned OIC",
      "Pairokar",
      "Section Wing",
      "NDOH",
      "Stage",
      "Stay in Force",
      "Contempt Alert",
    ];

    const rows = cases.map((c) => [
      `"${c.fileNo}"`,
      `"${c.writNumber || "--"}"`,
      `"${c.noticeNumber || "--"}"`,
      `"${c.cnrNumber || "--"}"`,
      `"${c.court || "--"}"`,
      `"${c.benchLocation || "--"}"`,
      `"${c.caseType || "--"}"`,
      `"${c.category || "--"}"`,
      `"${c.subCategory || "--"}"`,
      `"${c.disputeSubject || "--"}"`,
      `"${(c.leadPetitioner || "").replace(/"/g, '""')}"`,
      `"${(c.respondentString || "").replace(/"/g, '""')}"`,
      `"${c.assignedOIC || "--"}"`,
      `"${c.assignedPairokar || "--"}"`,
      `"${c.sectionWing || "--"}"`,
      `"${c.ndoh ? new Date(c.ndoh).toLocaleDateString("en-GB") : "--"}"`,
      `"${c.stage || "--"}"`,
      c.hasActiveStay ? "YES" : "NO",
      c.isContemptNotice ? "YES" : "NO",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=UPPRPB_Cases_${Date.now()}.csv`
    );
    return res.status(200).send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const getCaseById = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const caseDoc = await Case.findById(id)
      .populate("courtId", "courtName shortCode location")
      .populate("caseTypeId", "caseTypeName shortName")
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName defaultOfficerName")
      .populate("subjectId", "subjectTitle")
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const [petitioners, hearings] = await Promise.all([
      Petitioner.find({ caseId: caseDoc._id }).sort({ role: 1, createdAt: 1 }).lean(),
      CaseHearingHistory.find({ caseId: caseDoc._id }).sort({ hearingDate: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      case: caseDoc,
      petitioners,
      hearings,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const registerCaseIntake = async (req: AuthRequest, res: Response) => {
  try {
    const {
      mode,
      noticeNumber,
      writNumber,
      cnrNumber,
      courtId,
      court,
      courtCode,
      caseTypeId,
      caseType,
      caseNumber,
      caseYear,
      benchLocation,
      courtRoomNo,
      coramBench,
      categoryId,
      category,
      subCategoryId,
      subCategory,
      subjectId,
      disputeSubject,
      leadPetitioner,
      leadPetitionerRollNo,
      leadPetitionerFatherName,
      district,
      state,
      respondentString,
      petitionerAdvocate,
      stateCounsel,
      assignedOIC,
      assignedPairokar,
      sectionWing,
      examCycle,
      hasActiveStay,
      isContemptNotice,
      ndoh,
      petitioners = [],
    } = req.body;

    const dupCheck = await CaseService.checkDuplicate({ noticeNumber, writNumber, cnrNumber });
    if (dupCheck.exists) {
      return res.status(409).json({
        success: false,
        message: "Duplicate litigation docket detected.",
        matchedCase: dupCheck.matchedCase,
      });
    }

    let resolvedCourt = court || "High Court Allahabad";
    let resolvedCourtCode = courtCode || "HC-ALD";
    if (courtId) {
      const c = await Court.findById(courtId);
      if (c) {
        resolvedCourt = c.courtName;
        resolvedCourtCode = c.shortCode;
      }
    }

    let resolvedCaseType = caseType || "WRIT-A";
    if (caseTypeId) {
      const ct = await CaseType.findById(caseTypeId);
      if (ct) resolvedCaseType = ct.shortName || ct.caseTypeName;
    }

    let resolvedCategory = category || "Direct Recruitment";
    if (categoryId) {
      const cat = await CaseCategory.findById(categoryId);
      if (cat) resolvedCategory = cat.categoryName;
    }

    let resolvedSubCategory = subCategory || "--";
    if (subCategoryId) {
      const scat = await CaseSubCategory.findById(subCategoryId);
      if (scat) resolvedSubCategory = scat.subCategoryName;
    }

    let resolvedSubject = disputeSubject || "General Service Matter";
    if (subjectId) {
      const s = await CaseSubject.findById(subjectId);
      if (s) resolvedSubject = s.subjectTitle;
    }

    const fileNo = await CaseService.generateNextFileNo();
    let tier: 1 | 2 | 3 | 4 = 1;
    let syncStatus: any = "MANUAL_DOCKET";

    if (mode === "CNR" && cnrNumber) {
      tier = 4;
      syncStatus = "SCHEDULED";
    } else if (mode === "WRIT" && writNumber) {
      tier = 3;
    } else if (mode === "NOTICE" && noticeNumber) {
      tier = 2;
    }

    let initialHolderId: any = undefined;
    let holderLocation = "Legal Cell Desk";
    let oicUser: any = null;

    if (assignedOIC && assignedOIC !== "Unassigned (OIC)") {
      oicUser = await User.findOne({
        name: new RegExp(assignedOIC.trim(), "i"),
      });
      if (oicUser) {
        initialHolderId = oicUser._id;
        holderLocation = `${oicUser.designation} (${oicUser.name})`;
      }
    }

    const newCase = await Case.create({
      fileNo,
      noticeNumber: noticeNumber || "",
      writNumber: writNumber || "",
      cnrNumber: cnrNumber ? cnrNumber.toUpperCase() : "",
      identifierTier: tier,
      courtId: courtId || undefined,
      court: resolvedCourt,
      courtCode: resolvedCourtCode,
      caseTypeId: caseTypeId || undefined,
      caseType: resolvedCaseType,
      caseNumber: caseNumber || "",
      caseYear: caseYear || new Date().getFullYear(),
      benchLocation: benchLocation || "Allahabad",
      courtRoomNo: courtRoomNo || "--",
      coramBench: coramBench || "--",
      categoryId: categoryId || undefined,
      category: resolvedCategory,
      subCategoryId: subCategoryId || undefined,
      subCategory: resolvedSubCategory,
      subjectId: subjectId || undefined,
      disputeSubject: resolvedSubject,
      leadPetitioner,
      respondentString: respondentString || "State of U.P. & Chairman UPPRPB",
      petitionerAdvocate: petitionerAdvocate || "--",
      stateCounsel: stateCounsel || "Chief Standing Counsel (CSC)",
      assignedOIC: assignedOIC || "Unassigned (OIC)",
      assignedPairokar: assignedPairokar || "Unassigned (Pairokar)",
      sectionWing: sectionWing || "Recruitment Wing",
      examCycle: examCycle || "2023-24",
      hasActiveStay: !!hasActiveStay,
      isContemptNotice: !!isContemptNotice,
      ndoh: ndoh ? new Date(ndoh) : null,
      coPetitionersCount: 1 + petitioners.length,
      syncStatus,
      internalHold: {
        currentHolderId: initialHolderId,
        location: holderLocation,
        holdDays: 0,
        heldSince: new Date(),
      },
    });

    // Auto-create Lead Petitioner
    await Petitioner.create({
      caseId: newCase._id,
      fileNo: newCase.fileNo,
      rollNo: leadPetitionerRollNo || `ROLL-${Date.now().toString().slice(-6)}`,
      name: leadPetitioner,
      fatherName: leadPetitionerFatherName || "--",
      role: "Lead Petitioner",
      postClaimed: resolvedSubject,
      state: state || "Uttar Pradesh",
      district: district || "--",
      status: "ACTIVE",
      source: "MANUAL_ENTRY",
    });

    // Insert Co-Petitioners if provided
    if (petitioners.length > 0) {
      const petDocs = petitioners.map((p: any) => ({
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        rollNo: p.rollNo || `CO-${Math.floor(100000 + Math.random() * 900000)}`,
        registrationNo: p.registrationNo || "--",
        name: p.name,
        fatherName: p.fatherName || "--",
        role: "Co-Petitioner",
        categoryClaimed: p.categoryClaimed || "General",
        postClaimed: p.postClaimed || resolvedSubject,
        state: p.state || "Uttar Pradesh",
        district: p.district || "--",
        status: "ACTIVE",
        source: "MANUAL_ENTRY",
      }));
      await Petitioner.insertMany(petDocs);
    }

    // Initial Internal File Movement Record
    await CaseService.recordFileMovement({
      caseId: newCase._id,
      fileNo: newCase.fileNo,
      fromUser: {
        id: req.user?.id,
        name: req.user?.name || "Registry Desk",
        designation: req.user?.designation || "Case Intake Desk",
      },
      toUser: {
        id: oicUser?._id || req.user?.id,
        name: oicUser?.name || req.user?.name || "Intake Officer",
        designation: oicUser?.designation || req.user?.designation || "OIC Desk",
      },
      actionType: "INITIAL_INTAKE",
      notingPurpose: "Case Docket Ingestion & Initial OIC Assignment",
      receivedAt: newCase.createdAt,
    });

    // Initial Hearing entry if date provided
    if (ndoh) {
      await CaseHearingHistory.create({
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        hearingDate: new Date(),
        ndoh: new Date(ndoh),
        courtRoomNo: newCase.courtRoomNo,
        judgeCoram: newCase.coramBench,
        stageOfCase: "Fresh Admission",
        businessRecorded: "Initial intake registered in court registry",
        orderType: "ADJOURNMENT",
        source: "MANUAL_ENTRY",
        enteredByUserId: req.user?.id,
        enteredByOfficerName: req.user?.name || "Intake Desk",
        enteredByDesignation: req.user?.designation || "Dealing Assistant",
      });
    }

    if (oicUser) {
      NotificationService.sendNotification({
        recipientId: oicUser._id,
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        type: "HEARING_REMINDER",
        title: `New Case Assigned: ${newCase.fileNo}`,
        message: `Docket ${newCase.writNumber || newCase.noticeNumber} (${newCase.leadPetitioner}) has been assigned to your desk as OIC.`,
        isUrgent: newCase.hasActiveStay || newCase.isContemptNotice,
        senderName: req.user?.name || "Registry Officer",
        senderDesignation: req.user?.designation || "Case Intake Desk",
      }).catch((err) => console.error("[OIC Intake Notification Error]:", err.message));
    }

    await logAuditEvent(
      req,
      "CASE_INTAKE_REGISTERED" as any,
      "CASE_HUB",
      newCase._id.toString(),
      { fileNo: newCase.fileNo, tier, leadPetitioner },
      "INFO"
    );

    return res.status(201).json({
      success: true,
      message: "Case docket successfully ingested.",
      case: newCase,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const checkDuplicateDocket = async (req: Request, res: Response) => {
  try {
    const { fileNo, noticeNumber, writNumber, cnrNumber } = req.query;
    const result = await CaseService.checkDuplicate({
      fileNo: fileNo ? String(fileNo) : undefined,
      noticeNumber: noticeNumber ? String(noticeNumber) : undefined,
      writNumber: writNumber ? String(writNumber) : undefined,
      cnrNumber: cnrNumber ? String(cnrNumber) : undefined,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const recordHearingProceeding = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const {
      hearingDate,
      ndoh,
      courtRoomNo,
      judgeCoram,
      listingItemNo,
      stageOfCase,
      businessRecorded,
      orderType,
      orderDocId,
      orderDocumentUrl,
    } = req.body;

    if (!hearingDate || !businessRecorded) {
      return res.status(400).json({
        success: false,
        message: "Hearing date and business recorded description are mandatory.",
      });
    }

    const result = await CaseService.updateHearingProceedings(
      {
        caseId: id,
        hearingDate,
        ndoh,
        courtRoomNo,
        judgeCoram,
        listingItemNo,
        stageOfCase,
        businessRecorded,
        orderType,
        orderDocId,
        orderDocumentUrl,
        source: "MANUAL_ENTRY",
      },
      {
        id: req.user?.id,
        name: req.user?.name || req.user?.username,
        designation: req.user?.designation,
      }
    );

    await logAuditEvent(
      req,
      "CASE_HEARING_UPDATED" as any,
      "CASE_HUB",
      id,
      { fileNo: result.caseDoc.fileNo, ndoh: result.caseDoc.ndoh, orderType },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: "Hearing proceeding recorded and next date updated.",
      case: result.caseDoc,
      history: result.historyRecord,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const rollbackHearingUpdateController = async (req: AuthRequest, res: Response) => {
  try {
    const historyId = getParam(req.params.historyId);
    const restoredCase = await CaseService.rollbackHearingUpdate(historyId, {
      id: req.user?.id,
      name: req.user?.name || req.user?.username,
      designation: req.user?.designation,
    });

    await logAuditEvent(
      req,
      "CASE_HEARING_ROLLBACK" as any,
      "CASE_HUB",
      restoredCase._id.toString(),
      { fileNo: restoredCase.fileNo, restoredNdoh: restoredCase.ndoh },
      "WARNING"
    );

    return res.status(200).json({
      success: true,
      message: "Hearing date and stage successfully reverted to previous snapshot.",
      case: restoredCase,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const applyCaseActionMappingController = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const {
      actionMappingId,
      courtDecisionOutcome,
      actionStatus,
      requiresComplianceDeadline,
      defaultDeadlineDays,
      customDeadlineDays,
      exactDeadlineDate,
      orderDate,
      courtDirections,
      stayScope,
      recordType,
    } = req.body;

    if (!courtDecisionOutcome || !orderDate) {
      return res.status(400).json({
        success: false,
        message: "Court decision outcome and order date are mandatory.",
      });
    }

    const result = await CaseService.applyActionMappingDecision(
      {
        caseId: id,
        actionMappingId,
        courtDecisionOutcome,
        actionStatus: actionStatus || "Action Initiated",
        requiresComplianceDeadline: Boolean(requiresComplianceDeadline),
        defaultDeadlineDays,
        customDeadlineDays,
        exactDeadlineDate,
        orderDate,
        courtDirections,
        stayScope,
        recordType,
      },
      {
        id: req.user?.id,
        name: req.user?.name || req.user?.username,
        designation: req.user?.designation,
      }
    );

    await logAuditEvent(
      req,
      "CASE_ACTION_MAPPING_APPLIED" as any,
      "COMPLIANCE",
      id,
      {
        fileNo: result.caseDoc.fileNo,
        outcome: courtDecisionOutcome,
        complianceCreated: Boolean(result.createdCompliance),
      },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: "Court action mapping applied. Compliance radar updated successfully.",
      case: result.caseDoc,
      complianceRecord: result.createdCompliance,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getCaseHearingHistory = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const history = await CaseHearingHistory.find({ caseId: id })
      .sort({ hearingDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const triggerCaseSync = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.id);
    const updatedCase = await CaseService.syncCaseWithECourts(caseId, {
      id: req.user?.id,
      name: req.user?.name || req.user?.username,
      designation: req.user?.designation,
    });

    await logAuditEvent(
      req,
      "CASE_ECOURTS_SYNCED" as any,
      "CASE_HUB",
      updatedCase._id.toString(),
      { fileNo: updatedCase.fileNo, ndoh: updatedCase.ndoh },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: "Synchronized with eCourts CIS Gateway successfully.",
      case: updatedCase,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const manageConnectedWrits = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const { writNumber, cnrNumber, petitionerName, connectedCaseId } = req.body;
    const updatedCase = await CaseService.tagConnectedWrit(id, {
      writNumber,
      cnrNumber,
      petitionerName,
      connectedCaseId,
    });

    return res.status(200).json({
      success: true,
      message: "Connected writ tagged successfully.",
      connectedWrits: updatedCase.connectedWrits,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getCasePetitioners = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const petitioners = await Petitioner.find({ caseId })
      .sort({ role: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({ success: true, count: petitioners.length, petitioners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const addCoPetitioner = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const result = await CaseService.addCoPetitioners(caseId, [req.body], "MANUAL_ENTRY");
    return res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getUnclaimedDiscovery = async (req: Request, res: Response) => {
  try {
    let items: any[] = await Discovery.find({ status: "UNCLAIMED" }).lean();
    if (items.length === 0) {
      const feed = await MockJudicialService.getDailyCauseListFeed("Allahabad");
      const inserted = await Discovery.insertMany(feed);
      items = inserted.map((doc) => (doc.toObject ? doc.toObject() : doc));
    }
    return res.status(200).json({ success: true, count: items.length, items });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const mockVerifyCNR = async (req: Request, res: Response) => {
  try {
    const { cnrNumber } = req.body;
    if (!cnrNumber) {
      return res.status(400).json({ success: false, message: "16-digit CNR required." });
    }
    const details = await MockJudicialService.verifyCNR(cnrNumber);
    return res.status(200).json({ success: true, details });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const linkDiscoveredWritToNotice = async (req: Request, res: Response) => {
  try {
    const { docketNo, caseNoYear, cnrNumber, courtHall, itemNo, listingDate } = req.body;

    const caseDoc = await Case.findOne({ fileNo: docketNo });
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Notice docket not found." });
    }

    caseDoc.writNumber = caseNoYear;
    if (cnrNumber) {
      caseDoc.cnrNumber = cnrNumber.toUpperCase();
      caseDoc.identifierTier = 4;
      caseDoc.syncStatus = "LIVE_SYNCED";
    } else {
      caseDoc.identifierTier = 3;
    }

    if (listingDate) {
      caseDoc.ndoh = new Date(listingDate);
    }
    if (courtHall) {
      caseDoc.courtRoomNo = courtHall;
    }
    caseDoc.listingItemNo = itemNo || "--";
    caseDoc.stage = "Listed in Cause List";

    await caseDoc.save();

    return res.status(200).json({
      success: true,
      message: `Docket ${docketNo} successfully upgraded with Writ No: ${caseNoYear}`,
      case: caseDoc,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



export const getDropdownWritsList = async (req: Request, res: Response) => {
  try {
    const cases = await Case.find({})
      .select("_id fileNo writNumber noticeNumber cnrNumber leadPetitioner court benchLocation stage assignedOIC")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = cases.map((c) => ({
      id: c._id,
      fileNo: c.fileNo,
      writNumber: c.writNumber || c.noticeNumber || "Draft Docket",
      label: `${c.fileNo} · ${c.writNumber || c.noticeNumber || "Notice"} — ${c.leadPetitioner}`,
      petitioner: c.leadPetitioner,
      court: `${c.court} (${c.benchLocation})`,
      stage: c.stage,
      oic: c.assignedOIC,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getCaseMovementHistory = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const history = await CaseMovementHistory.find({ caseId: id })
      .populate("fromUserId", "name designation rank")
      .populate("toUserId", "name designation rank")
      .sort({ dispatchedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const exportCaseDossierPdf = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    const caseDoc = await Case.findById(id)
      .populate("courtId", "courtName shortCode location")
      .populate("caseTypeId", "caseTypeName shortName")
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName defaultOfficerName")
      .populate("subjectId", "subjectTitle")
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case docket not found." });
    }

    const [petitioners, hearings, movements] = await Promise.all([
      Petitioner.find({ caseId: caseDoc._id }).sort({ role: 1, createdAt: 1 }).lean(),
      CaseHearingHistory.find({ caseId: caseDoc._id }).sort({ hearingDate: -1 }).lean(),
      CaseMovementHistory.find({ caseId: caseDoc._id }).sort({ dispatchedAt: -1 }).lean(),
    ]);

    // Section 1: Core Details
    const profileTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 1: INSTITUTIONAL DOSSIER & JUDICIAL IDENTIFICATION
      </div>
      <table class="data-table">
        <tbody>
          <tr>
            <th style="width: 18%;">File Docket No</th>
            <td style="width: 32%; font-family: monospace; font-weight: 700;">${caseDoc.fileNo}</td>
            <th style="width: 18%;">National CNR</th>
            <td style="width: 32%; font-family: monospace; font-weight: 700;">${caseDoc.cnrNumber || "Awaiting Allotment"}</td>
          </tr>
          <tr>
            <th>Writ / Case No</th>
            <td style="font-weight: 700;">${caseDoc.writNumber || "Awaiting Writ Allotment"}</td>
            <th>Advance Notice No</th>
            <td style="font-family: monospace;">${caseDoc.noticeNumber || "--"}</td>
          </tr>
          <tr>
            <th>Court & Bench</th>
            <td>${caseDoc.court} (${caseDoc.benchLocation || "Allahabad"})</td>
            <th>Case Classification</th>
            <td>${caseDoc.caseType} (${caseDoc.sectionWing || "Legal Cell"})</td>
          </tr>
          <tr>
            <th>Next Hearing (NDOH)</th>
            <td style="font-weight: 700;">
              ${caseDoc.ndoh ? new Date(caseDoc.ndoh).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not Listed"}
              <span style="font-size: 8px; font-weight: normal;">(Room: ${caseDoc.courtRoomNo || "--"})</span>
            </td>
            <th>Judicial Status</th>
            <td style="font-weight: 700;">
              ${caseDoc.hasActiveStay ? "INTERIM STAY IN FORCE" : caseDoc.isContemptNotice ? "CONTEMPT NOTICE ISSUED" : caseDoc.stage || "ACTIVE"}
            </td>
          </tr>
          <tr>
            <th>Nodal OIC Desk</th>
            <td style="font-weight: 600;">${caseDoc.assignedOIC || "Unassigned"}</td>
            <th>Current File Custody</th>
            <td style="font-weight: 600;">
              ${caseDoc.internalHold?.location || "Legal Cell"} (${caseDoc.internalHold?.holdDays ?? 0} days on desk)
            </td>
          </tr>
          <tr>
            <th>Dispute Subject</th>
            <td colspan="3" style="line-height: 1.35;">
              <strong>${caseDoc.category || "General"} &gt; ${caseDoc.subCategory || "--"} (${caseDoc.examCycle}):</strong><br/>
              ${caseDoc.disputeSubject}
            </td>
          </tr>
          <tr>
            <th>Parties on Record</th>
            <td colspan="3">
              <strong>Petitioner(s):</strong> ${caseDoc.leadPetitioner} (Counsel: ${caseDoc.petitionerAdvocate || "--"})<br/>
              <strong>Respondents:</strong> ${caseDoc.respondentString} (Liaison Pairokar: ${caseDoc.assignedPairokar || "--"})
            </td>
          </tr>
        </tbody>
      </table>
    `;

    // Section 2: Connected Writs
    const connectedWrits = caseDoc.connectedWrits || [];
    const connectedTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 2: TAGGED & CONNECTED WRITS ROSTER (${connectedWrits.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 28px; text-align: center;">#</th>
            <th style="width: 140px;">Connected Writ No</th>
            <th style="width: 160px;">CNR Number</th>
            <th>Tagged Litigant / Petitioner</th>
            <th style="width: 85px; text-align: center;">Tagged On</th>
          </tr>
        </thead>
        <tbody>
          ${
            connectedWrits.length > 0
              ? connectedWrits
                  .map(
                    (cw, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: 700;">${cw.writNumber}</td>
                <td style="font-family: monospace;">${cw.cnrNumber || "--"}</td>
                <td>${cw.petitionerName || "--"}</td>
                <td style="text-align: center;">${cw.taggedDate ? new Date(cw.taggedDate).toLocaleDateString("en-GB") : "--"}</td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="5" style="text-align: center; color: #444444; padding: 5px;">No connected / clubbed petitions tagged to this leading dossier.</td></tr>`
          }
        </tbody>
      </table>
    `;

    // Section 3: Litigants
    const petitionersTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 3: LITIGANT & CANDIDATE REGISTRY ROSTER (${petitioners.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 85px;">Role</th>
            <th style="width: 90px;">Roll No / PNO</th>
            <th>Candidate Name</th>
            <th>Father Name</th>
            <th style="width: 85px;">District</th>
            <th style="width: 70px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            petitioners.length > 0
              ? petitioners
                  .map(
                    (p, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: 600;">${p.role}</td>
                <td style="font-family: monospace; font-weight: 700;">${p.rollNo}</td>
                <td style="font-weight: 600;">${p.name}</td>
                <td>${p.fatherName || "--"}</td>
                <td>${p.district || "--"}</td>
                <td style="text-align: center;">${p.status || "ACTIVE"}</td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="7" style="text-align: center; color: #444444; padding: 5px;">No candidate roster records indexed.</td></tr>`
          }
        </tbody>
      </table>
    `;

    // Section 4: Hearings
    const hearingsTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 4: JUDICIAL PROCEEDINGS & COURT ORDERS TIMELINE (${hearings.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 70px;">Hearing Date</th>
            <th style="width: 70px;">NDOH</th>
            <th style="width: 90px;">Order Nature</th>
            <th style="width: 70px;">Room / Hall</th>
            <th>Business Recorded / Court Direction</th>
            <th style="width: 95px;">Logged By</th>
          </tr>
        </thead>
        <tbody>
          ${
            hearings.length > 0
              ? hearings
                  .map(
                    (h, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${new Date(h.hearingDate).toLocaleDateString("en-GB")}</td>
                <td style="font-weight: 700;">${h.ndoh ? new Date(h.ndoh).toLocaleDateString("en-GB") : "--"}</td>
                <td style="font-weight: 600;">${h.orderType}</td>
                <td>${h.courtRoomNo || "--"}</td>
                <td style="line-height: 1.35;">${h.businessRecorded}</td>
                <td style="font-size: 8px;">${h.enteredByOfficerName}<br/><span>(${h.enteredByDesignation})</span></td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="7" style="text-align: center; color: #444444; padding: 5px;">No judicial hearings recorded yet.</td></tr>`
          }
        </tbody>
      </table>
    `;

    // Section 5: File Movements
    const movementsTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 5: INTERNAL DESK TRANSIT & GREEN SHEET MOVEMENT AUDIT (${movements.length})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 85px;">Dispatched Date</th>
            <th style="width: 75px;">Action</th>
            <th style="width: 125px;">Dispatched By</th>
            <th style="width: 125px;">Recipient Desk</th>
            <th>Purpose / Noting Remarks</th>
            <th style="width: 65px; text-align: center;">Hold Time</th>
          </tr>
        </thead>
        <tbody>
          ${
            movements.length > 0
              ? movements
                  .map(
                    (m, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${new Date(m.dispatchedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td style="font-weight: 600;">${m.actionType}</td>
                <td>${m.fromOfficerName} (${m.fromDesignation})</td>
                <td style="font-weight: 600;">${m.toOfficerName} (${m.toDesignation})</td>
                <td>${m.notingPurpose}${m.remarks ? ` — ${m.remarks}` : ""}</td>
                <td style="text-align: center; font-weight: 700;">${m.holdDurationDays}d ${m.holdDurationHours}h</td>
              </tr>`
                  )
                  .join("")
              : `<tr><td colspan="7" style="text-align: center; color: #444444; padding: 5px;">No physical/digital movements recorded yet.</td></tr>`
          }
        </tbody>
      </table>
    `;

    const fullContentHtml = `
      ${profileTableHtml}
      ${connectedTableHtml}
      ${petitionersTableHtml}
      ${hearingsTableHtml}
      ${movementsTableHtml}
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle: `360° Litigation Dossier: ${caseDoc.fileNo}`,
      reportSubtitle: `Judicial Audit & Life-Cycle Brief · ${caseDoc.writNumber || caseDoc.noticeNumber || "Advance Notice"}`,
      generatedBy: {
        name: req.user?.name || req.user?.username || "Legal Officer",
        designation: req.user?.designation,
        role: req.user?.role,
      },
      filterMetaText: `Court: ${caseDoc.court} | Stage: ${caseDoc.stage} | OIC: ${caseDoc.assignedOIC}`,
      contentHtml: fullContentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlOutput);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};