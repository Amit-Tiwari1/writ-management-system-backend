import bcrypt from "bcryptjs";
import { User } from "../models/User";

export const seedAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ username: "admin" });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash("1234", salt);

      await User.create({
        name: "Chairman & Head of Legal",
        username: "admin",
        passwordHash: hash,
        designation: "Super Administrator / Chairman",
        section: "Apex Board",
        mobile: "9454400100",
        email: "admin@legalboard.in",
        role: "Super Admin",
        status: "ACTIVE",
      });

      console.log("🌱 [Seed] Default Super Admin seeded: username: 'admin' | pass: '1234'");
    }
  } catch (error) {
    console.error("❌ Admin seeding error:", error);
  }
};