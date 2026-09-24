import { Router } from "express";
import { login, getMe } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// API 1: Login
router.post("/login", login);

// API 2: Current Logged In Officer Profile
router.get("/me", authenticateToken, getMe);

export default router;