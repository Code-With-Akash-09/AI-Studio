import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { runFFmpeg } from "../../utils/ffmpeg.js";

import { calculateSfxCues, calculateAmbientCue } from "../audio/sfx.service.js";

/**
 * Combines rendered scene videos into a final MP4, optionally mixing
 * a storyline background music track, contextual SFX, and a looped
 * ambient soundscape bed — all with automated volume ducking.
 *
 * Audio layers (priority high → low):
 *  1. Mastered voice (per-scene, already baked in)
 *  2. BGM (sidechain-ducked under voice, -12dB while speech active)
 *  3. SFX cues (timed point events, untouched by sidechain)
 *  4. Ambient bed (looped, very soft 6%, faded in/out)
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

    const sfxCues = calculateSfxCues(sceneFiles);
    const ambientCue = calculateAmbientCue(sceneFiles);
    const hasAmbient = Boolean(ambientCue?.path);

    console.log(
        `\n[Combine] Stitching ${sceneFiles.length} scenes (Duration: ${duration.toFixed(1)}s, BGM: ${hasBgm ? "yes" : "no"}, SFX cues: ${sfxCues.length}, Ambient: ${hasAmbient ? ambientCue.atmosphere : "none"})...`,
    );

    if (hasBgm) {
        const safeVol = Math.min(
            Math.max(Number(bgmVolume) || 0.12, 0.02),
            0.5,
        );
        const fadeOutStart = Math.max(0, duration - 2.0);

        // Build SFX inputs
        const sfxInputs = [];
        const sfxFilters = [];
        let inputIdx = 2; // 0 = concat, 1 = bgm

        for (let k = 0; k < sfxCues.length; k++) {
            const cue = sfxCues[k];
            if (cue?.path && fs.existsSync(cue.path)) {
                sfxInputs.push("-i", cue.path);
                const delayMs = Math.max(0, Math.round(cue.time * 1000));
                sfxFilters.push(
                    `[${inputIdx}:a]adelay=${delayMs}|${delayMs},volume=${cue.volume || 0.2},aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[sfx${k}]`,
                );
                inputIdx++;
            }
        }

        // Build ambient bed input
        const ambientInputs = [];
        let ambientFilter = "";
        if (hasAmbient) {
            ambientInputs.push("-stream_loop", "-1", "-i", ambientCue.path);
            const ambVol = Math.min(Math.max(Number(ambientCue.volume) || 0.06, 0.02), 0.15);
            ambientFilter = `[${inputIdx}:a]volume=${ambVol},afade=t=in:ss=0:d=1.5,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=2.0,atrim=duration=${duration.toFixed(3)},aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[ambient_bed]`;
            inputIdx++;
        }

        // Build filter complex
        let filterComplex =
            "[0:v]fps=30,setpts=PTS-STARTPTS[vout];" +
            "[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asplit=2[voice_main][voice_sidechain];" +
            `[1:a]volume=${safeVol},afade=t=in:ss=0:d=0.8,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=2.0,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[bgm_raw];` +
            "[bgm_raw][voice_sidechain]sidechaincompress=threshold=0.08:ratio=3.5:attack=40:release=300[bgm_ducked]";

        if (ambientFilter) {
            filterComplex += `;${ambientFilter}`;
        }

        // Determine final amix inputs
        const amixSources = ["[voice_main]", "[bgm_ducked]"];
        if (hasAmbient) amixSources.push("[ambient_bed]");

        if (sfxFilters.length > 0) {
            const sfxMixTags = sfxFilters.map((_, idx) => `[sfx${idx}]`).join("");
            filterComplex +=
                `;${sfxFilters.join(";")};` +
                `${sfxMixTags}amix=inputs=${sfxFilters.length}:duration=first:dropout_transition=0[sfx_mix];` +
                `${amixSources.join("")}[sfx_mix]amix=inputs=${amixSources.length + 1}:duration=first:dropout_transition=2[aout]`;
        } else {
            filterComplex += `;${amixSources.join("")}amix=inputs=${amixSources.length}:duration=first:dropout_transition=2[aout]`;
        }

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
            ...sfxInputs,
            ...ambientInputs,
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

