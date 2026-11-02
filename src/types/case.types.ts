import { Document, Types } from "mongoose";

export interface IConnectedWrit {
  caseId?: Types.ObjectId;
  writNumber: string;
  cnrNumber?: string;
  petitionerName?: string;
  taggedDate?: Date;
}

export type BenchLocationType = "Allahabad" | "Lucknow" | "New Delhi";

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
  currentHolderId?: Types.ObjectId;
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
  courtId?: Types.ObjectId;
  court: string;
  courtCode: string;
  caseTypeId?: Types.ObjectId;
  caseType: string;
  caseNumber?: string;
  caseYear?: number;
  benchLocation: BenchLocationType;
  courtRoomNo?: string;
  coramBench?: string;
  leadPetitioner: string;
  respondentString: string;
  petitionerAdvocate?: string;
  stateCounsel?: string;
  assignedOIC: string;
  assignedPairokar: string;
  sectionWing: string;
  categoryId?: Types.ObjectId;
  category: string;
  subCategoryId?: Types.ObjectId;
  subCategory?: string;
  subjectId?: Types.ObjectId;
  disputeSubject: string;
  examCycle: string;
  stage: string;
  judicialStatus: JudicialStatusType;
  internalHold: IInternalHold;
  ndoh: Date | null;
  listingItemNo?: string;
  hasActiveStay: boolean;
  stayScope?: string;
  stayGrantedDate?: Date;
  stayVacationDueDate?: Date;
  isContemptNotice: boolean;
  contemptDeadlineDate?: Date;
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