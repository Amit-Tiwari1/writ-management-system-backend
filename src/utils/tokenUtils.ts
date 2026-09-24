import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "lexwrit_enterprise_super_secret_key_2026";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 7;

export const generateAccessToken = (payload: { id: string; username: string; role: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = () => {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
  return { token, expiresAt };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};