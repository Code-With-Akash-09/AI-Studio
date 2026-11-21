/**
 * On-disk locations of the animation step's non-JS assets (TTS script, raster
 * worker, fonts). Resolved from this module's URL when running as plain Node
 * (scripts, workers) and from the project root when bundled by Next.js, where
 * import.meta.url points into .next/ chunks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function moduleDir() {
    try {
        return path.dirname(fileURLToPath(import.meta.url));
    } catch {
        return "";
    }
}

const candidates = [
    moduleDir(),
    path.join(process.cwd(), "src", "lib", "services", "animation"),
];

/** Directory holding tts_line.py and rasterWorker.js. */
export const ANIMATION_DIR =
    candidates.find(
        (dir) => dir && fs.existsSync(path.join(dir, "tts_line.py")),
    ) || candidates[1];

/** Caption fonts (shared with the main pipeline). */
export const FONTS_DIR = path.resolve(ANIMATION_DIR, "../../assets/fonts");
