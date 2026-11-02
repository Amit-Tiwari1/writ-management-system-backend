import { Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { renderPdfDocument } from "../utils/pdfTemplate";

export const getDashboardKpis = async (req: Request, res: Response) => {
  try {
    const kpis = await DashboardService.getTopKpis();
    return res.status(200).json({ success: true, data: kpis });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWritClassificationMatrix = async (req: Request, res: Response) => {
  try {
    const { wing, courtCode, year } = req.query;
    const matrix = await DashboardService.getClassificationMatrix({
      wing: wing ? String(wing) : undefined,
      courtCode: courtCode ? String(courtCode) : undefined,
      year: year ? Number(year) : undefined,
    });
    return res.status(200).json({ success: true, data: matrix });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCourtForumDistribution = async (req: Request, res: Response) => {
  try {
    const forum = await DashboardService.getCourtDistribution();
    return res.status(200).json({ success: true, data: forum });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOicPendingWorkload = async (req: Request, res: Response) => {
  try {
    const workload = await DashboardService.getOicWorkloadRoster();
    return res.status(200).json({ success: true, count: workload.length, data: workload });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getHearingCalendarHeatmap = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    const calendar = await DashboardService.getMonthlyHearingCalendar(
      month !== undefined ? Number(month) : undefined,
      year ? Number(year) : undefined
    );
    return res.status(200).json({ success: true, data: calendar });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCasesForHearingDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date query parameter (YYYY-MM-DD) is required." });
    }
    const cases = await DashboardService.getCasesByHearingDate(String(date));
    return res.status(200).json({
      success: true,
      count: cases.length,
      date,
      data: cases,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportMatrixPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { wing, courtCode, year } = req.query;
    const matrix = await DashboardService.getClassificationMatrix({
      wing: wing ? String(wing) : undefined,
      courtCode: courtCode ? String(courtCode) : undefined,
      year: year ? Number(year) : undefined,
    });

    const rowsHtml = matrix.rows
      .map(
        (r) => `
      <tr>
        <td style="font-weight: 700;">${r.caseType}</td>
        <td style="text-align: center;">${r.atAGlance.previous}</td>
        <td style="text-align: center;">${r.atAGlance.inCurrentMonth}</td>
        <td style="text-align: center; font-weight: 700;">${r.atAGlance.total}</td>
        <td style="text-align: center;">${r.closed.closed}</td>
        <td style="text-align: center;">${r.closed.toBeClosed}</td>
        <td style="text-align: center;">${r.pending.inBoard}</td>
        <td style="text-align: center;">${r.pending.inUnits}</td>
        <td style="text-align: center;">${r.pending.inCourt}</td>
        <td style="text-align: center;">${r.representationPending.instructionsPwc}</td>
        <td style="text-align: center;">${r.representationPending.allowedOff}</td>
        <td style="text-align: center;">${r.representationPending.disposedOff}</td>
      </tr>`
      )
      .join("");

    const contentHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 4px;">
        WRIT CLASSIFICATION & DISPOSAL MATRIX (${year || "All Years"} · ${courtCode || "All Courts"})
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align: middle;">Writ Type</th>
            <th colspan="3" style="text-align: center;">At A Glance</th>
            <th colspan="2" style="text-align: center;">Closed</th>
            <th colspan="3" style="text-align: center;">Pending</th>
            <th colspan="3" style="text-align: center;">Representation / Action</th>
          </tr>
          <tr>
            <th style="font-size: 8px; text-align: center;">Prev</th>
            <th style="font-size: 8px; text-align: center;">Month</th>
            <th style="font-size: 8px; text-align: center;">Total</th>
            <th style="font-size: 8px; text-align: center;">Closed</th>
            <th style="font-size: 8px; text-align: center;">To Close</th>
            <th style="font-size: 8px; text-align: center;">Board</th>
            <th style="font-size: 8px; text-align: center;">Units</th>
            <th style="font-size: 8px; text-align: center;">Court</th>
            <th style="font-size: 8px; text-align: center;">PWC</th>
            <th style="font-size: 8px; text-align: center;">Allowed</th>
            <th style="font-size: 8px; text-align: center;">Disposed</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color: #f1f5f9; font-weight: 800;">
            <td>TOTAL</td>
            <td style="text-align: center;">${matrix.summary.previous}</td>
            <td style="text-align: center;">${matrix.summary.inCurrentMonth}</td>
            <td style="text-align: center;">${matrix.summary.total}</td>
            <td style="text-align: center;">${matrix.summary.closed}</td>
            <td style="text-align: center;">${matrix.summary.toBeClosed}</td>
            <td style="text-align: center;">${matrix.summary.inBoard}</td>
            <td style="text-align: center;">${matrix.summary.inUnits}</td>
            <td style="text-align: center;">${matrix.summary.inCourt}</td>
            <td style="text-align: center;">${matrix.summary.instructionsPwc}</td>
            <td style="text-align: center;">${matrix.summary.allowedOff}</td>
            <td style="text-align: center;">${matrix.summary.disposedOff}</td>
          </tr>
        </tbody>
      </table>
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle: "1.0 Institutional Writ Classification & Pendency Matrix",
      reportSubtitle: `Filter Scope: Wing: ${wing || "All"} | Court: ${courtCode || "All Courts"} | Year: ${year || "All"}`,
      generatedBy: {
        name: req.user?.name || req.user?.username || "Legal Administrator",
        designation: req.user?.designation,
        role: req.user?.role,
      },
      filterMetaText: `Active Writs Indexed: ${matrix.summary.total}`,
      contentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlOutput);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};