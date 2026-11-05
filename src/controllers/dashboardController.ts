
import { Request, Response } from "express";
import { DashboardService } from "../services/dashboardService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { renderPdfDocument } from "../utils/pdfTemplate";

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error
    ? error.message
    : "An unexpected server error occurred.";
};

const getQueryString = (
  value: unknown
): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getQueryNumber = (
  value: unknown
): number | undefined => {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  if (String(value).trim() === "") return undefined;

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const escapeHtml = (value: unknown): string => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ---------------------------------------------------------
// 1. DASHBOARD KPI
// GET /dashboard/kpis
// ---------------------------------------------------------

export const getDashboardKpis = async (
  req: Request,
  res: Response
) => {
  try {
    const kpis = await DashboardService.getTopKpis();

    return res.status(200).json({
      success: true,
      data: kpis,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// ---------------------------------------------------------
// 2. WRIT CLASSIFICATION MATRIX
// GET /dashboard/matrix
// ---------------------------------------------------------

export const getWritClassificationMatrix = async (
  req: Request,
  res: Response
) => {
  try {
    const wing = getQueryString(req.query.wing);
    const courtCode = getQueryString(req.query.courtCode);
    const year = getQueryNumber(req.query.year);

    const matrix = await DashboardService.getClassificationMatrix({
      wing,
      courtCode,
      year,
    });

    return res.status(200).json({
      success: true,
      data: matrix,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// ---------------------------------------------------------
// 3. COURT FORUM DISTRIBUTION
// GET /dashboard/court-distribution
// ---------------------------------------------------------

export const getCourtForumDistribution = async (
  req: Request,
  res: Response
) => {
  try {
    const forum = await DashboardService.getCourtDistribution();

    return res.status(200).json({
      success: true,
      data: forum,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// ---------------------------------------------------------
// 4. OIC PENDING WORKLOAD
// GET /dashboard/oic-workload
// ---------------------------------------------------------

export const getOicPendingWorkload = async (
  req: Request,
  res: Response
) => {
  try {
    const workload = await DashboardService.getOicWorkloadRoster();

    return res.status(200).json({
      success: true,
      count: workload.length,
      data: workload,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// ---------------------------------------------------------
// 5. HEARING CALENDAR HEATMAP
// GET /dashboard/calendar-heatmap
// ---------------------------------------------------------

export const getHearingCalendarHeatmap = async (
  req: Request,
  res: Response
) => {
  try {
    const month = getQueryNumber(req.query.month);
    const year = getQueryNumber(req.query.year);

    // JavaScript months are zero-based: 0 = January, 11 = December
    if (
      month !== undefined &&
      (!Number.isInteger(month) || month < 0 || month > 11)
    ) {
      return res.status(400).json({
        success: false,
        message: "Month must be a number between 0 and 11.",
      });
    }

    if (
      year !== undefined &&
      (!Number.isInteger(year) || year < 1900 || year > 9999)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid year.",
      });
    }

    const calendar =
      await DashboardService.getMonthlyHearingCalendar(
        month,
        year
      );

    return res.status(200).json({
      success: true,
      data: calendar,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// ---------------------------------------------------------
// 6. CASES FOR A PARTICULAR HEARING DATE
// GET /dashboard/calendar-cases?date=YYYY-MM-DD
// ---------------------------------------------------------

export const getCasesForHearingDate = async (
  req: Request,
  res: Response
) => {
  try {
    const date = getQueryString(req.query.date);

    if (!date) {
      return res.status(400).json({
        success: false,
        message:
          "Date query parameter (YYYY-MM-DD) is required.",
      });
    }

    // Strict YYYY-MM-DD validation
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!dateMatch) {
      return res.status(400).json({
        success: false,
        message: "Date must be in YYYY-MM-DD format.",
      });
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const validatedDate = new Date(year, month - 1, day);

    if (
      validatedDate.getFullYear() !== year ||
      validatedDate.getMonth() !== month - 1 ||
      validatedDate.getDate() !== day
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid calendar date.",
      });
    }

    const cases =
      await DashboardService.getCasesByHearingDate(date);

    return res.status(200).json({
      success: true,
      count: cases.length,
      date,
      data: cases,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// ---------------------------------------------------------
// 7. EXPORT WRIT CLASSIFICATION MATRIX
// GET /dashboard/matrix/export-pdf
// ---------------------------------------------------------

export const exportMatrixPdf = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const wing = getQueryString(req.query.wing);
    const courtCode = getQueryString(req.query.courtCode);
    const year = getQueryNumber(req.query.year);

    const matrix = await DashboardService.getClassificationMatrix({
      wing,
      courtCode,
      year,
    });

    const rowsHtml = matrix.rows
      .map(
        (row) => `
          <tr>
            <td style="font-weight: 700;">
              ${escapeHtml(row.caseType)}
            </td>
            <td style="text-align: center;">
              ${row.atAGlance.previous}
            </td>
            <td style="text-align: center;">
              ${row.atAGlance.inCurrentMonth}
            </td>
            <td style="text-align: center; font-weight: 700;">
              ${row.atAGlance.total}
            </td>
            <td style="text-align: center;">
              ${row.closed.closed}
            </td>
            <td style="text-align: center;">
              ${row.closed.toBeClosed}
            </td>
            <td style="text-align: center;">
              ${row.pending.inBoard}
            </td>
            <td style="text-align: center;">
              ${row.pending.inUnits}
            </td>
            <td style="text-align: center;">
              ${row.pending.inCourt}
            </td>
            <td style="text-align: center;">
              ${row.representationPending.pwcInstructions}
            </td>
            <td style="text-align: center;">
              ${row.representationPending.allowedOff}
            </td>
            <td style="text-align: center;">
              ${row.representationPending.disposedOff}
            </td>
          </tr>
        `
      )
      .join("");

    const contentHtml = `
      <div style="
        font-size: 10px;
        font-weight: 800;
        color: #000000;
        text-transform: uppercase;
        margin: 10px 0 4px;
      ">
        WRIT CLASSIFICATION & DISPOSAL MATRIX
        (${escapeHtml(year ?? "All Years")} ·
        ${escapeHtml(courtCode ?? "All Courts")})
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align: middle;">
              Writ Type
            </th>
            <th colspan="3" style="text-align: center;">
              At A Glance
            </th>
            <th colspan="2" style="text-align: center;">
              Closed
            </th>
            <th colspan="3" style="text-align: center;">
              Pending
            </th>
            <th colspan="3" style="text-align: center;">
              Representation / Action
            </th>
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

          <tr style="
            background-color: #f1f5f9;
            font-weight: 800;
          ">
            <td>TOTAL</td>

            <td style="text-align: center;">
              ${matrix.summary.previous}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.inCurrentMonth}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.total}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.closed}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.toBeClosed}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.inBoard}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.inUnits}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.inCourt}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.instructionsPwc}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.allowedOff}
            </td>

            <td style="text-align: center;">
              ${matrix.summary.disposedOff}
            </td>
          </tr>
        </tbody>
      </table>
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle:
        "1.0 Institutional Writ Classification & Pendency Matrix",

      reportSubtitle: `
        Filter Scope:
        Wing: ${escapeHtml(wing ?? "All")} |
        Court: ${escapeHtml(courtCode ?? "All Courts")} |
        Year: ${escapeHtml(year ?? "All")}
      `,

      generatedBy: {
        name:
          req.user?.name ||
          req.user?.username ||
          "Legal Administrator",

        designation: req.user?.designation,
        role: req.user?.role,
      },

      filterMetaText: `Active Writs Indexed: ${matrix.summary.total}`,

      contentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(htmlOutput);
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
