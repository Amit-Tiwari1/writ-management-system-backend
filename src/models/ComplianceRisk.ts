import mongoose, { Schema } from "mongoose";
import { IComplianceRecord } from "../types/compliance.types";

const ComplianceRecordSchema = new Schema<IComplianceRecord>(
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
    writNumber: {
      type: String,
      required: true,
      trim: true,
    },
    cnrNumber: {
      type: String,
      default: "",
      trim: true,
    },
    court: {
      type: String,
      required: true,
      trim: true,
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Court",
    },
    coramBench: {
      type: String,
      default: "--",
      trim: true,
    },
    petitionerName: {
      type: String,
      required: true,
      trim: true,
    },
    oicName: {
      type: String,
      default: "SP Legal",
      trim: true,
    },
    oicUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    recordType: {
      type: String,
      enum: ["STAY", "CONTEMPT", "GENERAL_DIRECTION"],
      required: true,
      index: true,
    },

    actionMappingId: {
      type: Schema.Types.ObjectId,
      ref: "ActionMapping",
    },
    courtDecisionOutcome: {
      type: String,
      default: "",
      trim: true,
    },

    // Stay Properties
    stayOrderScope: {
      type: String,
      default: "",
      trim: true,
    },
    stayOrderDate: {
      type: Date,
    },
    vacationMotionStatus: {
      type: String,
      enum: [
        "DRAFT PENDING CSC",
        "LISTED FOR ARGUMENTS",
        "URGENT ACTION REQUIRED",
        "VACATION_FILED",
        "DISPOSED",
      ],
      default: "URGENT ACTION REQUIRED",
      index: true,
    },
    vacationDeadline: {
      type: Date,
    },
    vacationFilingDate: {
      type: Date,
    },

    // Contempt Properties
    contemptNumber: {
      type: String,
      default: "",
      trim: true,
    },
    contemnorTitle: {
      type: String,
      default: "Chairman UPPRPB",
      trim: true,
    },
    courtDirections: {
      type: String,
      default: "",
      trim: true,
    },
    directionGivenDate: {
      type: Date,
    },
    complianceDeadlineDate: {
      type: Date,
      index: true,
    },
    totalComplianceDays: {
      type: Number,
      default: 90,
    },
    complianceProgress: {
      type: String,
      default: "Pending at Board",
      trim: true,
    },
    severityLevel: {
      type: String,
      enum: ["CRITICAL", "HIGH_WARNING", "MONITORED"],
      default: "MONITORED",
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLIED_AND_CLOSED"],
      default: "ACTIVE",
      index: true,
    },
    actionTakenByBoard: {
      type: String,
      default: "",
      trim: true,
    },
    complianceAffidavitDate: {
      type: Date,
    },
    complianceProofDocId: {
      type: Schema.Types.ObjectId,
      ref: "CaseDocument",
    },
    complianceProofDocUrl: {
      type: String,
      default: "",
      trim: true,
    },
    closedByOfficerName: {
      type: String,
      default: "",
      trim: true,
    },
    closedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    closedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

ComplianceRecordSchema.index({ recordType: 1, status: 1 });
ComplianceRecordSchema.index({ complianceDeadlineDate: 1, status: 1 });

export const ComplianceRecord = mongoose.model<IComplianceRecord>(
  "ComplianceRecord",
  ComplianceRecordSchema
);