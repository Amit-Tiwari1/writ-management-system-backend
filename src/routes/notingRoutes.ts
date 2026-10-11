import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getForwardableOfficers,
  getCaseNotings,
  saveDraftNoting,
  signAndForwardNoting,
  verifyMinuteSignature,
  generatePrintMemo,
} from "../controllers/notingController";

const router = Router();
router.use(authenticateToken);

// Dropdown: Forward File to Authority (Officers List)
router.get("/cases/authorities/officers-list", getForwardableOfficers);

// Minutes Ledger & Actions
router.get("/cases/:caseId/notings", getCaseNotings);
router.post("/cases/:caseId/notings/draft", saveDraftNoting);
router.post("/cases/:caseId/notings/sign-and-forward", signAndForwardNoting);
router.get("/cases/:caseId/notings/:minuteNo/verify-signature", verifyMinuteSignature);
router.get("/cases/:caseId/notings/print-memo", generatePrintMemo);

export default router;