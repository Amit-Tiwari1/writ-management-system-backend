import mongoose, { Schema } from "mongoose";
import { ICaseDocument, IAnnotation } from "../types/dms.types";

const AnnotationSchema = new Schema<IAnnotation>(
  {
    pageNumber: { type: Number, required: true },
    selectedText: { type: String, default: "", trim: true },
    comment: { type: String, required: true, trim: true },
    authorName: { type: String, required: true, trim: true },
    authorDesignation: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const CaseDocumentSchema = new Schema<ICaseDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
      index: true,
    },
    folderCategory: {
      type: String,
      enum: [
        "01_petitions",
        "02_notings",
        "03_counter_affidavits",
        "04_orders",
        "05_compliance_proofs",
      ],
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: "application/pdf",
      trim: true,
    },
    s3Key: {
      type: String,
      required: true,
      trim: true,
    },
    s3Bucket: {
      type: String,
      default: "UPPRPB-legal-docs",
      trim: true,
    },
    documentUrl: {
      type: String,
      default: "",
      trim: true,
    },
    sha256Hash: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: String,
      default: "v1.0",
      trim: true,
    },
    isVerifiedCopy: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    annotations: [AnnotationSchema],
    ocrTextContent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

CaseDocumentSchema.index({ caseId: 1, folderCategory: 1 });
CaseDocumentSchema.index({ fileName: "text", ocrTextContent: "text" });

export const CaseDocument = mongoose.model<ICaseDocument>(
  "CaseDocument",
  CaseDocumentSchema
);