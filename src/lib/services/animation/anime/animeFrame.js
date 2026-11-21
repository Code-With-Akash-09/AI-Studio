/**
 * Compose one anime-style frame: parallax layers → characters → foreground
 * → screen-space FX (focus/speed lines, impact frame, letterbox, grade, flash).
 */
import { renderAnimeLayers } from "./animeBackgrounds.js";
import { renderAnimeCharacter } from "./animeRig.js";
import {
    colorGrade,
    focusLines,
    impactFilter,
    impactBurst,
    letterbox,
    speedLines,
} from "./fx.js";

const n = (v) => Math.round(v * 100) / 100;

function parallax(layout, camera, shake, f) {
    const W = layout.width;
    const H = layout.height;
    const s = 1 + (camera.s - 1) * f;
    const x = W / 2 + (camera.x - W / 2) * f;
    const y = H / 2 + (camera.y - H / 2) * f;
    return `translate(${n(W / 2 + shake[0] * f)} ${n(H / 2 + shake[1] * f)}) scale(${n(s)}) translate(${n(-x)} ${n(-y)})`;
}

function toScreen(layout, camera, p) {
    return [
        (p[0] - camera.x) * camera.s + layout.width / 2,
        (p[1] - camera.y) * camera.s + layout.height / 2,
    ];
}

export function buildAnimeFrameSvg(timeline, frame, frameIndex) {
    const { layout } = timeline;
    const W = layout.width;
    const H = layout.height;
    const { camera, shake, fx = {} } = frame;
    const background = frame.background || timeline.dialogue.background;
    const layers = renderAnimeLayers(background, layout, frame.stage);

    let scene = "";
    for (const layer of layers.back) {
        scene += `<g transform="${parallax(layout, camera, shake, layer.f)}">${layer.svg}</g>`;
    }
    let chars = "";
    for (const { actor, state } of frame.chars) {
        chars += renderAnimeCharacter(actor.character, state);
    }
    scene += `<g transform="${parallax(layout, camera, shake, 1)}">${chars}</g>`;
    for (const layer of layers.front) {
        scene += `<g transform="${parallax(layout, camera, shake, layer.f)}">${layer.svg}</g>`;
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    if (fx.impact) {
        const focus = fx.focus
            ? toScreen(layout, camera, [fx.focus.x, fx.focus.y])
            : [W / 2, H * 0.4];
        svg += `<defs>${impactFilter(W, H)}</defs><g filter="url(#impactFrame)"><rect width="${W}" height="${H}" fill="#000"/>${scene}</g>`;
        svg += impactBurst(W, H, focus[0], focus[1], frameIndex);
    } else {
        svg += scene;
        svg += colorGrade(W, H);
        if (fx.focus) {
            const [fx0, fy0] = toScreen(layout, camera, [
                fx.focus.x,
                fx.focus.y,
            ]);
            svg += focusLines(W, H, fx0, fy0, frameIndex, {
                opacity: 0.55 * fx.focus.strength,
                clear: 0.34,
            });
            svg += focusLines(W, H, fx0, fy0, frameIndex + 7, {
                color: "#FFFFFF",
                count: 40,
                opacity: 0.25 * fx.focus.strength,
                clear: 0.4,
            });
        }
        if (fx.speed > 0.01) svg += speedLines(W, H, frameIndex, fx.speed);
    }
    svg += letterbox(W, H, fx.letterbox || 0);
    if (frame.flash > 0.01 && !fx.impact) {
        svg += `<rect width="${W}" height="${H}" fill="#FFFBE6" fill-opacity="${n(frame.flash * 0.8)}"/>`;
    }
    svg += "</svg>";
    return svg;
}
