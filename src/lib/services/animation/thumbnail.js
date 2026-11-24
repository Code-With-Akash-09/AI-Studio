/**
 * Thumbnails that share ONE design with the video.
 *
 * The video's characters are drawn by the classic rig (code), so the
 * thumbnail is drawn by the same rig too: same proportions, hair, glasses,
 * coat buttons, checked gamchha, colours — on the episode's own setting.
 * `thumbnailSvg` gives the plate (no text); the CLI
 * (.scripts/animation/render-thumbnail.mjs) adds the Hindi title with libass.
 *
 * If an image model is used to "polish" a thumbnail, give it the rig plate +
 * the reference sheet as reference images and `thumbnailPrompt()` as the
 * prompt, so it redraws the SAME characters instead of inventing new ones.
 */
import { getStageLayout } from "./backgrounds.js";
import { CHARACTERS } from "./characters.js";
import { renderClassicCharacter } from "./classic/classicRig.js";
import { normalizeSetting, renderSettingLayers } from "./classic/settings.js";

const n = (v) => Math.round(v * 10) / 10;

/** Default thumbnail acting: the scared friend + the smug detective. */
export const THUMB_POSES = {
    left: {
        id: "golu",
        expression: "shocked",
        pose: "scared",
        look: [0.4, -0.1],
    },
    right: {
        id: "raazu",
        expression: "suspicious",
        pose: "point",
        look: [-0.7, 0],
    },
};

/**
 * @param {object} o
 * @param {string|object} o.setting - preset name or setting spec
 * @param {"16x9"|"9x16"} [o.dim]
 * @param {object} [o.left] / [o.right] - {id, expression, pose, look}
 * @returns {{svg: string, width: number, height: number, setting: object}}
 */
export function thumbnailSvg({
    setting = "siberian_forest",
    dim = "16x9",
    left = THUMB_POSES.left,
    right = THUMB_POSES.right,
} = {}) {
    const vertical = dim === "9x16";
    const [W, H] = vertical ? [1080, 1920] : [1280, 720];
    const L = getStageLayout(W, H);
    const spec = normalizeSetting(setting);
    const lay = renderSettingLayers(spec, L, { t: 0.8 });
    // zoomed-in "poster" framing: characters big, cut at the waist / knees
    const zoom = vertical ? 1.55 : 1.75;
    const cx = W / 2;
    const cy = vertical ? H * 0.98 : H * 1.02;
    const bgZoom = 1 + (zoom - 1) * 0.25;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    svg += `<g transform="translate(${n(cx)} ${n(cy)}) scale(${bgZoom}) translate(${n(-cx)} ${n(-cy)})">`;
    for (const l of lay.back) svg += l.svg;
    svg += "</g>";
    svg += `<g transform="translate(${n(cx)} ${n(cy)}) scale(${zoom}) translate(${n(-cx)} ${n(-cy)})">`;
    const sc = (vertical ? 0.82 : 0.72) * 1.18;
    const xs = vertical ? [W * 0.3, W * 0.72] : [W * 0.36, W * 0.66];
    const ys = vertical ? [H * 0.9, H * 0.92] : [H * 0.96, H * 0.98];
    for (const [k, p] of [
        [0, left],
        [1, right],
    ]) {
        const ch = CHARACTERS[p.id];
        if (!ch) continue;
        svg += renderClassicCharacter(ch, {
            x: xs[k],
            y: ys[k],
            scale: sc * (p.id === "golu" ? 0.95 : 1),
            t: 1.1,
            since: 2,
            uid: `th${k}`,
            rim: lay.rim,
            facing: k ? -1 : 1,
            expression: p.expression,
            pose: p.pose,
            look: p.look,
        });
    }
    svg += "</g>";
    for (const l of lay.front) svg += l.svg;
    // vignette for punch
    svg += `<defs><radialGradient id="thv" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#thv)"/>`;
    svg += "</svg>";
    return { svg, width: W, height: H, setting: spec };
}

/** Prompt for an image model that must keep the rig's character design. */
export function thumbnailPrompt({ title = "", setting = "" } = {}) {
    const spec = normalizeSetting(setting || "gali_street");
    const place = [
        spec.preset || spec.location,
        spec.era,
        spec.time,
        spec.weather,
    ]
        .filter(Boolean)
        .join(", ");
    return [
        "YouTube thumbnail for the Hindi kids' mystery channel 'Raaz Explain Tv'.",
        "Use the attached reference images as the EXACT character design: keep each character's proportions, face shape, hair shape, eye style, glasses, clothes, buttons, pocket, scarf and the red-white checked gamchha, and every colour, exactly as in the references. Do not redesign, age up or restyle them.",
        "Same flat 2D cartoon look as the references: thick dark outlines, two-tone cel shading, a soft rim light.",
        `Scene: ${place}. Keep the composition of the attached plate.`,
        title
            ? `Big bold yellow Hindi title with a thick black outline: "${title}".`
            : "",
        "Original characters only; do not imitate any existing cartoon.",
    ]
        .filter(Boolean)
        .join("\n");
}
