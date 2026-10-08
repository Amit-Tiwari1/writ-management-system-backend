import mongoose, { Document, Schema } from "mongoose";

// --- Sub-document: Connected Writ Summary ---
export interface IConnectedWrit {
  caseId?: mongoose.Types.ObjectId;
  writNumber: string;
  cnrNumber?: string;
  petitionerName?: string;
  taggedDate?: Date;
}

const ConnectedWritSchema = new Schema<IConnectedWrit>({
  caseId: { type: Schema.Types.ObjectId, ref: "Case" },
  writNumber: { type: String, required: true },
  cnrNumber: { type: String, default: "" },
  petitionerName: { type: String, default: "" },
  taggedDate: { type: Date, default: Date.now },
});

export interface ICase extends Document {
  fileNo: string;
  noticeNumber?: string;
  writNumber?: string;
  cnrNumber?: string;
  identifierTier: 1 | 2 | 3 | 4;

  court: string;
  courtCode: string;
  caseType: string;
  caseNumber?: string;
  caseYear?: number;
  benchLocation: "Allahabad" | "Lucknow" | "New Delhi";
  courtRoomNo?: string;
  coramBench?: string;
  leadPetitioner: string;
  respondentString: string;
  petitionerAdvocate?: string;
  stateCounsel?: string;

  assignedOIC: string;
  assignedPairokar: string;
  sectionWing: string;
  category: string;
  examCycle: string;
  disputeSubject: string;

  stage: string;
  judicialStatus: "PRE_NOTICE" | "ACTIVE" | "PENDING_PWC" | "STAY_IN_FORCE" | "CONTEMPT_NOTICE" | "DISPOSED" | "ARCHIVED";
  internalHold: {
    location: string;
    holdDays: number;
    heldSince?: Date;
  };

  ndoh: Date | null;
  listingItemNo?: string;
  hasActiveStay: boolean;
  stayScope?: string;
  stayGrantedDate?: Date;
  stayVacationDueDate?: Date;
  isContemptNotice: boolean;
  contemptDeadlineDate?: Date;
  connectedWrits: IConnectedWrit[];
  coPetitionersCount: number;

  syncStatus: "LIVE_SYNCED" | "SCHEDULED" | "MANUAL_DOCKET" | "DISCREPANCY";
  lastSyncedAt?: Date;

  legacyData?: {
    oldFileNo?: string;
    oldNoticeYear?: string;
    rawForwarded?: string;
    orderStatus?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICase>(
  {
    fileNo: { type: String, required: true, unique: true, trim: true, index: true },
    noticeNumber: { type: String, trim: true, default: "", index: true },
    writNumber: { type: String, trim: true, default: "", index: true },
    cnrNumber: { type: String, trim: true, default: "", uppercase: true, index: true },
    identifierTier: { type: Number, enum: [1, 2, 3, 4], default: 1 },

    court: { type: String, required: true },
    courtCode: { type: String, default: "HC-ALD" },
    caseType: { type: String, default: "WRIT-A" },
    caseNumber: { type: String, default: "" },
    caseYear: { type: Number, default: new Date().getFullYear() },
    benchLocation: { type: String, enum: ["Allahabad", "Lucknow", "New Delhi"], default: "Allahabad" },
    courtRoomNo: { type: String, default: "--" },
    coramBench: { type: String, default: "--" },

    leadPetitioner: { type: String, required: true },
    respondentString: { type: String, default: "State of U.P. & Chairman UPPRPB" },
    petitionerAdvocate: { type: String, default: "--" },
    stateCounsel: { type: String, default: "Chief Standing Counsel (CSC)" },

    assignedOIC: { type: String, default: "Unassigned (OIC)" },
    assignedPairokar: { type: String, default: "Unassigned (Pairokar)" },
    sectionWing: { type: String, default: "Recruitment Wing" },
    category: { type: String, default: "Constable Civil Police" },
    examCycle: { type: String, default: "2023-24" },
    disputeSubject: { type: String, default: "General Service Matter" },

    stage: { type: String, default: "Advance Notice Stage" },
    judicialStatus: {
      type: String,
      enum: ["PRE_NOTICE", "ACTIVE", "PENDING_PWC", "STAY_IN_FORCE", "CONTEMPT_NOTICE", "DISPOSED", "ARCHIVED"],
      default: "ACTIVE",
    },
    internalHold: {
      location: { type: String, default: "Legal Desk" },
      holdDays: { type: Number, default: 0 },
      heldSince: { type: Date, default: Date.now },
    },

    ndoh: { type: Date, default: null, index: true },
    listingItemNo: { type: String, default: "--" },

    hasActiveStay: { type: Boolean, default: false, index: true },
    stayScope: { type: String, default: "" },
    stayGrantedDate: { type: Date },
    stayVacationDueDate: { type: Date },
    isContemptNotice: { type: Boolean, default: false, index: true },
    contemptDeadlineDate: { type: Date },

    connectedWrits: [ConnectedWritSchema],
    coPetitionersCount: { type: Number, default: 0 },

    syncStatus: {
      type: String,
      enum: ["LIVE_SYNCED", "SCHEDULED", "MANUAL_DOCKET", "DISCREPANCY"],
      default: "MANUAL_DOCKET",
    },
    lastSyncedAt: { type: Date, default: null },

    legacyData: {
      oldFileNo: { type: String, default: "" },
      oldNoticeYear: { type: String, default: "" },
      rawForwarded: { type: String, default: "" },
      orderStatus: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

CaseSchema.index({ fileNo: "text", writNumber: "text", noticeNumber: "text", leadPetitioner: "text" });

export const Case = mongoose.model<ICase>("Case", CaseSchema);