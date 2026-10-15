import { Request, Response } from "express";
import { Case } from "../models/Case";
import { Petitioner } from "../models/Petitioner";
import { Discovery } from "../models/Discovery";
import { Court, CaseType, CaseCategory, CaseSubCategory, CaseSubject } from "../models/Masters";
import { CaseService } from "../services/caseService";
import { MockJudicialService } from "../services/mockJudicialService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";
import { NotificationService } from "../services/notificationService";
import { User } from "../models/User";
import { renderPdfDocument } from "../utils/pdfTemplate";
import { CaseMovementHistory } from "../models/CaseMovementHistory";

export const getCasesRegister = async (req: Request, res: Response) => {
  try {
    const {
      search,
      court,
      wing,
      statusFilter,
      hearingDate,
      page = 1,
      limit = 10,
    } = req.query;

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

    if (hearingDate) {
      const start = new Date(String(hearingDate));
      start.setHours(0, 0, 0, 0);
      const end = new Date(String(hearingDate));
      end.setHours(23, 59, 59, 999);
      query.ndoh = { $gte: start,$lte: end };
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
        totalPages: Math.ceil(total / limitNum),
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

export const getCaseById = async (req: Request, res: Response) => {
  try {
    const caseDoc = await Case.findById(req.params.id)
      .populate("courtId", "courtName shortCode location")
      .populate("caseTypeId", "caseTypeName shortName")
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName defaultOfficerName")
      .populate("subjectId", "subjectTitle")
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }
    const petitioners = await Petitioner.find({ caseId: caseDoc._id }).lean();
    return res.status(200).json({
      success: true,
      case: caseDoc,
      petitioners,
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
      categoryId,
      category,
      subCategoryId,
      subCategory,
      subjectId,
      disputeSubject,
      leadPetitioner,
      respondentString,
      assignedOIC,
      assignedPairokar,
      sectionWing,
      examCycle,
      hasActiveStay,
      isContemptNotice,
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

    let resolvedCategory = category || "Recruitment";
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
      categoryId: categoryId || undefined,
      category: resolvedCategory,
      subCategoryId: subCategoryId || undefined,
      subCategory: resolvedSubCategory,
      subjectId: subjectId || undefined,
      disputeSubject: resolvedSubject,
      leadPetitioner,
      respondentString: respondentString || "State of U.P. & Chairman UPPRPB",
      assignedOIC: assignedOIC || "Unassigned (OIC)",
      assignedPairokar: assignedPairokar || "Unassigned (Pairokar)",
      sectionWing: sectionWing || "Recruitment Wing",
      examCycle: examCycle || "2023-24",
      hasActiveStay: !!hasActiveStay,
      isContemptNotice: !!isContemptNotice,
      coPetitionersCount: petitioners.length,
      syncStatus,
      internalHold: {
        currentHolderId: initialHolderId,
        location: holderLocation,
        holdDays: 0,
        heldSince: new Date(),
      },
    });

    if (petitioners.length > 0) {
      const petDocs = petitioners.map((p: any) => ({
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        rollNo: p.rollNo,
        registrationNo: p.registrationNo || "--",
        name: p.name,
        fatherName: p.fatherName || "--",
        role: p.role || "Co-Petitioner",
        categoryClaimed: p.categoryClaimed || "General",
        postClaimed: p.postClaimed || resolvedCategory,
        state: p.state || "Uttar Pradesh",
        district: p.district || "--",
      }));
      await Petitioner.insertMany(petDocs);
    }

    if (oicUser) {
      await CaseService.recordFileMovement({
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        fromUser: {
          id: req.user?.id,
          name: req.user?.name || "Registry Officer",
          designation: req.user?.designation || "Case Intake Desk",
        },
        toUser: {
          id: oicUser._id,
          name: oicUser.name,
          designation: oicUser.designation,
        },
        actionType: "INITIAL_INTAKE",
        notingPurpose: "Case Docket Ingestion & Initial OIC Assignment",
        receivedAt: newCase.createdAt,
      });

      NotificationService.sendNotification({
        recipientId: oicUser._id,
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        type: "HEARING_REMINDER",
        title: `New Case Assigned: ${newCase.fileNo}`,
        message: `A fresh case docket ${newCase.writNumber || newCase.noticeNumber} (${newCase.leadPetitioner}) has been designated to your desk as OIC.`,
        isUrgent: newCase.hasActiveStay || newCase.isContemptNotice,
        senderName: req.user?.name || req.user?.username || "Registry Officer",
        senderDesignation: req.user?.designation || "Case Intake Desk",
        extraMeta: {
          writOrNotice: newCase.writNumber || newCase.noticeNumber,
          court: newCase.court,
          petitioner: newCase.leadPetitioner,
          roleAssigned: "Officer-in-Charge (OIC)",
        },
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

export const triggerCaseSync = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updatedCase = await CaseService.syncCaseWithECourts(caseId);

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
    const { writNumber, cnrNumber, petitionerName } = req.body;
    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

    caseDoc.connectedWrits.push({
      writNumber,
      cnrNumber: cnrNumber || "",
      petitionerName: petitionerName || "",
      taggedDate: new Date(),
    });

    await caseDoc.save();
    return res.status(200).json({
      success: true,
      message: "Connected writ tagged successfully.",
      connectedWrits: caseDoc.connectedWrits,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCasePetitioners = async (req: Request, res: Response) => {
  try {
    const petitioners = await Petitioner.find({ caseId: req.params.caseId }).lean();
    return res.status(200).json({ success: true, count: petitioners.length, petitioners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addCoPetitioner = async (req: Request, res: Response) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

    const petitioner = await Petitioner.create({
      ...req.body,
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
    });

    caseDoc.coPetitionersCount += 1;
    await caseDoc.save();

    return res.status(201).json({ success: true, petitioner });
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

export const exportCasesController = async (req: AuthRequest, res: Response) => {
  try {
    const { search, court, wing, statusFilter, format = "csv" } = req.query;

    const query: any = {};

    if (search && String(search).trim().length >= 3) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      query.$or = [
        { fileNo: searchRegex },
        { noticeNumber: searchRegex },
        { writNumber: searchRegex },
        { cnrNumber: searchRegex },
        { leadPetitioner: searchRegex },
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

    if (statusFilter === "with_connected") {
      query["connectedWrits.0"] = { $exists: true };
    } else if (statusFilter === "advance_notice") {
      query.identifierTier = 2;
    } else if (statusFilter === "stay") {
      query.hasActiveStay = true;
    } else if (statusFilter === "contempt") {
      query.isContemptNotice = true;
    }

    const cases = await Case.find(query).sort({ createdAt: -1 }).lean();

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
        court && court !== "ALL" ? `Court: ${court}` : null,
        wing && wing !== "ALL" ? `Wing: ${wing}` : null,
        search ? `Search: "${search}"` : null,
      ]
        .filter(Boolean)
        .join(" | ") || "All Registered Cases";

      const fullHtml = renderPdfDocument({
        reportTitle: "Writ Litigation Master Registry Register",
        reportSubtitle: `Consolidated Dossier · Total Records: ${cases.length}`,
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
    const { id } = req.params;
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