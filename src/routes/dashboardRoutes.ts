import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getDashboardKpis,
  getWritClassificationMatrix,
  getCourtForumDistribution,
  getOicPendingWorkload,
  getHearingCalendarHeatmap,
  getCasesForHearingDate,
  exportMatrixPdf,
} from "../controllers/dashboardController";

const router = Router();
router.use(authenticateToken);

router.get("/dashboard/kpis", getDashboardKpis);
router.get("/dashboard/matrix", getWritClassificationMatrix);
router.get("/dashboard/matrix/export-pdf", exportMatrixPdf);
router.get("/dashboard/court-distribution", getCourtForumDistribution);
router.get("/dashboard/oic-workload", getOicPendingWorkload);
router.get("/dashboard/calendar-heatmap", getHearingCalendarHeatmap);
router.get("/dashboard/calendar-cases", getCasesForHearingDate);

export default router;