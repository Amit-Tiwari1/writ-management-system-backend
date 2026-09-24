import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { seedAdminUser } from "./config/seedAdmin";
import { seedMasters } from "./config/seedMasters";

// Route Imports
import authRoutes from "./routes/authRoutes";
import mastersRoutes from "./routes/mastersRoutes";
import caseRoutes from "./routes/caseRoutes";
import dmsRoutes from "./routes/dmsRoutes";
import notingRoutes from "./routes/notingRoutes";
import complianceRoutes from "./routes/complianceRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// Mount All 8 Enterprise REST API Modules
app.use("/api/v1/auth", authRoutes);            // Module 0.0
app.use("/api/v1/masters", mastersRoutes);      // Module 6.0 (6.1 to 6.10)
app.use("/api/v1", caseRoutes);                 // Module 2.0 (2.1 to 2.4)
app.use("/api/v1", dmsRoutes);                  // Module 3.0
app.use("/api/v1", notingRoutes);               // Module 4.0
app.use("/api/v1", complianceRoutes);           // Module 5.0 (5.1 to 5.3)
app.use("/api/v1", dashboardRoutes);            // Module 1.0
app.use("/api/v1", adminRoutes);                // Module 7.0 (7.1 to 7.4)

// Health Diagnostics Check
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "LexWrit Enterprise Legal Core REST Engine",
    gateway: "eCourts / NAPIX Ready",
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  await connectDB();
  await seedAdminUser();
  await seedMasters();

  app.listen(PORT, () => {
    console.log(`🚀 [LexWrit Core API Engine] Running on http://localhost:${PORT}`);
  });
};

startServer();