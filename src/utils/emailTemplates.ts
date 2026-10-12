// backend/src/utils/emailTemplates.ts

const LOGO_URL =
  process.env.UPPRPB_LOGO_URL || "https://uppbpb.gov.in/Content/images/LOGO.bmp";
const PORTAL_URL = process.env.APP_PORTAL_URL || "http://localhost:3000";

export interface BaseEmailProps {
  title: string;
  badgeText: string;
  badgeBgColor?: string;
  recipientName: string;
  bodyContentHtml: string;
  actionButtonText?: string;
  actionButtonUrl?: string;
}

export const baseEmailLayout = ({
  title,
  badgeText,
  badgeBgColor = "#0f2744",
  recipientName,
  bodyContentHtml,
  actionButtonText = "View Case in Portal",
  actionButtonUrl = PORTAL_URL,
}: BaseEmailProps): string => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
      .wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      .header-logo-area { text-align: center; padding: 28px 20px 20px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff; }
      .header-logo { max-height: 80px; width: auto; display: block; margin: 0 auto 12px auto; }
      .board-title { font-size: 13px; font-weight: 700; color: #0f2744; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
      .board-sub { font-size: 11px; color: #64748b; margin: 3px 0 0 0; }
      .content { padding: 28px 24px; font-size: 13px; line-height: 1.6; }
      .badge { display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 800; color: #ffffff; background-color: ${badgeBgColor}; border-radius: 4px; text-transform: uppercase; margin-bottom: 12px; }
      .main-heading { font-size: 18px; font-weight: 800; color: #0f2744; margin: 0 0 16px 0; }
      .salutation { font-size: 14px; margin-bottom: 12px; }
      .card-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 18px 0; }
      .card-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; }
      .card-row:last-child { border-bottom: none; }
      .card-label { color: #64748b; font-weight: 500; }
      .card-value { color: #0f172a; font-weight: 700; text-align: right; }
      .btn-container { text-align: center; margin: 24px 0 12px 0; }
      .btn { display: inline-block; background: #0f2744; color: #ffffff !important; text-decoration: none; padding: 11px 24px; font-size: 13px; font-weight: 700; border-radius: 6px; }
      .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
      .footer-contact { margin-top: 6px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header-logo-area">
        <img src="${LOGO_URL}" alt="UPPRPB Logo" class="header-logo" />
        <h2 class="board-title">उत्तर प्रदेश पुलिस भर्ती एवं प्रोन्नति बोर्ड, लखनऊ</h2>
        <p class="board-sub">Enterprise Legal Case Management System (WCMS) · Official Dispatch</p>
      </div>

      <div class="content">
        <span class="badge">${badgeText}</span>
        <h1 class="main-heading">${title}</h1>
        <p class="salutation">Respected <strong>${recipientName}</strong>,</p>
        
        ${bodyContentHtml}

        <div class="btn-container">
          <a href="${actionButtonUrl}" class="btn" target="_blank">${actionButtonText}</a>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0;">This is an automated confidential legal communication from UPPRPB Legal Cell, Tulsi Ganga Complex, Lucknow.</p>
        <p class="footer-contact">Need technical assistance? Contact Legal Desk at legaldesk@policeboard.in</p>
        <p style="margin: 8px 0 0 0; font-size: 10px;">© 2026 U.P. Police Recruitment & Promotion Board. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};


export const userWelcomeCredentialsTemplate = (payload: {
  officerName: string;
  username: string;
  rawPassword: string;
  designation: string;
  section: string;
  roleName: string;
}) => {
  const body = `
    <p>Your official administrative staff credentials for the <strong>UPPRPB Legal Case Management System (WCMS)</strong> have been provisioned.</p>
    
    <div class="card-box">
      <div class="card-row">
        <span class="card-label">User ID / Login ID:</span>
        <span class="card-value" style="font-family: monospace; color: #0f2744; font-size: 13px;">${payload.username}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Initial Password:</span>
        <span class="card-value" style="font-family: monospace; color: #dc2626; font-size: 13px;">${payload.rawPassword}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Designation:</span>
        <span class="card-value">${payload.designation}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Assigned Wing / Section:</span>
        <span class="card-value">${payload.section}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Assigned Security Role:</span>
        <span class="card-value" style="color: #2563eb;">${payload.roleName}</span>
      </div>
    </div>

    <p style="font-size: 12px; color: #dc2626; font-weight: 600;">
      Security Directive: Please log in using the button below and immediately update your temporary password to maintain credential integrity.
    </p>
  `;

  return baseEmailLayout({
    title: "Official Portal Credentials Provisioned",
    badgeText: "Credential Activation",
    badgeBgColor: "#059669",
    recipientName: payload.officerName,
    bodyContentHtml: body,
    actionButtonText: "Log In to Legal Cell Desk",
    actionButtonUrl: `${PORTAL_URL}`,
  });
};


export const fileForwardedTemplate = (payload: {
  recipientName: string;
  fileNo: string;
  senderName: string;
  senderDesignation: string;
  notingPurpose: string;
  caseId: string;
}) => {
  const body = `
    <p>A judicial file docket has been digitally transmitted to your administrative desk for official scrutiny and necessary directions.</p>
    
    <div class="card-box">
      <div class="card-row">
        <span class="card-label">File Docket Number:</span>
        <span class="card-value">${payload.fileNo}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Transmitted By:</span>
        <span class="card-value">${payload.senderName} (${payload.senderDesignation})</span>
      </div>
      <div class="card-row">
        <span class="card-label">Noting Purpose / Subject:</span>
        <span class="card-value" style="color: #1e3a8a;">${payload.notingPurpose}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Action Expected:</span>
        <span class="card-value" style="color: #d97706;">Review Green Sheet Minute & Sign-off</span>
      </div>
    </div>
  `;

  return baseEmailLayout({
    title: `Dak Received: Docket ${payload.fileNo}`,
    badgeText: "Official Dak Forwarded",
    badgeBgColor: "#0f2744",
    recipientName: payload.recipientName,
    bodyContentHtml: body,
    actionButtonText: "Open Green Sheet Desk",
    actionButtonUrl: `${PORTAL_URL}/communications/notings?caseId=${payload.caseId}`,
  });
};

export const contemptAlertTemplate = (payload: {
  recipientName: string;
  fileNo: string;
  contemptNo: string;
  court: string;
  daysRemaining: number;
  complianceDeadline: string;
  caseId: string;
}) => {
  const body = `
    <p style="color: #991b1b; font-weight: 600;">
      CRITICAL WARNING: The judicial compliance deadline for the following show-cause contempt notice is expiring soon. Prompt compliance is mandatory to avoid personal appearance orders before the Hon'ble Court.
    </p>

    <div class="card-box" style="background-color: #fef2f2; border-color: #fecaca;">
      <div class="card-row">
        <span class="card-label">Contempt Petition No:</span>
        <span class="card-value" style="color: #dc2626;">${payload.contemptNo}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Internal File Docket:</span>
        <span class="card-value">${payload.fileNo}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Judicial Forum:</span>
        <span class="card-value">${payload.court}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Countdown Status:</span>
        <span class="card-value" style="color: #dc2626; font-size: 14px;">${payload.daysRemaining} Days Left</span>
      </div>
      <div class="card-row">
        <span class="card-label">Final Compliance Deadline:</span>
        <span class="card-value">${payload.complianceDeadline}</span>
      </div>
    </div>
  `;

  return baseEmailLayout({
    title: `URGENT: Contempt Notice Due (${payload.daysRemaining} Days Left)`,
    badgeText: "Level-3 Emergency Alert",
    badgeBgColor: "#dc2626",
    recipientName: payload.recipientName,
    bodyContentHtml: body,
    actionButtonText: "Examine Contempt Docket",
    actionButtonUrl: `${PORTAL_URL}/compliance/contempt`,
  });
};

export const stayAlertTemplate = (payload: {
  recipientName: string;
  fileNo: string;
  writNo: string;
  stayScope: string;
  vacationDeadline: string;
  caseId: string;
}) => {
  const body = `
    <p>Hon'ble High Court has granted an interim injunction in the matter below. Immediate draft preparation for Vacation of Stay under Article 226(3) is required.</p>

    <div class="card-box" style="background-color: #fffbeb; border-color: #fde68a;">
      <div class="card-row">
        <span class="card-label">Court Writ Number:</span>
        <span class="card-value">${payload.writNo}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Internal File Docket:</span>
        <span class="card-value">${payload.fileNo}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Stay Injunction Scope:</span>
        <span class="card-value" style="color: #92400e;">${payload.stayScope}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Article 226(3) Deadline:</span>
        <span class="card-value" style="color: #b45309;">${payload.vacationDeadline}</span>
      </div>
    </div>
  `;

  return baseEmailLayout({
    title: `Injunction Notice: Interim Stay Granted in ${payload.writNo}`,
    badgeText: "Judicial Stay Alert",
    badgeBgColor: "#d97706",
    recipientName: payload.recipientName,
    bodyContentHtml: body,
    actionButtonText: "Prepare Vacation Application",
    actionButtonUrl: `${PORTAL_URL}/compliance/stays`,
  });
};

export const caseAssignedTemplate = (payload: {
  recipientName: string;
  fileNo: string;
  writOrNotice: string;
  court: string;
  petitioner: string;
  roleAssigned: string;
  caseId: string;
}) => {
  const body = `
    <p>A new legal case docket has been registered in the Legal Registry and designated to your care as <strong>${payload.roleAssigned}</strong>.</p>

    <div class="card-box">
      <div class="card-row">
        <span class="card-label">File Docket Number:</span>
        <span class="card-value">${payload.fileNo}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Writ / Notice Number:</span>
        <span class="card-value">${payload.writOrNotice}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Judicial Forum:</span>
        <span class="card-value">${payload.court}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Lead Petitioner:</span>
        <span class="card-value">${payload.petitioner}</span>
      </div>
    </div>
  `;

  return baseEmailLayout({
    title: `Case Assigned: ${payload.fileNo}`,
    badgeText: "New Case Assigned",
    badgeBgColor: "#059669",
    recipientName: payload.recipientName,
    bodyContentHtml: body,
    actionButtonText: "View 360° Dossier",
    actionButtonUrl: `${PORTAL_URL}/cases/${payload.caseId}`,
  });
};

export const passwordResetOtpTemplate = (payload: {
  officerName: string;
  otp: string;
  validMinutes: number;
}) => {
  const body = `
    <p>A request was received to reset your official password for the <strong>UPPRPB Legal Case Management System (WCMS)</strong>.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f2744; background: #e2e8f0; padding: 12px 24px; border-radius: 8px; font-family: monospace; display: inline-block;">
        ${payload.otp}
      </span>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
        Valid for ${payload.validMinutes} minutes. Do not share this OTP with anyone.
      </p>
    </div>

    <p style="font-size: 12px; color: #dc2626;">
      If you did not initiate this request, please inform the Legal Cell Administration immediately.
    </p>
  `;

  return baseEmailLayout({
    title: "Password Reset Verification Code",
    badgeText: "Security Verification",
    badgeBgColor: "#d97706",
    recipientName: payload.officerName,
    bodyContentHtml: body,
    actionButtonText: "Return to Legal Portal",
    actionButtonUrl: `${process.env.APP_PORTAL_URL || "http://localhost:3000"}/login`,
  });
};