import mongoose, { Schema } from "mongoose";
import { IRolePermission } from "../types/rbacType";

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
      index: true,
    },
    menuKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    canView: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canSign: { type: Boolean, default: false },
    canExport: { type: Boolean, default: false },
    canDownload: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RolePermissionSchema.index({ roleId: 1, menuKey: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1, menuId: 1 }, { unique: true });

export const RolePermission = mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);