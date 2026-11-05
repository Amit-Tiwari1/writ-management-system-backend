
import { Document, Types } from "mongoose";

export type PetitionerRoleType =
  | "Lead Petitioner"
  | "Co-Petitioner";

export type PetitionerStatusType =
  | "ACTIVE"
  | "WITHDRAWN"
  | "DISMISSED_ON_MERIT"
  | "RELIEF_GRANTED";

export type PetitionerSourceType =
  | "MANUAL_ENTRY"
  | "CSV_IMPORT"
  | "ECOURTS_SYNC";

export interface IPetitionerBase {
  caseId: Types.ObjectId;
  fileNo: string;
  rollNo: string;
  registrationNo?: string;
  name: string;
  fatherName?: string;
  role: PetitionerRoleType;
  categoryClaimed: string;
  postClaimed: string;
  stateId?: Types.ObjectId;
  districtId?: Types.ObjectId;
  examCenter?: string;
  status: PetitionerStatusType;
  meritScore?: number;
  meritGrievance?: string;
  source: PetitionerSourceType;
  batchUploadId?: string;
}

export interface IPetitioner extends IPetitionerBase, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
