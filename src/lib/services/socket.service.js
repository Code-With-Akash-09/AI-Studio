import { Server } from "socket.io";
import { config } from "../config.js";
import { findUserById } from "../db/repositories/user.repository.js";
import { verifyAccessToken } from "../utils/jwt.js";

// Keep the instance on globalThis because Next route bundles and the custom
// server can load this module as separate module instances.
const SOCKET_IO_KEY = Symbol.for("ai-studio.socket.io");

function getSocketIO() {
    return globalThis[SOCKET_IO_KEY] || null;
}

export function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigin,
            methods: ["GET", "POST"],
        },
    });

    io.use(async (socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
            socket.user = null;
            return next();
        }

        try {
            const decoded = verifyAccessToken(token);
            const user = await findUserById(decoded.id);

            if (user && user.status === "active") {
                socket.user = {
                    id: String(user._id),
                    email: user.email,
                    role: user.role,
                };
            } else {
                socket.user = null;
            }
        } catch {
            socket.user = null;
        }

        next();
    });

    io.on("connection", (socket) => {
        const userInfo = socket.user
            ? `${socket.user.email} (${socket.user.role})`
            : "unauthenticated";
        console.log(`[Socket] Client connected: ${socket.id} — ${userInfo}`);

        socket.on("disconnect", () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    globalThis[SOCKET_IO_KEY] = io;
    return io;
}

export function emitProgress(socketId, payload) {
    const io = getSocketIO();
    if (!io) return;

    if (socketId) {
        io.to(socketId).emit("video:progress", payload);
    } else {
        io.emit("video:progress", payload);
    }
}

export function getIO() {
    return getSocketIO();
}
