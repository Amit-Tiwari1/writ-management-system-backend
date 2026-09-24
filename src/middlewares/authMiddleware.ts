import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token missing or invalid" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "lexwrit_enterprise_super_secret_key_2026", (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Token expired or unauthorized" });
    }
    req.user = user;
    next();
  });
};