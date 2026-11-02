import mongoose, { Types } from "mongoose";
import { Case } from "../models/Case";
import { CaseHearingHistory } from "../models/CaseHearingHistory";
import { CaseMovementHistory } from "../models/CaseMovementHistory";
import { Petitioner } from "../models/Petitioner";
import { ComplianceRecord } from "../models/ComplianceRisk";
import { MockJudicialService } from "./mockJudicialService";
import { ICaseBase, JudicialStatusType, SyncStatusType } from "../types/case.types";
import { HearingOrderType, HearingUpdateSource } from "../types/hearingHistory.types";
import { PetitionerRoleType, PetitionerSourceType } from "../types/petitioner.types";
import { MovementActionType } from "../types/movement.types";

export interface CreateCaseDTO extends Partial<ICaseBase> {
  leadPetitioner: string;
  court: string;
  courtCode: string;
  caseType: string;
  leadPetitionerRollNo?: string;
  leadPetitionerFatherName?: string;
  district?: string;
  state?: string;
  districtId?: Types.ObjectId;
  stateId?: Types.ObjectId;
}

export interface UpdateHearingDTO {
  caseId: string;
  hearingDate: Date | string;
  ndoh: Date | string | null;
  courtRoomNo?: string;
  judgeCoram?: string;
  listingItemNo?: string;
  stageOfCase?: string;
  businessRecorded: string;
  orderType?: HearingOrderType;
  orderDocId?: string;
  orderDocumentUrl?: string;
  source?: HearingUpdateSource;
}

export interface ActionMappingApplyDTO {
  caseId: string;
  actionMappingId?: string;
  courtDecisionOutcome: string;
  actionStatus: string;
  requiresComplianceDeadline: boolean;
  defaultDeadlineDays?: number;
  customDeadlineDays?: number;
  exactDeadlineDate?: Date | string;
  orderDate: Date | string;
  courtDirections?: string;
  stayScope?: string;
  recordType?: "STAY" | "CONTEMPT" | "GENERAL_DIRECTION";
}

export class CaseService {
  /**
   * Generates next sequential institutional file number (e.g. PRPB-W/2026/0001)
   */
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

  /**
   * Duplicate detection across FileNo, NoticeNo, WritNo, and 16-digit CNR
   */
  static async checkDuplicate(params: {
    fileNo?: string;
    noticeNumber?: string;
    writNumber?: string;
    cnrNumber?: string;
  }) {
    const conditions: any[] = [];
    if (params.fileNo && params.fileNo.trim()) {
      conditions.push({ fileNo: params.fileNo.trim() });
    }
    if (params.noticeNumber && params.noticeNumber.trim()) {
      conditions.push({ noticeNumber: params.noticeNumber.trim() });
    }
    if (params.writNumber && params.writNumber.trim()) {
      conditions.push({ writNumber: params.writNumber.trim() });
    }
    if (params.cnrNumber && params.cnrNumber.trim()) {
      conditions.push({ cnrNumber: params.cnrNumber.trim().toUpperCase() });
    }

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

  /**
   * Complete Case Ingestion Workflow (Screens 2.1 & 2.2)
   */
  static async createCaseDocket(
    payload: CreateCaseDTO,
    user?: { id?: any; name?: string; designation?: string }
  ) {
    const fileNo = payload.fileNo || (await this.generateNextFileNo());

    // Check duplicate
    const dupCheck = await this.checkDuplicate({
      fileNo,
      noticeNumber: payload.noticeNumber,
      writNumber: payload.writNumber,
      cnrNumber: payload.cnrNumber,
    });

    if (dupCheck.exists) {
      throw new Error(
        `Case duplicate detected. Clashing with registered dossier: ${dupCheck.matchedCase?.fileNo}`
      );
    }

    const currentYear = payload.caseYear || new Date().getFullYear();

    const newCase = await Case.create({
      ...payload,
      fileNo,
      caseYear: currentYear,
      coPetitionersCount: 1, // Lead petitioner counts as 1
      internalHold: {
        currentHolderId: user?.id,
        location: "Legal Cell Intake Desk",
        holdDays: 0,
        heldSince: new Date(),
      },
    });

    // Automatically create the Lead Petitioner record
    await Petitioner.create({
      caseId: newCase._id,
      fileNo: newCase.fileNo,
      rollNo: payload.leadPetitionerRollNo || `ROLL-${Date.now().toString().slice(-6)}`,
      name: payload.leadPetitioner,
      fatherName: payload.leadPetitionerFatherName || "--",
      role: "Lead Petitioner" as PetitionerRoleType,
      postClaimed: payload.disputeSubject || "Constable Civil Police",
      district: payload.district || "--",
      state: payload.state || "Uttar Pradesh",
      districtId: payload.districtId,
      stateId: payload.stateId,
      status: "ACTIVE",
      source: "MANUAL_ENTRY" as PetitionerSourceType,
    });

    // Record initial file movement
    if (user?.id) {
      await this.recordFileMovement({
        caseId: newCase._id,
        fileNo: newCase.fileNo,
        toUser: {
          id: user.id,
          name: user.name || "Intake Officer",
          designation: user.designation || "Dealing Assistant",
        },
        actionType: "INITIAL_INTAKE",
        notingPurpose: "Fresh Case Intake Docketed in System",
        remarks: `Case created with identifier tier ${newCase.identifierTier}`,
      });
    }

    return newCase;
  }

  /**
   * Judicial Hearing Update (Maintains CaseHearingHistory & updates Case ndoh)
   */
  static async updateHearingProceedings(
    payload: UpdateHearingDTO,
    user?: { id?: any; name?: string; designation?: string }
  ) {
    const caseDoc = await Case.findById(payload.caseId);
    if (!caseDoc) throw new Error("Case docket not found.");

    // Snapshot of previous state for rollback support
    const previousSnapshot = {
      ndoh: caseDoc.ndoh,
      stageOfCase: caseDoc.stage,
      courtRoomNo: caseDoc.courtRoomNo,
      judicialStatus: caseDoc.judicialStatus,
    };

    const parsedNdoh = payload.ndoh ? new Date(payload.ndoh) : null;
    const hearingDate = new Date(payload.hearingDate);

    // 1. Record chronological hearing entry
    const historyRecord = await CaseHearingHistory.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      hearingDate,
      ndoh: parsedNdoh,
      courtRoomNo: payload.courtRoomNo || caseDoc.courtRoomNo,
      judgeCoram: payload.judgeCoram || caseDoc.coramBench,
      listingItemNo: payload.listingItemNo || caseDoc.listingItemNo,
      stageOfCase: payload.stageOfCase || caseDoc.stage,
      businessRecorded: payload.businessRecorded,
      orderType: payload.orderType || "ADJOURNMENT",
      orderDocId: payload.orderDocId ? new Types.ObjectId(payload.orderDocId) : undefined,
      orderDocumentUrl: payload.orderDocumentUrl || "",
      source: payload.source || "MANUAL_ENTRY",
      enteredByUserId: user?.id,
      enteredByOfficerName: user?.name || "Court Pairokar",
      enteredByDesignation: user?.designation || "Pairokar Desk",
      previousSnapshot,
    });

    // 2. Update parent Case document
    caseDoc.ndoh = parsedNdoh;
    if (payload.courtRoomNo) caseDoc.courtRoomNo = payload.courtRoomNo;
    if (payload.judgeCoram) caseDoc.coramBench = payload.judgeCoram;
    if (payload.listingItemNo) caseDoc.listingItemNo = payload.listingItemNo;
    if (payload.stageOfCase) caseDoc.stage = payload.stageOfCase;

    await caseDoc.save();

    return { caseDoc, historyRecord };
  }

  /**
   * Rollback / Undo Hearing Update (Reverts to previousSnapshot)
   */
  static async rollbackHearingUpdate(
    historyId: string,
    user?: { id?: any; name?: string; designation?: string }
  ) {
    const history = await CaseHearingHistory.findById(historyId);
    if (!history) throw new Error("Hearing history log not found.");

    if (history.isOverridden) {
      throw new Error("This entry has already been rolled back.");
    }

    const caseDoc = await Case.findById(history.caseId);
    if (!caseDoc) throw new Error("Case docket not found.");

    // Restore previous state
    if (history.previousSnapshot) {
      caseDoc.ndoh = history.previousSnapshot.ndoh;
      if (history.previousSnapshot.stageOfCase) {
        caseDoc.stage = history.previousSnapshot.stageOfCase;
      }
      if (history.previousSnapshot.courtRoomNo) {
        caseDoc.courtRoomNo = history.previousSnapshot.courtRoomNo;
      }
      if (history.previousSnapshot.judicialStatus) {
        caseDoc.judicialStatus = history.previousSnapshot.judicialStatus as JudicialStatusType;
      }
      await caseDoc.save();
    }

    history.isOverridden = true;
    history.overriddenReason = `Rollback executed by ${user?.name || "Officer"}`;
    await history.save();

    return caseDoc;
  }

  /**
   * Connects 7.9 Legal Action Mapping to Compliance Record (Contempt / Stays Engine)
   */
  static async applyActionMappingDecision(
    payload: ActionMappingApplyDTO,
    user?: { id?: any; name?: string; designation?: string }
  ) {
    const caseDoc = await Case.findById(payload.caseId);
    if (!caseDoc) throw new Error("Target case not found.");

    const orderDate = new Date(payload.orderDate);
    let deadlineDate: Date | undefined;

    // Calculate statutory compliance deadline
    if (payload.requiresComplianceDeadline) {
      if (payload.exactDeadlineDate) {
        deadlineDate = new Date(payload.exactDeadlineDate);
      } else {
        const days =
          payload.customDeadlineDays !== undefined
            ? payload.customDeadlineDays
            : payload.defaultDeadlineDays || 90;
        deadlineDate = new Date(orderDate.getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Determine target record type
    const outcomeLower = payload.courtDecisionOutcome.toLowerCase();
    const isStay = outcomeLower.includes("stay") || payload.recordType === "STAY";
    const isContempt =
      outcomeLower.includes("contempt") ||
      outcomeLower.includes("speaking order") ||
      outcomeLower.includes("representation") ||
      payload.recordType === "CONTEMPT";

    let createdCompliance: any = null;

    if (isStay) {
      caseDoc.hasActiveStay = true;
      caseDoc.stayGrantedDate = orderDate;
      caseDoc.stayScope = payload.stayScope || payload.courtDecisionOutcome;
      caseDoc.judicialStatus = "STAY_IN_FORCE";
      if (deadlineDate) caseDoc.stayVacationDueDate = deadlineDate;

      createdCompliance = await ComplianceRecord.create({
        caseId: caseDoc._id,
        fileNo: caseDoc.fileNo,
        writNumber: caseDoc.writNumber || caseDoc.fileNo,
        cnrNumber: caseDoc.cnrNumber,
        court: caseDoc.court,
        courtId: caseDoc.courtId,
        coramBench: caseDoc.coramBench,
        petitionerName: caseDoc.leadPetitioner,
        oicName: caseDoc.assignedOIC,
        recordType: "STAY",
        stayOrderScope: caseDoc.stayScope,
        stayOrderDate: orderDate,
        vacationDeadline: deadlineDate,
        vacationMotionStatus: "URGENT ACTION REQUIRED",
        severityLevel: "CRITICAL",
        status: "ACTIVE",
      });
    } else if (isContempt || payload.requiresComplianceDeadline) {
      caseDoc.isContemptNotice = true;
      caseDoc.contemptDeadlineDate = deadlineDate;
      caseDoc.judicialStatus = "CONTEMPT_NOTICE";

      createdCompliance = await ComplianceRecord.create({
        caseId: caseDoc._id,
        fileNo: caseDoc.fileNo,
        writNumber: caseDoc.writNumber || caseDoc.fileNo,
        cnrNumber: caseDoc.cnrNumber,
        court: caseDoc.court,
        courtId: caseDoc.courtId,
        coramBench: caseDoc.coramBench,
        petitionerName: caseDoc.leadPetitioner,
        oicName: caseDoc.assignedOIC,
        recordType: "CONTEMPT",
        courtDirections: payload.courtDirections || payload.courtDecisionOutcome,
        directionGivenDate: orderDate,
        complianceDeadlineDate: deadlineDate,
        totalComplianceDays: payload.customDeadlineDays || payload.defaultDeadlineDays || 90,
        severityLevel: "CRITICAL",
        status: "ACTIVE",
        actionMappingId: payload.actionMappingId
          ? new Types.ObjectId(payload.actionMappingId)
          : undefined,
        courtDecisionOutcome: payload.courtDecisionOutcome,
      });
    } else if (outcomeLower.includes("dismissed") || outcomeLower.includes("disposed")) {
      caseDoc.judicialStatus = "DISPOSED";
    }

    await caseDoc.save();

    // Record order in hearing history
    await CaseHearingHistory.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      hearingDate: orderDate,
      ndoh: caseDoc.ndoh,
      businessRecorded: `Judicial outcome applied: ${payload.courtDecisionOutcome}. Institutional status: ${payload.actionStatus}`,
      orderType: isStay
        ? "STAY_GRANTED"
        : isContempt
        ? "DIRECTION_ISSUED"
        : "FINAL_JUDGMENT",
      source: "MANUAL_ENTRY",
      enteredByUserId: user?.id,
      enteredByOfficerName: user?.name || "Legal Officer",
      enteredByDesignation: user?.designation || "Legal Cell",
    });

    return { caseDoc, createdCompliance };
  }

  /**
   * Sync Case via 16-Digit CNR with eCourts / NAPIX
   */
  static async syncCaseWithECourts(
    caseId: string,
    user?: { id?: any; name?: string; designation?: string }
  ) {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) throw new Error("Case record not found.");

    if (!caseDoc.cnrNumber) {
      throw new Error("Cannot sync via NAPIX without a valid 16-Digit CNR Number.");
    }

    const liveData = await MockJudicialService.verifyCNR(caseDoc.cnrNumber);

    // Save previous state for rollback audit
    const previousSnapshot = {
      ndoh: caseDoc.ndoh,
      stageOfCase: caseDoc.stage,
      courtRoomNo: caseDoc.courtRoomNo,
      judicialStatus: caseDoc.judicialStatus,
    };

    caseDoc.ndoh = liveData.ndoh;
    caseDoc.courtRoomNo = liveData.courtRoomNo;
    caseDoc.coramBench = liveData.coramBench;
    caseDoc.stage = liveData.stage;
    caseDoc.syncStatus = "LIVE_SYNCED";
    caseDoc.lastSyncedAt = new Date();
    await caseDoc.save();

    // Auto-record in hearing history log
    await CaseHearingHistory.create({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      hearingDate: new Date(),
      ndoh: liveData.ndoh,
      courtRoomNo: liveData.courtRoomNo,
      judgeCoram: liveData.coramBench,
      stageOfCase: liveData.stage,
      businessRecorded: `eCourts NAPIX live synchronization completed. Stage: ${liveData.stage}`,
      orderType: "ADJOURNMENT",
      source: "ECOURTS_SCRAPER",
      enteredByUserId: user?.id,
      enteredByOfficerName: "eCourts NAPIX Bot",
      enteredByDesignation: "Automated Gateway",
      previousSnapshot,
    });

    return caseDoc;
  }

  /**
   * Internal Green Sheet File Movement Tracker (Screens 4.0)
   */
  static async recordFileMovement(params: {
    caseId: mongoose.Types.ObjectId | string;
    fileNo: string;
    fromUser?: { id?: any; name?: string; designation?: string };
    toUser: { id: any; name: string; designation: string };
    actionType?: MovementActionType;
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

    const movement = await CaseMovementHistory.create({
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

    await Case.findByIdAndUpdate(params.caseId, {
      "internalHold.currentHolderId": params.toUser.id,
      "internalHold.location": `${params.toUser.designation} (${params.toUser.name})`,
      "internalHold.heldSince": now,
      "internalHold.holdDays": 0,
    });

    return movement;
  }

  static async addCoPetitioners(
    caseId: string,
    petitionersList: Array<{
      rollNo: string;
      name: string;
      fatherName?: string;
      categoryClaimed?: string;
      postClaimed?: string;
      district?: string;
      state?: string;
      districtId?: string;
      stateId?: string;
      meritScore?: number;
    }>,
    source: PetitionerSourceType = "MANUAL_ENTRY",
    batchUploadId?: string
  ) {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) throw new Error("Case docket not found.");

    const docsToInsert = petitionersList.map((p) => ({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      rollNo: p.rollNo.trim(),
      name: p.name.trim(),
      fatherName: p.fatherName || "--",
      role: "Co-Petitioner" as PetitionerRoleType,
      categoryClaimed: p.categoryClaimed || "General",
      postClaimed: p.postClaimed || caseDoc.disputeSubject || "Constable Civil Police",
      district: p.district || "--",
      state: p.state || "Uttar Pradesh",
      districtId: p.districtId ? new Types.ObjectId(p.districtId) : undefined,
      stateId: p.stateId ? new Types.ObjectId(p.stateId) : undefined,
      meritScore: p.meritScore || 0,
      status: "ACTIVE",
      source,
      batchUploadId: batchUploadId || "",
    }));

    const inserted = await Petitioner.insertMany(docsToInsert, { ordered: false });
    const totalCount = await Petitioner.countDocuments({ caseId: caseDoc._id });
    caseDoc.coPetitionersCount = totalCount;
    await caseDoc.save();

    return { insertedCount: inserted.length, totalCount };
  }


  static async removeCoPetitioner(caseId: string, petitionerId: string) {
    const removed = await Petitioner.findOneAndDelete({ _id: petitionerId, caseId });
    if (!removed) throw new Error("Petitioner record not found.");

    const totalCount = await Petitioner.countDocuments({ caseId });
    await Case.findByIdAndUpdate(caseId, { coPetitionersCount: totalCount });

    return { success: true, totalCount };
  }

  static async tagConnectedWrit(
    leadCaseId: string,
    connectedWritData: {
      writNumber: string;
      cnrNumber?: string;
      petitionerName?: string;
      connectedCaseId?: string;
    }
  ) {
    const leadCase = await Case.findById(leadCaseId);
    if (!leadCase) throw new Error("Lead case docket not found.");

    leadCase.connectedWrits.push({
      caseId: connectedWritData.connectedCaseId
        ? new Types.ObjectId(connectedWritData.connectedCaseId)
        : undefined,
      writNumber: connectedWritData.writNumber.trim(),
      cnrNumber: connectedWritData.cnrNumber?.trim() || "",
      petitionerName: connectedWritData.petitionerName?.trim() || "",
      taggedDate: new Date(),
    });

    await leadCase.save();
    return leadCase;
  }
}