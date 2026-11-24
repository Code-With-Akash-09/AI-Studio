/**
 * "Full cartoon" mode: the AI turns the user's script (or just a topic) into
 * a whole classic-style dialogue episode — hosts Raazu + Golu, optional Nani
 * and Sheru, plus 1-2 script-specific guest characters (guests.js).
 *
 *   writeEpisode(script, opts) → { episode, source, provider, attempts, errors }
 *     1. AI (selected provider, then the other configured providers)
 *     2. validate (structure, Hindi, cast, staging guard on every part)
 *     3. one repair round with the errors fed back to the AI
 *     4. deterministic template episode built from the script sentences
 *   so a job never fails silently.
 *
 * An episode is 1-3 "parts"; each part is a normal 2-character dialogue
 * (script.js format) rendered as one pipeline scene, voices only.
 */
import {
    ACTIONS,
    CAMERAS,
    EXPRESSIONS,
    GESTURES,
    POSES,
} from "../../../constants/animation.js";
import { config } from "../../config.js";
import { CLASSIC_HEADWEAR, CLASSIC_PROPS } from "./classic/classicRig.js";
import {
    GUEST_PRESETS,
    MAX_GUESTS,
    normalizeGuestSpec,
    guestId,
} from "./guests.js";
import {
    diversifySettings,
    normalizeSetting,
    SETTING_PRESETS,
    settingPromptHelp,
    settingsForText,
} from "./classic/settings.js";
import { buildCharacterTimeline } from "./index.js";
import { normalizeDialogue } from "./script.js";
import { validateStaging } from "./stagingQA.js";

export const EPISODE_LIMITS = {
    parts: 3,
    linesPerPart: 18,
    minLines: 6,
    maxLines: 30,
    lineChars: 200,
};
const BACKGROUNDS = ["gali_day", "haveli_night", "plain"];
const SAFE_ACTIONS = ACTIONS.filter((a) => a !== "jump");
const SAFE_POSES = POSES.filter((p) => p !== "catch");
const MARKS = ["left", "center", "right", "offL", "offR"];
const MOODS = [
    "humorous",
    "suspense",
    "upbeat",
    "dramatic",
    "chill",
    "inspirational",
];
const HOST_ALIASES = {
    raazu: "raazu",
    raju: "raazu",
    razu: "raazu",
    राज़ू: "raazu",
    राजू: "raazu",
    golu: "golu",
    गोलू: "golu",
    nani: "nani",
    "kissa nani": "nani",
    kissanani: "nani",
    "किस्सा नानी": "nani",
    "क़िस्सा नानी": "nani",
    नानी: "nani",
};
const DEVANAGARI = /[\u0900-\u097F]/;

// ------------------------------------------------------------------ prompt

export function episodePrompt(script, { dimension = "vertical" } = {}) {
    const vertical = dimension !== "horizontal";
    return `
You are the head writer of "Raaz Explain Tv", a Hindi kids-TV style cartoon channel that explains facts and mysteries through funny dialogue.
Turn the USER SCRIPT below (it may be in any language, or just a topic) into ONE complete cartoon episode in HINDI (Devanagari script; light everyday English words are fine).

RECURRING HOSTS (always use them, ORIGINAL characters):
- "raazu": smart, calm mystery-explainer boy with glasses; explains with evidence, never confirms ghosts.
- "golu": chubby, easily scared, funny friend; jumps to silly conclusions, food jokes, comic reactions.
- "nani": optional, Kissa Nani, a storytelling grandmother (use only if a story-time moment fits).
- Sheru: the street dog; he never speaks. To bring him in, mention "शेरू" in a line and set "stage": {"dog": 1} on that line (at most once).

GUEST CHARACTERS: invent 0-${MAX_GUESTS} ORIGINAL guests that fit THIS script (e.g. an archaeologist for an Egyptian discovery, a king, a ghost for a haunted-house myth, a scientist, a villager). Never copy existing cartoon/film/game characters, names, catchphrases or designs. Describe each guest:
{"key": "guest1", "name": "short original name (Latin letters)", "nameHi": "Devanagari name", "role": "archaeologist|scientist|king|queen|ghost|sage|villager|teacher|explorer|<other>",
 "gender": "male"|"female", "bodyType": "slim"|"chubby"|"tall"|"elder", "skin": "light"|"wheat"|"tan"|"brown"|"deep"|"pale",
 "hair": {"style": "short"|"long"|"bald"|"bun"|"none", "color": "black"|"brown"|"grey"|"white"|"#RRGGBB"},
 "headwear": one of ${JSON.stringify(CLASSIC_HEADWEAR)},
 "outfit": {"type": "coat"|"kurta"|"robe"|"saree", "color": "colour name or #RRGGBB", "accent": "colour", "cape": optional colour},
 "accessories": subset of ["glasses", "beard", "mustache"], "prop": one of ${JSON.stringify(CLASSIC_PROPS)} or null,
 "voice": {"base": "male"|"female", "pitch": -20..30, "rate": -10..25}}

EPISODE SHAPE (${vertical ? "9:16 vertical Shorts" : "16:9 landscape"}):
1. HOOK (first line, look "camera"): a surprising question or claim that makes viewers stay.
2. Golu's funny wrong guess / fear.
3. The fact or mystery explained conversationally in small, accurate steps (keep every fact from the script; do not invent false facts).
4. 1-3 humor beats (Golu reactions, "beat": "humor" with a "reaction"), one "reveal" beat at the key fact.
5. PUNCHLINE joke, then a short sign-off asking viewers to follow for more raaz.
Total ${EPISODE_LIMITS.minLines + 4}-22 lines (about 45-90 seconds), each line max 110 characters, natural spoken Hindi.

STRUCTURE: 1-${EPISODE_LIMITS.parts} "parts". Each part has EXACTLY 2 speakers in "cast" (left, right). Part 1 is Raazu + Golu. A guest appears in a later part together with one host (e.g. ["raazu", "guest1"]). Give every part a "setting" that shows WHERE that part of the story happens.
${settingPromptHelp()}
Each line: {"speaker": cast id or guest key, "text": Hindi line, "expression": one of ${JSON.stringify(EXPRESSIONS)}, "pose": one of ${JSON.stringify(SAFE_POSES)},
 "gesture": optional one of ${JSON.stringify(GESTURES)}, "look": optional "camera", "listener": {"expression": ..., "pose": ...},
 "beat": optional "humor"|"reveal", "reaction": {"expression", "pose", "text": short Hindi exclamation} (with humor beats),
 "camera": optional one of ${JSON.stringify(CAMERAS)}, "stage": optional {"dog": 1},
 "actions": optional 0-1 simple actions [{"who": cast id, "type": one of ${JSON.stringify(SAFE_ACTIONS)}, "to": 0.2-0.8 or ${JSON.stringify(MARKS.slice(0, 3))} or the other cast id for "hide"}]}
"positions": optional starting marks per cast id: ${JSON.stringify(MARKS)} (use "offR" for someone who walks in on their first line).
${vertical ? "Vertical frame: keep movement small (at most 3 actions in the whole episode)." : "Use a few walks/hops for liveliness (at most 5 actions in the episode)."}

Return ONLY this JSON:
{"title": "Hindi episode title", "mood": one of ${JSON.stringify(MOODS)}, "guests": [guest specs], "parts": [{"cast": ["raazu","golu"], "setting": {"preset": "${Object.keys(SETTING_PRESETS)[0]}"}, "positions": {"golu": "offR"}, "lines": [...]}], "searchQueries": ["2-3 English stock-footage queries for the topic"]}

USER SCRIPT:
${script}
`;
}

function repairPrompt(script, previous, errors, opts) {
    return `${episodePrompt(script, opts)}

YOUR PREVIOUS ANSWER HAD THESE PROBLEMS — fix all of them and return the full corrected JSON only:
${errors.map((e) => `- ${e}`).join("\n")}

PREVIOUS ANSWER:
${JSON.stringify(previous).slice(0, 12000)}
`;
}

// --------------------------------------------------------------- sanitize

function idResolver(guestKeys) {
    return (raw) => {
        const s = String(raw || "").trim();
        const k = s.toLowerCase();
        return HOST_ALIASES[k] || HOST_ALIASES[s] || guestKeys[k] || null;
    };
}

function cleanText(t) {
    return String(t || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, EPISODE_LIMITS.lineChars);
}

function cleanLine(raw, cast, resolve, state) {
    const speaker = resolve(raw.speaker);
    const text = cleanText(raw.text);
    if (!speaker || !cast.includes(speaker) || !text) return null;
    const beat =
        raw.beat === "reveal" && state.reveals++ === 0
            ? "reveal"
            : raw.beat === "humor"
              ? "humor"
              : null;
    const actions = (Array.isArray(raw.actions) ? raw.actions : [])
        .filter((a) => a && SAFE_ACTIONS.includes(a.type))
        .map((a) => {
            const who = resolve(a.who);
            const to =
                a.type === "hide"
                    ? cast.find((c) => c !== who)
                    : typeof a.to === "number"
                      ? Math.min(0.85, Math.max(0.15, a.to))
                      : MARKS.includes(a.to)
                        ? a.to
                        : undefined;
            return {
                who,
                type: a.type,
                to,
                at: a.at === "end" ? "end" : "start",
            };
        })
        .filter((a) => a.who && cast.includes(a.who))
        .filter((a) => (a.type === "dramatic" ? state.dramatic++ === 0 : true))
        .filter(() => state.actions-- > 0)
        .slice(0, 1);
    const dog =
        !state.dog && (raw.stage?.dog || /शेरू|sheru/i.test(text)) ? 1 : 0;
    if (dog) state.dog = true;
    const camera = CAMERAS.includes(raw.camera) ? raw.camera : undefined;
    const rx =
        raw.reaction && typeof raw.reaction === "object" ? raw.reaction : null;
    return {
        speaker,
        text,
        expression: raw.expression,
        // a face-fault is a reaction, not something to talk through
        pose: SAFE_POSES.includes(raw.pose)
            ? raw.pose === "facefault"
                ? "scared"
                : raw.pose
            : "idle",
        gesture: GESTURES.includes(raw.gesture) ? raw.gesture : undefined,
        look: raw.look === "camera" ? "camera" : undefined,
        listener: {
            expression: raw.listener?.expression,
            pose: SAFE_POSES.includes(raw.listener?.pose)
                ? raw.listener.pose
                : "idle",
        },
        beat,
        reaction:
            beat === "humor" && rx
                ? {
                      expression: rx.expression,
                      pose: SAFE_POSES.includes(rx.pose) ? rx.pose : "idle",
                      text: cleanText(rx.text).slice(0, 24),
                      sfx: "none",
                  }
                : undefined,
        camera: camera === "reveal" && beat !== "reveal" ? "wide" : camera,
        stage: dog ? { dog: 1 } : undefined,
        actions,
    };
}

/**
 * Validate + sanitize an AI episode. Never throws.
 * @returns {{ episode: object|null, errors: string[], warnings: string[] }}
 */
/**
 * The setting of each part: the AI's spec / preset, else a legacy background,
 * else one picked from the topic; consecutive parts never look the same.
 */
function partSettings(rawParts, parts, script) {
    const topic = settingsForText(
        `${script || ""} ${parts.flatMap((p) => p.lines.map((l) => l.text)).join(" ")}`,
    );
    const specs = parts.map((p, i) => {
        const r = rawParts[i] || {};
        const want = r.setting || r.background;
        if (want && typeof want === "object") return want;
        if (typeof want === "string" && want && !BACKGROUNDS.includes(want)) {
            const spec = normalizeSetting(want, "");
            if (spec.location !== "gali" || /gali|lane/i.test(want))
                return spec;
        }
        if (typeof want === "string" && BACKGROUNDS.includes(want))
            return { legacy: want };
        return { preset: topic[i % topic.length] };
    });
    // legacy ids stay as they are; settings get diversified
    const idx = specs.map((s, i) => (s.legacy ? -1 : i)).filter((i) => i >= 0);
    const div = diversifySettings(idx.map((i) => specs[i]));
    idx.forEach((i, k) => {
        specs[i] = div[k];
    });
    return specs;
}

export function sanitizeEpisode(
    raw,
    { dimension = "vertical", script = "" } = {},
) {
    const errors = [];
    const warnings = [];
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.parts)) {
        return { episode: null, errors: ['missing "parts" array'], warnings };
    }
    // guests
    const guestKeys = {};
    const guests = [];
    (Array.isArray(raw.guests) ? raw.guests : [])
        .slice(0, MAX_GUESTS)
        .forEach((g, i) => {
            const { spec, warnings: w } = normalizeGuestSpec(g, i);
            const id = guestId(spec);
            guests.push(spec);
            warnings.push(...w);
            for (const k of [
                g?.key,
                `guest${i + 1}`,
                g?.name,
                g?.nameHi,
                spec.name,
            ])
                if (k) guestKeys[String(k).toLowerCase().trim()] = id;
        });
    const resolve = idResolver(guestKeys);
    const vertical = dimension !== "horizontal";
    const state = {
        reveals: 0,
        dramatic: 0,
        dog: false,
        actions: vertical ? 3 : 5,
    };
    const parts = [];
    let totalIn = 0;
    let dropped = 0;
    for (const p of raw.parts.slice(0, EPISODE_LIMITS.parts)) {
        if (!p || !Array.isArray(p.lines)) continue;
        let cast = (Array.isArray(p.cast) ? p.cast : [])
            .map(resolve)
            .filter(Boolean);
        cast = [...new Set(cast)];
        if (cast.length < 2) {
            // infer from the speakers
            for (const l of p.lines) {
                const id = resolve(l?.speaker);
                if (id && !cast.includes(id)) cast.push(id);
            }
        }
        if (cast.length < 2) cast.push(cast[0] === "golu" ? "raazu" : "golu");
        cast = cast.slice(0, 2);
        const lines = [];
        for (const l of p.lines.slice(0, EPISODE_LIMITS.linesPerPart)) {
            totalIn++;
            const c =
                l && typeof l === "object"
                    ? cleanLine(l, cast, resolve, state)
                    : null;
            if (c) lines.push(c);
            else dropped++;
        }
        if (lines.length < 2) {
            errors.push(
                `a part has fewer than 2 usable lines (cast ${cast.join("+")})`,
            );
            continue;
        }
        const positions = {};
        if (p.positions && typeof p.positions === "object")
            for (const [k, v] of Object.entries(p.positions)) {
                const id = resolve(k);
                if (id && cast.includes(id) && MARKS.includes(v))
                    positions[id] = v;
            }
        for (const [slot, id] of cast.entries())
            if (!positions[id]) positions[id] = slot ? "right" : "left";
        parts.push({
            cast,
            background: "gali_day",
            positions,
            lines,
            _raw: p,
        });
    }
    // the hook talks to the viewer
    if (parts[0]?.lines[0]) parts[0].lines[0].look = "camera";
    const settings = partSettings(
        parts.map((p) => p._raw),
        parts,
        script,
    );
    parts.forEach((p, i) => {
        delete p._raw;
        const st = settings[i];
        if (st.legacy) p.background = st.legacy;
        else {
            p.background = st.id;
            p.setting = st;
        }
    });
    const total = parts.reduce((a, p) => a + p.lines.length, 0);
    if (!parts.length) errors.push("no usable parts");
    if (total < EPISODE_LIMITS.minLines)
        errors.push(
            `only ${total} usable lines; write at least ${EPISODE_LIMITS.minLines + 4}`,
        );
    if (total > EPISODE_LIMITS.maxLines)
        errors.push(
            `${total} lines is too long; keep it under ${EPISODE_LIMITS.maxLines}`,
        );
    if (totalIn && dropped / totalIn > 0.3)
        errors.push(
            `${dropped} of ${totalIn} lines had an unknown speaker (use only the part's cast ids / guest keys) or empty text`,
        );
    const allLines = parts.flatMap((p) => p.lines);
    const hindi = allLines.filter((l) => DEVANAGARI.test(l.text)).length;
    if (allLines.length && hindi / allLines.length < 0.7)
        errors.push("lines must be in Hindi (Devanagari script)");
    if (parts.length && !parts[0].cast.includes("raazu"))
        errors.push("part 1 must include the host raazu");
    if (!allLines.some((l) => l.beat === "humor"))
        warnings.push("no humor beat");
    const used = new Set(parts.flatMap((p) => p.cast));
    const episode = {
        title: cleanText(raw.title).slice(0, 90) || "राज़ की बात",
        mood: MOODS.includes(raw.mood) ? raw.mood : "humorous",
        guests: guests.filter((g) => used.has(guestId(g))),
        parts,
        searchQueries: (Array.isArray(raw.searchQueries)
            ? raw.searchQueries
            : []
        )
            .map((q) => String(q).trim())
            .filter(Boolean)
            .slice(0, 3),
    };
    // must survive the renderer's own validation
    for (const [i, dlg] of partDialogues(episode, { dimension }).entries()) {
        try {
            normalizeDialogue(dlg);
        } catch (err) {
            errors.push(`part ${i + 1}: ${err.message}`);
        }
    }
    return {
        episode: errors.length ? null : episode,
        draft: episode,
        errors,
        warnings,
    };
}

/** The part dialogues (script.js format) of an episode. */
export function partDialogues(episode, { dimension = "vertical" } = {}) {
    return episode.parts.map((p, i) => ({
        id: `episode-part-${i + 1}`,
        title: episode.title,
        language: "hi",
        style: "classic",
        dimension: dimension === "horizontal" ? "horizontal" : "vertical",
        background: p.background,
        ...(p.setting ? { settings: { [p.setting.id]: p.setting } } : {}),
        bgm: "none",
        sfx: false,
        cast: p.cast,
        positions: p.positions,
        guests: episode.guests.filter((g) => p.cast.includes(guestId(g))),
        lines: p.lines,
    }));
}

/** Strip movement + Sheru from a part (always stages cleanly). */
export function simplifyDialogue(dlg) {
    return {
        ...dlg,
        positions: Object.fromEntries(
            dlg.cast.map((id, s) => [id, s ? "right" : "left"]),
        ),
        lines: dlg.lines.map((l) => ({
            ...l,
            actions: [],
            stage: undefined,
            pose: l.pose === "facefault" ? "scared" : l.pose,
            reaction: l.reaction
                ? {
                      ...l.reaction,
                      pose:
                          l.reaction.pose === "facefault"
                              ? "scared"
                              : l.reaction.pose,
                  }
                : l.reaction,
        })),
    };
}

/**
 * Run the staging guard on every part (estimated line timing, both the
 * requested orientation). Parts that fail are simplified (no movement / dog)
 * and re-checked. Returns { episode, errors, simplified }.
 */
export async function stageCheckEpisode(
    episode,
    { dimension = "vertical", fps = 25 } = {},
) {
    const errors = [];
    let simplified = 0;
    const dialogues = partDialogues(episode, { dimension });
    const parts = [];
    for (const [i, dlg] of dialogues.entries()) {
        const check = async (d) => {
            const tl = await buildCharacterTimeline(d, {
                dimension,
                tts: false,
                fps,
            });
            const { counts } = validateStaging(tl, { fps });
            return Object.values(counts).reduce((a, b) => a + b, 0)
                ? counts
                : null;
        };
        let bad = await check(dlg);
        let part = episode.parts[i];
        if (bad) {
            const simple = simplifyDialogue(dlg);
            const bad2 = await check(simple);
            if (bad2) {
                errors.push(
                    `part ${i + 1} fails the staging check ${JSON.stringify(bad2)}`,
                );
            } else {
                simplified++;
                part = {
                    ...part,
                    positions: simple.positions,
                    lines: simple.lines,
                };
                bad = null;
            }
        }
        parts.push(part);
    }
    return { episode: { ...episode, parts }, errors, simplified };
}

// --------------------------------------------------------------- template

function splitSentences(script) {
    const raw = String(script || "")
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?।])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
    const out = [];
    for (const s of raw) {
        if (s.length <= 180) {
            out.push(s);
            continue;
        }
        // long sentence → split at commas / conjunctions, max 180 chars
        let cur = "";
        for (const piece of s.split(/(?<=[,;:،])\s+/)) {
            if ((cur + " " + piece).trim().length > 180 && cur) {
                out.push(cur.trim());
                cur = piece;
            } else cur = `${cur} ${piece}`;
        }
        if (cur.trim()) {
            for (let i = 0; i < cur.trim().length; i += 180)
                out.push(cur.trim().slice(i, i + 180));
        }
    }
    return out;
}

const GOLU_REACTIONS = [
    { text: "सच में? ये तो कमाल है!", expression: "shocked", pose: "scared" },
    {
        text: "अरे बाप रे! मुझे तो यकीन ही नहीं हो रहा!",
        expression: "shocked",
        pose: "scared",
        beat: "humor",
        reaction: { expression: "dizzy", pose: "facefault", text: "धड़ाम!" },
    },
    { text: "रुको रुको... फिर क्या हुआ?", expression: "curious", pose: "think" },
    {
        text: "वाह! ये तो किसी जादू जैसा लगता है!",
        expression: "happy",
        pose: "idle",
        gesture: "fist",
    },
];

/**
 * Deterministic fallback episode: hosts only, the script's own sentences
 * explained by Raazu with Golu reacting. Works for any language input.
 */
export function templateEpisode(script, { dimension = "vertical" } = {}) {
    let sentences = splitSentences(script);
    if (!sentences.length) sentences = [String(script || "").slice(0, 180)];
    // keep it a Short: merge pairs when the script is long
    while (sentences.length > 10) {
        const merged = [];
        for (let i = 0; i < sentences.length; i += 2) {
            const a = sentences[i];
            const b = sentences[i + 1];
            merged.push(b && (a + " " + b).length <= 190 ? `${a} ${b}` : a);
            if (b && (a + " " + b).length > 190) merged.push(b);
        }
        if (merged.length >= sentences.length) break;
        sentences = merged;
    }
    sentences = sentences.slice(0, 12);
    const lines = [
        {
            speaker: "raazu",
            text: "दोस्तों, आज का राज़ सुनकर आप भी चौंक जाओगे!",
            expression: "curious",
            pose: "idle",
            gesture: "explain",
            look: "camera",
            listener: { expression: "happy", pose: "idle" },
            actions: [{ who: "golu", type: "walk", to: "right", at: "start" }],
        },
        {
            speaker: "golu",
            text: "क्या? जल्दी बताओ राज़ू, मुझसे रुका नहीं जा रहा!",
            expression: "curious",
            pose: "idle",
            listener: { expression: "happy", pose: "idle" },
        },
    ];
    sentences.forEach((s, i) => {
        const last = i === sentences.length - 1;
        lines.push({
            speaker: "raazu",
            text: s,
            expression: last ? "happy" : i % 2 ? "curious" : "neutral",
            pose: i % 3 === 1 ? "point" : "idle",
            gesture: i % 3 === 1 ? undefined : "explain",
            listener: { expression: "curious", pose: "think" },
            beat: last ? "reveal" : undefined,
            camera: last ? "reveal" : i % 2 ? "speaker" : "wide",
        });
        if (!last || sentences.length === 1) {
            const r = GOLU_REACTIONS[i % GOLU_REACTIONS.length];
            lines.push({
                speaker: "golu",
                ...r,
                listener: { expression: "happy", pose: "idle" },
            });
        }
    });
    lines.push(
        {
            speaker: "golu",
            text: "मतलब आज का राज़ भी सुलझ गया! अब मैं भी सबको बताऊँगा।",
            expression: "laughing",
            pose: "laugh",
            listener: { expression: "happy", pose: "hips" },
        },
        {
            speaker: "raazu",
            text: "सबूत बोलता है, अफ़वाह नहीं! ऐसे ही राज़ के लिए फ़ॉलो करना मत भूलना।",
            expression: "happy",
            pose: "point",
            look: "camera",
            listener: { expression: "happy", pose: "idle" },
        },
    );
    // split into parts of ≤ linesPerPart
    const parts = [];
    const topic = settingsForText(script);
    // 2-3 parts (different settings) even for a short episode
    const nParts = Math.min(
        EPISODE_LIMITS.parts,
        Math.max(
            Math.ceil(lines.length / EPISODE_LIMITS.linesPerPart),
            lines.length >= 12 ? 3 : lines.length >= 6 ? 2 : 1,
        ),
    );
    const per = Math.ceil(lines.length / nParts);
    const tSettings = diversifySettings(
        Array.from({ length: nParts }, (_, k) => ({
            preset: topic[k % topic.length],
        })),
    );
    for (let i = 0; i < lines.length; i += per) {
        const st = tSettings[parts.length];
        parts.push({
            cast: ["raazu", "golu"],
            background: st.id,
            setting: st,
            positions:
                i === 0
                    ? { raazu: "left", golu: "offR" }
                    : { raazu: "left", golu: "right" },
            lines: lines.slice(i, i + per),
        });
    }
    return {
        title: sentences[0].slice(0, 80),
        mood: "humorous",
        guests: [],
        parts,
        searchQueries: [],
        dimension,
    };
}

// ------------------------------------------------------------------ writer

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

/**
 * Write a full episode for `script`. Never throws: falls back to the
 * template. `generate` is injectable for tests (defaults to ai.factory).
 */
export async function writeEpisode(
    script,
    {
        provider = "gemini",
        model,
        geminiApiKeys = [],
        dimension = "vertical",
        onLog = (m) => console.log(`[Episode] ${m}`),
        generate,
    } = {},
) {
    const gen = generate || (await import("../ai/ai.factory.js")).generateJSON;
    const opts = { dimension, script };
    const providers = availableProviders(provider, geminiApiKeys);
    const attempts = [];
    const ask = async (prompt) => {
        let lastErr = null;
        for (const p of providers) {
            try {
                const res = await gen({
                    prompt,
                    provider: p,
                    model:
                        p === String(provider || "").toLowerCase()
                            ? model
                            : undefined,
                    geminiApiKeys,
                    // an episode is a long JSON answer
                    timeoutMs: 90000,
                });
                return { res, provider: p };
            } catch (err) {
                lastErr = err;
                onLog(
                    `AI provider ${p} failed: ${String(err.message || err).slice(0, 160)}`,
                );
            }
        }
        throw lastErr || new Error("no AI provider configured");
    };
    const evaluate = async (raw) => {
        const s = sanitizeEpisode(raw, opts);
        if (!s.episode) return { ...s, ok: false };
        const st = await stageCheckEpisode(s.episode, opts);
        return {
            ok: st.errors.length === 0,
            episode: st.episode,
            draft: s.draft,
            errors: st.errors,
            warnings: [
                ...s.warnings,
                ...(st.simplified
                    ? [`${st.simplified} part(s) simplified for staging`]
                    : []),
            ],
        };
    };

    let previous = null;
    let errors = [];
    for (const round of [1, 2]) {
        if (!providers.length) {
            errors = ["no AI provider configured"];
            break;
        }
        try {
            const prompt =
                round === 1 || !previous
                    ? episodePrompt(script, opts)
                    : repairPrompt(script, previous, errors, opts);
            const { res, provider: used } = await ask(prompt);
            const ev = await evaluate(res);
            attempts.push({
                round,
                provider: used,
                ok: ev.ok,
                errors: ev.errors,
            });
            if (ev.ok) {
                onLog(
                    `Episode written by ${used}${round === 2 ? " (after one repair)" : ""}: ${ev.episode.parts.length} part(s), ${ev.episode.parts.reduce((a, p) => a + p.lines.length, 0)} lines, ${ev.episode.guests.length} guest(s)${ev.warnings.length ? ` [${ev.warnings.join("; ")}]` : ""}`,
                );
                return {
                    episode: ev.episode,
                    source: round === 1 ? "ai" : "ai-repaired",
                    provider: used,
                    attempts,
                };
            }
            errors = ev.errors;
            previous = res;
            onLog(`Episode round ${round} invalid: ${errors.join("; ")}`);
        } catch (err) {
            errors = [String(err.message || err)];
            attempts.push({ round, ok: false, errors });
            onLog(`Episode round ${round} failed: ${errors[0].slice(0, 200)}`);
            // a broken / empty answer or a busy model is worth one fresh try
            if (
                round === 1 &&
                /invalid JSON|empty response|timeout|high demand|overloaded|unavailable|503/i.test(
                    errors[0],
                )
            )
                continue;
            break; // every provider failed: no point in a repair round
        }
    }
    const fallback = templateEpisode(script, opts);
    const st = await stageCheckEpisode(fallback, opts);
    onLog(
        `Using the template episode (${st.episode.parts.reduce((a, p) => a + p.lines.length, 0)} lines) — ${errors.join("; ").slice(0, 300)}`,
    );
    return {
        episode: st.episode,
        source: "template",
        provider: null,
        attempts,
        errors,
    };
}

/** Pipeline scenes (video.service scenePlan) for an episode. */
export function episodeScenes(episode, { dimension = "vertical" } = {}) {
    const dialogues = partDialogues(episode, { dimension });
    const n = dialogues.length;
    return dialogues.map((dlg, i) => ({
        id: i + 1,
        narration: dlg.lines.map((l) => l.text).join(" "),
        visualBrief: `${episode.title} — cartoon part ${i + 1}`,
        subject: "Raaz Explain Tv cartoon",
        environment: (() => {
            const st = dlg.settings?.[dlg.background];
            return st
                ? [st.preset || st.location, st.era, st.time, st.weather]
                      .filter(Boolean)
                      .join(", ")
                : dlg.background;
        })(),
        action: "character dialogue",
        cameraShot: "medium_shot",
        lightingMood:
            dlg.background === "haveli_night" ||
            ["night", "dusk"].includes(dlg.settings?.[dlg.background]?.time)
                ? "dark_mysterious"
                : "bright_natural",
        emotion: "humorous",
        visualType: "character",
        episode: true,
        dialogue: dlg,
        searchQueries: episode.searchQueries?.length
            ? episode.searchQueries
            : [episode.title],
        negativeKeywords: [],
        onScreenHighlight: "",
        punchline: i === n - 1,
    }));
}

export { GUEST_PRESETS };
