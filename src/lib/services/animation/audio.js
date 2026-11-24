/**
 * Audio helpers for the animation step: per-line Edge TTS (cached), PCM decode,
 * amplitude envelopes for lip-sync, synthesized comic SFX, and WAV writing.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getFFmpegPath } from "../../utils/ffmpeg.js";
import { hashString } from "./random.js";

import { ANIMATION_DIR } from "./paths.js";

const TTS_SCRIPT = path.join(ANIMATION_DIR, "tts_line.py");

function resolvePython() {
    if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
    const local = path.join(process.cwd(), ".venv/bin/python");
    if (fs.existsSync(local)) return local;
    return process.platform === "win32" ? "python" : "python3";
}

function run(cmd, args, { stdout = false, timeoutMs = 60000 } = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
            env: {
                ...process.env,
                PYTHONUTF8: "1",
                PYTHONDONTWRITEBYTECODE: "1",
            },
        });
        const chunks = [];
        let err = "";
        const timer = setTimeout(() => {
            proc.kill("SIGKILL");
            reject(new Error(`${path.basename(cmd)} timed out`));
        }, timeoutMs);
        if (stdout) proc.stdout.on("data", (d) => chunks.push(d));
        proc.stderr.on("data", (d) => {
            err += d.toString();
        });
        proc.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
        });
        proc.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(Buffer.concat(chunks));
            else
                reject(
                    new Error(
                        `${path.basename(cmd)} exited ${code}: ${err.slice(-400)}`,
                    ),
                );
        });
    });
}

/**
 * Edge TTS retry schedule (seconds to wait before each attempt). Edge's
 * service hiccups for a few seconds to a minute at a time, so we wait it out
 * before ever using the robotic offline voice. Override for tests with
 * ANIMATION_TTS_BACKOFF="0,3,8".
 */
function edgeBackoff() {
    const raw = process.env.ANIMATION_TTS_BACKOFF;
    if (raw) {
        const list = raw
            .split(",")
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v) && v >= 0);
        if (list.length) return list;
    }
    return [0, 3, 8, 15, 30];
}
/** After a full backoff fails, later lines try Edge once before falling back. */
const EDGE_DOWN_MS = 5 * 60 * 1000;
let edgeDownUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True when synthesizeLine() returned the offline pyttsx3 voice. */
export function isOfflineVoice(file) {
    return typeof file === "string" && file.endsWith(".pyttsx3.wav");
}

/**
 * Synthesize a line with Edge TTS. Cached on disk by (text, voice, rate, pitch).
 * Retries with a long backoff; then falls back to pyttsx3 (offline, robotic,
 * not cached so the next render tries Edge again); then null (placeholder).
 * @returns {Promise<string|null>} audio path, or null when no TTS works.
 */
export async function synthesizeLine(text, voice, cacheDir) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const key = hashString(
        `${voice.name}|${voice.rate}|${voice.pitch}|${text}`,
    ).toString(16);
    const out = path.join(cacheDir, `line-${key}.mp3`);
    const wordsOut = wordsPath(out);
    // re-synthesize old cache entries that have no word timings yet
    if (
        fs.existsSync(out) &&
        fs.statSync(out).size > 1000 &&
        fs.existsSync(wordsOut)
    )
        return out;
    const schedule = Date.now() < edgeDownUntil ? [0] : edgeBackoff();
    let lastError = null;
    for (let attempt = 0; attempt < schedule.length; attempt++) {
        if (schedule[attempt] > 0) {
            console.warn(
                `[Animation] Edge TTS retry ${attempt + 1}/${schedule.length} in ${schedule[attempt]}s (${String(lastError?.message || "").slice(0, 120)})`,
            );
            await sleep(schedule[attempt] * 1000);
        }
        try {
            await run(resolvePython(), [
                TTS_SCRIPT,
                text,
                out,
                voice.name,
                voice.rate || "+0%",
                voice.pitch || "+0Hz",
                wordsOut,
            ]);
            if (fs.existsSync(out) && fs.statSync(out).size > 1000) {
                edgeDownUntil = 0;
                return out;
            }
        } catch (error) {
            lastError = error;
        }
    }
    edgeDownUntil = Date.now() + EDGE_DOWN_MS;
    const offline = path.join(cacheDir, `line-${key}.pyttsx3.wav`);
    try {
        await run(resolvePython(), [TTS_SCRIPT, "--pyttsx3", text, offline]);
        if (fs.existsSync(offline) && fs.statSync(offline).size > 1000) {
            console.warn(
                `[Animation] Edge TTS unavailable after ${schedule.length} attempt(s); using the offline pyttsx3 voice for this line.`,
            );
            return offline;
        }
    } catch (error) {
        lastError = error;
    }
    console.warn(
        `[Animation] TTS unavailable (Edge + pyttsx3), using placeholder audio: ${String(lastError?.message || "no output").slice(0, 200)}`,
    );
    return null;
}

/** Decode any audio file to mono Float32 PCM at `sampleRate`. */
export async function decodeAudio(filePath, sampleRate) {
    const buf = await run(
        getFFmpegPath(),
        [
            "-v",
            "error",
            "-i",
            filePath,
            "-f",
            "f32le",
            "-ac",
            "1",
            "-ar",
            String(sampleRate),
            "pipe:1",
        ],
        { stdout: true },
    );
    return new Float32Array(
        buf.buffer,
        buf.byteOffset,
        Math.floor(buf.length / 4),
    );
}

const wordsPath = (mp3) => mp3.replace(/\.mp3$/, ".words.json");

/**
 * Edge TTS word timings for a synthesized line: [{ t, d, w }] in seconds from
 * the start of the mp3, or [] when unavailable.
 */
export function readWordTimings(mp3) {
    try {
        const list = JSON.parse(fs.readFileSync(wordsPath(mp3), "utf8"));
        return Array.isArray(list)
            ? list.filter((w) => Number.isFinite(w.t) && Number.isFinite(w.d))
            : [];
    } catch {
        return [];
    }
}

/** Seconds of leading audio that trimSilence() removes (for word timing). */
export function trimLead(samples, sampleRate, threshold = 0.01) {
    let start = 0;
    while (start < samples.length - 1 && Math.abs(samples[start]) < threshold)
        start++;
    return Math.max(0, start - Math.floor(sampleRate * 0.04)) / sampleRate;
}

/** Trim leading/trailing near-silence (Edge TTS pads ~0.1s each side). */
export function trimSilence(samples, sampleRate, threshold = 0.01) {
    let start = 0;
    let end = samples.length - 1;
    while (start < end && Math.abs(samples[start]) < threshold) start++;
    while (end > start && Math.abs(samples[end]) < threshold) end--;
    const pad = Math.floor(sampleRate * 0.04);
    return samples.subarray(
        Math.max(0, start - pad),
        Math.min(samples.length, end + pad),
    );
}

/**
 * RMS amplitude per animation frame, normalized to ~0..1 by the 90th percentile.
 */
export function amplitudeEnvelope(samples, sampleRate, fps) {
    const per = Math.floor(sampleRate / fps);
    const frames = Math.ceil(samples.length / per);
    const env = new Array(frames).fill(0);
    for (let f = 0; f < frames; f++) {
        let sum = 0;
        const s0 = f * per;
        const s1 = Math.min(samples.length, s0 + per);
        for (let i = s0; i < s1; i++) sum += samples[i] * samples[i];
        env[f] = Math.sqrt(sum / Math.max(1, s1 - s0));
    }
    const sorted = [...env].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 1;
    return env.map((v) => Math.min(1, v / (p90 || 1)));
}

/** Deterministic fake envelope for placeholder (silent) lines. */
export function placeholderEnvelope(text, duration, fps) {
    const frames = Math.ceil(duration * fps);
    const seed = hashString(text);
    return Array.from({ length: frames }, (_, f) => {
        const syll = Math.abs(Math.sin(f * 1.9 + (seed % 97)));
        const gap = (f + (seed % 7)) % 11 === 0 ? 0 : 1;
        return syll * gap;
    });
}

export function estimateSpeechDuration(text) {
    const words = String(text).trim().split(/\s+/).length;
    return Math.max(1.4, words * 0.36 + 0.3);
}

/** Cartoon "boing" spring sound (pitch-wobbling sine with decay). */
export function synthBoing(sampleRate, duration = 0.5) {
    const len = Math.floor(sampleRate * duration);
    const out = new Float32Array(len);
    let phase = 0;
    for (let i = 0; i < len; i++) {
        const t = i / sampleRate;
        const freq =
            180 + 140 * Math.exp(-t * 4) * Math.sin(t * 2 * Math.PI * 14);
        phase += (2 * Math.PI * freq) / sampleRate;
        out[i] = Math.sin(phase) * Math.exp(-t * 5.5) * 0.45;
    }
    return out;
}

/** Mix `src` into `dest` at time `at` (seconds) with gain. */
export function mixInto(dest, src, at, sampleRate, gain = 1) {
    const offset = Math.floor(at * sampleRate);
    const len = Math.min(src.length, dest.length - offset);
    for (let i = 0; i < len; i++) {
        if (offset + i >= 0) dest[offset + i] += src[i] * gain;
    }
}

/** Write mono Float32 PCM as 16-bit WAV. */
export function writeWav(filePath, samples, sampleRate) {
    const dataLen = samples.length * 2;
    const buf = Buffer.alloc(44 + dataLen);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + dataLen, 4);
    buf.write("WAVE", 8);
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(dataLen, 40);
    for (let i = 0; i < samples.length; i++) {
        const v = Math.max(-1, Math.min(1, samples[i]));
        buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
    }
    fs.writeFileSync(filePath, buf);
}
