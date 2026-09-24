import mongoose, { Document, Schema } from "mongoose";

// Signature Seal Sub-document
export interface IDigitalSignature {
  signerName: string;
  signerDesignation: string;
  signerSection: string;
  signedAt: Date;
  certificateSerialNumber: string;
  issuerAuthority: string; // e.g. eMudhra / (n)Code NIC CA
  sha256Seal: string;      // Cryptographic hash of content + timestamp
  isValid: boolean;
}

const DigitalSignatureSchema = new Schema<IDigitalSignature>({
  signerName: { type: String, required: true },
  signerDesignation: { type: String, required: true },
  signerSection: { type: String, required: true },
  signedAt: { type: Date, default: Date.now },
  certificateSerialNumber: { type: String, required: true },
  issuerAuthority: { type: String, default: "eMudhra Sub-CA III" },
  sha256Seal: { type: String, required: true },
  isValid: { type: Boolean, default: true },
});

// Primary Green Sheet Minute Document
export interface INotingMinute extends Document {
  caseId: mongoose.Types.ObjectId;
  minuteNumber: number;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorDesignation: string;
  subjectLine: string;
  content: string; // Rich-text / Plain secretariat note
  status: "DRAFT" | "SIGNED_AND_FORWARDED";
  forwardedToOfficerName?: string;
  forwardedToDesignation?: string;
  isUrgentDak: boolean;
  signature?: IDigitalSignature;
  createdAt: Date;
  updatedAt: Date;
}

const NotingMinuteSchema = new Schema<INotingMinute>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    minuteNumber: { type: Number, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorDesignation: { type: String, required: true },
    subjectLine: { type: String, default: "Regarding Para-Wise Comments & High Court Compliance" },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SIGNED_AND_FORWARDED"],
      default: "DRAFT",
    },
    forwardedToOfficerName: { type: String, default: "" },
    forwardedToDesignation: { type: String, default: "" },
    isUrgentDak: { type: Boolean, default: false },
    signature: { type: DigitalSignatureSchema },
  },
  { timestamps: true }
);

// Compound unique index ensuring no two minutes share the same number in one case
NotingMinuteSchema.index({ caseId: 1, minuteNumber: 1 }, { unique: true });

export const NotingMinute = mongoose.model<INotingMinute>("NotingMinute", NotingMinuteSchema);