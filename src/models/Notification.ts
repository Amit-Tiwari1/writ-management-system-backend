import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  caseId: mongoose.Types.ObjectId;
  fileNo: string;
  type: "FILE_FORWARDED" | "HEARING_REMINDER" | "STAY_ALERT" | "CONTEMPT_NOTICE";
  title: string;
  message: string;
  isUrgent: boolean;
  isRead: boolean;
  senderName: string;
  senderDesignation: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    fileNo: { type: String, required: true },
    type: {
      type: String,
      enum: ["FILE_FORWARDED", "HEARING_REMINDER", "STAY_ALERT", "CONTEMPT_NOTICE"],
      default: "FILE_FORWARDED",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isUrgent: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false, index: true },
    senderName: { type: String, required: true },
    senderDesignation: { type: String, required: true },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);