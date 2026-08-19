import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { createNotification } from "./notificationController.js";
import { emitToUser } from "../utils/socket.js";

export async function createBooking(req, res) {
  try {
    const {
      containerType, containerSize, quantity,
      origin, destination, pickupDate,
      cargoType, weight, additionalNotes,
    } = req.body;

    if (!containerType || !containerSize || !origin || !destination || !pickupDate) {
      return res.status(400).json({ error: "Please fill in the required information" });
    }

    const db = getDB();
    const userId = req.user.userId;
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: "User Not Found" });

    const booking = {
      userId,
      userName: user.name,
      userEmail: user.email,
      companyName: user.companyName || "",
      containerType,
      containerSize,
      quantity: quantity || 1,
      origin,
      destination,
      pickupDate,
      cargoType: cargoType || "",
      weight: weight || "",
      additionalNotes: additionalNotes || "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);
    const bookingId = result.insertedId.toString();

    const admins = await db.collection("users").find({ isAdmin: true }).toArray();

    if (admins.length === 0) {
      console.warn("⚠️ No admin users found — booking_created notification not sent");
    }

    const notifMessage = `${user.name} Booking a new container`;

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          recipientId: admin._id.toString(),
          type: "booking_created",
          message: notifMessage,
          bookingId,
        })
      )
    );

    // 🔔 রিয়েল-টাইম নোটিফিকেশন — সব admin কে
    admins.forEach((admin) => {
      emitToUser(admin._id.toString(), "notification", {
        type: "booking_created",
        message: notifMessage,
        bookingId,
        read: false,
        createdAt: new Date(),
      });
    });

    return res.status(201).json({ success: true, booking: { id: bookingId, ...booking } });
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function getMyBookings(req, res) {
  try {
    const db = getDB();
    const bookings = await db
      .collection("bookings")
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();
    return res.json({ bookings: bookings.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })) });
  } catch (err) {
    console.error("GET MY BOOKINGS ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function getAllBookings(req, res) {
  try {
    const db = getDB();
    const bookings = await db.collection("bookings").find({}).sort({ createdAt: -1 }).toArray();
    return res.json({ bookings: bookings.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })) });
  } catch (err) {
    console.error("GET ALL BOOKINGS ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid Status" });
    }

    const db = getDB();
    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ error: "Didn't get any booking" });

    await db.collection("bookings").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    const messageMap = {
      accepted: "Your booking is confirmed",
      rejected: "Your booking is rejected",
      pending: "Your container booking has been placed under review again.",
    };

    await createNotification({
      recipientId: booking.userId,
      type: `booking_${status}`,
      message: messageMap[status],
      bookingId: id,
    });

    // 🔔 রিয়েল-টাইম নোটিফিকেশন — booking এর owner কে
    emitToUser(booking.userId, "notification", {
      type: `booking_${status}`,
      message: messageMap[status],
      bookingId: id,
      read: false,
      createdAt: new Date(),
    });

    return res.json({ success: true, status });
  } catch (err) {
    console.error("UPDATE BOOKING STATUS ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const allowedFields = [
      "containerType", "containerSize", "quantity", "origin", "destination",
      "pickupDate", "cargoType", "weight", "additionalNotes",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updatedAt = new Date();

    const db = getDB();
    const result = await db.collection("bookings").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    if (result.matchedCount === 0) return res.status(404).json({ error: "Didn't get any booking" });

    return res.json({ success: true });
  } catch (err) {
    console.error("UPDATE BOOKING ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}

export async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();
    const result = await db.collection("bookings").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Didn't get any booking" });
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE BOOKING ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}