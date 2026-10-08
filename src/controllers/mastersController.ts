import { Request, Response } from "express";
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
import { MasterService } from "../services/masterService";

/**
 * Single aggregated endpoint for Frontend Form Dropdowns (Intake / Petitions)
 */
export const getIntakeDropdownOptions = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getCaseIntakeDropdowns();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6.1 District & Zones
 */
export const getDistricts = async (req: Request, res: Response) => {
  try {
    const districts = await MasterService.getAllDistricts();
    return res.status(200).json({ success: true, count: districts.length, data: districts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDistrict = async (req: Request, res: Response) => {
  try {
    const { districtName, zone, range, state } = req.body;
    const district = await District.create({ districtName, zone, range, state });
    return res.status(201).json({ success: true, message: "District added.", data: district });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6.2 Department / Units
 */
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

/**
 * 6.3 Rank Master
 */
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

/**
 * 6.4 Designation Master
 */
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

/**
 * 6.5 Court & Case Types
 */
export const getCourtsAndTypes = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getAllCourtsAndTypes();
    return res.status(200).json({ success: true, data });
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

export const createCaseType = async (req: Request, res: Response) => {
  try {
    const caseType = await CaseType.create(req.body);
    return res.status(201).json({ success: true, message: "Case type added.", data: caseType });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6.6 Taxonomy Master
 */
export const getTaxonomies = async (req: Request, res: Response) => {
  try {
    const taxonomies = await MasterService.getAllTaxonomy();
    return res.status(200).json({ success: true, count: taxonomies.length, data: taxonomies });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTaxonomy = async (req: Request, res: Response) => {
  try {
    const item = await Taxonomy.create(req.body);
    return res.status(201).json({ success: true, message: "Taxonomy added.", data: item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6.7 Custodian Maps
 */
export const getCustodians = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getAllCustodianMaps();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6.8 Respondent Groups
 */
export const getRespondentGroups = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getAllRespondentGroups();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6.9 Action Taken Mappings
 */
export const getActionMappings = async (req: Request, res: Response) => {
  try {
    const data = await MasterService.getAllActionMappings();
    return res.status(200).json({ success: true, count: data.length, data });
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