import { NextResponse } from "next/server";
import {
    connectDB,
    getCollection,
    isDBConnected,
} from "../../../../lib/db/connection.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";
import { requireRole } from "../../../../lib/middlewares/role.js";

export const runtime = "nodejs";

export async function GET(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleError = requireRole(authResult.user, "admin");
    if (roleError) return roleError;

    if (!isDBConnected()) {
        return NextResponse.json(
            { success: false, error: "Database not connected." },
            { status: 503 },
        );
    }

    try {
        const videosCol = getCollection("videos");
        const usersCol = getCollection("users");
        const jobsCol = getCollection("jobs");
        const assetsCol = getCollection("assets");

        const [
            totalVideos,
            totalUsers,
            totalAdmins,
            activeJobs,
            pausedJobs,
            cachedAssets,
            recentVideos,
        ] = await Promise.all([
            videosCol.countDocuments(),
            usersCol.countDocuments({ role: "user" }),
            usersCol.countDocuments({ role: "admin" }),
            jobsCol.countDocuments({ status: "processing" }),
            jobsCol.countDocuments({ status: "paused_quota_exceeded" }),
            assetsCol.countDocuments(),
            videosCol
                .find(
                    {},
                    {
                        projection: {
                            title: 1,
                            videoUrl: 1,
                            language: 1,
                            duration: 1,
                            createdAt: 1,
                        },
                    },
                )
                .sort({ createdAt: -1 })
                .limit(5)
                .toArray(),
        ]);

        return NextResponse.json({
            success: true,
            dashboard: {
                videos: { total: totalVideos, recent: recentVideos },
                users: { total: totalUsers, admins: totalAdmins },
                jobs: { active: activeJobs, paused: pausedJobs },
                assetCache: { cachedAssets },
            },
        });
    } catch (error) {
        console.error("[Admin] Dashboard error:", error.message);
        return NextResponse.json(
            { success: false, error: "Failed to load dashboard." },
            { status: 500 },
        );
    }
}
