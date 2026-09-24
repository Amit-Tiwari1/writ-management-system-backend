import mongoose, { Document, Schema } from "mongoose";

// 7.2 Dynamic RBAC Role Schema
export interface IModulePermission {
  moduleKey: string;     // e.g. "cases", "documents", "notings", "compliance", "masters"
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canSign: boolean;
  canExport: boolean;
}

export interface IRole extends Document {
  name: string;
  description: string;
  isSystemDefault: boolean;
  permissions: IModulePermission[];
  createdAt: Date;
  updatedAt: Date;
}

const ModulePermissionSchema = new Schema<IModulePermission>({
  moduleKey: { type: String, required: true },
  moduleName: { type: String, required: true },
  canView: { type: Boolean, default: false },
  canCreate: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canSign: { type: Boolean, default: false },
  canExport: { type: Boolean, default: false },
});

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    isSystemDefault: { type: Boolean, default: false },
    permissions: [ModulePermissionSchema],
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>("Role", RoleSchema);

// 7.3 Tamper-Evident Forensic Audit Log Schema
export interface IAuditLog extends Document {
  timestamp: Date;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string;          // e.g., "CASE_INTAKE", "DSC_SIGN_MINUTE", "USER_STATUS_TOGGLED"
  module: string;
  targetId?: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  ipAddress: string;
  userAgent: string;
  jwtTokenHash: string;
  mutationPayload: any;   // Previous vs New state forensics
  integrityHash: string;  // SHA-256 seal of the transaction
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