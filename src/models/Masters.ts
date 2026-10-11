import mongoose, { Document, Schema } from "mongoose";

// ==========================================
// 1. GEOGRAPHIC HIERARCHY (State -> Zone -> Range -> District)
// ==========================================

export interface IState extends Document {
  stateName: string;
  stateCode: string;
  country: string;
}
export const State = mongoose.model<IState>(
  "State",
  new Schema({
    stateName: { type: String, required: true, unique: true, trim: true },
    stateCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    country: { type: String, default: "India" },
  }, { timestamps: true })
);

export interface IZone extends Document {
  zoneName: string;
  stateId: mongoose.Types.ObjectId;
  headquarters: string;
}
export const Zone = mongoose.model<IZone>(
  "Zone",
  new Schema({
    zoneName: { type: String, required: true, trim: true },
    stateId: { type: Schema.Types.ObjectId, ref: "State", required: true, index: true },
    headquarters: { type: String, default: "" },
  }, { timestamps: true })
);
Zone.schema.index({ zoneName: 1, stateId: 1 }, { unique: true });

export interface IRange extends Document {
  rangeName: string;
  zoneId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
}
export const Range = mongoose.model<IRange>(
  "Range",
  new Schema({
    rangeName: { type: String, required: true, trim: true },
    zoneId: { type: Schema.Types.ObjectId, ref: "Zone", required: true, index: true },
    stateId: { type: Schema.Types.ObjectId, ref: "State", required: true, index: true },
  }, { timestamps: true })
);
Range.schema.index({ rangeName: 1, zoneId: 1 }, { unique: true });

export interface IDistrict extends Document {
  districtName: string;
  stateId: mongoose.Types.ObjectId;
  zoneId: mongoose.Types.ObjectId;
  rangeId: mongoose.Types.ObjectId;
  activeWritsCount: number;
}
export const District = mongoose.model<IDistrict>(
  "District",
  new Schema({
    districtName: { type: String, required: true, trim: true },
    stateId: { type: Schema.Types.ObjectId, ref: "State", required: true, index: true },
    zoneId: { type: Schema.Types.ObjectId, ref: "Zone", required: true, index: true },
    rangeId: { type: Schema.Types.ObjectId, ref: "Range", required: true, index: true },
    activeWritsCount: { type: Number, default: 0 },
  }, { timestamps: true })
);
District.schema.index({ districtName: 1, stateId: 1 }, { unique: true });

// ==========================================
// 2. JUDICIAL HIERARCHY (Court -> CaseType)
// ==========================================

export interface ICourt extends Document {
  courtName: string; // e.g. "High Court Allahabad", "Supreme Court of India"
  shortCode: string; // e.g. "HC-ALD", "HC-LKO", "SCI"
  courtType: string; // "HIGH_COURT", "APEX_COURT", "TRIBUNAL"
  location: string;
}
export const Court = mongoose.model<ICourt>(
  "Court",
  new Schema({
    courtName: { type: String, required: true, unique: true, trim: true },
    shortCode: { type: String, required: true, uppercase: true, trim: true },
    courtType: { type: String, default: "HIGH_COURT" },
    location: { type: String, required: true },
  }, { timestamps: true })
);

export interface ICaseType extends Document {
  courtId: mongoose.Types.ObjectId; // Foreign Key to Court
  caseTypeName: string; // e.g. "CIVIL REVISION", "CONTEMPT APPLICATION (CIVIL)", "WRIT-A"
  shortName: string; // e.g. "WRIT-A", "CONT", "CR"
  activeWritsCount: number;
}
export const CaseType = mongoose.model<ICaseType>(
  "CaseType",
  new Schema({
    courtId: { type: Schema.Types.ObjectId, ref: "Court", required: true, index: true },
    caseTypeName: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true, default: "" },
    activeWritsCount: { type: Number, default: 0 },
  }, { timestamps: true })
);
CaseType.schema.index({ courtId: 1, caseTypeName: 1 }, { unique: true });

// ==========================================
// 3. BOARD TAXONOMY (Category -> SubCategory -> Subject -> Custodian)
// ==========================================

// Level 1: Category (Recruitment, Promotion, Establishment, Others)
export interface ICaseCategory extends Document {
  categoryName: string;
  description?: string;
  order: number;
}
export const CaseCategory = mongoose.model<ICaseCategory>(
  "CaseCategory",
  new Schema({
    categoryName: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 1 },
  }, { timestamps: true })
);

// Level 2: Sub-Category (e.g. Constable Civil Police & PAC - 2009, SICP Ranker 2011)
export interface ICaseSubCategory extends Document {
  categoryId: mongoose.Types.ObjectId;
  subCategoryName: string;
  defaultOfficerName?: string; // e.g. Swahleen Ahmad (S.I.(M))
  defaultOfficerId?: mongoose.Types.ObjectId;
}
export const CaseSubCategory = mongoose.model<ICaseSubCategory>(
  "CaseSubCategory",
  new Schema({
    categoryId: { type: Schema.Types.ObjectId, ref: "CaseCategory", required: true, index: true },
    subCategoryName: { type: String, required: true, trim: true },
    defaultOfficerName: { type: String, default: "--" },
    defaultOfficerId: { type: Schema.Types.ObjectId, ref: "User" },
  }, { timestamps: true })
);
CaseSubCategory.schema.index({ categoryId: 1, subCategoryName: 1 }, { unique: true });

// Level 3: Subject (e.g. P.E.T. Fail, P.E.T. Absent, SI (C), Dismissal From Service)
export interface ICaseSubject extends Document {
  categoryId: mongoose.Types.ObjectId;
  subCategoryId: mongoose.Types.ObjectId;
  subjectTitle: string;
}
export const CaseSubject = mongoose.model<ICaseSubject>(
  "CaseSubject",
  new Schema({
    categoryId: { type: Schema.Types.ObjectId, ref: "CaseCategory", required: true, index: true },
    subCategoryId: { type: Schema.Types.ObjectId, ref: "CaseSubCategory", required: true, index: true },
    subjectTitle: { type: String, required: true, trim: true },
  }, { timestamps: true })
);
CaseSubject.schema.index({ subCategoryId: 1, subjectTitle: 1 }, { unique: true });

// Level 4: Subject Wise Custodian (Officer + Designation mapped to Subject)
export interface ISubjectCustodian extends Document {
  subjectId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  officerName: string;
  designation: string;
  userId?: mongoose.Types.ObjectId;
}
export const SubjectCustodian = mongoose.model<ISubjectCustodian>(
  "SubjectCustodian",
  new Schema({
    subjectId: { type: Schema.Types.ObjectId, ref: "CaseSubject", required: true, unique: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "CaseCategory", required: true },
    officerName: { type: String, required: true },
    designation: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  }, { timestamps: true })
);

// ==========================================
// 4. INSTITUTIONAL RANKS, DESIGNATIONS & DEPARTMENTS
// ==========================================

export interface IRank extends Document {
  rankName: string;
  shortCode: string;
  cadreType: string;
  payLevelGrade: string;
}
export const Rank = mongoose.model<IRank>(
  "Rank",
  new Schema({
    rankName: { type: String, required: true, unique: true },
    shortCode: { type: String, required: true, uppercase: true },
    cadreType: { type: String, required: true },
    payLevelGrade: { type: String, required: true },
  }, { timestamps: true })
);

export interface IDesignation extends Document {
  title: string;
  authorityLevel: string;
  canSignPWC: boolean;
  canForwardFiles: boolean;
  defaultRole: string;
}
export const Designation = mongoose.model<IDesignation>(
  "Designation",
  new Schema({
    title: { type: String, required: true, unique: true },
    authorityLevel: { type: String, required: true },
    canSignPWC: { type: Boolean, default: false },
    canForwardFiles: { type: Boolean, default: true },
    defaultRole: { type: String, default: "Officer-in-Charge (OIC)" },
  }, { timestamps: true })
);

export interface IDepartment extends Document {
  unitCode: string;
  unitName: string;
  parentFormation: string;
  headquarters: string;
  activeWritsCount: number;
}
export const Department = mongoose.model<IDepartment>(
  "Department",
  new Schema({
    unitCode: { type: String, required: true, unique: true, uppercase: true },
    unitName: { type: String, required: true },
    parentFormation: { type: String, required: true },
    headquarters: { type: String, default: "Lucknow" },
    activeWritsCount: { type: Number, default: 0 },
  }, { timestamps: true })
);

// Backward Compatibility Aliases for other modules
export const CustodianMap = SubjectCustodian;
export const Taxonomy = CaseCategory;

export interface IRespondentGroup extends Document {
  groupName: string;
  defaultRankTitle: string;
  defaultAddress: string;
  isOurOffice: boolean;
}
export const RespondentGroup = mongoose.model<IRespondentGroup>(
  "RespondentGroup",
  new Schema({
    groupName: { type: String, required: true, unique: true, uppercase: true },
    defaultRankTitle: { type: String, required: true },
    defaultAddress: { type: String, required: true },
    isOurOffice: { type: Boolean, default: false },
  }, { timestamps: true })
);

export interface IActionMapping extends Document {
  courtDecision: string;
  actionStatus: string;
  actionNotTaken: string;
  requiresComplianceDeadline: boolean;
  defaultDeadlineDays: number;
  impactScope: string;
}
export const ActionMapping = mongoose.model<IActionMapping>(
  "ActionMapping",
  new Schema({
    courtDecision: { type: String, required: true, unique: true },
    actionStatus: { type: String, required: true },
    actionNotTaken: { type: String, required: true },
    requiresComplianceDeadline: { type: Boolean, default: false },
    defaultDeadlineDays: { type: Number, default: 0 },
    impactScope: { type: String, default: "Standard Workflow" },
  }, { timestamps: true })
);

export interface IAlias extends Document {
  keyword: string;
  language: string;
  category: string;
  matchWeight: string;
}
export const Alias = mongoose.model<IAlias>(
  "Alias",
  new Schema({
    keyword: { type: String, required: true, unique: true },
    language: { type: String, required: true },
    category: { type: String, required: true },
    matchWeight: { type: String, required: true },
  }, { timestamps: true })
);

export interface IStandingCounsel extends Document {
  name: string;
  monitoredBenches: string;
  autoFlag: boolean;
}
export const StandingCounsel = mongoose.model<IStandingCounsel>(
  "StandingCounsel",
  new Schema({
    name: { type: String, required: true, unique: true },
    monitoredBenches: { type: String, required: true },
    autoFlag: { type: Boolean, default: true },
  }, { timestamps: true })
);