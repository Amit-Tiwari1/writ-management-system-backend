import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getCaseNotings,
  saveDraftNoting,
  signAndForwardNoting,
  verifyMinuteSignature,
  generatePrintMemo,
} from "../controllers/notingController";

const router = Router();
router.use(authenticateToken);

// 35. Chronological minutes ledger
router.get("/cases/:caseId/notings", getCaseNotings);

// 36. Draft temporary noting
router.post("/cases/:caseId/notings/draft", saveDraftNoting);

// 37. Cryptographically sign and forward dak
router.post("/cases/:caseId/notings/sign-and-forward", signAndForwardNoting);

// 38. Verify DSC digital signature hash
router.get("/cases/:caseId/notings/:minuteNo/verify-signature", verifyMinuteSignature);

// 39. Printable formal green sheet memo
router.get("/cases/:caseId/notings/print-memo", generatePrintMemo);

export default router;