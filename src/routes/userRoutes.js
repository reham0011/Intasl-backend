import express from "express";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
  pingDB,
} from "../controllers/userController.js";
import { requireMinimumRole } from "../middleware/authMiddleware.js";
import { ROLES } from "../models/user.js";

const router = express.Router();

// Viewing the user list requires at least moderator access
router.get("/", requireMinimumRole(ROLES.MODERATOR), getAllUsers);

// Changing roles requires at least admin access
// (the controller itself further restricts admin-vs-super_admin actions)
router.patch("/:id/role", requireMinimumRole(ROLES.ADMIN), updateUserRole);

// Deleting a user requires at least admin access
router.delete("/:id", requireMinimumRole(ROLES.ADMIN), deleteUser);

router.get("/ping", pingDB);

export default router;