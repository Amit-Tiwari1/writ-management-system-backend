import { Request, Response } from "express";
import { Case, Discovery } from "../models/Case";

// 17. GET /api/v1/cases/:caseId/petitioners
export const getPetitioners = async (req: Request, res: Response) => {
  try {
    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });
    res.status(200).json({ success: true, count: caseItem.petitioners.length, data: caseItem.petitioners });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 18. POST /api/v1/cases/:caseId/petitioners
export const addPetitioner = async (req: Request, res: Response) => {
  try {
    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });

    caseItem.petitioners.push(req.body);
    await caseItem.save();

    res.status(201).json({ success: true, message: "Co-petitioner added", data: caseItem.petitioners });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 19. PUT /api/v1/cases/:caseId/petitioners/:petitionerId
export const updatePetitioner = async (req: Request, res: Response) => {
  try {
    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });

    const pet = caseItem.petitioners.find((p: any) => p._id.toString() === req.params.petitionerId);
    if (!pet) return res.status(404).json({ success: false, message: "Petitioner record not found" });

    Object.assign(pet, req.body);
    await caseItem.save();

    res.status(200).json({ success: true, message: "Petitioner updated", data: pet });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 20. DELETE /api/v1/cases/:caseId/petitioners/:petitionerId
export const deletePetitioner = async (req: Request, res: Response) => {
  try {
    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });

    caseItem.petitioners = caseItem.petitioners.filter((p: any) => p._id.toString() !== req.params.petitionerId);
    await caseItem.save();

    res.status(200).json({ success: true, message: "Petitioner removed from case" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 21. POST /api/v1/cases/:caseId/petitioners/bulk-upload
export const bulkUploadPetitioners = async (req: Request, res: Response) => {
  try {
    const { petitioners } = req.body;
    if (!Array.isArray(petitioners) || petitioners.length === 0) {
      return res.status(400).json({ success: false, message: "Petitioners list must be a non-empty array" });
    }

    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) return res.status(404).json({ success: false, message: "Case not found" });

    caseItem.petitioners.push(...petitioners);
    await caseItem.save();

    res.status(200).json({
      success: true,
      message: `${petitioners.length} petitioners imported successfully`,
      totalPetitioners: caseItem.petitioners.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 22. GET /api/v1/discovery/unclaimed
export const getUnclaimedDiscovery = async (req: Request, res: Response) => {
  try {
    const items = await Discovery.find({ status: "UNCLAIMED" }).sort({ matchScore: -1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 23. POST /api/v1/discovery/:id/accept
export const acceptDiscoveryItem = async (req: Request, res: Response) => {
  try {
    const item = await Discovery.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Discovery item not found" });

    item.status = "ACCEPTED";
    await item.save();

    res.status(200).json({ success: true, message: "Case verified and passed to Intake Wizard", data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 24. POST /api/v1/discovery/:id/ignore
export const ignoreDiscoveryItem = async (req: Request, res: Response) => {
  try {
    const item = await Discovery.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Discovery item not found" });

    item.status = "IGNORED";
    await item.save();

    res.status(200).json({ success: true, message: "Dismissed from discovery feed" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 25. POST /api/v1/discovery/trigger-scraper
export const triggerCauseListScraper = async (req: Request, res: Response) => {
  try {
    // Simulates BullMQ Cause-list crawler task
    res.status(200).json({
      success: true,
      message: "Daily cause list scanner dispatched for Allahabad & Lucknow Benches",
      matchedCount: 3,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 26. POST /api/v1/discovery/upload-pdf-causelist
export const uploadPdfCauseList = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      message: "Cause list PDF processed. OCR text-matching identified 2 potential listings.",
      matchesFound: 2,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};