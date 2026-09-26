import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SFX_DIR = path.resolve(__dirname, "../../../assets/audio/sfx");
const AMBIENT_DIR = path.resolve(__dirname, "../../../assets/audio/ambient");

/**
 * Returns path to requested SFX track if available.
 * @param {"whoosh"|"impact"|"riser"|"click"|"glitch"|"chime"|"ambient_wind"|"ambient_cyber"} type
 * @returns {string|null}
 */
export function getSfxPath(type) {
    const filename = `${type}.mp3`;
    const sfxPath = path.join(SFX_DIR, filename);
    return fs.existsSync(sfxPath) ? sfxPath : null;
}

/**
 * Ambient atmosphere tag → filename mapping.
 * Files live in src/assets/audio/ambient/
 */
const AMBIENT_MAP = {
    nature_wind: "nature_wind.mp3",
    cyber_hum: "cyber_hum.mp3",
    room_ambient: "room_ambient.mp3",
    cinematic_space: "cinematic_space.mp3",
    ancient_temple: "ancient_temple.mp3",
};

/**
 * Returns path to an ambient soundscape bed track if the file exists.
 * @param {string} atmosphere - ambientAtmosphere tag from scene analysis
 * @returns {string|null}
 */
export function getAmbientPath(atmosphere) {
    const filename = AMBIENT_MAP[atmosphere];
    if (!filename) return null;
    const fullPath = path.join(AMBIENT_DIR, filename);
    return fs.existsSync(fullPath) ? fullPath : null;
}

/**
 * Picks the dominant ambient atmosphere across all scenes and returns a
 * single ambient cue to be looped softly under the entire video.
 * Falls back gracefully when no matching file exists.
 *
 * @param {Array<Object>} sceneFiles - Scene results with .ambientAtmosphere
 * @returns {{ path: string, volume: number } | null}
 */
export function calculateAmbientCue(sceneFiles) {
    if (!Array.isArray(sceneFiles) || sceneFiles.length === 0) return null;

    // Tally atmosphere votes
    const tally = {};
    for (const scene of sceneFiles) {
        const atm = scene.ambientAtmosphere;
        if (atm && atm !== "none") {
            tally[atm] = (tally[atm] || 0) + 1;
        }
    }

    if (Object.keys(tally).length === 0) return null;

    // Pick most frequent
    const dominant = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    const ambientPath = getAmbientPath(dominant);

    if (!ambientPath) {
        console.warn(`[Ambient] No file found for atmosphere: "${dominant}"`);
        return null;
    }

    return { path: ambientPath, volume: 0.06, atmosphere: dominant };
}

/**
 * Calculate SFX & Foley cue triggers across the video timeline:
 * - Whoosh transition cue at scene boundaries.
 * - Impact / punchline cue on climax scenes.
 * - Riser cue on suspense / mystery.
 * - Click / shutter on macro / tech / fact scenes.
 * - Glitch on hyped / cyber scenes.
 * - Chime on inspirational / discovery scenes.
 *
 * @param {Array<Object>} sceneFiles - Array of scene objects with .duration and directorial metadata
 * @returns {Array<{ type: string, path: string, time: number, volume: number }>}
 */
export function calculateSfxCues(sceneFiles) {
    if (!Array.isArray(sceneFiles) || sceneFiles.length === 0) return [];

    const cues = [];
    let currentTime = 0;

    for (let i = 0; i < sceneFiles.length; i++) {
        const scene = sceneFiles[i];
        const sceneDuration = Number(scene.duration) || 3.0;

        // 1. Transition Whoosh at scene boundaries (starts slightly before cut)
        if (i > 0) {
            const whooshPath = getSfxPath("whoosh");
            if (whooshPath) {
                cues.push({
                    type: "whoosh",
                    path: whooshPath,
                    time: Math.max(0, currentTime - 0.2),
                    volume: 0.20,
                });
            }
        }

        // 2. Punchline Impact Hit on climax / punchline scenes
        if (scene.punchline) {
            const impactPath = getSfxPath("impact");
            if (impactPath) {
                cues.push({
                    type: "impact",
                    path: impactPath,
                    time: currentTime + Math.min(1.0, sceneDuration * 0.4),
                    volume: 0.25,
                });
            }
        }

        // 3. Question / Curious Riser
        if (scene.emotion === "curious" || scene.emotion === "shocked") {
            const riserPath = getSfxPath("riser");
            if (riserPath && i === 0) {
                cues.push({
                    type: "riser",
                    path: riserPath,
                    time: 0.1,
                    volume: 0.16,
                });
            }
        }

        // 4. Glitch cue on hyped/cyber action scenes
        if (scene.emotion === "hyped" && i > 0 && i % 2 === 1) {
            const glitchPath = getSfxPath("glitch");
            if (glitchPath) {
                cues.push({
                    type: "glitch",
                    path: glitchPath,
                    time: currentTime + 0.1,
                    volume: 0.15,
                });
            }
        }

        // 5. Chime / Discovery cue on inspirational / fact highlights
        if (scene.onScreenHighlight && (scene.emotion === "thoughtful" || scene.emotion === "curious")) {
            const chimePath = getSfxPath("chime");
            if (chimePath) {
                cues.push({
                    type: "chime",
                    path: chimePath,
                    time: currentTime + 0.5,
                    volume: 0.18,
                });
            }
        }

        currentTime += sceneDuration;
    }

    return cues;
}

