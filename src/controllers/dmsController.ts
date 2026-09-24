import { Request, Response } from "express";
import crypto from "crypto";
import { CaseDocument } from "../models/DocumentDMS";
import { Case } from "../models/Case";
import { AuthRequest } from "../middlewares/authMiddleware";

// 27. GET /api/v1/cases/:caseId/documents (Folder Tree & Files)
export const getCaseDocuments = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const documents = await CaseDocument.find({ caseId }).sort({ createdAt: -1 });

    // Grouping by standard 5 case folders
    const structuredFolders = {
      "01_petitions": documents.filter((d) => d.folderCategory === "01_petitions"),
      "02_notings": documents.filter((d) => d.folderCategory === "02_notings"),
      "03_counter_affidavits": documents.filter((d) => d.folderCategory === "03_counter_affidavits"),
      "04_orders": documents.filter((d) => d.folderCategory === "04_orders"),
      "05_compliance_proofs": documents.filter((d) => d.folderCategory === "05_compliance_proofs"),
    };

    res.status(200).json({
      success: true,
      totalCount: documents.length,
      data: structuredFolders,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 28. POST /api/v1/cases/:caseId/documents/presigned-url
export const getPresignedUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const { fileName, folderCategory } = req.body;

    if (!fileName || !folderCategory) {
      return res.status(400).json({ success: false, message: "fileName and folderCategory are required" });
    }

    const uniqueId = crypto.randomBytes(8).toString("hex");
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `cases/${caseId}/${folderCategory}/${uniqueId}-${sanitizedName}`;

    // Mock/Simulated S3 MinIO presigned URL
    const uploadUrl = `https://s3.lexwrit.internal/lexwrit-legal-docs/${s3Key}?X-Amz-Signature=mock_signature_${uniqueId}`;

    res.status(200).json({
      success: true,
      data: {
        uploadUrl,
        s3Key,
        s3Bucket: "lexwrit-legal-docs",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 29. POST /api/v1/cases/:caseId/documents/confirm-upload
export const confirmDocumentUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const { fileName, originalName, folderCategory, fileSize, s3Key, sha256Hash, mimeType } = req.body;

    const caseExists = await Case.findById(caseId);
    if (!caseExists) {
      return res.status(404).json({ success: false, message: "Associated Case not found" });
    }

    // Auto-generate SHA-256 hash if not sent from client
    const fileHash = sha256Hash || crypto.createHash("sha256").update(s3Key + Date.now()).digest("hex");

    const newDoc = await CaseDocument.create({
      caseId,
      folderCategory,
      fileName,
      originalName: originalName || fileName,
      fileSize: fileSize || 1024 * 500, // default 500KB
      mimeType: mimeType || "application/pdf",
      s3Key,
      sha256Hash: fileHash,
      version: "v1.0",
      isVerifiedCopy: true,
      uploadedBy: req.user?.username || "Legal Officer",
    });

    res.status(201).json({
      success: true,
      message: "Document committed to encrypted DMS ledger",
      data: newDoc,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 30. GET /api/v1/cases/:caseId/documents/:docId/view
export const viewDocumentStream = async (req: Request, res: Response) => {
  try {
    const doc = await CaseDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    // Mock secure temporary view token URL
    const secureViewUrl = `https://dms.lexwrit.internal/view/${doc.s3Key}?token=view_${crypto.randomBytes(16).toString("hex")}`;

    res.status(200).json({
      success: true,
      documentName: doc.fileName,
      mimeType: doc.mimeType,
      sha256Hash: doc.sha256Hash,
      viewUrl: secureViewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 31. GET /api/v1/cases/:caseId/documents/:docId/download
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const doc = await CaseDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    const downloadUrl = `https://dms.lexwrit.internal/download/${doc.s3Key}?disposition=attachment`;

    res.status(200).json({
      success: true,
      downloadUrl,
      fileName: doc.fileName,
      sha256Hash: doc.sha256Hash,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 32. POST /api/v1/cases/:caseId/documents/:docId/annotations
export const addAnnotation = async (req: AuthRequest, res: Response) => {
  try {
    const { pageNumber, selectedText, comment } = req.body;
    const doc = await CaseDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    const annotation = {
      pageNumber: Number(pageNumber),
      selectedText: selectedText || "",
      comment,
      authorName: req.user?.username || "Legal Officer",
      authorDesignation: req.user?.role || "Staff Officer",
    };

    doc.annotations.push(annotation as any);
    await doc.save();

    res.status(201).json({
      success: true,
      message: "Marginal annotation pinned to document",
      data: doc.annotations,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 33. GET /api/v1/cases/:caseId/documents/:docId/annotations
export const getAnnotations = async (req: Request, res: Response) => {
  try {
    const doc = await CaseDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    res.status(200).json({
      success: true,
      count: doc.annotations.length,
      data: doc.annotations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 34. GET /api/v1/cases/:caseId/documents/search-ocr
export const searchDocumentsOCR = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: "Search keyword 'q' is required" });
    }

    const matches = await CaseDocument.find({
      caseId,
      $or: [
        { fileName: { $regex: q as string,$options: "i" } },
        { ocrTextContent: { $regex: q as string,$options: "i" } },
      ],
    }).select("fileName folderCategory sha256Hash createdAt");

    res.status(200).json({
      success: true,
      query: q,
      matchCount: matches.length,
      data: matches,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};