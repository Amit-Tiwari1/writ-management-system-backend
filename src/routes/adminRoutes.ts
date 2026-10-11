import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getUserFormDropdowns,
  getUsersList,
  createStaffUser,
  updateStaffUser,
  getRolesWithMetrics,
  createRoleWithPermissions,
  getRolePermissionsMatrix,
  updateRolePermissionMatrix,
  getAuditLogs,
  getECourtsSyncHealth,
  triggerFullSync,
} from "../controllers/adminController"; // 👈 Yahan adminController kar dijiye

const router = Router();
router.use(authenticateToken);

// Form Dropdowns (Ranks, Designations, Departments, Roles)
router.get("/admin/users/form-dropdowns", getUserFormDropdowns);

// 7.1 Officers & Users
router.get("/admin/users", getUsersList);
router.post("/admin/users", createStaffUser);
router.put("/admin/users/:id", updateStaffUser);

// 7.2 RBAC Roles & Permissions Matrix
router.get("/admin/roles", getRolesWithMetrics);
router.post("/admin/roles", createRoleWithPermissions);
router.get("/admin/roles/:roleId/permissions", getRolePermissionsMatrix);
router.put("/admin/roles/:roleId/permissions", updateRolePermissionMatrix);

// 7.3 Audit Trail
router.get("/admin/audit-logs", getAuditLogs);

// 7.4 eCourts Sync Diagnostics
router.get("/admin/sync-health", getECourtsSyncHealth);
router.post("/admin/sync-health/trigger", triggerFullSync);

export default router;