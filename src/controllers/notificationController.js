import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

export async function createNotification({ recipientId, type, message, bookingId }) {
  const db = getDB();
  await db.collection("notifications").insertOne({
    recipientId,
    type,
    message,
    bookingId: bookingId || null,
    read: false,
    createdAt: new Date(),
  });
}

export async function getMyNotifications(req, res) {
  try {
    const db = getDB();
    const notifications = await db
      .collection("notifications")
      .find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const formatted = notifications.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
    const unreadCount = formatted.filter((n) => !n.read).length;
    return res.json({ notifications: formatted, unreadCount });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();
    await db.collection("notifications").updateOne(
      { _id: new ObjectId(id), recipientId: req.user.userId },
      { $set: { read: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("MARK NOTIFICATION READ ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const db = getDB();
    await db.collection("notifications").updateMany(
      { recipientId: req.user.userId, read: false },
      { $set: { read: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("MARK ALL NOTIFICATIONS READ ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}