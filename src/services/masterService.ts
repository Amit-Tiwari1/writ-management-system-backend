import {
  District,
  Department,
  Rank,
  Designation,
  Court,
  CaseType,
  Taxonomy,
  CustodianMap,
  RespondentGroup,
  ActionMapping,
  Alias,
  StandingCounsel,
} from "../models/Masters";

export class MasterService {
  static async getCaseIntakeDropdowns() {
    const [districts, courts, caseTypes, ranks, designations, taxonomies] = await Promise.all([
      District.find().select("districtName zone range").sort({ districtName: 1 }).lean(),
      Court.find().select("courtName shortCode location").lean(),
      CaseType.find().select("code title court").sort({ code: 1 }).lean(),
      Rank.find().select("rankName shortCode").lean(),
      Designation.find().select("title authorityLevel").lean(),
      Taxonomy.find().select("category examCycle issue").lean(),
    ]);

    return {
      districts,
      courts,
      caseTypes,
      ranks,
      designations,
      taxonomies,
    };
  }

 
  static async getAllDistricts() {
    return District.find().sort({ districtName: 1 }).lean();
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

  static async getAllCourtsAndTypes() {
    const [courts, caseTypes] = await Promise.all([
      Court.find().lean(),
      CaseType.find().sort({ code: 1 }).lean(),
    ]);
    return { courts, caseTypes };
  }

  static async getAllTaxonomy() {
    return Taxonomy.find().sort({ category: 1 }).lean();
  }

  static async getAllCustodianMaps() {
    return CustodianMap.find().lean();
  }

  static async getAllRespondentGroups() {
    return RespondentGroup.find().sort({ groupName: 1 }).lean();
  }

  static async getAllActionMappings() {
    return ActionMapping.find().lean();
  }

  static async getAllAliasesAndCounsels() {
    const [aliases, counsels] = await Promise.all([
      Alias.find().lean(),
      StandingCounsel.find().lean(),
    ]);
    return { aliases, counsels };
  }
}