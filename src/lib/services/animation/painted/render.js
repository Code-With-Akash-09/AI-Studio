/**
 * "Painted puppets" mode, render side: one episode part → one pipeline scene.
 *
 *   1. per-line Edge TTS with each character's voice (cast.json), cached;
 *      no offline/robotic or silent lines (throws → caller falls back)
 *   2. spec.json → plan.py (blocking / 180-degree rule, shots, poses, inserts,
 *      framing guard) → staging guard: issues → re-plan simplified (no
 *      inserts / reaction holds) → still issues → throw
 *   3. render.py (parallel chunks) → 1920x1080 25fps + 44.1k stereo AAC,
 *      voices only, so combineScenes() concats it with the other parts.
 * Python: PAINTED_PYTHON (needs numpy + opencv), default the puppet venv.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "../../../config.js";
import { getFFmpegPath } from "../../../utils/ffmpeg.js";
import { isOfflineVoice, readWordTimings, synthesizeLine } from "../audio.js";
import { PAINTED_DIR, paintedDB } from "./episode.js";

const SR = 24000;

function paintedPython() {
    if (process.env.PAINTED_PYTHON) return process.env.PAINTED_PYTHON;
    const venv = "/workspace/tools/puppet-venv/bin/python";
    return fs.existsSync(venv) ? venv : "python3";
}

function run(cmd, args, { timeoutMs = 60000, onLine } = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
            env: {
                ...process.env,
                PYTHONUTF8: "1",
                PYTHONDONTWRITEBYTECODE: "1",
                PUPPET_SCRIPTS:
                    process.env.PUPPET_SCRIPTS ||
                    path.join(
                        process.cwd(),
                        ".scripts",
                        "animation",
                        "puppets",
                    ),
            },
        });
        let out = "";
        let err = "";
        const timer = setTimeout(() => {
            proc.kill("SIGKILL");
            reject(new Error(`${path.basename(args[0] || cmd)} timed out`));
        }, timeoutMs);
        proc.stdout.on("data", (d) => {
            const s = d.toString();
            out += s;
            if (onLine)
                for (const l of s.split("\n")) if (l.trim()) onLine(l.trim());
        });
        proc.stderr.on("data", (d) => {
            err += d.toString();
            if (err.length > 20000) err = err.slice(-8000);
        });
        proc.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
        });
        proc.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(out);
            else
                reject(
                    new Error(
                        `${path.basename(args[0] || cmd)} exited ${code}: ${err.slice(-600)}`,
                    ),
                );
        });
    });
}

function wavDuration(file) {
    const st = fs.statSync(file).size;
    return Math.max(0, (st - 44) / (SR * 2));
}

/** TTS every line with its character's voice → [{...line, wav, words, dur}]. */
async function voiceLines(part, dir) {
    const { castById } = paintedDB();
    const cache = path.join(config.tempDir, "painted-tts");
    const ffmpeg = getFFmpegPath();
    const out = [];
    for (const [i, l] of part.lines.entries()) {
        const c = castById[l.speaker];
        if (!c?.voice) throw new Error(`no voice for ${l.speaker}`);
        const mp3 = await synthesizeLine(l.text, c.voice, cache);
        if (!mp3 || isOfflineVoice(mp3))
            throw new Error(
                `Edge TTS unavailable for line ${i + 1}; not rendering a robotic / silent painted scene`,
            );
        const wav = path.join(
            dir,
            `line-${String(i + 1).padStart(2, "0")}.wav`,
        );
        await run(ffmpeg, [
            "-v",
            "error",
            "-y",
            "-i",
            mp3,
            "-ar",
            String(SR),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            wav,
        ]);
        const dur = wavDuration(wav);
        const words = readWordTimings(mp3).filter((w) => w.t < dur);
        out.push({
            ...l,
            id: `l${i + 1}`,
            wav,
            words,
            dur: Number(dur.toFixed(3)),
        });
    }
    return out;
}

function specFor(part, lines, { simplified = false } = {}) {
    const { castById } = paintedDB();
    let cast = part.cast.filter((c) => castById[c]);
    if (simplified) {
        const used = new Set(
            lines.flatMap((l) => [l.speaker, ...(l.to || [])]),
        );
        cast = cast.filter((c) => used.has(c) || castById[c].dog).slice(0, 4);
    }
    return {
        stage: part.stage,
        cast,
        seated: [],
        lines: lines.map((l) => ({
            id: l.id,
            speaker: l.speaker,
            listeners: (l.to || []).filter((x) => cast.includes(x)),
            emotion: l.emotion,
            props: simplified ? [] : l.props || [],
            reaction:
                simplified || !l.reaction || !cast.includes(l.reaction.who)
                    ? null
                    : l.reaction,
            text: l.text,
            dur: l.dur,
            words: l.words,
            wav: l.wav,
        })),
    };
}

async function planPart(dir, spec, tag) {
    const specPath = path.join(dir, `spec${tag}.json`);
    const planPath = path.join(dir, `plan${tag}.json`);
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 1));
    await run(
        paintedPython(),
        [path.join(PAINTED_DIR, "plan.py"), specPath, planPath],
        { timeoutMs: 120000 },
    );
    return { planPath, plan: JSON.parse(fs.readFileSync(planPath, "utf8")) };
}

/**
 * Render one painted part (scene.part) as a createScene()-shaped result.
 * Throws on any failure (TTS, staging guard, render) so the caller falls back.
 */
export async function renderPaintedScene(
    scene,
    index,
    {
        onProgress = () => {},
        onLog = (m) => console.log(`[Painted] ${m}`),
    } = {},
) {
    const part = scene.part;
    if (!part?.lines?.length) throw new Error("painted scene has no lines");
    const dir = path.join(
        config.tempDir,
        `painted-scene-${index}-${Date.now()}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    onProgress(2, "voices");
    const lines = await voiceLines(part, dir);
    onProgress(15, "planning shots");

    // staging guard: the planner's framing issues must be empty
    let { planPath, plan } = await planPart(dir, specFor(part, lines), "");
    if (plan.issues?.length) {
        onLog(
            `scene ${index}: staging issues ${JSON.stringify(plan.issues).slice(0, 300)} → re-planning simplified`,
        );
        ({ planPath, plan } = await planPart(
            dir,
            specFor(part, lines, { simplified: true }),
            "-simple",
        ));
        if (plan.issues?.length)
            throw new Error(
                `staging guard: ${JSON.stringify(plan.issues).slice(0, 300)}`,
            );
    }
    onLog(
        `scene ${index}: ${part.stage}, ${Object.keys(plan.actors).join(" + ")}, ${lines.length} lines, ${plan.shots.length} shots (${plan.shots.map((s) => s.kind).join(",")}), ${plan.duration.toFixed(1)}s`,
    );

    const out = path.join(config.tempDir, `scene-${index}.mp4`);
    const total = Math.round(plan.duration * 25);
    const workers = Math.max(1, Number(process.env.PAINTED_WORKERS) || 3);
    const seen = {};
    await run(
        paintedPython(),
        [
            path.join(PAINTED_DIR, "render.py"),
            planPath,
            out,
            `--workers=${workers}`,
        ],
        {
            timeoutMs: Math.max(20 * 60000, total * 3000),
            onLine: (l) => {
                const m = /chunk (\d+)-\d+: frame (\d+)/.exec(l);
                if (!m) return;
                seen[m[1]] = Number(m[2]) - Number(m[1]);
                const done = Object.values(seen).reduce((a, b) => a + b, 0);
                onProgress(
                    Math.min(
                        98,
                        15 + Math.round((83 * done) / Math.max(1, total)),
                    ),
                    `frame ~${done}/${total}`,
                );
            },
        },
    );
    if (!fs.existsSync(out) || fs.statSync(out).size < 10000)
        throw new Error("painted render produced no video");
    onProgress(100, "done");
    const captions = plan.lines.map((l) => ({
        text: l.text,
        start: l.t0,
        end: l.t0 + l.dur,
        speaker: l.speaker,
    }));
    return {
        id: scene.id,
        path: out,
        duration: plan.duration,
        captions,
        visualType: "character",
        narration: scene.narration || captions.map((c) => c.text).join(" "),
        dimension: "horizontal",
        emotion: scene.emotion || "dialogue",
        punchline: Boolean(scene.punchline),
        usedTts: true,
        placeholderLines: 0,
        offlineLines: 0,
        painted: {
            stage: part.stage,
            cast: Object.keys(plan.actors),
            shots: plan.shots.length,
            workDir: dir,
        },
        staging: { issues: plan.issues || [] },
    };
}
