import mongoose, { Document, Schema } from "mongoose";

export type AuditActionType =
  | "CASE_REGISTRATION"
  | "CASE_INTAKE_REGISTERED"
  | "CASE_ECOURTS_SYNCED"
  | "DIGITAL_SIGN_NOTE"
  | "SYNC_STATUS_UPDATE"
  | "DOCUMENT_UPLOAD"
  | "SECURITY_MUTATION"
  | "USER_MANAGEMENT"
  | "USER_LOGIN"
  | "USER_LOGOUT";

export interface IAuditLog extends Document {
  logId: string;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  userDesignation: string;
  sourceIp: string;
  actionType: AuditActionType;
  targetDossier: string;
  mutationSummary: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  payloadSnapshot?: any;
  sha256ChainHash: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    logId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    userDesignation: { type: String, default: "Legal Officer" },
    sourceIp: { type: String, default: "127.0.0.1" },
    actionType: {
      type: String,
      enum: [
        "CASE_REGISTRATION",
        "CASE_INTAKE_REGISTERED",
        "CASE_ECOURTS_SYNCED",
        "DIGITAL_SIGN_NOTE",
        "SYNC_STATUS_UPDATE",
        "DOCUMENT_UPLOAD",
        "SECURITY_MUTATION",
        "USER_MANAGEMENT",
        "USER_LOGIN",
        "USER_LOGOUT",
      ],
      required: true,
      index: true,
    },
    targetDossier: { type: String, required: true },
    mutationSummary: { type: String, required: true },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
      index: true,
    },
    payloadSnapshot: { type: Schema.Types.Mixed, default: {} },
    sha256ChainHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);