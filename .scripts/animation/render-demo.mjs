/**
 * Render the sample Raaz Explain Tv dialogue to an MP4 + still frames.
 *
 * Usage (from repo root):
 *   node .scripts/animation/render-demo.mjs [sample.json] [outDir] [--vertical] [--no-tts]
 *
 * Writes only to outDir (default /workspace/anim-demo). No DB, no uploads.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getFFmpegPath } from "../../src/lib/utils/ffmpeg.js";
import { renderCharacterAnimation } from "../../src/lib/services/animation/index.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const samplePath =
    positional[0] || "src/lib/services/animation/samples/haveli-mirror.json";
const outDir = path.resolve(positional[1] || "/workspace/anim-demo");
const dimension = flags.has("--vertical") ? "vertical" : undefined;

const dialogue = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const name = `${dialogue.id}${dimension === "vertical" ? "-vertical" : ""}`;
fs.mkdirSync(outDir, { recursive: true });

const result = await renderCharacterAnimation(dialogue, {
    outputPath: path.join(outDir, `${name}.mp4`),
    workDir: path.join(outDir, "work", name),
    cacheDir: path.join(outDir, "tts-cache"),
    dimension,
    tts: !flags.has("--no-tts"),
    onProgress: (p, msg) =>
        process.stdout.write(`\r${String(p).padStart(3)}% ${msg}        `),
});
process.stdout.write("\n");

// Still frames: mid humor beat, mid reveal, and a talking frame
const stillsDir = path.join(outDir, "stills");
fs.mkdirSync(stillsDir, { recursive: true });
const humor = result.events.find((e) => e.beat === "humor");
const reveal = result.events.find((e) => e.beat === "reveal");
const picks = [
    ["01-intro", result.events[0].start + 1.2],
    ["02-humor-beat", humor ? humor.end + 0.45 : result.duration * 0.4],
    ["03-reveal", reveal ? reveal.start + 1.0 : result.duration * 0.75],
];
for (const [label, t] of picks) {
    const out = path.join(stillsDir, `${name}-${label}.png`);
    spawnSync(getFFmpegPath(), [
        "-y",
        "-v",
        "error",
        "-ss",
        t.toFixed(2),
        "-i",
        result.outputPath,
        "-frames:v",
        "1",
        out,
    ]);
}

fs.writeFileSync(
    path.join(outDir, `${name}.result.json`),
    JSON.stringify(result, null, 2),
);
console.log(JSON.stringify({ ...result, captions: undefined }, null, 2));
