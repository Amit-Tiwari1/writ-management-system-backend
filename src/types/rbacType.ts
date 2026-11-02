import mongoose, { Document } from "mongoose";

export interface IRole extends Document {
  roleName: string;
  roleCode: string;
  description: string;
  isSystemDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRolePermission extends Document {
  roleId: mongoose.Types.ObjectId;
  menuId: mongoose.Types.ObjectId;
  menuKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSign: boolean;
  canExport: boolean;
  canDownload: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleMetricItem {
  _id: string;
  roleName: string;
  roleCode: string;
  description: string;
  usersAssignedCount: number;
}