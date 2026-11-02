import { Document, Types } from "mongoose";

export type MovementActionType =
  | "FORWARD"
  | "RETURN"
  | "RECALL"
  | "INITIAL_INTAKE"
  | "VETTING_REQUEST"
  | "APPROVAL_GRANTED"
  | "APPROVAL_REJECTED";

export interface ICaseMovementHistoryBase {
  caseId: Types.ObjectId;
  fileNo: string;
  fromUserId?: Types.ObjectId;
  fromOfficerName: string;
  fromDesignation: string;
  toUserId: Types.ObjectId;
  toOfficerName: string;
  toDesignation: string;
  actionType: MovementActionType;
  notingPurpose?: string;
  remarks?: string;
  receivedAt: Date;
  dispatchedAt: Date;
  holdDurationDays: number;
  holdDurationHours: number;
  minuteNumber?: number;
}

export interface ICaseMovementHistory extends ICaseMovementHistoryBase, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}