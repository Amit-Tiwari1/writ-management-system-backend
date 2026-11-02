import { Case } from "../models/Case";
import { Court, CaseType } from "../models/Masters";
import { User } from "../models/User";

export class DashboardService {
  // 1. Top 4 High-Level KPI Cards (Pure Real Database Counts - Zero Fallbacks)
  static async getTopKpis() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalActive,
      filedThisMonth,
      pendingInCourt,
      actionInBoard,
      pwcAwaited,
      toBeClosed,
      totalDisposed,
    ] = await Promise.all([
      Case.countDocuments({ judicialStatus: { $ne: "DISPOSED" } }),
      Case.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Case.countDocuments({
        judicialStatus: { $in: ["ACTIVE", "STAY_IN_FORCE", "CONTEMPT_NOTICE"] },
        stage: { $regex: /listed|hearing|court|orders|notice/i },
      }),
      Case.countDocuments({
        judicialStatus: { $ne: "DISPOSED" },
        "internalHold.location": { $regex: /legal|board|wing|cell|secretary|oic|pairokar/i },
      }),
      Case.countDocuments({
        $or: [{ judicialStatus: "PENDING_PWC" }, { stage: { $regex: /pwc|para-wise/i } }],
      }),
      Case.countDocuments({
        stage: { $regex: /to be closed|closed/i },
        judicialStatus: { $ne: "DISPOSED" },
      }),
      Case.countDocuments({
        $or: [{ judicialStatus: "DISPOSED" }, { stage: { $regex: /disposed off/i } }],
      }),
    ]);

    const previousCount = Math.max(0, totalActive - filedThisMonth);
    const complianceRate =
      totalActive + totalDisposed > 0
        ? Number(((totalDisposed / (totalActive + totalDisposed)) * 100).toFixed(1))
        : 0.0;

    return {
      activeWrits: {
        total: totalActive,
        filedThisMonth,
        previous: previousCount,
      },
      pendingInCourt: {
        total: pendingInCourt,
        description: "HC Allahabad & Lucknow Bench Active Matters",
      },
      actionInBoard: {
        total: actionInBoard,
        pwcAwaited,
        toBeClosed,
      },
      complianceRate: {
        rate: complianceRate,
        target: 96.0,
      },
    };
  }

  // 2. Multi-Dimensional Writ Classification Matrix (Filters & Real Data Only)
 static async getClassificationMatrix(filters: {
    wing?: string;
    courtCode?: string;
    year?: number;
  }) {
    const matchQuery: any = {};

    if (filters.wing && filters.wing !== "ALL" && filters.wing !== "ALL WRITS") {
      matchQuery.sectionWing = filters.wing;
    }
    if (filters.courtCode && filters.courtCode !== "ALL") {
      matchQuery.$or = [{ courtCode: filters.courtCode }, { benchLocation: filters.courtCode }];
    }
    if (filters.year) {
      matchQuery.caseYear = Number(filters.year);
    }

    // 7.5 Master se official case types pull karein
    const caseTypes = await CaseType.find().select("shortName caseTypeName").lean();
    
    // Agar master types hain toh unko prioritize karein
    const typeItems =
      caseTypes.length > 0
        ? caseTypes
        : [
            { shortName: "HC-ALD", caseTypeName: "WRIT - A (Service Single Bench)" },
            { shortName: "SPL-A", caseTypeName: "SPECIAL APPEAL" },
            { shortName: "CONT-APP", caseTypeName: "CONTEMPT APPLICATION" },
            { shortName: "SS-WRIT", caseTypeName: "SERVICE SINGLE (Writ Petition)" },
            { shortName: "CONT-LKO", caseTypeName: "CONTEMPT APPLICATION (Lucknow)" },
            { shortName: "CLAIM-PET", caseTypeName: "CLAIM PETITION" },
          ];

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const matrixRows = await Promise.all(
      typeItems.map(async (cItem: any) => {
        const sName = cItem.shortName || "";
        const fullName = cItem.caseTypeName || "";

        // Build flexible regex jo 'WRIT-A', 'HC-ALD', ya 'WRIT - A' sabko accurately match kare
        const matchingPatterns: any[] = [];
        if (sName) matchingPatterns.push({ caseType: new RegExp(`^${sName}$`, "i") });
        if (fullName) matchingPatterns.push({ caseType: new RegExp(fullName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i") });

        // High Court Allahabad Service Single bench standard alias
        if (sName === "HC-ALD" || fullName.includes("WRIT - A") || fullName.includes("WRIT-A")) {
          matchingPatterns.push({ caseType: /writ[- ]?a/i });
        }
        if (sName.includes("CONT") || fullName.includes("CONTEMPT")) {
          matchingPatterns.push({ caseType: /cont/i });
        }
        if (sName.includes("SPL") || fullName.includes("SPECIAL APPEAL")) {
          matchingPatterns.push({ caseType: /spl/i });
        }

        const typeQuery = {
          ...matchQuery,
          $or: matchingPatterns,
        };

        const [
          total,
          currentMonth,
          inBoard,
          inCourt,
          pwcInstructions,
          allowedOff,
          disposedOff,
          toBeClosed,
        ] = await Promise.all([
          Case.countDocuments(typeQuery),
          Case.countDocuments({ ...typeQuery, createdAt: { $gte: startOfMonth } }),
          Case.countDocuments({
            ...typeQuery,
            "internalHold.location": { $regex: /board|legal|wing|pairokar|secretary|assistant|oic/i },
          }),
          Case.countDocuments({
            ...typeQuery,
            stage: { $regex: /court|listed|hearing|notice/i },
          }),
          Case.countDocuments({
            ...typeQuery,
            $or: [{ judicialStatus: "PENDING_PWC" }, { stage: { $regex: /pwc|comments/i } }],
          }),
          Case.countDocuments({ ...typeQuery, stage: { $regex: /allowed/i } }),
          Case.countDocuments({
            ...typeQuery,
            $or: [{ judicialStatus: "DISPOSED" }, { stage: { $regex: /disposed/i } }],
          }),
          Case.countDocuments({ ...typeQuery, stage: { $regex: /to be closed/i } }),
        ]);

        const previous = Math.max(0, total - currentMonth);

        return {
          caseType: sName || fullName,
          label: sName || fullName,
          atAGlance: {
            previous,
            inCurrentMonth: currentMonth,
            total,
          },
          closed: {
            closed: disposedOff,
            toBeClosed,
          },
          pending: {
            inBoard,
            inUnits: 0,
            inCourt,
          },
          dismissedWithdrawn: {
            dismissed: 0,
            withdrawn: 0,
          },
          representationPending: {
            instructionsPwc: pwcInstructions,
            allowedOff,
            disposedOff,
            otherPending: Math.max(0, inBoard - pwcInstructions),
          },
        };
      })
    );

    const summary = matrixRows.reduce(
      (acc, r) => {
        acc.previous += r.atAGlance.previous;
        acc.inCurrentMonth += r.atAGlance.inCurrentMonth;
        acc.total += r.atAGlance.total;
        acc.closed += r.closed.closed;
        acc.toBeClosed += r.closed.toBeClosed;
        acc.inBoard += r.pending.inBoard;
        acc.inUnits += r.pending.inUnits;
        acc.inCourt += r.pending.inCourt;
        acc.instructionsPwc += r.representationPending.instructionsPwc;
        acc.allowedOff += r.representationPending.allowedOff;
        acc.disposedOff += r.representationPending.disposedOff;
        acc.otherPending += r.representationPending.otherPending;
        return acc;
      },
      {
        previous: 0,
        inCurrentMonth: 0,
        total: 0,
        closed: 0,
        toBeClosed: 0,
        inBoard: 0,
        inUnits: 0,
        inCourt: 0,
        instructionsPwc: 0,
        allowedOff: 0,
        disposedOff: 0,
        otherPending: 0,
      }
    );

    return {
      rows: matrixRows,
      summary,
    };
  }

  // 3. Judicial Forum Distribution (Master Synced)
  static async getCourtDistribution() {
    const courts = await Court.find().select("courtName shortCode location").lean();

    const distribution = await Promise.all(
      courts.map(async (c) => {
        const count = await Case.countDocuments({
          $or: [
            { courtId: c._id },
            { courtCode: c.shortCode },
            { court: new RegExp(c.courtName, "i") },
            { benchLocation: new RegExp(c.location, "i") },
          ],
          judicialStatus: { $ne: "DISPOSED" },
        });
        return {
          courtId: c._id.toString(),
          courtName: c.courtName,
          shortCode: c.shortCode,
          location: c.location,
          activeCount: count,
        };
      })
    );

    const totalForumWrits = distribution.reduce((sum, item) => sum + item.activeCount, 0);

    return {
      totalActive: totalForumWrits,
      courts: distribution,
    };
  }

  // 4. Officer-in-Charge (OIC) Pending Workload Roster
  static async getOicWorkloadRoster() {
    const officers = await User.find({ status: "ACTIVE" })
      .select("name designation section role")
      .sort({ name: 1 })
      .lean();

    const workload = await Promise.all(
      officers.map(async (off, idx) => {
        const oicRegex = new RegExp(`^${off.name.trim()}$|${off.name.trim()}`, "i");

        const [total, actionDue, commentsNotSent, caNotFiled, toBeClosed] = await Promise.all([
          Case.countDocuments({
            $or: [{ assignedOIC: oicRegex }, { "internalHold.location": oicRegex }],
            judicialStatus: { $ne: "DISPOSED" },
          }),
          Case.countDocuments({
            "internalHold.location": oicRegex,
            judicialStatus: { $ne: "DISPOSED" },
          }),
          Case.countDocuments({
            assignedOIC: oicRegex,
            $or: [{ judicialStatus: "PENDING_PWC" }, { stage: { $regex: /pwc|comments/i } }],
          }),
          Case.countDocuments({
            assignedOIC: oicRegex,
            hasActiveStay: true,
            vacationMotionStatus: { $ne: "VACATION_FILED" },
          }),
          Case.countDocuments({ assignedOIC: oicRegex, stage: { $regex: /to be closed/i } }),
        ]);

        let statusColor: "success" | "warning" | "danger" = "success";
        if (actionDue >= 5 || caNotFiled >= 3) statusColor = "danger";
        else if (actionDue > 0 || commentsNotSent > 0) statusColor = "warning";

        return {
          sNo: idx + 1,
          officerId: off._id.toString(),
          officerName: off.name,
          designation: off.designation || off.role,
          sectionWing: off.section || "Legal Cell",
          total,
          actionDue,
          commentsNotSent,
          caNotFiled,
          toBeClosed,
          status: statusColor,
        };
      })
    );

    return workload.filter((w) => w.total > 0 || w.sectionWing.includes("Legal") || w.designation.includes("SP"));
  }

  // 5. Monthly Hearing Calendar Heatmap
  static async getMonthlyHearingCalendar(month?: number, year?: number) {
    const curYear = year || new Date().getFullYear();
    const curMonth = month !== undefined ? month : new Date().getMonth();

    const startOfMonth = new Date(curYear, curMonth, 1);
    const endOfMonth = new Date(curYear, curMonth + 1, 0, 23, 59, 59);

    const hearings = await Case.aggregate([
      {
        $match: {
          ndoh: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$ndoh" },
          count: { $sum: 1 },
          hasStayOrContempt: {
            $sum: {
              $cond: [{ $or: ["$hasActiveStay", "$isContemptNotice"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      year: curYear,
      month: curMonth,
      days: hearings.map((h) => {
        const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, "0")}-${String(h._id).padStart(2, "0")}`;
        return {
          day: h._id,
          dateStr,
          count: h.count,
          isHighRisk: h.hasStayOrContempt > 0,
        };
      }),
    };
  }

  // 6. Get Cases Scheduled on a Specific Hearing Date (Calendar Click Drill-down)
  static async getCasesByHearingDate(dateString: string) {
    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const cases = await Case.find({
      ndoh: { $gte: startOfDay, $lte: endOfDay },
    })
      .select("fileNo writNumber cnrNumber court benchLocation courtRoomNo leadPetitioner petitionerAdvocate assignedOIC stage hasActiveStay isContemptNotice")
      .sort({ courtRoomNo: 1, fileNo: 1 })
      .lean();

    return cases;
  }
}