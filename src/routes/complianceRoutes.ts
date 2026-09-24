import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getActiveStays,
  getStayMetrics,
  fileStayVacationMotion,
  exportStaysMIS,
  getContemptRadar,
  triggerContemptRedAlerts,
  updateContemptStatus,
  getArchivedCases,
  archiveCaseWithProof,
  getComplianceProof,
} from "../controllers/complianceController";

const router = Router();
router.use(authenticateToken);

// 5.1 Active Stays Roster
router.get("/compliance/stays", getActiveStays);
router.get("/compliance/stays/metrics", getStayMetrics);
router.post("/compliance/stays/:stayId/vacation-motion", fileStayVacationMotion);
router.get("/compliance/stays/export-mis", exportStaysMIS);

// 5.2 Contempt Risk Radar
router.get("/compliance/contempt", getContemptRadar);
router.post("/compliance/contempt/trigger-red-alerts", triggerContemptRedAlerts);
router.put("/compliance/contempt/:id/status", updateContemptStatus);

// 5.3 Compliance Archival
router.get("/compliance/archived", getArchivedCases);
router.post("/compliance/archive-case", archiveCaseWithProof);
router.get("/compliance/proof/:id", getComplianceProof);

export default router;