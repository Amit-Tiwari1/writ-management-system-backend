
import { Router } from "express";

import {
  // States
  getStates,
  createState,
  updateState,
  deleteState,

  // Zones
  getZones,
  createZone,
  updateZone,
  deleteZone,

  // Ranges
  getRanges,
  createRange,
  updateRange,
  deleteRange,

  // Districts
  getDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,

  // Courts
  getCourts,
  createCourt,
  updateCourt,
  deleteCourt,

  // Case Types
  getCaseTypes,
  createCaseType,
  updateCaseType,
  deleteCaseType,

  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  // Sub Categories
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,

  // Subjects
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,

  // Subject Custodians
  getSubjectCustodians,
  createSubjectCustodian,
  updateSubjectCustodian,
  deleteSubjectCustodian,

  // Departments
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Ranks
  getRanks,
  createRank,
  updateRank,
  deleteRank,

  // Designations
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,

  // Respondent Groups
  getRespondentGroups,
  createRespondentGroup,
  updateRespondentGroup,
  deleteRespondentGroup,

  // Action Mappings
  getActionMappings,
  createActionMapping,
  updateActionMapping,
  deleteActionMapping,

  // Standing Counsels
  getStandingCounsels,
  createStandingCounsel,
  updateStandingCounsel,
  deleteStandingCounsel,

  // Aliases
  getAliases,
  createAlias,
  updateAlias,
  deleteAlias,
} from "../controllers/mastersController";

import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Authentication
router.use(authenticateToken);

// States
router.get("/states", getStates);
router.post("/states", createState);
router.put("/states/:id", updateState);
router.delete("/states/:id", deleteState);

// Zones
router.get("/zones", getZones);
router.post("/zones", createZone);
router.put("/zones/:id", updateZone);
router.delete("/zones/:id", deleteZone);

// Ranges
router.get("/ranges", getRanges);
router.post("/ranges", createRange);
router.put("/ranges/:id", updateRange);
router.delete("/ranges/:id", deleteRange);

// Districts
router.get("/districts", getDistricts);
router.post("/districts", createDistrict);
router.put("/districts/:id", updateDistrict);
router.delete("/districts/:id", deleteDistrict);

// Courts
router.get("/courts", getCourts);
router.post("/courts", createCourt);
router.put("/courts/:id", updateCourt);
router.delete("/courts/:id", deleteCourt);

// Case Types
router.get("/case-types", getCaseTypes);
router.post("/case-types", createCaseType);
router.put("/case-types/:id", updateCaseType);
router.delete("/case-types/:id", deleteCaseType);

// Categories
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Sub Categories
router.get("/sub-categories", getSubCategories);
router.post("/sub-categories", createSubCategory);
router.put("/sub-categories/:id", updateSubCategory);
router.delete("/sub-categories/:id", deleteSubCategory);

// Subjects
router.get("/subjects", getSubjects);
router.post("/subjects", createSubject);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);

// Subject Custodians
router.get("/subject-custodians", getSubjectCustodians);
router.post("/subject-custodians", createSubjectCustodian);
router.put("/subject-custodians/:id", updateSubjectCustodian);
router.delete("/subject-custodians/:id", deleteSubjectCustodian);

// Departments
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// Ranks
router.get("/ranks", getRanks);
router.post("/ranks", createRank);
router.put("/ranks/:id", updateRank);
router.delete("/ranks/:id", deleteRank);

// Designations
router.get("/designations", getDesignations);
router.post("/designations", createDesignation);
router.put("/designations/:id", updateDesignation);
router.delete("/designations/:id", deleteDesignation);

// Respondent Groups
router.get("/respondent-groups", getRespondentGroups);
router.post("/respondent-groups", createRespondentGroup);
router.put("/respondent-groups/:id", updateRespondentGroup);
router.delete("/respondent-groups/:id", deleteRespondentGroup);

// Action Mappings
router.get("/action-mappings", getActionMappings);
router.post("/action-mappings", createActionMapping);
router.put("/action-mappings/:id", updateActionMapping);
router.delete("/action-mappings/:id", deleteActionMapping);

// Standing Counsels
router.get("/standing-counsels", getStandingCounsels);
router.post("/standing-counsels", createStandingCounsel);
router.put("/standing-counsels/:id", updateStandingCounsel);
router.delete("/standing-counsels/:id", deleteStandingCounsel);

// Aliases
router.get("/aliases", getAliases);
router.post("/aliases", createAlias);
router.put("/aliases/:id", updateAlias);
router.delete("/aliases/:id", deleteAlias);

export default router;
