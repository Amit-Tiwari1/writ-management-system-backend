import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { seedAdminUser } from "./config/seedAdmin";
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// Mount Routes
app.use("/api/v1/auth", authRoutes);

// Health Route
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "LexWrit Enterprise Legal Core REST Engine",
    gateway: "eCourts / NAPIX Ready",
    timestamp: new Date().toISOString(),
  });
});

// Start Server with DB & Seed
const startServer = async () => {
  await connectDB();
  await seedAdminUser();

  app.listen(PORT, () => {
    console.log(`🚀 [LexWrit Core API Engine] Running on http://localhost:${PORT}`);
  });
};

startServer();