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

  stayOrderScope?: string;
  stayOrderDate?: Date;
  vacationMotionStatus?: "DRAFT PENDING CSC" | "LISTED FOR ARGUMENTS" | "URGENT ACTION REQUIRED" | "VACATION_FILED" | "DISPOSED";
  vacationDeadline?: Date;
  vacationFilingDate?: Date;

  contemptNumber?: string;
  contemnorTitle?: string;
  courtDirections?: string;
  directionGivenDate?: Date;
  complianceDeadlineDate?: Date;
  totalComplianceDays?: number;
  complianceProgress?: string;
  severityLevel: "CRITICAL" | "HIGH_WARNING" | "MONITORED";
  status: "ACTIVE" | "COMPLIED_AND_CLOSED";
  actionTakenByBoard?: string;
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