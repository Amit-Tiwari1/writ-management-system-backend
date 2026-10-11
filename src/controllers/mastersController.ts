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
} from "../models/Masters";
import { Case } from "../models/Case";
import { MasterService } from "../services/masterService";

export const getIntakeDropdownOptions = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getCaseIntakeDropdowns();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 1. GEOGRAPHY (State -> Zone -> Range -> District)
// ==========================================

export const getStates = async (req: Request, res: Response) => {
  try {
    const states = await MasterService.getAllStates();
    return res.status(200).json({ success: true, count: states.length, data: states });
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
    if (req.query.stateId) query.stateId = String(req.query.stateId);
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
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.stateId) query.stateId = String(req.query.stateId);

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
    const districts = await MasterService.getDistrictsByRangeOrState({
      stateId: req.query.stateId ? String(req.query.stateId) : undefined,
      zoneId: req.query.zoneId ? String(req.query.zoneId) : undefined,
      rangeId: req.query.rangeId ? String(req.query.rangeId) : undefined,
    });
    return res.status(200).json({ success: true, count: districts.length, data: districts });
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

    const usedInCase = await Case.exists({ disputeSubject: new RegExp(district.districtName, "i") });
    if (usedInCase) {
      return res.status(400).json({ success: false, message: "Cannot delete District: linked to ongoing litigation cases." });
    }
    await District.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "District deleted." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. JUDICIAL (Court -> CaseType)
// ==========================================

export const getCourts = async (req: Request, res: Response) => {
  try {
    const courts = await Court.find().sort({ courtName: 1 }).lean();
    return res.status(200).json({ success: true, count: courts.length, data: courts });
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

    const hasCases = await Case.exists({ courtCode: court.shortCode });
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
    const query: any = {};
    if (req.query.courtId) query.courtId = String(req.query.courtId);
    const caseTypes = await CaseType.find(query).populate("courtId", "courtName shortCode").sort({ caseTypeName: 1 }).lean();
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

    const hasCases = await Case.exists({ caseType: ct.shortName || ct.caseTypeName });
    if (hasCases) {
      return res.status(400).json({ success: false, message: "Integrity lock: Case Type in use by existing cases." });
    }
    await CaseType.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Case type deleted." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. TAXONOMY (Category -> SubCategory -> Subject -> Custodian)
// ==========================================

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await CaseCategory.find().sort({ order: 1 }).lean();
    return res.status(200).json({ success: true, count: categories.length, data: categories });
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
    const query: any = {};
    if (req.query.categoryId) query.categoryId = String(req.query.categoryId);
    const subCategories = await CaseSubCategory.find(query)
      .populate("categoryId", "categoryName")
      .sort({ subCategoryName: 1 })
      .lean();
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
    const query: any = {};
    if (req.query.subCategoryId) query.subCategoryId = String(req.query.subCategoryId);
    if (req.query.categoryId) query.categoryId = String(req.query.categoryId);

    const subjects = await CaseSubject.find(query)
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName")
      .sort({ subjectTitle: 1 })
      .lean();
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

export const getSubjectCustodians = async (req: Request, res: Response) => {
  try {
    const custodians = await MasterService.getSubjectCustodians();
    return res.status(200).json({ success: true, count: custodians.length, data: custodians });
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

// ==========================================
// 4. DEPARTMENTS, RANKS & DESIGNATIONS
// ==========================================

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await MasterService.getAllDepartments();
    return res.status(200).json({ success: true, count: departments.length, data: departments });
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
    const ranks = await MasterService.getAllRanks();
    return res.status(200).json({ success: true, count: ranks.length, data: ranks });
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
    const designations = await MasterService.getAllDesignations();
    return res.status(200).json({ success: true, count: designations.length, data: designations });
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

export const getRespondentGroups = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getAllRespondentGroups();
    return res.status(200).json({ success: true, count: data.length, data });
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
    const data = await MasterService.getAllActionMappings();
    return res.status(200).json({ success: true, count: data.length, data });
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