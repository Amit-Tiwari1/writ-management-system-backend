import mongoose, { Document, Schema } from "mongoose";

// 6.1 District & Zones
export interface IDistrict extends Document {
  districtName: string;
  zone: string;
  range: string;
  state: string;
  activeWritsCount: number;
}
export const District = mongoose.model<IDistrict>(
  "District",
  new Schema({
    districtName: { type: String, required: true, unique: true },
    zone: { type: String, required: true },
    range: { type: String, required: true },
    state: { type: String, default: "Uttar Pradesh" },
    activeWritsCount: { type: Number, default: 0 },
  }, { timestamps: true })
);

// 6.2 Department & Units
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

// 6.3 Rank Master
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

// 6.4 Designation Master
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

// 6.5 Court Establishments & Case Types
export interface ICourt extends Document {
  courtName: string;
  shortCode: string;
  courtType: string;
  location: string;
}
export const Court = mongoose.model<ICourt>(
  "Court",
  new Schema({
    courtName: { type: String, required: true, unique: true },
    shortCode: { type: String, required: true, uppercase: true },
    courtType: { type: String, required: true },
    location: { type: String, required: true },
  }, { timestamps: true })
);

export interface ICaseType extends Document {
  code: string;
  title: string;
  court: string;
  activeWritsCount: number;
}
export const CaseType = mongoose.model<ICaseType>(
  "CaseType",
  new Schema({
    code: { type: String, required: true, uppercase: true },
    title: { type: String, required: true },
    court: { type: String, required: true },
    activeWritsCount: { type: Number, default: 0 },
  }, { timestamps: true })
);

// 6.6 Taxonomy & Subject Tree
export interface ITaxonomy extends Document {
  category: string;
  examCycle: string;
  issue: string;
  mappedNodalOfficer: string;
  activeCasesCount: number;
}
export const Taxonomy = mongoose.model<ITaxonomy>(
  "Taxonomy",
  new Schema({
    category: { type: String, required: true },
    examCycle: { type: String, required: true },
    issue: { type: String, required: true },
    mappedNodalOfficer: { type: String, required: true },
    activeCasesCount: { type: Number, default: 0 },
  }, { timestamps: true })
);

// 6.7 Subject Custodian Map
export interface ICustodianMap extends Document {
  subjectMatter: string;
  assignedOfficerName: string;
  officerDesignation: string;
  sectionWing: string;
}
export const CustodianMap = mongoose.model<ICustodianMap>(
  "CustodianMap",
  new Schema({
    subjectMatter: { type: String, required: true, unique: true },
    assignedOfficerName: { type: String, required: true },
    officerDesignation: { type: String, required: true },
    sectionWing: { type: String, required: true },
  }, { timestamps: true })
);

// 6.8 Respondent Groups
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

// 6.9 Action Taken Mapping
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

// 6.10 Institutional Aliases & Monitored Counsels
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