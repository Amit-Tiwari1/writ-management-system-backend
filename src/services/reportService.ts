import { Case } from "../models/Case";
import { ComplianceRecord } from "../models/ComplianceRisk";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export interface ReportFilterOptions {
  reportType: string;
  startDate?: string;
  endDate?: string;
  court?: string;
  wing?: string;
  category?: string;
  caseType?: string;
  status?: string;
  examCycle?: string;
  oic?: string;
  page?: number;
  limit?: number;
}

export class ReportService {
  static buildFilterQuery(options: ReportFilterOptions) {
    const query: any = {};

    if (options.wing && options.wing !== "ALL") {
      query.sectionWing = options.wing;
    }
    if (options.court && options.court !== "ALL") {
      query.court = new RegExp(options.court, "i");
    }
    if (options.category && options.category !== "ALL") {
      query.category = options.category;
    }
    if (options.caseType && options.caseType !== "ALL") {
      query.caseType = options.caseType;
    }
    if (options.examCycle && options.examCycle !== "ALL") {
      query.examCycle = options.examCycle;
    }
    if (options.oic && options.oic !== "ALL") {
      query.assignedOIC = new RegExp(options.oic, "i");
    }

    switch (options.reportType) {
      case "HEARING_DATE_RANGE":
        if (options.startDate && options.endDate) {
          query.ndoh = {
            $gte: new Date(options.startDate),$lte: new Date(new Date(options.endDate).setHours(23, 59, 59)),
          };
        }
        break;
      case "STAY_ORDERS":
        query.hasActiveStay = true;
        break;
      case "CONTEMPT_MATTERS":
        query.isContemptNotice = true;
        break;
      case "STATUS_PENDING_PWC":
        query.judicialStatus = "PENDING_PWC";
        break;
      case "STATUS_DISPOSED":
        query.judicialStatus = "DISPOSED";
        break;
      default:
        if (options.status && options.status !== "ALL") {
          query.judicialStatus = options.status;
        }
        if (options.startDate && options.endDate) {
          query.createdAt = {
            $gte: new Date(options.startDate),$lte: new Date(new Date(options.endDate).setHours(23, 59, 59)),
          };
        }
        break;
    }

    return query;
  }

  static async getReportData(options: ReportFilterOptions) {
    const query = this.buildFilterQuery(options);
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const skip = (page - 1) * limit;

    const [cases, totalCount] = await Promise.all([
      Case.find(query)
        .select(
          "fileNo writNumber cnrNumber noticeNumber court caseType leadPetitioner respondentString sectionWing category examCycle assignedOIC ndoh judicialStatus stage hasActiveStay isContemptNotice createdAt"
        )
        .sort({ ndoh: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Case.countDocuments(query),
    ]);

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      data: cases.map((c, idx) => ({
        sNo: skip + idx + 1,
        _id: c._id,
        fileNo: c.fileNo,
        writOrNotice: c.writNumber || c.noticeNumber || "Advance Notice",
        cnrNumber: c.cnrNumber || "--",
        court: c.court,
        caseType: c.caseType,
        petitioner: c.leadPetitioner,
        respondent: c.respondentString,
        wing: c.sectionWing,
        category: c.category,
        examCycle: c.examCycle || "--",
        oic: c.assignedOIC,
        ndoh: c.ndoh ? new Date(c.ndoh).toLocaleDateString("en-GB") : "Not Listed",
        status: c.judicialStatus,
        stage: c.stage,
        hasStay: c.hasActiveStay,
        isContempt: c.isContemptNotice,
      })),
    };
  }

  static async generateExcelReport(options: ReportFilterOptions): Promise<Buffer> {
    const query = this.buildFilterQuery(options);
    const cases = await Case.find(query).sort({ ndoh: 1, createdAt: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "UPPRPB Legal Cell MIS Engine";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("MIS Legal Report");

    worksheet.mergeCells("A1:K1");
    worksheet.getCell("A1").value = "UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD, LUCKNOW";
    worksheet.getCell("A1").font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2744" } };
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

    worksheet.mergeCells("A2:K2");
    worksheet.getCell("A2").value = `MIS REPORT: ${options.reportType.replace(/_/g, " ")} | Generated On: ${new Date().toLocaleString("en-IN")}`;
    worksheet.getCell("A2").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF334155" } };
    worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };

    const headers = [
      "S.No",
      "File Docket No",
      "Writ / Notice No",
      "CNR Number",
      "Court Forum",
      "Case Type",
      "Petitioner Name",
      "Owning Wing",
      "Assigned OIC",
      "NDOH (Hearing)",
      "Status",
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    cases.forEach((c, idx) => {
      const row = worksheet.addRow([
        idx + 1,
        c.fileNo,
        c.writNumber || c.noticeNumber || "--",
        c.cnrNumber || "--",
        c.court,
        c.caseType,
        c.leadPetitioner,
        c.sectionWing,
        c.assignedOIC,
        c.ndoh ? new Date(c.ndoh).toLocaleDateString("en-GB") : "--",
        c.judicialStatus,
      ]);

      row.eachCell((cell) => {
        cell.font = { name: "Arial", size: 9 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
      }
    });

    worksheet.columns.forEach((col: any) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell: any) => {
        const val = cell.value ? cell.value.toString() : "";
        if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35);
      });
      col.width = maxLen;
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  static async generatePdfReport(options: ReportFilterOptions): Promise<Buffer> {
    const query = this.buildFilterQuery(options);
    const cases = await Case.find(query).sort({ ndoh: 1, createdAt: -1 }).limit(100).lean();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc.save();
      doc.rotate(-25, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.fontSize(52).fillColor("#0f2744", 0.05).font("Helvetica-Bold");
      doc.text("UTTAR PRADESH POLICE RECRUITMENT BOARD", doc.page.width / 2 - 350, doc.page.height / 2 - 20, {
        align: "center",
      });
      doc.restore();

      doc.fontSize(14).font("Helvetica-Bold").fillColor("#0f2744");
      doc.text("UTTAR PRADESH POLICE RECRUITMENT & PROMOTION BOARD", { align: "center" });
      doc.fontSize(9).font("Helvetica").fillColor("#475569");
      doc.text("Tulsi Ganga Complex, 19-C Vidhan Sabha Marg, Lucknow - Legal Cell MIS Docket", { align: "center" });
      doc.moveDown(0.3);

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e3a8a");
      doc.text(`CERTIFIED LITIGATION REPORT: ${options.reportType.replace(/_/g, " ")}`, { align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#64748b");
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")} | Total Records: ${cases.length}`, { align: "center" });
      doc.moveDown(0.8);

      let y = doc.y;
      doc.rect(30, y, doc.page.width - 60, 20).fill("#0f2744");

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
      doc.text("S.No", 35, y + 6, { width: 30 });
      doc.text("File Docket No", 70, y + 6, { width: 100 });
      doc.text("Writ / Notice", 175, y + 6, { width: 95 });
      doc.text("Court Forum", 275, y + 6, { width: 110 });
      doc.text("Petitioner Name", 390, y + 6, { width: 140 });
      doc.text("Owning Wing", 535, y + 6, { width: 90 });
      doc.text("OIC Officer", 630, y + 6, { width: 85 });
      doc.text("NDOH", 720, y + 6, { width: 60 });

      y += 22;

      doc.font("Helvetica").fontSize(7).fillColor("#1e293b");

      cases.forEach((c, idx) => {
        if (y > doc.page.height - 45) {
          doc.addPage();
          y = 35;
          doc.save();
          doc.rotate(-25, { origin: [doc.page.width / 2, doc.page.height / 2] });
          doc.fontSize(52).fillColor("#0f2744", 0.05).font("Helvetica-Bold");
          doc.text("UTTAR PRADESH POLICE RECRUITMENT BOARD", doc.page.width / 2 - 350, doc.page.height / 2 - 20, {
            align: "center",
          });
          doc.restore();

          doc.rect(30, y, doc.page.width - 60, 18).fill("#0f2744");
          doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
          doc.text("S.No", 35, y + 5, { width: 30 });
          doc.text("File Docket No", 70, y + 5, { width: 100 });
          doc.text("Writ / Notice", 175, y + 5, { width: 95 });
          doc.text("Court Forum", 275, y + 5, { width: 110 });
          doc.text("Petitioner Name", 390, y + 5, { width: 140 });
          doc.text("Owning Wing", 535, y + 5, { width: 90 });
          doc.text("OIC Officer", 630, y + 5, { width: 85 });
          doc.text("NDOH", 720, y + 5, { width: 60 });
          y += 20;
          doc.font("Helvetica").fontSize(7).fillColor("#1e293b");
        }

        if (idx % 2 === 1) {
          doc.rect(30, y - 2, doc.page.width - 60, 16).fill("#f8fafc");
        }

        doc.fillColor("#0f172a");
        doc.text(String(idx + 1), 35, y + 2, { width: 30 });
        doc.text(c.fileNo, 70, y + 2, { width: 100 });
        doc.text(c.writNumber || c.noticeNumber || "--", 175, y + 2, { width: 95 });
        doc.text(c.court, 275, y + 2, { width: 110 });
        doc.text(c.leadPetitioner.substring(0, 30), 390, y + 2, { width: 140 });
        doc.text(c.sectionWing, 535, y + 2, { width: 90 });
        doc.text(c.assignedOIC.substring(0, 20), 630, y + 2, { width: 85 });
        doc.text(c.ndoh ? new Date(c.ndoh).toLocaleDateString("en-GB") : "--", 720, y + 2, { width: 60 });

        y += 16;
      });

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#0f2744");
      doc.text("Digitally Certified by UPPRPB Legal Management System", 30, doc.page.height - 25, {
        align: "left",
      });

      doc.end();
    });
  }
}