import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/authRoutes";
import mastersRoutes from "./routes/mastersRoutes";
import caseRoutes from "./routes/caseRoutes";
import dmsRoutes from "./routes/dmsRoutes";
import { verifyCloudinaryConnection } from "./config/cloudinary";
import notingRoutes from "./routes/notingRoutes";
import complianceRoutes from "./routes/complianceRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import { seedMastersIfEmpty } from "./config/seedMaster";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1/auth", authRoutes);            
app.use("/api/v1/masters", mastersRoutes);
app.use("/api/v1", caseRoutes);               
app.use("/api/v1", dmsRoutes);                 
app.use("/api/v1", notingRoutes);              
app.use("/api/v1", complianceRoutes);           
app.use("/api/v1", dashboardRoutes);  
app.use("/api/v1", adminRoutes);
app.use("/api/v1", reportRoutes);                

app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "UPPRPB Enterprise Legal Core REST Engine",
    gateway: "eCourts / NAPIX Ready",
    timestamp: new Date().toISOString(),
  });
});
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  verifyCloudinaryConnection();
  // await seedMastersIfEmpty();
  // await seedSystemBootstrap();

  app.listen(PORT, () => {
    console.log(` [API Engine] Running on http://localhost:${PORT}`);
  });
};

startServer();