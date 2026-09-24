import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  username: string;
  passwordHash: string;
  designation: string;
  section: string;
  mobile: string;
  email: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    designation: { type: String, default: "Staff Officer" },
    section: { type: String, default: "Apex Board" },
    mobile: { type: String, default: "--" },
    email: { type: String, default: "--" },
    role: {
      type: String,
      enum: ["Super Admin", "Head of Legal Cell", "Section Nodal Officer", "Officer-in-Charge (OIC)", "Legal Clerk / Operator", "Read-Only Reviewer"],
      default: "Super Admin",
    },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);