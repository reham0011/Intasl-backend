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

// 🆕 Bill of Lading style Invoice PDF — শুধু accepted booking-এর জন্য
export async function downloadInvoice(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();
    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const requester = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });
    const isOwner = booking.userId === req.user.userId;
    if (!isOwner && !requester?.isAdmin) {
      return res.status(403).json({ error: "Not authorized to access this invoice" });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({ error: "Invoice is only available after your booking is accepted" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=BL-${id}.pdf`);
    doc.pipe(res);

    // ---------- helpers ----------
    const M = 40; // left/right margin
    const W = 515; // usable width (595 - 40*2)

    function box(x, y, w, h, label, value, opts = {}) {
      doc.rect(x, y, w, h).lineWidth(0.7).strokeColor("#333").stroke();
      doc
        .fontSize(6.5)
        .fillColor("#666")
        .font("Helvetica")
        .text(label.toUpperCase(), x + 5, y + 4, { width: w - 10 });
      doc
        .fontSize(opts.fontSize || 9)
        .fillColor("#000")
        .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .text(value || "", x + 5, y + 15, { width: w - 10, height: h - 20 });
    }

    function colHeader(x, y, w, h, label) {
      doc.rect(x, y, w, h).lineWidth(0.7).strokeColor("#333").stroke();
      doc
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(label, x + 3, y + h / 2 - 4, { width: w - 6, align: "center" });
    }

    // ---------- Header ----------
    let y = 30;
    box(M, y, 310, 90, "Shipper", `${booking.userName}\n${booking.companyName || ""}\n${booking.userEmail}`);

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#0B5B52")
      .text("INTASL", M + 330, y + 8, { width: 175, align: "right" });
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#333")
      .text("Logistics Ltd.", M + 330, y + 30, { width: 175, align: "right" });
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text("BILL OF LADING", M + 330, y + 50, { width: 175, align: "right" });
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#555")
      .text("for Multimodal Transport or Ocean Transport", M + 330, y + 68, {
        width: 175,
        align: "right",
      });

    y += 90;
    box(M, y, W, 60, "Consignee", "To order / As advised by Shipper");

    y += 60;
    box(M, y, W, 60, "Notify Party", "Same as Consignee");

    y += 60;
    box(M, y, 257, 40, "Pre-carriage by", "N/A");
    box(M + 257, y, 258, 40, "Place of Receipt", booking.origin);

    y += 40;
    box(M, y, 257, 40, "Port of Loading", booking.origin, { bold: true });
    box(M + 257, y, 258, 40, "Port of Discharge", booking.destination, { bold: true });

    y += 40;
    box(M, y, 257, 40, "Ocean Vessel / Voy No.", "N/A");
    box(M + 257, y, 258, 40, "Place of Delivery", booking.destination);

    // ---------- Container table ----------
    y += 50;
    const cols = [
      { label: "Container No.", w: 70 },
      { label: "Seal No.", w: 50 },
      { label: "Marks & Nos.", w: 65 },
      { label: "No. of Pkgs", w: 45 },
      { label: "Kind of Pkgs", w: 65 },
      { label: "Description of Goods", w: 120 },
      { label: "Gross Weight", w: 50 },
      { label: "Measurement", w: 50 },
    ];
    let cx = M;
    cols.forEach((c) => {
      colHeader(cx, y, c.w, 22, c.label);
      cx += c.w;
    });

    // data row
    y += 22;
    const rowH = 130;
    const values = [
      id.slice(-8).toUpperCase(),
      "N/A",
      booking.companyName || "-",
      String(booking.quantity),
      `${booking.containerType} / ${booking.containerSize}`,
      booking.cargoType || "General Cargo",
      booking.weight || "N/A",
      "N/A",
    ];
    cx = M;
    cols.forEach((c, i) => {
      doc.rect(cx, y, c.w, rowH).lineWidth(0.7).strokeColor("#333").stroke();
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#000")
        .text(values[i], cx + 3, y + 6, { width: c.w - 6 });
      cx += c.w;
    });

    // ---------- Total containers / notes ----------
    y += rowH;
    box(
      M,
      y,
      W,
      35,
      "Total No. of Containers / Packages (in words)",
      `${booking.quantity} (${booking.quantity === 1 ? "ONE" : "MULTIPLE"}) CONTAINER(S) SAID TO CONTAIN ${(
        booking.cargoType || "GENERAL CARGO"
      ).toUpperCase()}`
    );
    if (booking.additionalNotes) {
      y += 35;
      box(M, y, W, 30, "Remarks", booking.additionalNotes);
    }

    // ---------- Freight & Charges ----------
    y += booking.additionalNotes ? 30 : 35;
    const freightCols = [
      { label: "Revenue Tons", w: 103 },
      { label: "Rate", w: 103 },
      { label: "Per", w: 103 },
      { label: "Prepaid", w: 103 },
      { label: "Collect", w: 103 },
    ];
    cx = M;
    freightCols.forEach((c) => {
      doc.rect(cx, y, c.w, 40).lineWidth(0.7).strokeColor("#333").stroke();
      doc
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text(c.label.toUpperCase(), cx + 4, y + 4, { width: c.w - 8 });
      cx += c.w;
    });

    // ---------- Footer ----------
    y += 55;
    box(M, y, 170, 80, "Place & Date of Issue", `Dhaka, Bangladesh\n${new Date(booking.createdAt).toLocaleDateString()}`);
    box(M + 170, y, 175, 80, "Number of Original B(s)/L", "3 (THREE)");
    box(
      M + 345,
      y,
      170,
      80,
      "Signed on behalf of the Carrier",
      "\n\nINTASL Container Lines\nAs Carrier",
      { fontSize: 8 }
    );

    doc.end();
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
}