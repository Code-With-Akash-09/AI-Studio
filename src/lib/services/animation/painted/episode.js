/**
 * "Painted puppets" mode, writer side: the AI turns the user's script (or a
 * topic) into a Hindi mystery episode for the painted cast (cast.json), on the
 * painted stages (stages.json), with painted prop inserts (props.json).
 *
 *   writePaintedEpisode(script, opts) → { episode, source, provider, errors }
 *     1. AI (selected provider, then the other configured ones)
 *     2. sanitize (cast ids / aliases, speakers, listeners, emotions, props,
 *        stage, Hindi text, length)
 *     3. one repair round with the problems fed back
 *     4. deterministic template episode from the script sentences
 *   paintedScenes(episode) → pipeline scenes (one per part, visualType
 *   "character", painted: true) rendered by painted/render.js.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../../../config.js";

function moduleDir() {
    try {
        return path.dirname(fileURLToPath(import.meta.url));
    } catch {
        return "";
    }
}
/** Directory with plan.py / render.py / cast.json (works when bundled by Next). */
export const PAINTED_DIR =
    [
        moduleDir(),
        path.join(
            process.cwd(),
            "src",
            "lib",
            "services",
            "animation",
            "painted",
        ),
    ].find((d) => d && fs.existsSync(path.join(d, "cast.json"))) ||
    path.join(process.cwd(), "src", "lib", "services", "animation", "painted");

const readJSON = (f) =>
    JSON.parse(fs.readFileSync(path.join(PAINTED_DIR, f), "utf8"));
let _db = null;
export function paintedDB() {
    if (!_db) {
        const cast = readJSON("cast.json").cast;
        const stages = readJSON("stages.json").stages;
        const props = readJSON("props.json").props;
        _db = {
            cast,
            castById: Object.fromEntries(cast.map((c) => [c.id, c])),
            stages,
            stageIds: stages.map((s) => s.id),
            props,
            propIds: props.map((p) => p.id),
        };
    }
    return _db;
}

export const PAINTED_EMOTIONS = [
    "neutral",
    "explain",
    "question",
    "think",
    "doubt",
    "surprised",
    "scared",
    "excited",
    "laugh",
    "joke",
    "happy",
    "proud",
    "show",
    "reveal",
];
export const PAINTED_LIMITS = {
    parts: 3,
    castPerPart: 4,
    minLines: 11,
    maxLines: 18,
    minPartLines: 3,
    maxChars: 75,
    maxProps: 4,
    minSpeakers: 3,
};

// ---------------------------------------------------------------- prompt
export function paintedPrompt(script) {
    const { cast, stages, props } = paintedDB();
    const L = PAINTED_LIMITS;
    return `
You are the head writer of "Raaz Explain Tv", a Hindi kids-TV cartoon channel that explains facts and mysteries through funny family dialogue.
Turn the USER SCRIPT below (any language, or just a topic) into ONE painted-cartoon episode in HINDI (Devanagari; light everyday English words are fine).

CAST (original characters; use ONLY these ids):
${cast.map((c) => `- "${c.id}" (${c.nameHi}): ${c.role}${c.speaks ? "" : " — NEVER speaks; can only react"}`).join("\n")}
Kabir is the lead who solves the mystery with evidence (never confirms ghosts or magic). Bittu gives the funny wrong guess / fear. Pick 1-2 family members whose role fits the topic (Dadaji: history, Dadi: legends, Anaya Didi: science, Papa: sceptic dad jokes, Maa: practical).

SETS (painted backgrounds; one per part): ${stages.map((s) => `"${s.id}" = ${s.label || s.id}`).join("; ")}.
PROPS (painted close-up inserts; use only when the line talks about that object): ${props.map((p) => `"${p.id}" = ${p.label}`).join("; ")}.

EPISODE SHAPE (16:9, about 45-60 seconds. The voices speak only ~8 characters per second, so the WHOLE episode has only 380-500 characters of dialogue: ${L.minLines + 1}-${L.maxLines - 2} SHORT lines of 25-45 characters (max ${L.maxChars}), natural spoken Hindi):
1. HOOK (first line): a surprising question or claim.
2. Bittu's funny wrong guess or fear.
3. The mystery explained with evidence in small accurate steps (use the 3-4 most important facts from the script; never invent false facts).
4. 1-2 funny reactions; one reveal line (emotion "reveal") at the key fact.
5. A punchline joke, then a short sign-off asking viewers to follow Raaz Explain Tv for more raaz.
At least ${L.minSpeakers} different speaking characters in the episode. 1-${L.parts} parts; each part has 2-${L.castPerPart} cast ids (everyone on screen in that part, Bholu included if present), its own set, and at least ${L.minPartLines} lines. At most ${L.maxProps} props in the episode, at most one per line.

Each line: {"speaker": cast id, "to": [cast ids being spoken to], "emotion": one of ${JSON.stringify(PAINTED_EMOTIONS)}, "text": Hindi line,
 "props": [] or [one prop id], "reaction": null or {"who": a listener id, "emotion": "surprised"|"laugh"|"think"|"scared"} (a visible reaction right after the line)}

Return ONLY this JSON:
{"title": "Hindi episode title", "mood": "mysterious"|"funny"|"curious"|"inspirational", "parts": [{"stage": "set id", "cast": ["kabir","bittu","kamla-dadi"], "lines": [...]}], "searchQueries": ["2-3 English queries for the topic"]}

USER SCRIPT:
${script}
`;
}

function repairPrompt(script, previous, errors) {
    return `${paintedPrompt(script)}

YOUR PREVIOUS ANSWER HAD THESE PROBLEMS — fix all of them and return the full corrected JSON only:
${errors.map((e) => `- ${e}`).join("\n")}

PREVIOUS ANSWER:
${JSON.stringify(previous).slice(0, 12000)}
`;
}

// ---------------------------------------------------------------- sanitize
function resolver() {
    const { cast } = paintedDB();
    const map = new Map();
    for (const c of cast)
        for (const k of [c.id, c.name, c.nameHi, ...(c.aliases || [])])
            if (k) map.set(String(k).toLowerCase().trim(), c.id);
    return (raw) =>
        map.get(
            String(raw || "")
                .toLowerCase()
                .trim()
                .replace(/_/g, "-"),
        ) ||
        map.get(
            String(raw || "")
                .toLowerCase()
                .trim()
                .replace(/-/g, " "),
        ) ||
        null;
}

function cleanText(t, max) {
    let s = String(t || "")
        .replace(/[*_#`"“”<>{}\[\]]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (s.length > max) {
        const cut = s.slice(0, max);
        const at = Math.max(
            cut.lastIndexOf("।"),
            cut.lastIndexOf("?"),
            cut.lastIndexOf("!"),
            cut.lastIndexOf(","),
        );
        s =
            at > max * 0.5
                ? cut.slice(0, at + 1)
                : `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max)}...`;
    }
    return s;
}

/** Validate + repair an AI answer. Returns { episode|null, errors, warnings }. */
export function sanitizePaintedEpisode(raw, script = "") {
    const db = paintedDB();
    const L = PAINTED_LIMITS;
    const resolve = resolver();
    const errors = [];
    const warnings = [];
    const rawParts = Array.isArray(raw?.parts) ? raw.parts : [];
    if (!rawParts.length)
        return { episode: null, errors: ["no parts"], warnings };
    const parts = [];
    let propsUsed = 0;
    for (const [pi, rp] of rawParts.slice(0, L.parts).entries()) {
        let cast = [
            ...new Set(
                (Array.isArray(rp.cast) ? rp.cast : [])
                    .map(resolve)
                    .filter(Boolean),
            ),
        ];
        const lines = [];
        for (const rl of Array.isArray(rp.lines) ? rp.lines : []) {
            const speaker = resolve(rl.speaker);
            if (!speaker) {
                warnings.push(
                    `part ${pi + 1}: unknown speaker "${rl.speaker}" dropped`,
                );
                continue;
            }
            if (!db.castById[speaker].speaks) {
                warnings.push(
                    `part ${pi + 1}: ${speaker} cannot speak, line dropped`,
                );
                continue;
            }
            const text = cleanText(rl.text, L.maxChars);
            if (!text || !/[\u0900-\u097F]/.test(text)) {
                warnings.push(`part ${pi + 1}: non-Hindi / empty line dropped`);
                continue;
            }
            if (!cast.includes(speaker)) cast.push(speaker);
            let to = (
                Array.isArray(rl.to)
                    ? rl.to
                    : rl.to
                      ? [rl.to]
                      : rl.listeners || []
            )
                .map(resolve)
                .filter((x) => x && x !== speaker);
            to = [...new Set(to)];
            for (const t of to) if (!cast.includes(t)) cast.push(t);
            const emo = String(rl.emotion || "explain")
                .toLowerCase()
                .trim();
            const emotion = PAINTED_EMOTIONS.includes(emo) ? emo : "explain";
            let props = (
                Array.isArray(rl.props) ? rl.props : rl.prop ? [rl.prop] : []
            )
                .map((p) =>
                    String(p || "")
                        .toLowerCase()
                        .trim(),
                )
                .filter((p) => db.propIds.includes(p))
                .slice(0, 1);
            if (props.length && propsUsed >= L.maxProps) props = [];
            propsUsed += props.length;
            let reaction = null;
            if (rl.reaction && typeof rl.reaction === "object") {
                const who = resolve(rl.reaction.who);
                const re = String(
                    rl.reaction.emotion || "surprised",
                ).toLowerCase();
                if (who && who !== speaker)
                    reaction = {
                        who,
                        emotion: [
                            "surprised",
                            "laugh",
                            "think",
                            "scared",
                        ].includes(re)
                            ? re
                            : "surprised",
                    };
                if (reaction && !cast.includes(reaction.who))
                    cast.push(reaction.who);
            }
            lines.push({ speaker, to, emotion, text, props, reaction });
        }
        // listeners default to the previous speaker (or the first other cast member)
        for (const [i, l] of lines.entries()) {
            if (l.to.length) continue;
            const prev = lines
                .slice(0, i)
                .reverse()
                .find((p) => p.speaker !== l.speaker);
            const other =
                prev?.speaker ||
                cast.find((c) => c !== l.speaker && db.castById[c].speaks) ||
                cast.find((c) => c !== l.speaker);
            if (other) l.to = [other];
        }
        if (cast.length > L.castPerPart) {
            // keep the speakers first, then the dog, drop the rest
            const speakers = [
                ...new Set(lines.flatMap((l) => [l.speaker, ...l.to])),
            ];
            const keep = [
                ...speakers,
                ...cast.filter((c) => !speakers.includes(c)),
            ].slice(0, L.castPerPart);
            if (speakers.length > L.castPerPart)
                errors.push(
                    `part ${pi + 1}: more than ${L.castPerPart} characters talk; use at most ${L.castPerPart} per part`,
                );
            cast = keep;
        }
        if (cast.length < 2) {
            errors.push(`part ${pi + 1}: needs at least 2 characters`);
            continue;
        }
        if (lines.length < L.minPartLines) {
            errors.push(
                `part ${pi + 1}: only ${lines.length} valid line(s), need ${L.minPartLines}+`,
            );
            continue;
        }
        let stage = String(rp.stage || rp.set || "")
            .toLowerCase()
            .trim();
        if (!db.stageIds.includes(stage)) {
            stage = pickStage(
                `${script} ${lines.map((l) => l.text).join(" ")}`,
                parts.map((p) => p.stage),
            );
            warnings.push(
                `part ${pi + 1}: set "${rp.stage}" unknown → ${stage}`,
            );
        }
        parts.push({ stage, cast, lines });
    }
    const all = parts.flatMap((p) => p.lines);
    if (all.length < L.minLines)
        errors.push(
            `only ${all.length} valid lines; need ${L.minLines}-${L.maxLines}`,
        );
    if (all.length > L.maxLines)
        errors.push(`${all.length} lines; at most ${L.maxLines}`);
    const speakers = new Set(all.map((l) => l.speaker));
    if (speakers.size < L.minSpeakers)
        errors.push(
            `only ${speakers.size} speaking characters; need ${L.minSpeakers}+`,
        );
    if (!parts.length) return { episode: null, errors, warnings };
    const chars = all.reduce((a, l) => a + l.text.length, 0);
    if (chars < 330) warnings.push(`short episode (~${chars} chars)`);
    if (chars > 540)
        errors.push(
            `too long (~${chars} characters of dialogue; Hindi TTS speaks only ~8 characters per second, so 45-60 seconds = about 380-500 characters of dialogue in total; use fewer / shorter lines)`,
        );
    const episode = {
        title: cleanText(raw.title || "रहस्य", 80) || "रहस्य",
        mood: ["mysterious", "funny", "curious", "inspirational"].includes(
            raw.mood,
        )
            ? raw.mood
            : "mysterious",
        parts,
        searchQueries: (Array.isArray(raw.searchQueries)
            ? raw.searchQueries
            : []
        )
            .slice(0, 3)
            .map(String),
    };
    return { episode, errors, warnings };
}

export function pickStage(text, avoid = []) {
    const { stages } = paintedDB();
    const t = String(text || "").toLowerCase();
    const scored = stages
        .map((s) => ({
            id: s.id,
            n:
                (s.tags || []).filter((g) =>
                    t.includes(String(g).toLowerCase()),
                ).length - (avoid.includes(s.id) ? 0.5 : 0),
        }))
        .sort((a, b) => b.n - a.n);
    return scored[0].n > 0
        ? scored[0].id
        : avoid.includes("courtyard")
          ? scored.find((s) => !avoid.includes(s.id))?.id || "courtyard"
          : "courtyard";
}

// ---------------------------------------------------------------- template
function splitSentences(script) {
    return String(script || "")
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?।])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .flatMap((s) => {
            const out = [];
            let cur = "";
            for (const w of s.split(" ")) {
                if (
                    (cur + " " + w).trim().length >
                        PAINTED_LIMITS.maxChars - 5 &&
                    cur
                ) {
                    out.push(cur.trim());
                    cur = w;
                } else cur = `${cur} ${w}`;
            }
            if (cur.trim()) out.push(cur.trim());
            return out;
        });
}

/** Deterministic fallback: Kabir explains the script's sentences to Bittu and Dadi. */
export function templatePaintedEpisode(script) {
    const facts = splitSentences(script).slice(0, 8);
    const stage = pickStage(script);
    const L = (speaker, to, emotion, text, extra = {}) => ({
        speaker,
        to,
        emotion,
        text,
        props: [],
        reaction: null,
        ...extra,
    });
    const lines = [
        L(
            "kabir",
            ["bittu"],
            "question",
            "बिट्टू, आज एक ऐसा राज़ सुनो जो सबको हैरान कर देता है!",
        ),
        L("bittu", ["kabir"], "scared", "राज़? कहीं इसमें कोई भूत तो नहीं है ना?", {
            reaction: { who: "kamla-dadi", emotion: "laugh" },
        }),
        L("kamla-dadi", ["bittu"], "laugh", "अरे डरपोक! पहले पूरी बात तो सुन ले।"),
    ];
    const hindi = facts.filter((f) => /[\u0900-\u097F]/.test(f));
    const body =
        hindi.length >= 2
            ? hindi
            : [
                  "ये राज़ सुनने में अजीब लगता है।",
                  "पर हर रहस्य के पीछे कोई न कोई सच्चाई होती है।",
                  "सबूत देखो, तो सच अपने आप सामने आ जाता है।",
              ];
    body.slice(0, 6).forEach((f, i) => {
        lines.push(
            L(
                i % 3 === 2 ? "kamla-dadi" : "kabir",
                [i % 2 ? "kamla-dadi" : "bittu"],
                i === body.length - 1 ? "reveal" : "explain",
                f,
            ),
        );
        if (i === 1)
            lines.push(
                L("bittu", ["kabir"], "surprised", "सच में? ये तो कमाल है!"),
            );
    });
    lines.push(
        L(
            "bittu",
            ["kabir"],
            "joke",
            "तो मैं आज रात सिर्फ़ लड्डू के बारे में सोचूँगा, राज़ के बारे में नहीं!",
            { reaction: { who: "kabir", emotion: "laugh" } },
        ),
    );
    lines.push(
        L(
            "kabir",
            ["bittu"],
            "happy",
            "ऐसे ही और राज़ जानने के लिए Raaz Explain Tv को फॉलो करो!",
        ),
    );
    return {
        title: "एक अनोखा राज़",
        mood: "mysterious",
        parts: [
            { stage, cast: ["kabir", "bittu", "kamla-dadi", "bholu"], lines },
        ],
        searchQueries: [],
    };
}

// ---------------------------------------------------------------- writer
function availableProviders(first, geminiApiKeys) {
    const have = {
        gemini: Boolean(
            config.geminiApiKey ||
                (Array.isArray(geminiApiKeys)
                    ? geminiApiKeys.length
                    : geminiApiKeys),
        ),
        openai: Boolean(config.openaiApiKey),
        anthropic: Boolean(config.anthropicApiKey),
    };
    const want = String(first || "gemini")
        .toLowerCase()
        .replace("claude", "anthropic");
    return [...new Set([want, "gemini", "openai", "anthropic"])].filter(
        (p) => have[p],
    );
}

/** Never throws: falls back to the template episode. */
export async function writePaintedEpisode(
    script,
    {
        provider = "gemini",
        model,
        geminiApiKeys = [],
        onLog = (m) => console.log(`[Painted] ${m}`),
        generate,
    } = {},
) {
    const gen =
        generate || (await import("../../ai/ai.factory.js")).generateJSON;
    const providers = availableProviders(provider, geminiApiKeys);
    let previous = null;
    let errors = [];
    for (const round of [1, 2]) {
        if (!providers.length) {
            errors = ["no AI provider configured"];
            break;
        }
        const prompt =
            round === 1 || !previous
                ? paintedPrompt(script)
                : repairPrompt(script, previous, errors);
        let res = null;
        let used = null;
        for (const p of providers) {
            try {
                res = await gen({
                    prompt,
                    provider: p,
                    model:
                        p === String(provider || "").toLowerCase()
                            ? model
                            : undefined,
                    geminiApiKeys,
                    timeoutMs: 90000,
                });
                used = p;
                break;
            } catch (err) {
                onLog(
                    `AI provider ${p} failed: ${String(err.message || err).slice(0, 160)}`,
                );
            }
        }
        if (!res) {
            errors = ["every AI provider failed"];
            if (round === 1) continue;
            break;
        }
        const s = sanitizePaintedEpisode(res, script);
        if (s.episode && !s.errors.length) {
            const n = s.episode.parts.reduce((a, p) => a + p.lines.length, 0);
            onLog(
                `Episode written by ${used}${round === 2 ? " (after one repair)" : ""}: ${s.episode.parts.length} part(s), ${n} lines${s.warnings.length ? ` [${s.warnings.join("; ").slice(0, 300)}]` : ""}`,
            );
            return {
                episode: s.episode,
                source: round === 1 ? "ai" : "ai-repaired",
                provider: used,
                errors: [],
            };
        }
        errors = s.errors.length ? s.errors : ["invalid episode"];
        previous = res;
        onLog(`Episode round ${round} invalid: ${errors.join("; ")}`);
    }
    const episode = templatePaintedEpisode(script);
    onLog(
        `Using the template painted episode — ${errors.join("; ").slice(0, 300)}`,
    );
    return { episode, source: "template", provider: null, errors };
}

/** Pipeline scenes (video.service scenePlan): one painted scene per part. */
export function paintedScenes(episode) {
    const n = episode.parts.length;
    return episode.parts.map((part, i) => ({
        id: i + 1,
        narration: part.lines.map((l) => l.text).join(" "),
        visualBrief: `${episode.title} — painted part ${i + 1}`,
        subject: "Raaz Explain Tv painted cartoon",
        environment: part.stage,
        action: "character dialogue",
        cameraShot: "medium_shot",
        lightingMood: ["haveli-night", "fort-dusk"].includes(part.stage)
            ? "dark_mysterious"
            : "bright_natural",
        emotion: "humorous",
        visualType: "character",
        painted: true,
        part,
        searchQueries: episode.searchQueries?.length
            ? episode.searchQueries
            : [episode.title],
        negativeKeywords: [],
        onScreenHighlight: "",
        punchline: i === n - 1,
    }));
}
