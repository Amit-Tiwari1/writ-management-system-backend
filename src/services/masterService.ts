
import {
  State,
  Zone,
  Range,
  District,
  Court,
  CaseType,
  CaseCategory,
  CaseSubCategory,
  CaseSubject,
  SubjectCustodian,
  Rank,
  Designation,
  Department,
  RespondentGroup,
  ActionMapping,
  Alias,
  StandingCounsel,
  
} from "../models/Masters";
import { User } from "../models/User";

import {
  MasterQuery,
  MasterView,
  PaginatedResult,
} from "../types/masterType";

import mongoose from "mongoose";

/* =====================================================
   MASTER RESOURCE TYPES
===================================================== */

export type MasterResource =
  | "states"
  | "zones"
  | "ranges"
  | "districts"
  | "courts"
  | "caseTypes"
  | "categories"
  | "subCategories"
  | "subjects"
  | "subjectCustodians"
  | "departments"
  | "ranks"
  | "designations"
  | "respondentGroups"
  | "actionMappings"
  | "standingCounsels"
  | "aliases";

/* =====================================================
   MASTER SERVICE
===================================================== */

export class MasterService {
  /* =====================================================
     MASTER DATA DISPATCHER
  ===================================================== */

  static async getMasterData(
    master: MasterResource,
    view: MasterView,
    query: MasterQuery,
  ) {
    switch (master) {
      case "states":
        return this.getStates(query, view);

      case "zones":
        return this.getZones(query, view);

      case "ranges":
        return this.getRanges(query, view);

      case "districts":
        return this.getDistricts(query, view);

      case "courts":
        return this.getCourts(query, view);

      case "caseTypes":
        return this.getCaseTypes(query, view);

      case "categories":
        return this.getCategories(query, view);

      case "subCategories":
        return this.getSubCategories(query, view);

      case "subjects":
        return this.getSubjects(query, view);

      case "subjectCustodians":
        return this.getSubjectCustodians(query, view);

      case "departments":
        return this.getDepartments(query, view);

      case "ranks":
        return this.getRanks(query, view);

      case "designations":
        return this.getDesignations(query, view);

      case "respondentGroups":
        return this.getRespondentGroups(query, view);

      case "actionMappings":
        return this.getActionMappings(query, view);

      case "standingCounsels":
        return this.getStandingCounsels(query, view);

      case "aliases":
        return this.getAliases(query, view);

      default:
        throw new Error("Invalid master resource");
    }
  }

  /* =====================================================
     PAGINATION HELPERS
  ===================================================== */

  private static getPaginationParams(
    query: MasterQuery,
    view: MasterView = "list",
  ) {
    const requestedPage = Number(query.page);
    const requestedLimit = Number(query.limit);

    const page =
      Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;

    const defaultLimit = view === "options" ? 100 : 10;

    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(100, Math.floor(requestedLimit))
        : defaultLimit;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  /* =====================================================
     SEARCH HELPERS
  ===================================================== */

  private static escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static getSearchRegex(search?: string): RegExp | null {
    const value = search?.trim();

    if (!value) {
      return null;
    }

    return new RegExp(this.escapeRegex(value), "i");
  }

  private static applySearch(
    filter: Record<string, any>,
    searchFields: string[],
    search?: string,
  ): void {
    const searchRegex = this.getSearchRegex(search);

    if (!searchRegex) {
      return;
    }

    filter.$or = searchFields.map((field) => ({
      [field]: searchRegex,
    }));
  }

  /* =====================================================
     OPTIONAL FILTER HELPERS
  ===================================================== */

  private static getOptionalFilterValue(
    value?: string,
  ): string | undefined {
    const normalizedValue = value?.trim();

    if (!normalizedValue || normalizedValue.toUpperCase() === "ALL") {
      return undefined;
    }

    return normalizedValue;
  }

  private static getOptionalObjectId(
    value: string | undefined,
    fieldName: string,
  ): mongoose.Types.ObjectId | undefined {
    const normalizedValue = this.getOptionalFilterValue(value);

    if (!normalizedValue) {
      return undefined;
    }

    if (!mongoose.isValidObjectId(normalizedValue)) {
      throw new Error(`Invalid ${fieldName}`);
    }

    return new mongoose.Types.ObjectId(normalizedValue);
  }

  /* =====================================================
     COMMON PAGINATED DATA FETCHER

     - Same document structure for list and options
     - Latest created record appears first
     - Populate remains same for both views
     - Search and filters are applied at database level
  ===================================================== */

  private static async getPaginatedData(
    model: any,
    filter: Record<string, any>,
    query: MasterQuery,
    view: MasterView = "list",
    populate: Array<{ path: string; select: string }> = [],
  ): Promise<PaginatedResult<any>> {
    const { page, limit, skip } = this.getPaginationParams(
      query,
      view,
    );

    let dataQuery = model.find(filter);

    for (const item of populate) {
      dataQuery = dataQuery.populate(item.path, item.select);
    }

    // Latest created records first.
    // _id provides a consistent secondary sort.
    dataQuery = dataQuery
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    const [data, totalCount] = await Promise.all([
      dataQuery.lean(),
      model.countDocuments(filter),
    ]);

    return {
      success: true,
      totalCount,
      pagination: {
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
      data,
    };
  }

  /* =====================================================
     1. STATES
  ===================================================== */

  static async getStates(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    this.applySearch(
      filter,
      ["stateName", "stateCode", "country"],
      query.search,
    );

    return this.getPaginatedData(State, filter, query, view);
  }

  /* =====================================================
     2. ZONES
  ===================================================== */

  static async getZones(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const stateId = this.getOptionalObjectId(
      query.stateId,
      "stateId",
    );

    if (stateId) {
      filter.stateId = stateId;
    }

    this.applySearch(
      filter,
      ["zoneName"],
      query.search,
    );

    return this.getPaginatedData(Zone, filter, query, view, [
      { path: "stateId", select: "stateName stateCode" },
    ]);
  }

  /* =====================================================
     3. RANGES
  ===================================================== */

  static async getRanges(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const stateId = this.getOptionalObjectId(
      query.stateId,
      "stateId",
    );

    const zoneId = this.getOptionalObjectId(
      query.zoneId,
      "zoneId",
    );

    if (stateId) {
      filter.stateId = stateId;
    }

    if (zoneId) {
      filter.zoneId = zoneId;
    }

    this.applySearch(
      filter,
      ["rangeName"],
      query.search,
    );

    return this.getPaginatedData(Range, filter, query, view, [
      { path: "zoneId", select: "zoneName" },
      { path: "stateId", select: "stateName stateCode" },
    ]);
  }

  /* =====================================================
     4. DISTRICTS
  ===================================================== */

  static async getDistricts(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const stateId = this.getOptionalObjectId(
      query.stateId,
      "stateId",
    );

    const zoneId = this.getOptionalObjectId(
      query.zoneId,
      "zoneId",
    );

    const rangeId = this.getOptionalObjectId(
      query.rangeId,
      "rangeId",
    );

    if (stateId) {
      filter.stateId = stateId;
    }

    if (zoneId) {
      filter.zoneId = zoneId;
    }

    if (rangeId) {
      filter.rangeId = rangeId;
    }

    this.applySearch(
      filter,
      ["districtName"],
      query.search,
    );

    return this.getPaginatedData(District, filter, query, view, [
      { path: "stateId", select: "stateName stateCode" },
      { path: "zoneId", select: "zoneName" },
      { path: "rangeId", select: "rangeName" },
    ]);
  }

  /* =====================================================
     5. COURTS
  ===================================================== */

  static async getCourts(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    this.applySearch(
      filter,
      ["courtName", "shortCode", "location", "courtType"],
      query.search,
    );

    return this.getPaginatedData(Court, filter, query, view);
  }

  /* =====================================================
     6. CASE TYPES
  ===================================================== */

  static async getCaseTypes(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const courtId = this.getOptionalObjectId(
      query.courtId,
      "courtId",
    );

    if (courtId) {
      filter.courtId = courtId;
    }

    this.applySearch(
      filter,
      ["caseTypeName", "shortName"],
      query.search,
    );

    return this.getPaginatedData(CaseType, filter, query, view, [
      { path: "courtId", select: "courtName shortCode" },
    ]);
  }

  /* =====================================================
     7. CASE CATEGORIES
  ===================================================== */

  static async getCategories(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    this.applySearch(
      filter,
      ["categoryName", "description"],
      query.search,
    );

    return this.getPaginatedData(
      CaseCategory,
      filter,
      query,
      view,
    );
  }

  /* =====================================================
     8. CASE SUB-CATEGORIES
  ===================================================== */

static async getSubCategories(
  query: MasterQuery = {},
  view: MasterView = "list",
) {
  const filter: Record<string, any> = {};

  const categoryId = this.getOptionalObjectId(
    query.categoryId,
    "categoryId",
  );

  const defaultOfficerId = this.getOptionalObjectId(
    query.defaultOfficerId,
    "defaultOfficerId",
  );

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (defaultOfficerId) {
    filter.defaultOfficerId = defaultOfficerId;
  }

  this.applySearch(
    filter,
    ["subCategoryName"],
    query.search,
  );

  return this.getPaginatedData(
    CaseSubCategory,
    filter,
    query,
    view,
    [
      { path: "categoryId", select: "categoryName" },
      {
        path: "defaultOfficerId",
        select: "name username designation",
      },
    ],
  );
}

  /* =====================================================
     9. CASE SUBJECTS
  ===================================================== */

  static async getSubjects(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const categoryId = this.getOptionalObjectId(
      query.categoryId,
      "categoryId",
    );

    const subCategoryId = this.getOptionalObjectId(
      query.subCategoryId,
      "subCategoryId",
    );

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (subCategoryId) {
      filter.subCategoryId = subCategoryId;
    }

    this.applySearch(
      filter,
      ["subjectTitle"],
      query.search,
    );

    return this.getPaginatedData(
      CaseSubject,
      filter,
      query,
      view,
      [
        { path: "categoryId", select: "categoryName" },
        { path: "subCategoryId", select: "subCategoryName" },
      ],
    );
  }

  /* =====================================================
     10. SUBJECT CUSTODIANS
  ===================================================== */

  static async getSubjectCustodians(
  query: MasterQuery = {},
  view: MasterView = "list",
) {
  const filter: Record<string, any> = {};

  const categoryId = this.getOptionalObjectId(
    query.categoryId,
    "categoryId",
  );

  const subjectId = this.getOptionalObjectId(
    query.subjectId,
    "subjectId",
  );

  const userId = this.getOptionalObjectId(
    query.userId,
    "userId",
  );

  const designationId = this.getOptionalObjectId(
    query.designationId,
    "designationId",
  );

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (subjectId) {
    filter.subjectId = subjectId;
  }

  if (userId) {
    filter.userId = userId;
  }

  if (designationId) {
    filter.designationId = designationId;
  }

  const searchRegex = this.getSearchRegex(query.search);

  if (searchRegex) {
    const [matchingUsers, matchingDesignations] = await Promise.all([
      User.find({
        $or: [
          { name: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
          { mobile: searchRegex },
        ],
      }).distinct("_id"),

      Designation.find({
        $or: [
          { title: searchRegex },
          { authorityLevel: searchRegex },
          { defaultRole: searchRegex },
        ],
      }).distinct("_id"),
    ]);

    filter.$or = [
      { userId: { $in: matchingUsers } },
      { designationId: { $in: matchingDesignations } },
    ];
  }

  return this.getPaginatedData(
    SubjectCustodian,
    filter,
    query,
    view,
    [
      { path: "subjectId", select: "subjectTitle" },
      { path: "categoryId", select: "categoryName" },
      {
        path: "userId",
        select: "name username email mobile",
      },
      {
        path: "designationId",
        select: "title authorityLevel defaultRole",
      },
    ],
  );
}

  /* =====================================================
     11. RANKS
  ===================================================== */

  static async getRanks(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const cadreType = this.getOptionalFilterValue(
      query.cadreType,
    );

    if (cadreType) {
      filter.cadreType = cadreType;
    }

    this.applySearch(
      filter,
      ["rankName", "shortCode", "payLevelGrade"],
      query.search,
    );

    return this.getPaginatedData(Rank, filter, query, view);
  }

  /* =====================================================
     12. DESIGNATIONS
  ===================================================== */

  static async getDesignations(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const authorityLevel = this.getOptionalFilterValue(
      query.authorityLevel,
    );

    if (authorityLevel) {
      filter.authorityLevel = authorityLevel;
    }

    this.applySearch(
      filter,
      ["title", "defaultRole"],
      query.search,
    );

    return this.getPaginatedData(
      Designation,
      filter,
      query,
      view,
    );
  }
  static async getDepartments(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const parentFormation = this.getOptionalFilterValue(
      query.parentFormation,
    );

    if (parentFormation) {
      filter.parentFormation = parentFormation;
    }

    this.applySearch(
      filter,
      ["unitName", "unitCode", "headquarters"],
      query.search,
    );

    return this.getPaginatedData(
      Department,
      filter,
      query,
      view,
    );
  }
  static async getRespondentGroups(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    this.applySearch(
      filter,
      ["groupName", "defaultRankTitle", "defaultAddress"],
      query.search,
    );

    return this.getPaginatedData(
      RespondentGroup,
      filter,
      query,
      view,
    );
  }
  static async getActionMappings(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    this.applySearch(
      filter,
      [
        "courtDecision",
        "actionStatus",
        "actionNotTaken",
        "impactScope",
      ],
      query.search,
    );

    return this.getPaginatedData(
      ActionMapping,
      filter,
      query,
      view,
    );
  }
  static async getAliases(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    const language = this.getOptionalFilterValue(
      query.language,
    );

    const category = this.getOptionalFilterValue(
      query.category,
    );

    if (language) {
      filter.language = language;
    }

    if (category) {
      filter.category = category;
    }

    this.applySearch(
      filter,
      ["keyword", "language", "category"],
      query.search,
    );

    return this.getPaginatedData(
      Alias,
      filter,
      query,
      view,
    );
  }
  static async getStandingCounsels(
    query: MasterQuery = {},
    view: MasterView = "list",
  ) {
    const filter: Record<string, any> = {};

    this.applySearch(
      filter,
      ["name", "monitoredBenches"],
      query.search,
    );

    return this.getPaginatedData(
      StandingCounsel,
      filter,
      query,
      view,
    );
  }
}
