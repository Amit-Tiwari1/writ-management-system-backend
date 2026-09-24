import mongoose, { Document, Schema } from "mongoose";

// 5.1 Stay Order Schema
export interface IStayOrder extends Document {
  caseId: mongoose.Types.ObjectId;
  docketNo: string;
  cnrNumber: string;
  court: string;
  caseNo: string;
  parties: string;
  coramBench: string;
  stayGrantedDate: Date;
  stayVacationDueDate: Date;
  daysRemaining: number;
  vacationStatus: "NOT_INITIATED" | "DRAFTED" | "ASSIGNED_TO_COUNSEL" | "FILED_IN_COURT" | "VACATED";
  assignedCounsel?: string;
  interimOrderPdfUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StayOrderSchema = new Schema<IStayOrder>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    docketNo: { type: String, required: true },
    cnrNumber: { type: String, required: true },
    court: { type: String, required: true },
    caseNo: { type: String, required: true },
    parties: { type: String, required: true },
    coramBench: { type: String, default: "--" },
    stayGrantedDate: { type: Date, required: true },
    stayVacationDueDate: { type: Date, required: true },
    daysRemaining: { type: Number, default: 14 },
    vacationStatus: {
      type: String,
      enum: ["NOT_INITIATED", "DRAFTED", "ASSIGNED_TO_COUNSEL", "FILED_IN_COURT", "VACATED"],
      default: "NOT_INITIATED",
    },
    assignedCounsel: { type: String, default: "" },
    interimOrderPdfUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const StayOrder = mongoose.model<IStayOrder>("StayOrder", StayOrderSchema);

// 5.2 Contempt Matter Schema
export interface IContemptMatter extends Document {
  caseId: mongoose.Types.ObjectId;
  docketNo: string;
  cnrNumber: string;
  court: string;
  contemptCaseNo: string;
  underlyingWritNo: string;
  petitionerName: string;
  respondentNamed: string;
  noticeReceiptDate: Date;
  statutoryDeadline: Date;
  daysRemaining: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  processingStatus:
    | "NOTICE_RECEIVED"
    | "PWC_UNDER_DRAFT"
    | "COMPLIANCE_ORDER_PASSED"
    | "AFFIDAVIT_PREPARED"
    | "COMPLIANCE_AFFIDAVIT_FILED"
    | "DISMISSED";
  personalAppearanceExempted: boolean;
  assignedOIC: string;
  lastAlertDispatchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContemptMatterSchema = new Schema<IContemptMatter>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    docketNo: { type: String, required: true },
    cnrNumber: { type: String, required: true },
    court: { type: String, required: true },
    contemptCaseNo: { type: String, required: true },
    underlyingWritNo: { type: String, required: true },
    petitionerName: { type: String, required: true },
    respondentNamed: { type: String, required: true },
    noticeReceiptDate: { type: Date, required: true },
    statutoryDeadline: { type: Date, required: true },
    daysRemaining: { type: Number, default: 7 },
    riskLevel: { type: String, enum: ["CRITICAL", "HIGH", "MEDIUM"], default: "HIGH" },
    processingStatus: {
      type: String,
      enum: [
        "NOTICE_RECEIVED",
        "PWC_UNDER_DRAFT",
        "COMPLIANCE_ORDER_PASSED",
        "AFFIDAVIT_PREPARED",
        "COMPLIANCE_AFFIDAVIT_FILED",
        "DISMISSED",
      ],
      default: "NOTICE_RECEIVED",
    },
    personalAppearanceExempted: { type: Boolean, default: false },
    assignedOIC: { type: String, required: true },
    lastAlertDispatchedAt: { type: Date },
  },
  { timestamps: true }
);

export const ContemptMatter = mongoose.model<IContemptMatter>("ContemptMatter", ContemptMatterSchema);

// 5.3 Archived Compliance Record Schema
export interface IComplianceArchive extends Document {
  caseId: mongoose.Types.ObjectId;
  docketNo: string;
  cnrNumber: string;
  caseNo: string;
  court: string;
  parties: string;
  disposalDate: Date;
  disposalNature: string; // e.g., "Complied with Directions", "Dismissed on Merits"
  complianceAffidavitFilingDate: Date;
  sealedAffidavitDocId?: mongoose.Types.ObjectId;
  sealedAffidavitUrl?: string;
  sha256Seal: string;
  closedByOfficer: string;
  remarks: string;
  createdAt: Date;
}

const ComplianceArchiveSchema = new Schema<IComplianceArchive>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, unique: true },
    docketNo: { type: String, required: true },
    cnrNumber: { type: String, required: true },
    caseNo: { type: String, required: true },
    court: { type: String, required: true },
    parties: { type: String, required: true },
    disposalDate: { type: Date, required: true },
    disposalNature: { type: String, required: true },
    complianceAffidavitFilingDate: { type: Date, required: true },
    sealedAffidavitDocId: { type: Schema.Types.ObjectId, ref: "CaseDocument" },
    sealedAffidavitUrl: { type: String, default: "" },
    sha256Seal: { type: String, required: true },
    closedByOfficer: { type: String, required: true },
    remarks: { type: String, default: "Formally closed after submission of compliance affidavit" },
  },
  { timestamps: true }
);

export const ComplianceArchive = mongoose.model<IComplianceArchive>("ComplianceArchive", ComplianceArchiveSchema);