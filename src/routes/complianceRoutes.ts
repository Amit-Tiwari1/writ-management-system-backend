import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getActiveStaysRoster,
  registerStayOrder,
  updateVacationMotion,
  getContemptRiskRadar,
  registerContemptNotice,
  triggerRedZoneAlerts,
  getArchivedComplianceRecords,
  closeAndArchiveCase,
} from "../controllers/complianceController";

const router = Router();
router.use(authenticateToken);

// --- 5.1 Active Stays Roster ---
router.get("/compliance/stays", getActiveStaysRoster);
router.post("/compliance/stays", registerStayOrder);
router.put("/compliance/stays/:id/vacation", updateVacationMotion);

// --- 5.2 Contempt Risk Radar ---
router.get("/compliance/contempt", getContemptRiskRadar);
router.post("/compliance/contempt", registerContemptNotice);
router.post("/compliance/contempt/trigger-redzone-alerts", triggerRedZoneAlerts);

// --- 5.3 Compliance Filing & Archival ---
router.get("/compliance/archives", getArchivedComplianceRecords);
router.post("/compliance/archive-case", closeAndArchiveCase);

export default router;