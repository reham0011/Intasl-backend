import express from "express";
import { emailIdCardPdf } from "../controllers/idCardController.js";
import { requireMinimumRole } from "../middleware/authMiddleware.js";
import { ROLES } from "../models/user.js";

const router = express.Router();

router.post("/email", requireMinimumRole(ROLES.ADMIN), emailIdCardPdf);

export default router;