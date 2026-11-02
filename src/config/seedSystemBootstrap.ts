import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Menu } from "../models/Menu";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { RolePermission } from "../models/RolePermission";

export const seedSystemBootstrap = async () => {
  try {
    console.log("\n=======================================================");
    console.log("🧹 [PURGE & SEED] Starting Database Reset Workflow...");
    console.log("=======================================================");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not established.");
    }

    // 1. Fetch All Collections in Database
    const collections = await db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} Collections in Database:`);
    collections.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.name}`);
    });

    console.log("\n🗑️  [Step 1] Purging all collections EXCEPT 'menus'...");

    for (const col of collections) {
      if (col.name.toLowerCase() === "menus") {
        console.log(`   🛡️  SKIPPING [${col.name}] - Preserving Menu Master intact.`);
        continue;
      }

      try {
        const result = await db.collection(col.name).deleteMany({});
        console.log(`   ✅ PURGED [${col.name}] -> Deleted ${result.deletedCount} documents.`);
      } catch (err: any) {
        console.error(`   ❌ Failed to purge [${col.name}]:`, err.message);
      }
    }

    // 2. Verify Menus Collection
    const existingMenus = await Menu.find().sort({ order: 1 });
    console.log(`\n📋 [Step 2] Verifying Menus: Found ${existingMenus.length} active menu trees.`);
    if (existingMenus.length === 0) {
      console.warn("⚠️  Warning: Menus collection is empty. Ensure menus are populated if needed.");
    }

    // 3. Create Root Role (Super Admin)
    console.log("\n👑 [Step 3] Initializing Root 'Super Admin' Role...");
    const superAdminRole = await Role.create({
      roleName: "Super Admin",
      roleCode: "SUPER_ADMIN",
      description: "Full institutional root authority. Unlimited view, create, edit, sign, export, and configuration permissions.",
      isSystemDefault: true,
    });
    console.log(`   ✅ Role Created: ${superAdminRole.roleName} (ID: ${superAdminRole._id})`);

    // 4. Assign All 7 Granular Action Permissions across All Menus
    console.log("🔒 [Step 4] Assigning Granular 7-Action Permissions for All Menus...");
    const permissionsPayload = existingMenus.map((m) => ({
      roleId: superAdminRole._id,
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

    if (permissionsPayload.length > 0) {
      await RolePermission.insertMany(permissionsPayload);
      console.log(`   ✅ Assigned ${permissionsPayload.length} Full Menu Permission Nodes to Super Admin.`);
    } else {
      console.log("   ⚠️ No menus found to assign permissions.");
    }

    // 5. Create Super Administrator User
    console.log("\n👤 [Step 5] Seeding Super Admin Officer Profile...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("1234", salt);

    const rootUser = await User.create({
      name: "Chairman & Head of Legal",
      username: "admin",
      passwordHash: passwordHash,
      designation: "Super Administrator / Chairman",
      section: "Secretariat",
      mobile: "9454379145",
      email: "codeaurerror@gmail.com",
      roleId: superAdminRole._id,
      role: superAdminRole.roleName,
      courtBench: "BOTH",
      status: "ACTIVE",
      lastLogin: new Date(),
    });

    console.log("   ✅ Root Super Admin User Seeded Successfully:");
    console.log(`      - Username : ${rootUser.username}`);
    console.log(`      - Password : 1234`);
    console.log(`      - Mobile   : ${rootUser.mobile}`);
    console.log(`      - Email    : ${rootUser.email}`);
    console.log(`      - Role     : ${rootUser.role}`);

    // 6. Post-Cleanup Database Verification Audit
    console.log("\n🔎 [Step 6] Final Database Audit & Document Counts:");
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   • ${col.name.padEnd(25)} : ${count} record(s)`);
    }

    console.log("\n=======================================================");
    console.log("🚀 [BOOTSTRAP FINISHED] Database ready for pristine testing!");
    console.log("=======================================================\n");
  } catch (error: any) {
    console.error("❌ [System Bootstrap Error]:", error);
  }
};