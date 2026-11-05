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
import { MasterService, MasterResource } from "../services/masterService";
import mongoose from "mongoose";
import { ComplianceRecord } from "../models/ComplianceRisk";
import { User } from "../models/User";
import { CaseMovementHistory } from "../models/CaseMovementHistory";
import { Petitioner } from "../models/Petitioner";
import { MasterQuery, MasterView } from "../types/masterType";

type MasterDeleteCheck = {
  model: any;
  filter: Record<string, any>;
  label: string;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const deleteMasterRecord = async (
  Model: any,
  id: string,
  res: Response,
  masterName: string,
  getChecks: (record: any) => MasterDeleteCheck[],
) => {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    const record = await Model.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `${masterName} not found.`,
      });
    }

    const checks = getChecks(record);

    const results = await Promise.all(
      checks.map(async (check) => {
        const exists = await check.model.exists(check.filter);

        return exists ? check.label : null;
      }),
    );

    const usedBy = results.filter((label): label is string => label !== null);

    if (usedBy.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete ${masterName}. This record is being used by existing data.`,
        usedBy,
      });
    }

    const deletedRecord = await Model.findByIdAndDelete(record._id);

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: `${masterName} was not found or has already been deleted.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${masterName} deleted successfully.`,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const parseQueryParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : undefined;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
};

const getMasterQuery = (req: Request): MasterQuery => ({
  page: Number(parseQueryParam(req.query.page)) || undefined,
  limit: Number(parseQueryParam(req.query.limit)) || undefined,
  search: parseQueryParam(req.query.search),
  stateId: parseQueryParam(req.query.stateId),
  zoneId: parseQueryParam(req.query.zoneId),
  rangeId: parseQueryParam(req.query.rangeId),
  courtId: parseQueryParam(req.query.courtId),
  categoryId: parseQueryParam(req.query.categoryId),
  subCategoryId: parseQueryParam(req.query.subCategoryId),
  subjectId: parseQueryParam(req.query.subjectId),
  userId: parseQueryParam(req.query.userId),
  designationId: parseQueryParam(req.query.designationId),
  defaultOfficerId: parseQueryParam(req.query.defaultOfficerId),
  defaultRankId: parseQueryParam(req.query.defaultRankId),
  parentFormation: parseQueryParam(req.query.parentFormation),
  cadreType: parseQueryParam(req.query.cadreType),
  authorityLevel: parseQueryParam(req.query.authorityLevel),
  language: parseQueryParam(req.query.language),
  category: parseQueryParam(req.query.category),
});

const getMasterController = (
  master: MasterResource,
  defaultView: MasterView = "list",
) => {
  return async (req: Request, res: Response) => {
    try {
      const requestedView = parseQueryParam(req.query.view) || defaultView;
      if (requestedView !== "list" && requestedView !== "options") {
        return res.status(400).json({
          success: false,
          message: "Invalid view. Allowed values are list and options.",
        });
      }

      const result = await MasterService.getMasterData(
        master,
        requestedView,
        getMasterQuery(req),
      );
      console.log("result", result);

      return res.status(200).json(result);
    } catch (error: any) {
      const message = error.message || "Internal server error.";

      if (
        message.startsWith("Invalid ") ||
        message === "Invalid master view" ||
        message === "Invalid master resource"
      ) {
        return res.status(400).json({
          success: false,
          message,
        });
      }

      return res.status(500).json({
        success: false,
        message,
      });
    }
  };
};

export const getStates = getMasterController("states");
export const getZones = getMasterController("zones");
export const getRanges = getMasterController("ranges");
export const getDistricts = getMasterController("districts");
export const getCourts = getMasterController("courts");
export const getCaseTypes = getMasterController("caseTypes");
export const getCategories = getMasterController("categories");
export const getSubCategories = getMasterController("subCategories");
export const getSubjects = getMasterController("subjects");
export const getSubjectCustodians = getMasterController("subjectCustodians");
export const getDepartments = getMasterController("departments");
export const getRanks = getMasterController("ranks");
export const getDesignations = getMasterController("designations");
export const getRespondentGroups = getMasterController("respondentGroups");
export const getActionMappings = getMasterController("actionMappings");
export const getStandingCounsels = getMasterController("standingCounsels");
export const getAliases = getMasterController("aliases");

export const createState = async (req: Request, res: Response) => {
  try {
    const state = await State.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "State added.", data: state });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createZone = async (req: Request, res: Response) => {
  try {
    const zone = await Zone.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Zone added.", data: zone });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createRange = async (req: Request, res: Response) => {
  try {
    const range = await Range.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Range added.", data: range });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createDistrict = async (req: Request, res: Response) => {
  try {
    const district = await District.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "District added.", data: district });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createCourt = async (req: Request, res: Response) => {
  try {
    const court = await Court.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Court registered.", data: court });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createCaseType = async (req: Request, res: Response) => {
  try {
    const caseType = await CaseType.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Case type created.", data: caseType });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createCategory = async (req: Request, res: Response) => {
  try {
    const category = await CaseCategory.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Category created.", data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createSubCategory = async (req: Request, res: Response) => {
  try {
    const subCategory = await CaseSubCategory.create(req.body);
    return res.status(201).json({
      success: true,
      message: "SubCategory created.",
      data: subCategory,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createSubject = async (req: Request, res: Response) => {
  try {
    const subject = await CaseSubject.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Subject created.", data: subject });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createSubjectCustodian = async (req: Request, res: Response) => {
  try {
    const custodian = await SubjectCustodian.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Custodian assigned.", data: custodian });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const department = await Department.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Department added.", data: department });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createRank = async (req: Request, res: Response) => {
  try {
    const rank = await Rank.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Rank added.", data: rank });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createDesignation = async (req: Request, res: Response) => {
  try {
    const designation = await Designation.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Designation added.",
      data: designation,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createRespondentGroup = async (req: Request, res: Response) => {
  try {
    const created = await RespondentGroup.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Respondent group added.",
      data: created,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createActionMapping = async (req: Request, res: Response) => {
  try {
    const created = await ActionMapping.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Action mapping created.",
      data: created,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createStandingCounsel = async (req: Request, res: Response) => {
  try {
    const created = await StandingCounsel.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Standing counsel added.",
      data: created,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const createAlias = async (req: Request, res: Response) => {
  try {
    const created = await Alias.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Alias added.", data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const updateState = async (req: Request, res: Response) => {
  try {
    const updatedState = await State.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedState) {
      return res.status(404).json({
        success: false,
        message: "State not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "State updated successfully.",
      data: updatedState,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateZone = async (req: Request, res: Response) => {
  try {
    const updatedZone = await Zone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedZone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Zone updated successfully.",
      data: updatedZone,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateRange = async (req: Request, res: Response) => {
  try {
    const updatedRange = await Range.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedRange) {
      return res.status(404).json({
        success: false,
        message: "Range not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Range updated successfully.",
      data: updatedRange,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateDistrict = async (req: Request, res: Response) => {
  try {
    const updatedDistrict = await District.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedDistrict) {
      return res.status(404).json({
        success: false,
        message: "District not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "District updated successfully.",
      data: updatedDistrict,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateCourt = async (req: Request, res: Response) => {
  try {
    const updatedCourt = await Court.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedCourt) {
      return res.status(404).json({
        success: false,
        message: "Court not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Court updated successfully.",
      data: updatedCourt,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateCaseType = async (req: Request, res: Response) => {
  try {
    const updatedCaseType = await CaseType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedCaseType) {
      return res.status(404).json({
        success: false,
        message: "Case type not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Case type updated successfully.",
      data: updatedCaseType,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const updatedCategory = await CaseCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedCategory,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateSubCategory = async (req: Request, res: Response) => {
  try {
    const updatedSubCategory = await CaseSubCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedSubCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SubCategory updated successfully.",
      data: updatedSubCategory,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const updatedSubject = await CaseSubject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully.",
      data: updatedSubject,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateSubjectCustodian = async (req: Request, res: Response) => {
  try {
    const updatedCustodian = await SubjectCustodian.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedCustodian) {
      return res.status(404).json({
        success: false,
        message: "Subject custodian not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject custodian updated successfully.",
      data: updatedCustodian,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateRank = async (req: Request, res: Response) => {
  try {
    const updatedRank = await Rank.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedRank) {
      return res.status(404).json({
        success: false,
        message: "Rank not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rank updated successfully.",
      data: updatedRank,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateDesignation = async (req: Request, res: Response) => {
  try {
    const updatedDesignation = await Designation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedDesignation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully.",
      data: updatedDesignation,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedDepartment) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: updatedDepartment,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateRespondentGroup = async (req: Request, res: Response) => {
  try {
    const updatedGroup = await RespondentGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedGroup) {
      return res.status(404).json({
        success: false,
        message: "Respondent group not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Respondent group updated successfully.",
      data: updatedGroup,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateActionMapping = async (req: Request, res: Response) => {
  try {
    const updatedMapping = await ActionMapping.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedMapping) {
      return res.status(404).json({
        success: false,
        message: "Action mapping not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Action mapping updated successfully.",
      data: updatedMapping,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateAlias = async (req: Request, res: Response) => {
  try {
    const updatedAlias = await Alias.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedAlias) {
      return res.status(404).json({
        success: false,
        message: "Alias not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alias updated successfully.",
      data: updatedAlias,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const updateStandingCounsel = async (req: Request, res: Response) => {
  try {
    const updatedCounsel = await StandingCounsel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedCounsel) {
      return res.status(404).json({
        success: false,
        message: "Standing counsel not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Standing counsel updated successfully.",
      data: updatedCounsel,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid master ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate record already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
export const deleteState = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    State,
    req.params.id as string,
    res,
    "State",
    (record) => [
      {
        model: Zone,
        filter: { stateId: record._id },
        label: "Zones",
      },
      {
        model: Range,
        filter: { stateId: record._id },
        label: "Ranges",
      },
      {
        model: District,
        filter: { stateId: record._id },
        label: "Districts",
      },
      {
        model: Petitioner,
        filter: { stateId: record._id },
        label: "Petitioners",
      },
    ],
  );
};
export const deleteZone = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Zone,
    req.params.id as string,
    res,
    "Zone",
    (record) => [
      {
        model: Range,
        filter: { zoneId: record._id },
        label: "Ranges",
      },
      {
        model: District,
        filter: { zoneId: record._id },
        label: "Districts",
      },
    ],
  );
};
export const deleteRange = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Range,
    req.params.id as string,
    res,
    "Range",
    (record) => [
      {
        model: District,
        filter: { rangeId: record._id },
        label: "Districts",
      },
    ],
  );
};
export const deleteDistrict = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    District,
    req.params.id as string,
    res,
    "District",
    (record) => [
      {
        model: Petitioner,
        filter: { districtId: record._id },
        label: "Petitioners",
      },
    ],
  );
};
export const deleteCourt = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Court,
    req.params.id as string,
    res,
    "Court",
    (record) => [
      {
        model: Case,
        filter: { courtId: record._id },
        label: "Registered Cases",
      },
      {
        model: CaseType,
        filter: { courtId: record._id },
        label: "Case Types",
      },
      {
        model: ComplianceRecord,
        filter: { courtId: record._id },
        label: "Compliance Records",
      },
    ],
  );
};
export const deleteCaseType = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    CaseType,
    req.params.id as string,
    res,
    "Case Type",
    (record) => [
      {
        model: Case,
        filter: { caseTypeId: record._id },
        label: "Registered Cases",
      },
    ],
  );
};
export const deleteCategory = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    CaseCategory,
    req.params.id as string,
    res,
    "Case Category",
    (record) => [
      {
        model: Case,
        filter: { categoryId: record._id },
        label: "Registered Cases",
      },
      {
        model: CaseSubCategory,
        filter: { categoryId: record._id },
        label: "Sub-Categories",
      },
      {
        model: CaseSubject,
        filter: { categoryId: record._id },
        label: "Case Subjects",
      },
      {
        model: SubjectCustodian,
        filter: { categoryId: record._id },
        label: "Subject Custodians",
      },
    ],
  );
};
export const deleteSubCategory = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    CaseSubCategory,
    req.params.id as string,
    res,
    "Case Sub-Category",
    (record) => [
      {
        model: Case,
        filter: { subCategoryId: record._id },
        label: "Registered Cases",
      },
      {
        model: CaseSubject,
        filter: { subCategoryId: record._id },
        label: "Case Subjects",
      },
    ],
  );
};
export const deleteSubject = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    CaseSubject,
    req.params.id as string,
    res,
    "Case Subject",
    (record) => [
      {
        model: Case,
        filter: { subjectId: record._id },
        label: "Registered Cases",
      },
      {
        model: SubjectCustodian,
        filter: { subjectId: record._id },
        label: "Subject Custodians",
      },
    ],
  );
};
export const deleteSubjectCustodian = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    SubjectCustodian,
    req.params.id as string,
    res,
    "Subject Custodian",
    () => [],
  );
};
export const deleteRank = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Rank,
    req.params.id as string,
    res,
    "Rank",
    (record) => [
      {
        model: User,
        filter: { rank: record.rankName },
        label: "Users assigned to this Rank",
      },
      {
        model: RespondentGroup,
        filter: { defaultRankId: record._id.toString() },
        label: "Respondent Groups using this Rank",
      },
    ],
  );
};
export const deleteDesignation = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Designation,
    req.params.id as string,
    res,
    "Designation",
    (record) => [
      {
        model: User,
        filter: { designation: record.title },
        label: "Users assigned to this Designation",
      },
      {
        model: SubjectCustodian,
        filter: { designationId: record._id },
        label: "Subject Custodians",
      },
      {
        model: CaseMovementHistory,
        filter: {
          $or: [
            { fromDesignation: record.title },
            { toDesignation: record.title },
          ],
        },
        label: "Case Movement History",
      },
    ],
  );
};
export const deleteDepartment = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Department,
    req.params.id as string,
    res,
    "Department",
    (record) => [
      {
        model: User,
        filter: { section: record.unitName },
        label: "Users assigned to this Department",
      },
      {
        model: Case,
        filter: { sectionWing: record.unitName },
        label: "Registered Cases",
      },
    ],
  );
};
export const deleteRespondentGroup = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    RespondentGroup,
    req.params.id as string,
    res,
    "Respondent Group",
    (record) => [
      {
        model: Case,
        filter: {
          respondentString: {
            $regex: escapeRegex(record.groupName),
            $options: "i",
          },
        },
        label: "Registered Cases",
      },
    ],
  );
};
export const deleteActionMapping = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    ActionMapping,
    req.params.id as string,
    res,
    "Action Mapping",
    (record) => [
      {
        model: ComplianceRecord,
        filter: { actionMappingId: record._id },
        label: "Compliance Records",
      },
    ],
  );
};
export const deleteAlias = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    Alias,
    req.params.id as string,
    res,
    "Alias",
    () => [],
  );
};
export const deleteStandingCounsel = async (req: Request, res: Response) => {
  return deleteMasterRecord(
    StandingCounsel,
    req.params.id as string,
    res,
    "Standing Counsel",
    (record) => [
      {
        model: Case,
        filter: { stateCounsel: record.name },
        label: "Registered Cases",
      },
    ],
  );
};
