import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getReportData,
  exportReportExcel,
  exportReportPdf,
} from "../controllers/reportController";

const router = Router();
router.use(authenticateToken);

router.get("/reports/data", getReportData);

router.get("/reports/export-excel", exportReportExcel);

router.get("/reports/export-pdf", exportReportPdf);

export default router;