import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";

// Ensure env variables are loaded
try {
    process.loadEnvFile(".env.local");
} catch {}
try {
    process.loadEnvFile(".env");
} catch {}

import { connectDB } from "./src/lib/db/connection.js";
import { initSocketServer } from "./src/lib/services/socket.service.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // Set unlimited timeout for long-running video generation
    httpServer.requestTimeout = 0;
    httpServer.headersTimeout = 0;

    // Initialize WebSocket server (Socket.IO)
    initSocketServer(httpServer);

    httpServer.listen(port, async () => {
        console.log(`\n🚀 AI Video Studio running at http://localhost:${port}`);
        console.log(`📡 WebSocket server initialized on port ${port}`);
        console.log(`🎬 Environment: ${dev ? "development" : "production"}\n`);

        // Connect to MongoDB asynchronously
        try {
            await connectDB();
        } catch (err) {
            console.error(
                "[Server] MongoDB initial connect error:",
                err.message,
            );
        }
    });
});
