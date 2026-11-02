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
  getCaseTypesByCourt,
  createCaseType,
  deleteCaseType,
  getCategories,
  createCategory,
  getSubCategories,
  getSubCategoriesByCategory,
  createSubCategory,
  getSubjects,
  getSubjectsBySubCategory,
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
  getStandingCounsels,
  createStandingCounsel,
  getAliases,
  createAlias,
} from "../controllers/mastersController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// 1. One-shot intake wizard dropdown data
router.get("/dropdowns", authenticateToken, getIntakeDropdownOptions);

// 2. Administrative Jurisdictions
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

// 3. Courts & Case Types (With Cascading Endpoint)
router.get("/courts", authenticateToken, getCourts);
router.post("/courts", authenticateToken, createCourt);
router.delete("/courts/:id", authenticateToken, deleteCourt);

router.get("/case-types", authenticateToken, getCaseTypes);
router.get("/case-types/by-court/:courtId", authenticateToken, getCaseTypesByCourt);
router.post("/case-types", authenticateToken, createCaseType);
router.delete("/case-types/:id", authenticateToken, deleteCaseType);

// 4. Taxonomy: Categories -> SubCategories -> Subjects (With Cascading Endpoints)
router.get("/categories", authenticateToken, getCategories);
router.post("/categories", authenticateToken, createCategory);

router.get("/sub-categories", authenticateToken, getSubCategories);
router.get("/sub-categories/by-category/:categoryId", authenticateToken, getSubCategoriesByCategory);
router.post("/sub-categories", authenticateToken, createSubCategory);

router.get("/subjects", authenticateToken, getSubjects);
router.get("/subjects/by-subcategory/:subCategoryId", authenticateToken, getSubjectsBySubCategory);
router.post("/subjects", authenticateToken, createSubject);

router.get("/custodians", authenticateToken, getSubjectCustodians);
router.post("/custodians", authenticateToken, createSubjectCustodian);

// 5. Institutional Master Tables
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

router.get("/standing-counsels", authenticateToken, getStandingCounsels);
router.post("/standing-counsels", authenticateToken, createStandingCounsel);

router.get("/aliases", authenticateToken, getAliases);
router.post("/aliases", authenticateToken, createAlias);

export default router;