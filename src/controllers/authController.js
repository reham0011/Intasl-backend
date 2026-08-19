import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { signToken, verifyToken } from "../utils/jwt.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 60 * 60 * 24 * 7 * 1000,
  path: "/",
};

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
      createdAt: new Date(),
    });

    const userId = result.insertedId.toString();
    const token = await signToken({ userId, email: normalizedEmail, name });

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      token, // 🆕 frontend এ localStorage এ রাখার জন্য
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
    const token = await signToken({ userId, email: user.email, name: user.name });

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.json({
      token, // 🆕 frontend এ localStorage এ রাখার জন্য
      user: {
        id: userId, name: user.name, email: user.email,
        companyName: user.companyName, role: user.role,
        yearsExperience: user.yearsExperience, businessType: user.businessType,
        shippingMethod: user.shippingMethod, notificationPref: user.notificationPref,
        newsletter: user.newsletter,
        isAdmin: Boolean(user.isAdmin),
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ error: "Server Error" });
  }
}

export function logoutUser(req, res) {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  return res.json({ success: true });
}

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
      { projection: { password: 0 } }
    );
    if (!user) return res.json(null);

    const { _id, ...rest } = user;
    return res.json({ id: _id.toString(), ...rest });
  } catch {
    return res.json(null);
  }
}