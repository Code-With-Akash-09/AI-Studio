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
    ANIMATION_FLAG,
    ANIMATION_FPS,
    ANIMATION_OUTPUT_FPS,
    ANIME_FPS,
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
    synthesizeLine,
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

export function isAnimationEnabled() {
    return String(process.env[ANIMATION_FLAG] || "").toLowerCase() === "true";
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

/** Same gains the pipeline's sfx.service cue table uses (whoosh 0.22, impact 0.28, riser 0.18). */
const SFX_GAIN = { whoosh: 0.22, impact: 0.3, riser: 0.2, boing: 0.55 };
const SFX_PRIORITY = { impact: 3, boing: 2, whoosh: 1 };
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
    for (const type of ["whoosh", "riser", "impact"]) {
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
    const bgmTrack = resolveBgmTrack({
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
    if (opts.style) dialogue.style = opts.style === "anime" ? "anime" : "flat";
    const anime = dialogue.style === "anime";
    const fps = opts.fps || (anime ? ANIME_FPS : ANIMATION_FPS);
    const outputFps =
        opts.outputFps || (anime ? ANIME_FPS : ANIMATION_OUTPUT_FPS);
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
        // pipeline scenes are concatenated at 30fps by combineScenes()
        outputFps: ANIMATION_OUTPUT_FPS,
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
