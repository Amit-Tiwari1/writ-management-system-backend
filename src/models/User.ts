import mongoose, { Document, Schema } from "mongoose";

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
  lastLogin?: Date;
  resetPasswordOtpHash?: string;
  resetPasswordOtpExpires?: Date;
  signaturePinHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    rank: { type: String, default: "DySP" },
    designation: { type: String, default: "Staff Officer" },
    section: { type: String, default: "Legal Cell" },
    mobile: { type: String, default: "--" },
    email: { type: String, default: "--" },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    role: { type: String, default: "Super Admin" },
    courtBench: {
      type: String,
      enum: ["ALLAHABAD", "LUCKNOW", "BOTH"],
      default: "BOTH",
    },
    resetPasswordOtpHash: { type: String, select: false },
    resetPasswordOtpExpires: { type: Date, select: false },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    lastLogin: { type: Date, default: null },
    signaturePinHash: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
