import mongoose, { Schema } from "mongoose";
import {
  IActionMapping,
  IAlias,
  ICaseCategory,
  ICaseSubCategory,
  ICaseSubject,
  ICaseType,
  ICourt,
  IDepartment,
  IDesignation,
  IDistrict,
  IRange,
  IRank,
  IRespondentGroup,
  IStandingCounsel,
  IState,
  ISubjectCustodian,
  IZone,
} from "../types/masterType";


export const State = mongoose.model<IState>(
  "State",
  new Schema(
    {
      stateName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      stateCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
      },
      country: {
        type: String,
        default: "India",
        trim: true,
      },
    },
    { timestamps: true }
  )
);


export const Zone = mongoose.model<IZone>(
  "Zone",
  new Schema(
    {
      zoneName: {
        type: String,
        required: true,
        trim: true,
      },
      stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
        required: true,
        index: true,
      },
      headquarters: {
        type: String,
        default: "",
        trim: true,
      },
    },
    { timestamps: true }
  )
);

Zone.schema.index({ zoneName: 1, stateId: 1 }, { unique: true });


export const Range = mongoose.model<IRange>(
  "Range",
  new Schema(
    {
      rangeName: {
        type: String,
        required: true,
        trim: true,
      },
      zoneId: {
        type: Schema.Types.ObjectId,
        ref: "Zone",
        required: true,
        index: true,
      },
      stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
        required: true,
        index: true,
      },
    },
    { timestamps: true }
  )
);

Range.schema.index({ rangeName: 1, zoneId: 1 }, { unique: true });


export const District = mongoose.model<IDistrict>(
  "District",
  new Schema(
    {
      districtName: {
        type: String,
        required: true,
        trim: true,
      },
      stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
        required: true,
        index: true,
      },
      zoneId: {
        type: Schema.Types.ObjectId,
        ref: "Zone",
        required: true,
        index: true,
      },
      rangeId: {
        type: Schema.Types.ObjectId,
        ref: "Range",
        required: true,
        index: true,
      },
      activeWritsCount: {
        type: Number,
        default: 0,
      },
    },
    { timestamps: true }
  )
);

District.schema.index({ districtName: 1, stateId: 1 }, { unique: true });


export const Court = mongoose.model<ICourt>(
  "Court",
  new Schema(
    {
      courtName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      shortCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },
      courtType: {
        type: String,
        default: "HIGH_COURT",
        trim: true,
      },
      location: {
        type: String,
        required: true,
        trim: true,
      },
    },
    { timestamps: true }
  )
);


export const CaseType = mongoose.model<ICaseType>(
  "CaseType",
  new Schema(
    {
      courtId: {
        type: Schema.Types.ObjectId,
        ref: "Court",
        required: true,
        index: true,
      },
      caseTypeName: {
        type: String,
        required: true,
        trim: true,
      },
      shortName: {
        type: String,
        trim: true,
        default: "",
      },
      activeWritsCount: {
        type: Number,
        default: 0,
      },
    },
    { timestamps: true }
  )
);

CaseType.schema.index({ courtId: 1, caseTypeName: 1 }, { unique: true });


export const CaseCategory = mongoose.model<ICaseCategory>(
  "CaseCategory",
  new Schema(
    {
      categoryName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      description: {
        type: String,
        default: "",
        trim: true,
      },
      order: {
        type: Number,
        default: 1,
      },
    },
    { timestamps: true }
  )
);


export const CaseSubCategory = mongoose.model<ICaseSubCategory>(
  "CaseSubCategory",
  new Schema(
    {
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "CaseCategory",
        required: true,
        index: true,
      },
      subCategoryName: {
        type: String,
        required: true,
        trim: true,
      },
      defaultOfficerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },
    },
    { timestamps: true }
  )
);

CaseSubCategory.schema.index(
  { categoryId: 1, subCategoryName: 1 },
  { unique: true }
);


export const CaseSubject = mongoose.model<ICaseSubject>(
  "CaseSubject",
  new Schema(
    {
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "CaseCategory",
        required: true,
        index: true,
      },
      subCategoryId: {
        type: Schema.Types.ObjectId,
        ref: "CaseSubCategory",
        required: true,
        index: true,
      },
      subjectTitle: {
        type: String,
        required: true,
        trim: true,
      },
    },
    { timestamps: true }
  )
);

CaseSubject.schema.index(
  { subCategoryId: 1, subjectTitle: 1 },
  { unique: true }
);


export const SubjectCustodian = mongoose.model<ISubjectCustodian>(
  "SubjectCustodian",
  new Schema(
    {
      subjectId: {
        type: Schema.Types.ObjectId,
        ref: "CaseSubject",
        required: true,
        index: true,
      },
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "CaseCategory",
        required: true,
        index: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      designationId: {
        type: Schema.Types.ObjectId,
        ref: "Designation",
        required: true,
        index: true,
      },
    },
    { timestamps: true }
  )
);

SubjectCustodian.schema.index(
  { subjectId: 1, categoryId: 1 },
  { unique: true }
);

export const CustodianMap = SubjectCustodian;
export const Taxonomy = CaseCategory;


export const Rank = mongoose.model<IRank>(
  "Rank",
  new Schema(
    {
      rankName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      shortCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },
      cadreType: {
        type: String,
        required: true,
        trim: true,
      },
      payLevelGrade: {
        type: String,
        required: true,
        trim: true,
      },
    },
    { timestamps: true }
  )
);


export const Designation = mongoose.model<IDesignation>(
  "Designation",
  new Schema(
    {
      title: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      authorityLevel: {
        type: String,
        required: true,
        trim: true,
      },
      canSignPWC: {
        type: Boolean,
        default: false,
      },
      canForwardFiles: {
        type: Boolean,
        default: true,
      },
      defaultRole: {
        type: String,
        default: "Officer-in-Charge (OIC)",
        trim: true,
      },
    },
    { timestamps: true }
  )
);


export const Department = mongoose.model<IDepartment>(
  "Department",
  new Schema(
    {
      unitCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
      },
      unitName: {
        type: String,
        required: true,
        trim: true,
      },
      parentFormation: {
        type: String,
        required: true,
        trim: true,
      },
      headquarters: {
        type: String,
        default: "Lucknow",
        trim: true,
      },
      activeWritsCount: {
        type: Number,
        default: 0,
      },
    },
    { timestamps: true }
  )
);

export const RespondentGroup = mongoose.model<IRespondentGroup>(
  "RespondentGroup",
  new Schema(
    {
      groupName: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
      },
      defaultRankId: {
        type: String,
        ref: "Rank",
        required: true,
        index: true,
      },
      defaultAddress: {
        type: String,
        required: true,
        trim: true,
      },
      isOurOffice: {
        type: Boolean,
        default: false,
      },
    },
    { timestamps: true }
  )
);

export const ActionMapping = mongoose.model<IActionMapping>(
  "ActionMapping",
  new Schema(
    {
      courtDecision: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      actionStatus: {
        type: String,
        required: true,
        trim: true,
      },
      actionNotTaken: {
        type: String,
        required: true,
        trim: true,
      },
      requiresComplianceDeadline: {
        type: Boolean,
        default: false,
      },
      defaultDeadlineDays: {
        type: Number,
        default: 0,
      },
      impactScope: {
        type: String,
        default: "Standard Workflow",
        trim: true,
      },
    },
    { timestamps: true }
  )
);


export const Alias = mongoose.model<IAlias>(
  "Alias",
  new Schema(
    {
      keyword: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      language: {
        type: String,
        required: true,
        trim: true,
      },
      category: {
        type: String,
        required: true,
        trim: true,
      },
      matchWeight: {
        type: String,
        required: true,
        trim: true,
      },
    },
    { timestamps: true }
  )
);

export const StandingCounsel = mongoose.model<IStandingCounsel>(
  "StandingCounsel",
  new Schema(
    {
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      monitoredBenches: {
        type: String,
        required: true,
        trim: true,
      },
      autoFlag: {
        type: Boolean,
        default: true,
      },
    },
    { timestamps: true }
  )
);