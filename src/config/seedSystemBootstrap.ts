import bcrypt from "bcryptjs";
import { Menu } from "../models/Menu";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { Court, CaseType, District } from "../models/Masters";
import { RolePermission } from "../models/RolePermission";

export const seedSystemBootstrap = async () => {
  try {
    // 1. Seed Menus & Submenus if not present
    let menus = await Menu.find();
    if (menus.length === 0) {
      menus = await Menu.insertMany([
        {
          groupKey: "operations",
          groupTitle: "OPERATIONS & CASE HUB",
          key: "dashboard",
          label: "1.0 Dashboard Cockpit",
          path: "/admin/writ-newui",
          icon: "dashboard",
          order: 1,
          subMenus: [],
        },
        {
          groupKey: "operations",
          groupTitle: "OPERATIONS & CASE HUB",
          key: "cases",
          label: "2.0 Writ & Case Hub",
          path: "/admin/writ-newui/cases",
          icon: "folder_open",
          order: 2,
          subMenus: [
            { key: "cases_register", label: "2.1 Case Register (Index)", path: "/admin/writ-newui/cases", icon: "folder_open", order: 1 },
            { key: "cases_intake", label: "2.2 Intake (CNR Wizard)", path: "/admin/writ-newui/cases/register", icon: "post_add", order: 2 },
            { key: "cases_petitioners", label: "2.3 Co-Petitioners", path: "/admin/writ-newui/cases/batch", icon: "group", order: 3 },
            { key: "cases_discovery", label: "2.4 Inward Discovery", path: "/admin/writ-newui/cases/discovery", icon: "travel_explore", badge: "AUTO", badgeColor: "warning", order: 4 },
          ],
        },
        {
          groupKey: "operations",
          groupTitle: "OPERATIONS & CASE HUB",
          key: "documents",
          label: "3.0 Document DMS & Tree",
          path: "/admin/writ-newui/documents",
          icon: "description",
          order: 3,
          subMenus: [],
        },
        {
          groupKey: "operations",
          groupTitle: "OPERATIONS & CASE HUB",
          key: "notings",
          label: "4.0 Green Sheet Notings",
          path: "/admin/writ-newui/communications",
          icon: "edit_note",
          order: 4,
          subMenus: [],
        },
        {
          groupKey: "compliance",
          groupTitle: "JUDICIAL ORDERS & RISK",
          key: "compliance",
          label: "5.0 Directives & Stays",
          path: "/admin/writ-newui/compliance/stays",
          icon: "shield_with_heart",
          order: 5,
          subMenus: [
            { key: "compliance_stays", label: "5.1 Active Stays Roster", path: "/admin/writ-newui/compliance/stays", icon: "timer", order: 1 },
            { key: "compliance_contempt", label: "5.2 Contempt Radar", path: "/admin/writ-newui/compliance/contempt", icon: "crisis_alert", badge: "CRITICAL", badgeColor: "danger", order: 2 },
            { key: "compliance_archive", label: "5.3 Compliance Archival", path: "/admin/writ-newui/compliance/archive", icon: "archive", order: 3 },
          ],
        },
        {
          groupKey: "reports",
          groupTitle: "EXECUTIVE MIS",
          key: "reports",
          label: "Reports MIS Engine",
          path: "/admin/writ-newui/reports",
          icon: "bar_chart",
          order: 6,
          subMenus: [],
        },
        {
          groupKey: "masters",
          groupTitle: "INSTITUTION MASTERS",
          key: "masters",
          label: "6.0 System Masters",
          path: "/admin/writ-newui/masters/location",
          icon: "account_tree",
          order: 7,
          subMenus: [
            { key: "masters_districts", label: "6.1 District & Zones", path: "/admin/writ-newui/masters/location", icon: "map", order: 1 },
            { key: "masters_departments", label: "6.2 Department / Units", path: "/admin/writ-newui/masters/organization", icon: "corporate_fare", order: 2 },
            { key: "masters_ranks", label: "6.3 Rank Master", path: "/admin/writ-newui/masters/ranks", icon: "military_tech", order: 3 },
            { key: "masters_designations", label: "6.4 Designation Master", path: "/admin/writ-newui/masters/designations", icon: "badge", order: 4 },
            { key: "masters_courts", label: "6.5 Court & Case Types", path: "/admin/writ-newui/masters/judicial", icon: "account_balance", order: 5 },
            { key: "masters_taxonomy", label: "6.6 Category & Subject Tree", path: "/admin/writ-newui/masters/taxonomy", icon: "account_tree", order: 6 },
            { key: "masters_custodians", label: "6.7 Subject Custodian Map", path: "/admin/writ-newui/masters/custodians", icon: "switch_account", order: 7 },
            { key: "masters_respondents", label: "6.8 Respondent Groups", path: "/admin/writ-newui/masters/respondents", icon: "groups", order: 8 },
            { key: "masters_actions", label: "6.9 Action Taken Mapping", path: "/admin/writ-newui/masters/actions", icon: "rule", order: 9 },
            { key: "masters_aliases", label: "6.10 Institution Aliases", path: "/admin/writ-newui/masters/aliases", icon: "spellcheck", order: 10 },
          ],
        },
        {
          groupKey: "security",
          groupTitle: "USERS, SECURITY & AUDIT",
          key: "security",
          label: "7.0 Security & Users",
          path: "/admin/writ-newui/admin/users",
          icon: "admin_panel_settings",
          order: 8,
          subMenus: [
            { key: "security_users", label: "7.1 Officers & Users", path: "/admin/writ-newui/admin/users", icon: "manage_accounts", order: 1 },
            { key: "security_rbac", label: "7.2 Dynamic RBAC Roles", path: "/admin/writ-newui/admin/rbac", icon: "admin_panel_settings", order: 2 },
            { key: "security_audit", label: "7.3 Action & Audit Logs", path: "/admin/writ-newui/admin/audit-logs", icon: "policy", order: 3 },
            { key: "security_telemetry", label: "7.4 eCourts Sync Health", path: "/admin/writ-newui/admin/sync-health", icon: "sync", order: 4 },
          ],
        },
      ]);
      console.log("🌱 [Bootstrap] Menus & Submenus configured in database.");
    }

    // 2. Seed Super Admin Role
    let superAdminRole = await Role.findOne({ roleCode: "SUPER_ADMIN" });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        roleName: "Super Admin",
        roleCode: "SUPER_ADMIN",
        description: "Full institutional root authority. Unlimited view, create, edit, sign, export and configuration permissions.",
        isSystemDefault: true,
      });

      // Grant Full Privileges across all menus to Super Admin
      const permissionsData = menus.map((m) => ({
        roleId: superAdminRole!._id,
        menuId: m._id,
        menuKey: m.key,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canSign: true,
        canExport: true,
        canDownload: true,
      }));

      await RolePermission.insertMany(permissionsData);
      console.log("🌱 [Bootstrap] Super Admin role with full 7-action permission matrix created.");
    }

    // 3. Seed Root Admin User
    const existingAdmin = await User.findOne({ username: "admin" });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash("1234", salt);

      await User.create({
        name: "Chairman & Head of Legal",
        username: "admin",
        passwordHash: hash,
        designation: "Super Administrator / Chairman",
        section: "Apex Secretariat",
        mobile: "9454400100",
        email: "admin@legalboard.in",
        roleId: superAdminRole._id,
        role: superAdminRole.roleName,
        status: "ACTIVE",
        lastLogin: new Date(),
      });

      console.log("🌱 [Bootstrap] Root Admin user created: username: 'admin' | pass: '1234'");
    }

    // 4. Baseline Jurisdictional Masters (Courts & Base Districts Only)
    if ((await Court.countDocuments()) === 0) {
      await Court.insertMany([
        { courtName: "High Court of Judicature at Allahabad", shortCode: "HC-ALD", courtType: "High Court", location: "Prayagraj" },
        { courtName: "High Court Allahabad (Lucknow Bench)", shortCode: "HC-LKO", courtType: "High Court", location: "Lucknow" },
        { courtName: "Supreme Court of India", shortCode: "SCI", courtType: "Apex Court", location: "New Delhi" },
      ]);
      await CaseType.insertMany([
        { code: "WRIT-A", title: "Civil Writ (Service & Recruitment)", court: "High Court Allahabad", activeWritsCount: 0 },
        { code: "CONT", title: "Civil Contempt Petition", court: "High Court Allahabad", activeWritsCount: 0 },
        { code: "SPL-AD", title: "Special Appeal (Division Bench)", court: "High Court Allahabad", activeWritsCount: 0 },
      ]);
    }

    if ((await District.countDocuments()) === 0) {
      await District.insertMany([
        { districtName: "Lucknow", zone: "Lucknow Zone", range: "Lucknow Range", state: "Uttar Pradesh", activeWritsCount: 0 },
        { districtName: "Prayagraj", zone: "Prayagraj Zone", range: "Prayagraj Range", state: "Uttar Pradesh", activeWritsCount: 0 },
      ]);
    }

    console.log("✅ [Bootstrap Complete] Core System initialized.");
  } catch (error) {
    console.error("❌ System bootstrap error:", error);
  }
};