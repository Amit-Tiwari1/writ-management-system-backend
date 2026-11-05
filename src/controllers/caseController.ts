import { Request, Response } from "express";
import { Case } from "../models/Case";
import { Petitioner } from "../models/Petitioner";
import { Discovery } from "../models/Discovery";
import { CaseHearingHistory } from "../models/CaseHearingHistory";
import { CaseMovementHistory } from "../models/CaseMovementHistory";
import {
  Court,
  CaseType,
  CaseCategory,
  CaseSubCategory,
  CaseSubject,
} from "../models/Masters";
import { CaseService } from "../services/caseService";
import { MockJudicialService } from "../services/mockJudicialService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";
import { NotificationService } from "../services/notificationService";
import { User } from "../models/User";
import { renderPdfDocument } from "../utils/pdfTemplate";

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

const buildCasesFilterQuery = async (queryParams: any) => {
  const {
    search,
    court,
    wing,
    caseType,
    category,
    subCategory,
    subject,
    oic,
    state,
    statusFilter,
    hearingDate,
  } = queryParams;

  const query: any = {};

  // Validate MongoDB ObjectId format
  const isValidObjectId = (value: any): boolean =>
    /^[0-9a-fA-F]{24}$/.test(String(value || "").trim());

  // 1. General search
  // Search only fields that exist as searchable strings in Case schema.
  if (search && String(search).trim().length >= 3) {
    const searchRegex = new RegExp(
      String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

    query.$or = [
      { fileNo: searchRegex },
      { noticeNumber: searchRegex },
      { writNumber: searchRegex },
      { cnrNumber: searchRegex },
      { caseNumber: searchRegex },
      { leadPetitioner: searchRegex },
      { respondentString: searchRegex },
      { courtCode: searchRegex },
      { sectionWing: searchRegex },
    ];
  }

  // 2. Court filter
  // Frontend should send courtId.
  // Non-ObjectId values are treated as courtCode for compatibility.
  if (court && court !== "ALL" && court !== "All Courts") {
    const courtValue = String(court).trim();

    if (isValidObjectId(courtValue)) {
      query.courtId = courtValue;
    } else {
      query.courtCode = courtValue;
    }
  }

  // 3. Section / Wing filter
  if (wing && wing !== "ALL" && wing !== "All Wings") {
    query.sectionWing = String(wing).trim();
  }

  // 4. Case Type filter
  if (caseType && caseType !== "ALL" && caseType !== "All Case Types") {
    if (!isValidObjectId(caseType)) {
      query._id = { $in: [] };
    } else {
      query.caseTypeId = caseType;
    }
  }

  // 5. Category filter
  if (category && category !== "ALL" && category !== "All Categories") {
    if (!isValidObjectId(category)) {
      query._id = { $in: [] };
    } else {
      query.categoryId = category;
    }
  }

  // 6. Sub-category filter
  if (
    subCategory &&
    subCategory !== "ALL" &&
    subCategory !== "All Sub-Categories"
  ) {
    if (!isValidObjectId(subCategory)) {
      query._id = { $in: [] };
    } else {
      query.subCategoryId = subCategory;
    }
  }

  // 7. Subject filter
  if (subject && subject !== "ALL" && subject !== "All Dispute Issues") {
    if (!isValidObjectId(subject)) {
      query._id = { $in: [] };
    } else {
      query.subjectId = subject;
    }
  }

  // 8. Assigned OIC filter
  // assignedOIC is now a User ObjectId, not a name string.
  if (oic && oic !== "ALL" && oic !== "All Nodal Officers") {
    if (!isValidObjectId(oic)) {
      query._id = { $in: [] };
    } else {
      query.assignedOIC = oic;
    }
  }

  // 9. State filter
  // State is stored against Petitioner, not directly in Case.
  // Find matching Case IDs through Petitioner records.
  if (state && state !== "ALL" && state !== "All States") {
    if (!isValidObjectId(state)) {
      query._id = { $in: [] };
    } else {
      const matchingCaseIds = await Petitioner.distinct("caseId", {
        stateId: state,
      });

      query._id = {
        ...(query._id || {}),
        $in: matchingCaseIds,
      };
    }
  }

  // 10. Hearing date filter
  if (hearingDate) {
    const selectedDate = new Date(String(hearingDate));

    if (!Number.isNaN(selectedDate.getTime())) {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);

      query.ndoh = {
        $gte: start,
        $lte: end,
      };
    }
  }

  // 11. Status filters
  if (statusFilter === "with_connected") {
    query["connectedWrits.0"] = { $exists: true };
  } else if (statusFilter === "advance_notice") {
    query.identifierTier = 2;
  } else if (statusFilter === "stay") {
    query.hasActiveStay = true;
  } else if (statusFilter === "contempt") {
    query.isContemptNotice = true;
  }

  return query;
};

export const getCasesRegister = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Build filters (async because State filter uses Petitioner collection)
    const query = await buildCasesFilterQuery(req.query);

    // Pagination validation
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);

    // Prevent excessively large requests
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 10),
    );

    const skip = (pageNum - 1) * limitNum;

    // Fetch cases and total count
    const [cases, total] = await Promise.all([
      Case.find(query)
        .populate("courtId", "courtName shortCode")
        .populate("caseTypeId", "caseTypeName shortName")
        .populate("categoryId", "categoryName")
        .populate("subCategoryId", "subCategoryName")
        .populate("subjectId", "subjectTitle")
        .populate("assignedOIC", "name email designation")
        .populate("assignedPairokar", "name email designation")
        .sort({ ndoh: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Case.countDocuments(query),
    ]);

    // Dashboard metrics
    const [allCount, connectedCount, noticeCount, stayCount, contemptCount] =
      await Promise.all([
        Case.countDocuments({}),
        Case.countDocuments({
          "connectedWrits.0": { $exists: true },
        }),
        Case.countDocuments({
          identifierTier: 2,
        }),
        Case.countDocuments({
          hasActiveStay: true,
        }),
        Case.countDocuments({
          isContemptNotice: true,
        }),
      ]);

    return res.status(200).json({
      success: true,
      data: cases,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      pillsMetrics: {
        all: allCount,
        withConnected: connectedCount,
        advanceNotice: noticeCount,
        stayInForce: stayCount,
        contemptAlerts: contemptCount,
      },
    });
  } catch (error: any) {
    console.error("[getCasesRegister Error]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch case register.",
    });
  }
};

export const exportCasesController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { format = "csv" } = req.query;

    // buildCasesFilterQuery is async because State filter uses Petitioner collection.
    const query = await buildCasesFilterQuery(req.query);

    const cases = await Case.find(query)
      .populate("courtId", "courtName shortCode")
      .populate("caseTypeId", "caseTypeName shortName")
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName")
      .populate("subjectId", "subjectTitle")
      .populate("assignedOIC", "name email designation")
      .populate("assignedPairokar", "name email designation")
      .sort({ ndoh: 1, createdAt: -1 })
      .lean();

    // Safe text conversion
    const escapeHtml = (value: any): string =>
      String(value ?? "--")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const escapeCsv = (value: any): string => {
      const text = String(value ?? "--").replace(/"/g, '""');
      return `"${text}"`;
    };

    const getMasterName = (value: any, field: string): string => {
      if (!value) return "--";

      if (typeof value === "object") {
        return value[field] || "--";
      }

      return "--";
    };

    const getUserName = (value: any): string => {
      if (!value) return "Unassigned";

      if (typeof value === "object") {
        return value.name || value.email || "Unassigned";
      }

      return "Unassigned";
    };

    const getCourtName = (c: any): string => {
      const name = getMasterName(c.courtId, "courtName");
      return name === "--" ? c.courtCode || "--" : name;
    };

    if (format === "pdf") {
      const rowsHtml = cases
        .map(
          (c: any, idx: number) => `
            <tr>
              <td style="text-align: center; font-weight: 700;">
                ${idx + 1}
              </td>

              <td style="font-family: monospace; font-weight: 800; color: #0f2744;">
                ${escapeHtml(c.fileNo)}
              </td>

              <td style="font-weight: 700; color: #1e40af;">
                ${escapeHtml(c.writNumber || c.noticeNumber || "--")}
              </td>

              <td>
                ${escapeHtml(getCourtName(c))}
                <span style="color:#64748b;">
                  (${escapeHtml(c.benchLocation || "ALD")})
                </span>
              </td>

              <td style="font-weight: 600;">
                ${escapeHtml(c.leadPetitioner)}
              </td>

              <td>
                ${escapeHtml(getUserName(c.assignedOIC))}
              </td>

              <td style="font-size: 8.5px; font-weight: 700; text-align: center;">
                <span style="color: ${
                  c.hasActiveStay
                    ? "#b91c1c"
                    : c.isContemptNotice
                      ? "#c2410c"
                      : "#1e293b"
                };">
                  ${escapeHtml(
                    c.hasActiveStay
                      ? "STAY ACTIVE"
                      : c.isContemptNotice
                        ? "CONTEMPT"
                        : c.stage || "REGISTERED",
                  )}
                </span>
              </td>
            </tr>
          `,
        )
        .join("");

      const contentHtml = `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">#</th>
              <th style="width: 110px;">File Docket No</th>
              <th style="width: 110px;">Writ / Notice No</th>
              <th>Court & Bench</th>
              <th>Lead Petitioner</th>
              <th>Assigned OIC</th>
              <th style="width: 90px; text-align: center;">Judicial Stage</th>
            </tr>
          </thead>

          <tbody>
            ${
              cases.length > 0
                ? rowsHtml
                : `
                  <tr>
                    <td colspan="7" style="text-align:center; padding: 16px; color:#94a3b8;">
                      No dockets matching filter criteria.
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      `;

      const filterSummary =
        [
          req.query.court && req.query.court !== "ALL"
            ? `Court: ${req.query.court}`
            : null,

          req.query.caseType && req.query.caseType !== "ALL"
            ? `Type: ${req.query.caseType}`
            : null,

          req.query.category && req.query.category !== "ALL"
            ? `Category: ${req.query.category}`
            : null,

          req.query.wing && req.query.wing !== "ALL"
            ? `Wing: ${req.query.wing}`
            : null,

          req.query.oic && req.query.oic !== "ALL"
            ? `OIC: ${req.query.oic}`
            : null,

          req.query.search ? `Search: "${req.query.search}"` : null,
        ]
          .filter(Boolean)
          .join(" | ") || "All Registered Cases";

      const fullHtml = renderPdfDocument({
        reportTitle: "Writ Litigation Master Registry Register",
        reportSubtitle: `Consolidated Dossier · Total Filtered Records: ${cases.length}`,
        generatedBy: {
          name: req.user?.name || req.user?.username || "Legal Officer",
          designation: req.user?.designation,
          role: req.user?.role,
        },
        filterMetaText: filterSummary,
        contentHtml,
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");

      return res.status(200).send(fullHtml);
    }

    // CSV Export
    const headers = [
      "File Docket No",
      "Writ Number",
      "Notice Number",
      "CNR Number",
      "Court",
      "Bench",
      "Case Type",
      "Category",
      "Sub Category",
      "Dispute Subject",
      "Lead Petitioner",
      "Respondent",
      "Assigned OIC",
      "Pairokar",
      "Section Wing",
      "NDOH",
      "Stage",
      "Stay in Force",
      "Contempt Alert",
    ];

    const rows = cases.map((c: any) => [
      escapeCsv(c.fileNo),
      escapeCsv(c.writNumber),
      escapeCsv(c.noticeNumber),
      escapeCsv(c.cnrNumber),
      escapeCsv(getCourtName(c)),
      escapeCsv(c.benchLocation),
      escapeCsv(getMasterName(c.caseTypeId, "caseTypeName")),
      escapeCsv(getMasterName(c.categoryId, "categoryName")),
      escapeCsv(getMasterName(c.subCategoryId, "subCategoryName")),
      escapeCsv(getMasterName(c.subjectId, "subjectTitle")),
      escapeCsv(c.leadPetitioner),
      escapeCsv(c.respondentString),
      escapeCsv(getUserName(c.assignedOIC)),
      escapeCsv(getUserName(c.assignedPairokar)),
      escapeCsv(c.sectionWing),
      escapeCsv(c.ndoh ? new Date(c.ndoh).toLocaleDateString("en-GB") : "--"),
      escapeCsv(c.stage),
      c.hasActiveStay ? "YES" : "NO",
      c.isContemptNotice ? "YES" : "NO",
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=UPPRPB_Cases_${Date.now()}.csv`,
    );

    return res.status(200).send("\uFEFF" + csvContent);
  } catch (error: any) {
    console.error("[exportCasesController Error]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export cases.",
    });
  }
};

export const getCaseById = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Case ID.",
      });
    }

    const caseDoc = await Case.findById(id)
      .populate("courtId", "courtName shortCode location")
      .populate("caseTypeId", "caseTypeName shortName")
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName defaultOfficerName")
      .populate("subjectId", "subjectTitle")
      .populate("assignedOIC", "name email designation role")
      .populate("assignedPairokar", "name email designation role")
      .populate("internalHold.currentHolderId", "name email designation")
      .populate(
        "connectedWrits.caseId",
        "fileNo writNumber noticeNumber cnrNumber",
      )
      .lean();

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const [petitioners, hearings] = await Promise.all([
      Petitioner.find({
        caseId: caseDoc._id,
      })
        .populate("stateId", "stateName stateCode")
        .populate("districtId", "districtName")
        .sort({
          role: 1,
          createdAt: 1,
        })
        .lean(),

      CaseHearingHistory.find({
        caseId: caseDoc._id,
      })
        .sort({
          hearingDate: -1,
        })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      case: caseDoc,
      petitioners,
      hearings,
    });
  } catch (error: any) {
    console.error("[getCaseById Error]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch case details.",
    });
  }
};

export const registerCaseIntake = async (req: AuthRequest, res: Response) => {
  const session = await Case.db.startSession();

  let createdCase: any = null;
  let notificationRecipient: any = null;

  try {
    const {
      mode,
      noticeNumber,
      writNumber,
      cnrNumber,
      courtId,
      courtCode,
      caseTypeId,
      caseNumber,
      caseYear,
      benchLocation,
      courtRoomNo,
      coramBench,
      categoryId,
      subCategoryId,
      subjectId,
      leadPetitioner,
      leadPetitionerRollNo,
      leadPetitionerFatherName,
      stateId,
      districtId,
      respondentString,
      petitionerAdvocate,
      stateCounsel,
      assignedOIC,
      assignedPairokar,
      sectionWing,
      examCycle,
      hasActiveStay,
      isContemptNotice,
      ndoh,
      petitioners = [],
    } = req.body;
    const isValidObjectId = (value: any): boolean =>
      typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value.trim());

    const requiredString = (value: any): boolean =>
      typeof value === "string" && value.trim().length > 0;

    const parseBoolean = (value: any, fieldName: string): boolean => {
      if (value === undefined || value === null || value === "") {
        return false;
      }

      if (value === true || value === "true" || value === 1 || value === "1") {
        return true;
      }

      if (
        value === false ||
        value === "false" ||
        value === 0 ||
        value === "0"
      ) {
        return false;
      }

      throw new Error(`Invalid boolean value for ${fieldName}.`);
    };

    const normalizeOptionalString = (value: any, fallback = ""): string => {
      if (typeof value !== "string") return fallback;

      const normalized = value.trim();
      return normalized || fallback;
    };

    // --------------------------------------------------
    // 2. Required field validation
    // --------------------------------------------------

    if (
      !requiredString(leadPetitioner) ||
      !requiredString(leadPetitionerRollNo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Lead petitioner name and roll number are required.",
      });
    }

    const requiredIds = [
      { field: "courtId", value: courtId },
      { field: "caseTypeId", value: caseTypeId },
      { field: "categoryId", value: categoryId },
      { field: "subCategoryId", value: subCategoryId },
      { field: "subjectId", value: subjectId },
      { field: "assignedOIC", value: assignedOIC },
      { field: "assignedPairokar", value: assignedPairokar },
    ];

    for (const item of requiredIds) {
      if (!isValidObjectId(item.value)) {
        return res.status(400).json({
          success: false,
          message: `Valid ${item.field} is required.`,
        });
      }
    }

    if (!Array.isArray(petitioners)) {
      return res.status(400).json({
        success: false,
        message: "Petitioners must be provided as an array.",
      });
    }

    for (let i = 0; i < petitioners.length; i++) {
      if (!requiredString(petitioners[i]?.name)) {
        return res.status(400).json({
          success: false,
          message: `Name is required for co-petitioner at position ${i + 1}.`,
        });
      }
    }

    if (stateId && !isValidObjectId(stateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stateId.",
      });
    }

    if (districtId && !isValidObjectId(districtId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid districtId.",
      });
    }

    if (districtId && !stateId) {
      return res.status(400).json({
        success: false,
        message: "stateId is required when districtId is provided.",
      });
    }

    const activeStay = parseBoolean(hasActiveStay, "hasActiveStay");
    const contemptNotice = parseBoolean(isContemptNotice, "isContemptNotice");

    let nextHearingDate: Date | null = null;

    if (ndoh) {
      nextHearingDate = new Date(ndoh);

      if (Number.isNaN(nextHearingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid next date of hearing.",
        });
      }
    }

    // --------------------------------------------------
    // 3. Validate mode and external identifiers
    // --------------------------------------------------

    const normalizedMode = normalizeOptionalString(
      mode,
      "MANUAL",
    ).toUpperCase();

    if (!["MANUAL", "NOTICE", "WRIT", "CNR"].includes(normalizedMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid case registration mode.",
      });
    }

    const normalizedNoticeNumber = normalizeOptionalString(noticeNumber);
    const normalizedWritNumber = normalizeOptionalString(writNumber);
    const normalizedCnrNumber =
      normalizeOptionalString(cnrNumber).toUpperCase();

    if (normalizedMode === "NOTICE" && !normalizedNoticeNumber) {
      return res.status(400).json({
        success: false,
        message: "Notice number is required for NOTICE registration.",
      });
    }

    if (normalizedMode === "WRIT" && !normalizedWritNumber) {
      return res.status(400).json({
        success: false,
        message: "Writ number is required for WRIT registration.",
      });
    }

    if (normalizedMode === "CNR" && !normalizedCnrNumber) {
      return res.status(400).json({
        success: false,
        message: "CNR number is required for CNR registration.",
      });
    }

    // --------------------------------------------------
    // 4. Validate logged-in user
    // --------------------------------------------------

    const loggedInUserId = req.user?.id;

    if (!loggedInUserId || !isValidObjectId(String(loggedInUserId))) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing or invalid.",
      });
    }

    // --------------------------------------------------
    // 5. Database transaction
    // --------------------------------------------------

    await session.withTransaction(async () => {
      // 5.1 Duplicate external identifier check
      const duplicateCheck = await CaseService.checkDuplicate(
        {
          noticeNumber: normalizedNoticeNumber || undefined,
          writNumber: normalizedWritNumber || undefined,
          cnrNumber: normalizedCnrNumber || undefined,
        },
        session,
        {
          includeExternalIdentifiers: true,
        },
      );

      if (duplicateCheck.exists) {
        const duplicateError: any = new Error(
          "Duplicate litigation docket detected.",
        );

        duplicateError.statusCode = 409;
        duplicateError.matchedCase = duplicateCheck.matchedCase;

        throw duplicateError;
      }

      // 5.2 Validate Court
      const courtDoc = await Court.findById(courtId).session(session);

      if (!courtDoc) {
        throw new Error("Selected court does not exist.");
      }

      // 5.3 Validate Case Type and Court relationship
      const caseTypeDoc = await CaseType.findById(caseTypeId).session(session);

      if (!caseTypeDoc) {
        throw new Error("Selected case type does not exist.");
      }

      if (String(caseTypeDoc.courtId) !== String(courtDoc._id)) {
        throw new Error(
          "Selected case type does not belong to the selected court.",
        );
      }

      // 5.4 Validate Category
      const categoryDoc =
        await CaseCategory.findById(categoryId).session(session);

      if (!categoryDoc) {
        throw new Error("Selected case category does not exist.");
      }

      // 5.5 Validate Sub-category and Category relationship
      const subCategoryDoc =
        await CaseSubCategory.findById(subCategoryId).session(session);

      if (!subCategoryDoc) {
        throw new Error("Selected sub-category does not exist.");
      }

      if (String(subCategoryDoc.categoryId) !== String(categoryDoc._id)) {
        throw new Error(
          "Selected sub-category does not belong to the selected category.",
        );
      }

      // 5.6 Validate Subject and its hierarchy
      const subjectDoc = await CaseSubject.findById(subjectId).session(session);

      if (!subjectDoc) {
        throw new Error("Selected dispute subject does not exist.");
      }

      if (
        String(subjectDoc.categoryId) !== String(categoryDoc._id) ||
        String(subjectDoc.subCategoryId) !== String(subCategoryDoc._id)
      ) {
        throw new Error(
          "Selected subject does not belong to the selected category and sub-category.",
        );
      }

      // 5.7 Validate OIC
      const oicUser = await User.findById(assignedOIC).session(session);

      if (!oicUser) {
        throw new Error("Selected OIC user does not exist.");
      }

      if (oicUser.status !== "ACTIVE") {
        throw new Error("Selected OIC user is not active.");
      }

      // 5.8 Validate Pairokar
      const pairokarUser =
        await User.findById(assignedPairokar).session(session);

      if (!pairokarUser) {
        throw new Error("Selected Pairokar user does not exist.");
      }

      if (pairokarUser.status !== "ACTIVE") {
        throw new Error("Selected Pairokar user is not active.");
      }

      // 5.9 Generate file number inside transaction
      const fileNo = await CaseService.generateNextFileNo(session);

      // 5.10 Determine identifier tier and sync status
      let tier: 1 | 2 | 3 | 4 = 1;
      let syncStatus: "MANUAL_DOCKET" | "SCHEDULED" = "MANUAL_DOCKET";

      if (normalizedMode === "CNR") {
        tier = 4;
        syncStatus = "SCHEDULED";
      } else if (normalizedMode === "WRIT") {
        tier = 3;
      } else if (normalizedMode === "NOTICE") {
        tier = 2;
      }

      const holderLocation = `${oicUser.designation || "OIC"} (${oicUser.name})`;

      // 5.11 Create Case
      const casePayload = {
        fileNo,

        noticeNumber: normalizedNoticeNumber,
        writNumber: normalizedWritNumber,
        cnrNumber: normalizedCnrNumber,

        identifierTier: tier,

        courtId: courtDoc._id,
        courtCode: courtDoc.shortCode || normalizeOptionalString(courtCode),

        caseTypeId: caseTypeDoc._id,

        caseNumber: normalizeOptionalString(caseNumber),
        caseYear: caseYear ? Number(caseYear) : new Date().getFullYear(),

        benchLocation: benchLocation || "Allahabad",
        courtRoomNo: normalizeOptionalString(courtRoomNo, "--"),
        coramBench: normalizeOptionalString(coramBench, "--"),

        categoryId: categoryDoc._id,
        subCategoryId: subCategoryDoc._id,
        subjectId: subjectDoc._id,

        leadPetitioner: leadPetitioner.trim(),

        respondentString: normalizeOptionalString(
          respondentString,
          "State of U.P. & Chairman UPPRPB",
        ),

        petitionerAdvocate: normalizeOptionalString(petitionerAdvocate, "--"),

        stateCounsel: normalizeOptionalString(
          stateCounsel,
          "Chief Standing Counsel (CSC)",
        ),

        assignedOIC: oicUser._id,
        assignedPairokar: pairokarUser._id,

        sectionWing: normalizeOptionalString(sectionWing, "Recruitment Wing"),

        examCycle: normalizeOptionalString(examCycle, "2023-24"),

        hasActiveStay: activeStay,
        isContemptNotice: contemptNotice,

        ndoh: nextHearingDate,

        coPetitionersCount: 1 + petitioners.length,

        syncStatus,

        internalHold: {
          currentHolderId: oicUser._id,
          location: holderLocation,
          holdDays: 0,
          heldSince: new Date(),
        },
      };

      const createdCases = await Case.create([casePayload], {
        session,
      });

      createdCase = createdCases[0];

      // 5.12 Create Lead Petitioner
      const leadPetitionerPayload: any = {
        caseId: createdCase._id,
        fileNo: createdCase.fileNo,
        rollNo: leadPetitionerRollNo.trim(),
        name: leadPetitioner.trim(),
        fatherName: normalizeOptionalString(leadPetitionerFatherName, "--"),
        role: "Lead Petitioner",
        postClaimed: subjectDoc.subjectTitle,
        status: "ACTIVE",
        source: "MANUAL_ENTRY",
      };

      if (stateId) {
        leadPetitionerPayload.stateId = stateId;
      }

      if (districtId) {
        leadPetitionerPayload.districtId = districtId;
      }

      await Petitioner.create([leadPetitionerPayload], {
        session,
      });

      // 5.13 Create Co-Petitioners
      if (petitioners.length > 0) {
        const coPetitionerDocs = petitioners.map((p: any, index: number) => {
          const petitionerPayload: any = {
            caseId: createdCase._id,
            fileNo: createdCase.fileNo,

            // Deterministic fallback instead of random roll number
            rollNo: normalizeOptionalString(
              p.rollNo,
              `${createdCase.fileNo}-CP-${index + 1}`,
            ),

            registrationNo: normalizeOptionalString(p.registrationNo, "--"),

            name: p.name.trim(),

            fatherName: normalizeOptionalString(p.fatherName, "--"),

            role: "Co-Petitioner",

            categoryClaimed: normalizeOptionalString(
              p.categoryClaimed,
              "General",
            ),

            postClaimed: normalizeOptionalString(
              p.postClaimed,
              subjectDoc.subjectTitle,
            ),

            status: "ACTIVE",
            source: "MANUAL_ENTRY",
          };

          if (p.stateId) {
            if (!isValidObjectId(p.stateId)) {
              throw new Error(
                `Invalid stateId for co-petitioner ${index + 1}.`,
              );
            }

            petitionerPayload.stateId = p.stateId;
          }

          if (p.districtId) {
            if (!isValidObjectId(p.districtId)) {
              throw new Error(
                `Invalid districtId for co-petitioner ${index + 1}.`,
              );
            }

            if (!p.stateId) {
              throw new Error(
                `stateId is required for co-petitioner ${index + 1} when districtId is provided.`,
              );
            }

            petitionerPayload.districtId = p.districtId;
          }

          return petitionerPayload;
        });

        await Petitioner.insertMany(coPetitionerDocs, {
          session,
          ordered: true,
        });
      }

      // 5.14 Initial internal file movement
      await CaseService.recordFileMovement(
        {
          caseId: createdCase._id,
          fileNo: createdCase.fileNo,

          fromUser: {
            id: loggedInUserId,
            name: req.user?.name || "Registry Desk",
            designation: req.user?.designation || "Case Intake Desk",
          },

          toUser: {
            id: oicUser._id,
            name: oicUser.name,
            designation: oicUser.designation || "OIC Desk",
          },

          actionType: "INITIAL_INTAKE",

          notingPurpose: "Case Docket Ingestion & Initial OIC Assignment",

          receivedAt: createdCase.createdAt,
        },
        session,
      );

      // 5.15 Initial Hearing entry
      if (nextHearingDate) {
        await CaseHearingHistory.create(
          [
            {
              caseId: createdCase._id,
              fileNo: createdCase.fileNo,

              hearingDate: new Date(),
              ndoh: nextHearingDate,

              courtRoomNo: createdCase.courtRoomNo,
              judgeCoram: createdCase.coramBench,

              stageOfCase: "Fresh Admission",

              businessRecorded: "Initial intake registered in court registry",

              orderType: "ADJOURNMENT",
              source: "MANUAL_ENTRY",

              enteredByUserId: loggedInUserId,

              enteredByOfficerName: req.user?.name || "Intake Desk",

              enteredByDesignation:
                req.user?.designation || "Dealing Assistant",
            },
          ],
          { session },
        );
      }

      notificationRecipient = {
        recipientId: oicUser._id,
        caseId: createdCase._id,
        fileNo: createdCase.fileNo,
        title: `New Case Assigned: ${createdCase.fileNo}`,
        message: `Docket ${
          createdCase.writNumber ||
          createdCase.noticeNumber ||
          createdCase.cnrNumber ||
          createdCase.fileNo
        } (${createdCase.leadPetitioner}) has been assigned to your desk as OIC.`,
        isUrgent: createdCase.hasActiveStay || createdCase.isContemptNotice,
        senderName: req.user?.name || "Registry Officer",
        senderDesignation: req.user?.designation || "Case Intake Desk",
      };
    });

    // --------------------------------------------------
    // 6. Post-commit operations
    // --------------------------------------------------

    // Email/notification is intentionally outside the transaction.
    // External email should not be sent before the database commit.
    if (notificationRecipient) {
      try {
        await NotificationService.sendNotification({
          ...notificationRecipient,
          type: "HEARING_REMINDER",
        });
      } catch (notificationError: any) {
        console.error(
          "[OIC Intake Notification Error]:",
          notificationError.message,
        );
      }
    }

    // Audit logging is also called after successful transaction.
    await logAuditEvent(
      req,
      "CASE_INTAKE_REGISTERED" as any,
      "CASE_HUB",
      createdCase._id.toString(),
      {
        fileNo: createdCase.fileNo,
        identifierTier: createdCase.identifierTier,
        leadPetitioner: createdCase.leadPetitioner,
      },
      "INFO",
    );

    return res.status(201).json({
      success: true,
      message: "Case docket successfully ingested.",
      case: createdCase,
    });
  } catch (error: any) {
    console.error("[registerCaseIntake Error]:", error);

    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        matchedCase: error.matchedCase,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A record with the same unique identifier already exists.",
      });
    }

    if (error.message?.includes("Transaction")) {
      return res.status(500).json({
        success: false,
        message:
          "Case registration transaction failed. Please verify database transaction support.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to register case.",
    });
  } finally {
    await session.endSession();
  }
};

export const checkDuplicateDocket = async (req: Request, res: Response) => {
  try {
    const { fileNo, noticeNumber, writNumber, cnrNumber } = req.query;

    const normalizeIdentifier = (value: any): string | undefined => {
      if (value === undefined || value === null) {
        return undefined;
      }

      const normalized = String(value).trim();

      return normalized.length > 0 ? normalized : undefined;
    };

    const normalizedFileNo = normalizeIdentifier(fileNo);
    const normalizedNoticeNumber = normalizeIdentifier(noticeNumber);
    const normalizedWritNumber = normalizeIdentifier(writNumber);
    const normalizedCnrNumber = normalizeIdentifier(cnrNumber)?.toUpperCase();

    if (
      !normalizedFileNo &&
      !normalizedNoticeNumber &&
      !normalizedWritNumber &&
      !normalizedCnrNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one identifier (fileNo, noticeNumber, writNumber or cnrNumber) is required.",
      });
    }

    const result = await CaseService.checkDuplicate(
      {
        fileNo: normalizedFileNo,
        noticeNumber: normalizedNoticeNumber,
        writNumber: normalizedWritNumber,
        cnrNumber: normalizedCnrNumber,
      },
      undefined,
      {
        includeExternalIdentifiers: true,
      },
    );

    return res.status(200).json({
      success: true,
      exists: result.exists,
      matchedCase: result.matchedCase || null,
    });
  } catch (error: any) {
    console.error("[checkDuplicateDocket Error]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check duplicate docket.",
    });
  }
};

export const recordHearingProceeding = async (
  req: AuthRequest,
  res: Response,
) => {
  const session = await Case.db.startSession();

  try {
    const id = getParam(req.params.id);

    const {
      hearingDate,
      ndoh,
      courtRoomNo,
      judgeCoram,
      listingItemNo,
      stageOfCase,
      businessRecorded,
      orderType,
      orderDocId,
      orderDocumentUrl,
    } = req.body;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Case ID.",
      });
    }

    const userId = req.user?.id;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(String(userId))) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing or invalid.",
      });
    }
    if (
      !hearingDate ||
      typeof businessRecorded !== "string" ||
      !businessRecorded.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Hearing date and business recorded description are mandatory.",
      });
    }

    const parsedHearingDate = new Date(hearingDate);
    if (Number.isNaN(parsedHearingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid hearing date.",
      });
    }

    let parsedNdoh: Date | null = null;
    if (ndoh !== undefined && ndoh !== null && ndoh !== "") {
      parsedNdoh = new Date(ndoh);

      if (Number.isNaN(parsedNdoh.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid next date of hearing.",
        });
      }

      if (parsedNdoh < parsedHearingDate) {
        return res.status(400).json({
          success: false,
          message: "Next date of hearing cannot be earlier than hearing date.",
        });
      }
    }
    const normalizeOptionalString = (value: unknown): string | undefined => {
      if (typeof value !== "string") return undefined;

      const normalized = value.trim();
      return normalized || undefined;
    };

    const normalizedBusinessRecorded = businessRecorded.trim();

    type HearingOrderType = NonNullable<
      Parameters<typeof CaseService.updateHearingProceedings>[0]["orderType"]
    >;

    const normalizedOrderType = normalizeOptionalString(orderType) as
      | HearingOrderType
      | undefined;

    if (orderType !== undefined && orderType !== null) {
      if (typeof orderType !== "string" || !orderType.trim()) {
        return res.status(400).json({
          success: false,
          message: "Invalid order type.",
        });
      }
    }

    let result: any;

    await session.withTransaction(async () => {
      result = await CaseService.updateHearingProceedings(
        {
          caseId: id,
          hearingDate: parsedHearingDate,
          ndoh: parsedNdoh,

          courtRoomNo: normalizeOptionalString(courtRoomNo),
          judgeCoram: normalizeOptionalString(judgeCoram),
          listingItemNo: normalizeOptionalString(listingItemNo),
          stageOfCase: normalizeOptionalString(stageOfCase),
          businessRecorded: normalizedBusinessRecorded,
          orderType: normalizedOrderType,
          orderDocId: normalizeOptionalString(orderDocId),
          orderDocumentUrl: normalizeOptionalString(orderDocumentUrl),
          source: "MANUAL_ENTRY",
        },
        {
          id: userId,
          name: req.user?.name || req.user?.username,
          designation: req.user?.designation,
        },
        session,
      );
    });

    if (!result?.caseDoc || !result?.historyRecord) {
      return res.status(500).json({
        success: false,
        message: "Hearing proceeding update returned incomplete data.",
      });
    }
    await logAuditEvent(
      req,
      "CASE_HEARING_UPDATED" as any,
      "CASE_HUB",
      id,
      {
        fileNo: result.caseDoc.fileNo,
        hearingDate: parsedHearingDate,
        ndoh: result.caseDoc.ndoh,
        orderType: normalizedOrderType,
      },
      "INFO",
    );

    return res.status(200).json({
      success: true,
      message: "Hearing proceeding recorded and next date updated.",
      case: result.caseDoc,
      history: result.historyRecord,
    });
  } catch (error: any) {
    console.error("[recordHearingProceeding Error]:", error);

    const statusCode =
      error.statusCode ||
      error.status ||
      (error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record hearing proceeding.",
    });
  } finally {
    await session.endSession();
  }
};

export const rollbackHearingUpdateController = async (
  req: AuthRequest,
  res: Response,
) => {
  const session = await Case.db.startSession();

  try {
    const historyId = getParam(req.params.historyId);

    // 1. Validate Hearing History ID
    if (!/^[0-9a-fA-F]{24}$/.test(historyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hearing history ID.",
      });
    }

    // 2. Validate authenticated user
    const userId = req.user?.id;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(String(userId))) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing or invalid.",
      });
    }

    let restoredCase: any = null;

    // 3. Restore Case and record rollback atomically
    await session.withTransaction(async () => {
      restoredCase = await CaseService.rollbackHearingUpdate(
        historyId,
        {
          id: userId,
          name: req.user?.name || req.user?.username,
          designation: req.user?.designation,
        },
        session,
      );
    });

    // 4. Audit after successful transaction commit
    await logAuditEvent(
      req,
      "CASE_HEARING_ROLLBACK" as any,
      "CASE_HUB",
      restoredCase._id.toString(),
      {
        fileNo: restoredCase.fileNo,
        restoredNdoh: restoredCase.ndoh,
        rollbackHistoryId: historyId,
      },
      "WARNING",
    );

    return res.status(200).json({
      success: true,
      message:
        "Hearing date and stage successfully reverted to previous snapshot.",
      case: restoredCase,
    });
  } catch (error: any) {
    console.error("[rollbackHearingUpdateController Error]:", error);

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to rollback hearing update.",
    });
  } finally {
    await session.endSession();
  }
};

export const applyCaseActionMappingController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const id = getParam(req.params.id);

    const {
      actionMappingId,
      courtDecisionOutcome,
      actionStatus,
      requiresComplianceDeadline,
      defaultDeadlineDays,
      customDeadlineDays,
      exactDeadlineDate,
      orderDate,
      courtDirections,
      stayScope,
      recordType,
    } = req.body;

    // Mandatory fields
    if (!id || !courtDecisionOutcome?.trim?.() || !orderDate) {
      return res.status(400).json({
        success: false,
        message:
          "Case ID, court decision outcome and order date are mandatory.",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing.",
      });
    }

    // Validate order date
    const parsedOrderDate = new Date(orderDate);

    if (Number.isNaN(parsedOrderDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid order date.",
      });
    }

    // Validate optional exact deadline
    let parsedExactDeadlineDate: Date | undefined;

    if (exactDeadlineDate) {
      parsedExactDeadlineDate = new Date(exactDeadlineDate);

      if (Number.isNaN(parsedExactDeadlineDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid exact compliance deadline date.",
        });
      }

      if (parsedExactDeadlineDate < parsedOrderDate) {
        return res.status(400).json({
          success: false,
          message: "Compliance deadline cannot be earlier than the order date.",
        });
      }
    }

    // Parse boolean safely. Boolean("false") incorrectly returns true.
    let parsedRequiresComplianceDeadline = false;

    if (requiresComplianceDeadline !== undefined) {
      if (
        requiresComplianceDeadline === true ||
        requiresComplianceDeadline === 1 ||
        requiresComplianceDeadline === "true" ||
        requiresComplianceDeadline === "1"
      ) {
        parsedRequiresComplianceDeadline = true;
      } else if (
        requiresComplianceDeadline === false ||
        requiresComplianceDeadline === 0 ||
        requiresComplianceDeadline === "false" ||
        requiresComplianceDeadline === "0"
      ) {
        parsedRequiresComplianceDeadline = false;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid requiresComplianceDeadline value.",
        });
      }
    }

    const parsedDefaultDeadlineDays =
      defaultDeadlineDays !== undefined && defaultDeadlineDays !== ""
        ? Number(defaultDeadlineDays)
        : undefined;

    const parsedCustomDeadlineDays =
      customDeadlineDays !== undefined && customDeadlineDays !== ""
        ? Number(customDeadlineDays)
        : undefined;

    if (
      (parsedDefaultDeadlineDays !== undefined &&
        (!Number.isInteger(parsedDefaultDeadlineDays) ||
          parsedDefaultDeadlineDays < 0)) ||
      (parsedCustomDeadlineDays !== undefined &&
        (!Number.isInteger(parsedCustomDeadlineDays) ||
          parsedCustomDeadlineDays < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Deadline days must be valid non-negative integers.",
      });
    }

    const result = await CaseService.applyActionMappingDecision(
      {
        caseId: id,
        actionMappingId,
        courtDecisionOutcome: courtDecisionOutcome.trim(),
        actionStatus: actionStatus || "Action Initiated",
        requiresComplianceDeadline: parsedRequiresComplianceDeadline,
        defaultDeadlineDays: parsedDefaultDeadlineDays,
        customDeadlineDays: parsedCustomDeadlineDays,
        exactDeadlineDate: parsedExactDeadlineDate,
        orderDate: parsedOrderDate,
        courtDirections,
        stayScope,
        recordType,
      },
      {
        id: req.user.id,
        name: req.user.name || req.user.username,
        designation: req.user.designation,
      },
    );

    if (!result?.caseDoc) {
      return res.status(500).json({
        success: false,
        message: "Action mapping could not be applied successfully.",
      });
    }

    await logAuditEvent(
      req,
      "CASE_ACTION_MAPPING_APPLIED" as any,
      "COMPLIANCE",
      id,
      {
        fileNo: result.caseDoc.fileNo,
        outcome: courtDecisionOutcome.trim(),
        complianceCreated: Boolean(result.createdCompliance),
      },
      "INFO",
    );

    return res.status(200).json({
      success: true,
      message:
        "Court action mapping applied. Compliance radar updated successfully.",
      case: result.caseDoc,
      complianceRecord: result.createdCompliance || null,
    });
  } catch (error: any) {
    console.error("Apply Case Action Mapping Error:", error);

    const statusCode =
      error.statusCode ||
      error.status ||
      (error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to apply court action mapping.",
    });
  }
};

export const getCaseHearingHistory = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Case ID is required.",
      });
    }

    // Verify that the Case exists
    const caseDoc = await Case.findById(id).select("_id fileNo").lean();

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const history = await CaseHearingHistory.find({
      caseId: caseDoc._id,
    })
      .sort({
        hearingDate: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    console.error("Get Case Hearing History Error:", error);

    const statusCode = error.name === "CastError" ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 400
          ? "Invalid Case ID."
          : error.message || "Failed to fetch hearing history.",
    });
  }
};

export const triggerCaseSync = async (req: AuthRequest, res: Response) => {
  try {
    const caseId = getParam(req.params.id);

    if (!caseId || !/^[a-fA-F0-9]{24}$/.test(caseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid Case ID is required.",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing.",
      });
    }

    const updatedCase = await CaseService.syncCaseWithECourts(caseId, {
      id: req.user.id,
      name: req.user.name || req.user.username,
      designation: req.user.designation,
    });

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found or synchronization returned no case data.",
      });
    }

    await logAuditEvent(
      req,
      "CASE_ECOURTS_SYNCED" as any,
      "CASE_HUB",
      updatedCase._id.toString(),
      {
        fileNo: updatedCase.fileNo,
        ndoh: updatedCase.ndoh,
        syncStatus: updatedCase.syncStatus,
      },
      "INFO",
    );

    return res.status(200).json({
      success: true,
      message: "Synchronized with eCourts CIS Gateway successfully.",
      case: updatedCase,
    });
  } catch (error: any) {
    console.error("Trigger Case Sync Error:", error);

    const statusCode =
      error.statusCode ||
      error.status ||
      (error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to synchronize case with eCourts.",
    });
  }
};

export const manageConnectedWrits = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    const { writNumber, cnrNumber, petitionerName, connectedCaseId } = req.body;

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid Case ID is required.",
      });
    }

    if (typeof writNumber !== "string" || !writNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Writ number is mandatory.",
      });
    }

    if (
      cnrNumber !== undefined &&
      cnrNumber !== null &&
      typeof cnrNumber !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "CNR number must be a valid string.",
      });
    }

    if (
      petitionerName !== undefined &&
      petitionerName !== null &&
      typeof petitionerName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Petitioner name must be a valid string.",
      });
    }

    if (
      connectedCaseId !== undefined &&
      connectedCaseId !== null &&
      connectedCaseId !== ""
    ) {
      if (
        typeof connectedCaseId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(connectedCaseId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Connected Case ID is invalid.",
        });
      }

      if (connectedCaseId === id) {
        return res.status(400).json({
          success: false,
          message: "A case cannot be connected to itself.",
        });
      }
    }

    const updatedCase = await CaseService.tagConnectedWrit(id, {
      writNumber: writNumber.trim(),
      cnrNumber: cnrNumber?.trim() || undefined,
      petitionerName: petitionerName?.trim() || undefined,
      connectedCaseId: connectedCaseId || undefined,
    });

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Connected writ tagged successfully.",
      connectedWrits: updatedCase.connectedWrits,
    });
  } catch (error: any) {
    console.error("Manage Connected Writs Error:", error);

    const statusCode =
      error.statusCode ||
      error.status ||
      (error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to manage connected writs.",
    });
  }
};

export const getCasePetitioners = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);

    if (!caseId || !/^[a-fA-F0-9]{24}$/.test(caseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid Case ID is required.",
      });
    }

    const caseDoc = await Case.findById(caseId).select("_id fileNo").lean();

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const petitioners = await Petitioner.find({
      caseId: caseDoc._id,
    })
      .populate("stateId", "stateName stateCode")
      .populate("districtId", "districtName")
      .sort({ role: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: petitioners.length,
      petitioners,
    });
  } catch (error: any) {
    console.error("Get Case Petitioners Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch case petitioners.",
    });
  }
};

export const addCoPetitioner = async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);

    if (!caseId || !/^[a-fA-F0-9]{24}$/.test(caseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid Case ID is required.",
      });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Valid petitioner details are required.",
      });
    }

    const { name, role } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Petitioner name is mandatory.",
      });
    }

    if (role !== undefined && (typeof role !== "string" || !role.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid petitioner role.",
      });
    }

    const result = await CaseService.addCoPetitioners(
      caseId,
      [
        {
          ...req.body,
          name: name.trim(),
          ...(role !== undefined ? { role: role.trim() } : {}),
        },
      ],
      "MANUAL_ENTRY",
    );

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Add Co-Petitioner Error:", error);

    const statusCode =
      error.statusCode ||
      error.status ||
      (error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to add co-petitioner.",
    });
  }
};

export const getUnclaimedDiscovery = async (req: Request, res: Response) => {
  try {
    let items = await Discovery.find({
      status: "UNCLAIMED",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (items.length === 0) {
      const feed = await MockJudicialService.getDailyCauseListFeed("Allahabad");

      if (!Array.isArray(feed)) {
        throw new Error("Invalid cause list feed received.");
      }

      if (feed.length > 0) {
        await Discovery.insertMany(feed, {
          ordered: false,
        });
      }

      // Fetch from DB again so the response follows the same
      // structure and filtering as the normal discovery query.
      items = await Discovery.find({
        status: "UNCLAIMED",
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error("Get Unclaimed Discovery Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch unclaimed discovery records.",
    });
  }
};

export const mockVerifyCNR = async (req: Request, res: Response) => {
  try {
    const cnrNumber = req.body?.cnrNumber;

    if (typeof cnrNumber !== "string" || !cnrNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "CNR number is required.",
      });
    }

    const normalizedCNR = cnrNumber.trim().toUpperCase();

    // Indian CNR numbers contain 16 alphanumeric characters.
    if (!/^[A-Z0-9]{16}$/.test(normalizedCNR)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid CNR number. A 16-character alphanumeric CNR is required.",
      });
    }

    const details = await MockJudicialService.verifyCNR(normalizedCNR);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "No case details found for the provided CNR.",
      });
    }

    return res.status(200).json({
      success: true,
      details,
    });
  } catch (error: any) {
    console.error("Mock CNR Verification Error:", error);

    const statusCode = error.statusCode || error.status || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "CNR verification failed.",
    });
  }
};

export const linkDiscoveredWritToNotice = async (
  req: Request,
  res: Response,
) => {
  try {
    const { docketNo, caseNoYear, cnrNumber, courtHall, itemNo, listingDate } =
      req.body;

    if (typeof docketNo !== "string" || !docketNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice docket number is required.",
      });
    }

    if (typeof caseNoYear !== "string" || !caseNoYear.trim()) {
      return res.status(400).json({
        success: false,
        message: "Writ number is required.",
      });
    }

    const normalizedDocketNo = docketNo.trim();
    const normalizedWritNumber = caseNoYear.trim();
    const normalizedCNR =
      typeof cnrNumber === "string" && cnrNumber.trim()
        ? cnrNumber.trim().toUpperCase()
        : undefined;

    if (normalizedCNR && !/^[A-Z0-9]{16}$/.test(normalizedCNR)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid CNR number. A 16-character alphanumeric CNR is required.",
      });
    }

    let parsedListingDate: Date | undefined;

    if (listingDate) {
      parsedListingDate = new Date(listingDate);

      if (Number.isNaN(parsedListingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid listing date.",
        });
      }
    }

    if (
      courtHall !== undefined &&
      courtHall !== null &&
      typeof courtHall !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid court hall value.",
      });
    }

    if (
      itemNo !== undefined &&
      itemNo !== null &&
      typeof itemNo !== "string" &&
      typeof itemNo !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing item number.",
      });
    }

    const caseDoc = await Case.findOne({
      fileNo: normalizedDocketNo,
    });

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Notice docket not found.",
      });
    }
    caseDoc.writNumber = normalizedWritNumber;

    if (normalizedCNR) {
      caseDoc.cnrNumber = normalizedCNR;
      caseDoc.identifierTier = 4;
    } else {
      caseDoc.identifierTier = 3;
    }

    if (parsedListingDate) {
      caseDoc.ndoh = parsedListingDate;
    }

    if (courtHall !== undefined && courtHall !== null) {
      caseDoc.courtRoomNo = courtHall.trim();
    }

    caseDoc.listingItemNo =
      itemNo !== undefined && itemNo !== null && String(itemNo).trim()
        ? String(itemNo).trim()
        : "--";

    caseDoc.stage = "Listed in Cause List";

    await caseDoc.save();

    return res.status(200).json({
      success: true,
      message: `Docket ${normalizedDocketNo} successfully upgraded with Writ No: ${normalizedWritNumber}.`,
      case: caseDoc,
    });
  } catch (error: any) {
    console.error("Link Discovered Writ Error:", error);

    const statusCode =
      error.statusCode ||
      error.status ||
      (error.name === "ValidationError" || error.name === "CastError"
        ? 400
        : error.code === 11000
          ? 409
          : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to link discovered writ to notice.",
    });
  }
};

export const getDropdownWritsList = async (req: Request, res: Response) => {
  try {
    const cases = await Case.find({})
      .select(
        "_id fileNo writNumber noticeNumber cnrNumber leadPetitioner courtId courtCode benchLocation stage assignedOIC",
      )
      .populate({
        path: "courtId",
        select: "name courtName shortCode",
      })
      .populate({
        path: "assignedOIC",
        select: "name username designation",
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = cases.map((c: any) => {
      const court = c.courtId;
      const oic = c.assignedOIC;

      const courtName =
        court && typeof court === "object"
          ? court.name ||
            court.courtName ||
            court.shortCode ||
            c.courtCode ||
            "N/A"
          : c.courtCode || "N/A";

      const oicName =
        oic && typeof oic === "object"
          ? oic.name || oic.username || "N/A"
          : "N/A";

      const caseIdentifier = c.writNumber || c.noticeNumber || "Draft Docket";

      return {
        id: c._id,
        fileNo: c.fileNo,
        writNumber: caseIdentifier,
        noticeNumber: c.noticeNumber || null,
        cnrNumber: c.cnrNumber || null,
        label: `${c.fileNo} · ${caseIdentifier} — ${c.leadPetitioner || "Unknown Petitioner"}`,
        petitioner: c.leadPetitioner || "N/A",
        court: `${courtName} (${c.benchLocation || "N/A"})`,
        stage: c.stage || "N/A",
        oic: oicName,
        assignedOIC: oic
          ? {
              id: oic._id,
              name: oicName,
              designation: oic.designation || null,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    console.error("Get Dropdown Writs List Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch writ dropdown list.",
    });
  }
};

export const getCaseMovementHistory = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid Case ID is required.",
      });
    }

    const caseDoc = await Case.findById(id).select("_id fileNo").lean();

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    const history = await CaseMovementHistory.find({
      caseId: caseDoc._id,
    })
      .populate("fromUserId", "name designation rank")
      .populate("toUserId", "name designation rank")
      .sort({ dispatchedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    console.error("Get Case Movement History Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch case movement history.",
    });
  }
};

export const exportCaseDossierPdf = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid Case ID is required.",
      });
    }

    const caseDoc: any = await Case.findById(id)
      .populate("courtId", "courtName name shortCode location")
      .populate("caseTypeId", "caseTypeName name shortName")
      .populate("categoryId", "categoryName name")
      .populate("subCategoryId", "subCategoryName name defaultOfficerName")
      .populate("subjectId", "subjectTitle name")
      .populate("assignedOIC", "name username designation rank")
      .populate("assignedPairokar", "name username designation rank")
      .populate("internalHold.currentHolderId", "name username designation")
      .lean();

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case docket not found.",
      });
    }

    const [petitioners, hearings, movements] = await Promise.all([
      Petitioner.find({ caseId: caseDoc._id })
        .populate("stateId", "stateName stateCode")
        .populate("districtId", "districtName")
        .sort({ role: 1, createdAt: -1 })
        .lean(),

      CaseHearingHistory.find({ caseId: caseDoc._id })
        .sort({ hearingDate: -1, createdAt: -1 })
        .lean(),

      CaseMovementHistory.find({ caseId: caseDoc._id })
        .sort({ dispatchedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const esc = (value: unknown): string => {
      if (value === undefined || value === null || value === "") {
        return "--";
      }

      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const displayName = (value: any, fallback = "N/A"): string => {
      if (!value) return fallback;

      if (typeof value === "string") return value;

      return (
        value.name ||
        value.username ||
        value.courtName ||
        value.caseTypeName ||
        value.categoryName ||
        value.subCategoryName ||
        value.subjectTitle ||
        value.shortCode ||
        fallback
      );
    };

    const formatDate = (value: any, locale = "en-GB"): string => {
      if (!value) return "--";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "--";

      return date.toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatDateTime = (value: any): string => {
      if (!value) return "--";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "--";

      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const courtName = displayName(caseDoc.courtId, caseDoc.courtCode || "N/A");

    const caseTypeName = displayName(caseDoc.caseTypeId);
    const categoryName = displayName(caseDoc.categoryId, "General");
    const subCategoryName = displayName(caseDoc.subCategoryId);
    const subjectName = displayName(caseDoc.subjectId);

    const oicName = displayName(caseDoc.assignedOIC, "Unassigned");
    const pairOkarName = displayName(caseDoc.assignedPairokar, "Unassigned");

    const currentHolderName = displayName(
      caseDoc.internalHold?.currentHolderId,
      caseDoc.internalHold?.location || "Legal Cell",
    );

    const profileTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 1: INSTITUTIONAL DOSSIER & JUDICIAL IDENTIFICATION
      </div>

      <table class="data-table">
        <tbody>
          <tr>
            <th style="width: 18%;">File Docket No</th>
            <td style="width: 32%; font-family: monospace; font-weight: 700;">
              ${esc(caseDoc.fileNo)}
            </td>
            <th style="width: 18%;">National CNR</th>
            <td style="width: 32%; font-family: monospace; font-weight: 700;">
              ${esc(caseDoc.cnrNumber || "Awaiting Allotment")}
            </td>
          </tr>

          <tr>
            <th>Writ / Case No</th>
            <td style="font-weight: 700;">
              ${esc(caseDoc.writNumber || "Awaiting Writ Allotment")}
            </td>
            <th>Advance Notice No</th>
            <td style="font-family: monospace;">
              ${esc(caseDoc.noticeNumber)}
            </td>
          </tr>

          <tr>
            <th>Court & Bench</th>
            <td>
              ${esc(courtName)} (${esc(caseDoc.benchLocation || "Allahabad")})
            </td>
            <th>Case Classification</th>
            <td>
              ${esc(caseTypeName)} (${esc(caseDoc.sectionWing || "Legal Cell")})
            </td>
          </tr>

          <tr>
            <th>Next Hearing (NDOH)</th>
            <td style="font-weight: 700;">
              ${esc(formatDate(caseDoc.ndoh))}
              <span style="font-size: 8px; font-weight: normal;">
                (Room: ${esc(caseDoc.courtRoomNo)})
              </span>
            </td>
            <th>Judicial Status</th>
            <td style="font-weight: 700;">
              ${esc(
                caseDoc.hasActiveStay
                  ? "INTERIM STAY IN FORCE"
                  : caseDoc.isContemptNotice
                    ? "CONTEMPT NOTICE ISSUED"
                    : caseDoc.judicialStatus || caseDoc.stage || "ACTIVE",
              )}
            </td>
          </tr>

          <tr>
            <th>Nodal OIC Desk</th>
            <td style="font-weight: 600;">
              ${esc(oicName)}
            </td>
            <th>Current File Custody</th>
            <td style="font-weight: 600;">
              ${esc(currentHolderName)}
              (${esc(caseDoc.internalHold?.holdDays ?? 0)} days on desk)
            </td>
          </tr>

          <tr>
            <th>Dispute Subject</th>
            <td colspan="3" style="line-height: 1.35;">
              <strong>
                ${esc(categoryName)} &gt; ${esc(subCategoryName)}
                (${esc(caseDoc.examCycle)}):
              </strong>
              <br/>
              ${esc(subjectName)}
            </td>
          </tr>

          <tr>
            <th>Parties on Record</th>
            <td colspan="3">
              <strong>Petitioner(s):</strong>
              ${esc(caseDoc.leadPetitioner)}
              (Counsel: ${esc(caseDoc.petitionerAdvocate)})
              <br/>
              <strong>Respondents:</strong>
              ${esc(caseDoc.respondentString)}
              (Liaison Pairokar: ${esc(pairOkarName)})
            </td>
          </tr>
        </tbody>
      </table>
    `;
    const connectedWrits = caseDoc.connectedWrits || [];

    const connectedTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 2: TAGGED & CONNECTED WRITS ROSTER (${connectedWrits.length})
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 28px; text-align: center;">#</th>
            <th style="width: 140px;">Connected Writ No</th>
            <th style="width: 160px;">CNR Number</th>
            <th>Tagged Litigant / Petitioner</th>
            <th style="width: 85px; text-align: center;">Tagged On</th>
          </tr>
        </thead>

        <tbody>
          ${
            connectedWrits.length > 0
              ? connectedWrits
                  .map(
                    (cw: any, idx: number) => `
                      <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td style="font-weight: 700;">${esc(cw.writNumber)}</td>
                        <td style="font-family: monospace;">${esc(cw.cnrNumber)}</td>
                        <td>${esc(cw.petitionerName)}</td>
                        <td style="text-align: center;">
                          ${esc(formatDate(cw.taggedDate))}
                        </td>
                      </tr>
                    `,
                  )
                  .join("")
              : `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #444444; padding: 5px;">
                      No connected / clubbed petitions tagged to this leading dossier.
                    </td>
                  </tr>
                `
          }
        </tbody>
      </table>
    `;
    const petitionersTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 3: LITIGANT & CANDIDATE REGISTRY ROSTER (${petitioners.length})
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 85px;">Role</th>
            <th style="width: 90px;">Roll No / PNO</th>
            <th>Candidate Name</th>
            <th>Father Name</th>
            <th style="width: 85px;">District</th>
            <th style="width: 70px; text-align: center;">Status</th>
          </tr>
        </thead>

        <tbody>
          ${
            petitioners.length > 0
              ? petitioners
                  .map(
                    (p: any, idx: number) => `
                      <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td style="font-weight: 600;">${esc(p.role)}</td>
                        <td style="font-family: monospace; font-weight: 700;">
                          ${esc(p.rollNo)}
                        </td>
                        <td style="font-weight: 600;">${esc(p.name)}</td>
                        <td>${esc(p.fatherName)}</td>
                        <td>${esc(p.districtId?.districtName || "--")}</td>
                        <td style="text-align: center;">
                          ${esc(p.status || "ACTIVE")}
                        </td>
                      </tr>
                    `,
                  )
                  .join("")
              : `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #444444; padding: 5px;">
                      No candidate roster records indexed.
                    </td>
                  </tr>
                `
          }
        </tbody>
      </table>
    `;
    const hearingsTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 4: JUDICIAL PROCEEDINGS & COURT ORDERS TIMELINE (${hearings.length})
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 70px;">Hearing Date</th>
            <th style="width: 70px;">NDOH</th>
            <th style="width: 90px;">Order Nature</th>
            <th style="width: 70px;">Room / Hall</th>
            <th>Business Recorded / Court Direction</th>
            <th style="width: 95px;">Logged By</th>
          </tr>
        </thead>

        <tbody>
          ${
            hearings.length > 0
              ? hearings
                  .map(
                    (h: any, idx: number) => `
                      <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td>${esc(formatDate(h.hearingDate))}</td>
                        <td style="font-weight: 700;">
                          ${esc(formatDate(h.ndoh))}
                        </td>
                        <td style="font-weight: 600;">${esc(h.orderType)}</td>
                        <td>${esc(h.courtRoomNo)}</td>
                        <td style="line-height: 1.35;">
                          ${esc(h.businessRecorded)}
                        </td>
                        <td style="font-size: 8px;">
                          ${esc(h.enteredByOfficerName)}
                          <br/>
                          <span>(${esc(h.enteredByDesignation)})</span>
                        </td>
                      </tr>
                    `,
                  )
                  .join("")
              : `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #444444; padding: 5px;">
                      No judicial hearings recorded yet.
                    </td>
                  </tr>
                `
          }
        </tbody>
      </table>
    `;
    const movementsTableHtml = `
      <div style="font-size: 10px; font-weight: 800; color: #000000; text-transform: uppercase; margin: 10px 0 3px;">
        SECTION 5: INTERNAL DESK TRANSIT & GREEN SHEET MOVEMENT AUDIT (${movements.length})
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 85px;">Dispatched Date</th>
            <th style="width: 75px;">Action</th>
            <th style="width: 125px;">Dispatched By</th>
            <th style="width: 125px;">Recipient Desk</th>
            <th>Purpose / Noting Remarks</th>
            <th style="width: 65px; text-align: center;">Hold Time</th>
          </tr>
        </thead>

        <tbody>
          ${
            movements.length > 0
              ? movements
                  .map(
                    (m: any, idx: number) => `
                      <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td>${esc(formatDateTime(m.dispatchedAt))}</td>
                        <td style="font-weight: 600;">${esc(m.actionType)}</td>
                        <td>
                          ${esc(m.fromOfficerName)}
                          (${esc(m.fromDesignation)})
                        </td>
                        <td style="font-weight: 600;">
                          ${esc(m.toOfficerName)}
                          (${esc(m.toDesignation)})
                        </td>
                        <td>
                          ${esc(m.notingPurpose)}
                          ${m.remarks ? ` — ${esc(m.remarks)}` : ""}
                        </td>
                        <td style="text-align: center; font-weight: 700;">
                          ${esc(m.holdDurationDays ?? 0)}d
                          ${esc(m.holdDurationHours ?? 0)}h
                        </td>
                      </tr>
                    `,
                  )
                  .join("")
              : `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #444444; padding: 5px;">
                      No physical/digital movements recorded yet.
                    </td>
                  </tr>
                `
          }
        </tbody>
      </table>
    `;

    const fullContentHtml = `
      ${profileTableHtml}
      ${connectedTableHtml}
      ${petitionersTableHtml}
      ${hearingsTableHtml}
      ${movementsTableHtml}
    `;

    const htmlOutput = renderPdfDocument({
      reportTitle: `360° Litigation Dossier: ${caseDoc.fileNo}`,
      reportSubtitle: `Judicial Audit & Life-Cycle Brief · ${
        caseDoc.writNumber || caseDoc.noticeNumber || "Advance Notice"
      }`,
      generatedBy: {
        name: req.user?.name || req.user?.username || "Legal Officer",
        designation: req.user?.designation,
        role: req.user?.role,
      },
      filterMetaText: `Court: ${courtName} | Stage: ${
        caseDoc.stage || "N/A"
      } | OIC: ${oicName}`,
      contentHtml: fullContentHtml,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(htmlOutput);
  } catch (error: any) {
    console.error("Export Case Dossier Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export case dossier.",
    });
  }
};
