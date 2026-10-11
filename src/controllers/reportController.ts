import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

// 1. Get Report Data for Frontend Table
export const getReportData = async (req: Request, res: Response) => {
  try {
    const {
      reportType = "ALL_CASES",
      startDate,
      endDate,
      court,
      wing,
      category,
      caseType,
      status,
      examCycle,
      oic,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await ReportService.getReportData({
      reportType: String(reportType),
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      court: court ? String(court) : undefined,
      wing: wing ? String(wing) : undefined,
      category: category ? String(category) : undefined,
      caseType: caseType ? String(caseType) : undefined,
      status: status ? String(status) : undefined,
      examCycle: examCycle ? String(examCycle) : undefined,
      oic: oic ? String(oic) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Download Excel Report
export const exportReportExcel = async (req: Request, res: Response) => {
  try {
    const {
      reportType = "ALL_CASES",
      startDate,
      endDate,
      court,
      wing,
      category,
      caseType,
      status,
      examCycle,
      oic,
    } = req.query;

    const buffer = await ReportService.generateExcelReport({
      reportType: String(reportType),
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      court: court ? String(court) : undefined,
      wing: wing ? String(wing) : undefined,
      category: category ? String(category) : undefined,
      caseType: caseType ? String(caseType) : undefined,
      status: status ? String(status) : undefined,
      examCycle: examCycle ? String(examCycle) : undefined,
      oic: oic ? String(oic) : undefined,
    });

    const filename = `UPPRPB_${reportType}_${Date.now()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Download Watermarked PDF Report
export const exportReportPdf = async (req: Request, res: Response) => {
  try {
    const {
      reportType = "ALL_CASES",
      startDate,
      endDate,
      court,
      wing,
      category,
      caseType,
      status,
      examCycle,
      oic,
    } = req.query;

    const buffer = await ReportService.generatePdfReport({
      reportType: String(reportType),
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      court: court ? String(court) : undefined,
      wing: wing ? String(wing) : undefined,
      category: category ? String(category) : undefined,
      caseType: caseType ? String(caseType) : undefined,
      status: status ? String(status) : undefined,
      examCycle: examCycle ? String(examCycle) : undefined,
      oic: oic ? String(oic) : undefined,
    });

    const filename = `UPPRPB_${reportType}_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};