// backend/src/routes/notificationRoutes.ts

import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController";

const router = Router();
router.use(authenticateToken);

router.get("/notifications", getUserNotifications);
router.get("/notifications/unread-count", getUnreadCount);
router.put("/notifications/:id/read", markAsRead);
router.put("/notifications/read-all", markAllAsRead);

export default router;