import { Router } from "express";
import { login, getMe, refreshToken, logout, forgotPassword, resetPassword } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.post("/refresh-token", refreshToken);
router.post("/logout", authenticateToken, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;