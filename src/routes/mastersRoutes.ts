import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getDistricts, createDistrict, updateDistrict, deleteDistrict,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getRanks, createRank, updateRank, deleteRank,
  getDesignations, createDesignation, updateDesignation, deleteDesignation,
  getCourts, createCourt, updateCourt, deleteCourt,
  getCaseTypes, createCaseType, updateCaseType, deleteCaseType,
  getTaxonomy, createTaxonomy, updateTaxonomy, deleteTaxonomy,
  getCustodians, createCustodian, updateCustodian, deleteCustodian,
  getRespondents, createRespondent, updateRespondent, deleteRespondent,
  getActions, createAction, updateAction, deleteAction,
  getAliases, createAlias, deleteAlias,
  getStandingCounsels, createStandingCounsel, deleteStandingCounsel,
  updateSensitivityThreshold,
} from "../controllers/mastersController";

const router = Router();

// Apply auth middleware to protect all master routes
router.use(authenticateToken);

// 6.1 Districts
router.get("/districts", getDistricts);
router.post("/districts", createDistrict);
router.put("/districts/:id", updateDistrict);
router.delete("/districts/:id", deleteDistrict);

// 6.2 Departments
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// 6.3 Ranks
router.get("/ranks", getRanks);
router.post("/ranks", createRank);
router.put("/ranks/:id", updateRank);
router.delete("/ranks/:id", deleteRank);

// 6.4 Designations
router.get("/designations", getDesignations);
router.post("/designations", createDesignation);
router.put("/designations/:id", updateDesignation);
router.delete("/designations/:id", deleteDesignation);

// 6.5 Courts & Case Types
router.get("/courts", getCourts);
router.post("/courts", createCourt);
router.put("/courts/:id", updateCourt);
router.delete("/courts/:id", deleteCourt);

router.get("/case-types", getCaseTypes);
router.post("/case-types", createCaseType);
router.put("/case-types/:id", updateCaseType);
router.delete("/case-types/:id", deleteCaseType);

// 6.6 Taxonomy
router.get("/taxonomy", getTaxonomy);
router.post("/taxonomy", createTaxonomy);
router.put("/taxonomy/:id", updateTaxonomy);
router.delete("/taxonomy/:id", deleteTaxonomy);

// 6.7 Custodians
router.get("/custodians", getCustodians);
router.post("/custodians", createCustodian);
router.put("/custodians/:id", updateCustodian);
router.delete("/custodians/:id", deleteCustodian);

// 6.8 Respondents
router.get("/respondents", getRespondents);
router.post("/respondents", createRespondent);
router.put("/respondents/:id", updateRespondent);
router.delete("/respondents/:id", deleteRespondent);

// 6.9 Action Taken Mapping
router.get("/actions", getActions);
router.post("/actions", createAction);
router.put("/actions/:id", updateAction);
router.delete("/actions/:id", deleteAction);

// 6.10 Aliases & Standing Counsels
router.get("/aliases", getAliases);
router.post("/aliases", createAlias);
router.delete("/aliases/:id", deleteAlias);
router.put("/aliases/threshold", updateSensitivityThreshold);

router.get("/aliases/standing-counsels", getStandingCounsels);
router.post("/aliases/standing-counsels", createStandingCounsel);
router.delete("/aliases/standing-counsels/:id", deleteStandingCounsel);

export default router;