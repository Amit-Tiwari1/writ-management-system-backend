import mongoose, { Document, Schema } from "mongoose";

export interface IPetitioner extends Document {
  caseId: mongoose.Types.ObjectId;
  fileNo: string;
  rollNo: string; // Roll No / PNO
  registrationNo?: string; // Form Registration No from old ASP.NET system
  name: string;
  fatherName?: string;
  role: "Lead Petitioner" | "Co-Petitioner";
  categoryClaimed: string;
  postClaimed: string;
  state: string;
  district: string;
  examCenter?: string;
  status: "ACTIVE" | "WITHDRAWN" | "DISMISSED_ON_MERIT" | "RELIEF_GRANTED";
  meritScore?: number;
  meritGrievance?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PetitionerSchema = new Schema<IPetitioner>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    fileNo: { type: String, required: true, index: true },
    rollNo: { type: String, required: true, trim: true, index: true },
    registrationNo: { type: String, trim: true, default: "--" },
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, default: "--" },
    role: { type: String, enum: ["Lead Petitioner", "Co-Petitioner"], default: "Co-Petitioner" },
    categoryClaimed: { type: String, default: "General" },
    postClaimed: { type: String, default: "Constable Civil Police" },
    state: { type: String, default: "Uttar Pradesh" },
    district: { type: String, default: "--" },
    examCenter: { type: String, default: "--" },
    status: {
      type: String,
      enum: ["ACTIVE", "WITHDRAWN", "DISMISSED_ON_MERIT", "RELIEF_GRANTED"],
      default: "ACTIVE",
    },
    meritScore: { type: Number, default: 0 },
    meritGrievance: { type: String, default: "--" },
  },
  { timestamps: true }
);

PetitionerSchema.index({ caseId: 1, rollNo: 1 }, { unique: true });

export const Petitioner = mongoose.model<IPetitioner>("Petitioner", PetitionerSchema);