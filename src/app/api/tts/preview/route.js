import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { config } from "../../../../lib/config.js";
import { generateVoice } from "../../../../lib/services/tts/tts.service.js";
import { getEmotionProsody, resolveVoice } from "../../../../lib/services/tts/voices.js";
import { masterVocalAudio } from "../../../../lib/services/audio/audioMastering.js";
import { ensureDirectories } from "../../../../lib/utils/files.js";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        ensureDirectories();
        const body = await request.json().catch(() => ({}));
        const {
            text,
            voice,
            language = "en",
            gender = "male",
            emotion = "hyped",
            vocalTone = "auto",
            speedMultiplier = 1.0,
            masterAudio = true,
        } = body;

        const resolvedVoice = resolveVoice({ voice, language, gender });
        const sampleText =
            typeof text === "string" && text.trim().length > 0
                ? text.trim().slice(0, 150)
                : language === "hi"
                  ? "नमस्ते! एआई स्टूडियो में आपका स्वागत है। चलिए शानदार वीडियो बनाते हैं!"
                  : "Hey there! Welcome to AI Studio. Let's create something incredible together!";

        const prosody = getEmotionProsody({
            emotion,
            vocalTone,
            speedMultiplier,
        });

        const id = crypto.randomBytes(4).toString("hex");
        const rawPath = path.join(config.tempDir, `preview-raw-${id}.mp3`);
        const finalPath = path.join(config.tempDir, `preview-${id}.mp3`);

        await generateVoice(
            sampleText,
            rawPath,
            resolvedVoice,
            null,
            prosody,
        );

        let outputAudioPath = rawPath;
        if (masterAudio) {
            try {
                await masterVocalAudio(rawPath, finalPath);
                outputAudioPath = finalPath;
            } catch (masterErr) {
                console.warn("[TTS Preview] Mastering fallback to raw:", masterErr.message);
                outputAudioPath = rawPath;
            }
        }

        const audioBuffer = fs.readFileSync(outputAudioPath);

        // Clean up temp files asynchronously
        setTimeout(() => {
            try {
                if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
                if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
            } catch (_) {}
        }, 10000);

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
                "Cache-Control": "public, max-age=300",
            },
        });
    } catch (error) {
        console.error("[TTS Preview Error]:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to synthesize voice preview." },
            { status: 500 },
        );
    }
}
