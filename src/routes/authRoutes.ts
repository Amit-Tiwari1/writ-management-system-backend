import { Router } from "express";
import { login, getMe, refreshToken, logout } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/login", login);

router.get("/me", authenticateToken, getMe);

router.post("/refresh-token", refreshToken);

router.post("/logout", logout);

export default router;