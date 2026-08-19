import express from "express";
import {
  getMyNotifications, markNotificationRead, markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", requireAuth, getMyNotifications);
router.patch("/:id/read", requireAuth, markNotificationRead);
router.patch("/read-all", requireAuth, markAllNotificationsRead);

export default router;