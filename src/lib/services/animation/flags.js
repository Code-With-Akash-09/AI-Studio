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
    return (
        String(process.env.ANIMATION_PIPELINE_DEFAULT || "").toLowerCase() ===
        "true"
    );
}
