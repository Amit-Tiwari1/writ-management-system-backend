import { Request, Response } from "express";
import { User } from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";
import { comparePassword } from "../utils/passwordUtils";
import { generateAccessToken, generateRefreshToken } from "../utils/tokenUtils";
import { logAuditEvent } from "../utils/auditLogger";
import { AuthService } from "../services/authService";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username / Mobile / Email and password are required.",
      });
    }

    const identifier = String(username).trim();
    const cleanLower = identifier.toLowerCase();

    // Flexible identifier check: username OR mobile OR email
    const user = await User.findOne({
      $or: [
        { username: cleanLower },
        { mobile: identifier },
        { email: cleanLower },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact Legal Cell Administration.",
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate Tokens
    const payload = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      designation: user.designation,
    };

    const accessToken = generateAccessToken(payload);
    const refreshTokenObj = generateRefreshToken();

    // Set Cookies (Cookie-based auth)
    res.cookie("access_token", accessToken, COOKIE_OPTIONS);
    res.cookie("refresh_token", refreshTokenObj.token, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Hydrate User Profile with Permissions and Allowed Menus
    const hydratedProfile = await AuthService.getHydratedUserProfile(user._id.toString());

    // Create Audit Log for Login
    const authReq = req as AuthRequest;
    authReq.user = payload;
    await logAuditEvent(
      authReq,
      "USER_LOGIN",
      "AUTH",
      `User ${user.username} authenticated successfully`,
      { username: user.username, role: user.role, status: "SUCCESS" },
      "INFO"
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: accessToken,
      refreshToken: refreshTokenObj.token,
      user: hydratedProfile,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const hydratedProfile = await AuthService.getHydratedUserProfile(req.user.id);
    if (!hydratedProfile) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    return res.status(200).json({
      success: true,
      user: hydratedProfile,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const rawToken = req.body.refreshToken || req.cookies?.refresh_token;
    if (!rawToken) {
      return res.status(400).json({ success: false, message: "Refresh token is missing." });
    }

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      await logAuditEvent(
        req,
        "USER_LOGOUT",
        "AUTH",
        `User ${req.user.username} logged out`,
        { username: req.user.username },
        "INFO"
      );
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};