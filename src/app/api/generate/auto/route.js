import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import { incrementUserQuota } from "../../../../lib/db/repositories/user.repository.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";
import { generateAutomatedVideo } from "../../../../lib/services/automation.service.js";
import { emitProgress } from "../../../../lib/services/socket.service.js";
import { formatErrorMessage } from "../../../../lib/utils/errors.js";

export const runtime = "nodejs";
export const maxDuration = 300;

/** x-automation-key must equal AUTOMATION_SECRET (if set); runs as AUTOMATION_USER_ID. */
function automationKeyOk(request) {
    const secret = process.env.AUTOMATION_SECRET || "";
    const given = request.headers.get("x-automation-key") || "";
    if (!secret || !given) return false;
    const a = crypto.createHash("sha256").update(secret).digest();
    const b = crypto.createHash("sha256").update(given).digest();
    return crypto.timingSafeEqual(a, b);
}

/**
 * Automated generation: POST { topic, dimension?, socketId? } (no other input).
 * The video mode is the server default (ANIMATION_PIPELINE_DEFAULT), so with
 * ANIMATION_ENABLED=true + ANIMATION_PIPELINE_DEFAULT=full every topic becomes
 * a full cartoon episode written by the AI.
 *
 * Answers 202 { jobId } at once (a cartoon takes minutes) — poll
 * GET /api/jobs/<jobId>. Add ?wait=1 to block until the video is ready.
 * Auth: a logged-in user's Bearer token, or x-automation-key = AUTOMATION_SECRET
 * (video owned by AUTOMATION_USER_ID).
 */
export async function POST(request) {
    await connectDB();
    let user = null;
    if (!automationKeyOk(request)) {
        const authResult = await authenticate(request);
        if (authResult instanceof NextResponse) return authResult;
        user = authResult.user;
    }
    const body = await request.json().catch(() => ({}));
    const { topic, dimension, socketId } = body;
    if (String(topic || "").trim().length < 10) {
        return NextResponse.json(
            { success: false, error: "A topic of 10+ characters is required." },
            { status: 400 },
        );
    }
    const jobId = `job-auto-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const ownerId = user ? String(user._id) : process.env.AUTOMATION_USER_ID;
    const run = () =>
        generateAutomatedVideo({
            topic,
            user,
            jobId,
            ...(dimension ? { dimension } : {}),
            onProgress: (progress, message, meta = {}) =>
                emitProgress(socketId, { progress, message, ...meta }),
        }).then((result) => {
            if (ownerId) incrementUserQuota(ownerId).catch(() => {});
            return result;
        });

    if (new URL(request.url).searchParams.get("wait") !== "1") {
        run().catch((error) =>
            console.error(
                `[Automation] Job ${jobId} failed:`,
                error.message || error,
            ),
        );
        return NextResponse.json(
            { success: true, jobId, status: "processing" },
            { status: 202 },
        );
    }
    try {
        const result = await run();
        return NextResponse.json({
            success: true,
            jobId: result.jobId,
            videoId: result.videoId,
            videoUrl: result.videoUrl,
            duration: result.duration,
            dimension: result.dimension,
            animationMode: result.animationMode,
            ...(result.episode ? { episode: result.episode } : {}),
        });
    } catch (error) {
        console.error("Automated generation error:", error);
        return NextResponse.json(
            {
                success: false,
                error: formatErrorMessage(error),
                jobId: error.jobId || jobId,
                canResume: Boolean(error.canResume),
            },
            { status: 500 },
        );
    }
}
