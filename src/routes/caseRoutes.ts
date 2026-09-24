import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getCases,
  getCaseById,
  updateCase,
  syncCaseFromECourts,
  exportCasesExcel,
  verifyCNR,
  registerNewCase,
  checkDuplicateCase,
} from "../controllers/caseController";
import {
  getPetitioners,
  addPetitioner,
  updatePetitioner,
  deletePetitioner,
  bulkUploadPetitioners,
  getUnclaimedDiscovery,
  acceptDiscoveryItem,
  ignoreDiscoveryItem,
  triggerCauseListScraper,
  uploadPdfCauseList,
} from "../controllers/petitionersDiscoveryController";

const router = Router();
router.use(authenticateToken);

// 2.1 Case Register
router.get("/cases", getCases);
router.get("/cases/export/excel", exportCasesExcel);
router.get("/cases/:id", getCaseById);
router.put("/cases/:id", updateCase);
router.post("/cases/:id/sync-ecourts", syncCaseFromECourts);

// 2.2 Case Intake Wizard
router.post("/intake/verify-cnr", verifyCNR);
router.post("/intake/register", registerNewCase);
router.get("/intake/check-duplicate", checkDuplicateCase);

// 2.3 Co-Petitioners Registry
router.get("/cases/:caseId/petitioners", getPetitioners);
router.post("/cases/:caseId/petitioners", addPetitioner);
router.put("/cases/:caseId/petitioners/:petitionerId", updatePetitioner);
router.delete("/cases/:caseId/petitioners/:petitionerId", deletePetitioner);
router.post("/cases/:caseId/petitioners/bulk-upload", bulkUploadPetitioners);

// 2.4 Inward Discovery Desk
router.get("/discovery/unclaimed", getUnclaimedDiscovery);
router.post("/discovery/:id/accept", acceptDiscoveryItem);
router.post("/discovery/:id/ignore", ignoreDiscoveryItem);
router.post("/discovery/trigger-scraper", triggerCauseListScraper);
router.post("/discovery/upload-pdf-causelist", uploadPdfCauseList);

export default router;