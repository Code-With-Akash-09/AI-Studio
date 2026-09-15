import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connection.js";
import { getJob } from "../../../lib/db/repositories/job.repository.js";
import { incrementUserQuota } from "../../../lib/db/repositories/user.repository.js";
import { authenticate } from "../../../lib/middlewares/auth.js";
import { checkVideoQuota } from "../../../lib/middlewares/quota.js";
import { emitProgress } from "../../../lib/services/socket.service.js";
import { generateVideo } from "../../../lib/services/video.service.js";
import { formatErrorMessage } from "../../../lib/utils/errors.js";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min serverless timeout

export async function POST(request) {
    await connectDB();

    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const quotaError = checkVideoQuota(user);
    if (quotaError) return quotaError;

    const body = await request.json().catch(() => ({}));
    const {
        jobId,
        script,
        socketId,
        provider,
        model,
        language,
        gender,
        voice,
        humanize,
        dimension,
        bgmMood,
        bgmVolume,
        geminiApiKeys: bodyGeminiKeys,
        geminiApiKey: bodyGeminiKey,
    } = body;

    const userId = String(user._id);

    const profileKeys = Array.isArray(user?.geminiApiKeys)
        ? user.geminiApiKeys
        : [];
    const customKeys = Array.isArray(bodyGeminiKeys)
        ? bodyGeminiKeys
        : bodyGeminiKey
          ? [bodyGeminiKey]
          : [];
    const userGeminiKeys = [
        ...new Set([...customKeys, ...profileKeys].filter(Boolean)),
    ];

    let scriptText = script;

    if (jobId && (!scriptText || typeof scriptText !== "string")) {
        const existingJob = await getJob(jobId);
        if (existingJob?.userId && user?.role !== "admin") {
            if (String(existingJob.userId) !== userId) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "You do not have permission to resume this job.",
                    },
                    { status: 403 },
                );
            }
        }
        if (existingJob?.script) scriptText = existingJob.script;
    }

    if (!scriptText || typeof scriptText !== "string") {
        return NextResponse.json(
            { success: false, error: "Script is required." },
            { status: 400 },
        );
    }

    if (scriptText.trim().length < 10) {
        return NextResponse.json(
            { success: false, error: "Script is too short." },
            { status: 400 },
        );
    }

    try {
        console.log(
            `\n[Generate] User: ${user?.email} | Script: ${scriptText.length} chars | Job: ${jobId || "new"}`,
        );

        emitProgress(socketId, {
            progress: 5,
            message: jobId
                ? "Resuming video generation..."
                : "Starting video generation...",
            jobId,
        });

        const result = await generateVideo(scriptText.trim(), {
            jobId,
            provider,
            model,
            language,
            gender,
            voice,
            humanize,
            dimension,
            bgmMood,
            bgmVolume,
            userId,
            geminiApiKeys: userGeminiKeys,
            onProgress: (progress, message, meta = {}) => {
                emitProgress(socketId, { progress, message, ...meta });
            },
        });

        if (userId) {
            incrementUserQuota(userId).catch(() => {});
        }

        emitProgress(socketId, {
            progress: 100,
            message: "Video ready.",
            videoUrl: result.videoUrl,
            jobId: result.jobId,
            videoId: result.videoId,
        });

        return NextResponse.json({
            success: true,
            jobId: result.jobId,
            videoId: result.videoId,
            videoUrl: result.videoUrl,
            filename: result.filename,
            duration: result.duration,
            dimension: result.dimension,
            provider: provider || "gemini",
            language: result.language,
            voice: result.voice,
            storage: "local",
        });
    } catch (error) {
        console.error("Video generation error:", error);
        const friendlyError = formatErrorMessage(error);
        const canResume = Boolean(error.canResume || error.jobId);
        const activeJobId = error.jobId || jobId;

        emitProgress(socketId, {
            progress: 0,
            message: canResume
                ? "AI quota limit reached. Job state saved. You can resume."
                : "Video generation failed.",
            error: friendlyError,
            jobId: activeJobId,
            canResume,
        });

        return NextResponse.json(
            {
                success: false,
                error: friendlyError,
                jobId: activeJobId,
                canResume,
            },
            { status: 500 },
        );
    }
}
