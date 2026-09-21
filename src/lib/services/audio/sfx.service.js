import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SFX_DIR = path.resolve(__dirname, "../../../assets/audio/sfx");

/**
 * Returns path to requested SFX track if available.
 * @param {"whoosh"|"impact"|"riser"} type
 * @returns {string|null}
 */
export function getSfxPath(type) {
    const filename = `${type}.mp3`;
    const sfxPath = path.join(SFX_DIR, filename);
    return fs.existsSync(sfxPath) ? sfxPath : null;
}

/**
 * Calculate SFX cue triggers across the video timeline:
 * - Whoosh transition cue at the beginning of each scene transition (except scene 1).
 * - Impact / punchline cue on punchline/climax scenes.
 * - Riser cue on suspense / curious scenes.
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
                    volume: 0.22,
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
                    volume: 0.28,
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
                    volume: 0.18,
                });
            }
        }

        currentTime += sceneDuration;
    }

    return cues;
}
