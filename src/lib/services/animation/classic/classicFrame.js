/**
 * Compose one classic-style frame: flat parallax layers → characters →
 * foreground → simple comedy FX (gag sunburst backdrop on shocked close-ups,
 * reveal flash). Hard cuts only; no colour grading.
 */
import { renderClassicCharacter } from "./classicRig.js";
import { renderClassicLayers } from "./classicBackgrounds.js";

const n = (v) => Math.round(v * 100) / 100;

function parallax(layout, camera, shake, f) {
    const W = layout.width;
    const H = layout.height;
    const s = 1 + (camera.s - 1) * f;
    const x = W / 2 + (camera.x - W / 2) * f;
    const y = H / 2 + (camera.y - H / 2) * f;
    return `translate(${n(W / 2 + shake[0] * f)} ${n(H / 2 + shake[1] * f)}) scale(${n(s)}) translate(${n(-x)} ${n(-y)})`;
}

/** Classic gag backdrop: rotating two-tone sunburst. */
function sunburst(W, H, t) {
    const cx = W / 2;
    const cy = H * 0.42;
    const R = Math.hypot(W, H);
    const rays = 18;
    let d = "";
    for (let i = 0; i < rays; i++) {
        const a0 = (i * 2 * Math.PI) / rays + t * 0.6;
        const a1 = a0 + Math.PI / rays;
        d += `M ${n(cx)} ${n(cy)} L ${n(cx + Math.cos(a0) * R)} ${n(cy + Math.sin(a0) * R)} L ${n(cx + Math.cos(a1) * R)} ${n(cy + Math.sin(a1) * R)} Z `;
    }
    return `<rect width="${W}" height="${H}" fill="#FFD93B"/><path d="${d}" fill="#FF9E3B"/>`;
}

export function buildClassicFrameSvg(timeline, frame, frameIndex) {
    const { layout } = timeline;
    const W = layout.width;
    const H = layout.height;
    const { camera, shake, fx = {} } = frame;
    const background = frame.background || timeline.dialogue.background;
    const layers = renderClassicLayers(background, layout, frame.stage);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    if (fx.gag) {
        svg += sunburst(W, H, frame.t);
    } else {
        for (const layer of layers.back) {
            svg += `<g transform="${parallax(layout, camera, shake, layer.f)}">${layer.svg}</g>`;
        }
    }
    let chars = "";
    for (const { actor, state } of frame.chars) {
        chars += renderClassicCharacter(actor.character, {
            ...state,
            uid: `c${actor.slot}f${frameIndex % 2}`,
        });
    }
    svg += `<g transform="${parallax(layout, camera, shake, 1)}">${chars}</g>`;
    if (!fx.gag) {
        for (const layer of layers.front) {
            svg += `<g transform="${parallax(layout, camera, shake, layer.f)}">${layer.svg}</g>`;
        }
    }
    if (frame.flash > 0.01) {
        svg += `<rect width="${W}" height="${H}" fill="#FFFFFF" fill-opacity="${n(frame.flash * 0.75)}"/>`;
    }
    svg += "</svg>";
    return svg;
}
