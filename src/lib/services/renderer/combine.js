import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { runFFmpeg } from "../../utils/ffmpeg.js";

/**
 * Combines rendered scene videos into a final MP4, optionally mixing
 * a storyline background music track with automated volume ducking and fading.
 *
 * @param {Array<Object>} sceneFiles - Array of scene objects with .path and .duration
 * @param {string} outputPath - Destination path for final MP4
 * @param {Object} [options={}]
 * @param {string|null} [options.bgmPath=null] - Absolute path to loopable background music MP3
 * @param {number} [options.bgmVolume=0.1] - BGM volume attenuation factor (0.0 to 1.0)
 * @param {number} [options.totalDuration=0] - Total duration in seconds
 */
export async function combineScenes(
    sceneFiles,
    outputPath,
    { bgmPath = null, bgmVolume = 0.1, totalDuration = 0 } = {},
) {
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
            let rel = path.relative(concatDir, scene.path).replace(/\\/g, "/");
            if (path.isAbsolute(rel) || rel.startsWith("../..")) {
                rel = scene.path.replace(/\\/g, "/");
            }
            const safePath = rel.replace(/'/g, "'\\''");
            return `file '${safePath}'`;
        })
        .join("\n");

    fs.writeFileSync(concatFile, content, "utf8");

    const duration =
        totalDuration ||
        sceneFiles.reduce((total, s) => total + (s.duration || 0), 0);

    const hasBgm = Boolean(
        bgmPath && fs.existsSync(/*turbopackIgnore: true*/ bgmPath),
    );

    if (hasBgm) {
        console.log(
            `\nCombining scene videos with background audio (${bgmPath})...`,
        );
        const safeVol = Math.min(
            Math.max(Number(bgmVolume) || 0.15, 0.02),
            0.5,
        );
        const fadeOutStart = Math.max(0, duration - 2.0);

        const filterComplex =
            `[0:v]fps=30,setpts=PTS-STARTPTS[vout];` +
            `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[voice];` +
            `[1:a]volume=${safeVol},afade=t=in:ss=0:d=1.0,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=2.0,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[bgm];` +
            `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`;

        await runFFmpeg([
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concatFile,
            "-stream_loop",
            "-1",
            "-i",
            bgmPath,
            "-filter_complex",
            filterComplex,
            "-map",
            "[vout]",
            "-map",
            "[aout]",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            outputPath,
        ]);
    } else {
        console.log("\nCombining scene videos (voice only)...");
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
}
