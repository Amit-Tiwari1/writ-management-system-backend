import mongoose, { Document } from "mongoose";


export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  success: boolean;
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    pages: number;
  };
  data: T[];
}


export interface IState extends Document {
  stateName: string;
  stateCode: string;
  country: string;
}

export interface IZone extends Document {
  zoneName: string;
  stateId: mongoose.Types.ObjectId;
  headquarters: string;
}

export interface IRange extends Document {
  rangeName: string;
  zoneId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
}

export interface IDistrict extends Document {
  districtName: string;
  stateId: mongoose.Types.ObjectId;
  zoneId: mongoose.Types.ObjectId;
  rangeId: mongoose.Types.ObjectId;
  activeWritsCount: number;
}


export interface ICourt extends Document {
  courtName: string;
  shortCode: string;
  courtType: string;
  location: string;
}

export interface ICaseType extends Document {
  courtId: mongoose.Types.ObjectId;
  caseTypeName: string;
  shortName: string;
  activeWritsCount: number;
}


export interface ICaseCategory extends Document {
  categoryName: string;
  description?: string;
  order: number;
}

export interface ICaseSubCategory extends Document {
  categoryId: mongoose.Types.ObjectId;
  subCategoryName: string;
  defaultOfficerName?: string;
  defaultOfficerId?: mongoose.Types.ObjectId;
}

export interface ICaseSubject extends Document {
  categoryId: mongoose.Types.ObjectId;
  subCategoryId: mongoose.Types.ObjectId;
  subjectTitle: string;
}

export interface ISubjectCustodian extends Document {
  subjectId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  officerName: string;
  designation: string;
  userId?: mongoose.Types.ObjectId;
}


export interface IRank extends Document {
  rankName: string;
  shortCode: string;
  cadreType: string;
  payLevelGrade: string;
}

export interface IDesignation extends Document {
  title: string;
  authorityLevel: string;
  canSignPWC: boolean;
  canForwardFiles: boolean;
  defaultRole: string;
}

export interface IDepartment extends Document {
  unitCode: string;
  unitName: string;
  parentFormation: string;
  headquarters: string;
  activeWritsCount: number;
}

export interface IRespondentGroup extends Document {
  groupName: string;
  defaultRankTitle: string;
  defaultAddress: string;
  isOurOffice: boolean;
}

export interface IActionMapping extends Document {
  courtDecision: string;
  actionStatus: string;
  actionNotTaken: string;
  requiresComplianceDeadline: boolean;
  defaultDeadlineDays: number;
  impactScope: string;
}

export interface IAlias extends Document {
  keyword: string;
  language: string;
  category: string;
  matchWeight: string;
}

export interface IStandingCounsel extends Document {
  name: string;
  monitoredBenches: string;
  autoFlag: boolean;
}