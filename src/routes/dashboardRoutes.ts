import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getDashboardKpis,
  getWritClassificationMatrix,
  getCourtForumDistribution,
  getOicPendingWorkload,
  getHearingCalendarHeatmap,
} from "../controllers/dashboardController";

const router = Router();
router.use(authenticateToken);

router.get("/dashboard/kpis", getDashboardKpis);

router.get("/dashboard/matrix", getWritClassificationMatrix);

router.get("/dashboard/court-distribution", getCourtForumDistribution);

router.get("/dashboard/oic-workload", getOicPendingWorkload);

router.get("/dashboard/calendar-heatmap", getHearingCalendarHeatmap);

export default router;