import { Request, Response } from "express";
import { Types } from "mongoose";
import { CaseDocument } from "../models/DocumentDMS";
import { Case } from "../models/Case";
import { StorageService } from "../services/storageService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";
import { FolderCategoryType } from "../types/dms.types";

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

/**
 * 3.0 Document DMS & Tree — Fetch Categorized Dossier Folders
 */
export const getCaseDocuments = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const documents = await CaseDocument.find({ caseId })
      .sort({ createdAt: -1 })
      .lean();

    const structuredFolders = {
      "01_petitions": documents.filter((d) => d.folderCategory === "01_petitions"),
      "02_notings": documents.filter((d) => d.folderCategory === "02_notings"),
      "03_counter_affidavits": documents.filter((d) => d.folderCategory === "03_counter_affidavits"),
      "04_orders": documents.filter((d) => d.folderCategory === "04_orders"),
      "05_compliance_proofs": documents.filter((d) => d.folderCategory === "05_compliance_proofs"),
    };

    return res.status(200).json({
      success: true,
      totalCount: documents.length,
      data: structuredFolders,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Upload New Case Document to Cloudinary & Index in DMS Ledger
 */
export const uploadCaseDocument = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const { folderCategory, ocrTextContent } = req.body;
    const file = (req as any).file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ success: false, message: "File is required under field 'file'." });
    }

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Associated Case not found." });
    }

    const validCategories: FolderCategoryType[] = [
      "01_petitions",
      "02_notings",
      "03_counter_affidavits",
      "04_orders",
      "05_compliance_proofs",
    ];

    const folderSlug: FolderCategoryType = validCategories.includes(folderCategory as FolderCategoryType)
      ? (folderCategory as FolderCategoryType)
      : "01_petitions";

    const caseSlug = caseDoc.fileNo.replace(/\//g, "_");
    const targetFolder = `cases/${caseSlug}/${folderSlug}`;

    const storageRes = await StorageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      targetFolder
    );

    const newDoc = await CaseDocument.create({
      caseId: caseDoc._id,
      folderCategory: folderSlug,
      fileName: file.originalname,
      originalName: file.originalname,
      fileSize: storageRes.fileSize,
      mimeType: storageRes.mimeType,
      s3Key: storageRes.publicId,
      s3Bucket: storageRes.secureUrl,
      documentUrl: storageRes.secureUrl,
      sha256Hash: storageRes.sha256Hash,
      version: "v1.0",
      isVerifiedCopy: true,
      uploadedBy: req.user?.name || req.user?.username || "Legal Officer",
      uploadedByUserId: req.user?.id ? new Types.ObjectId(req.user.id) : undefined,
      ocrTextContent: ocrTextContent || "",
    });

    await logAuditEvent(
      req,
      "CASE_DOCUMENT_UPLOADED" as any,
      "DMS",
      newDoc._id.toString(),
      { fileNo: caseDoc.fileNo, fileName: file.originalname, folder: folderSlug },
      "INFO"
    );

    return res.status(201).json({
      success: true,
      message: "Document stored in Cloud Storage & audited in DMS ledger.",
      document: newDoc,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Replace / Version Upgrade Document (v1.0 -> v1.1)
 */
export const replaceCaseDocument = async (req: AuthRequest, res: Response) => {
  try {
    const docId = getParam(req.params.docId);
    const file = (req as any).file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ success: false, message: "New file is required under field 'file'." });
    }

    const existingDoc = await CaseDocument.findById(docId);
    if (!existingDoc) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    const caseDoc = await Case.findById(existingDoc.caseId);
    const caseSlug = caseDoc ? caseDoc.fileNo.replace(/\//g, "_") : "general";
    const targetFolder = `cases/${caseSlug}/${existingDoc.folderCategory}`;

    const storageRes = await StorageService.replaceFile(
      existingDoc.s3Key,
      file.buffer,
      file.originalname,
      file.mimetype,
      targetFolder,
      existingDoc.mimeType.includes("pdf")
    );

    const currentVersionNum = parseFloat(existingDoc.version.replace("v", "")) || 1.0;
    const newVersion = `v${(currentVersionNum + 0.1).toFixed(1)}`;

    existingDoc.fileName = file.originalname;
    existingDoc.originalName = file.originalname;
    existingDoc.fileSize = storageRes.fileSize;
    existingDoc.mimeType = storageRes.mimeType;
    existingDoc.s3Key = storageRes.publicId;
    existingDoc.s3Bucket = storageRes.secureUrl;
    existingDoc.documentUrl = storageRes.secureUrl;
    existingDoc.sha256Hash = storageRes.sha256Hash;
    existingDoc.version = newVersion;
    existingDoc.uploadedBy = req.user?.name || req.user?.username || "Legal Officer";
    existingDoc.uploadedByUserId = req.user?.id ? new Types.ObjectId(req.user.id) : existingDoc.uploadedByUserId;
    await existingDoc.save();

    await logAuditEvent(
      req,
      "CASE_DOCUMENT_VERSION_UPGRADED" as any,
      "DMS",
      existingDoc._id.toString(),
      { newVersion, fileName: file.originalname },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: `Document upgraded to version ${newVersion}.`,
      document: existingDoc,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Delete / Purge Case Document
 */
export const deleteCaseDocument = async (req: AuthRequest, res: Response) => {
  try {
    const docId = getParam(req.params.docId);
    const doc = await CaseDocument.findById(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

    if (doc.folderCategory === "04_orders" && doc.isVerifiedCopy) {
      return res.status(403).json({
        success: false,
        message: "Legal Guard: Certified Court Orders cannot be purged from the dossier.",
      });
    }

    await StorageService.deleteFile(doc.s3Key, doc.mimeType.includes("pdf"));
    await CaseDocument.findByIdAndDelete(docId);

    await logAuditEvent(
      req,
      "CASE_DOCUMENT_DELETED" as any,
      "DMS",
      docId,
      { fileName: doc.fileName, folder: doc.folderCategory },
      "WARNING"
    );

    return res.status(200).json({
      success: true,
      message: "Document purged successfully from storage ledger.",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * View Document Stream Metadata
 */
export const viewDocumentStream = async (req: Request, res: Response) => {
  try {
    const docId = getParam(req.params.docId);
    const doc = await CaseDocument.findById(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

    return res.status(200).json({
      success: true,
      documentName: doc.fileName,
      mimeType: doc.mimeType,
      sha256Hash: doc.sha256Hash,
      viewUrl: doc.documentUrl || doc.s3Bucket,
      version: doc.version,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Add Marginal Annotation / Comment to PDF Page
 */
export const addAnnotation = async (req: AuthRequest, res: Response) => {
  try {
    const docId = getParam(req.params.docId);
    const { pageNumber, selectedText, comment } = req.body;

    const doc = await CaseDocument.findById(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

    doc.annotations.push({
      pageNumber: Number(pageNumber),
      selectedText: selectedText || "",
      comment,
      authorName: req.user?.name || req.user?.username || "Legal Officer",
      authorDesignation: req.user?.designation || req.user?.role || "Staff Officer",
    });

    await doc.save();
    return res.status(201).json({
      success: true,
      message: "Marginal annotation pinned to document.",
      data: doc.annotations,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Search Documents by OCR Content & Filename
 */
export const searchDocumentsOCR = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: "Search keyword 'q' is required." });
    }

    const matches = await CaseDocument.find({
      caseId,
      $or: [
        { fileName: { $regex: String(q), $options: "i" } },
        { ocrTextContent: { $regex: String(q), $options: "i" } },
      ],
    }).select("fileName folderCategory sha256Hash version documentUrl createdAt");

    return res.status(200).json({
      success: true,
      query: q,
      matchCount: matches.length,
      data: matches,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};