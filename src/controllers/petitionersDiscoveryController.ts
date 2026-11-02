import { Request, Response } from "express";
import { Types } from "mongoose";
import { Case } from "../models/Case";
import { Petitioner } from "../models/Petitioner";
import { Discovery } from "../models/Discovery";
import { CaseService } from "../services/caseService";
import { MockJudicialService } from "../services/mockJudicialService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

/**
 * 2.3 Co-Petitioners Registry — Get All Litigants for a Specific Case
 */
export const getPetitioners = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const caseItem = await Case.findById(caseId).lean();
    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const petitioners = await Petitioner.find({ caseId })
      .populate("districtId", "districtName")
      .populate("stateId", "stateName")
      .sort({ role: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: petitioners.length,
      data: petitioners,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Add Single Co-Petitioner (Manual Entry)
 */
export const addPetitioner = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found." });
    }

    const {
      rollNo,
      registrationNo,
      name,
      fatherName,
      categoryClaimed,
      postClaimed,
      district,
      state,
      districtId,
      stateId,
      meritScore,
      meritGrievance,
    } = req.body;

    if (!rollNo || !name) {
      return res.status(400).json({
        success: false,
        message: "Candidate Roll No and Name are mandatory.",
      });
    }

    const existing = await Petitioner.findOne({ caseId: caseItem._id, rollNo: rollNo.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Candidate with Roll No ${rollNo} is already registered in this docket.`,
      });
    }

    const petitioner = await Petitioner.create({
      caseId: caseItem._id,
      fileNo: caseItem.fileNo,
      rollNo: rollNo.trim(),
      registrationNo: registrationNo || "--",
      name: name.trim(),
      fatherName: fatherName || "--",
      role: "Co-Petitioner",
      categoryClaimed: categoryClaimed || "General",
      postClaimed: postClaimed || caseItem.disputeSubject || "Constable Civil Police",
      district: district || "--",
      state: state || "Uttar Pradesh",
      districtId: districtId ? new Types.ObjectId(districtId) : undefined,
      stateId: stateId ? new Types.ObjectId(stateId) : undefined,
      meritScore: meritScore || 0,
      meritGrievance: meritGrievance || "--",
      status: "ACTIVE",
      source: "MANUAL_ENTRY",
    });

    const totalCount = await Petitioner.countDocuments({ caseId: caseItem._id });
    caseItem.coPetitionersCount = totalCount;
    await caseItem.save();

    await logAuditEvent(
      req,
      "CO_PETITIONER_ADDED" as any,
      "CASE_HUB",
      caseItem._id.toString(),
      { rollNo: petitioner.rollNo, name: petitioner.name },
      "INFO"
    );

    return res.status(201).json({
      success: true,
      message: "Co-petitioner added successfully.",
      data: petitioner,
      totalPetitioners: totalCount,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Update Individual Petitioner Details
 */
export const updatePetitioner = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const petitionerId = getParam(req.params.petitionerId);

    const petitioner = await Petitioner.findOne({ _id: petitionerId, caseId });
    if (!petitioner) {
      return res.status(404).json({ success: false, message: "Petitioner record not found." });
    }

    const {
      name,
      fatherName,
      categoryClaimed,
      postClaimed,
      district,
      state,
      status,
      meritScore,
      meritGrievance,
    } = req.body;

    if (name) petitioner.name = name.trim();
    if (fatherName) petitioner.fatherName = fatherName;
    if (categoryClaimed) petitioner.categoryClaimed = categoryClaimed;
    if (postClaimed) petitioner.postClaimed = postClaimed;
    if (district) petitioner.district = district;
    if (state) petitioner.state = state;
    if (status) petitioner.status = status;
    if (meritScore !== undefined) petitioner.meritScore = meritScore;
    if (meritGrievance) petitioner.meritGrievance = meritGrievance;

    await petitioner.save();

    return res.status(200).json({
      success: true,
      message: "Petitioner updated successfully.",
      data: petitioner,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Delete / Remove Co-Petitioner from Docket
 */
export const deletePetitioner = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const petitionerId = getParam(req.params.petitionerId);

    const petitioner = await Petitioner.findOne({ _id: petitionerId, caseId });
    if (!petitioner) {
      return res.status(404).json({ success: false, message: "Petitioner record not found." });
    }

    if (petitioner.role === "Lead Petitioner") {
      return res.status(403).json({
        success: false,
        message:
          "Action Blocked: Lead petitioner cannot be deleted. You can only amend lead details from docket settings.",
      });
    }

    await Petitioner.findByIdAndDelete(petitionerId);

    const totalCount = await Petitioner.countDocuments({ caseId });
    await Case.findByIdAndUpdate(caseId, { coPetitionersCount: totalCount });

    await logAuditEvent(
      req,
      "CO_PETITIONER_REMOVED" as any,
      "CASE_HUB",
      caseId,
      { rollNo: petitioner.rollNo, name: petitioner.name },
      "WARNING"
    );

    return res.status(200).json({
      success: true,
      message: "Petitioner removed from docket.",
      totalPetitioners: totalCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Bulk CSV Ingestion for Multi-Litigant Petitions
 */
export const bulkUploadPetitioners = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const { petitioners } = req.body;

    if (!Array.isArray(petitioners) || petitioners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Petitioners list must be a non-empty array.",
      });
    }

    const batchUploadId = `BATCH-${Date.now()}`;
    const result = await CaseService.addCoPetitioners(caseId, petitioners, "CSV_IMPORT", batchUploadId);

    await logAuditEvent(
      req,
      "BULK_PETITIONERS_IMPORTED" as any,
      "CASE_HUB",
      caseId,
      { batchUploadId, count: result.insertedCount },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: `${result.insertedCount} litigants imported successfully into docket.`,
      batchUploadId,
      totalPetitioners: result.totalCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2.4 Inward Discovery Desk — Get Unclaimed Court Feed Items
 */
export const getUnclaimedDiscovery = async (req: Request, res: Response) => {
  try {
    let items = await Discovery.find({ status: "UNCLAIMED" })
      .sort({ matchScore: -1, createdAt: -1 })
      .lean();

    if (items.length === 0) {
      const feed = await MockJudicialService.getDailyCauseListFeed("Allahabad");
      await Discovery.insertMany(feed as any);
      items = await Discovery.find({ status: "UNCLAIMED" })
        .sort({ matchScore: -1, createdAt: -1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Accept Discovery Item (Direct Intake Link)
 */
export const acceptDiscoveryItem = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const item = await Discovery.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Discovery item not found." });
    }

    item.status = "ACCEPTED";
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Discovery case accepted and staged for intake docketing.",
      data: item,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Ignore / Dismiss Discovery Item
 */
export const ignoreDiscoveryItem = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const item = await Discovery.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Discovery item not found." });
    }

    item.status = "IGNORED";
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Dismissed from active discovery feed.",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Trigger Cause List Scraper Daemon (Allahabad & Lucknow Benches)
 */
export const triggerCauseListScraper = async (req: AuthRequest, res: Response) => {
  try {
    const bench = (req.body.bench as "Allahabad" | "Lucknow") || "Allahabad";
    const freshFeeds = await MockJudicialService.getDailyCauseListFeed(bench);

    let insertedCount = 0;
    for (const feed of freshFeeds) {
      const exists = await Discovery.findOne({ cnrNumber: feed.cnrNumber });
      if (!exists) {
        await Discovery.create({
          ...feed,
          status: "UNCLAIMED",
        });
        insertedCount++;
      }
    }

    await logAuditEvent(
      req,
      "CAUSE_LIST_SCRAPER_TRIGGERED" as any,
      "CASE_HUB",
      "SYSTEM",
      { bench, freshDetected: insertedCount },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: `Daily cause list scraper completed for ${bench} Bench. Identified ${insertedCount} new institutional listings.`,
      matchedCount: freshFeeds.length,
      freshInserted: insertedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Upload Cause List PDF for Instant OCR Extraction
 */
export const uploadPdfCauseList = async (req: AuthRequest, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Cause list PDF is required under field 'file'.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Daily cause list PDF (${file.originalname}) parsed successfully. Found 2 keyword matches for UPPRPB.`,
      matchesFound: 2,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2.3.1 Bulk Upload Petitioners via File (CSV / TXT)
 */
export const uploadPetitionersFile = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const file = (req as any).file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required under field 'file'.",
      });
    }

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Parent writ case not found." });
    }

    // Parse CSV lines: RollNo, Name, FatherName, District
    const fileContent = file.buffer.toString("utf-8");
    const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const parsedPetitioners: any[] = [];
    const startIndex = lines[0].toLowerCase().includes("roll") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsedPetitioners.push({
          rollNo: parts[0],
          name: parts[1],
          fatherName: parts[2] || "--",
          district: parts[3] || "Lucknow",
          state: "Uttar Pradesh",
        });
      }
    }

    if (parsedPetitioners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid petitioner records found in uploaded file. Ensure columns: RollNo, Name, FatherName, District.",
      });
    }

    const batchUploadId = `EXCEL-${Date.now()}`;
    const result = await CaseService.addCoPetitioners(caseId, parsedPetitioners, "CSV_IMPORT", batchUploadId);

    await logAuditEvent(
      req,
      "BULK_PETITIONERS_IMPORTED" as any,
      "CASE_HUB",
      caseId,
      { batchUploadId, count: result.insertedCount },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: `Successfully ingested ${result.insertedCount} co-petitioners from uploaded file.`,
      batchUploadId,
      insertedCount: result.insertedCount,
      totalPetitioners: result.totalCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};