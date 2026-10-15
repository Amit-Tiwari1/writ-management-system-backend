import mongoose, { Document, Schema } from "mongoose";

export interface ICaseMovementHistory extends Document {
  caseId: mongoose.Types.ObjectId;
  fileNo: string;
  fromUserId?: mongoose.Types.ObjectId;
  fromOfficerName: string;
  fromDesignation: string;
  toUserId: mongoose.Types.ObjectId;
  toOfficerName: string;
  toDesignation: string;
  actionType: "FORWARD" | "RETURN" | "RECALL" | "INITIAL_INTAKE";
  notingPurpose?: string;
  remarks?: string;
  receivedAt: Date;
  dispatchedAt: Date;
  holdDurationDays: number;
  holdDurationHours: number;
  minuteNumber?: number;
  createdAt: Date;
}

const CaseMovementHistorySchema = new Schema<ICaseMovementHistory>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    fileNo: { type: String, required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User" },
    fromOfficerName: { type: String, default: "--" },
    fromDesignation: { type: String, default: "--" },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toOfficerName: { type: String, required: true },
    toDesignation: { type: String, required: true },
    actionType: {
      type: String,
      enum: ["FORWARD", "RETURN", "RECALL", "INITIAL_INTAKE"],
      default: "FORWARD",
    },
    notingPurpose: { type: String, default: "File Movement" },
    remarks: { type: String, default: "" },
    receivedAt: { type: Date, required: true },
    dispatchedAt: { type: Date, default: Date.now },
    holdDurationDays: { type: Number, default: 0 },
    holdDurationHours: { type: Number, default: 0 },
    minuteNumber: { type: Number },
  },
  { timestamps: true }
);

CaseMovementHistorySchema.index({ caseId: 1, createdAt: -1 });

export const CaseMovementHistory = mongoose.model<ICaseMovementHistory>(
  "CaseMovementHistory",
  CaseMovementHistorySchema
);