
import { Case } from "../models/Case";
import { Court, CaseType } from "../models/Masters";
import { User } from "../models/User";

/**
 * Combines MongoDB query conditions without overwriting $or / $and.
 */
const combineQueries = (...queries: any[]) => {
  const validQueries = queries.filter(
    (query) => query && Object.keys(query).length > 0
  );

  if (validQueries.length === 0) return {};
  if (validQueries.length === 1) return validQueries[0];

  return { $and: validQueries };
};

export class DashboardService {
  // ---------------------------------------------------------
  // 1. TOP DASHBOARD KPI CARDS
  // ---------------------------------------------------------

  static async getTopKpis() {
    const today = new Date();
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const [
      totalActive,
      filedThisMonth,
      pendingInCourt,
      actionInBoard,
      pwcAwaited,
      toBeClosed,
      totalDisposed,
    ] = await Promise.all([
      Case.countDocuments({
        judicialStatus: { $ne: "DISPOSED" },
      }),

      Case.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),

      Case.countDocuments({
        judicialStatus: {
          $in: ["ACTIVE", "STAY_IN_FORCE", "CONTEMPT_NOTICE"],
        },
        stage: {
          $regex: /listed|hearing|court|orders|notice/i,
        },
      }),

      Case.countDocuments({
        judicialStatus: { $ne: "DISPOSED" },
        "internalHold.location": {
          $regex: /legal|board|wing|cell|secretary|oic|pairokar/i,
        },
      }),

      Case.countDocuments({
        $or: [
          { judicialStatus: "PENDING_PWC" },
          { stage: { $regex: /pwc|para-wise/i } },
        ],
      }),

      Case.countDocuments({
        stage: { $regex: /to be closed|closed/i },
        judicialStatus: { $ne: "DISPOSED" },
      }),

      Case.countDocuments({
        $or: [
          { judicialStatus: "DISPOSED" },
          { stage: { $regex: /disposed off/i } },
        ],
      }),
    ]);

    const previousCount = Math.max(0, totalActive - filedThisMonth);

    const complianceRate =
      totalActive + totalDisposed > 0
        ? Number(
            (
              (totalDisposed / (totalActive + totalDisposed)) *
              100
            ).toFixed(1)
          )
        : 0;

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

  // ---------------------------------------------------------
  // 2. WRIT CLASSIFICATION MATRIX
  // ObjectId-based CaseType and Court matching
  // ---------------------------------------------------------

  static async getClassificationMatrix(filters: {
    wing?: string;
    courtCode?: string;
    year?: number;
  }) {
    const matchConditions: any[] = [];

    // Wing filter
    if (
      filters.wing &&
      filters.wing !== "ALL" &&
      filters.wing !== "ALL WRITS"
    ) {
      matchConditions.push({
        sectionWing: filters.wing,
      });
    }

    // Year filter
    if (filters.year) {
      matchConditions.push({
        caseYear: Number(filters.year),
      });
    }

    // Court filter
    let caseTypeFilter: any = {};

    if (filters.courtCode && filters.courtCode !== "ALL") {
      const selectedCourtCode = filters.courtCode.trim().toUpperCase();

      const selectedCourt = await Court.findOne({
        shortCode: selectedCourtCode,
      })
        .select("_id shortCode courtName location")
        .lean();

      if (selectedCourt) {
        // Actual relationship: Case.courtId -> Court._id
        matchConditions.push({
          courtId: selectedCourt._id,
        });

        // Actual relationship: CaseType.courtId -> Court._id
        caseTypeFilter = {
          courtId: selectedCourt._id,
        };
      } else if (
        ["ALLAHABAD", "LUCKNOW", "NEW DELHI"].includes(selectedCourtCode)
      ) {
        // If frontend sends a bench name instead of a court shortCode
        matchConditions.push({
          benchLocation: {
            $regex: `^${selectedCourtCode}$`,
            $options: "i",
          },
        });
      } else {
        // Compatibility for records using the existing courtCode string
        matchConditions.push({
          courtCode: selectedCourtCode,
        });
      }
    }

    const baseQuery = combineQueries(...matchConditions);

    // Fetch actual case types from master collection.
    // No hardcoded/fake case types are added.
    const caseTypes = await CaseType.find(caseTypeFilter)
      .select("_id shortName caseTypeName courtId")
      .sort({ caseTypeName: 1 })
      .lean();

    const today = new Date();

    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const matrixRows = await Promise.all(
      caseTypes.map(async (caseType: any) => {
        // Actual relationship: Case.caseTypeId -> CaseType._id
        const typeQuery = combineQueries(baseQuery, {
          caseTypeId: caseType._id,
        });

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

          Case.countDocuments(
            combineQueries(typeQuery, {
              createdAt: { $gte: startOfMonth },
            })
          ),

          Case.countDocuments(
            combineQueries(typeQuery, {
              "internalHold.location": {
                $regex: /board|legal|wing|pairokar|secretary|assistant|oic/i,
              },
            })
          ),

          Case.countDocuments(
            combineQueries(typeQuery, {
              stage: {
                $regex: /court|listed|hearing|notice/i,
              },
            })
          ),

          Case.countDocuments(
            combineQueries(typeQuery, {
              $or: [
                { judicialStatus: "PENDING_PWC" },
                { stage: { $regex: /pwc|comments/i } },
              ],
            })
          ),

          Case.countDocuments(
            combineQueries(typeQuery, {
              stage: { $regex: /allowed/i },
            })
          ),

          Case.countDocuments(
            combineQueries(typeQuery, {
              $or: [
                { judicialStatus: "DISPOSED" },
                { stage: { $regex: /disposed/i } },
              ],
            })
          ),

          Case.countDocuments(
            combineQueries(typeQuery, {
              stage: { $regex: /to be closed/i },
            })
          ),
        ]);

        const previous = Math.max(0, total - currentMonth);

        return {
          caseType: caseType.shortName || caseType.caseTypeName,
          label: caseType.shortName || caseType.caseTypeName,

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
            pwcInstructions,
            allowedOff,
            disposedOff,
            otherPending: Math.max(0, inBoard - pwcInstructions),
          },
        };
      })
    );

    const summary = matrixRows.reduce(
      (acc, row) => {
        acc.previous += row.atAGlance.previous;
        acc.inCurrentMonth += row.atAGlance.inCurrentMonth;
        acc.total += row.atAGlance.total;

        acc.closed += row.closed.closed;
        acc.toBeClosed += row.closed.toBeClosed;

        acc.inBoard += row.pending.inBoard;
        acc.inUnits += row.pending.inUnits;
        acc.inCourt += row.pending.inCourt;

        acc.instructionsPwc +=
          row.representationPending.pwcInstructions;

        acc.allowedOff += row.representationPending.allowedOff;
        acc.disposedOff += row.representationPending.disposedOff;
        acc.otherPending += row.representationPending.otherPending;

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

  // ---------------------------------------------------------
  // 3. JUDICIAL FORUM / COURT DISTRIBUTION
  // ObjectId-based Court matching
  // ---------------------------------------------------------

  static async getCourtDistribution() {
    const courts = await Court.find()
      .select("courtName shortCode location")
      .sort({ courtName: 1 })
      .lean();

    const distribution = await Promise.all(
      courts.map(async (court: any) => {
        const count = await Case.countDocuments({
          courtId: court._id,
          judicialStatus: { $ne: "DISPOSED" },
        });

        return {
          courtId: court._id.toString(),
          courtName: court.courtName,
          shortCode: court.shortCode,
          location: court.location,
          activeCount: count,
        };
      })
    );

    const totalForumWrits = distribution.reduce(
      (sum, item) => sum + item.activeCount,
      0
    );

    return {
      totalActive: totalForumWrits,
      courts: distribution,
    };
  }

  // ---------------------------------------------------------
  // 4. OFFICER-IN-CHARGE PENDING WORKLOAD ROSTER
  // ObjectId-based User matching
  // ---------------------------------------------------------

  static async getOicWorkloadRoster() {
    const officers = await User.find({
      status: "ACTIVE",
    })
      .select("name designation rank section role")
      .sort({ name: 1 })
      .lean();

    const workload = await Promise.all(
      officers.map(async (officer: any, index: number) => {
        const officerId = officer._id;

        const assignedToOfficer = {
          assignedOIC: officerId,
        };

        const currentlyHeldByOfficer = {
          "internalHold.currentHolderId": officerId,
        };

        const activeCases = {
          judicialStatus: { $ne: "DISPOSED" },
        };

        const [
          total,
          actionDue,
          commentsNotSent,
          toBeClosed,
        ] = await Promise.all([
          // Cases assigned to officer OR currently held by officer
          Case.countDocuments(
            combineQueries(
              {
                $or: [
                  assignedToOfficer,
                  currentlyHeldByOfficer,
                ],
              },
              activeCases
            )
          ),

          // Cases currently held by this officer
          Case.countDocuments(
            combineQueries(
              currentlyHeldByOfficer,
              activeCases
            )
          ),

          // PWC / comments pending for assigned officer
          Case.countDocuments(
            combineQueries(
              assignedToOfficer,
              {
                $or: [
                  { judicialStatus: "PENDING_PWC" },
                  { stage: { $regex: /pwc|comments/i } },
                ],
              }
            )
          ),

          // Cases marked for closure
          Case.countDocuments(
            combineQueries(
              assignedToOfficer,
              {
                stage: { $regex: /to be closed/i },
              }
            )
          ),
        ]);

        /*
         * CA Not Filed:
         * Current Case schema does not contain a dedicated
         * CA filing status field. Therefore, no false count
         * is calculated from unrelated fields.
         */
        const caNotFiled = 0;

        let statusColor: "success" | "warning" | "danger" = "success";

        if (actionDue >= 5 || caNotFiled >= 3) {
          statusColor = "danger";
        } else if (actionDue > 0 || commentsNotSent > 0) {
          statusColor = "warning";
        }

        return {
          sNo: index + 1,
          officerId: officerId.toString(),
          officerName: officer.name,

          designation:
            officer.designation ||
            officer.rank ||
            officer.role ||
            "Staff Officer",

          sectionWing: officer.section || "Legal Cell",

          total,
          actionDue,
          commentsNotSent,
          caNotFiled,
          toBeClosed,
          status: statusColor,
        };
      })
    );

    return workload.filter(
      (item) =>
        item.total > 0 ||
        item.sectionWing?.toLowerCase().includes("legal") ||
        item.designation?.toLowerCase().includes("sp")
    );
  }

  // ---------------------------------------------------------
  // 5. MONTHLY HEARING CALENDAR HEATMAP
  // ---------------------------------------------------------

  static async getMonthlyHearingCalendar(
    month?: number,
    year?: number
  ) {
    const curYear = year || new Date().getFullYear();

    // Month is zero-based: January = 0, December = 11
    const curMonth =
      month !== undefined ? month : new Date().getMonth();

    const startOfMonth = new Date(curYear, curMonth, 1);

    const endOfMonth = new Date(
      curYear,
      curMonth + 1,
      0,
      23,
      59,
      59,
      999
    );

    const hearings = await Case.aggregate([
      {
        $match: {
          ndoh: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: {
            $dayOfMonth: "$ndoh",
          },

          count: {
            $sum: 1,
          },

          hasStayOrContempt: {
            $sum: {
              $cond: [
                {
                  $or: [
                    "$hasActiveStay",
                    "$isContemptNotice",
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    return {
      year: curYear,
      month: curMonth,

      days: hearings.map((hearing: any) => {
        const dateStr = `${curYear}-${String(
          curMonth + 1
        ).padStart(2, "0")}-${String(hearing._id).padStart(
          2,
          "0"
        )}`;

        return {
          day: hearing._id,
          dateStr,
          count: hearing.count,
          isHighRisk: hearing.hasStayOrContempt > 0,
        };
      }),
    };
  }

  // ---------------------------------------------------------
  // 6. CASES SCHEDULED ON A SPECIFIC HEARING DATE
  // ---------------------------------------------------------

  static async getCasesByHearingDate(dateString: string) {
    const targetDate = new Date(dateString);

    if (Number.isNaN(targetDate.getTime())) {
      throw new Error("Invalid hearing date provided.");
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const cases = await Case.find({
      ndoh: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .select(
        [
          "fileNo",
          "writNumber",
          "cnrNumber",
          "courtId",
          "courtCode",
          "benchLocation",
          "courtRoomNo",
          "leadPetitioner",
          "petitionerAdvocate",
          "assignedOIC",
          "stage",
          "hasActiveStay",
          "isContemptNotice",
        ].join(" ")
      )
      .sort({
        courtRoomNo: 1,
        fileNo: 1,
      })
      .lean();

    return cases;
  }
}
