import { User, IUser } from "../models/User";
import { RolePermission } from "../models/RolePermission";
import { Menu } from "../models/Menu";

export interface HydratedUserResponse {
  id: string;
  name: string;
  username: string;
  rank?: string;
  designation: string;
  section: string;
  mobile: string;
  email: string;
  role: string;
  roleId?: string;
  courtBench?: string;
  status: string;
  lastLogin?: Date | null;
  permissions: any[];
  allowedMenus: any[];
}

export class AuthService {
 
  static async getHydratedUserProfile(userId: string): Promise<HydratedUserResponse | null> {
    const user = await User.findById(userId).lean();
    if (!user) return null;
    let permissions: any[] = [];
    if (user.roleId) {
      permissions = await RolePermission.find({ roleId: user.roleId }).lean();
    }
    const allMenus = await Menu.find().sort({ order: 1 }).lean();
    const permittedMenuKeys = new Set(
      permissions.filter((p) => p.canView).map((p) => p.menuKey)
    );
    const isSuperAdmin = user.role === "Super Admin" || user.role === "SUPER_ADMIN";
    const allowedMenus = allMenus
      .filter((menu) => isSuperAdmin || permittedMenuKeys.has(menu.key))
      .map((menu) => {
        const perm = permissions.find((p) => p.menuKey === menu.key);
        return {
          ...menu,
          actions: isSuperAdmin
            ? {
                canView: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canSign: true,
                canExport: true,
                canDownload: true,
              }
            : {
                canView: perm?.canView ?? false,
                canCreate: perm?.canCreate ?? false,
                canEdit: perm?.canEdit ?? false,
                canDelete: perm?.canDelete ?? false,
                canSign: perm?.canSign ?? false,
                canExport: perm?.canExport ?? false,
                canDownload: perm?.canDownload ?? false,
              },
        };
      });

    return {
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      rank: user.rank,
      designation: user.designation,
      section: user.section,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      roleId: user.roleId?.toString(),
      courtBench: user.courtBench,
      status: user.status,
      lastLogin: user.lastLogin,
      permissions,
      allowedMenus,
    };
  }
  static async getUserContactDetails(userId: string) {
    const user = await User.findById(userId).select("name mobile email designation rank section");
    if (!user) return null;
    return {
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      designation: user.designation,
      rank: user.rank,
      section: user.section,
    };
  }
}