import { Router } from "express";
import {
  getIntakeDropdownOptions,
  getDistricts,
  createDistrict,
  getDepartments,
  createDepartment,
  getRanks,
  createRank,
  getDesignations,
  createDesignation,
  getCourtsAndTypes,
  createCourt,
  createCaseType,
  getTaxonomies,
  createTaxonomy,
  getCustodians,
  getRespondentGroups,
  getActionMappings,
  getAliases,
} from "../controllers/mastersController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/dropdowns", authenticateToken, getIntakeDropdownOptions);

router.get("/districts", authenticateToken, getDistricts);
router.post("/districts", authenticateToken, createDistrict);

router.get("/departments", authenticateToken, getDepartments);
router.post("/departments", authenticateToken, createDepartment);

router.get("/ranks", authenticateToken, getRanks);
router.post("/ranks", authenticateToken, createRank);

router.get("/designations", authenticateToken, getDesignations);
router.post("/designations", authenticateToken, createDesignation);

router.get("/courts", authenticateToken, getCourtsAndTypes);
router.post("/courts", authenticateToken, createCourt);
router.post("/case-types", authenticateToken, createCaseType);

router.get("/taxonomy", authenticateToken, getTaxonomies);
router.post("/taxonomy", authenticateToken, createTaxonomy);

router.get("/custodians", authenticateToken, getCustodians);

router.get("/respondent-groups", authenticateToken, getRespondentGroups);

router.get("/action-mappings", authenticateToken, getActionMappings);

router.get("/aliases", authenticateToken, getAliases);

export default router;