import { Document, Types } from "mongoose";

export type HearingOrderType =
  | "INTERIM_ORDER"
  | "ADJOURNMENT"
  | "FINAL_JUDGMENT"
  | "DIRECTION_ISSUED"
  | "COUNTER_AFFIDAVIT_CALLED"
  | "STAY_GRANTED"
  | "STAY_EXTENDED"
  | "STAY_VACATED"
  | "CONTEMPT_NOTICE_ISSUED";

export type HearingUpdateSource = "MANUAL_ENTRY" | "ECOURTS_SCRAPER" | "ROLLBACK";

export interface ICaseHearingHistoryBase {
  caseId: Types.ObjectId;
  fileNo: string;
  hearingDate: Date;
  ndoh: Date | null;
  courtRoomNo?: string;
  judgeCoram?: string;
  listingItemNo?: string;
  stageOfCase?: string;
  businessRecorded: string;
  orderType: HearingOrderType;
  orderDocId?: Types.ObjectId;
  orderDocumentUrl?: string;
  source: HearingUpdateSource;
  enteredByUserId?: Types.ObjectId;
  enteredByOfficerName: string;
  enteredByDesignation: string;
  isOverridden: boolean;
  overriddenReason?: string;
  previousSnapshot?: {
    ndoh: Date | null;
    stageOfCase?: string;
    courtRoomNo?: string;
    judicialStatus?: string;
  };
}

export interface ICaseHearingHistory extends ICaseHearingHistoryBase, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}