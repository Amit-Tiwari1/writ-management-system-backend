import { Request, Response } from "express";
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
import { Case } from "../models/Case";
import { MasterService } from "../services/masterService";

// Helper for clean query param extraction
const parseQueryParam = (val: any): string | undefined => {
  if (Array.isArray(val)) return String(val[0]);
  if (val !== undefined && val !== null) return String(val);
  return undefined;
};

export const getIntakeDropdownOptions = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getCaseIntakeDropdowns();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 1. States & Districts with Search & Pagination
export const getStates = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedStates({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      search: parseQueryParam(req.query.search),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createState = async (req: Request, res: Response) => {
  try {
    const state = await State.create(req.body);
    return res.status(201).json({ success: true, message: "State added.", data: state });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateState = async (req: Request, res: Response) => {
  try {
    const updated = await State.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ success: true, message: "State updated.", data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteState = async (req: Request, res: Response) => {
  try {
    const stateId = req.params.id;
    const hasDistricts = await District.exists({ stateId });
    if (hasDistricts) {
      return res.status(400).json({ success: false, message: "Cannot delete State: linked to existing Districts." });
    }
    await State.findByIdAndDelete(stateId);
    return res.status(200).json({ success: true, message: "State deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getZones = async (req: Request, res: Response) => {
  try {
    const query: any = {};
    if (req.query.stateId) query.stateId = parseQueryParam(req.query.stateId);
    const zones = await Zone.find(query).populate("stateId", "stateName").sort({ zoneName: 1 }).lean();
    return res.status(200).json({ success: true, count: zones.length, data: zones });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createZone = async (req: Request, res: Response) => {
  try {
    const zone = await Zone.create(req.body);
    return res.status(201).json({ success: true, message: "Zone added.", data: zone });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRanges = async (req: Request, res: Response) => {
  try {
    const query: any = {};
    if (req.query.zoneId) query.zoneId = parseQueryParam(req.query.zoneId);
    if (req.query.stateId) query.stateId = parseQueryParam(req.query.stateId);

    const ranges = await Range.find(query)
      .populate("zoneId", "zoneName")
      .populate("stateId", "stateName")
      .sort({ rangeName: 1 })
      .lean();
    return res.status(200).json({ success: true, count: ranges.length, data: ranges });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createRange = async (req: Request, res: Response) => {
  try {
    const range = await Range.create(req.body);
    return res.status(201).json({ success: true, message: "Range added.", data: range });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDistricts = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedDistricts({
      stateId: parseQueryParam(req.query.stateId),
      zoneId: parseQueryParam(req.query.zoneId),
      rangeId: parseQueryParam(req.query.rangeId),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDistrict = async (req: Request, res: Response) => {
  try {
    const district = await District.create(req.body);
    return res.status(201).json({ success: true, message: "District added.", data: district });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDistrict = async (req: Request, res: Response) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) return res.status(404).json({ success: false, message: "District not found." });

    const usedInCase = await Case.exists({ districtId: district._id });
    if (usedInCase) {
      return res.status(400).json({ success: false, message: "Cannot delete District: linked to registered cases." });
    }
    await District.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "District deleted." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Courts & Case Types with Search & Pagination
export const getCourts = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedCourts({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      search: parseQueryParam(req.query.search),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCourt = async (req: Request, res: Response) => {
  try {
    const court = await Court.create(req.body);
    return res.status(201).json({ success: true, message: "Court registered.", data: court });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCourt = async (req: Request, res: Response) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ success: false, message: "Court not found." });

    const hasCases = await Case.exists({ courtId: court._id });
    if (hasCases) {
      return res.status(400).json({ success: false, message: "Integrity lock: Court has active dockets registered." });
    }
    await CaseType.deleteMany({ courtId: court._id });
    await Court.findByIdAndDelete(court._id);
    return res.status(200).json({ success: true, message: "Court deleted." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseTypes = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedCaseTypes({
      courtId: parseQueryParam(req.query.courtId),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseTypesByCourt = async (req: Request, res: Response) => {
  try {
    const courtId = parseQueryParam(req.params.courtId);
    if (!courtId) {
      return res.status(400).json({ success: false, message: "courtId parameter is required." });
    }
    const caseTypes = await MasterService.getCaseTypesByCourt(courtId);
    return res.status(200).json({ success: true, count: caseTypes.length, data: caseTypes });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCaseType = async (req: Request, res: Response) => {
  try {
    const caseType = await CaseType.create(req.body);
    return res.status(201).json({ success: true, message: "Case type created.", data: caseType });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCaseType = async (req: Request, res: Response) => {
  try {
    const ct = await CaseType.findById(req.params.id);
    if (!ct) return res.status(404).json({ success: false, message: "Case type not found." });

    const hasCases = await Case.exists({ caseTypeId: ct._id });
    if (hasCases) {
      return res.status(400).json({ success: false, message: "Integrity lock: Case Type in use by existing cases." });
    }
    await CaseType.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Case type deleted." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Categories, Sub-Categories & Subjects with Search & Pagination
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedCategories({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      search: parseQueryParam(req.query.search),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const category = await CaseCategory.create(req.body);
    return res.status(201).json({ success: true, message: "Category created.", data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubCategories = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedSubCategories({
      categoryId: parseQueryParam(req.query.categoryId),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubCategoriesByCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = parseQueryParam(req.params.categoryId);
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "categoryId parameter is required." });
    }
    const subCategories = await MasterService.getSubCategoriesByCategory(categoryId);
    return res.status(200).json({ success: true, count: subCategories.length, data: subCategories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubCategory = async (req: Request, res: Response) => {
  try {
    const subCategory = await CaseSubCategory.create(req.body);
    return res.status(201).json({ success: true, message: "SubCategory created.", data: subCategory });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedSubjects({
      categoryId: parseQueryParam(req.query.categoryId),
      subCategoryId: parseQueryParam(req.query.subCategoryId),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubjectsBySubCategory = async (req: Request, res: Response) => {
  try {
    const subCategoryId = parseQueryParam(req.params.subCategoryId);
    if (!subCategoryId) {
      return res.status(400).json({ success: false, message: "subCategoryId parameter is required." });
    }
    const subjects = await MasterService.getSubjectsBySubCategory(subCategoryId);
    return res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const subject = await CaseSubject.create(req.body);
    return res.status(201).json({ success: true, message: "Subject created.", data: subject });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Custodians with Search & Pagination
export const getSubjectCustodians = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedSubjectCustodians({
      categoryId: parseQueryParam(req.query.categoryId),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubjectCustodian = async (req: Request, res: Response) => {
  try {
    const custodian = await SubjectCustodian.create(req.body);
    return res.status(201).json({ success: true, message: "Custodian assigned.", data: custodian });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Departments, Ranks & Designations with Search & Pagination
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedDepartments({
      parentFormation: parseQueryParam(req.query.parentFormation),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const department = await Department.create(req.body);
    return res.status(201).json({ success: true, message: "Department added.", data: department });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRanks = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedRanks({
      cadreType: parseQueryParam(req.query.cadreType),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createRank = async (req: Request, res: Response) => {
  try {
    const rank = await Rank.create(req.body);
    return res.status(201).json({ success: true, message: "Rank added.", data: rank });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDesignations = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedDesignations({
      authorityLevel: parseQueryParam(req.query.authorityLevel),
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDesignation = async (req: Request, res: Response) => {
  try {
    const designation = await Designation.create(req.body);
    return res.status(201).json({ success: true, message: "Designation added.", data: designation });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Respondent Groups, Actions & Counsels
export const getRespondentGroups = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedRespondentGroups({
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createRespondentGroup = async (req: Request, res: Response) => {
  try {
    const created = await RespondentGroup.create(req.body);
    return res.status(201).json({ success: true, message: "Respondent group added.", data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getActionMappings = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedActionMappings({
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createActionMapping = async (req: Request, res: Response) => {
  try {
    const created = await ActionMapping.create(req.body);
    return res.status(201).json({ success: true, message: "Action mapping created.", data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStandingCounsels = async (req: Request, res: Response) => {
  try {
    const result = await MasterService.getPaginatedStandingCounsels({
      search: parseQueryParam(req.query.search),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createStandingCounsel = async (req: Request, res: Response) => {
  try {
    const created = await StandingCounsel.create(req.body);
    return res.status(201).json({ success: true, message: "Standing counsel added.", data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAliases = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getAllAliasesAndCounsels();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAlias = async (req: Request, res: Response) => {
  try {
    const created = await Alias.create(req.body);
    return res.status(201).json({ success: true, message: "Alias added.", data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};