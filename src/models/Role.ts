import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  roleName: string;
  roleCode: string;
  description: string;
  isSystemDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    roleName: { type: String, required: true, unique: true },
    roleCode: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: "" },
    isSystemDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>("Role", RoleSchema);