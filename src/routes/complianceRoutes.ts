import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getActiveStaysRoster,
  registerStayOrder,
  updateVacationMotion,
  exportStaysPdf,
  getContemptRiskRadar,
  registerContemptNotice,
  triggerRedZoneAlerts,
  exportContemptPdf,
  getArchivedComplianceRecords,
  closeAndArchiveCase,
  exportArchivesPdf,
} from "../controllers/complianceController";

const router = Router();
router.use(authenticateToken);

// 5.1 Stays Endpoints
router.get("/compliance/stays", getActiveStaysRoster);
router.post("/compliance/stays", registerStayOrder);
router.put("/compliance/stays/:id/vacation", updateVacationMotion);
router.get("/compliance/stays/export-pdf", exportStaysPdf);

// 5.2 Contempt Endpoints
router.get("/compliance/contempt", getContemptRiskRadar);
router.post("/compliance/contempt", registerContemptNotice);
router.post("/compliance/contempt/trigger-redzone-alerts", triggerRedZoneAlerts);
router.get("/compliance/contempt/export-pdf", exportContemptPdf);

// 5.3 Archival Endpoints
router.get("/compliance/archives", getArchivedComplianceRecords);
router.post("/compliance/archive-case", closeAndArchiveCase);
router.get("/compliance/archives/export-pdf", exportArchivesPdf);

export default router;