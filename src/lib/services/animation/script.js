/**
 * Dialogue-script format + validation (pure, no I/O).
 *
 * {
 *   "id": "haveli-mirror",
 *   "title": "Haveli ki raat wali roshni",
 *   "language": "hi",
 *   "dimension": "horizontal" | "vertical",
 *   "style": "classic" | "flat" | "anime",   // default "classic"
 *   "background": "haveli_night",
 *   "bgm": "suspense",                   // opt-in background music (default: none)
 *   "bgmVolume": 0.14,
 *   "sfx": true,                         // opt-in story-beat SFX (default: off, voices only)
 *   "cast": ["raazu", "golu"],            // left → right stage slots
 *   "stage": { "windowGlow": 0 },          // initial background state
 *   "lines": [{
 *     "speaker": "raazu",
 *     "text": "Devanagari line (spoken + captioned)",
 *     "roman": "Optional romanized line (for writers)",
 *     "expression": "curious",             // neutral|happy|curious|shocked|scared|laughing|suspicious (+ aliases)
 *     "pose": "point",                     // idle|point|think|scared|laugh|shrug|hips
 *     "look": "partner" | "camera",
 *     "listener": { "expression": "scared", "pose": "scared" },
 *     "beat": "humor" | "reveal" | null,
 *     "reaction": { "expression": "suspicious", "pose": "hips", "text": "धक-धक!", "sfx": "boing" },
 *     "camera": "wide" | "speaker" | "listener" | "reveal",
 *     "stage": { "windowGlow": 1 },        // background state from this line on
 *     "background": "plain",               // optional scene/background switch (hard cut, no sound)
 *     "pauseAfter": 0.35
 *   }]
 * }
 */
import {
    ACTIONS,
    ANIMATION_AUDIO_DEFAULTS,
    BEATS,
    CAMERAS,
    DEFAULT_STYLE,
    STYLES,
    EXPRESSIONS,
    EXPRESSION_ALIASES,
    GESTURES,
    POSES,
} from "../../../constants/animation.js";
import { BACKGROUND_IDS } from "./backgrounds.js";
import { CHARACTERS } from "./characters.js";
import { registerGuests } from "./guests.js";

function normExpression(value, fallback = "neutral") {
    const v = String(value || "")
        .toLowerCase()
        .trim();
    const resolved = EXPRESSION_ALIASES[v] || v;
    return EXPRESSIONS.includes(resolved) ? resolved : fallback;
}

/**
 * Classic-style blocking: [{ who, type, to?, at?, delay?, dur? }]
 *  type: walk | run | hop (to a mark), jump (into the arms of character "to"),
 *        doubletake, dramatic (reveal beat)
 *  to:   0..1 (fraction of the stage width) or left | center | right | offL | offR
 *  at:   start (default) | end | after (after the reaction), plus delay seconds
 */
function normActions(list, cast) {
    if (!Array.isArray(list)) return [];
    return list
        .filter((a) => a && cast.includes(a.who) && ACTIONS.includes(a.type))
        .slice(0, 6)
        .map((a) => ({
            who: a.who,
            type: a.type,
            to:
                typeof a.to === "number"
                    ? Math.min(1.3, Math.max(-0.3, a.to))
                    : typeof a.to === "string"
                      ? a.to
                      : undefined,
            at: ["start", "end", "after"].includes(a.at) ? a.at : "start",
            delay: Math.min(Math.max(Number(a.delay) || 0, -3), 6),
            dur: a.dur ? Math.min(Math.max(Number(a.dur), 0.2), 6) : undefined,
        }));
}

function normPose(value, fallback = "idle") {
    const v = String(value || "")
        .toLowerCase()
        .trim();
    return POSES.includes(v) ? v : fallback;
}

/**
 * Validate and fill defaults. Throws with a readable message on bad input.
 * @param {object} input
 * @returns {object} normalized dialogue
 */
export function normalizeDialogue(input) {
    if (!input || typeof input !== "object") {
        throw new Error("Dialogue must be an object.");
    }
    // script-specific guest characters (episode mode) are registered first
    const guests = Array.isArray(input.guests)
        ? registerGuests(input.guests)
        : { ids: [], characters: [] };
    const cast = Array.isArray(input.cast) ? input.cast.slice(0, 2) : [];
    if (cast.length !== 2) {
        throw new Error("Dialogue cast must list exactly 2 character ids.");
    }
    for (const id of cast) {
        if (!CHARACTERS[id])
            throw new Error(`Unknown character in cast: ${id}`);
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
        throw new Error("Dialogue needs at least one line.");
    }
    if (input.lines.length > 40) {
        throw new Error("Dialogue is limited to 40 lines per render.");
    }

    const lines = input.lines.map((line, i) => {
        if (!cast.includes(line?.speaker)) {
            throw new Error(
                `Line ${i + 1}: speaker must be one of ${cast.join(", ")}.`,
            );
        }
        const text = String(line.text || "").trim();
        if (!text) throw new Error(`Line ${i + 1}: text is required.`);
        if (text.length > 220) {
            throw new Error(`Line ${i + 1}: keep lines under 220 characters.`);
        }
        const beat = BEATS.includes(line.beat) ? line.beat : null;
        const reaction = line.reaction
            ? {
                  expression: normExpression(
                      line.reaction.expression,
                      "shocked",
                  ),
                  pose: normPose(line.reaction.pose, "idle"),
                  text: line.reaction.text
                      ? String(line.reaction.text).slice(0, 24)
                      : "",
                  sfx:
                      line.reaction.sfx === "none"
                          ? null
                          : line.reaction.sfx || "boing",
              }
            : null;
        return {
            index: i,
            speaker: line.speaker,
            listenerId: cast.find((c) => c !== line.speaker),
            text,
            roman: line.roman ? String(line.roman) : "",
            expression: normExpression(line.expression),
            pose: normPose(line.pose),
            look: line.look === "camera" ? "camera" : "partner",
            listener: {
                expression: normExpression(line.listener?.expression),
                pose: normPose(line.listener?.pose),
            },
            beat,
            reaction,
            camera: CAMERAS.includes(line.camera)
                ? line.camera
                : beat === "reveal"
                  ? "reveal"
                  : "wide",
            stage:
                line.stage && typeof line.stage === "object"
                    ? line.stage
                    : null,
            background: BACKGROUND_IDS.includes(line.background)
                ? line.background
                : null,
            gesture: GESTURES.includes(line.gesture) ? line.gesture : null,
            actions: normActions(line.actions, cast),
            pauseAfter: Math.min(
                Math.max(Number(line.pauseAfter ?? 0.35) || 0, 0),
                3,
            ),
        };
    });

    return {
        id: String(input.id || "animation"),
        title: String(input.title || ""),
        language: input.language || "hi",
        dimension: input.dimension === "vertical" ? "vertical" : "horizontal",
        background: BACKGROUND_IDS.includes(input.background)
            ? input.background
            : "plain",
        // voices-only by default: BGM and SFX are strictly opt-in
        bgm:
            typeof input.bgm === "string" && input.bgm && input.bgm !== "none"
                ? input.bgm
                : ANIMATION_AUDIO_DEFAULTS.bgm,
        sfx: input.sfx === true ? true : ANIMATION_AUDIO_DEFAULTS.sfx,
        bgmVolume: Math.min(
            Math.max(Number(input.bgmVolume ?? 0.14) || 0.14, 0),
            0.5,
        ),
        style: STYLES.includes(input.style) ? input.style : DEFAULT_STYLE,
        cast,
        stage:
            input.stage && typeof input.stage === "object" ? input.stage : {},
        // classic style: starting marks per character, e.g. { "raazu": "offL" }
        positions:
            input.positions && typeof input.positions === "object"
                ? Object.fromEntries(
                      Object.entries(input.positions).filter(([id]) =>
                          cast.includes(id),
                      ),
                  )
                : {},
        guests: guests.characters.map((c) => c.guestSpec),
        watermark:
            input.watermark === undefined
                ? "Raaz Explain Tv"
                : String(input.watermark || ""),
        lines,
    };
}
