import { Request, Response } from "express";
import crypto from "crypto";
import { Resend } from "resend";
import { User } from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";
import { comparePassword, hashPassword } from "../utils/passwordUtils";
import { generateAccessToken, generateRefreshToken } from "../utils/tokenUtils";
import { logAuditEvent } from "../utils/auditLogger";
import { AuthService } from "../services/authService";
import { passwordResetOtpTemplate } from "../utils/emailTemplates";

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 8 * 60 * 60 * 1000,
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

    user.lastLogin = new Date();
    await user.save();

    const payload = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      designation: user.designation,
    };

    const accessToken = generateAccessToken(payload);
    const refreshTokenObj = generateRefreshToken();

    res.cookie("access_token", accessToken, COOKIE_OPTIONS);
    res.cookie("refresh_token", refreshTokenObj.token, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const hydratedProfile = await AuthService.getHydratedUserProfile(
      user._id.toString(),
    );
    const authReq = req as AuthRequest;
    authReq.user = payload;
    await logAuditEvent(
      authReq,
      "USER_LOGIN",
      "AUTH",
      `User ${user.username} authenticated successfully`,
      { username: user.username, role: user.role, status: "SUCCESS" },
      "INFO",
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
    const hydratedProfile = await AuthService.getHydratedUserProfile(
      req.user.id,
    );
    if (!hydratedProfile) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found." });
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
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is missing." });
    }

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
    });
  } catch (error: any) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired refresh token." });
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
        "INFO",
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Username, email, or registered mobile is required.",
      });
    }

    const clean = String(identifier).trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ username: clean }, { email: clean }, { mobile: identifier }],
    }).select("+resetPasswordOtpHash +resetPasswordOtpExpires");

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account matches those details, a verification code has been dispatched.",
      });
    }

    if (!user.email || !user.email.includes("@")) {
      return res.status(400).json({
        success: false,
        message:
          "This account has no official email attached. Please contact Legal Cell Administration.",
      });
    }

    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");

    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();
    if (resendClient) {
      const html = passwordResetOtpTemplate({
        officerName: user.name,
        otp: rawOtp,
        validMinutes: 10,
      });

      await resendClient.emails.send({
        from: FROM_EMAIL,
        to: [user.email],
        subject: `[UPPRPB WCMS] Password Reset OTP - ${rawOtp}`,
        html,
      });
      console.log(`[Auth] Password reset OTP sent to ${user.email}`);
    } else {
      console.warn("[Auth Warning] Resend not configured. Test OTP:", rawOtp);
    }

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${user.email.replace(/(.{2})(.*)(?=@)/, "$1****")}.`,
      maskedEmail: user.email.replace(/(.{2})(.*)(?=@)/, "$1****"),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Identifier, verification OTP, and new password are required.",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const clean = String(identifier).trim().toLowerCase();
    const hashedSubmittedOtp = crypto
      .createHash("sha256")
      .update(String(otp).trim())
      .digest("hex");

    const user = await User.findOne({
      $or: [{ username: clean }, { email: clean }, { mobile: identifier }],
      resetPasswordOtpExpires: { $gt: new Date() },
    }).select("+resetPasswordOtpHash +resetPasswordOtpExpires");

    if (!user || user.resetPasswordOtpHash !== hashedSubmittedOtp) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code. Please request a new one.",
      });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password updated successfully. You can now log in with your new credentials.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
