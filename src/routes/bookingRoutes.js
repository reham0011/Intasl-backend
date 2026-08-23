import express from "express";
import {
  createBooking, getMyBookings, getAllBookings,
  updateBookingStatus, updateBooking, deleteBooking,
  downloadInvoice, getBookingAnalytics, updateBookingTracking,
} from "../controllers/bookingController.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createBooking);
router.get("/me", requireAuth, getMyBookings);
router.get("/analytics", requireAdmin, getBookingAnalytics);
router.get("/:id/invoice", requireAuth, downloadInvoice);
router.get("/", requireAdmin, getAllBookings);
router.patch("/:id/tracking", requireAdmin, updateBookingTracking);
router.patch("/:id/status", requireAdmin, updateBookingStatus);
router.patch("/:id", requireAdmin, updateBooking);
router.delete("/:id", requireAdmin, deleteBooking);

export default router; 
