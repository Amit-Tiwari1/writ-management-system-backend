import mongoose, { Schema } from "mongoose";
import { ICase, IConnectedWrit } from "../types/case.types";

const ConnectedWritSchema = new Schema<IConnectedWrit>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case" },
    writNumber: { type: String, required: true, trim: true },
    cnrNumber: { type: String, default: "", trim: true },
    petitionerName: { type: String, default: "", trim: true },
    taggedDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CaseSchema = new Schema<ICase>(
  {
    fileNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    noticeNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    writNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    cnrNumber: {
      type: String,
      trim: true,
      default: "",
      uppercase: true,
      index: true,
    },
    identifierTier: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Court",
    },
    court: {
      type: String,
      required: true,
      trim: true,
    },
    courtCode: {
      type: String,
      default: "HC-ALD",
      trim: true,
    },
    caseTypeId: {
      type: Schema.Types.ObjectId,
      ref: "CaseType",
    },
    caseType: {
      type: String,
      default: "WRIT-A",
      trim: true,
    },
    caseNumber: {
      type: String,
      default: "",
      trim: true,
    },
    caseYear: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    benchLocation: {
      type: String,
      enum: ["Allahabad", "Lucknow", "New Delhi"],
      default: "Allahabad",
    },
    courtRoomNo: {
      type: String,
      default: "--",
      trim: true,
    },
    coramBench: {
      type: String,
      default: "--",
      trim: true,
    },
    leadPetitioner: {
      type: String,
      required: true,
      trim: true,
    },
    respondentString: {
      type: String,
      default: "State of U.P. & Chairman UPPRPB",
      trim: true,
    },
    petitionerAdvocate: {
      type: String,
      default: "--",
      trim: true,
    },
    stateCounsel: {
      type: String,
      default: "Chief Standing Counsel (CSC)",
      trim: true,
    },
    assignedOIC: {
      type: String,
      default: "Unassigned (OIC)",
      trim: true,
    },
    assignedPairokar: {
      type: String,
      default: "Unassigned (Pairokar)",
      trim: true,
    },
    sectionWing: {
      type: String,
      default: "Recruitment Wing",
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "CaseCategory",
    },
    category: {
      type: String,
      default: "Direct Recruitment",
      trim: true,
    },
    subCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "CaseSubCategory",
    },
    subCategory: {
      type: String,
      default: "--",
      trim: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "CaseSubject",
    },
    disputeSubject: {
      type: String,
      default: "General Service Matter",
      trim: true,
    },
    examCycle: {
      type: String,
      default: "2023-24",
      trim: true,
    },
    stage: {
      type: String,
      default: "Advance Notice Stage",
      trim: true,
    },
    judicialStatus: {
      type: String,
      enum: [
        "PRE_NOTICE",
        "ACTIVE",
        "PENDING_PWC",
        "STAY_IN_FORCE",
        "CONTEMPT_NOTICE",
        "DISPOSED",
        "ARCHIVED",
      ],
      default: "ACTIVE",
      index: true,
    },
    internalHold: {
      currentHolderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
      location: {
        type: String,
        default: "Legal Desk",
        trim: true,
      },
      holdDays: {
        type: Number,
        default: 0,
      },
      heldSince: {
        type: Date,
        default: Date.now,
      },
    },
    ndoh: {
      type: Date,
      default: null,
      index: true,
    },
    listingItemNo: {
      type: String,
      default: "--",
      trim: true,
    },
    hasActiveStay: {
      type: Boolean,
      default: false,
      index: true,
    },
    stayScope: {
      type: String,
      default: "",
      trim: true,
    },
    stayGrantedDate: {
      type: Date,
    },
    stayVacationDueDate: {
      type: Date,
    },
    isContemptNotice: {
      type: Boolean,
      default: false,
      index: true,
    },
    contemptDeadlineDate: {
      type: Date,
    },
    connectedWrits: [ConnectedWritSchema],
    coPetitionersCount: {
      type: Number,
      default: 0,
    },
    syncStatus: {
      type: String,
      enum: ["LIVE_SYNCED", "SCHEDULED", "MANUAL_DOCKET", "DISCREPANCY"],
      default: "MANUAL_DOCKET",
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    legacyData: {
      oldFileNo: { type: String, default: "", trim: true },
      oldNoticeYear: { type: String, default: "", trim: true },
      rawForwarded: { type: String, default: "", trim: true },
      orderStatus: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

CaseSchema.index({
  fileNo: "text",
  writNumber: "text",
  noticeNumber: "text",
  leadPetitioner: "text",
});

export const Case = mongoose.model<ICase>("Case", CaseSchema);