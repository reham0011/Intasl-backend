import express from "express";
import { generateIdCardPDF, emailIdCard } from "../controllers/idCardController.js";
import { requireMinimumRole } from "../middleware/authMiddleware.js";
import { ROLES } from "../models/user.js";

const router = express.Router();

// Only admin/super_admin can generate ID cards from the admin dashboard
router.post("/generate", requireMinimumRole(ROLES.ADMIN), generateIdCardPDF);
router.post("/email", requireMinimumRole(ROLES.ADMIN), emailIdCard);

export default router;