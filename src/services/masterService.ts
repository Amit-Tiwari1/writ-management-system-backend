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

export class MasterService {

  static async getCaseIntakeDropdowns() {
    const [states, districts, courts, caseTypes, categories, ranks, designations, departments] =
      await Promise.all([
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
        Rank.find().select("rankName shortCode").lean(),
        Designation.find().select("title authorityLevel").lean(),
        Department.find().select("unitName unitCode").lean(),
      ]);

    return {
      states,
      districts,
      courts,
      caseTypes,
      categories,
      ranks,
      designations,
      departments,
    };
  }

  static async getCaseTypesByCourt(courtId: string) {
    return CaseType.find({ courtId }).sort({ caseTypeName: 1 }).lean();
  }

  static async getSubCategoriesByCategory(categoryId: string) {
    return CaseSubCategory.find({ categoryId }).sort({ subCategoryName: 1 }).lean();
  }

  static async getSubjectsBySubCategory(subCategoryId: string) {
    return CaseSubject.find({ subCategoryId }).sort({ subjectTitle: 1 }).lean();
  }

  static async getSubjectCustodians() {
    return SubjectCustodian.find()
      .populate("subjectId", "subjectTitle")
      .populate("categoryId", "categoryName")
      .lean();
  }

  static async getAllStates() {
    return State.find().sort({ stateName: 1 }).lean();
  }

  static async getDistrictsByRangeOrState(filter: { stateId?: string; zoneId?: string; rangeId?: string }) {
    const query: any = {};
    if (filter.stateId) query.stateId = filter.stateId;
    if (filter.zoneId) query.zoneId = filter.zoneId;
    if (filter.rangeId) query.rangeId = filter.rangeId;

    return District.find(query)
      .populate("stateId", "stateName stateCode")
      .populate("zoneId", "zoneName")
      .populate("rangeId", "rangeName")
      .sort({ districtName: 1 })
      .lean();
  }

  static async getAllDepartments() {
    return Department.find().sort({ unitName: 1 }).lean();
  }

  static async getAllRanks() {
    return Rank.find().sort({ rankName: 1 }).lean();
  }

  static async getAllDesignations() {
    return Designation.find().sort({ title: 1 }).lean();
  }

  static async getAllRespondentGroups() {
    return RespondentGroup.find().sort({ groupName: 1 }).lean();
  }

  static async getAllActionMappings() {
    return ActionMapping.find().lean();
  }

  static async getAllAliasesAndCounsels() {
    const [aliases, counsels] = await Promise.all([Alias.find().lean(), StandingCounsel.find().lean()]);
    return { aliases, counsels };
  }
}