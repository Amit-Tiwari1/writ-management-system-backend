import crypto from "crypto";
import { AuditLog } from "../models/AdminSecurity";
import { AuthRequest } from "../middlewares/authMiddleware";

export const logAuditEvent = async (
  req: AuthRequest,
  action: string,
  module: string,
  targetId: string,
  mutationPayload: any,
  severity: "INFO" | "WARNING" | "CRITICAL" = "INFO"
) => {
  try {
    const authHeader = req.headers["authorization"] || "";
    const jwtTokenHash = crypto.createHash("sha256").update(authHeader).digest("hex").slice(0, 16);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "System Internal Client";
    const timestamp = new Date();

    const rawIntegrityData = `${req.user?.id}_${action}_${module}_${targetId}_${timestamp.toISOString()}`;
    const integrityHash = crypto.createHash("sha256").update(rawIntegrityData).digest("hex");

    await AuditLog.create({
      timestamp,
      actorId: req.user?.id,
      actorName: req.user?.name || req.user?.username || "Authorized Staff",
      actorRole: req.user?.role || "Staff Officer",
      action,
      module,
      targetId,
      severity,
      ipAddress,
      userAgent,
      jwtTokenHash,
      mutationPayload,
      integrityHash,
    });
  } catch (err) {
    console.error("Failed to persist audit log:", err);
  }
};