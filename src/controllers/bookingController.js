import { ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
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

// 🆕 Invoice PDF — শুধু accepted booking-এর জন্য কাজ করবে
export async function downloadInvoice(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();
    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // owner নিজে অথবা admin — এর বাইরে কেউ access পাবে না
    const requester = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });
    const isOwner = booking.userId === req.user.userId;
    if (!isOwner && !requester?.isAdmin) {
      return res.status(403).json({ error: "Not authorized to access this invoice" });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({ error: "Invoice is only available after your booking is accepted" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("INTASL Container Lines", { align: "left" });
    doc.fontSize(10).text("Booking Invoice", { align: "left" });
    doc.moveDown(1.5);

    doc.fontSize(11).text(`Invoice #: ${id}`);
    doc.text(`Booking Date: ${new Date(booking.createdAt).toLocaleDateString()}`);
    doc.text(`Status: ${booking.status.toUpperCase()}`);
    doc.moveDown();

    doc.fontSize(12).text("Customer", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Name: ${booking.userName}`);
    doc.text(`Email: ${booking.userEmail}`);
    if (booking.companyName) doc.text(`Company: ${booking.companyName}`);
    doc.moveDown();

    doc.fontSize(12).text("Shipment Details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Container Type: ${booking.containerType}`);
    doc.text(`Container Size: ${booking.containerSize}`);
    doc.text(`Quantity: ${booking.quantity}`);
    doc.text(`Origin: ${booking.origin}`);
    doc.text(`Destination: ${booking.destination}`);
    doc.text(`Pickup Date: ${booking.pickupDate}`);
    if (booking.cargoType) doc.text(`Cargo Type: ${booking.cargoType}`);
    if (booking.weight) doc.text(`Weight: ${booking.weight}`);
    if (booking.additionalNotes) {
      doc.moveDown(0.5);
      doc.text(`Notes: ${booking.additionalNotes}`);
    }

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor("gray").text(
      "This is a system-generated invoice confirming your accepted booking. For pricing and payment details, please contact our team.",
      { align: "left" }
    );

    doc.end();
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
}