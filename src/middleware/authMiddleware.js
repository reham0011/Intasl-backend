import { verifyToken } from "../utils/jwt.js";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

function extractToken(req) {
  // ১. আগে Authorization header চেক করা হচ্ছে (cross-domain safe)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // ২. না পেলে cookie fallback
  return req.cookies?.token || null;
}

export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = await verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = await verifyToken(token);
    const db = getDB();
    const user = await db.collection("users").findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access needed" });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}