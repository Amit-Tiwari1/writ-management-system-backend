import { Document, Types } from "mongoose";

export type FolderCategoryType =
  | "01_petitions"
  | "02_notings"
  | "03_counter_affidavits"
  | "04_orders"
  | "05_compliance_proofs";

export interface IAnnotation {
  _id?: Types.ObjectId;
  pageNumber: number;
  selectedText?: string;
  comment: string;
  authorName: string;
  authorDesignation: string;
  createdAt?: Date;
}

export interface ICaseDocumentBase {
  caseId: Types.ObjectId;
  folderCategory: FolderCategoryType;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  documentUrl?: string;
  sha256Hash: string;
  version: string;
  isVerifiedCopy: boolean;
  uploadedBy: string;
  uploadedByUserId?: Types.ObjectId;
  annotations: IAnnotation[];
  ocrTextContent?: string;
}

export interface ICaseDocument extends ICaseDocumentBase, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}