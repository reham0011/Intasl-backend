import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { getDB } from "../config/db.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { sendOTPEmail } from "../utils/mailer.js";
import { generateOTP, hashOTP, compareOTP } from "../utils/otp.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 60 * 60 * 24 * 7 * 1000,
  path: "/",
};

const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
  path: "/",
};

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ---------- REGISTER (অপরিবর্তিত) ----------
export async function registerUser(req, res) {
  try {
    const {
      name, email, password,
      companyName, role, yearsExperience,
      businessType, shippingMethod, notificationPref, newsletter,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, Email & Password Required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDB();
    const users = db.collection("users");

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Already have an account with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await users.insertOne({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      companyName: companyName || "",
      role: role || "",
      yearsExperience: yearsExperience || "",
      businessType: businessType || "",
      shippingMethod: shippingMethod || "",
      notificationPref: notificationPref || "",
      newsletter: Boolean(newsletter),
      isAdmin: false,
      trustedDevices: [],
      createdAt: new Date(),
    });

    const userId = result.insertedId.toString();
    const token = await signToken({ userId, email: normalizedEmail, name });

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: userId, name, email: normalizedEmail,
        companyName: companyName || "", role: role || "",
        yearsExperience: yearsExperience || "", businessType: businessType || "",
        shippingMethod: shippingMethod || "", notificationPref: notificationPref || "",
        newsletter: Boolean(newsletter),
        isAdmin: false,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ error: "Server Error", message: error.message });
  }
}

// ---------- LOGIN (OTP logic যোগ হয়েছে) ----------
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email & Password Required" });
    }

    const db = getDB();
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Wrong Email or Password" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Wrong Email or Password" });
    }

    const userId = user._id.toString();

    // ---- device trust check ----
    const deviceId = req.cookies?.deviceId;
    const isTrustedDevice =
      deviceId &&
      user.trustedDevices?.some(
        (d) => d.deviceId === deviceId && new Date(d.expiresAt) > new Date()
      );

    if (isTrustedDevice) {
      const token = await signToken({ userId, email: user.email, name: user.name });
      res.cookie("token", token, COOKIE_OPTIONS);
      return res.json({
        token,
        user: {
          id: userId, name: user.name, email: user.email,
          companyName: user.companyName, role: user.role,
          yearsExperience: user.yearsExperience, businessType: user.businessType,
          shippingMethod: user.shippingMethod, notificationPref: user.notificationPref,
          newsletter: user.newsletter,
          isAdmin: Boolean(user.isAdmin),
        },
      });
    }

    // ---- new/unknown device -> OTP পাঠাও ----
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          otp: {
            hash: otpHash,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
            attempts: 0,
          },
        },
      }
    );

    await sendOTPEmail(user.email, otp, user.name);

    const preAuthToken = await signToken({ userId, stage: "otp-pending" }, "10m");

    return res.json({
      requireOTP: true,
      preAuthToken,
      email: user.email, // frontend এ "code sent to xxx@xx.com" দেখানোর জন্য
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ error: "Server Error" });
  }
}

// ---------- VERIFY OTP (নতুন) ----------
export async function verifyOTP(req, res) {
  try {
    const { preAuthToken, otp } = req.body;
    if (!preAuthToken || !otp) {
      return res.status(400).json({ error: "Missing token or OTP" });
    }

    let payload;
    try {
      payload = await verifyToken(preAuthToken);
    } catch {
      return res.status(401).json({ error: "Session expired, please login again" });
    }

    if (payload.stage !== "otp-pending") {
      return res.status(400).json({ error: "Invalid verification session" });
    }

    const db = getDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(payload.userId) });

    if (!user?.otp) {
      return res.status(400).json({ error: "No OTP request found, please login again" });
    }
    if (new Date(user.otp.expiresAt) < new Date()) {
      return res.status(400).json({ error: "OTP expired, please login again" });
    }
    if (user.otp.attempts >= 5) {
      return res.status(429).json({ error: "Too many attempts, please login again" });
    }

    const isValid = await compareOTP(otp, user.otp.hash);
    if (!isValid) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $inc: { "otp.attempts": 1 } }
      );
      return res.status(401).json({ error: "Invalid OTP" });
    }

    // ✅ OTP ঠিক আছে -> device trusted করে দাও + real token issue করো
    const deviceId = crypto.randomUUID();
    const deviceExpiresAt = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $unset: { otp: "" },
        $push: {
          trustedDevices: { deviceId, expiresAt: deviceExpiresAt, addedAt: new Date() },
        },
      }
    );

    const token = await signToken({ userId: user._id.toString(), email: user.email, name: user.name });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.cookie("deviceId", deviceId, DEVICE_COOKIE_OPTIONS);

    return res.json({
      token,
      user: {
        id: user._id.toString(), name: user.name, email: user.email,
        companyName: user.companyName, role: user.role,
        yearsExperience: user.yearsExperience, businessType: user.businessType,
        shippingMethod: user.shippingMethod, notificationPref: user.notificationPref,
        newsletter: user.newsletter,
        isAdmin: Boolean(user.isAdmin),
      },
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({ error: "Server Error" });
  }
}

// ---------- RESEND OTP (নতুন) ----------
export async function resendOTP(req, res) {
  try {
    const { preAuthToken } = req.body;
    if (!preAuthToken) {
      return res.status(400).json({ error: "Missing token" });
    }

    let payload;
    try {
      payload = await verifyToken(preAuthToken);
    } catch {
      return res.status(401).json({ error: "Session expired, please login again" });
    }

    const db = getDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(payload.userId) });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          otp: { hash: otpHash, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS), attempts: 0 },
        },
      }
    );

    await sendOTPEmail(user.email, otp, user.name);

    return res.json({ message: "OTP resent" });
  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    return res.status(500).json({ error: "Server Error" });
  }
}

// ---------- LOGOUT (অপরিবর্তিত) ----------
export function logoutUser(req, res) {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  return res.json({ success: true });
}

// ---------- GET ME (অপরিবর্তিত) ----------
export async function getMe(req, res) {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null) ||
    req.cookies?.token;

  if (!token) return res.json(null);

  try {
    const payload = await verifyToken(token);
    const db = getDB();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0, otp: 0 } }
    );
    if (!user) return res.json(null);

    const { _id, ...rest } = user;
    return res.json({ id: _id.toString(), ...rest });
  } catch {
    return res.json(null);
  }
}