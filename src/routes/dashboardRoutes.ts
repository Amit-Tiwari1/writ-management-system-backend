import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getDashboardKPIs,
  getMatrixSummary,
  getNDOHCalendar,
  getUrgentAlerts,
} from "../controllers/dashboardController";

const router = Router();
router.use(authenticateToken);

// 5. KPIs summary
router.get("/dashboard/kpis", getDashboardKPIs);

// 6. Section vs Court matrix
router.get("/dashboard/matrix-summary", getMatrixSummary);

// 7. 7-15 Days NDOH schedule
router.get("/dashboard/ndoh-calendar", getNDOHCalendar);

// 8. Real-time red alerts
router.get("/dashboard/urgent-alerts", getUrgentAlerts);

export default router;