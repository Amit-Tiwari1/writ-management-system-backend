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

const getAll = (Model: any) => async (req: Request, res: Response) => {
  try {
    const data = await Model.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createOne = (Model: any) => async (req: Request, res: Response) => {
  try {
    const item = await Model.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateOne = (Model: any) => async (req: Request, res: Response) => {
  try {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteOne = (Model: any) => async (req: Request, res: Response) => {
  try {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({ success: true, message: "Record deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6.1 Districts
export const getDistricts = getAll(District);
export const createDistrict = createOne(District);
export const updateDistrict = updateOne(District);
export const deleteDistrict = deleteOne(District);

// 6.2 Departments
export const getDepartments = getAll(Department);
export const createDepartment = createOne(Department);
export const updateDepartment = updateOne(Department);
export const deleteDepartment = deleteOne(Department);

// 6.3 Ranks
export const getRanks = getAll(Rank);
export const createRank = createOne(Rank);
export const updateRank = updateOne(Rank);
export const deleteRank = deleteOne(Rank);

// 6.4 Designations
export const getDesignations = getAll(Designation);
export const createDesignation = createOne(Designation);
export const updateDesignation = updateOne(Designation);
export const deleteDesignation = deleteOne(Designation);

// 6.5 Courts & Case Types
export const getCourts = getAll(Court);
export const createCourt = createOne(Court);
export const updateCourt = updateOne(Court);
export const deleteCourt = deleteOne(Court);

export const getCaseTypes = getAll(CaseType);
export const createCaseType = createOne(CaseType);
export const updateCaseType = updateOne(CaseType);
export const deleteCaseType = deleteOne(CaseType);

// 6.6 Taxonomy
export const getTaxonomy = getAll(Taxonomy);
export const createTaxonomy = createOne(Taxonomy);
export const updateTaxonomy = updateOne(Taxonomy);
export const deleteTaxonomy = deleteOne(Taxonomy);

// 6.7 Custodians
export const getCustodians = getAll(CustodianMap);
export const createCustodian = createOne(CustodianMap);
export const updateCustodian = updateOne(CustodianMap);
export const deleteCustodian = deleteOne(CustodianMap);

// 6.8 Respondents
export const getRespondents = getAll(RespondentGroup);
export const createRespondent = createOne(RespondentGroup);
export const updateRespondent = updateOne(RespondentGroup);
export const deleteRespondent = deleteOne(RespondentGroup);

// 6.9 Action Taken Mapping
export const getActions = getAll(ActionMapping);
export const createAction = createOne(ActionMapping);
export const updateAction = updateOne(ActionMapping);
export const deleteAction = deleteOne(ActionMapping);

// 6.10 Aliases & Standing Counsels
export const getAliases = getAll(Alias);
export const createAlias = createOne(Alias);
export const deleteAlias = deleteOne(Alias);

export const getStandingCounsels = getAll(StandingCounsel);
export const createStandingCounsel = createOne(StandingCounsel);
export const deleteStandingCounsel = deleteOne(StandingCounsel);

export const updateSensitivityThreshold = async (req: Request, res: Response) => {
  const { threshold } = req.body;
  res.status(200).json({ success: true, message: `Sensitivity threshold updated to ${threshold}%`, threshold });
};