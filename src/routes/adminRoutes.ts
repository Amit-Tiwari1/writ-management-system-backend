import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleUserStatus,
  getRoles,
  createRole,
  getRolePermissions,
  updateRolePermissions,
  getAuditLogs,
  getAuditLogForensics,
  exportSignedAuditLedger,
  getSyncTelemetry,
  triggerBroadcastSync,
  pingCourtEndpoint,
  rotateNapixToken,
} from "../controllers/adminController";

const router = Router();
router.use(authenticateToken);

// 7.1 Officers Directory
router.get("/admin/users", getAdminUsers);
router.post("/admin/users", createAdminUser);
router.put("/admin/users/:id", updateAdminUser);
router.patch("/admin/users/:id/toggle-status", toggleUserStatus);

// 7.2 Dynamic RBAC Matrix
router.get("/admin/roles", getRoles);
router.post("/admin/roles", createRole);
router.get("/admin/roles/:roleId/permissions", getRolePermissions);
router.put("/admin/roles/:roleId/permissions", updateRolePermissions);

// 7.3 Security Audit Trail & Forensics
router.get("/admin/audit-logs", getAuditLogs);
router.get("/admin/audit-logs/:logId/forensics", getAuditLogForensics);
router.get("/admin/audit-logs/export-signed", exportSignedAuditLedger);

// 7.4 eCourts Sync Diagnostics
router.get("/admin/sync-health/telemetry", getSyncTelemetry);
router.post("/admin/sync-health/trigger-sync", triggerBroadcastSync);
router.post("/admin/sync-health/ping/:benchId", pingCourtEndpoint);
router.post("/admin/sync-health/refresh-token", rotateNapixToken);

export default router;