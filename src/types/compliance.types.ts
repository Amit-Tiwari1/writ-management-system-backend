import { Document, Types } from "mongoose";

export type ComplianceRecordType = "STAY" | "CONTEMPT" | "GENERAL_DIRECTION";

export type VacationMotionStatusType =
  | "DRAFT PENDING CSC"
  | "LISTED FOR ARGUMENTS"
  | "URGENT ACTION REQUIRED"
  | "VACATION_FILED"
  | "DISPOSED";

export type ComplianceSeverityLevel = "CRITICAL" | "HIGH_WARNING" | "MONITORED";

export type ComplianceStatusType = "ACTIVE" | "COMPLIED_AND_CLOSED";

export interface IComplianceRecordBase {
  caseId: Types.ObjectId;
  fileNo: string;
  writNumber: string;
  cnrNumber?: string;
  court: string;
  courtId?: Types.ObjectId;
  coramBench?: string;
  petitionerName: string;
  oicName: string;
  oicUserId?: Types.ObjectId;
  recordType: ComplianceRecordType;
  actionMappingId?: Types.ObjectId;
  courtDecisionOutcome?: string;
  stayOrderScope?: string;
  stayOrderDate?: Date;
  vacationMotionStatus?: VacationMotionStatusType;
  vacationDeadline?: Date;
  vacationFilingDate?: Date;
  contemptNumber?: string;
  contemnorTitle?: string;
  courtDirections?: string;
  directionGivenDate?: Date;
  complianceDeadlineDate?: Date;
  totalComplianceDays?: number;
  complianceProgress?: string;
  severityLevel: ComplianceSeverityLevel;
  status: ComplianceStatusType;
  actionTakenByBoard?: string;
  complianceAffidavitDate?: Date;
  complianceProofDocId?: Types.ObjectId;
  complianceProofDocUrl?: string;
  closedByOfficerName?: string;
  closedByUserId?: Types.ObjectId;
  closedAt?: Date;
}

export interface IComplianceRecord extends IComplianceRecordBase, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}