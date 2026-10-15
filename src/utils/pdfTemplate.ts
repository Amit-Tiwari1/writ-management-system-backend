
export interface PdfDocumentPayload {
  reportTitle: string;
  reportSubtitle?: string;
  generatedBy?: {
    name: string;
    designation?: string;
    role?: string;
  };
  filterMetaText?: string;
  contentHtml: string;
}

export const renderPdfDocument = (payload: PdfDocumentPayload): string => {
  const logoUrl =
    process.env.UPPRPB_LOGO_URL ||
    "https://uppbpb.gov.in/Content/images/LOGO.bmp";

  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const officerLine = payload.generatedBy
    ? `${payload.generatedBy.name} (${payload.generatedBy.designation || payload.generatedBy.role || "Legal Cadre"})`
    : "Authorized Legal Cell Officer";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${payload.reportTitle} - UPPRPB Legal Cell</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
      position: relative;
    }

    /* Subtle Watermark on Every Page */
    .watermark-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -100;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .watermark-image {
      width: 420px;
      height: auto;
      opacity: 0.06;
      filter: grayscale(100%);
    }

    /* Top Institutional Header */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f2744;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .header-logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
    }

    .header-text {
      padding-left: 12px;
      vertical-align: middle;
    }

    .board-title {
      font-size: 13.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f2744;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .board-subtitle {
      font-size: 10.5px;
      font-weight: 600;
      color: #334155;
      margin: 2px 0 0 0;
    }

    .portal-tag {
      font-size: 9px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    /* Report Meta Information */
    .report-meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f2744;
      text-transform: uppercase;
      margin: 0;
    }

    .report-subtitle {
      font-size: 9.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .meta-pills {
      text-align: right;
      font-size: 9px;
      color: #475569;
    }

    /* Table Grid Styling */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    .data-table th {
      background-color: #0f2744;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 7px 6px;
      text-align: left;
      border: 1px solid #0f2744;
    }

    .data-table td {
      padding: 5px 6px;
      font-size: 9px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }

    .data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Footer Stamp */
    .footer-stamp {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #64748b;
    }

    @media print {
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- Watermark on all pages -->
  <div class="watermark-container">
    <img src="${logoUrl}" class="watermark-image" alt="Emblem Watermark" />
  </div>

  <!-- Print Button Bar -->
  <div class="no-print" style="margin-bottom: 12px; text-align: right;">
    <button onclick="window.print()" style="background: #0f2744; color: white; border: none; padding: 7px 16px; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <!-- Institutional Header -->
  <table class="header-table">
    <tr>
      <td style="width: 65px;">
        <img src="${logoUrl}" class="header-logo" alt="UPPRPB Logo" />
      </td>
      <td class="header-text">
        <h1 class="board-title">उत्तर प्रदेश पुलिस भर्ती एवं प्रोन्नति बोर्ड, लखनऊ</h1>
        <p class="board-subtitle">UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD (LEGAL CELL)</p>
        <p class="portal-tag">Tulsi Ganga Complex, 19-C Vidhan Sabha Marg, Lucknow · WCMS Secretariat</p>
      </td>
    </tr>
  </table>

  <!-- Meta Summary -->
  <div class="report-meta-box">
    <div>
      <h2 class="report-title">${payload.reportTitle}</h2>
      ${payload.reportSubtitle ? `<p class="report-subtitle">${payload.reportSubtitle}</p>` : ""}
    </div>
    <div class="meta-pills">
      <div><strong>Generated:</strong> ${generatedAt} IST</div>
      <div><strong>Officer:</strong> ${officerLine}</div>
      ${payload.filterMetaText ? `<div style="color: #1e40af;"><strong>Active Scope:</strong> ${payload.filterMetaText}</div>` : ""}
    </div>
  </div>

  <!-- Dynamic Content -->
  <div class="document-content">
    ${payload.contentHtml}
  </div>

  <!-- Footer Seal -->
  <div class="footer-stamp">
    <div>
      <strong>UPPRPB WCMS Digital Registry</strong> · System Generated Confidential Dossier.
    </div>
    <div>
      Official Board Circulation Only
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
};