import mongoose, { Document, Schema } from "mongoose";

// Sub-document: PDF Marginal Annotation
export interface IAnnotation {
  _id?: mongoose.Types.ObjectId;
  pageNumber: number;
  selectedText?: string;
  comment: string;
  authorName: string;
  authorDesignation: string;
  createdAt?: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    pageNumber: { type: Number, required: true },
    selectedText: { type: String, default: "" },
    comment: { type: String, required: true },
    authorName: { type: String, required: true },
    authorDesignation: { type: String, required: true },
  },
  { timestamps: true }
);

// Primary Case Document File
export interface ICaseDocument extends Document {
  caseId: mongoose.Types.ObjectId;
  folderCategory: "01_petitions" | "02_notings" | "03_counter_affidavits" | "04_orders" | "05_compliance_proofs";
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  sha256Hash: string;
  version: string;
  isVerifiedCopy: boolean;
  uploadedBy: string;
  annotations: IAnnotation[];
  ocrTextContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaseDocumentSchema = new Schema<ICaseDocument>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    folderCategory: {
      type: String,
      enum: ["01_petitions", "02_notings", "03_counter_affidavits", "04_orders", "05_compliance_proofs"],
      required: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, default: "application/pdf" },
    s3Key: { type: String, required: true },
    s3Bucket: { type: String, default: "lexwrit-legal-docs" },
    sha256Hash: { type: String, required: true },
    version: { type: String, default: "v1.0" },
    isVerifiedCopy: { type: Boolean, default: true },
    uploadedBy: { type: String, required: true },
    annotations: [AnnotationSchema],
    ocrTextContent: { type: String, default: "" },
  },
  { timestamps: true }
);

// Text Index for OCR Full Text Search (#34)
CaseDocumentSchema.index({ ocrTextContent: "text", fileName: "text" });

export const CaseDocument = mongoose.model<ICaseDocument>("CaseDocument", CaseDocumentSchema);