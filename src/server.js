import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { initSocket } from "./utils/socket.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import servicesRoutes from "./routes/servicesRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import idCardRoutes from "./routes/idCardRoutes.js";

const app = express();
const httpServer = http.createServer(app);
initSocket(httpServer);

const allowedOrigins = [
  "https://intasl-website.vercel.app",
  "http://localhost:3000",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" })); // increased limit — ID card photo (base64) needs more than default 100kb
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is running properly");
});

let dbReady = false;
async function ensureDB() {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }
}
app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/id-cards", idCardRoutes);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    httpServer.listen(PORT, () => console.log(`App is running on PORT ${PORT}`));
  });
}

export default app;