import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { ROLES, hasMinimumRole } from "../models/user.js";

export async function getAllUsers(req, res) {
  try {
    const db = getDB();
    const rawUsers = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    const users = rawUsers.map(({ _id, ...rest }) => ({
      id: _id.toString(),
      ...rest,
      accountRole: rest.accountRole || ROLES.USER,
    }));

    return res.json({ users });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// PATCH /api/users/:id/role  { accountRole: "admin" | "moderator" | "user" | "super_admin" }
// req.user is populated by requireMinimumRole middleware, so we know
// the caller is at least a moderator here (route decides the floor).
export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { accountRole } = req.body;

    if (!Object.values(ROLES).includes(accountRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Nobody can change their own role (prevents locking yourself out
    // or accidentally self-demoting/self-promoting)
    if (req.user.userId === id || req.user._id?.toString() === id) {
      return res.status(400).json({ error: "You cannot change your own role" });
    }

    const db = getDB();
    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).json({ error: "User Not Found" });
    }

    const callerRole = req.user.accountRole || ROLES.USER;
    const targetCurrentRole = targetUser.accountRole || ROLES.USER;

    // Only a super_admin may create/edit another super_admin or admin.
    // A plain "admin" can only manage moderator/user accounts, and can
    // only assign moderator/user roles (not admin/super_admin).
    const onlySuperAdminCanTouch = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
    if (
      callerRole !== ROLES.SUPER_ADMIN &&
      (onlySuperAdminCanTouch.includes(targetCurrentRole) ||
        onlySuperAdminCanTouch.includes(accountRole))
    ) {
      return res.status(403).json({
        error: "Only a super admin can assign or modify admin-level roles",
      });
    }

    // Extra safety: caller can never grant a role higher than their own
    if (!hasMinimumRole(callerRole, accountRole) && callerRole !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "You cannot grant a role higher than your own" });
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          accountRole,
          isAdmin: [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(accountRole), // backward compat
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User Not Found" });
    }

    return res.json({ success: true, accountRole });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const callerId = req.user.userId || req.user._id?.toString();

    if (callerId === id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }

    const db = getDB();
    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).json({ error: "User Not Found" });
    }

    const callerRole = req.user.accountRole || ROLES.USER;
    const targetRole = targetUser.accountRole || ROLES.USER;

    // Only super_admin can delete an admin or another super_admin
    if (
      [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(targetRole) &&
      callerRole !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({ error: "Only a super admin can delete an admin account" });
    }

    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User Not Found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function pingDB(req, res) {
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    return res.json({ message: "MongoDB connected successfully!" });
  } catch (err) {
    console.error("PING ERROR:", err);
    return res.status(500).json({ error: "Connection failed" });
  }
}