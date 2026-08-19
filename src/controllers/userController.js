import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

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
    }));

    return res.json({ users });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;

    const db = getDB();
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: { isAdmin: Boolean(isAdmin) } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User Not Found" });
    }

    return res.json({ success: true, isAdmin: Boolean(isAdmin) });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }

    const db = getDB();
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