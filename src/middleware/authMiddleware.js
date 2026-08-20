import { verifyToken } from "../utils/jwt.js";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";
import { ROLES, hasMinimumRole } from "../models/user.js";

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.token || null;
}

// Just checks the JWT is valid — doesn't hit the DB
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

// Fetches the fresh user from DB and checks role against allowedRoles.
// Use like: requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
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

      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const role = user.accountRole || ROLES.USER;

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: "You don't have permission for this action" });
      }

      req.user = { ...payload, accountRole: role, _id: user._id };
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

// Same idea but checks minimum role level instead of an exact list.
// Use like: requireMinimumRole(ROLES.MODERATOR) -> allows moderator, admin, super_admin
export function requireMinimumRole(minRole) {
  return async (req, res, next) => {
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

      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const role = user.accountRole || ROLES.USER;

      if (!hasMinimumRole(role, minRole)) {
        return res.status(403).json({ error: "You don't have permission for this action" });
      }

      req.user = { ...payload, accountRole: role, _id: user._id };
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

// Kept for backward compatibility with any existing routes using requireAdmin
export const requireAdmin = requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN);