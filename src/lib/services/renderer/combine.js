import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { runFFmpeg } from "../../utils/ffmpeg.js";

export async function combineScenes(sceneFiles, outputPath) {
    if (!Array.isArray(sceneFiles) || sceneFiles.length === 0) {
        throw new Error("No scene files were generated.");
    }

    // Verify all scene files exist on disk before concat
    for (const scene of sceneFiles) {
        if (!scene?.path || !fs.existsSync(scene.path)) {
            throw new Error(
                `Scene file missing on disk: ${scene?.path || "unknown"}`,
            );
        }
    }

    if (!fs.existsSync(config.tempDir)) {
        fs.mkdirSync(config.tempDir, { recursive: true });
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const concatFile = path.join(config.tempDir, "concat.txt");
    const concatDir = path.dirname(concatFile);

    const content = sceneFiles
        .map((scene) => {
            // FFmpeg concat demuxer resolves relative paths against concat.txt's directory.
            // Using relative paths with forward slashes completely avoids Windows drive letter
            // (C:\) and backslash escape sequence issues.
            let rel = path.relative(concatDir, scene.path).replace(/\\/g, "/");
            if (path.isAbsolute(rel) || rel.startsWith("../..")) {
                rel = scene.path.replace(/\\/g, "/");
            }
            const safePath = rel.replace(/'/g, "'\\''");
            return `file '${safePath}'`;
        })
        .join("\n");

    fs.writeFileSync(concatFile, content, "utf8");

    console.log("\nCombining scene videos...");

    await runFFmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatFile,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-b:a",
        "192k",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outputPath,
    ]);
}
