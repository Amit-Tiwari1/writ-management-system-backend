import { Router } from "express";
import {
  getCasesRegister,
  getCaseById,
  registerCaseIntake,
  checkDuplicateDocket,
  triggerCaseSync,
  manageConnectedWrits,
  getCasePetitioners,
  addCoPetitioner,
  getUnclaimedDiscovery,
  mockVerifyCNR,
  linkDiscoveredWritToNotice,
} from "../controllers/caseController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/mock/ecourts/verify-cnr", mockVerifyCNR);
router.use(authenticateToken);
router.get("/cases", getCasesRegister);
router.get("/cases/:id", getCaseById);
router.post("/cases/:id/sync-ecourts", triggerCaseSync);
router.post("/cases/:id/connected-writs", manageConnectedWrits);
router.get("/intake/check-duplicate", checkDuplicateDocket);
router.post("/intake/register", registerCaseIntake);
router.get("/cases/:caseId/petitioners", getCasePetitioners);
router.post("/cases/:caseId/petitioners", addCoPetitioner);
router.get("/discovery/unclaimed", getUnclaimedDiscovery);
router.post("/discovery/link-notice", linkDiscoveredWritToNotice);

export default router;