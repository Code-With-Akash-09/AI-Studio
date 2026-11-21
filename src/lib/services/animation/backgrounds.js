/**
 * Flat 2D background scenes (pure functions → SVG markup, no I/O).
 * Every background receives the stage size and a time/state object so it can
 * animate deterministically (twinkling stars, drifting fog, glowing windows).
 */
import { createRandom } from "./random.js";

const n = (v) => Math.round(v * 10) / 10;
const OUT = "#0E0B16";

/** Stage layout shared by backgrounds and character placement. */
export function getStageLayout(width, height) {
    const vertical = height > width;
    return {
        width,
        height,
        vertical,
        groundY: vertical ? height * 0.8 : height * 0.91,
        horizonY: vertical ? height * 0.6 : height * 0.72,
        slots: vertical
            ? [width * 0.27, width * 0.73]
            : [width * 0.26, width * 0.74],
        characterScale: vertical ? 0.82 : 1,
        haveli: vertical
            ? { cx: width * 0.5, w: width * 0.62, h: height * 0.24 }
            : { cx: width * 0.5, w: width * 0.36, h: height * 0.42 },
        moon: vertical
            ? { x: width * 0.16, y: height * 0.2, r: width * 0.06 }
            : { x: width * 0.1, y: height * 0.14, r: height * 0.065 },
    };
}

/** Window/mirror anchors exposed for overlays (light beam on reveal). */
export function haveliAnchors(layout) {
    const { cx, w, h } = layout.haveli;
    const base = layout.horizonY + 10;
    const top = base - h;
    return {
        base,
        top,
        window: { x: cx, y: top + h * 0.3, w: w * 0.12, h: h * 0.2 },
        mirror: { x: cx + w * 0.36, y: top - h * 0.12 },
    };
}

function stars(layout, t) {
    const rand = createRandom(7);
    let svg = "";
    for (let i = 0; i < 70; i++) {
        const x = rand() * layout.width;
        const y = rand() * layout.horizonY * 0.75;
        const r = 1.2 + rand() * 2.4;
        const phase = rand() * 6.28;
        const op = 0.45 + 0.45 * Math.sin(t * (1 + rand() * 2) + phase);
        svg += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="#FFF7D6" fill-opacity="${n(Math.max(0.1, op) * 100) / 100}"/>`;
    }
    return svg;
}

export function haveli(layout, state) {
    const { cx, w, h } = layout.haveli;
    const A = haveliAnchors(layout);
    const left = cx - w / 2;
    const st = `stroke="${OUT}" stroke-width="6" stroke-linejoin="round"`;
    const wall = "#3B2F55";
    const wallDark = "#2A2140";
    const trim = "#5C4A80";
    let svg = "";

    // side towers with domes (chhatris)
    for (const side of [-1, 1]) {
        const tx = cx + side * (w / 2 - w * 0.08);
        const tw = w * 0.16;
        const tTop = A.top - h * 0.08;
        svg += `<rect x="${n(tx - tw / 2)}" y="${n(tTop)}" width="${n(tw)}" height="${n(A.base - tTop)}" fill="${wallDark}" ${st}/>`;
        svg += `<path d="M ${n(tx - tw * 0.62)} ${n(tTop)} Q ${n(tx)} ${n(tTop - tw * 1.0)} ${n(tx + tw * 0.62)} ${n(tTop)} Z" fill="${trim}" ${st}/>`;
        svg += `<path d="M ${n(tx)} ${n(tTop - tw * 0.5)} L ${n(tx)} ${n(tTop - tw * 0.72)}" stroke="${OUT}" stroke-width="5"/>`;
        for (let k = 0; k < 2; k++) {
            const wy = tTop + h * (0.22 + k * 0.32);
            svg += `<path d="M ${n(tx - tw * 0.22)} ${n(wy + h * 0.14)} L ${n(tx - tw * 0.22)} ${n(wy)} Q ${n(tx)} ${n(wy - tw * 0.3)} ${n(tx + tw * 0.22)} ${n(wy)} L ${n(tx + tw * 0.22)} ${n(wy + h * 0.14)} Z" fill="#15101F" ${st}/>`;
        }
    }

    // main block
    const bx = left + w * 0.14;
    const bw = w * 0.72;
    svg += `<rect x="${n(bx)}" y="${n(A.top)}" width="${n(bw)}" height="${n(A.base - A.top)}" fill="${wall}" ${st}/>`;
    // parapet
    const steps = 9;
    for (let i = 0; i < steps; i++) {
        const px = bx + (bw / steps) * i;
        svg += `<rect x="${n(px + 4)}" y="${n(A.top - h * 0.05)}" width="${n(bw / steps - 8)}" height="${n(h * 0.05)}" fill="${trim}" ${st}/>`;
    }
    svg += `<rect x="${n(bx)}" y="${n(A.top + h * 0.52)}" width="${n(bw)}" height="${n(h * 0.035)}" fill="${trim}" ${st}/>`;

    // windows (upper floor), the middle one glows
    const wins = 5;
    for (let i = 0; i < wins; i++) {
        const wx = bx + (bw / wins) * (i + 0.5);
        const ww = A.window.w * 0.85;
        const wh = A.window.h;
        const wy = A.window.y - wh / 2;
        const isMain = i === 2;
        const glow = isMain ? state.windowGlow || 0 : 0;
        const fill = glow > 0.05 ? "#FFD66B" : "#15101F";
        svg += `<path d="M ${n(wx - ww / 2)} ${n(wy + wh)} L ${n(wx - ww / 2)} ${n(wy + ww * 0.4)} Q ${n(wx)} ${n(wy - ww * 0.2)} ${n(wx + ww / 2)} ${n(wy + ww * 0.4)} L ${n(wx + ww / 2)} ${n(wy + wh)} Z" fill="${fill}" fill-opacity="${glow > 0.05 ? n(0.35 + glow * 0.65) : 1}" ${st}/>`;
        svg += `<path d="M ${n(wx)} ${n(wy + ww * 0.15)} L ${n(wx)} ${n(wy + wh)}" stroke="${OUT}" stroke-width="4"/>`;
    }
    // lower floor: arched door + small windows
    const dw = bw * 0.14;
    const dTop = A.top + h * 0.62;
    svg += `<path d="M ${n(cx - dw / 2)} ${n(A.base)} L ${n(cx - dw / 2)} ${n(dTop + dw * 0.5)} Q ${n(cx)} ${n(dTop - dw * 0.2)} ${n(cx + dw / 2)} ${n(dTop + dw * 0.5)} L ${n(cx + dw / 2)} ${n(A.base)} Z" fill="#1A1326" ${st}/>`;
    for (const side of [-1, 1]) {
        const wx = cx + side * bw * 0.3;
        svg += `<rect x="${n(wx - bw * 0.05)}" y="${n(dTop + h * 0.04)}" width="${n(bw * 0.1)}" height="${n(h * 0.14)}" rx="6" fill="#15101F" ${st}/>`;
    }

    // old roof mirror (the clue) on the right tower dome
    const m = A.mirror;
    const glint = state.mirrorGlint || 0;
    svg += `<path d="M ${n(m.x - 22)} ${n(m.y + 18)} L ${n(m.x - 8)} ${n(m.y - 22)} L ${n(m.x + 24)} ${n(m.y - 14)} L ${n(m.x + 10)} ${n(m.y + 26)} Z" fill="${glint > 0.05 ? "#E9FBFF" : "#7FA6C9"}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>`;
    if (glint > 0.05) {
        const r = 30 + glint * 40;
        svg += `<path d="M ${n(m.x - r)} ${n(m.y)} L ${n(m.x + r)} ${n(m.y)} M ${n(m.x)} ${n(m.y - r)} L ${n(m.x)} ${n(m.y + r)}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="${n(glint)}"/>`;
    }
    return svg;
}

function haveliNight(layout, state) {
    const { width: W, height: H } = layout;
    const t = state.t || 0;
    const moon = layout.moon;
    let svg = "";
    svg += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0F2C"/><stop offset="0.6" stop-color="#1B2552"/><stop offset="1" stop-color="#34407A"/></linearGradient>`;
    svg += `<radialGradient id="moonGlow"><stop offset="0" stop-color="#FFF6C8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF6C8" stop-opacity="0"/></radialGradient>`;
    svg += `<radialGradient id="winGlow"><stop offset="0" stop-color="#FFD66B" stop-opacity="0.75"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient></defs>`;
    svg += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
    svg += stars(layout, t);
    svg += `<circle cx="${n(moon.x)}" cy="${n(moon.y)}" r="${n(moon.r * 3)}" fill="url(#moonGlow)"/>`;
    svg += `<circle cx="${n(moon.x)}" cy="${n(moon.y)}" r="${n(moon.r)}" fill="#FFF3C4" stroke="${OUT}" stroke-width="5"/>`;
    svg += `<circle cx="${n(moon.x - moon.r * 0.3)}" cy="${n(moon.y - moon.r * 0.2)}" r="${n(moon.r * 0.18)}" fill="#EADBA0"/>`;
    svg += `<circle cx="${n(moon.x + moon.r * 0.35)}" cy="${n(moon.y + moon.r * 0.3)}" r="${n(moon.r * 0.12)}" fill="#EADBA0"/>`;

    // distant hills
    const hy = layout.horizonY;
    svg += `<path d="M 0 ${n(hy - H * 0.06)} Q ${n(W * 0.2)} ${n(hy - H * 0.14)} ${n(W * 0.42)} ${n(hy - H * 0.05)} T ${n(W * 0.8)} ${n(hy - H * 0.08)} T ${W} ${n(hy - H * 0.04)} L ${W} ${H} L 0 ${H} Z" fill="#161D40"/>`;

    // window glow halo behind haveli
    const A = haveliAnchors(layout);
    if ((state.windowGlow || 0) > 0.05) {
        svg += `<circle cx="${n(A.window.x)}" cy="${n(A.window.y)}" r="${n(layout.haveli.w * 0.28)}" fill="url(#winGlow)" opacity="${n(state.windowGlow)}"/>`;
    }
    svg += haveli(layout, state);

    // ground
    const gy = layout.groundY;
    svg += `<path d="M 0 ${n(hy + 6)} L ${W} ${n(hy + 6)} L ${W} ${H} L 0 ${H} Z" fill="#1E2B2A"/>`;
    svg += `<path d="M 0 ${n(gy - H * 0.05)} Q ${n(W * 0.5)} ${n(gy - H * 0.09)} ${W} ${n(gy - H * 0.05)} L ${W} ${H} L 0 ${H} Z" fill="#26382F" stroke="${OUT}" stroke-width="5"/>`;
    // dead trees
    for (const side of [-1, 1]) {
        const tx = side === -1 ? W * 0.05 : W * 0.95;
        const ty = hy + 8;
        const th = layout.vertical ? H * 0.2 : H * 0.36;
        svg += `<path d="M ${n(tx)} ${n(ty)} L ${n(tx)} ${n(ty - th)} M ${n(tx)} ${n(ty - th * 0.55)} L ${n(tx + side * -th * 0.25)} ${n(ty - th * 0.85)} M ${n(tx)} ${n(ty - th * 0.75)} L ${n(tx + side * th * 0.18)} ${n(ty - th * 0.98)} M ${n(tx)} ${n(ty - th * 0.35)} L ${n(tx + side * th * 0.2)} ${n(ty - th * 0.55)}" stroke="#0C0A14" stroke-width="${layout.vertical ? 10 : 14}" stroke-linecap="round" fill="none"/>`;
    }
    // drifting fog
    for (let i = 0; i < 3; i++) {
        const fx = ((t * (18 + i * 9) + i * W * 0.4) % (W * 1.4)) - W * 0.2;
        const fy = hy + H * (0.02 + i * 0.03);
        svg += `<ellipse cx="${n(fx)}" cy="${n(fy)}" rx="${n(W * 0.22)}" ry="${n(H * 0.025)}" fill="#C9D3FF" fill-opacity="0.08"/>`;
    }
    return svg;
}

function plain(layout) {
    const { width: W, height: H } = layout;
    return (
        `<defs><linearGradient id="plainBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F1EA"/><stop offset="1" stop-color="#E3DCCF"/></linearGradient></defs>` +
        `<rect width="${W}" height="${H}" fill="url(#plainBg)"/>`
    );
}

const BACKGROUNDS = {
    haveli_night: haveliNight,
    plain,
};

export const BACKGROUND_IDS = Object.keys(BACKGROUNDS);

export function renderBackground(id, layout, state = {}) {
    const fn = BACKGROUNDS[id] || BACKGROUNDS.plain;
    return fn(layout, state);
}

/**
 * Overlay for the haveli "reveal": light beams moon → roof mirror → window.
 */
export function renderRevealBeam(layout, amount) {
    if (!amount || amount <= 0.01) return "";
    const A = haveliAnchors(layout);
    const m = A.mirror;
    const moon = layout.moon;
    const w = A.window;
    const op = n(Math.min(1, amount) * 0.5 * 100) / 100;
    return (
        `<path d="M ${n(moon.x - moon.r * 0.5)} ${n(moon.y + moon.r * 0.4)} L ${n(moon.x + moon.r * 0.5)} ${n(moon.y - moon.r * 0.4)} L ${n(m.x + 10)} ${n(m.y)} L ${n(m.x - 6)} ${n(m.y + 8)} Z" fill="#FFF6C0" fill-opacity="${op}"/>` +
        `<path d="M ${n(m.x - 10)} ${n(m.y)} L ${n(m.x + 10)} ${n(m.y + 6)} L ${n(w.x + w.w * 0.45)} ${n(w.y + w.h * 0.4)} L ${n(w.x - w.w * 0.45)} ${n(w.y - w.h * 0.1)} Z" fill="#FFF6C0" fill-opacity="${op}"/>`
    );
}
