/**
 * Character-animation step constants (opt-in, not part of the live pipeline).
 */

/** Env flag that must equal "true" for the API route / pipeline hook to run. */
export const ANIMATION_FLAG = "ANIMATION_ENABLED";

/** Animation frame rate ("on twos" at 30fps output — classic cartoon cadence). */
export const ANIMATION_FPS = 15;

/** Output video frame rate (matches combineScenes in the main pipeline). */
export const ANIMATION_OUTPUT_FPS = 30;

/** Output audio sample rate (matches combineScenes in the main pipeline). */
export const ANIMATION_SAMPLE_RATE = 44100;

export const ANIMATION_DIMENSIONS = {
    horizontal: { width: 1920, height: 1080 },
    vertical: { width: 1080, height: 1920 },
};

export const EXPRESSIONS = [
    "neutral",
    "happy",
    "curious",
    "shocked",
    "scared",
    "laughing",
    "suspicious",
];

/** Aliases accepted in dialogue scripts. */
export const EXPRESSION_ALIASES = {
    thinking: "curious",
    angry: "suspicious",
    surprised: "shocked",
    afraid: "scared",
    smile: "happy",
};

export const POSES = [
    "idle",
    "point",
    "think",
    "scared",
    "laugh",
    "shrug",
    "hips",
];

/** Mouth shapes: X = closed/rest, A small, B medium, C wide, O round. */
export const VISEMES = ["X", "A", "B", "C", "O"];

export const BEATS = ["humor", "reveal"];

export const CAMERAS = ["wide", "speaker", "listener", "reveal"];
