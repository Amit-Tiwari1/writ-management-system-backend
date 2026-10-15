import { Case, ICase } from "../models/Case";
import { CaseMovementHistory } from "../models/CaseMovementHistory";
import { MockJudicialService } from "./mockJudicialService";
import mongoose from "mongoose";

export class CaseService {
  static async generateNextFileNo(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PRPB-W/${currentYear}/`;
    const lastCase = await Case.findOne({ fileNo: new RegExp(`^${prefix}`) })
      .sort({ createdAt: -1 })
      .lean();

    let nextSeq = 1;
    if (lastCase && lastCase.fileNo) {
      const parts = lastCase.fileNo.split("/");
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) nextSeq = lastNum + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  static async checkDuplicate(params: {
    fileNo?: string;
    noticeNumber?: string;
    writNumber?: string;
    cnrNumber?: string;
  }) {
    const conditions: any[] = [];
    if (params.fileNo) conditions.push({ fileNo: params.fileNo.trim() });
    if (params.noticeNumber) conditions.push({ noticeNumber: params.noticeNumber.trim() });
    if (params.writNumber) conditions.push({ writNumber: params.writNumber.trim() });
    if (params.cnrNumber) conditions.push({ cnrNumber: params.cnrNumber.trim().toUpperCase() });

    if (conditions.length === 0) return { exists: false };

    const existing = await Case.findOne({ $or: conditions }).lean();
    if (existing) {
      return {
        exists: true,
        matchedCase: {
          id: existing._id,
          fileNo: existing.fileNo,
          writNumber: existing.writNumber,
          noticeNumber: existing.noticeNumber,
          cnrNumber: existing.cnrNumber,
          leadPetitioner: existing.leadPetitioner,
        },
      };
    }
    return { exists: false };
  }

  static async syncCaseWithECourts(caseId: string) {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) throw new Error("Case record not found.");

    if (!caseDoc.cnrNumber) {
      throw new Error("Cannot sync via NAPIX without a valid 16-Digit CNR Number.");
    }
    const liveData = await MockJudicialService.verifyCNR(caseDoc.cnrNumber);
    caseDoc.ndoh = liveData.ndoh;
    caseDoc.courtRoomNo = liveData.courtRoomNo;
    caseDoc.coramBench = liveData.coramBench;
    caseDoc.stage = liveData.stage;
    caseDoc.syncStatus = "LIVE_SYNCED";
    caseDoc.lastSyncedAt = new Date();
    await caseDoc.save();
    return caseDoc;
  }

  static async recordFileMovement(params: {
    caseId: mongoose.Types.ObjectId | string;
    fileNo: string;
    fromUser?: { id?: any; name?: string; designation?: string };
    toUser: { id: any; name: string; designation: string };
    actionType?: "FORWARD" | "RETURN" | "RECALL" | "INITIAL_INTAKE";
    notingPurpose?: string;
    remarks?: string;
    receivedAt?: Date;
    minuteNumber?: number;
  }) {
    const now = new Date();
    const receivedDate = params.receivedAt || now;
    const diffMs = Math.max(0, now.getTime() - new Date(receivedDate).getTime());
    const holdHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    const holdDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return await CaseMovementHistory.create({
      caseId: params.caseId,
      fileNo: params.fileNo,
      fromUserId: params.fromUser?.id,
      fromOfficerName: params.fromUser?.name || "Legal Registry Desk",
      fromDesignation: params.fromUser?.designation || "Intake Section",
      toUserId: params.toUser.id,
      toOfficerName: params.toUser.name,
      toDesignation: params.toUser.designation,
      actionType: params.actionType || "FORWARD",
      notingPurpose: params.notingPurpose || "File Movement",
      remarks: params.remarks || "",
      receivedAt: receivedDate,
      dispatchedAt: now,
      holdDurationDays: holdDays,
      holdDurationHours: holdHours,
      minuteNumber: params.minuteNumber,
    });
  }
}