import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  username: string;
  passwordHash: string;
  rank?: string;
  designation: string;
  section: string;
  mobile: string;
  email: string;
  roleId?: mongoose.Types.ObjectId;
  role: string;
  courtBench?: "ALLAHABAD" | "LUCKNOW" | "BOTH";
  status: "ACTIVE" | "INACTIVE";
  lastLogin?: Date | null;
  resetPasswordOtpHash?: string;
  resetPasswordOtpExpires?: Date;
  signaturePinHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HydratedUserResponse {
  id: string;
  name: string;
  username: string;
  rank?: string;
  designation: string;
  section: string;
  mobile: string;
  email: string;
  role: string;
  roleId?: string;
  courtBench?: string;
  status: string;
  lastLogin?: Date | null;
  permissions: any[];
  allowedMenus: any[];
}

export interface UserContactDetails {
  name: string;
  mobile: string;
  email: string;
  designation: string;
  rank?: string;
  section: string;
}