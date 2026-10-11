import mongoose, { Document, Schema } from "mongoose";

// Signature Seal Sub-document
export interface IDigitalSignature {
  signerName: string;
  signerDesignation: string;
  signerSection: string;
  signedAt: Date;
  certificateSerialNumber: string;
  issuerAuthority: string;
  sha256Seal: string;
  isValid: boolean;
}

const DigitalSignatureSchema = new Schema<IDigitalSignature>(
  {
    signerName: { type: String, required: true },
    signerDesignation: { type: String, required: true },
    signerSection: { type: String, required: true },
    signedAt: { type: Date, default: Date.now },
    certificateSerialNumber: { type: String, required: true },
    issuerAuthority: { type: String, default: "eMudhra Sub-CA Class 3" },
    sha256Seal: { type: String, required: true },
    isValid: { type: Boolean, default: true },
  },
  { _id: false }
);

// Primary Green Sheet Minute Document
export interface INotingMinute extends Document {
  caseId: mongoose.Types.ObjectId;
  minuteNumber: number;
  minuteTitle: string;
  notingPurpose: "PWC / Legal Opinion" | "Direction to Section" | "Para-Wise Comments (PWC) Approval" | "File Movement" | "Other";
  fontEncoding: "Unicode" | "Kruti Dev 14";
  content: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorDesignation: string;
  status: "DRAFT" | "SIGNED_AND_FORWARDED";
  forwardToUserId?: mongoose.Types.ObjectId;   // Targeted Recipient User
  forwardedToOfficerName?: string;             // Historical Audit Snapshot
  forwardedToDesignation?: string;             // Historical Audit Snapshot
  turnaroundDueDate?: Date;
  fileUrgency: "Routine" | "Urgent" | "High Priority (NDOH)";
  signature?: IDigitalSignature;
  createdAt: Date;
  updatedAt: Date;
}

const NotingMinuteSchema = new Schema<INotingMinute>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    minuteNumber: { type: Number, required: true },
    minuteTitle: { type: String, default: "" },
    notingPurpose: {
      type: String,
      enum: ["PWC / Legal Opinion", "Direction to Section", "Para-Wise Comments (PWC) Approval", "File Movement", "Other"],
      default: "PWC / Legal Opinion",
    },
    fontEncoding: {
      type: String,
      enum: ["Unicode", "Kruti Dev 14"],
      default: "Unicode",
    },
    content: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorDesignation: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SIGNED_AND_FORWARDED"],
      default: "DRAFT",
      index: true,
    },
    forwardToUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    forwardedToOfficerName: { type: String, default: "" },
    forwardedToDesignation: { type: String, default: "" },
    turnaroundDueDate: { type: Date },
    fileUrgency: {
      type: String,
      enum: ["Routine", "Urgent", "High Priority (NDOH)"],
      default: "High Priority (NDOH)",
    },
    signature: { type: DigitalSignatureSchema },
  },
  { timestamps: true }
);

NotingMinuteSchema.index({ caseId: 1, minuteNumber: 1 }, { unique: true });

export const NotingMinute = mongoose.model<INotingMinute>("NotingMinute", NotingMinuteSchema);