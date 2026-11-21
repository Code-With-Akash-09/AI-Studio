/**
 * Parametric mouth model for the classic rig.
 *
 * Every mouth — talking visemes and resting expression mouths — is one shape
 * family with the SAME anchor (centre of the upper lip) and the same size
 * envelope, described by numbers that can be blended frame to frame:
 *   w      half-width, in units of the base mouth width (R * 0.22)
 *   h      jaw opening below the upper lip, in units of head radius R (0 = closed)
 *   round  0 = D-shape / wide, 1 = oval
 *   teeth  0..1 upper-teeth band visibility
 *   smile  -1 (frown) .. 1 (smile) — corner lift / closed-mouth curve
 *   press  0..1 lips pressed (thicker closed line)
 *   wavy   0..1 wobbly closed mouth (scared / dizzy)
 *   smirk  0..1 one-sided closed smirk (suspicious)
 * Because nothing jumps anchor, blending neighbouring shapes is smooth.
 */

const Z = {
    w: 0.85,
    h: 0,
    round: 0,
    teeth: 0,
    smile: 0,
    press: 0,
    wavy: 0,
    smirk: 0,
};
const S = (o) => ({ ...Z, ...o });

/** Talking visemes (X = closed between words). */
export const VISEME_SHAPES = {
    X: S({ w: 0.8, smile: 0.2 }),
    M: S({ w: 0.62, press: 1 }),
    F: S({ w: 1.05, h: 0.07, teeth: 1 }),
    A: S({ w: 0.9, h: 0.11 }),
    B: S({ w: 0.95, h: 0.18 }),
    C: S({ w: 1.05, h: 0.26 }),
    E: S({ w: 1.2, h: 0.1, teeth: 1 }),
    O: S({ w: 0.62, h: 0.22, round: 1 }),
    U: S({ w: 0.45, h: 0.1, round: 1 }),
};

/** Resting (not talking) mouth per expression. */
export const REST_SHAPES = {
    neutral: S({ w: 0.85, smile: 0.6 }),
    happy: S({ w: 1.0, h: 0.15, smile: 1, teeth: 1 }),
    laughing: S({ w: 1.12, h: 0.3, smile: 1, teeth: 1 }),
    curious: S({ w: 0.4, h: 0.09, round: 1 }),
    shocked: S({ w: 0.58, h: 0.3, round: 1 }),
    scared: S({ w: 0.9, wavy: 1 }),
    dizzy: S({ w: 0.9, wavy: 1 }),
    suspicious: S({ w: 0.8, smirk: 1 }),
    crying: S({ w: 1.05, h: 0.28, smile: -1 }),
    intense: S({ w: 0.6, press: 1 }),
};

/** How an expression colours a talking viseme. */
function flavour(shape, expression) {
    const out = { ...shape };
    switch (expression) {
        case "happy":
        case "laughing":
            out.smile = Math.max(out.smile, 0.8);
            out.teeth = Math.max(out.teeth, out.h > 0.05 ? 0.8 : 0);
            break;
        case "shocked":
            // rounder vowels; closed visemes stay closed (pauses read as pauses)
            if (out.h > 0) out.round = Math.max(out.round, 0.6);
            break;
        case "crying":
            out.smile = -0.8;
            break;
        case "scared":
            out.w *= 0.88;
            break;
        case "suspicious":
            out.smile = Math.min(out.smile, 0);
            break;
        default:
            break;
    }
    return out;
}

/** Mouth shape for one frame. `level` (0..1 loudness) only scales openness. */
export function mouthShapeFor(expression, talking, viseme, level = 0.6) {
    if (!talking)
        return { ...(REST_SHAPES[expression] || REST_SHAPES.neutral) };
    const base = flavour(VISEME_SHAPES[viseme] || VISEME_SHAPES.X, expression);
    base.h *= Math.min(1.15, Math.max(0.55, 0.55 + 0.75 * level));
    return base;
}

const KEYS = Object.keys(Z);

/** Weighted blend of shapes: [[shape, weight], ...]. */
export function blendShapes(list) {
    const out = { ...Z };
    let tw = 0;
    for (const [, w] of list) tw += w;
    for (const k of KEYS) {
        let v = 0;
        for (const [s, w] of list) v += (s[k] ?? 0) * w;
        out[k] = tw ? v / tw : 0;
    }
    return out;
}
