import { Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";

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
    const workload = await DashboardService.getOicPendingWorkloadRoster();
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