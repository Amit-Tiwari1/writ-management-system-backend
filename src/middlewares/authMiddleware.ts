
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokenUtils";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    designation?: string;
    [key: string]: any;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  // 1. First priority: Authorization Bearer token
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Second priority: HTTP-only access token cookie
  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  // 3. Token missing
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing. Please login.",
    });
  }

  // 4. Verify access token
  try {
    const decoded = verifyAccessToken(token);

    if (typeof decoded !== "object" || decoded === null) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization token.",
      });
    }

    req.user = decoded as AuthRequest["user"];

    return next();
  } catch (error: any) {
    // 401 triggers frontend refresh interceptor
    return res.status(401).json({
      success: false,
      message: "Token expired or unauthorized session.",
    });
  }
};
