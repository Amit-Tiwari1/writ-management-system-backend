import mongoose, { Document, Schema } from "mongoose";

export interface IComplianceRecord extends Document {
  caseId: mongoose.Types.ObjectId;
  fileNo: string;
  writNumber: string;
  cnrNumber?: string;
  court: string;
  coramBench?: string;
  petitionerName: string;
  oicName: string;

  recordType: "STAY" | "CONTEMPT" | "GENERAL_DIRECTION";

  // --- 5.1 Stay Details ---
  stayOrderScope?: string;
  stayOrderDate?: Date;
  vacationMotionStatus?: "DRAFT PENDING CSC" | "LISTED FOR ARGUMENTS" | "URGENT ACTION REQUIRED" | "VACATION_FILED" | "DISPOSED";
  vacationDeadline?: Date;
  vacationFilingDate?: Date;

  // --- 5.2 Contempt Details ---
  contemptNumber?: string;
  contemnorTitle?: string; // e.g. "Chairman UPPRPB", "Member Secretary / ADG"
  courtDirections?: string;
  directionGivenDate?: Date;
  complianceDeadlineDate?: Date;
  totalComplianceDays?: number;
  complianceProgress?: string; // e.g. "Order Drafted, Awaiting Signature"
  severityLevel: "CRITICAL" | "HIGH_WARNING" | "MONITORED";

  // --- 5.3 Archival Details ---
  status: "ACTIVE" | "COMPLIED_AND_CLOSED";
  actionTakenByBoard?: string; // e.g. "Appointment letter issued as Sub Inspector on 12-Aug-2026"
  complianceAffidavitDate?: Date;
  complianceProofDocId?: mongoose.Types.ObjectId;
  complianceProofDocUrl?: string;
  closedByOfficerName?: string;
  closedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ComplianceRecordSchema = new Schema<IComplianceRecord>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    fileNo: { type: String, required: true, index: true },
    writNumber: { type: String, required: true },
    cnrNumber: { type: String, default: "" },
    court: { type: String, required: true },
    coramBench: { type: String, default: "--" },
    petitionerName: { type: String, required: true },
    oicName: { type: String, default: "SP Legal" },

    recordType: {
      type: String,
      enum: ["STAY", "CONTEMPT", "GENERAL_DIRECTION"],
      required: true,
      index: true,
    },

    stayOrderScope: { type: String, default: "" },
    stayOrderDate: { type: Date },
    vacationMotionStatus: {
      type: String,
      enum: ["DRAFT PENDING CSC", "LISTED FOR ARGUMENTS", "URGENT ACTION REQUIRED", "VACATION_FILED", "DISPOSED"],
      default: "URGENT ACTION REQUIRED",
    },
    vacationDeadline: { type: Date },
    vacationFilingDate: { type: Date },

    contemptNumber: { type: String, default: "" },
    contemnorTitle: { type: String, default: "Chairman UPPRPB" },
    courtDirections: { type: String, default: "" },
    directionGivenDate: { type: Date },
    complianceDeadlineDate: { type: Date },
    totalComplianceDays: { type: Number, default: 42 },
    complianceProgress: { type: String, default: "Pending at Board" },
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
    actionTakenByBoard: { type: String, default: "" },
    complianceAffidavitDate: { type: Date },
    complianceProofDocId: { type: Schema.Types.ObjectId, ref: "CaseDocument" },
    complianceProofDocUrl: { type: String, default: "" },
    closedByOfficerName: { type: String, default: "" },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

export const ComplianceRecord = mongoose.model<IComplianceRecord>("ComplianceRecord", ComplianceRecordSchema);