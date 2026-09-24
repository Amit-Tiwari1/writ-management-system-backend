import { Request, Response } from "express";
import { Case } from "../models/Case";
import { StayOrder, ContemptMatter, ComplianceArchive } from "../models/Compliance";

// 5. GET /api/v1/dashboard/kpis
export const getDashboardKPIs = async (req: Request, res: Response) => {
  try {
    const [totalActive, staysCount, contemptCount, disposedCount] = await Promise.all([
      Case.countDocuments({ judicialStatus: { $ne: "ARCHIVED" } }),
      StayOrder.countDocuments({ vacationStatus: { $ne: "VACATED" } }),
      ContemptMatter.countDocuments({ processingStatus: { $ne: "COMPLIANCE_AFFIDAVIT_FILED" } }),
      ComplianceArchive.countDocuments(),
    ]);

    // Calculate this week's fresh intake
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const freshThisWeek = await Case.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Compliance rate formula
    const totalConcluded = disposedCount;
    const complianceRate = totalActive + totalConcluded > 0
      ? Math.round((totalConcluded / (totalActive + totalConcluded)) * 100)
      : 94; // Baseline standard SLA

    res.status(200).json({
      success: true,
      kpis: {
        activeWrits: totalActive,
        freshThisWeek,
        staysInForce: staysCount,
        contemptNotices: contemptCount,
        disposedAndArchived: disposedCount,
        complianceRatePercentage: complianceRate,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. GET /api/v1/dashboard/matrix-summary (Cross-Tabulated Breakdown)
export const getMatrixSummary = async (req: Request, res: Response) => {
  try {
    const matrix = await Case.aggregate([
      { $match: { judicialStatus: { $ne: "ARCHIVED" } } },
      {
        $group: {
          _id: { wing: "$sectionWing", court: "$court" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.wing",
          courts: {
            $push: {
              court: "$_id.court",
              count: "$count",
            },
          },
          totalWingWrits: { $sum: "$count" },
        },
      },
      { $sort: { totalWingWrits: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: matrix.length,
      data: matrix,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. GET /api/v1/dashboard/ndoh-calendar (Upcoming 7-15 Days Hearing Projections)
export const getNDOHCalendar = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fifteenDaysLater = new Date(today);
    fifteenDaysLater.setDate(today.getDate() + 15);

    const scheduledCases = await Case.aggregate([
      {
        $match: {
          ndoh: { $gte: today, $lte: fifteenDaysLater },
          judicialStatus: { $ne: "ARCHIVED" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$ndoh" } },
          caseCount: { $sum: 1 },
          cases: {
            $push: {
              id: "$_id",
              docketNo: "$fileDocketNo",
              cnrNumber: "$cnrNumber",
              court: "$court",
              parties: "$leadPetitioner",
              courtRoomNo: "$courtRoomNo",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      projectionWindowDays: 15,
      calendarSchedule: scheduledCases,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 8. GET /api/v1/dashboard/urgent-alerts
export const getUrgentAlerts = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    // 1. Critical Contempt (<3 days)
    const criticalContempt = await ContemptMatter.find({
      statutoryDeadline: { $lte: threeDaysLater },
      processingStatus: { $ne: "COMPLIANCE_AFFIDAVIT_FILED" },
    }).select("contemptCaseNo respondentNamed statutoryDeadline assignedOIC");

    // 2. Urgent Stay Vacations (<7 days)
    const urgentStays = await StayOrder.find({
      stayVacationDueDate: { $lte: sevenDaysLater },
      vacationStatus: { $in: ["NOT_INITIATED", "DRAFTED"] },
    }).select("caseNo court stayVacationDueDate assignedCounsel");

    // 3. Overdue Counter Affidavits (PWC Lapsed)
    const overdueReplies = await Case.find({
      stage: { $regex: "PWC Pending|Counter Affidavit Due", $options: "i" },
      ndoh: { $lte: today },
    }).select("fileDocketNo cnrNumber assignedOIC ndoh");

    res.status(200).json({
      success: true,
      criticalSummary: {
        totalCriticalAlerts: criticalContempt.length + urgentStays.length + overdueReplies.length,
        criticalContemptCases: criticalContempt,
        urgentStayVacations: urgentStays,
        overdueSecretariatReplies: overdueReplies,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};