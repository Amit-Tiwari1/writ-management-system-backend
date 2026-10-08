import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  timestamp: Date;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string;
  module: string;
  targetId?: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  ipAddress: string;
  userAgent: string;
  jwtTokenHash: string;
  mutationPayload: any;
  integrityHash: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    targetId: { type: String, default: "" },
    severity: { type: String, enum: ["INFO", "WARNING", "CRITICAL"], default: "INFO" },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: "" },
    jwtTokenHash: { type: String, required: true },
    mutationPayload: { type: Schema.Types.Mixed, default: {} },
    integrityHash: { type: String, required: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ module: 1, action: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);