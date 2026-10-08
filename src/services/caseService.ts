import { Case, ICase } from "../models/Case";
import { Petitioner } from "../models/Petitioner";
import { MockJudicialService } from "./mockJudicialService";

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
}