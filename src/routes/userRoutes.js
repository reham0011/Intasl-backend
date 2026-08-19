import express from "express";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
  pingDB,
} from "../controllers/userController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAdmin, getAllUsers);
router.patch("/:id/admin", requireAdmin, updateUserRole);
router.delete("/:id", requireAdmin, deleteUser);
router.get("/ping", pingDB);

export default router;