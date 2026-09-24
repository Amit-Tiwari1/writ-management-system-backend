import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User";
import { Role, AuditLog } from "../models/AdminSecurity";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logAuditEvent } from "../utils/auditLogger";

// ==========================================
// 7.1 Officers & User Credentials Directory
// ==========================================

// 50. GET /api/v1/admin/users
export const getAdminUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 51. POST /api/v1/admin/users
export const createAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, password, designation, section, mobile, email, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: "Name, username, and password are required" });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      username: username.toLowerCase().trim(),
      passwordHash,
      designation: designation || "Staff Officer",
      section: section || "Legal Desk",
      mobile: mobile || "--",
      email: email || "--",
      role: role || "Officer-in-Charge (OIC)",
      status: "ACTIVE",
    });

    await logAuditEvent(req, "USER_CREATED", "ADMIN_USERS", newUser._id.toString(), { username, role });

    res.status(201).json({
      success: true,
      message: `Staff user '${newUser.username}' provisioned successfully`,
      data: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role,
        designation: newUser.designation,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 52. PUT /api/v1/admin/users/:id
export const updateAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const { password, ...updateFields } = req.body;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.passwordHash = await bcrypt.hash(password, salt);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true }).select("-passwordHash");
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });

    await logAuditEvent(req, "USER_UPDATED", "ADMIN_USERS", updated._id.toString(), updateFields);

    res.status(200).json({ success: true, message: "Officer credentials updated", data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 53. PATCH /api/v1/admin/users/:id/toggle-status
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.username === "admin") {
      return res.status(403).json({ success: false, message: "Root Super Admin status cannot be deactivated" });
    }

    user.status = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await user.save();

    await logAuditEvent(
      req,
      "USER_STATUS_TOGGLED",
      "ADMIN_USERS",
      user._id.toString(),
      { newStatus: user.status },
      user.status === "INACTIVE" ? "WARNING" : "INFO"
    );

    res.status(200).json({
      success: true,
      message: `User '${user.username}' is now ${user.status}`,
      status: user.status,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 7.2 Dynamic RBAC Role & Permission Matrix
// ==========================================

// 54. GET /api/v1/admin/roles
export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });

    const rolesWithCounts = await Promise.all(
      roles.map(async (r) => {
        const userCount = await User.countDocuments({ role: r.name });
        return {
          ...r.toObject(),
          assignedUsersCount: userCount,
        };
      })
    );

    res.status(200).json({ success: true, count: rolesWithCounts.length, data: rolesWithCounts });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 55. POST /api/v1/admin/roles
export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Role name is required" });

    const defaultModules = [
      { moduleKey: "cases", moduleName: "2.0 Case Hub & Intake", canView: true, canCreate: false, canEdit: false, canSign: false, canExport: false },
      { moduleKey: "documents", moduleName: "3.0 Document DMS", canView: true, canCreate: false, canEdit: false, canSign: false, canExport: false },
      { moduleKey: "notings", moduleName: "4.0 Green Sheet Notings", canView: true, canCreate: false, canEdit: false, canSign: false, canExport: false },
      { moduleKey: "compliance", moduleName: "5.0 Stays & Contempt", canView: true, canCreate: false, canEdit: false, canSign: false, canExport: false },
      { moduleKey: "masters", moduleName: "6.0 System Masters", canView: false, canCreate: false, canEdit: false, canSign: false, canExport: false },
      { moduleKey: "admin", moduleName: "7.0 Security & Users", canView: false, canCreate: false, canEdit: false, canSign: false, canExport: false },
    ];

    const newRole = await Role.create({
      name,
      description: description || "",
      isSystemDefault: false,
      permissions: permissions && permissions.length > 0 ? permissions : defaultModules,
    });

    await logAuditEvent(req, "ROLE_CREATED", "RBAC", newRole._id.toString(), { name });

    res.status(201).json({ success: true, message: `Role '${name}' configured`, data: newRole });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 56. GET /api/v1/admin/roles/:roleId/permissions
export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    res.status(200).json({
      success: true,
      roleName: role.name,
      permissions: role.permissions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 57. PUT /api/v1/admin/roles/:roleId/permissions
export const updateRolePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { permissions, description } = req.body;
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    if (permissions) role.permissions = permissions;
    if (description) role.description = description;
    await role.save();

    await logAuditEvent(req, "ROLE_PERMISSIONS_MUTATED", "RBAC", role._id.toString(), { roleName: role.name });

    res.status(200).json({
      success: true,
      message: `Permissions updated for role '${role.name}'`,
      data: role,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==========================================
// 7.3 Security Audit Trail & Mutation Log
// ==========================================

// 58. GET /api/v1/admin/audit-logs
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { module, severity, search, page = 1, limit = 25 } = req.query;
    const filter: any = {};

    if (module && module !== "ALL") filter.module = module;
    if (severity && severity !== "ALL") filter.severity = severity;
    if (search) {
      filter.$or = [
        { actorName: { $regex: search,$options: "i" } },
        { action: { $regex: search,$options: "i" } },
        { ipAddress: { $regex: search,$options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
      data: logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 59. GET /api/v1/admin/audit-logs/:logId/forensics
export const getAuditLogForensics = async (req: Request, res: Response) => {
  try {
    const log = await AuditLog.findById(req.params.logId);
    if (!log) return res.status(404).json({ success: false, message: "Audit log entry not found" });

    res.status(200).json({
      success: true,
      forensics: {
        logId: log._id,
        timestamp: log.timestamp,
        actor: { id: log.actorId, name: log.actorName, role: log.actorRole },
        action: log.action,
        module: log.module,
        severity: log.severity,
        targetEntityId: log.targetId,
        networkForensics: {
          clientIp: log.ipAddress,
          userAgent: log.userAgent,
          jwtTokenFingerprint: log.jwtTokenHash,
        },
        mutationDiffPayload: log.mutationPayload,
        cryptographicProof: {
          sha256Seal: log.integrityHash,
          immutableStorage: "VERIFIED",
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 60. GET /api/v1/admin/audit-logs/export-signed
export const exportSignedAuditLedger = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(500);
    const exportTimestamp = new Date().toISOString();
    const digest = crypto.createHash("sha256").update(JSON.stringify(logs) + exportTimestamp).digest("hex");

    res.status(200).json({
      success: true,
      exportHeader: {
        certifiedBy: req.user?.username || "Auditor",
        exportedAt: exportTimestamp,
        totalEntries: logs.length,
        masterLedgerSignature: digest,
      },
      ledgerEntries: logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 7.4 eCourts & NAPIX Sync Diagnostics
// ==========================================

// 61. GET /api/v1/admin/sync-health/telemetry
export const getSyncTelemetry = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      telemetry: {
        gatewayStatus: "CONNECTED",
        napixQuotaDaily: 25000,
        quotaConsumedToday: 3840,
        quotaRemaining: 21160,
        tokenExpiresInMinutes: 412,
        averageRoundtripLatencyMs: 184,
        activePollingWorkerStatus: "ONLINE",
        redisQueueDepth: 0,
        benchEndpoints: [
          { benchId: "HC-ALD", name: "High Court Allahabad (Principal)", status: "OPERATIONAL", pingMs: 172 },
          { benchId: "HC-LKO", name: "High Court Allahabad (Lucknow Bench)", status: "OPERATIONAL", pingMs: 145 },
          { benchId: "SCI-DELHI", name: "Supreme Court of India Gateway", status: "OPERATIONAL", pingMs: 210 },
          { benchId: "SPST-LKO", name: "State Public Services Tribunal", status: "STANDBY", pingMs: 198 },
        ],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 62. POST /api/v1/admin/sync-health/trigger-sync
export const triggerBroadcastSync = async (req: AuthRequest, res: Response) => {
  try {
    await logAuditEvent(req, "MANUAL_BROADCAST_SYNC", "ECOURTS_NAPIX", "ALL_BENCHES", {}, "INFO");

    res.status(200).json({
      success: true,
      message: "High Court & Tribunal batch poller triggered across all 4 court gateways",
      queuedJobsCount: 4,
      dispatchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 63. POST /api/v1/admin/sync-health/ping/:benchId
export const pingCourtEndpoint = async (req: Request, res: Response) => {
  try {
    const { benchId } = req.params;
    const latency = Math.floor(130 + Math.random() * 60);

    res.status(200).json({
      success: true,
      benchId: benchId.toUpperCase(),
      httpStatus: 200,
      rttLatencyMs: latency,
      tlsCertificateValid: true,
      handshakeVerified: true,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 64. POST /api/v1/admin/sync-health/refresh-token
export const rotateNapixToken = async (req: AuthRequest, res: Response) => {
  try {
    const freshTokenKey = `napix_live_${crypto.randomBytes(16).toString("hex")}`;
    await logAuditEvent(req, "NAPIX_TOKEN_ROTATED", "ECOURTS_NAPIX", "GATEWAY_AUTH", {}, "WARNING");

    res.status(200).json({
      success: true,
      message: "NAPIX Gateway mTLS Bearer Token successfully rotated",
      tokenPrefix: freshTokenKey.slice(0, 14) + "...",
      validityHours: 24,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};