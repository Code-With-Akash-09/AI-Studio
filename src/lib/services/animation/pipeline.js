/**
 * Bridge between the main video pipeline and the character-animation step.
 *
 * Everything here is opt-in:
 *  - ANIMATION_ENABLED=true is the master switch (default off → the pipeline
 *    behaves exactly as before; "character" scenes are downgraded to "video").
 *  - Per job: generateVideo({ characterAnimation: true }) / POST /api/generate
 *    { "characterAnimation": true }. If the job does not say, it follows
 *    ANIMATION_PIPELINE_DEFAULT=true (default off).
 *
 * Character scenes are rendered in the classic style, voices only (no BGM, no
 * SFX), at the pipeline scenes' real 25fps / 44.1kHz stereo / 1920x1080 or 1080x1920 so
 * combineScenes() concatenates them with the normal scenes.
 */
import { ACTIONS, EXPRESSIONS, POSES } from "../../../constants/animation.js";
export { characterAnimationFor } from "./flags.js";
export { simplifyDialogue } from "./episode.js";
import { SETTING_PRESETS, settingsForText } from "./classic/settings.js";
import { normalizeDialogue, renderDialogueScene } from "./index.js";

/** Speakers the AI may use (Sheru the dog never speaks; he is a stage reveal). */
const SPEAKER_ALIASES = {
    raazu: "raazu",
    raju: "raazu",
    राज़ू: "raazu",
    राजू: "raazu",
    golu: "golu",
    गोलू: "golu",
    nani: "nani",
    "kissa nani": "nani",
    kissanani: "nani",
    "किस्सा नानी": "nani",
    नानी: "nani",
};

/** Clean, well-tested actions only (no jump-into-arms). */
const SAFE_ACTIONS = ACTIONS.filter((a) => a !== "jump");
const SAFE_POSES = POSES.filter((p) => p !== "catch");
const MAX_LINES = 8;

/** Extra instructions appended to analyzeScript's prompt when enabled. */
export function characterScenePrompt() {
    return `
CHARACTER DIALOGUE SCENES (enabled for this video):
You MAY turn 1 (at most 2) scenes into a short animated cartoon dialogue between the channel's ORIGINAL characters, using "visualType": "character". Use it only where a conversational, humorous or explanatory moment fits (never for every scene). Keep all other scenes as normal "video"/"image"/"text" scenes.
Characters (speakers): "raazu" (smart mystery-explainer boy with glasses), "golu" (chubby, easily scared, funny friend), "nani" (Kissa Nani, a storytelling grandmother). Sheru is a street dog who never speaks; mention him in a line and set "stage": {"dog": 1} on that line to reveal him.
For a "character" scene:
- "narration": still the EXACT verbatim script segment covered by this scene (for coverage).
- Also fill visualBrief/subject/environment/action/searchQueries/negativeKeywords as usual (used as a fallback visual).
- Add "dialogue": {
    "cast": [two speaker ids, left then right],
    "background": a setting preset that matches WHERE this segment happens, one of ${JSON.stringify(Object.keys(SETTING_PRESETS))} (or "gali_day" / "haveli_night" for an everyday street / an old mansion),
    "lines": [2-${MAX_LINES} lines, each {
        "speaker": one of the cast,
        "text": a short Hindi line in Devanagari (max 120 characters) that conveys this segment's content conversationally,
        "expression": one of ${JSON.stringify(EXPRESSIONS)},
        "pose": one of ${JSON.stringify(SAFE_POSES)},
        "gesture": optional, one of ["explain", "wave", "fist", "nod"],
        "listener": {"expression": ..., "pose": ...},
        "beat": optional "humor" or "reveal" (at most one reveal),
        "reaction": optional {"expression": ..., "pose": ..., "text": short Hindi exclamation} (for humor beats),
        "camera": optional one of ["wide", "speaker", "closeup", "reveal"],
        "actions": optional, at most 1-2 simple actions [{"who": cast id, "type": one of ${JSON.stringify(SAFE_ACTIONS)}, "to": 0.2-0.8 or "left"/"center"/"right" or the other cast id (for "hide"), "at": "start"|"end"}]
    }]
  }
Keep a character scene under ~25 seconds of speech. Prefer few, purposeful actions. Never copy existing cartoon characters, names, catchphrases or designs.
`;
}

function speakerId(raw) {
    const key = String(raw || "")
        .toLowerCase()
        .trim();
    return (
        SPEAKER_ALIASES[key] ||
        SPEAKER_ALIASES[String(raw || "").trim()] ||
        null
    );
}

/**
 * Validate + sanitize an AI "character" scene. Returns a dialogue object ready
 * for renderDialogueScene(), or null when it can't be used (caller falls back
 * to a normal visual).
 */
export function sanitizeCharacterDialogue(
    scene,
    { dimension = "vertical" } = {},
) {
    const d = scene?.dialogue;
    if (!d || typeof d !== "object" || !Array.isArray(d.lines)) return null;
    const lines = [];
    for (const raw of d.lines) {
        if (!raw || typeof raw !== "object") continue;
        const speaker = speakerId(raw.speaker);
        const text = String(raw.text || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200);
        if (!speaker || !text) continue; // Sheru / unknown speakers are dropped
        lines.push({ ...raw, speaker, text });
        if (lines.length >= MAX_LINES) break;
    }
    if (lines.length === 0) return null;

    let cast = (Array.isArray(d.cast) ? d.cast : [])
        .map(speakerId)
        .filter(Boolean);
    for (const l of lines) if (!cast.includes(l.speaker)) cast.push(l.speaker);
    cast = [...new Set(cast)];
    if (cast.length === 1) cast.push(cast[0] === "golu" ? "raazu" : "golu");
    if (cast.length > 2) {
        // keep the two most frequent speakers; drop the others' lines
        const count = (id) => lines.filter((l) => l.speaker === id).length;
        cast = cast.sort((a, b) => count(b) - count(a)).slice(0, 2);
    }
    const kept = lines.filter((l) => cast.includes(l.speaker));
    if (kept.length === 0) return null;

    let reveals = 0;
    let dramatic = 0;
    let dogShown = false;
    const clean = kept.map((l) => {
        const beat =
            l.beat === "reveal" && reveals++ === 0
                ? "reveal"
                : l.beat === "humor"
                  ? "humor"
                  : null;
        const pose = SAFE_POSES.includes(l.pose) ? l.pose : "idle";
        const actions = (Array.isArray(l.actions) ? l.actions : [])
            .filter((a) => a && SAFE_ACTIONS.includes(a.type))
            .map((a) => ({
                ...a,
                who: speakerId(a.who) || (cast.includes(a.who) ? a.who : null),
                to:
                    a.type === "hide"
                        ? cast.find((c) => c !== speakerId(a.who))
                        : typeof a.to === "number"
                          ? Math.min(0.85, Math.max(0.15, a.to))
                          : ["left", "center", "right"].includes(a.to)
                            ? a.to
                            : undefined,
            }))
            .filter((a) => a.who && cast.includes(a.who))
            .filter((a) => (a.type === "dramatic" ? dramatic++ === 0 : true))
            .slice(0, 2);
        const mentionsDog = /शेरू|sheru/i.test(l.text) || l.stage?.dog;
        const stage = mentionsDog && !dogShown ? { dog: 1 } : undefined;
        if (stage) dogShown = true;
        const camera = ["wide", "speaker", "closeup", "reveal"].includes(
            l.camera,
        )
            ? l.camera
            : undefined;
        return {
            speaker: l.speaker,
            text: l.text,
            expression: l.expression,
            pose,
            gesture: l.gesture,
            look: l.look === "camera" ? "camera" : undefined,
            listener: l.listener,
            beat,
            reaction:
                beat === "humor" && l.reaction
                    ? {
                          ...l.reaction,
                          pose: SAFE_POSES.includes(l.reaction.pose)
                              ? l.reaction.pose
                              : "idle",
                      }
                    : undefined,
            // a reveal camera needs something to reveal
            camera: camera === "reveal" && beat !== "reveal" ? "wide" : camera,
            stage,
            actions,
        };
    });

    const bgKey = String(d.background || "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
    const background = ["gali_day", "haveli_night", "plain"].includes(bgKey)
        ? bgKey
        : SETTING_PRESETS[bgKey]
          ? bgKey
          : settingsForText(
                `${scene.narration || ""} ${scene.environment || ""}`,
            )[((Number(scene.id) || 1) - 1) % 3];
    const dialogue = {
        id: `scene-${scene.id || 1}`,
        title: String(scene.visualBrief || "").slice(0, 80),
        language: "hi",
        style: "classic",
        dimension: dimension === "horizontal" ? "horizontal" : "vertical",
        background,
        // voices only, always
        bgm: "none",
        sfx: false,
        cast,
        positions: { [cast[0]]: "left", [cast[1]]: "right" },
        lines: clean,
    };
    try {
        normalizeDialogue(dialogue);
    } catch (err) {
        console.warn(`[Animation] Character scene rejected: ${err.message}`);
        return null;
    }
    return dialogue;
}

/**
 * Render a sanitized character scene as a pipeline scene (same shape as
 * createScene() results). Throws on failure (caller falls back).
 */
export async function renderCharacterScene(
    scene,
    index,
    { dialogue, dimension, onProgress = () => {} },
) {
    const result = await renderDialogueScene(dialogue, {
        index,
        dimension: dimension === "horizontal" ? "horizontal" : "vertical",
        tts: true,
        onProgress: (p, msg) => onProgress(p, msg),
    });
    if (result.placeholderLines > 0)
        throw new Error(
            `Edge TTS failed for ${result.placeholderLines} dialogue line(s); not using a silent character scene.`,
        );
    return {
        ...result,
        id: scene.id,
        narration: scene.narration || result.narration,
        emotion: scene.emotion || "dialogue",
        punchline: Boolean(scene.punchline),
        dialogue,
    };
}
