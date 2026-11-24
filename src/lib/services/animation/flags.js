/**
 * Lightweight feature gates for the character-animation step (no heavy
 * imports, safe to load from the main pipeline even when the step is off).
 */
import { ANIMATION_FLAG } from "../../../constants/animation.js";

/** Master switch: ANIMATION_ENABLED=true (default off). */
export function isAnimationEnabled() {
    return String(process.env[ANIMATION_FLAG] || "").toLowerCase() === "true";
}

/**
 * Should this job get character-dialogue scenes? Needs the master switch;
 * then the per-job option (`characterAnimation`) decides, falling back to
 * ANIMATION_PIPELINE_DEFAULT=true (default off).
 */
export function characterAnimationFor(option) {
    if (!isAnimationEnabled()) return false;
    if (option === true || option === "true") return true;
    if (option === false || option === "false") return false;
    // ANIMATION_PIPELINE_DEFAULT=true|mix|full → some character scenes
    return ["true", "mix", "full"].includes(
        String(process.env.ANIMATION_PIPELINE_DEFAULT || "")
            .toLowerCase()
            .trim(),
    );
}

/**
 * Per-job video modes: "off" (stock visuals), "mix" (1-2 character scenes),
 * "full" (cartoon episode, code-drawn rig), "painted" (painted cutout-puppet
 * episode: AI-written multi-character Hindi dialogue, shot planner, painted
 * backgrounds, 16:9, voices only — see painted/README.md).
 */
export const ANIMATION_MODES = ["off", "mix", "full", "painted"];

/**
 * Resolve the job's animation mode. `animationMode` wins; the older boolean
 * `characterAnimation: true` still means "mix". Without the master switch
 * (ANIMATION_ENABLED=true) it is always "off".
 */
export function animationModeFor({ animationMode, characterAnimation } = {}) {
    if (!isAnimationEnabled()) return "off";
    const mode = String(animationMode || "")
        .toLowerCase()
        .trim();
    if (ANIMATION_MODES.includes(mode)) return mode;
    if (characterAnimation === true || characterAnimation === "true")
        return "mix";
    if (characterAnimation === false || characterAnimation === "false")
        return "off";
    return defaultAnimationMode();
}

/**
 * Server default for jobs that don't choose (automated / API callers):
 * ANIMATION_PIPELINE_DEFAULT=full | mix (or true) | off. Default off.
 */
export function defaultAnimationMode() {
    if (!isAnimationEnabled()) return "off";
    const raw = String(process.env.ANIMATION_PIPELINE_DEFAULT || "")
        .toLowerCase()
        .trim();
    if (raw === "full") return "full";
    if (raw === "painted") return "painted";
    if (raw === "mix" || raw === "true") return "mix";
    return "off";
}
