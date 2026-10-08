import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  username: string;
  passwordHash: string;
  rank?: string; // Constable, Sub-Inspector, DySP, SP, ADG, etc.
  designation: string; // e.g. "Registry Officer (OIC)", "Desk Assistant"
  section: string; // e.g. "Recruitment Wing", "Legal Cell", "Promotion Wing"
  mobile: string;
  email: string;
  roleId?: mongoose.Types.ObjectId;
  role: string;
  courtBench?: "ALLAHABAD" | "LUCKNOW" | "BOTH"; // Court assignment if pairokar/counsel
  status: "ACTIVE" | "INACTIVE";
  lastLogin?: Date;
  signaturePinHash?: string; // Optional: Quick PIN for digital noting sign
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    rank: { type: String, default: "DySP" },
    designation: { type: String, default: "Staff Officer" },
    section: { type: String, default: "Legal Cell" },
    mobile: { type: String, default: "--" },
    email: { type: String, default: "--" },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    role: { type: String, default: "Super Admin" },
    courtBench: { type: String, enum: ["ALLAHABAD", "LUCKNOW", "BOTH"], default: "BOTH" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    lastLogin: { type: Date, default: null },
    signaturePinHash: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);