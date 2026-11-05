import mongoose, { Types } from "mongoose";
import { Case } from "../models/Case";
import { CaseHearingHistory } from "../models/CaseHearingHistory";
import { CaseMovementHistory } from "../models/CaseMovementHistory";
import { Petitioner } from "../models/Petitioner";
import { ComplianceRecord } from "../models/ComplianceRisk";
import { User } from "../models/User";
import { MockJudicialService } from "./mockJudicialService";
import { ICaseBase, JudicialStatusType } from "../types/case.types";

import {
  HearingOrderType,
  HearingUpdateSource,
} from "../types/hearingHistory.types";

import {
  PetitionerRoleType,
  PetitionerSourceType,
} from "../types/petitioner.types";

import { MovementActionType } from "../types/movement.types";

type ServiceUser = {
  id?: string | Types.ObjectId;
  name?: string;
  designation?: string;
};

type ObjectIdInput = string | Types.ObjectId;

export interface CreateCaseDTO extends Partial<ICaseBase> {
  leadPetitioner: string;
  leadPetitionerRollNo: string;
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

const isValidObjectId = (value: unknown): boolean => {
  if (value instanceof Types.ObjectId) {
    return true;
  }

  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value) &&
    String(new Types.ObjectId(value)) === value
  );
};

const toObjectId = (
  value: ObjectIdInput | undefined | null,
  fieldName: string,
  required = true,
): Types.ObjectId | undefined => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return undefined;
  }

  if (!isValidObjectId(value)) {
    throw new Error(`${fieldName} must be a valid ObjectId.`);
  }

  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
};

const parseDate = (
  value: Date | string | null | undefined,
  fieldName: string,
  required = false,
): Date | null => {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is not a valid date.`);
  }

  return parsed;
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
};

const normalizeOptionalString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value.trim() : fallback;
};

const getSessionOptions = (session?: mongoose.ClientSession) => {
  return session ? { session } : {};
};

export class CaseService {
  static async generateNextFileNo(
    session?: mongoose.ClientSession,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PRPB-W/${currentYear}/`;
    const lastCase = await Case.findOne({
      fileNo: {
        $regex: `^${prefix}`,
      },
    })
      .sort({ fileNo: -1 })
      .session(session || null)
      .select("fileNo")
      .lean();

    let nextSeq = 1;

    if (lastCase?.fileNo) {
      const sequence = Number(lastCase.fileNo.split("/").pop());

      if (Number.isInteger(sequence) && sequence > 0) {
        nextSeq = sequence + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  static async checkDuplicate(
    params: {
      fileNo?: string;
      noticeNumber?: string;
      writNumber?: string;
      cnrNumber?: string;
    },
    session?: mongoose.ClientSession,
    options?: {
      includeExternalIdentifiers?: boolean;
    },
  ) {
    const conditions: Record<string, unknown>[] = [];

    if (params.fileNo?.trim()) {
      conditions.push({
        fileNo: params.fileNo.trim(),
      });
    }

    if (options?.includeExternalIdentifiers) {
      if (params.noticeNumber?.trim()) {
        conditions.push({
          noticeNumber: params.noticeNumber.trim(),
        });
      }

      if (params.writNumber?.trim()) {
        conditions.push({
          writNumber: params.writNumber.trim(),
        });
      }

      if (params.cnrNumber?.trim()) {
        conditions.push({
          cnrNumber: params.cnrNumber.trim().toUpperCase(),
        });
      }
    }

    if (!conditions.length) {
      return {
        exists: false,
        matchedCase: null,
      };
    }

    const existing = await Case.findOne({
      $or: conditions,
    })
      .session(session || null)
      .select("_id fileNo noticeNumber writNumber cnrNumber leadPetitioner")
      .lean();

    if (!existing) {
      return {
        exists: false,
        matchedCase: null,
      };
    }

    return {
      exists: true,
      matchedCase: {
        id: existing._id,
        fileNo: existing.fileNo,
        noticeNumber: existing.noticeNumber,
        writNumber: existing.writNumber,
        cnrNumber: existing.cnrNumber,
        leadPetitioner: existing.leadPetitioner,
      },
    };
  }

  static async createCaseDocket(
    payload: CreateCaseDTO,
    user?: ServiceUser,
    session?: mongoose.ClientSession,
  ) {
    const leadPetitioner = normalizeRequiredString(
      payload.leadPetitioner,
      "Lead petitioner name",
    );

    const leadRollNo = normalizeRequiredString(
      payload.leadPetitionerRollNo,
      "Lead petitioner roll number",
    );

    const courtId = toObjectId(payload.courtId, "Court ID");
    const caseTypeId = toObjectId(payload.caseTypeId, "Case type ID");
    const categoryId = toObjectId(payload.categoryId, "Category ID");
    const subCategoryId = toObjectId(payload.subCategoryId, "Sub-category ID");
    const subjectId = toObjectId(payload.subjectId, "Subject ID");
    const assignedOIC = toObjectId(payload.assignedOIC, "Assigned OIC ID");
    const assignedPairokar = toObjectId(
      payload.assignedPairokar,
      "Assigned Pairokar ID",
    );

    const currentHolderId = toObjectId(
      user?.id,
      "Current holder user ID",
      false,
    );

    const fileNo =
      normalizeOptionalString(payload.fileNo) ||
      (await this.generateNextFileNo(session));

    const duplicate = await this.checkDuplicate({ fileNo }, session);

    if (duplicate.exists) {
      throw new Error(
        `File number already exists: ${duplicate.matchedCase?.fileNo}`,
      );
    }

    const caseYear = payload.caseYear || new Date().getFullYear();

    const newCasePayload = {
      ...payload,

      fileNo,
      leadPetitioner,

      courtId,
      caseTypeId,
      categoryId,
      subCategoryId,
      subjectId,

      assignedOIC,
      assignedPairokar,

      caseYear,

      coPetitionersCount: 1,

      internalHold: {
        currentHolderId: currentHolderId || null,
        location: "Legal Cell Intake Desk",
        holdDays: 0,
        heldSince: new Date(),
      },
    };

    const [newCase] = await Case.create(
      [newCasePayload],
      getSessionOptions(session),
    );

    await Petitioner.create(
      [
        {
          caseId: newCase._id,
          fileNo: newCase.fileNo,

          rollNo: leadRollNo,
          name: leadPetitioner,

          fatherName:
            normalizeOptionalString(payload.leadPetitionerFatherName, "--") ||
            "--",

          role: "Lead Petitioner" as PetitionerRoleType,
          postClaimed: "Constable Civil Police",
          district: normalizeOptionalString(payload.district, "--"),
          state: normalizeOptionalString(payload.state, "Uttar Pradesh"),
          districtId: payload.districtId
            ? toObjectId(payload.districtId, "District ID")
            : undefined,

          stateId: payload.stateId
            ? toObjectId(payload.stateId, "State ID")
            : undefined,

          status: "ACTIVE",

          source: "MANUAL_ENTRY" as PetitionerSourceType,
        },
      ],
      getSessionOptions(session),
    );

    if (user?.id) {
      await this.recordFileMovement(
        {
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
        },
        session,
      );
    }

    return newCase;
  }

  static async updateHearingProceedings(
    payload: UpdateHearingDTO,
    user?: ServiceUser,
    session?: mongoose.ClientSession,
  ) {
    const caseId = toObjectId(payload.caseId, "Case ID");
    const caseDoc = await Case.findById(caseId).session(session || null);

    if (!caseDoc) {
      throw new Error("Case docket not found.");
    }

    const hearingDate = parseDate(
      payload.hearingDate,
      "Hearing date",
      true,
    ) as Date;

    const parsedNdoh = parseDate(payload.ndoh, "Next date of hearing");
    const orderDocId = payload.orderDocId
      ? toObjectId(payload.orderDocId, "Order document ID")
      : undefined;

    const enteredByUserId = toObjectId(user?.id, "Entered by user ID", false);

    const previousSnapshot = {
      ndoh: caseDoc.ndoh,
      stageOfCase: caseDoc.stage,
      courtRoomNo: caseDoc.courtRoomNo,
      judicialStatus: caseDoc.judicialStatus,
    };

    const [historyRecord] = await CaseHearingHistory.create(
      [
        {
          caseId: caseDoc._id,
          fileNo: caseDoc.fileNo,

          hearingDate,
          ndoh: parsedNdoh,

          courtRoomNo: payload.courtRoomNo || caseDoc.courtRoomNo,

          judgeCoram: payload.judgeCoram || caseDoc.coramBench,

          listingItemNo: payload.listingItemNo || caseDoc.listingItemNo,

          stageOfCase: payload.stageOfCase || caseDoc.stage,

          businessRecorded: normalizeRequiredString(
            payload.businessRecorded,
            "Business recorded",
          ),

          orderType: payload.orderType || "ADJOURNMENT",

          orderDocId,

          orderDocumentUrl: payload.orderDocumentUrl || "",

          source: payload.source || "MANUAL_ENTRY",

          enteredByUserId,

          enteredByOfficerName: user?.name || "Court Pairokar",

          enteredByDesignation: user?.designation || "Pairokar Desk",

          previousSnapshot,
        },
      ],
      getSessionOptions(session),
    );

    caseDoc.ndoh = parsedNdoh;

    if (payload.courtRoomNo !== undefined) {
      caseDoc.courtRoomNo = payload.courtRoomNo;
    }

    if (payload.judgeCoram !== undefined) {
      caseDoc.coramBench = payload.judgeCoram;
    }

    if (payload.listingItemNo !== undefined) {
      caseDoc.listingItemNo = payload.listingItemNo;
    }

    if (payload.stageOfCase !== undefined) {
      caseDoc.stage = payload.stageOfCase;
    }

    await caseDoc.save(getSessionOptions(session));

    return {
      caseDoc,
      historyRecord,
    };
  }

  static async rollbackHearingUpdate(
    historyId: string,
    user?: ServiceUser,
    session?: mongoose.ClientSession,
  ) {
    const validHistoryId = toObjectId(historyId, "Hearing history ID");

    const history = await CaseHearingHistory.findById(validHistoryId).session(
      session || null,
    );

    if (!history) {
      throw new Error("Hearing history log not found.");
    }

    if (history.isOverridden) {
      throw new Error("This entry has already been rolled back.");
    }

    const caseDoc = await Case.findById(history.caseId).session(
      session || null,
    );

    if (!caseDoc) {
      throw new Error("Case docket not found.");
    }

    if (history.previousSnapshot) {
      caseDoc.ndoh = history.previousSnapshot.ndoh;

      if (history.previousSnapshot.stageOfCase) {
        caseDoc.stage = history.previousSnapshot.stageOfCase;
      }

      if (history.previousSnapshot.courtRoomNo) {
        caseDoc.courtRoomNo = history.previousSnapshot.courtRoomNo;
      }

      if (history.previousSnapshot.judicialStatus) {
        caseDoc.judicialStatus = history.previousSnapshot
          .judicialStatus as JudicialStatusType;
      }

      await caseDoc.save(getSessionOptions(session));
    }

    history.isOverridden = true;

    history.overriddenReason = `Rollback executed by ${user?.name || "Officer"}`;

    await history.save(getSessionOptions(session));

    return caseDoc;
  }

 
static async applyActionMappingDecision(
  payload: ActionMappingApplyDTO,
  user?: ServiceUser,
  session?: mongoose.ClientSession,
) {
  const caseId = toObjectId(payload.caseId, "Case ID");

  const caseDoc = await Case.findById(caseId).session(session || null);

  if (!caseDoc) {
    throw new Error("Target case not found.");
  }

  const orderDate = parseDate(
    payload.orderDate,
    "Order date",
    true,
  ) as Date;

  const outcome = normalizeRequiredString(
    payload.courtDecisionOutcome,
    "Court decision outcome",
  );

  let deadlineDate: Date | undefined;

  if (payload.requiresComplianceDeadline) {
    if (payload.exactDeadlineDate) {
      deadlineDate = parseDate(
        payload.exactDeadlineDate,
        "Exact compliance deadline",
        true,
      ) as Date;
    } else {
      const days =
        payload.customDeadlineDays !== undefined
          ? payload.customDeadlineDays
          : (payload.defaultDeadlineDays ?? 90);

      if (!Number.isInteger(days) || days < 0) {
        throw new Error(
          "Compliance deadline days must be a non-negative integer.",
        );
      }

      deadlineDate = new Date(
        orderDate.getTime() + days * 24 * 60 * 60 * 1000,
      );
    }
  }

  const outcomeLower = outcome.toLowerCase();

  const isStay =
    outcomeLower.includes("stay") ||
    payload.recordType === "STAY";

  const isContempt =
    outcomeLower.includes("contempt") ||
    outcomeLower.includes("speaking order") ||
    outcomeLower.includes("representation") ||
    payload.recordType === "CONTEMPT";

  let createdCompliance: any = null;

  // Fetch display names separately.
  // This avoids mutating ObjectId references on caseDoc through populate().
  const [courtRecord, oicRecord] = await Promise.all([
    Case.db
      .collection("courts")
      .findOne(
        { _id: caseDoc.courtId },
        {
          projection: { courtName: 1 },
          ...(session ? { session } : {}),
        },
      ),

    Case.db
      .collection("users")
      .findOne(
        { _id: caseDoc.assignedOIC },
        {
          projection: { name: 1 },
          ...(session ? { session } : {}),
        },
      ),
  ]);

  const courtName = courtRecord?.courtName || "";
  const oicName = oicRecord?.name || "";

  if (isStay) {
    caseDoc.hasActiveStay = true;
    caseDoc.stayGrantedDate = orderDate;
    caseDoc.stayScope = payload.stayScope || outcome;
    caseDoc.judicialStatus = "STAY_IN_FORCE";

    if (deadlineDate) {
      caseDoc.stayVacationDueDate = deadlineDate;
    }

    const compliance = new ComplianceRecord({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      writNumber: caseDoc.writNumber || caseDoc.fileNo,
      cnrNumber: caseDoc.cnrNumber,
      court: courtName,
      courtId: caseDoc.courtId,
      coramBench: caseDoc.coramBench,
      petitionerName: caseDoc.leadPetitioner,
      oicName,
      recordType: "STAY",
      stayOrderScope: caseDoc.stayScope,
      stayOrderDate: orderDate,
      vacationDeadline: deadlineDate,
      vacationMotionStatus: "URGENT ACTION REQUIRED",
      severityLevel: "CRITICAL",
      status: "ACTIVE",
    });

    await compliance.save(getSessionOptions(session));

    createdCompliance = compliance;
  } else if (isContempt || payload.requiresComplianceDeadline) {
    caseDoc.isContemptNotice = true;
    caseDoc.contemptDeadlineDate = deadlineDate ?? null;
    caseDoc.judicialStatus = "CONTEMPT_NOTICE";

    const compliance = new ComplianceRecord({
      caseId: caseDoc._id,
      fileNo: caseDoc.fileNo,
      writNumber: caseDoc.writNumber || caseDoc.fileNo,
      cnrNumber: caseDoc.cnrNumber,
      court: courtName,
      courtId: caseDoc.courtId,
      coramBench: caseDoc.coramBench,
      petitionerName: caseDoc.leadPetitioner,
      oicName,
      recordType: "CONTEMPT",
      courtDirections: payload.courtDirections || outcome,
      directionGivenDate: orderDate,
      complianceDeadlineDate: deadlineDate,
      totalComplianceDays:
        payload.customDeadlineDays ??
        payload.defaultDeadlineDays ??
        90,
      severityLevel: "CRITICAL",
      status: "ACTIVE",
      actionMappingId: payload.actionMappingId
        ? toObjectId(payload.actionMappingId, "Action mapping ID")
        : undefined,
      courtDecisionOutcome: outcome,
    });

    await compliance.save(getSessionOptions(session));

    createdCompliance = compliance;
  } else if (
    outcomeLower.includes("dismissed") ||
    outcomeLower.includes("disposed")
  ) {
    caseDoc.judicialStatus = "DISPOSED";
  }

  // Save case changes.
  await caseDoc.save(getSessionOptions(session));

  const enteredByUserId = toObjectId(
    user?.id,
    "Entered by user ID",
    false,
  );

  const historyRecord = new CaseHearingHistory({
    caseId: caseDoc._id,
    fileNo: caseDoc.fileNo,
    hearingDate: orderDate,
    ndoh: caseDoc.ndoh,
    businessRecorded: `Judicial outcome applied: ${outcome}. Institutional status: ${payload.actionStatus}`,
    orderType: isStay
      ? "STAY_GRANTED"
      : isContempt
        ? "DIRECTION_ISSUED"
        : "FINAL_JUDGMENT",
    source: "MANUAL_ENTRY",
    enteredByUserId,
    enteredByOfficerName: user?.name || "Legal Officer",
    enteredByDesignation: user?.designation || "Legal Cell",
  });

  await historyRecord.save(getSessionOptions(session));

  return {
    caseDoc,
    createdCompliance,
    historyRecord,
  };
}


  static async syncCaseWithECourts(
    caseId: string,
    user?: ServiceUser,
    session?: mongoose.ClientSession,
  ) {
    const validCaseId = toObjectId(caseId, "Case ID");

    const caseDoc = await Case.findById(validCaseId).session(session || null);

    if (!caseDoc) {
      throw new Error("Case record not found.");
    }

    if (!caseDoc.cnrNumber) {
      throw new Error(
        "Cannot sync via NAPIX without a valid 16-Digit CNR Number.",
      );
    }
    const liveData = await MockJudicialService.verifyCNR(caseDoc.cnrNumber);

    const previousSnapshot = {
      ndoh: caseDoc.ndoh,
      stageOfCase: caseDoc.stage,
      courtRoomNo: caseDoc.courtRoomNo,
      judicialStatus: caseDoc.judicialStatus,
    };

    const parsedNdoh = parseDate(liveData.ndoh, "eCourts next hearing date");

    caseDoc.ndoh = parsedNdoh;
    caseDoc.courtRoomNo = liveData.courtRoomNo;
    caseDoc.coramBench = liveData.coramBench;
    caseDoc.stage = liveData.stage;
    caseDoc.syncStatus = "LIVE_SYNCED";
    caseDoc.lastSyncedAt = new Date();

    await caseDoc.save(getSessionOptions(session));

    const enteredByUserId = toObjectId(user?.id, "Entered by user ID", false);

    await CaseHearingHistory.create(
      [
        {
          caseId: caseDoc._id,
          fileNo: caseDoc.fileNo,

          hearingDate: new Date(),
          ndoh: parsedNdoh,

          courtRoomNo: liveData.courtRoomNo,
          judgeCoram: liveData.coramBench,
          stageOfCase: liveData.stage,

          businessRecorded: `eCourts NAPIX live synchronization completed. Stage: ${liveData.stage}`,

          orderType: "ADJOURNMENT",
          source: "ECOURTS_SCRAPER",

          enteredByUserId,

          enteredByOfficerName: "eCourts NAPIX Bot",
          enteredByDesignation: "Automated Gateway",

          previousSnapshot,
        },
      ],
      getSessionOptions(session),
    );

    return caseDoc;
  }

  static async recordFileMovement(
    params: {
      caseId: ObjectIdInput;
      fileNo: string;

      fromUser?: {
        id?: ObjectIdInput;
        name?: string;
        designation?: string;
      };

      toUser: {
        id: ObjectIdInput;
        name: string;
        designation: string;
      };

      actionType?: MovementActionType;
      notingPurpose?: string;
      remarks?: string;
      receivedAt?: Date;
      minuteNumber?: number;
    },
    session?: mongoose.ClientSession,
  ) {
    const caseId = toObjectId(params.caseId, "Case ID") as Types.ObjectId;

    const toUserId = toObjectId(
      params.toUser.id,
      "Target user ID",
    ) as Types.ObjectId;

    const fromUserId = toObjectId(params.fromUser?.id, "Source user ID", false);

    const fileNo = normalizeRequiredString(params.fileNo, "File number");

    const targetUser = await User.findById(toUserId)
      .select("name designation status")
      .session(session || null)
      .lean();

    if (!targetUser) {
      throw new Error("Target user does not exist.");
    }

    if (targetUser.status === "INACTIVE") {
      throw new Error("Target user is inactive.");
    }

    const caseExists = await Case.findById(caseId)
      .select("_id fileNo")
      .session(session || null)
      .lean();

    if (!caseExists) {
      throw new Error("Case docket not found.");
    }

    if (caseExists.fileNo !== fileNo) {
      throw new Error("File number does not match the selected case.");
    }

    const now = new Date();

    const receivedDate = parseDate(
      params.receivedAt || now,
      "Received date",
      true,
    ) as Date;

    const diffMs = Math.max(0, now.getTime() - receivedDate.getTime());

    const holdHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

    const holdDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const movement = new CaseMovementHistory({
      caseId,
      fileNo,

      fromUserId,

      fromOfficerName: params.fromUser?.name || "Legal Registry Desk",

      fromDesignation: params.fromUser?.designation || "Intake Section",

      toUserId,

      toOfficerName: params.toUser.name || targetUser.name,

      toDesignation:
        params.toUser.designation || targetUser.designation || "Officer",

      actionType: params.actionType || "FORWARD",

      notingPurpose: params.notingPurpose || "File Movement",

      remarks: params.remarks || "",

      receivedAt: receivedDate,
      dispatchedAt: now,

      holdDurationDays: holdDays,
      holdDurationHours: holdHours,

      minuteNumber: params.minuteNumber,
    });

    await movement.save(getSessionOptions(session));

    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      {
        $set: {
          "internalHold.currentHolderId": toUserId,

          "internalHold.location": `${params.toUser.designation} (${params.toUser.name})`,

          "internalHold.heldSince": now,
          "internalHold.holdDays": 0,
        },
      },
      {
        ...getSessionOptions(session),
        runValidators: true,
        new: true,
      },
    );

    if (!updatedCase) {
      throw new Error("Case could not be updated after file movement.");
    }

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
    batchUploadId?: string,
    session?: mongoose.ClientSession,
  ) {
    const validCaseId = toObjectId(caseId, "Case ID") as Types.ObjectId;

    if (!Array.isArray(petitionersList) || petitionersList.length === 0) {
      throw new Error("At least one co-petitioner is required.");
    }

    const caseDoc = await Case.findById(validCaseId).session(session || null);

    if (!caseDoc) {
      throw new Error("Case docket not found.");
    }
    const docsToInsert = petitionersList.map((petitioner, index) => {
      const rollNo = normalizeRequiredString(
        petitioner.rollNo,
        `Petitioner ${index + 1} roll number`,
      );

      const name = normalizeRequiredString(
        petitioner.name,
        `Petitioner ${index + 1} name`,
      );

      if (
        petitioner.meritScore !== undefined &&
        (!Number.isFinite(petitioner.meritScore) || petitioner.meritScore < 0)
      ) {
        throw new Error(`Petitioner ${index + 1} has an invalid merit score.`);
      }

      return {
        caseId: caseDoc._id,
        fileNo: caseDoc.fileNo,
        rollNo,
        name,

        fatherName: petitioner.fatherName || "--",
        role: "Co-Petitioner" as PetitionerRoleType,
        categoryClaimed: petitioner.categoryClaimed || "General",
        postClaimed: petitioner.postClaimed || "Constable Civil Police",

        district: petitioner.district || "--",
        state: petitioner.state || "Uttar Pradesh",

        districtId: petitioner.districtId
          ? toObjectId(
              petitioner.districtId,
              `Petitioner ${index + 1} district ID`,
            )
          : undefined,

        stateId: petitioner.stateId
          ? toObjectId(petitioner.stateId, `Petitioner ${index + 1} state ID`)
          : undefined,

        meritScore: petitioner.meritScore ?? 0,

        status: "ACTIVE",

        source,
        batchUploadId: batchUploadId || "",
      };
    });

    const inserted = await Petitioner.insertMany(docsToInsert, {
      ordered: true,
      ...getSessionOptions(session),
    });

    const totalCount = await Petitioner.countDocuments({
      caseId: caseDoc._id,
    }).session(session || null);

    caseDoc.coPetitionersCount = totalCount;

    await caseDoc.save(getSessionOptions(session));

    return {
      insertedCount: inserted.length,
      totalCount,
    };
  }

  static async removeCoPetitioner(
    caseId: string,
    petitionerId: string,
    session?: mongoose.ClientSession,
  ) {
    const validCaseId = toObjectId(caseId, "Case ID") as Types.ObjectId;

    const validPetitionerId = toObjectId(
      petitionerId,
      "Petitioner ID",
    ) as Types.ObjectId;

    const caseDoc = await Case.findById(validCaseId).session(session || null);

    if (!caseDoc) {
      throw new Error("Case docket not found.");
    }

    const removed = await Petitioner.findOneAndDelete({
      _id: validPetitionerId,
      caseId: validCaseId,
      role: "Co-Petitioner",
    }).session(session || null);

    if (!removed) {
      throw new Error("Co-petitioner record not found.");
    }

    const totalCount = await Petitioner.countDocuments({
      caseId: validCaseId,
    }).session(session || null);
    caseDoc.coPetitionersCount = totalCount;
    await caseDoc.save(getSessionOptions(session));

    return {
      success: true,
      totalCount,
    };
  }

  static async tagConnectedWrit(
    leadCaseId: string,
    connectedWritData: {
      writNumber: string;
      cnrNumber?: string;
      petitionerName?: string;
      connectedCaseId?: string;
    },
    session?: mongoose.ClientSession,
  ) {
    const validLeadCaseId = toObjectId(
      leadCaseId,
      "Lead case ID",
    ) as Types.ObjectId;

    const writNumber = normalizeRequiredString(
      connectedWritData.writNumber,
      "Connected writ number",
    );

    const leadCase = await Case.findById(validLeadCaseId).session(
      session || null,
    );

    if (!leadCase) {
      throw new Error("Lead case docket not found.");
    }

    let connectedCaseId: Types.ObjectId | null = null;

    if (connectedWritData.connectedCaseId) {
      connectedCaseId = toObjectId(
        connectedWritData.connectedCaseId,
        "Connected case ID",
      ) as Types.ObjectId;

      if (connectedCaseId.equals(leadCase._id)) {
        throw new Error("A case cannot be connected to itself.");
      }

      const connectedCase = await Case.findById(connectedCaseId)
        .select("_id")
        .session(session || null)
        .lean();

      if (!connectedCase) {
        throw new Error("Connected case docket not found.");
      }
    }

    leadCase.connectedWrits.push({
      caseId: connectedCaseId,
      writNumber,

      cnrNumber: normalizeOptionalString(connectedWritData.cnrNumber),

      petitionerName: normalizeOptionalString(connectedWritData.petitionerName),

      taggedDate: new Date(),
    });

    await leadCase.save(getSessionOptions(session));

    return leadCase;
  }
}
