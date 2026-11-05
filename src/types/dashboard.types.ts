
export interface DashboardKpiData {
  activeWrits: {
    total: number;
    filedThisMonth: number;
    previous: number;
  };

  pendingInCourt: {
    total: number;
    description: string;
  };

  actionInBoard: {
    total: number;
    pwcAwaited: number;
    toBeClosed: number;
  };

  complianceRate: {
    rate: number;
    target: number;
  };
}

// ---------------------------------------------------------
// WRIT CLASSIFICATION MATRIX
// ---------------------------------------------------------

export interface MatrixRowItem {
  caseType: string;
  label: string;

  atAGlance: {
    previous: number;
    inCurrentMonth: number;
    total: number;
  };

  closed: {
    closed: number;
    toBeClosed: number;
  };

  pending: {
    inBoard: number;
    inUnits: number;
    inCourt: number;
  };

  dismissedWithdrawn: {
    dismissed: number;
    withdrawn: number;
  };

  representationPending: {
    instructionsPwc: number;
    allowedOff: number;
    disposedOff: number;
    otherPending: number;
  };
}

export interface MatrixSummary {
  previous: number;
  inCurrentMonth: number;
  total: number;

  closed: number;
  toBeClosed: number;

  inBoard: number;
  inUnits: number;
  inCourt: number;

  instructionsPwc: number;
  allowedOff: number;
  disposedOff: number;
  otherPending: number;
}

export interface ClassificationMatrixResponse {
  rows: MatrixRowItem[];
  summary: MatrixSummary;
}

// ---------------------------------------------------------
// COURT DISTRIBUTION
// ---------------------------------------------------------

export interface CourtForumItem {
  courtId: string;
  courtName: string;
  shortCode: string;
  location: string;
  activeCount: number;
}

export interface CourtDistributionResponse {
  totalActive: number;
  courts: CourtForumItem[];
}

// ---------------------------------------------------------
// OIC WORKLOAD
// ---------------------------------------------------------

export type OicWorkloadStatus =
  | "success"
  | "warning"
  | "danger";

export interface OicWorkloadItem {
  sNo: number;
  officerId: string;
  officerName: string;
  designation: string;
  sectionWing: string;

  total: number;
  actionDue: number;
  commentsNotSent: number;
  caNotFiled: number;
  toBeClosed: number;

  status: OicWorkloadStatus;
}

// ---------------------------------------------------------
// HEARING CALENDAR
// ---------------------------------------------------------

export interface HearingCalendarDayItem {
  day: number;
  dateStr: string;
  count: number;
  isHighRisk: boolean;
}

export interface HearingCalendarResponse {
  year: number;
  month: number;
  days: HearingCalendarDayItem[];
}

// ---------------------------------------------------------
// HEARING DATE CASE DETAILS
// ---------------------------------------------------------

export interface HearingDateCaseItem {
  _id: string;
  fileNo: string;
  writNumber?: string;
  cnrNumber?: string;

  courtId: string;
  courtCode: string;
  benchLocation: string;

  courtRoomNo?: string;
  leadPetitioner: string;
  petitionerAdvocate?: string;

  assignedOIC: string;
  stage: string;

  hasActiveStay: boolean;
  isContemptNotice: boolean;
}
