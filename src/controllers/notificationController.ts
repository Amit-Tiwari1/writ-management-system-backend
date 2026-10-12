
import { Response } from "express";
import { Notification } from "../models/Notification";
import { AuthRequest } from "../middlewares/authMiddleware";

export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [notifications, totalUnread, totalCount] = await Promise.all([
      Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
      Notification.countDocuments({ recipientId: userId }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount: totalUnread,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      data: notifications,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Quick unread counter for Top Navbar Bell Badge
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const count = await Notification.countDocuments({ recipientId: userId, isRead: false });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Mark single notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user?.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};