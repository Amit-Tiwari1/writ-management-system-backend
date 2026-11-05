
import { Document, Types } from "mongoose";

export interface IConnectedWrit {
  caseId?: Types.ObjectId | null;
  writNumber: string;
  cnrNumber?: string;
  petitionerName?: string;
  taggedDate?: Date;
}

export type BenchLocationType =
  | "Allahabad"
  | "Lucknow"
  | "New Delhi";

export type JudicialStatusType =
  | "PRE_NOTICE"
  | "ACTIVE"
  | "PENDING_PWC"
  | "STAY_IN_FORCE"
  | "CONTEMPT_NOTICE"
  | "DISPOSED"
  | "ARCHIVED";

export type SyncStatusType =
  | "LIVE_SYNCED"
  | "SCHEDULED"
  | "MANUAL_DOCKET"
  | "DISCREPANCY";

export interface IInternalHold {
  currentHolderId?: Types.ObjectId | null;
  location: string;
  holdDays: number;
  heldSince?: Date;
}

export interface ILegacyData {
  oldFileNo?: string;
  oldNoticeYear?: string;
  rawForwarded?: string;
  orderStatus?: string;
}

export interface ICaseBase {
  fileNo: string;
  noticeNumber?: string;
  writNumber?: string;
  cnrNumber?: string;
  identifierTier: 1 | 2 | 3 | 4;
  courtId: Types.ObjectId;
  courtCode: string;
  caseTypeId: Types.ObjectId;
  categoryId: Types.ObjectId;
  subCategoryId: Types.ObjectId;
  subjectId: Types.ObjectId;
  caseNumber?: string;
  caseYear?: number;
  benchLocation: BenchLocationType;
  courtRoomNo?: string;
  coramBench?: string;
  leadPetitioner: string;
  respondentString: string;
  petitionerAdvocate?: string;
  stateCounsel?: string;
  assignedOIC: Types.ObjectId;
  assignedPairokar: Types.ObjectId;
  sectionWing: string;
  examCycle: string;
  stage: string;
  judicialStatus: JudicialStatusType;
  internalHold: IInternalHold;
  ndoh: Date | null;
  listingItemNo?: string;
  hasActiveStay: boolean;
  stayScope?: string;
  stayGrantedDate?: Date | null;
  stayVacationDueDate?: Date | null;
  isContemptNotice: boolean;
  contemptDeadlineDate?: Date | null;
  connectedWrits: IConnectedWrit[];
  coPetitionersCount: number;
  syncStatus: SyncStatusType;
  lastSyncedAt?: Date | null;
  legacyData?: ILegacyData;
}

export interface ICase extends ICaseBase, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
