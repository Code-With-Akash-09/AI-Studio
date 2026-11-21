/**
 * Character-animation step (opt-in).
 *
 * Public entry points:
 *  - renderCharacterAnimation(dialogue, opts) → renders a full dialogue MP4.
 *  - renderDialogueScene(dialogue, opts) → same, but returns a scene object
 *    shaped like video.service.js `createScene()` results so the main
 *    pipeline can concat it with combineScenes() later.
 *  - isAnimationEnabled() → env flag gate (ANIMATION_ENABLED=true).
 *
 * Nothing here touches MongoDB, uploads, or the live pipeline.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    ANIMATION_DIMENSIONS,
    ANIMATION_FLAG,
    ANIMATION_FPS,
    ANIMATION_SAMPLE_RATE,
} from "../../../constants/animation.js";
import { config } from "../../config.js";
import {
    amplitudeEnvelope,
    decodeAudio,
    estimateSpeechDuration,
    mixInto,
    placeholderEnvelope,
    synthBoing,
    synthesizeLine,
    trimSilence,
    writeWav,
} from "./audio.js";
import { buildDialogueAss } from "./captions.js";
import { CHARACTERS } from "./characters.js";
import { renderVideo } from "./renderer.js";
import { normalizeDialogue } from "./script.js";
import { buildTimeline } from "./timeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_ASSETS = path.resolve(__dirname, "../../../assets/audio");

export { CHARACTERS, LEAD_CHARACTER_IDS, getCharacter } from "./characters.js";
export { normalizeDialogue } from "./script.js";

export function isAnimationEnabled() {
    return String(process.env[ANIMATION_FLAG] || "").toLowerCase() === "true";
}

async function loadAsset(rel, sr) {
    const file = path.join(AUDIO_ASSETS, rel);
    if (!fs.existsSync(file)) return null;
    try {
        return await decodeAudio(file, sr);
    } catch {
        return null;
    }
}

async function prepareLineAudio(dialogue, { tts, cacheDir, fps, sr, onLog }) {
    const result = [];
    for (const line of dialogue.lines) {
        const voice = CHARACTERS[line.speaker].voice;
        const mp3 = tts
            ? await synthesizeLine(line.text, voice, cacheDir)
            : null;
        if (mp3) {
            const samples = trimSilence(await decodeAudio(mp3, sr), sr);
            result.push({
                samples,
                duration: samples.length / sr,
                envelope: amplitudeEnvelope(samples, sr, fps),
                placeholder: false,
            });
        } else {
            const duration = estimateSpeechDuration(line.text);
            result.push({
                samples: null,
                duration,
                envelope: placeholderEnvelope(line.text, duration, fps),
                placeholder: true,
            });
        }
        onLog(
            `Line ${line.index + 1}: ${result.at(-1).duration.toFixed(2)}s ${result.at(-1).placeholder ? "(placeholder)" : `(${voice.name} ${voice.rate} ${voice.pitch})`}`,
        );
    }
    return result;
}

async function mixSoundtrack(timeline, lineAudio, sr) {
    const { dialogue, events, duration } = timeline;
    const total = new Float32Array(Math.ceil(duration * sr));

    events.forEach((ev, i) => {
        if (lineAudio[i].samples)
            mixInto(total, lineAudio[i].samples, ev.start, sr, 1);
    });

    const boing = synthBoing(sr);
    const riser = await loadAsset("sfx/riser.mp3", sr);
    const impact = await loadAsset("sfx/impact.mp3", sr);
    for (const cue of timeline.sfx) {
        if (cue.type === "boing") mixInto(total, boing, cue.time, sr, 0.8);
        if (cue.type === "riser" && riser)
            mixInto(
                total,
                riser.subarray(0, Math.floor(sr * 1.2)),
                cue.time,
                sr,
                0.35,
            );
        if (cue.type === "impact" && impact)
            mixInto(total, impact, cue.time, sr, 0.55);
    }

    if (dialogue.bgm) {
        const bgm = await loadAsset(`bgm/${dialogue.bgm}.mp3`, sr);
        if (bgm?.length) {
            const fadeIn = sr * 1;
            const fadeOut = sr * 1.5;
            for (let i = 0; i < total.length; i++) {
                const t = i / sr;
                const speaking = events.some((e) => t >= e.start && t < e.end);
                let g = dialogue.bgmVolume * (speaking ? 0.6 : 1);
                if (i < fadeIn) g *= i / fadeIn;
                if (i > total.length - fadeOut)
                    g *= (total.length - i) / fadeOut;
                total[i] += bgm[i % bgm.length] * g;
            }
        }
    }

    // soft limiter
    for (let i = 0; i < total.length; i++)
        total[i] = Math.tanh(total[i] * 1.1) / Math.tanh(1.1);
    return total;
}

/**
 * Render a dialogue script to MP4.
 *
 * @param {object} input - dialogue script (see script.js)
 * @param {{
 *   outputPath?: string, workDir?: string, dimension?: "horizontal"|"vertical",
 *   fps?: number, tts?: boolean, cacheDir?: string, onProgress?: Function
 * }} [opts]
 */
export async function renderCharacterAnimation(input, opts = {}) {
    const started = Date.now();
    const dialogue = normalizeDialogue(input);
    if (opts.dimension)
        dialogue.dimension =
            opts.dimension === "vertical" ? "vertical" : "horizontal";
    const { width, height } = ANIMATION_DIMENSIONS[dialogue.dimension];
    const fps = opts.fps || ANIMATION_FPS;
    const sr = ANIMATION_SAMPLE_RATE;
    const onProgress = opts.onProgress || (() => {});
    const onLog = (msg) => console.log(`[Animation] ${msg}`);

    const stamp = `${dialogue.id}-${Date.now()}`;
    const workDir =
        opts.workDir || path.join(config.tempDir, "animation", stamp);
    const outputPath =
        opts.outputPath ||
        path.join(config.outputDir, "animations", `${stamp}.mp4`);
    const cacheDir =
        opts.cacheDir || path.join(config.tempDir, "animation", "tts-cache");
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    onProgress(5, "Synthesizing character voices...");
    const lineAudio = await prepareLineAudio(dialogue, {
        tts: opts.tts !== false,
        cacheDir,
        fps,
        sr,
        onLog,
    });

    const timeline = buildTimeline(dialogue, lineAudio, { width, height, fps });

    onProgress(25, "Mixing dialogue, SFX and BGM...");
    const soundtrack = await mixSoundtrack(timeline, lineAudio, sr);
    const audioPath = path.join(workDir, "soundtrack.wav");
    writeWav(audioPath, soundtrack, sr);

    const { ass, captions } = buildDialogueAss(timeline);
    const assPath = path.join(workDir, "dialogue.ass");
    fs.writeFileSync(assPath, ass, "utf8");

    onProgress(30, "Rendering character frames...");
    const stats = await renderVideo(timeline, {
        audioPath,
        assPath,
        outputPath,
        onProgress: (p, msg) => onProgress(30 + Math.round(p * 65), msg),
    });
    onProgress(100, "Animation ready.");

    const placeholderLines = lineAudio.filter((l) => l.placeholder).length;
    onLog(
        `Rendered ${stats.totalFrames} frames (${stats.rasterized} unique) in ${((Date.now() - started) / 1000).toFixed(1)}s → ${outputPath}`,
    );

    return {
        outputPath,
        workDir,
        duration: timeline.duration,
        width,
        height,
        fps,
        dimension: dialogue.dimension,
        captions,
        usedTts: placeholderLines < lineAudio.length,
        placeholderLines,
        frames: stats.totalFrames,
        uniqueFrames: stats.rasterized,
        events: timeline.events.map((e) => ({
            index: e.index,
            speaker: e.speaker,
            start: e.start,
            end: e.end,
            beat: e.beat,
        })),
    };
}

/**
 * Pipeline hook (not wired in yet): render a dialogue as one "scene" whose
 * shape matches video.service.js createScene() so combineScenes() can concat
 * it. Output is 30fps / 44.1kHz stereo / same WxH as the pipeline scenes.
 */
export async function renderDialogueScene(
    input,
    { index = 1, dimension, tts = true, onProgress } = {},
) {
    const scenePath = path.join(config.tempDir, `scene-${index}.mp4`);
    const result = await renderCharacterAnimation(input, {
        outputPath: scenePath,
        dimension,
        tts,
        onProgress,
    });
    return {
        id: input.id || `anim-${index}`,
        path: scenePath,
        duration: result.duration,
        captions: result.captions,
        visualType: "character",
        narration: result.captions.map((c) => c.text).join(" "),
        dimension: result.dimension,
        emotion: "dialogue",
    };
}
