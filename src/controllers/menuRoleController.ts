import { Request, Response } from "express";
import { Menu } from "../models/Menu";
import { Role } from "../models/Role";
import { RolePermission } from "../models/RolePermission";
import { User } from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";

// 1. GET /api/v1/menus/my-menus (Dynamic Sidebar based on logged-in User's Role)
export const getMyPermittedMenus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Fetch user role permissions
    const permissions = await RolePermission.find({ roleId: user.roleId });

    // Permitted menu keys where canView is true
    const allowedKeys = permissions.filter((p) => p.canView).map((p) => p.menuKey);

    // Fetch master menu hierarchy
    const allMenus = await Menu.find().sort({ order: 1 });
    const userMenus = allMenus.filter((m) => allowedKeys.includes(m.key));

    res.status(200).json({
      success: true,
      roleName: user.role,
      permissions: permissions.map((p) => ({
        menuKey: p.menuKey,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canSign: p.canSign,
        canExport: p.canExport,
        canDownload: p.canDownload,
      })),
      menus: userMenus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET /api/v1/roles (Admin views all roles with member counts)
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    const rolesWithCounts = await Promise.all(
      roles.map(async (r) => {
        const userCount = await User.countDocuments({
          $or: [{ roleId: r._id }, { role: r.roleName }],
        });
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

// 3. POST /api/v1/roles (Admin creates custom role with permissions)
export const createRoleWithPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { roleName, roleCode, description, permissions } = req.body;

    if (!roleName || !roleCode) {
      return res.status(400).json({ success: false, message: "roleName and roleCode are required" });
    }

    const newRole = await Role.create({
      roleName,
      roleCode: roleCode.toUpperCase().trim(),
      description: description || "",
      isSystemDefault: false,
    });

    const allMenus = await Menu.find();

    // Map permissions across all system menus
    const permissionsToSave = allMenus.map((m) => {
      const customPerm = (permissions || []).find((p: any) => p.menuKey === m.key);
      return {
        roleId: newRole._id,
        menuId: m._id,
        menuKey: m.key,
        canView: customPerm?.canView ?? false,
        canCreate: customPerm?.canCreate ?? false,
        canEdit: customPerm?.canEdit ?? false,
        canDelete: customPerm?.canDelete ?? false,
        canSign: customPerm?.canSign ?? false,
        canExport: customPerm?.canExport ?? false,
        canDownload: customPerm?.canDownload ?? false,
      };
    });

    await RolePermission.insertMany(permissionsToSave);

    res.status(201).json({
      success: true,
      message: `Role '${roleName}' created with customized capability matrix`,
      data: newRole,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 4. PUT /api/v1/roles/:id/permissions (Admin updates permissions of a role)
export const updateRolePermissionMatrix = async (req: AuthRequest, res: Response) => {
  try {
    const { permissions, description } = req.body;
    const roleId = req.params.id;

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    if (description) {
      role.description = description;
      await role.save();
    }

    if (Array.isArray(permissions)) {
      for (const perm of permissions) {
        await RolePermission.findOneAndUpdate(
          { roleId, menuKey: perm.menuKey },
          {
            canView: perm.canView,
            canCreate: perm.canCreate,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
            canSign: perm.canSign,
            canExport: perm.canExport,
            canDownload: perm.canDownload,
          },
          { upsert: true }
        );
      }
    }

    res.status(200).json({ success: true, message: "Role permissions saved successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};