import { Router } from "express";
import {
  getIntakeDropdownOptions,
  getStates,
  createState,
  updateState,
  deleteState,
  getZones,
  createZone,
  getRanges,
  createRange,
  getDistricts,
  createDistrict,
  deleteDistrict,
  getCourts,
  createCourt,
  deleteCourt,
  getCaseTypes,
  createCaseType,
  deleteCaseType,
  getCategories,
  createCategory,
  getSubCategories,
  createSubCategory,
  getSubjects,
  createSubject,
  getSubjectCustodians,
  createSubjectCustodian,
  getDepartments,
  createDepartment,
  getRanks,
  createRank,
  getDesignations,
  createDesignation,
  getRespondentGroups,
  createRespondentGroup,
  getActionMappings,
  createActionMapping,
  getAliases,
  createAlias,
} from "../controllers/mastersController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/dropdowns", authenticateToken, getIntakeDropdownOptions);

// Geographic Hierarchy
router.get("/states", authenticateToken, getStates);
router.post("/states", authenticateToken, createState);
router.put("/states/:id", authenticateToken, updateState);
router.delete("/states/:id", authenticateToken, deleteState);

router.get("/zones", authenticateToken, getZones);
router.post("/zones", authenticateToken, createZone);

router.get("/ranges", authenticateToken, getRanges);
router.post("/ranges", authenticateToken, createRange);

router.get("/districts", authenticateToken, getDistricts);
router.post("/districts", authenticateToken, createDistrict);
router.delete("/districts/:id", authenticateToken, deleteDistrict);

// Judicial Hierarchy
router.get("/courts", authenticateToken, getCourts);
router.post("/courts", authenticateToken, createCourt);
router.delete("/courts/:id", authenticateToken, deleteCourt);

router.get("/case-types", authenticateToken, getCaseTypes);
router.post("/case-types", authenticateToken, createCaseType);
router.delete("/case-types/:id", authenticateToken, deleteCaseType);

// Board Taxonomy
router.get("/categories", authenticateToken, getCategories);
router.post("/categories", authenticateToken, createCategory);

router.get("/sub-categories", authenticateToken, getSubCategories);
router.post("/sub-categories", authenticateToken, createSubCategory);

router.get("/subjects", authenticateToken, getSubjects);
router.post("/subjects", authenticateToken, createSubject);

router.get("/custodians", authenticateToken, getSubjectCustodians);
router.post("/custodians", authenticateToken, createSubjectCustodian);

// Institutional Masters
router.get("/departments", authenticateToken, getDepartments);
router.post("/departments", authenticateToken, createDepartment);

router.get("/ranks", authenticateToken, getRanks);
router.post("/ranks", authenticateToken, createRank);

router.get("/designations", authenticateToken, getDesignations);
router.post("/designations", authenticateToken, createDesignation);

router.get("/respondent-groups", authenticateToken, getRespondentGroups);
router.post("/respondent-groups", authenticateToken, createRespondentGroup);

router.get("/action-mappings", authenticateToken, getActionMappings);
router.post("/action-mappings", authenticateToken, createActionMapping);

router.get("/aliases", authenticateToken, getAliases);
router.post("/aliases", authenticateToken, createAlias);

export default router;