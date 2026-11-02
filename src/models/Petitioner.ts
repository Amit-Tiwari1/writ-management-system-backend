import mongoose, { Schema } from "mongoose";
import { IPetitioner } from "../types/petitioner.types";

const PetitionerSchema = new Schema<IPetitioner>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
      index: true,
    },
    fileNo: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    rollNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    registrationNo: {
      type: String,
      trim: true,
      default: "--",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      default: "--",
      trim: true,
    },
    role: {
      type: String,
      enum: ["Lead Petitioner", "Co-Petitioner"],
      default: "Co-Petitioner",
    },
    categoryClaimed: {
      type: String,
      default: "General",
      trim: true,
    },
    postClaimed: {
      type: String,
      default: "Constable Civil Police",
      trim: true,
    },
    state: {
      type: String,
      default: "Uttar Pradesh",
      trim: true,
    },
    district: {
      type: String,
      default: "--",
      trim: true,
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "State",
    },
    districtId: {
      type: Schema.Types.ObjectId,
      ref: "District",
    },
    examCenter: {
      type: String,
      default: "--",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "WITHDRAWN", "DISMISSED_ON_MERIT", "RELIEF_GRANTED"],
      default: "ACTIVE",
      index: true,
    },
    meritScore: {
      type: Number,
      default: 0,
    },
    meritGrievance: {
      type: String,
      default: "--",
      trim: true,
    },
    source: {
      type: String,
      enum: ["MANUAL_ENTRY", "CSV_IMPORT", "ECOURTS_SYNC"],
      default: "MANUAL_ENTRY",
      index: true,
    },
    batchUploadId: {
      type: String,
      default: "",
      index: true,
    },
  },
  { timestamps: true }
);

PetitionerSchema.index({ caseId: 1, rollNo: 1 }, { unique: true });
PetitionerSchema.index({ fileNo: 1, name: "text", rollNo: "text" });

export const Petitioner = mongoose.model<IPetitioner>("Petitioner", PetitionerSchema);