import {
  State,
  Zone,
  Range,
  District,
  Court,
  CaseType,
  CaseCategory,
  CaseSubCategory,
  CaseSubject,
  SubjectCustodian,
  Rank,
  Designation,
  Department,
  RespondentGroup,
  ActionMapping,
  Alias,
  StandingCounsel,
} from "../models/Masters";
import { PaginationQuery } from "../types/masterType";

export class MasterService {
  private static getPaginationParams(query: PaginationQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  static async getCaseIntakeDropdowns() {
    const [
      states,
      districts,
      courts,
      caseTypes,
      categories,
      subCategories,
      subjects,
      ranks,
      designations,
      departments,
      respondentGroups,
      standingCounsels,
    ] = await Promise.all([
      State.find().select("stateName stateCode").sort({ stateName: 1 }).lean(),
      District.find()
        .populate("stateId", "stateName stateCode")
        .populate("zoneId", "zoneName")
        .populate("rangeId", "rangeName")
        .sort({ districtName: 1 })
        .lean(),
      Court.find().select("courtName shortCode location").lean(),
      CaseType.find().populate("courtId", "courtName shortCode").sort({ caseTypeName: 1 }).lean(),
      CaseCategory.find().sort({ order: 1 }).lean(),
      CaseSubCategory.find().populate("categoryId", "categoryName").sort({ subCategoryName: 1 }).lean(),
      CaseSubject.find()
        .populate("categoryId", "categoryName")
        .populate("subCategoryId", "subCategoryName")
        .sort({ subjectTitle: 1 })
        .lean(),
      Rank.find().select("rankName shortCode").lean(),
      Designation.find().select("title authorityLevel canSignPWC defaultRole").lean(),
      Department.find().select("unitName unitCode").lean(),
      RespondentGroup.find().select("groupName defaultRankTitle defaultAddress isOurOffice").lean(),
      StandingCounsel.find().select("name monitoredBenches").lean(),
    ]);

    return {
      states,
      districts,
      courts,
      caseTypes,
      categories,
      subCategories,
      subjects,
      ranks,
      designations,
      departments,
      respondentGroups,
      standingCounsels,
    };
  }

  static async getPaginatedStates(query: PaginationQuery) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { stateName: new RegExp(query.search.trim(), "i") },
        { stateCode: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      State.find(filter).sort({ stateName: 1 }).skip(skip).limit(limit).lean(),
      State.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedDistricts(params: {
    stateId?: string;
    zoneId?: string;
    rangeId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = this.getPaginationParams(params);
    const filter: any = {};
    if (params.stateId) filter.stateId = params.stateId;
    if (params.zoneId) filter.zoneId = params.zoneId;
    if (params.rangeId) filter.rangeId = params.rangeId;
    if (params.search) {
      filter.districtName = new RegExp(params.search.trim(), "i");
    }

    const [data, totalCount] = await Promise.all([
      District.find(filter)
        .populate("stateId", "stateName stateCode")
        .populate("zoneId", "zoneName")
        .populate("rangeId", "rangeName")
        .sort({ districtName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      District.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedCourts(query: PaginationQuery) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { courtName: new RegExp(query.search.trim(), "i") },
        { shortCode: new RegExp(query.search.trim(), "i") },
        { location: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      Court.find(filter).sort({ courtName: 1 }).skip(skip).limit(limit).lean(),
      Court.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedCaseTypes(params: { courtId?: string; search?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = this.getPaginationParams(params);
    const filter: any = {};
    if (params.courtId && params.courtId !== "ALL") filter.courtId = params.courtId;
    if (params.search) {
      filter.$or = [
        { caseTypeName: new RegExp(params.search.trim(), "i") },
        { shortName: new RegExp(params.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      CaseType.find(filter)
        .populate("courtId", "courtName shortCode")
        .sort({ caseTypeName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CaseType.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getCaseTypesByCourt(courtId: string | string[]) {
    const id = Array.isArray(courtId) ? courtId[0] : courtId;
    return CaseType.find({ courtId: id }).sort({ caseTypeName: 1 }).lean();
  }

  static async getPaginatedCategories(query: PaginationQuery) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.search) {
      filter.categoryName = new RegExp(query.search.trim(), "i");
    }
    const [data, totalCount] = await Promise.all([
      CaseCategory.find(filter).sort({ order: 1 }).skip(skip).limit(limit).lean(),
      CaseCategory.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedSubCategories(params: { categoryId?: string; search?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = this.getPaginationParams(params);
    const filter: any = {};
    if (params.categoryId && params.categoryId !== "ALL") filter.categoryId = params.categoryId;
    if (params.search) {
      filter.subCategoryName = new RegExp(params.search.trim(), "i");
    }
    const [data, totalCount] = await Promise.all([
      CaseSubCategory.find(filter)
        .populate("categoryId", "categoryName")
        .populate("defaultOfficerId", "name username designation")
        .sort({ subCategoryName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CaseSubCategory.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getSubCategoriesByCategory(categoryId: string | string[]) {
    const id = Array.isArray(categoryId) ? categoryId[0] : categoryId;
    return CaseSubCategory.find({ categoryId: id }).sort({ subCategoryName: 1 }).lean();
  }

  static async getPaginatedSubjects(params: { categoryId?: string; subCategoryId?: string; search?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = this.getPaginationParams(params);
    const filter: any = {};
    if (params.categoryId && params.categoryId !== "ALL") filter.categoryId = params.categoryId;
    if (params.subCategoryId) filter.subCategoryId = params.subCategoryId;
    if (params.search) {
      filter.subjectTitle = new RegExp(params.search.trim(), "i");
    }
    const [data, totalCount] = await Promise.all([
      CaseSubject.find(filter)
        .populate("categoryId", "categoryName")
        .populate("subCategoryId", "subCategoryName")
        .sort({ subjectTitle: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CaseSubject.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getSubjectsBySubCategory(subCategoryId: string | string[]) {
    const id = Array.isArray(subCategoryId) ? subCategoryId[0] : subCategoryId;
    return CaseSubject.find({ subCategoryId: id }).sort({ subjectTitle: 1 }).lean();
  }

  static async getPaginatedSubjectCustodians(params: { categoryId?: string; search?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = this.getPaginationParams(params);
    const filter: any = {};
    if (params.categoryId && params.categoryId !== "ALL") filter.categoryId = params.categoryId;
    if (params.search) {
      filter.$or = [
        { officerName: new RegExp(params.search.trim(), "i") },
        { designation: new RegExp(params.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      SubjectCustodian.find(filter)
        .populate("subjectId", "subjectTitle")
        .populate("categoryId", "categoryName")
        .populate("userId", "name username email mobile")
        .skip(skip)
        .limit(limit)
        .lean(),
      SubjectCustodian.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedDepartments(query: PaginationQuery & { parentFormation?: string }) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.parentFormation && query.parentFormation !== "ALL") filter.parentFormation = query.parentFormation;
    if (query.search) {
      filter.$or = [
        { unitName: new RegExp(query.search.trim(), "i") },
        { unitCode: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      Department.find(filter).sort({ unitName: 1 }).skip(skip).limit(limit).lean(),
      Department.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedRanks(query: PaginationQuery & { cadreType?: string }) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.cadreType && query.cadreType !== "ALL") filter.cadreType = query.cadreType;
    if (query.search) {
      filter.$or = [
        { rankName: new RegExp(query.search.trim(), "i") },
        { shortCode: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      Rank.find(filter).sort({ rankName: 1 }).skip(skip).limit(limit).lean(),
      Rank.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedDesignations(query: PaginationQuery & { authorityLevel?: string }) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.authorityLevel && query.authorityLevel !== "ALL") filter.authorityLevel = query.authorityLevel;
    if (query.search) {
      filter.$or = [
        { title: new RegExp(query.search.trim(), "i") },
        { defaultRole: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      Designation.find(filter).sort({ title: 1 }).skip(skip).limit(limit).lean(),
      Designation.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedRespondentGroups(query: PaginationQuery) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { groupName: new RegExp(query.search.trim(), "i") },
        { defaultRankTitle: new RegExp(query.search.trim(), "i") },
        { defaultAddress: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      RespondentGroup.find(filter).sort({ groupName: 1 }).skip(skip).limit(limit).lean(),
      RespondentGroup.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedActionMappings(query: PaginationQuery) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { courtDecision: new RegExp(query.search.trim(), "i") },
        { actionStatus: new RegExp(query.search.trim(), "i") },
        { actionNotTaken: new RegExp(query.search.trim(), "i") },
      ];
    }
    const [data, totalCount] = await Promise.all([
      ActionMapping.find(filter).skip(skip).limit(limit).lean(),
      ActionMapping.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getPaginatedStandingCounsels(query: PaginationQuery) {
    const { page, limit, skip } = this.getPaginationParams(query);
    const filter: any = {};
    if (query.search) {
      filter.name = new RegExp(query.search.trim(), "i");
    }
    const [data, totalCount] = await Promise.all([
      StandingCounsel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      StandingCounsel.countDocuments(filter),
    ]);
    return { data, totalCount, page, limit, pages: Math.ceil(totalCount / limit) };
  }

  static async getAllAliasesAndCounsels() {
    const [aliases, counsels] = await Promise.all([Alias.find().lean(), StandingCounsel.find().lean()]);
    return { aliases, counsels };
  }
}