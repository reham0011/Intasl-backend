import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  verifyOTP,
  resendOTP,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/logout", logoutUser);
router.get("/me", getMe);

export default router;