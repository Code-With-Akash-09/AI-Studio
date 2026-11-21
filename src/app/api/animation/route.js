import path from "node:path";
import { NextResponse } from "next/server";
import { ANIMATION_FLAG } from "../../../constants/animation.js";
import { config } from "../../../lib/config.js";
import { connectDB } from "../../../lib/db/connection.js";
import { authenticate } from "../../../lib/middlewares/auth.js";
import {
    CHARACTERS,
    isAnimationEnabled,
    normalizeDialogue,
    renderCharacterAnimation,
} from "../../../lib/services/animation/index.js";
import { emitProgress } from "../../../lib/services/socket.service.js";
import { formatErrorMessage } from "../../../lib/utils/errors.js";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Opt-in character-animation endpoint. Disabled (404) unless
 * ANIMATION_ENABLED=true. Renders locally to public/videos/animations/,
 * never writes to MongoDB and never uploads anywhere.
 */
function disabled() {
    return NextResponse.json(
        {
            success: false,
            error: `Character animation is disabled. Set ${ANIMATION_FLAG}=true to enable.`,
        },
        { status: 404 },
    );
}

export async function GET(request) {
    if (!isAnimationEnabled()) return disabled();
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    const roster = Object.values(CHARACTERS).map((c) => ({
        id: c.id,
        name: c.name,
        nameHi: c.nameHi,
        role: c.role,
        archetype: c.archetype,
        oneLiner: c.oneLiner,
        catchphrases: c.catchphrases,
        voice: c.voice,
    }));
    return NextResponse.json({ success: true, characters: roster });
}

export async function POST(request) {
    if (!isAnimationEnabled()) return disabled();
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json().catch(() => ({}));
    const { dialogue, dimension, tts = true, socketId } = body;

    try {
        normalizeDialogue(dialogue);
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 },
        );
    }

    try {
        const filename = `anim-${Date.now()}.mp4`;
        const result = await renderCharacterAnimation(dialogue, {
            outputPath: path.join(config.outputDir, "animations", filename),
            dimension,
            tts: tts !== false,
            onProgress: (progress, message) =>
                emitProgress(socketId, { progress, message }),
        });
        return NextResponse.json({
            success: true,
            videoUrl: `/videos/animations/${filename}`,
            filename,
            duration: result.duration,
            dimension: result.dimension,
            usedTts: result.usedTts,
            placeholderLines: result.placeholderLines,
            captions: result.captions,
        });
    } catch (error) {
        console.error("Animation render error:", error);
        return NextResponse.json(
            { success: false, error: formatErrorMessage(error) },
            { status: 500 },
        );
    }
}
