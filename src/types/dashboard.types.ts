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

export interface CourtForumItem {
  courtId: string;
  courtName: string;
  shortCode: string;
  location: string;
  activeCount: number;
}

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
  status: "success" | "warning" | "danger";
}

export interface HearingCalendarDayItem {
  day: number;
  dateStr: string;
  count: number;
  isHighRisk: boolean;
}