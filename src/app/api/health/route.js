import { NextResponse } from "next/server";
import { connectDB, isDBConnected } from "../../../lib/db/connection.js";
import { getLocalStorageStatus } from "../../../lib/services/storage/local.service.js";

function formatUptime(totalSeconds) {
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor((totalSeconds / 3600) % 24);
    const d = Math.floor(totalSeconds / 86400);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
}

async function handleHealthCheck() {
    await connectDB();
    const memory = process.memoryUsage();
    const uptimeSeconds = process.uptime();
    const storageStatus = getLocalStorageStatus();

    return NextResponse.json(
        {
            success: true,
            service: "AI Video Studio",
            status: "running",
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(uptimeSeconds),
                human: formatUptime(uptimeSeconds),
            },
            checks: {
                database: isDBConnected() ? "connected" : "disconnected",
                storage: storageStatus.healthy ? "local" : "error",
                storageDetails: {
                    totalFiles: storageStatus.totalFiles,
                    totalSizeMB: storageStatus.totalSizeMB,
                },
            },
            system: {
                nodeVersion: process.version,
                memory: {
                    rssMB: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
                    heapUsedMB:
                        Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
                },
            },
        },
        {
            status: 200,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            },
        },
    );
}

export const runtime = "nodejs";
export async function GET() {
    return handleHealthCheck();
}
export async function HEAD() {
    return handleHealthCheck();
}
