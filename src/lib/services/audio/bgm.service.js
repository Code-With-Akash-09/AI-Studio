import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_BGM_VOLUME } from "../../../constants/audio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BGM_DIR = path.resolve(__dirname, "../../../assets/audio/bgm");

const MOOD_MAP = {
    inspirational: {
        filename: "inspirational.mp3",
        label: "Inspirational & Uplifting",
    },
    dramatic: {
        filename: "dramatic.mp3",
        label: "Dramatic & Cinematic",
    },
    upbeat: {
        filename: "upbeat.mp3",
        label: "Upbeat & Energetic",
    },
    chill: {
        filename: "chill.mp3",
        label: "Chill & Lo-Fi",
    },
    suspense: {
        filename: "suspense.mp3",
        label: "Suspense & Mystery",
    },
    humorous: {
        filename: "humorous.mp3",
        label: "Playful & Quirky",
    },
};

/**
 * Resolves the background music track based on the user's setting and storyline analysis.
 *
 * @param {Object} params
 * @param {string} [params.requestedMood="auto"] - User's chosen mood in studio settings ("auto", "none", or specific mood)
 * @param {string} [params.detectedMood] - AI-detected mood from storyline/script analysis
 * @param {number} [params.volume=0.15] - Desired volume multiplier (0.0 to 1.0)
 * @returns {{ mood: string, trackPath: string|null, label: string, volume: number } | null}
 */
export function resolveBgmTrack({
    requestedMood = "auto",
    detectedMood = "inspirational",
    volume = DEFAULT_BGM_VOLUME,
} = {}) {
    const cleanRequested = String(requestedMood || "auto")
        .toLowerCase()
        .trim();

    if (cleanRequested === "none") {
        return null;
    }

    let targetMood = cleanRequested;

    if (targetMood === "auto" || !MOOD_MAP[targetMood]) {
        const cleanDetected = String(detectedMood || "")
            .toLowerCase()
            .trim();
        targetMood = MOOD_MAP[cleanDetected] ? cleanDetected : "inspirational";
    }

    const config = MOOD_MAP[targetMood] || MOOD_MAP.inspirational;
    const trackPath = path.join(BGM_DIR, config.filename);

    if (!fs.existsSync(trackPath)) {
        console.warn(`[BGM] Background music track not found at: ${trackPath}`);
        return null;
    }

    const safeVolume = Math.min(
        Math.max(Number(volume) || DEFAULT_BGM_VOLUME, 0.02),
        0.5,
    );

    return {
        mood: targetMood,
        label: config.label,
        trackPath,
        volume: safeVolume,
    };
}
