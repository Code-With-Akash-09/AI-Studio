import fs from "node:fs";
import { runFFmpeg } from "../../utils/ffmpeg.js";

/**
 * Applies broadcast studio mastering to raw voice audio.
 * Filter chain:
 * - Highpass (80Hz): Eliminates mic rumble and sub-frequency boominess.
 * - Warmth EQ (250Hz): Restores human chest resonance and warmth.
 * - Clarity & Air EQ (3.5kHz): Enhances speech articulation and presence.
 * - Dynamic Broadcast Compression (acompressor): Levelizes volume for punchy, consistent narration.
 * - True Peak Limiter (alimiter): Prevents digital clipping.
 *
 * @param {string} inputAudioPath - Path to raw synthesized audio file
 * @param {string} outputAudioPath - Path to write mastered audio file
 * @param {Object} [options]
 * @param {boolean} [options.enhancePresence=true] - Apply air/clarity boost
 * @param {boolean} [options.warmth=true] - Apply chest resonance boost
 * @returns {Promise<string>} outputAudioPath
 */
export const masterVocalAudio = async (
    inputAudioPath,
    outputAudioPath,
    { enhancePresence = true, warmth = true } = {},
) => {
    if (!fs.existsSync(inputAudioPath)) {
        throw new Error(`Input audio file not found at: ${inputAudioPath}`);
    }

    const filters = ["highpass=f=80"];

    if (warmth) {
        filters.push("equalizer=f=250:width_type=o:width=1.2:g=2.2");
    }

    if (enhancePresence) {
        filters.push("equalizer=f=3500:width_type=o:width=1.0:g=2.0");
    }

    filters.push(
        "acompressor=threshold=-18dB:ratio=3:attack=5:release=50:makeup=2.0dB",
        "alimiter=limit=-1.0dB",
    );

    const filterString = filters.join(",");

    await runFFmpeg([
        "-y",
        "-i",
        inputAudioPath,
        "-af",
        filterString,
        outputAudioPath,
    ]);

    return outputAudioPath;
};
