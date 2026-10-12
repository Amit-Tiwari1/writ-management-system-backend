import dotenv from "dotenv";
dotenv.config();
import { Resend } from "resend";
import { Notification, INotification } from "../models/Notification";
import { User } from "../models/User";
import mongoose from "mongoose";
import {
  fileForwardedTemplate,
  contemptAlertTemplate,
  stayAlertTemplate,
  caseAssignedTemplate,
  userWelcomeCredentialsTemplate,
} from "../utils/emailTemplates";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export interface NotificationPayload {
  recipientId: string | mongoose.Types.ObjectId;
  caseId: string | mongoose.Types.ObjectId;
  fileNo: string;
  type: "FILE_FORWARDED" | "HEARING_REMINDER" | "STAY_ALERT" | "CONTEMPT_NOTICE";
  title: string;
  message: string;
  isUrgent?: boolean;
  senderName: string;
  senderDesignation: string;
  extraMeta?: Record<string, any>;
}

export class NotificationService {

  static async sendNotification(payload: NotificationPayload): Promise<INotification> {
    try {
      const notification = await Notification.create({
        recipientId: payload.recipientId,
        caseId: payload.caseId,
        fileNo: payload.fileNo,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        isUrgent: payload.isUrgent || false,
        senderName: payload.senderName,
        senderDesignation: payload.senderDesignation,
        isRead: false,
      });

      const recipient = await User.findById(payload.recipientId).select(
        "name email designation"
      );

      if (recipient && recipient.email && recipient.email.includes("@")) {
        this.sendFormattedEmail(recipient.email, recipient.name, payload).catch((err) =>
          console.error("[Email Dispatch Error]:", err.message)
        );
      }

      return notification;
    } catch (error: any) {
      console.error("[NotificationService Error]:", error.message);
      throw error;
    }
  }

  static async sendWelcomeCredentialsEmail(payload: {
    toEmail: string;
    officerName: string;
    username: string;
    rawPassword: string;
    designation: string;
    section: string;
    roleName: string;
  }) {
    const key = process.env.RESEND_API_KEY;
    try {
      const client = new Resend(key);
      const htmlContent = userWelcomeCredentialsTemplate({
        officerName: payload.officerName,
        username: payload.username,
        rawPassword: payload.rawPassword,
        designation: payload.designation,
        section: payload.section,
        roleName: payload.roleName,
      });

      const response = await client.emails.send({
        from: FROM_EMAIL,
        to: [payload.toEmail],
        subject: `[UPPRPB WCMS] Official Portal Credentials - ${payload.officerName}`,
        html: htmlContent,
      });
    } catch (err: any) {
      console.error("[Welcome Email Error]:", err.message);
    }
  }

  private static async sendFormattedEmail(
    toEmail: string,
    recipientName: string,
    data: NotificationPayload
  ) {
    if (!resend) {
      console.warn("[Resend Warning]: RESEND_API_KEY is not defined. Email skipped.");
      return;
    }

    let htmlBody = "";
    const meta = data.extraMeta || {};

    switch (data.type) {
      case "FILE_FORWARDED":
        htmlBody = fileForwardedTemplate({
          recipientName,
          fileNo: data.fileNo,
          senderName: data.senderName,
          senderDesignation: data.senderDesignation,
          notingPurpose: meta.notingPurpose || data.message,
          caseId: data.caseId.toString(),
        });
        break;

      case "CONTEMPT_NOTICE":
        htmlBody = contemptAlertTemplate({
          recipientName,
          fileNo: data.fileNo,
          contemptNo: meta.contemptNo || "CONTEMPT NOTICE",
          court: meta.court || "High Court",
          daysRemaining: meta.daysRemaining ?? 3,
          complianceDeadline: meta.complianceDeadline || "Immediate",
          caseId: data.caseId.toString(),
        });
        break;

      case "STAY_ALERT":
        htmlBody = stayAlertTemplate({
          recipientName,
          fileNo: data.fileNo,
          writNo: meta.writNo || data.fileNo,
          stayScope: meta.stayScope || data.message,
          vacationDeadline: meta.vacationDeadline || "Within 14 Days",
          caseId: data.caseId.toString(),
        });
        break;

      default:
        htmlBody = caseAssignedTemplate({
          recipientName,
          fileNo: data.fileNo,
          writOrNotice: meta.writOrNotice || data.fileNo,
          court: meta.court || "High Court",
          petitioner: meta.petitioner || "Petitioner",
          roleAssigned: meta.roleAssigned || "Officer-in-Charge",
          caseId: data.caseId.toString(),
        });
        break;
    }

    const priorityTag = data.isUrgent ? "[CRITICAL ALERT]" : "[OFFICIAL NOTICE]";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${priorityTag} ${data.title} - ${data.fileNo}`,
      html: htmlBody,
    });
  }
}