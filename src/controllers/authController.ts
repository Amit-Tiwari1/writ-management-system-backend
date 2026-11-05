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
import  {RefreshToken}  from "../models/RefreshToken";

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const hashRefreshToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const login = async (req: Request, res: Response) => {
  try {
    console.log("[AUTH DEBUG] RefreshToken:", typeof RefreshToken);
console.log("[AUTH DEBUG] RefreshToken model:", RefreshToken?.modelName);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact administrator.",
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

    // Save hashed refresh token in database
    await RefreshToken.create({
      userId: user._id,
      token: hashRefreshToken(refreshTokenObj.token),
      expiresAt: refreshTokenObj.expiresAt,
    });

    // Set HTTP-only cookies
    res.cookie("access_token", accessToken, ACCESS_COOKIE_OPTIONS);

    res.cookie("refresh_token", refreshTokenObj.token, REFRESH_COOKIE_OPTIONS);
    (req as any).user = {
      id: user._id,
      username: user.username,
      designation: user.designation,
      role: user.role,
    };
    await logAuditEvent(
      req,
      "USER_LOGIN",
      "",
      "User logged in successfully",
      { userId: user._id.toString() },
      "INFO",
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: accessToken,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        designation: user.designation,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login.",
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

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
    const rawToken = req.cookies?.refresh_token;

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing. Please login again.",
      });
    }

    const hashedToken = hashRefreshToken(rawToken);

    const storedToken = await RefreshToken.findOneAndUpdate(
      {
        token: hashedToken,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { isRevoked: true },
      },
      { new: false },
    );

    if (!storedToken) {
      res.clearCookie("access_token", COOKIE_OPTIONS);
      res.clearCookie("refresh_token", COOKIE_OPTIONS);

      return res.status(401).json({
        success: false,
        message: "Refresh token expired or invalid. Please login again.",
      });
    }

    const user = await User.findById(storedToken.userId);

    if (!user || user.status !== "ACTIVE") {
      res.clearCookie("access_token", COOKIE_OPTIONS);
      res.clearCookie("refresh_token", COOKIE_OPTIONS);

      return res.status(401).json({
        success: false,
        message: "User session is no longer valid. Please login again.",
      });
    }

    const payload = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      designation: user.designation,
    };

    // Generate new tokens
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken();

    // Save new hashed refresh token
    await RefreshToken.create({
      userId: user._id,
      token: hashRefreshToken(newRefreshToken.token),
      expiresAt: newRefreshToken.expiresAt,
    });

    // Set updated cookies
    res.cookie("access_token", newAccessToken, ACCESS_COOKIE_OPTIONS);

    res.cookie("refresh_token", newRefreshToken.token, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      token: newAccessToken,
    });
  } catch (error: any) {
    console.error("Refresh Token Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh session. Please try again.",
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const rawToken = req.cookies?.refresh_token;

    if (rawToken) {
      const hashedToken = hashRefreshToken(rawToken);

      await RefreshToken.updateOne(
        {
          token: hashedToken,
          isRevoked: false,
        },
        {
          $set: { isRevoked: true },
        },
      );
    }

    await logAuditEvent(
      req,
      "USER_LOGOUT",
      "",
      "User logged out successfully",
      { userId: req.user?.id },
      "INFO",
    );

    res.clearCookie("access_token", COOKIE_OPTIONS);
    res.clearCookie("refresh_token", COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error: any) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout.",
    });
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
