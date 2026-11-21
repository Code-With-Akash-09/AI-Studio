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
import {
    ANIMATION_DIMENSIONS,
    ANIMATION_FPS,
    ANIMATION_OUTPUT_FPS,
    ANIME_FPS,
    STYLES,
    ANIMATION_SAMPLE_RATE,
} from "../../../constants/animation.js";
import { config } from "../../config.js";
import { resolveBgmTrack } from "../audio/bgm.service.js";
import { getSfxPath } from "../audio/sfx.service.js";
import {
    amplitudeEnvelope,
    decodeAudio,
    estimateSpeechDuration,
    mixInto,
    placeholderEnvelope,
    synthBoing,
    readWordTimings,
    synthesizeLine,
    trimLead,
    trimSilence,
    writeWav,
} from "./audio.js";
import { buildDialogueAss } from "./captions.js";
import { CHARACTERS } from "./characters.js";
import { renderVideo } from "./renderer.js";
import { normalizeDialogue } from "./script.js";
import { buildTimeline } from "./timeline.js";

export { CHARACTERS, LEAD_CHARACTER_IDS, getCharacter } from "./characters.js";
export { normalizeDialogue } from "./script.js";

export { isAnimationEnabled } from "./flags.js";

async function prepareLineAudio(dialogue, { tts, cacheDir, fps, sr, onLog }) {
    const result = [];
    for (const line of dialogue.lines) {
        const voice = CHARACTERS[line.speaker].voice;
        const mp3 = tts
            ? await synthesizeLine(line.text, voice, cacheDir)
            : null;
        if (mp3) {
            const raw = await decodeAudio(mp3, sr);
            const samples = trimSilence(raw, sr);
            const lead = trimLead(raw, sr);
            result.push({
                samples,
                duration: samples.length / sr,
                envelope: amplitudeEnvelope(samples, sr, fps),
                // Edge TTS word boundaries, shifted into the trimmed clip
                words: readWordTimings(mp3).map((w) => ({
                    ...w,
                    t: w.t - lead,
                })),
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

/**
 * Story-beat SFX only (no screen-switch/transition sounds). Gains follow the
 * pipeline's sfx.service levels (impact 0.28, riser 0.18).
 */
const SFX_GAIN = { impact: 0.3, riser: 0.2, boing: 0.55 };
const SFX_PRIORITY = { impact: 3, boing: 2 };
/** Any cue starting within this window after another (non-riser) cue is softened. */
const STACK_WINDOW = 0.5;
const STACK_ATTENUATION = 0.55;
/** BGM ducking under dialogue (pipeline mixes flat; ducking keeps lines clear). */
const DUCK_LEVEL = 0.55;
const DUCK_ATTACK = 0.12;
const DUCK_RELEASE = 0.35;
const LOOP_CROSSFADE = 0.5;

/** Make a looped BGM seamless with a short crossfade at the seam. */
function makeSeamlessLoop(bgm, sr) {
    const xf = Math.min(
        Math.floor(LOOP_CROSSFADE * sr),
        Math.floor(bgm.length / 4),
    );
    const loopLen = bgm.length - xf;
    const out = new Float32Array(loopLen);
    for (let j = 0; j < loopLen; j++) {
        if (j < xf) {
            const a = j / xf;
            out[j] = bgm[j] * a + bgm[loopLen + j] * (1 - a);
        } else {
            out[j] = bgm[j];
        }
    }
    return out;
}

/** Smoothed per-100Hz ducking gain curve. */
function duckingCurve(events, duration) {
    const rate = 100;
    const steps = Math.ceil(duration * rate) + 1;
    const curve = new Float32Array(steps);
    let g = 1;
    for (let k = 0; k < steps; k++) {
        const t = k / rate;
        const speaking = events.some(
            (e) => t >= e.start - 0.05 && t < e.end + 0.05,
        );
        const target = speaking ? DUCK_LEVEL : 1;
        const tau = target < g ? DUCK_ATTACK : DUCK_RELEASE;
        g += (target - g) * (1 - Math.exp(-1 / (rate * tau)));
        curve[k] = g;
    }
    return { curve, rate };
}

async function loadFile(file, sr) {
    if (!file || !fs.existsSync(file)) return null;
    try {
        return await decodeAudio(file, sr);
    } catch {
        return null;
    }
}

async function mixSoundtrack(timeline, lineAudio, sr) {
    const { dialogue, events, duration } = timeline;
    const total = new Float32Array(Math.ceil(duration * sr));
    const used = { bgm: null, sfx: {} };

    events.forEach((ev, i) => {
        if (lineAudio[i].samples)
            mixInto(total, lineAudio[i].samples, ev.start, sr, 1);
    });

    // SFX from the system library (src/assets/audio/sfx via sfx.service) + synthesized boing
    const buffers = { boing: synthBoing(sr) };
    const needed = new Set(timeline.sfx.map((c) => c.type));
    for (const type of ["riser", "impact"]) {
        if (!needed.has(type)) continue;
        const file = getSfxPath(type);
        buffers[type] = await loadFile(file, sr);
        if (buffers[type]) used.sfx[type] = file;
    }
    const hits = timeline.sfx.filter(
        (c) => c.type !== "riser" && buffers[c.type],
    );
    const mixed = [];
    for (const cue of timeline.sfx) {
        const buf = buffers[cue.type];
        if (!buf) continue;
        let gain = SFX_GAIN[cue.type] ?? 0.2;
        if (cue.type !== "riser") {
            // Soften a cue when a more important hit (or an earlier equal one) is close by.
            const p = SFX_PRIORITY[cue.type] ?? 1;
            const crowded = hits.some((o) => {
                if (o === cue || Math.abs(o.time - cue.time) >= STACK_WINDOW)
                    return false;
                const op = SFX_PRIORITY[o.type] ?? 1;
                return op > p || (op === p && o.time < cue.time);
            });
            if (crowded) gain *= STACK_ATTENUATION;
        }
        mixInto(total, buf, cue.time, sr, gain);
        mixed.push({ ...cue, gain: Math.round(gain * 1000) / 1000 });
    }

    // Background music resolved exactly like the pipeline (bgm.service)
    const bgmTrack = !dialogue.bgm
        ? null
        : resolveBgmTrack({
              requestedMood: dialogue.bgm || "none",
              detectedMood: "suspense",
              volume: dialogue.bgmVolume,
          });
    const bgmRaw = await loadFile(bgmTrack?.trackPath, sr);
    if (bgmTrack && bgmRaw?.length) {
        used.bgm = { ...bgmTrack };
        const loop = makeSeamlessLoop(bgmRaw, sr);
        const { curve, rate } = duckingCurve(events, duration);
        // pipeline fades: 1.0s in, 2.0s out
        const fadeIn = sr * 1.0;
        const fadeOut = sr * 2.0;
        for (let i = 0; i < total.length; i++) {
            const pos = (i / sr) * rate;
            const k = Math.floor(pos);
            const duck =
                curve[k] +
                (curve[Math.min(k + 1, curve.length - 1)] - curve[k]) *
                    (pos - k);
            let g = bgmTrack.volume * duck;
            if (i < fadeIn) g *= i / fadeIn;
            if (i > total.length - fadeOut) g *= (total.length - i) / fadeOut;
            total[i] += loop[i % loop.length] * g;
        }
    }

    // soft limiter
    for (let i = 0; i < total.length; i++)
        total[i] = Math.tanh(total[i] * 1.1) / Math.tanh(1.1);
    return { samples: total, used, cues: mixed };
}

/**
 * Build the exact timeline a render would use (TTS from cache), without
 * rendering video. Used by the rig QA tool.
 * @param {object} input - dialogue script
 * @param {{ dimension?: string, cacheDir?: string, tts?: boolean }} [opts]
 */
export async function buildCharacterTimeline(input, opts = {}) {
    const dialogue = normalizeDialogue(input);
    if (opts.dimension)
        dialogue.dimension =
            opts.dimension === "vertical" ? "vertical" : "horizontal";
    const { width, height } = ANIMATION_DIMENSIONS[dialogue.dimension];
    const fps = dialogue.style !== "flat" ? ANIME_FPS : ANIMATION_FPS;
    const lineAudio = await prepareLineAudio(dialogue, {
        tts: opts.tts !== false,
        cacheDir:
            opts.cacheDir ||
            path.join(config.tempDir, "animation", "tts-cache"),
        fps,
        sr: ANIMATION_SAMPLE_RATE,
        onLog: () => {},
    });
    return buildTimeline(dialogue, lineAudio, { width, height, fps });
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
    if (STYLES.includes(opts.style)) dialogue.style = opts.style;
    // anime + classic animate at 24fps; the original flat rig at 15fps → 30fps
    const smooth24 = dialogue.style !== "flat";
    const fps = opts.fps || (smooth24 ? ANIME_FPS : ANIMATION_FPS);
    const outputFps =
        opts.outputFps || (smooth24 ? ANIME_FPS : ANIMATION_OUTPUT_FPS);
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
    writeWav(audioPath, soundtrack.samples, sr);
    onLog(
        `Audio: BGM ${soundtrack.used.bgm ? `${soundtrack.used.bgm.mood} @ ${soundtrack.used.bgm.volume}` : "none"}, ${timeline.transitions.length} transitions, ${soundtrack.cues.length} SFX cues`,
    );

    const { ass, captions } = buildDialogueAss(timeline);
    const assPath = path.join(workDir, "dialogue.ass");
    fs.writeFileSync(assPath, ass, "utf8");

    onProgress(30, "Rendering character frames...");
    const stats = await renderVideo(timeline, {
        audioPath,
        assPath,
        outputPath,
        outputFps,
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
        outputFps,
        style: dialogue.style,
        dimension: dialogue.dimension,
        captions,
        usedTts: placeholderLines < lineAudio.length,
        placeholderLines,
        audio: {
            bgm: soundtrack.used.bgm,
            sfxFiles: soundtrack.used.sfx,
            cues: soundtrack.cues,
        },
        transitions: timeline.transitions,
        frames: stats.totalFrames,
        uniqueFrames: stats.rasterized,
        events: timeline.events.map((e) => ({
            index: e.index,
            speaker: e.speaker,
            start: e.start,
            end: e.end,
            beat: e.beat,
            camera: e.camera,
        })),
    };
}

/**
 * Pipeline hook (used by video.service.js createScene() for visualType
 * "character", see pipeline.js): render a dialogue as one "scene" whose shape
 * matches createScene() results so combineScenes() can concat it.
 * Output is 25fps (what the pipeline's scenes really are) / 44.1kHz stereo /
 * SAR 1 / yuv420p / same WxH as the pipeline scenes.
 */
/** Effective frame rate of the main pipeline's rendered scenes (see below). */
export const PIPELINE_SCENE_FPS = 25;

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
        // Match what the pipeline's own scenes actually contain: scenes.js
        // runs `fps=30,...,setpts=PTS-STARTPTS`, and with the bundled ffmpeg
        // 7 the setpts resets the rate, so image/text/video scenes come out
        // at 25fps; the voice-only combine keeps 25fps (the BGM path re-times
        // to 30). Animating natively at 25fps avoids any frame drop/dup.
        fps: PIPELINE_SCENE_FPS,
        outputFps: PIPELINE_SCENE_FPS,
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
        usedTts: result.usedTts,
        placeholderLines: result.placeholderLines,
    };
}
