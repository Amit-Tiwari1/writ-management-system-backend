import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/userType";

const UserSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    rank: { 
      type: String, 
      default: "DySP", 
      trim: true 
    },
    designation: { 
      type: String, 
      default: "Staff Officer", 
      trim: true 
    },
    section: { 
      type: String, 
      default: "Legal Cell", 
      trim: true 
    },
    mobile: { 
      type: String, 
      default: "--", 
      trim: true 
    },
    email: { 
      type: String, 
      default: "--", 
      trim: true, 
      lowercase: true 
    },
    roleId: { 
      type: Schema.Types.ObjectId, 
      ref: "Role" 
    },
    role: { 
      type: String, 
      default: "Super Admin", 
      trim: true 
    },
    courtBench: {
      type: String,
      enum: ["ALLAHABAD", "LUCKNOW", "BOTH"],
      default: "BOTH",
    },
    resetPasswordOtpHash: { type: String, select: false },
    resetPasswordOtpExpires: { type: Date, select: false },
    status: { 
      type: String, 
      enum: ["ACTIVE", "INACTIVE"], 
      default: "ACTIVE" 
    },
    lastLogin: { type: Date, default: null },
    signaturePinHash: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
export type { IUser };