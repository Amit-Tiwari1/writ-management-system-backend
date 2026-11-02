import mongoose, { Schema } from "mongoose";
import { ICaseMovementHistory } from "../types/movement.types";

const CaseMovementHistorySchema = new Schema<ICaseMovementHistory>(
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
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    fromOfficerName: {
      type: String,
      default: "--",
      trim: true,
    },
    fromDesignation: {
      type: String,
      default: "--",
      trim: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toOfficerName: {
      type: String,
      required: true,
      trim: true,
    },
    toDesignation: {
      type: String,
      required: true,
      trim: true,
    },
    actionType: {
      type: String,
      enum: [
        "FORWARD",
        "RETURN",
        "RECALL",
        "INITIAL_INTAKE",
        "VETTING_REQUEST",
        "APPROVAL_GRANTED",
        "APPROVAL_REJECTED",
      ],
      default: "FORWARD",
      index: true,
    },
    notingPurpose: {
      type: String,
      default: "File Movement",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
    },
    holdDurationDays: {
      type: Number,
      default: 0,
    },
    holdDurationHours: {
      type: Number,
      default: 0,
    },
    minuteNumber: {
      type: Number,
    },
  },
  { timestamps: true }
);

CaseMovementHistorySchema.index({ caseId: 1, createdAt: -1 });
CaseMovementHistorySchema.index({ toUserId: 1, actionType: 1 });

export const CaseMovementHistory = mongoose.model<ICaseMovementHistory>(
  "CaseMovementHistory",
  CaseMovementHistorySchema
);