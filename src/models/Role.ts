import mongoose, { Schema } from "mongoose";
import { IRole } from "../types/rbacType";

const RoleSchema = new Schema<IRole>(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    roleCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>("Role", RoleSchema);