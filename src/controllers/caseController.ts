// src/controllers/caseController.ts
import { Request, Response } from "express";
import { Case } from "../models/Case";
import { Petitioner } from "../models/Petitioner";
import { Discovery } from "../models/Discovery";
import { CaseService } from "../services/caseService";
import { MockJudicialService } from "../services/mockJudicialService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";


export const getCasesRegister = async (req: Request, res: Response) => {
  try {
    const {
      search,
      court,
      wing,
      statusFilter,
      page = 1,
      limit = 10,
    } = req.query;

    const query: any = {};
    if (search) {
      const searchRegex = new RegExp(search.toString().trim(), "i");
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
      query.courtCode = court;
    }
    if (wing && wing !== "ALL" && wing !== "All Wings") {
      query.sectionWing = wing;
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

    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 10;
    const skip = (pageNum - 1) * limitNum;
    const [cases, total] = await Promise.all([
      Case.find(query).sort({ ndoh: 1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
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
    const caseDoc = await Case.findById(req.params.id).lean();
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
      court,
      courtCode,
      caseType,
      leadPetitioner,
      respondentString,
      assignedOIC,
      assignedPairokar,
      sectionWing,
      category,
      examCycle,
      disputeSubject,
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

    const newCase = await Case.create({
      fileNo,
      noticeNumber: noticeNumber || "",
      writNumber: writNumber || "",
      cnrNumber: cnrNumber ? cnrNumber.toUpperCase() : "",
      identifierTier: tier,
      court: court || "High Court of Judicature at Allahabad",
      courtCode: courtCode || "HC-ALD",
      caseType: caseType || "WRIT-A",
      leadPetitioner,
      respondentString: respondentString || "State of U.P. & Chairman UPPRPB",
      assignedOIC: assignedOIC || "Unassigned (OIC)",
      assignedPairokar: assignedPairokar || "Unassigned (Pairokar)",
      sectionWing: sectionWing || "Recruitment Wing",
      category: category || "Constable Civil Police",
      examCycle: examCycle || "2023-24",
      disputeSubject: disputeSubject || "General Service Matter",
      hasActiveStay: !!hasActiveStay,
      isContemptNotice: !!isContemptNotice,
      coPetitionersCount: petitioners.length,
      syncStatus,
    });

    if (petitioners.length > 0) {
      const petDocs = petitioners.map((p: any) => ({
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        rollNo: p.rollNo,
        name: p.name,
        fatherName: p.fatherName || "--",
        role: p.role || "Co-Petitioner",
        categoryClaimed: p.categoryClaimed || "General",
        postClaimed: p.postClaimed || category,
        district: p.district || "--",
      }));
      await Petitioner.insertMany(petDocs);
    }

    await logAuditEvent(
      req,
      "CASE_INTAKE_REGISTERED",
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
      fileNo: fileNo?.toString(),
      noticeNumber: noticeNumber?.toString(),
      writNumber: writNumber?.toString(),
      cnrNumber: cnrNumber?.toString(),
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
      "CASE_ECOURTS_SYNCED",
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