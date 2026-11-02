import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { uploadSingle } from "../middlewares/uploadMiddleware";
import {
  getPetitioners,
  addPetitioner,
  updatePetitioner,
  deletePetitioner,
  bulkUploadPetitioners,
  uploadPetitionersFile,
  getUnclaimedDiscovery,
  acceptDiscoveryItem,
  ignoreDiscoveryItem,
  triggerCauseListScraper,
  uploadPdfCauseList,
} from "../controllers/petitionersDiscoveryController";

const router = Router();
router.use(authenticateToken);

// --- 2.3 Co-Petitioners Registry Endpoints ---
router.get("/cases/:caseId/petitioners", getPetitioners);
router.post("/cases/:caseId/petitioners", addPetitioner);
router.put("/cases/:caseId/petitioners/:petitionerId", updatePetitioner);
router.delete("/cases/:caseId/petitioners/:petitionerId", deletePetitioner);
router.post("/cases/:caseId/petitioners/bulk-upload", bulkUploadPetitioners);
router.post("/cases/:caseId/petitioners/upload-file", uploadSingle("file", 25), uploadPetitionersFile);

// --- 2.4 Inward Discovery Desk Endpoints ---
router.get("/discovery/unclaimed", getUnclaimedDiscovery);
router.post("/discovery/:id/accept", acceptDiscoveryItem);
router.post("/discovery/:id/ignore", ignoreDiscoveryItem);
router.post("/discovery/trigger-scraper", triggerCauseListScraper);
router.post("/discovery/upload-pdf", uploadSingle("file", 25), uploadPdfCauseList);

export default router;