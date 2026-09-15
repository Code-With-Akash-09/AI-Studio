import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import { getJob } from "../../../../lib/db/repositories/job.repository.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    try {
        const { jobId } = await params;
        const job = await getJob(jobId);
        if (!job) {
            return NextResponse.json(
                { success: false, error: "Job not found." },
                { status: 404 },
            );
        }
        if (
            user?.role !== "admin" &&
            job.userId &&
            String(job.userId) !== String(user._id)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You do not have permission to view this job.",
                },
                { status: 403 },
            );
        }
        return NextResponse.json({
            success: true,
            job: {
                jobId: job.jobId,
                status: job.status,
                progress: job.progress,
                progressMessage: job.progressMessage,
                totalScenes: job.totalScenes,
                completedScenesCount: job.completedScenes?.length || 0,
                canResume:
                    job.status === "paused_quota_exceeded" ||
                    job.status === "failed",
                videoUrl: job.videoUrl,
                error: job.error,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            },
        });
    } catch (error) {
        console.error("Get job error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to get job status." },
            { status: 500 },
        );
    }
}
