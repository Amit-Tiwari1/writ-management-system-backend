import crypto from "crypto";
import { Request } from "express";
import { AuditLog, AuditActionType } from "../models/AuditLog";

export const logAuditEvent = async (
  req: Request,
  actionType: AuditActionType,
  targetDossier: string,
  mutationSummary: string,
  payloadSnapshot: any = {},
  severity: "INFO" | "WARNING" | "CRITICAL" = "INFO"
) => {
  try {
    const user = (req as any).user;
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const logId = `LOG-${Math.floor(1000 + Math.random() * 9000)}`;

    const lastLog = await AuditLog.findOne().sort({ createdAt: -1 }).select("sha256ChainHash").lean();
    const prevHash = lastLog?.sha256ChainHash || "GENESIS_BLOCK_000000";

    const chainPayload = `${logId}_${actionType}_${targetDossier}_${prevHash}_${Date.now()}`;
    const sha256ChainHash = crypto.createHash("sha256").update(chainPayload).digest("hex");

    await AuditLog.create({
      logId,
      userId: user?.id,
      userName: user?.name || user?.username || "System Daemon",
      userDesignation: user?.designation || user?.role || "System Process",
      sourceIp: String(ip).replace("::ffff:", ""),
      actionType,
      targetDossier,
      mutationSummary,
      severity,
      payloadSnapshot,
      sha256ChainHash,
    });
  } catch (err: any) {
    console.error("[AuditLog Error]:", err.message);
  }
};