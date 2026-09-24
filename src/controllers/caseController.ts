import { Request, Response } from "express";
import { Case, Discovery } from "../models/Case";

// 9. GET /api/v1/cases (Filter, Search & Paginate)
export const getCases = async (req: Request, res: Response) => {
  try {
    const { court, section, status, search, page = 1, limit = 20 } = req.query;
    const filter: any = {};

    if (court && court !== "ALL") filter.court = court;
    if (section && section !== "ALL") filter.sectionWing = section;
    if (status && status !== "ALL") filter.judicialStatus = status;

    if (search) {
      filter.$or = [
        { fileDocketNo: { $regex: search,$options: "i" } },
        { cnrNumber: { $regex: search,$options: "i" } },
        { leadPetitioner: { $regex: search,$options: "i" } },
        { caseNumber: { $regex: search,$options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, cases] = await Promise.all([
      Case.countDocuments(filter),
      Case.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
      data: cases,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 10. GET /api/v1/cases/:id (Full Dossier)
export const getCaseById = async (req: Request, res: Response) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });
    res.status(200).json({ success: true, data: caseItem });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 11. PUT /api/v1/cases/:id (Update Case)
export const updateCase = async (req: Request, res: Response) => {
  try {
    const updated = await Case.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Case not found" });
    res.status(200).json({ success: true, message: "Case updated successfully", data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 12. POST /api/v1/cases/:id/sync-ecourts
export const syncCaseFromECourts = async (req: Request, res: Response) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });

    // Mock live NAPIX fetch response
    caseItem.lastSyncedAt = new Date();
    caseItem.syncStatus = "SUCCESS";
    await caseItem.save();

    res.status(200).json({
      success: true,
      message: `eCourts data synced for CNR ${caseItem.cnrNumber}`,
      data: caseItem,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 13. GET /api/v1/cases/export/excel
export const exportCasesExcel = async (req: Request, res: Response) => {
  try {
    const cases = await Case.find().select("fileDocketNo cnrNumber court caseType caseNumber leadPetitioner judicialStatus ndoh");
    res.status(200).json({
      success: true,
      message: "Ready for download",
      recordCount: cases.length,
      data: cases,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 14. POST /api/v1/intake/verify-cnr
export const verifyCNR = async (req: Request, res: Response) => {
  try {
    const { cnrNumber } = req.body;
    if (!cnrNumber || cnrNumber.length < 16) {
      return res.status(400).json({ success: false, message: "Valid 16-digit CNR is required" });
    }

    // Mock High Court NAPIX Lookup Response
    const isAllahabad = cnrNumber.toUpperCase().startsWith("UPHC01");
    const simulatedData = {
      cnrNumber: cnrNumber.toUpperCase(),
      court: isAllahabad ? "High Court of Judicature at Allahabad" : "High Court Allahabad (Lucknow Bench)",
      courtCode: isAllahabad ? "HC-ALD" : "HC-LKO",
      caseType: "WRIT-A",
      caseNumber: Math.floor(1000 + Math.random() * 9000).toString(),
      caseYear: 2026,
      leadPetitioner: "Subhash Chandra & Others",
      respondentString: "State of U.P. thru Additional Chief Secretary (Home) & Chairman UPPRPB",
      benchRoom: "Court No. 12",
      coram: "Hon'ble Sitting Judge Division Bench",
      filingDate: "14-Sep-2026",
      status: "Listed for Admission",
    };

    res.status(200).json({ success: true, message: "CNR successfully verified via NAPIX", data: simulatedData });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 15. POST /api/v1/intake/register
export const registerNewCase = async (req: Request, res: Response) => {
  try {
    const count = await Case.countDocuments();
    const docketNo = `PRPB-R/${count + 1001}/${new Date().getFullYear()}`;

    const newCase = await Case.create({
      ...req.body,
      fileDocketNo: docketNo,
    });

    res.status(201).json({
      success: true,
      message: `Case registered with Docket ${docketNo}`,
      data: newCase,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 16. GET /api/v1/intake/check-duplicate
export const checkDuplicateCase = async (req: Request, res: Response) => {
  try {
    const { cnrNumber, caseNumber, caseYear, caseType } = req.query;
    const existing = await Case.findOne({
      $or: [
        { cnrNumber: cnrNumber ? (cnrNumber as string).toUpperCase() : undefined },
        { caseNumber, caseYear: Number(caseYear), caseType },
      ].filter(Boolean),
    });

    res.status(200).json({
      success: true,
      isDuplicate: !!existing,
      existingDocketNo: existing ? existing.fileDocketNo : null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};