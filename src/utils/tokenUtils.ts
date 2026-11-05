
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "upprpb_enterprise_super_secret_key_2026";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 7;

interface AccessTokenPayload {
  id: string;
  username: string;
  role: string;
}

export const generateAccessToken = (
  payload: AccessTokenPayload
): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = (): {
  token: string;
  expiresAt: Date;
} => {
  const token = crypto.randomBytes(40).toString("hex");

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  );

  return { token, expiresAt };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
