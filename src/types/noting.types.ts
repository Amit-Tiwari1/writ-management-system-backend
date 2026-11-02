import { Document, Types } from "mongoose";

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

export type NotingPurpose =
  | "PWC / Legal Opinion"
  | "Direction to Section"
  | "Para-Wise Comments (PWC) Approval"
  | "File Movement"
  | "Other";

export type FontEncoding = "Unicode" | "Kruti Dev 14";

export type MinuteStatus = "DRAFT" | "SIGNED_AND_FORWARDED";

export type FileUrgency = "Routine" | "Urgent" | "High Priority (NDOH)";

export interface INotingMinute extends Document {
  caseId: Types.ObjectId;
  minuteNumber: number;
  minuteTitle: string;
  notingPurpose: NotingPurpose;
  fontEncoding: FontEncoding;
  content: string;
  authorId: Types.ObjectId;
  authorName: string;
  authorDesignation: string;
  status: MinuteStatus;
  forwardToUserId?: Types.ObjectId;
  forwardedToOfficerName?: string;
  forwardedToDesignation?: string;
  turnaroundDueDate?: Date;
  fileUrgency: FileUrgency;
  signature?: IDigitalSignature;
  createdAt: Date;
  updatedAt: Date;
}