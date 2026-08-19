import { Server } from "socket.io";
import { verifyToken } from "./jwt.js";

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://intasl-website.vercel.app",
        "http://localhost:3000",
      ],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    (async () => {
      try {
        // ১. আগে handshake.auth.token চেক করা হচ্ছে (cross-domain safe)
        let token = socket.handshake.auth?.token;

        // ২. না পেলে cookie fallback
        if (!token) {
          const cookieHeader = socket.handshake.headers.cookie || "";
          const cookies = Object.fromEntries(
            cookieHeader
              .split("; ")
              .filter(Boolean)
              .map((c) => {
                const idx = c.indexOf("=");
                return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
              })
          );
          token = cookies.token;
        }

        if (!token) return next(new Error("Unauthorized"));

        const decoded = await verifyToken(token);
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error("Unauthorized"));
      }
    })();
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`Socket connected: user ${userId}`);

    socket.join(userId);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
}