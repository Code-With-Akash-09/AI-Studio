/**
 * Anime-style 2D rig (pure functions → SVG, no I/O).
 *
 * Same state interface as ../rig.js (expression, pose, mouth viseme, blink,
 * look, t, talking) so the timeline drives either style. Adds: cel shading
 * (shadow + highlight layers), anime eyes with iris gradient and shine,
 * spring-like swaying hair locks / ahoge / scarf tail, glasses glint, and
 * emotion symbols (sweat drop, anger vein, gloom lines, shock lines, blush
 * hatching, sparkles). Designs stay ORIGINAL to Raaz Explain Tv.
 */
import { anchors, armPoints, getExpressionPreset, limbPath } from "../rig.js";
import { lightOf, mix, shadowOf } from "./color.js";

const n = (v) => Math.round(v * 10) / 10;
const LINE_W = 4.5;

function sway(t, i, amp, seed = 0) {
    return (
        Math.sin(t * 2.3 + i * 0.9 + seed) * amp +
        Math.sin(t * 5.1 + i * 1.7 + seed) * amp * 0.35
    );
}

/** Draw shapes as one silhouette: thick outline pass, then fill pass. */
function union(paths, fill, line, width = LINE_W * 2) {
    const outline = paths
        .map(
            (d) =>
                `<path d="${d}" fill="${line}" stroke="${line}" stroke-width="${width}" stroke-linejoin="round"/>`,
        )
        .join("");
    const fills = paths.map((d) => `<path d="${d}" fill="${fill}"/>`).join("");
    return outline + fills;
}

// ------------------------------------------------------------
// Hair
// ------------------------------------------------------------

function spikyHair(R, t, seed) {
    // Back mass with spikes around the crown
    const N = 8;
    let back = "";
    for (let i = 0; i <= N; i++) {
        const a = ((-200 + (220 * i) / N) * Math.PI) / 180;
        const r = R * 0.98;
        const p = [Math.cos(a) * r, Math.sin(a) * r];
        if (i === 0) back += `M ${n(p[0])} ${n(p[1])} `;
        else back += `L ${n(p[0])} ${n(p[1])} `;
        if (i < N) {
            const am = ((-200 + (220 * (i + 0.5)) / N) * Math.PI) / 180;
            const tr = R * (1.26 + ((i * 37) % 5) * 0.04);
            const sx = sway(t, i, R * 0.025, seed);
            back += `L ${n(Math.cos(am) * tr + sx)} ${n(Math.sin(am) * tr)} `;
        }
    }
    back += `L ${n(R * 0.98)} ${n(R * 0.5)} L ${n(-R * 0.98)} ${n(R * 0.5)} Z`;

    const cap = `M ${n(-R * 1.03)} ${n(-R * 0.05)} C ${n(-R * 1.08)} ${n(-R * 1.18)} ${n(R * 1.08)} ${n(-R * 1.18)} ${n(R * 1.03)} ${n(-R * 0.05)} L ${n(R * 0.9)} ${n(-R * 0.5)} L ${n(-R * 0.9)} ${n(-R * 0.5)} Z`;

    // Front bangs: pointed locks that sway
    const xs = [-0.86, -0.56, -0.27, 0.02, 0.32, 0.6, 0.88];
    const tips = [-0.02, -0.16, 0.02, -0.2, -0.04, -0.14, 0.04];
    const locks = xs.map((x, i) => {
        const w = R * 0.19;
        const top = -R * 0.6;
        const tipX =
            x * R +
            (x < 0 ? -1 : 1) * R * 0.06 +
            sway(t, i + 3, R * 0.03, seed);
        const tipY = tips[i] * R;
        return `M ${n(x * R - w)} ${n(top)} Q ${n(x * R - w * 0.4)} ${n((top + tipY) / 2)} ${n(tipX)} ${n(tipY)} Q ${n(x * R + w * 0.6)} ${n((top + tipY) / 2)} ${n(x * R + w)} ${n(top)} Z`;
    });

    const ahogeSway = sway(t * 1.4, 1, R * 0.08, seed);
    const ahoge = `M ${n(-R * 0.06)} ${n(-R * 1.06)} C ${n(-R * 0.08 + ahogeSway * 0.3)} ${n(-R * 1.55)} ${n(R * 0.42 + ahogeSway)} ${n(-R * 1.62)} ${n(R * 0.34 + ahogeSway)} ${n(-R * 1.32)} C ${n(R * 0.26 + ahogeSway * 0.6)} ${n(-R * 1.46)} ${n(R * 0.08)} ${n(-R * 1.4)} ${n(R * 0.08)} ${n(-R * 1.06)} Z`;

    return {
        back: [back],
        front: [cap, ...locks, ahoge],
        hairline: -R * 0.6,
        tips: xs.map((x, i) => [x * R, tips[i] * R]),
    };
}

function tuftHair(R, t, seed) {
    const back = `M ${n(-R * 1.0)} ${n(-R * 0.1)} C ${n(-R * 1.05)} ${n(-R * 1.1)} ${n(R * 1.05)} ${n(-R * 1.1)} ${n(R * 1.0)} ${n(-R * 0.1)} Z`;
    const cap = `M ${n(-R * 1.02)} ${n(-R * 0.2)} C ${n(-R * 1.0)} ${n(-R * 1.12)} ${n(R * 1.0)} ${n(-R * 1.12)} ${n(R * 1.02)} ${n(-R * 0.2)} L ${n(R * 0.85)} ${n(-R * 0.52)} L ${n(-R * 0.85)} ${n(-R * 0.52)} Z`;
    const xs = [-0.7, -0.38, -0.05, 0.28, 0.62];
    const tips = [-0.3, -0.36, -0.28, -0.38, -0.3];
    const locks = xs.map((x, i) => {
        const w = R * 0.2;
        const top = -R * 0.6;
        const tipX = x * R + sway(t, i, R * 0.02, seed);
        return `M ${n(x * R - w)} ${n(top)} Q ${n(x * R - w * 0.3)} ${n(tips[i] * R)} ${n(tipX)} ${n(tips[i] * R)} Q ${n(x * R + w * 0.5)} ${n(tips[i] * R)} ${n(x * R + w)} ${n(top)} Z`;
    });
    const tuft = [-1, 0, 1].map((k) => {
        const bx = k * R * 0.12;
        const s = sway(t * 1.6, k + 2, R * 0.07, seed);
        const tx = bx + k * R * 0.18 + s;
        const ty = -R * (1.48 - Math.abs(k) * 0.12);
        return `M ${n(bx - R * 0.1)} ${n(-R * 0.78)} Q ${n(bx - R * 0.02 + s * 0.4)} ${n(-R * 1.2)} ${n(tx)} ${n(ty + R * 0.12)} Q ${n(bx + R * 0.08 + s * 0.4)} ${n(-R * 1.15)} ${n(bx + R * 0.11)} ${n(-R * 0.78)} Z`;
    });
    return {
        back: [back],
        front: [cap, ...locks, ...tuft],
        hairline: -R * 0.55,
        tips: xs.map((x, i) => [x * R, tips[i] * R]),
    };
}

function bunHair(R, t, seed) {
    const bun = `M ${n(-R * 0.38)} ${n(-R * 1.0)} A ${n(R * 0.38)} ${n(R * 0.36)} 0 1 1 ${n(R * 0.38)} ${n(-R * 1.0)} Z`;
    const back = `M ${n(-R * 1.0)} ${n(-R * 0.05)} C ${n(-R * 1.05)} ${n(-R * 1.05)} ${n(R * 1.05)} ${n(-R * 1.05)} ${n(R * 1.0)} ${n(-R * 0.05)} Z`;
    const cap = `M ${n(-R * 1.02)} ${n(-R * 0.05)} C ${n(-R * 1.06)} ${n(-R * 1.08)} ${n(R * 1.06)} ${n(-R * 1.08)} ${n(R * 1.02)} ${n(-R * 0.05)} C ${n(R * 0.8)} ${n(-R * 0.6)} ${n(R * 0.12)} ${n(-R * 0.66)} 0 ${n(-R * 0.52)} C ${n(-R * 0.12)} ${n(-R * 0.66)} ${n(-R * 0.8)} ${n(-R * 0.6)} ${n(-R * 1.02)} ${n(-R * 0.05)} Z`;
    const strand = `M ${n(R * 0.85)} ${n(-R * 0.35)} Q ${n(R * 1.0 + sway(t, 1, R * 0.04, seed))} ${n(R * 0.1)} ${n(R * 0.9)} ${n(R * 0.3)} L ${n(R * 0.86)} ${n(-R * 0.2)} Z`;
    return {
        back: [bun, back],
        front: [cap, strand],
        hairline: -R * 0.5,
        tips: [],
    };
}

function hairShapes(style, R, t, seed) {
    if (style === "tuft") return tuftHair(R, t, seed);
    if (style === "bun") return bunHair(R, t, seed);
    return spikyHair(R, t, seed);
}

function drawHair(shapes, which, ch, uid, R) {
    const A = ch.anime;
    const paths = shapes[which];
    if (!paths.length) return "";
    const clip = `${uid}-hair-${which}`;
    let svg = `<defs><clipPath id="${clip}">${paths.map((d) => `<path d="${d}"/>`).join("")}</clipPath></defs>`;
    svg += union(paths, A.hair, A.line);
    // cel shadow (lower-right) + highlight ring
    svg += `<g clip-path="url(#${clip})">`;
    svg += `<path d="M ${n(R * 0.1)} ${n(-R * 1.8)} L ${n(R * 1.6)} ${n(-R * 1.8)} L ${n(R * 1.6)} ${n(R * 0.8)} L ${n(-R * 1.4)} ${n(R * 0.8)} Z" fill="${shadowOf(A.hair, 0.45)}" fill-opacity="0.55"/>`;
    if (which === "front") {
        for (let k = -3; k <= 3; k++) {
            const x = k * R * 0.24;
            svg += `<path d="M ${n(x - R * 0.08)} ${n(-R * 0.86 + Math.abs(k) * R * 0.05)} Q ${n(x)} ${n(-R * 0.92 + Math.abs(k) * R * 0.05)} ${n(x + R * 0.08)} ${n(-R * 0.86 + Math.abs(k) * R * 0.05)}" stroke="${A.hairHighlight}" stroke-width="${n(R * 0.06)}" stroke-linecap="round" fill="none" opacity="0.85"/>`;
        }
    }
    svg += "</g>";
    return svg;
}

// ------------------------------------------------------------
// Face
// ------------------------------------------------------------

function facePath(R, round) {
    if (round) {
        return `M ${n(-R * 1.0)} ${n(-R * 0.1)} C ${n(-R * 1.03)} ${n(R * 0.58)} ${n(-R * 0.6)} ${n(R * 0.96)} 0 ${n(R * 0.96)} C ${n(R * 0.6)} ${n(R * 0.96)} ${n(R * 1.03)} ${n(R * 0.58)} ${n(R * 1.0)} ${n(-R * 0.1)} C ${n(R * 1.0)} ${n(-R * 1.05)} ${n(-R * 1.0)} ${n(-R * 1.05)} ${n(-R * 1.0)} ${n(-R * 0.1)} Z`;
    }
    return `M ${n(-R * 0.95)} ${n(-R * 0.2)} C ${n(-R * 0.97)} ${n(R * 0.38)} ${n(-R * 0.55)} ${n(R * 0.84)} 0 ${n(R * 1.02)} C ${n(R * 0.55)} ${n(R * 0.84)} ${n(R * 0.97)} ${n(R * 0.38)} ${n(R * 0.95)} ${n(-R * 0.2)} C ${n(R * 0.95)} ${n(-R * 1.05)} ${n(-R * 0.95)} ${n(-R * 1.05)} ${n(-R * 0.95)} ${n(-R * 0.2)} Z`;
}

function drawEyes(ch, preset, state, uid, R, round) {
    const A = ch.anime;
    const line = A.line;
    const ex = R * (round ? 0.43 : 0.4);
    const ey = R * 0.16;
    const ew = R * 0.25 * ch.rig.eyeScale;
    const ehBase = R * 0.31 * ch.rig.eyeScale * Math.min(preset.eyeMul, 1.15);
    const look = state.look || preset.look || [0.25, 0];
    const blink = Math.max(0, Math.min(1, state.blink || 0));
    const expr = state.expression || "neutral";
    const t = state.t || 0;
    let irisMul = 1;
    if (expr === "shocked") irisMul = 0.42;
    if (expr === "scared") irisMul = 0.55;
    const jitter = expr === "scared" ? Math.sin(t * 47) * ew * 0.06 : 0;

    let svg = `<defs><linearGradient id="${uid}-iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${A.irisDark}"/><stop offset="0.55" stop-color="${A.iris}"/><stop offset="1" stop-color="${lightOf(A.iris, 0.45)}"/></linearGradient></defs>`;

    for (const side of [-1, 1]) {
        const cx = side * ex;
        if (preset.closedHappy) {
            svg += `<path d="M ${n(cx - ew)} ${n(ey + ehBase * 0.2)} Q ${n(cx)} ${n(ey - ehBase * 0.85)} ${n(cx + ew)} ${n(ey + ehBase * 0.2)}" fill="none" stroke="${line}" stroke-width="7" stroke-linecap="round"/>`;
            continue;
        }
        const open = preset.open * (1 - blink);
        if (open < 0.15) {
            svg += `<path d="M ${n(cx - ew)} ${n(ey)} Q ${n(cx)} ${n(ey + ehBase * 0.4)} ${n(cx + ew)} ${n(ey)}" fill="none" stroke="${line}" stroke-width="6" stroke-linecap="round"/>`;
            svg += `<path d="M ${n(cx + side * ew * 0.95)} ${n(ey + 2)} L ${n(cx + side * ew * 1.25)} ${n(ey - ehBase * 0.15)}" stroke="${line}" stroke-width="4" stroke-linecap="round"/>`;
            continue;
        }
        const ry = ehBase * open;
        const cy = ey + ehBase * (1 - open) * 0.5;
        const clip = `${uid}-eye${side}`;
        svg += `<defs><clipPath id="${clip}"><ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(ew)}" ry="${n(ry)}"/></clipPath></defs>`;
        svg += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(ew)}" ry="${n(ry)}" fill="#FFFFFF"/>`;
        svg += `<g clip-path="url(#${clip})">`;
        // upper-lid shadow inside the eye white
        svg += `<ellipse cx="${n(cx)}" cy="${n(cy - ry * 0.9)}" rx="${n(ew * 1.1)}" ry="${n(ry * 0.45)}" fill="${shadowOf("#FFFFFF", 0.25)}"/>`;
        const ix = cx + look[0] * ew * 0.32 + jitter;
        const iy = cy + look[1] * ehBase * 0.22 + ehBase * 0.06;
        const irx = ew * 0.74 * irisMul;
        const iry = ehBase * 0.86 * irisMul;
        svg += `<ellipse cx="${n(ix)}" cy="${n(iy)}" rx="${n(irx)}" ry="${n(iry)}" fill="url(#${uid}-iris)" stroke="${A.irisDark}" stroke-width="3"/>`;
        if (irisMul > 0.6) {
            svg += `<ellipse cx="${n(ix)}" cy="${n(iy + iry * 0.48)}" rx="${n(irx * 0.62)}" ry="${n(iry * 0.3)}" fill="${lightOf(A.iris, 0.55)}" opacity="0.6"/>`;
            svg += `<ellipse cx="${n(ix)}" cy="${n(iy - iry * 0.05)}" rx="${n(irx * 0.42)}" ry="${n(iry * 0.5)}" fill="#120C1A"/>`;
        }
        // shine
        svg += `<ellipse cx="${n(ix - irx * 0.36)}" cy="${n(iy - iry * 0.42)}" rx="${n(Math.max(3, irx * 0.36))}" ry="${n(Math.max(3, iry * 0.26))}" fill="#FFFFFF"/>`;
        svg += `<circle cx="${n(ix + irx * 0.38)}" cy="${n(iy + iry * 0.36)}" r="${n(Math.max(2, irx * 0.16))}" fill="#FFFFFF" opacity="0.9"/>`;
        svg += "</g>";

        // lids + lashes
        if (preset.lidLine) {
            svg += `<path d="M ${n(cx - ew * 1.08)} ${n(cy - ry * (side === -1 ? 1.1 : 0.7))} L ${n(cx + ew * 1.08)} ${n(cy - ry * (side === -1 ? 0.7 : 1.1))}" stroke="${line}" stroke-width="8" stroke-linecap="round"/>`;
        } else {
            svg += `<path d="M ${n(cx - ew * 1.06)} ${n(cy + ry * 0.12)} C ${n(cx - ew * 0.9)} ${n(cy - ry * 1.32)} ${n(cx + ew * 0.9)} ${n(cy - ry * 1.32)} ${n(cx + ew * 1.06)} ${n(cy + ry * 0.12)}" fill="none" stroke="${line}" stroke-width="7" stroke-linecap="round"/>`;
            svg += `<path d="M ${n(cx + side * ew * 0.8)} ${n(cy - ry * 0.72)} Q ${n(cx + side * ew * 1.25)} ${n(cy - ry * 0.85)} ${n(cx + side * ew * 1.42)} ${n(cy - ry * 0.4)}" fill="none" stroke="${line}" stroke-width="5" stroke-linecap="round"/>`;
        }
        svg += `<path d="M ${n(cx - ew * 0.45)} ${n(cy + ry * 1.0)} Q ${n(cx)} ${n(cy + ry * 1.1)} ${n(cx + ew * 0.5)} ${n(cy + ry * 0.96)}" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
    }

    // Brows (thin, tapered, hair-coloured)
    for (const side of [-1, 1]) {
        const b = side === -1 ? preset.brows.l : preset.brows.r;
        const bx = side * ex;
        const by = ey - ehBase * 1.35 + b.dy * 0.85;
        const angle = side === -1 ? b.a : -b.a;
        svg += `<path d="M ${n(bx - ew * 0.95)} ${n(by + 3)} Q ${n(bx)} ${n(by - 7)} ${n(bx + ew * 0.95)} ${n(by + 1)}" transform="rotate(${angle} ${n(bx)} ${n(by)})" fill="none" stroke="${mix(A.hair, A.line, 0.4)}" stroke-width="6" stroke-linecap="round"/>`;
    }
    return { svg, ex, ey, ew, eh: ehBase };
}

function drawMouth(ch, preset, state, R, round) {
    const line = ch.anime.line;
    const my = R * (round ? 0.6 : 0.62);
    const dark = "#5A1428";
    const tongue = "#E86A86";
    const v = state.mouth || "X";
    let inner = "";
    if (v === "X") {
        switch (preset.mouth) {
            case "smile":
                inner = `<path d="M ${n(-R * 0.17)} ${n(-R * 0.03)} Q 0 ${n(R * 0.13)} ${n(R * 0.17)} ${n(-R * 0.03)}" fill="none" stroke="${line}" stroke-width="4.5" stroke-linecap="round"/>`;
                break;
            case "oSmall":
                inner = `<ellipse cx="${n(R * 0.03)}" cy="0" rx="${n(R * 0.045)}" ry="${n(R * 0.055)}" fill="${dark}" stroke="${line}" stroke-width="3"/>`;
                break;
            case "O":
                inner = `<ellipse cx="0" cy="${n(R * 0.04)}" rx="${n(R * 0.09)}" ry="${n(R * 0.14)}" fill="${dark}" stroke="${line}" stroke-width="3.5"/><ellipse cx="0" cy="${n(R * 0.12)}" rx="${n(R * 0.055)}" ry="${n(R * 0.04)}" fill="${tongue}"/>`;
                break;
            case "grimace":
                inner = `<path d="M ${n(-R * 0.2)} 0 q ${n(R * 0.05)} ${n(-R * 0.06)} ${n(R * 0.1)} 0 t ${n(R * 0.1)} 0 t ${n(R * 0.1)} 0 t ${n(R * 0.1)} 0" fill="none" stroke="${line}" stroke-width="4" stroke-linecap="round"/>`;
                break;
            case "laughOpen":
                inner = `<path d="M ${n(-R * 0.21)} ${n(-R * 0.04)} L ${n(R * 0.21)} ${n(-R * 0.04)} Q ${n(R * 0.19)} ${n(R * 0.27)} 0 ${n(R * 0.28)} Q ${n(-R * 0.19)} ${n(R * 0.27)} ${n(-R * 0.21)} ${n(-R * 0.04)} Z" fill="${dark}" stroke="${line}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="0" cy="${n(R * 0.19)}" rx="${n(R * 0.11)}" ry="${n(R * 0.06)}" fill="${tongue}"/><rect x="${n(-R * 0.15)}" y="${n(-R * 0.03)}" width="${n(R * 0.3)}" height="${n(R * 0.045)}" rx="3" fill="#FFFFFF"/>`;
                break;
            case "smirk":
                inner = `<path d="M ${n(-R * 0.11)} ${n(R * 0.02)} Q ${n(R * 0.04)} ${n(R * 0.04)} ${n(R * 0.14)} ${n(-R * 0.05)}" fill="none" stroke="${line}" stroke-width="4.5" stroke-linecap="round"/>`;
                break;
            default:
                inner = `<path d="M ${n(-R * 0.1)} 0 Q 0 ${n(R * 0.05)} ${n(R * 0.1)} ${n(-R * 0.01)}" fill="none" stroke="${line}" stroke-width="4" stroke-linecap="round"/>`;
        }
    } else {
        const W = { A: 0.12, B: 0.16, C: 0.2, O: 0.1 };
        const H = { A: 0.05, B: 0.1, C: 0.15, O: 0.13 };
        let w = R * (W[v] || 0.12);
        let h = R * (H[v] || 0.05);
        if (preset.mouth === "laughOpen") {
            w *= 1.45;
            h *= 1.3;
        }
        if (preset.mouth === "O") {
            w *= 0.85;
            h *= 1.25;
        }
        inner = `<path d="M ${n(-w / 2)} 0 Q 0 ${n(-h * 0.2)} ${n(w / 2)} 0 Q ${n(w * 0.32)} ${n(h * 1.1)} 0 ${n(h * 1.1)} Q ${n(-w * 0.32)} ${n(h * 1.1)} ${n(-w / 2)} 0 Z" fill="${dark}" stroke="${line}" stroke-width="3.5" stroke-linejoin="round"/>`;
        if (h > R * 0.08) {
            inner += `<ellipse cx="0" cy="${n(h * 0.82)}" rx="${n(w * 0.26)}" ry="${n(h * 0.2)}" fill="${tongue}"/>`;
        }
    }
    return `<g transform="translate(0 ${n(my)})">${inner}</g>`;
}

// ------------------------------------------------------------
// Emotion symbols
// ------------------------------------------------------------

function angerVein(x, y, s) {
    let svg = `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">`;
    for (const rot of [0, 90, 180, 270]) {
        svg += `<path d="M 6 -20 Q 6 -6 20 -6" transform="rotate(${rot})" fill="none" stroke="#E02F45" stroke-width="7" stroke-linecap="round"/>`;
    }
    return `${svg}</g>`;
}

function sweatDrop(x, y, s, line) {
    return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})"><path d="M 0 -40 C 18 -12 26 6 26 18 C 26 34 14 44 0 44 C -14 44 -26 34 -26 18 C -26 6 -18 -12 0 -40 Z" fill="#9FDCFF" stroke="${line}" stroke-width="4"/><path d="M -12 16 Q -12 4 -4 -4" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
}

function sparkle(x, y, s) {
    return `<path d="M ${n(x)} ${n(y - 20 * s)} Q ${n(x + 3 * s)} ${n(y - 3 * s)} ${n(x + 20 * s)} ${n(y)} Q ${n(x + 3 * s)} ${n(y + 3 * s)} ${n(x)} ${n(y + 20 * s)} Q ${n(x - 3 * s)} ${n(y + 3 * s)} ${n(x - 20 * s)} ${n(y)} Q ${n(x - 3 * s)} ${n(y - 3 * s)} ${n(x)} ${n(y - 20 * s)} Z" fill="#FFF6C8" stroke="#E0A800" stroke-width="2"/>`;
}

function symbolsFor(expression, ch, R, t, faceClip) {
    const line = ch.anime.line;
    let svg = "";
    if (expression === "scared") {
        let gloom = "";
        for (let k = -4; k <= 4; k++) {
            const x = k * R * 0.14;
            gloom += `<path d="M ${n(x)} ${n(-R * 0.62)} L ${n(x)} ${n(-R * 0.12 - Math.abs(k) * R * 0.03)}" stroke="#4F5FD0" stroke-width="4" opacity="0.6"/>`;
        }
        svg += `<g clip-path="url(#${faceClip})"><rect x="${n(-R * 1.1)}" y="${n(-R * 1.1)}" width="${n(R * 2.2)}" height="${n(R * 0.95)}" fill="#3E4BC0" opacity="0.25"/>${gloom}</g>`;
        svg += sweatDrop(
            R * 0.98,
            -R * 0.35 + Math.sin(t * 6) * 3,
            R * 0.009 * 1.3,
            line,
        );
    }
    if (expression === "shocked") {
        for (const [i, a] of [-70, -45, -20].entries()) {
            const rad = (a * Math.PI) / 180;
            const r0 = R * 1.25;
            const r1 = R * (1.55 + (i % 2) * 0.1);
            svg += `<path d="M ${n(Math.cos(rad) * r0)} ${n(Math.sin(rad) * r0)} L ${n(Math.cos(rad) * r1)} ${n(Math.sin(rad) * r1)}" stroke="${line}" stroke-width="6" stroke-linecap="round"/>`;
        }
    }
    if (expression === "suspicious") {
        const pulse = 1 + Math.sin(t * 9) * 0.08;
        svg += angerVein(R * 0.7, -R * 0.8, (R / 110) * pulse);
    }
    if (expression === "laughing" || expression === "happy") {
        for (const side of [-1, 1]) {
            for (let k = 0; k < 3; k++) {
                const x = side * R * 0.55 + (k - 1) * R * 0.08;
                svg += `<path d="M ${n(x - R * 0.03)} ${n(R * 0.42)} L ${n(x + R * 0.03)} ${n(R * 0.32)}" stroke="#E2475F" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
            }
        }
        if (expression === "laughing") {
            svg += sparkle(
                -R * 1.15,
                -R * 0.75,
                (R / 110) * (0.9 + Math.sin(t * 8) * 0.2),
            );
            svg += sparkle(
                R * 1.2,
                -R * 0.4,
                (R / 110) * (0.7 + Math.cos(t * 7) * 0.2),
            );
        }
    }
    return svg;
}

// ------------------------------------------------------------
// Body
// ------------------------------------------------------------

function drawLegs(ch, a) {
    const { rig, palette } = ch;
    const line = ch.anime.line;
    if (rig.saree) {
        const top = rig.torsoBottomW / 2;
        const bottom = top + 22;
        const y0 = a.hipY - 10;
        return (
            `<path d="M ${-top} ${y0} L ${top} ${y0} L ${bottom} -14 L ${-bottom} -14 Z" fill="${palette.pants}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round"/>` +
            `<path d="M ${n(top * 0.2)} ${y0} L ${top} ${y0} L ${bottom} -14 L ${n(bottom * 0.35)} -14 Z" fill="${shadowOf(palette.pants)}" opacity="0.6"/>` +
            `<rect x="${-bottom}" y="-36" width="${bottom * 2}" height="22" fill="${palette.accent}" stroke="${line}" stroke-width="3"/>`
        );
    }
    const slim = rig.torsoBottomW < 200;
    const lx = rig.torsoBottomW * (slim ? 0.17 : 0.2);
    const lw = slim ? 40 : Math.max(46, rig.torsoBottomW * 0.24);
    let svg = "";
    for (const side of [-1, 1]) {
        const x = side * lx - lw / 2;
        svg += `<rect x="${n(x)}" y="${n(a.hipY - 12)}" width="${n(lw)}" height="${n(-a.hipY)}" rx="12" fill="${palette.pants}" stroke="${line}" stroke-width="${LINE_W}"/>`;
        svg += `<rect x="${n(x + lw * 0.55)}" y="${n(a.hipY - 10)}" width="${n(lw * 0.4)}" height="${n(-a.hipY - 6)}" rx="8" fill="${shadowOf(palette.pants)}" opacity="0.7"/>`;
    }
    for (const side of [-1, 1]) {
        const cx = side * lx + 10;
        svg += `<path d="M ${n(cx - lw * 0.8)} -2 Q ${n(cx - lw * 0.8)} -30 ${n(cx)} -30 Q ${n(cx + lw * 0.9)} -30 ${n(cx + lw * 0.9)} -2 Z" fill="${palette.shoes}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round"/>`;
        svg += `<path d="M ${n(cx - lw * 0.4)} -22 Q ${n(cx)} -27 ${n(cx + lw * 0.3)} -22" stroke="${lightOf(palette.shoes, 0.5)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    }
    return svg;
}

function torsoPath(ch, a) {
    const { rig } = ch;
    const tw = rig.torsoTopW / 2;
    const bw = rig.torsoBottomW / 2;
    const sy = a.shoulderY;
    const coat = ch.anime.coatLength > 0;
    const hy = coat ? a.hipY + rig.legH * ch.anime.coatLength : a.hipY;
    const flare = coat ? 26 : 0;
    const bulge = bw - tw > 40 ? 28 : 6;
    const midY = (sy + hy) / 2;
    return {
        d:
            `M ${-tw + 24} ${sy} L ${tw - 24} ${sy} Q ${tw + 4} ${sy} ${tw + 6} ${sy + 28} ` +
            `C ${bw + bulge} ${n(midY - 20)} ${bw + bulge} ${n(midY + 30)} ${bw + flare} ${n(hy - 6)} ` +
            `L ${-bw - flare} ${n(hy - 6)} ` +
            `C ${-bw - bulge} ${n(midY + 30)} ${-bw - bulge} ${n(midY - 20)} ${-tw - 6} ${sy + 28} ` +
            `Q ${-tw - 4} ${sy} ${-tw + 24} ${sy} Z`,
        tw,
        bw,
        sy,
        hy,
        coat,
    };
}

function drawScarfTail(ch, a, t) {
    if (!ch.rig.scarf) return "";
    const { palette } = ch;
    const line = ch.anime.line;
    const tw = ch.rig.torsoTopW / 2;
    const y0 = a.shoulderY + ch.rig.headR * 0.18;
    const x0 = -tw * 0.5;
    const pts = [];
    const L = ch.rig.prop === "magnifier" ? 150 : 95;
    for (let k = 0; k <= 6; k++) {
        const f = k / 6;
        pts.push([
            x0 - f * L,
            y0 + 10 + f * f * 120 + Math.sin(t * 4.2 - k * 0.9) * 12 * f,
        ]);
    }
    const width = (k) => 44 * (1 - (k / 6) * 0.4);
    const top = pts
        .map((p, k) => `${k ? "L" : "M"} ${n(p[0] + width(k) / 2)} ${n(p[1])}`)
        .join(" ");
    const bottom = [...pts]
        .map((p, k) => [p, k])
        .reverse()
        .map(([p, k]) => `L ${n(p[0] - width(k) / 2)} ${n(p[1])}`)
        .join(" ");
    const end = pts.at(-1);
    return `<path d="${top} L ${n(end[0])} ${n(end[1] + 16)} ${bottom} Z" fill="${shadowOf(palette.accent, 0.2)}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round"/>`;
}

function drawTorso(ch, a, uid, breathe) {
    const { palette, rig } = ch;
    const A = ch.anime;
    const line = A.line;
    const T = torsoPath(ch, a);
    const clip = `${uid}-torso`;
    let svg = `<defs><clipPath id="${clip}"><path d="${T.d}"/></clipPath></defs>`;
    svg += `<g transform="translate(0 ${T.hy}) scale(1 ${n(1 + breathe)}) translate(0 ${-T.hy})">`;
    svg += `<path d="${T.d}" fill="${palette.outfit}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round"/>`;
    svg += `<g clip-path="url(#${clip})">`;
    if (T.coat) {
        // open coat showing shirt
        svg += `<path d="M ${-T.tw * 0.32} ${T.sy} L ${T.tw * 0.32} ${T.sy} L ${n(T.bw * 0.1)} ${n(a.hipY)} L ${n(-T.bw * 0.1)} ${n(a.hipY)} Z" fill="${A.innerShirt}" stroke="${line}" stroke-width="3"/>`;
        svg += `<path d="M ${-T.tw * 0.32} ${T.sy} L ${n(-T.tw * 0.62)} ${T.sy + 70} L ${n(-T.tw * 0.2)} ${T.sy + 110} Z" fill="${lightOf(palette.outfit, 0.12)}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>`;
        svg += `<path d="M ${T.tw * 0.32} ${T.sy} L ${n(T.tw * 0.62)} ${T.sy + 70} L ${n(T.tw * 0.2)} ${T.sy + 110} Z" fill="${shadowOf(palette.outfit, 0.15)}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>`;
        svg += `<path d="M ${n(-T.bw * 0.1)} ${n(a.hipY)} L ${n(-T.bw * 0.16)} ${n(T.hy)} M ${n(T.bw * 0.1)} ${n(a.hipY)} L ${n(T.bw * 0.16)} ${n(T.hy)}" stroke="${line}" stroke-width="3"/>`;
        svg += `<rect x="${n(-T.bw - 30)}" y="${n(a.hipY - 30)}" width="${n(T.bw * 2 + 60)}" height="16" fill="${shadowOf(palette.outfit, 0.3)}"/>`;
    } else if (!rig.saree) {
        svg += `<path d="M 0 ${T.sy + 6} L 0 ${T.sy + 86}" stroke="${line}" stroke-width="3"/>`;
        for (const k of [0, 1, 2]) {
            svg += `<circle cx="0" cy="${n(T.sy + 28 + k * 22)}" r="5" fill="${A.innerShirt}" stroke="${line}" stroke-width="2.5"/>`;
        }
        svg += `<path d="M ${n(-T.bw + 8)} ${n(T.hy - 26)} Q 0 ${n(T.hy - 8)} ${n(T.bw - 8)} ${n(T.hy - 26)}" fill="none" stroke="${line}" stroke-width="3" opacity="0.6"/>`;
    } else {
        svg += `<path d="M ${-T.tw + 10} ${T.sy + 4} L ${-T.tw + 56} ${T.sy + 4} L ${T.bw - 6} ${T.hy - 4} L ${T.bw - 52} ${T.hy - 4} Z" fill="${palette.accent}" stroke="${line}" stroke-width="3"/>`;
    }
    // cel shadow (light from upper-left) + rim highlight
    svg += `<path d="M ${n(T.tw * 0.25)} ${T.sy - 10} L ${n(T.bw + 60)} ${T.sy - 10} L ${n(T.bw + 60)} ${n(T.hy + 10)} L ${n(T.bw * 0.05)} ${n(T.hy + 10)} Z" fill="${shadowOf(palette.outfit, 0.5)}" opacity="0.45"/>`;
    svg += `<path d="M ${n(-T.tw + 6)} ${T.sy + 30} Q ${n(-T.bw - 4)} ${n((T.sy + T.hy) / 2)} ${n(-T.bw - 2)} ${n(T.hy - 20)}" stroke="${lightOf(palette.outfit, 0.45)}" stroke-width="6" fill="none" opacity="0.7"/>`;
    svg += "</g>";

    if (rig.scarf) {
        const w = T.tw * 1.3;
        const y0 = T.sy + rig.headR * 0.1;
        svg += `<rect x="${n(-w / 2)}" y="${n(y0)}" width="${n(w)}" height="32" rx="15" fill="${palette.accent}" stroke="${line}" stroke-width="${LINE_W}"/>`;
        svg += `<rect x="${n(w * 0.05)}" y="${n(y0 + 4)}" width="${n(w * 0.42)}" height="24" rx="11" fill="${shadowOf(palette.accent, 0.3)}" opacity="0.6"/>`;
        if (rig.prop !== "magnifier") {
            for (let k = -3; k <= 3; k++) {
                svg += `<path d="M ${n(k * (w / 8))} ${n(y0 + 5)} L ${n(k * (w / 8))} ${n(y0 + 27)}" stroke="#FFFFFF" stroke-width="3.5" opacity="0.6"/>`;
            }
        }
    }
    svg += "</g>";
    return svg;
}

function drawArm(ch, points, pose, side) {
    const { palette, rig } = ch;
    const line = ch.anime.line;
    const w = rig.torsoBottomW > 200 ? 34 : 28;
    const [s, e, h] = points;
    const d = limbPath(s, e, h);
    let svg = `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + LINE_W * 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<path d="${d}" fill="none" stroke="${shadowOf(palette.outfit, 0.45)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<path d="${d}" transform="translate(-3 -3)" fill="none" stroke="${palette.outfit}" stroke-width="${w * 0.62}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (pose === "point" && side === 1 && rig.prop === "magnifier") {
        const gx = h[0] + 40;
        const gy = h[1] - 40;
        svg += `<path d="M ${n(h[0])} ${n(h[1])} L ${n(gx - 20)} ${n(gy + 20)}" stroke="${line}" stroke-width="18" stroke-linecap="round"/><path d="M ${n(h[0])} ${n(h[1])} L ${n(gx - 20)} ${n(gy + 20)}" stroke="#8B5A2B" stroke-width="9" stroke-linecap="round"/>`;
        svg += `<circle cx="${n(gx)}" cy="${n(gy)}" r="36" fill="#C9F1FF" fill-opacity="0.55" stroke="${line}" stroke-width="9"/><circle cx="${n(gx)}" cy="${n(gy)}" r="36" fill="none" stroke="#E2B04A" stroke-width="5"/>`;
        svg += `<path d="M ${n(gx - 20)} ${n(gy - 6)} L ${n(gx - 4)} ${n(gy - 22)} M ${n(gx - 12)} ${n(gy + 8)} L ${n(gx + 10)} ${n(gy - 14)}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>`;
    } else if (pose === "point" && side === 1) {
        svg += `<path d="M ${n(h[0])} ${n(h[1])} L ${n(h[0] + 28)} ${n(h[1] - 20)}" stroke="${line}" stroke-width="16" stroke-linecap="round"/><path d="M ${n(h[0])} ${n(h[1])} L ${n(h[0] + 28)} ${n(h[1] - 20)}" stroke="${palette.skin}" stroke-width="8" stroke-linecap="round"/>`;
    }
    svg += `<circle cx="${n(h[0])}" cy="${n(h[1])}" r="20" fill="${palette.skin}" stroke="${line}" stroke-width="${LINE_W}"/>`;
    svg += `<circle cx="${n(h[0] + 6)}" cy="${n(h[1] + 6)}" r="11" fill="${shadowOf(palette.skin, 0.3)}" opacity="0.55"/>`;
    return svg;
}

// ------------------------------------------------------------
// Public
// ------------------------------------------------------------

/**
 * @param {object} ch - character from CHARACTERS (needs .anime block)
 * @param {object} state - same as rig.renderCharacter state, plus optional uid, glint (0..1)
 */
export function renderAnimeCharacter(ch, state = {}) {
    const {
        x = 0,
        y = 0,
        scale = 1,
        flip = false,
        expression = "neutral",
        pose = "idle",
        t = 0,
        talking = false,
    } = state;
    const uid = state.uid || ch.id;
    const preset = getExpressionPreset(expression);
    const a = anchors(ch.rig);
    const A = ch.anime;
    const R = ch.rig.headR * 1.08;
    const round = ch.rig.torsoBottomW > 200;
    const seed = ch.id.length * 1.3;

    let bobY = Math.sin(t * 2.1 + seed) * 2.5;
    let jitterX = 0;
    if (talking) bobY -= Math.abs(Math.sin(t * 7 + seed)) * 5;
    if (preset.tremble) jitterX = Math.sin(t * 61 + seed) * 3.5;
    if (preset.bounce) bobY -= Math.abs(Math.sin(t * 11 + seed)) * 12;
    if (expression === "shocked") bobY -= 14;
    const breathe = Math.sin(t * 2.1 + seed) * 0.012;
    const tilt = preset.tilt + Math.sin(t * 1.3 + seed) * 1.2;
    const headCY = a.headCY - (R - ch.rig.headR) * 0.6;

    const hair = hairShapes(A.hairStyle, R, t, seed);
    const faceD = facePath(R, round);
    const faceClip = `${uid}-face`;

    // Head
    let head = `<defs><clipPath id="${faceClip}"><path d="${faceD}"/></clipPath></defs>`;
    head += drawHair(hair, "back", ch, uid, R);
    for (const side of [-1, 1]) {
        head += `<ellipse cx="${n(side * R * 0.97)}" cy="${n(R * 0.12)}" rx="${n(R * 0.14)}" ry="${n(R * 0.2)}" fill="${ch.palette.skin}" stroke="${A.line}" stroke-width="${LINE_W}"/>`;
    }
    head += `<path d="${faceD}" fill="${ch.palette.skin}" stroke="${A.line}" stroke-width="${LINE_W}"/>`;
    head += `<g clip-path="url(#${faceClip})">`;
    // bang shadow band + side shadow
    const band = hair.tips.length
        ? `M ${n(-R * 1.1)} ${n(hair.hairline)} ${hair.tips.map(([tx, ty]) => `L ${n(tx + R * 0.05)} ${n(ty + R * 0.12)}`).join(" ")} L ${n(R * 1.1)} ${n(hair.hairline)} Z`
        : `M ${n(-R * 1.1)} ${n(-R * 0.6)} L ${n(R * 1.1)} ${n(-R * 0.6)} L ${n(R * 1.1)} ${n(-R * 0.35)} L ${n(-R * 1.1)} ${n(-R * 0.35)} Z`;
    head += `<path d="${band}" fill="${shadowOf(ch.palette.skin, 0.35)}" opacity="0.75"/>`;
    head += `<ellipse cx="${n(R * 1.05)}" cy="${n(R * 0.2)}" rx="${n(R * 0.38)}" ry="${n(R * 1.1)}" fill="${shadowOf(ch.palette.skin, 0.35)}" opacity="0.6"/>`;
    head += `<ellipse cx="0" cy="${n(R * 1.1)}" rx="${n(R * 0.8)}" ry="${n(R * 0.18)}" fill="${shadowOf(ch.palette.skin, 0.4)}" opacity="0.5"/>`;
    head += "</g>";
    if (ch.rig.blush || ["laughing", "happy", "scared"].includes(expression)) {
        for (const side of [-1, 1]) {
            head += `<ellipse cx="${n(side * R * 0.56)}" cy="${n(R * 0.42)}" rx="${n(R * 0.17)}" ry="${n(R * 0.08)}" fill="#FF6F8A" opacity="0.35"/>`;
        }
    }
    const eyes = drawEyes(ch, preset, state, uid, R, round);
    head += eyes.svg;
    head += `<path d="M ${n(R * 0.02)} ${n(R * 0.36)} L ${n(-R * 0.03)} ${n(R * 0.44)} L ${n(R * 0.03)} ${n(R * 0.45)}" fill="none" stroke="${shadowOf(ch.palette.skin, 0.6)}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    head += drawMouth(ch, preset, state, R, round);
    head += drawHair(hair, "front", ch, uid, R);

    if (A.glasses) {
        const gr =
            Math.max(eyes.ew, eyes.eh) * (A.glasses === "small" ? 0.95 : 1.2);
        const gy = eyes.ey + (A.glasses === "small" ? eyes.eh * 0.3 : 0);
        const glint = Math.max(0, Math.min(1, state.glint || 0));
        for (const side of [-1, 1]) {
            const gx = side * eyes.ex;
            const clip = `${uid}-lens${side}`;
            head += `<defs><clipPath id="${clip}"><circle cx="${n(gx)}" cy="${n(gy)}" r="${n(gr)}"/></clipPath></defs>`;
            head += `<circle cx="${n(gx)}" cy="${n(gy)}" r="${n(gr)}" fill="#DDF4FF" fill-opacity="${n(0.12 + glint * 0.85)}" stroke="${A.line}" stroke-width="4"/>`;
            head += `<g clip-path="url(#${clip})"><path d="M ${n(gx - gr)} ${n(gy + gr * 0.2)} L ${n(gx + gr * 0.2)} ${n(gy - gr)} M ${n(gx - gr * 0.6)} ${n(gy + gr * 0.7)} L ${n(gx + gr * 0.7)} ${n(gy - gr * 0.6)}" stroke="#FFFFFF" stroke-width="${n(5 + glint * 8)}" opacity="${n(0.45 + glint * 0.5)}"/></g>`;
        }
        head += `<path d="M ${n(-eyes.ex + gr)} ${n(gy)} Q 0 ${n(gy - 10)} ${n(eyes.ex - gr)} ${n(gy)}" fill="none" stroke="${A.line}" stroke-width="4"/>`;
    }
    head += symbolsFor(expression, ch, R, t, faceClip);

    const frontArmOverHead = pose === "scared" || pose === "think";
    const backArm = drawArm(ch, armPoints(pose, -1, ch.rig, a), pose, -1);
    const frontArm = drawArm(ch, armPoints(pose, 1, ch.rig, a), pose, 1);

    const sx = (flip ? -1 : 1) * scale;
    let svg = `<g transform="translate(${n(x + jitterX)} ${n(y + bobY)}) scale(${n(sx * 1000) / 1000} ${scale})">`;
    svg += `<ellipse cx="0" cy="${n(-bobY / scale)}" rx="${n(ch.rig.torsoBottomW * 0.8)}" ry="20" fill="#0A0620" fill-opacity="0.38"/>`;
    svg += drawScarfTail(ch, a, t);
    svg += drawLegs(ch, a);
    // neck
    svg += `<rect x="-20" y="${n(a.shoulderY - 30)}" width="40" height="44" fill="${ch.palette.skin}" stroke="${A.line}" stroke-width="${LINE_W}"/><rect x="-20" y="${n(a.shoulderY - 30)}" width="40" height="22" fill="${shadowOf(ch.palette.skin, 0.4)}" opacity="0.7"/>`;
    if (!frontArmOverHead) svg += backArm;
    svg += drawTorso(ch, a, uid, breathe);
    if (!frontArmOverHead) svg += frontArm;
    svg += `<g transform="translate(0 ${n(headCY)}) rotate(${n(tilt)} 0 ${n(R * 0.85)})">${head}</g>`;
    if (frontArmOverHead) svg += backArm + frontArm;
    svg += "</g>";
    return svg;
}
