import mongoose, { Schema } from "mongoose";
import { ICaseHearingHistory } from "../types/hearingHistory.types";

const CaseHearingHistorySchema = new Schema<ICaseHearingHistory>(
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
    hearingDate: {
      type: Date,
      required: true,
      index: true,
    },
    ndoh: {
      type: Date,
      default: null,
      index: true,
    },
    courtRoomNo: {
      type: String,
      default: "--",
      trim: true,
    },
    judgeCoram: {
      type: String,
      default: "--",
      trim: true,
    },
    listingItemNo: {
      type: String,
      default: "--",
      trim: true,
    },
    stageOfCase: {
      type: String,
      default: "Fresh Admission",
      trim: true,
    },
    businessRecorded: {
      type: String,
      required: true,
      trim: true,
    },
    orderType: {
      type: String,
      enum: [
        "INTERIM_ORDER",
        "ADJOURNMENT",
        "FINAL_JUDGMENT",
        "DIRECTION_ISSUED",
        "COUNTER_AFFIDAVIT_CALLED",
        "STAY_GRANTED",
        "STAY_EXTENDED",
        "STAY_VACATED",
        "CONTEMPT_NOTICE_ISSUED",
      ],
      default: "ADJOURNMENT",
      index: true,
    },
    orderDocId: {
      type: Schema.Types.ObjectId,
      ref: "CaseDocument",
    },
    orderDocumentUrl: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      enum: ["MANUAL_ENTRY", "ECOURTS_SCRAPER", "ROLLBACK"],
      default: "MANUAL_ENTRY",
      index: true,
    },
    enteredByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    enteredByOfficerName: {
      type: String,
      default: "Desk Officer",
      trim: true,
    },
    enteredByDesignation: {
      type: String,
      default: "High Court Pairokar",
      trim: true,
    },
    isOverridden: {
      type: Boolean,
      default: false,
    },
    overriddenReason: {
      type: String,
      default: "",
      trim: true,
    },
    previousSnapshot: {
      ndoh: { type: Date, default: null },
      stageOfCase: { type: String, default: "" },
      courtRoomNo: { type: String, default: "" },
      judicialStatus: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

CaseHearingHistorySchema.index({ caseId: 1, hearingDate: -1 });
CaseHearingHistorySchema.index({ fileNo: 1, createdAt: -1 });

export const CaseHearingHistory = mongoose.model<ICaseHearingHistory>(
  "CaseHearingHistory",
  CaseHearingHistorySchema
);