/**
 * Anime-style parallax backgrounds (pure → SVG layers, no I/O).
 * Each layer carries a parallax factor `f` (0 = fixed to screen, 1 = moves
 * with the characters, >1 = foreground). The renderer applies the camera
 * per layer so zooms / pans produce depth.
 */
import { haveli, haveliAnchors, renderRevealBeam } from "../backgrounds.js";
import { createRandom } from "../random.js";

const n = (v) => Math.round(v * 10) / 10;

function sky(layout, t) {
    const { width: W, height: H } = layout;
    const rand = createRandom(11);
    let svg = `<defs><linearGradient id="aSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060824"/><stop offset="0.45" stop-color="#1B1A58"/><stop offset="0.78" stop-color="#4E3684"/><stop offset="1" stop-color="#B0628E"/></linearGradient>`;
    svg += `<radialGradient id="aMoonHalo"><stop offset="0" stop-color="#FFF4D0" stop-opacity="0.75"/><stop offset="0.35" stop-color="#FFE7B0" stop-opacity="0.25"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/></radialGradient></defs>`;
    svg += `<rect x="${n(-W * 0.3)}" y="${n(-H * 0.3)}" width="${n(W * 1.6)}" height="${n(H * 1.6)}" fill="url(#aSky)"/>`;
    for (let i = 0; i < 110; i++) {
        const x = -W * 0.2 + rand() * W * 1.4;
        const y = -H * 0.2 + rand() * layout.horizonY;
        const r = 0.8 + rand() * 2.2;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + rand() * 2) + i));
        svg += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="#FFFBEA" fill-opacity="${n(tw)}"/>`;
        if (r > 2.6) {
            svg += `<path d="M ${n(x - r * 3)} ${n(y)} L ${n(x + r * 3)} ${n(y)} M ${n(x)} ${n(y - r * 3)} L ${n(x)} ${n(y + r * 3)}" stroke="#FFFBEA" stroke-width="1" opacity="${n(tw * 0.7)}"/>`;
        }
    }
    const m = layout.moon;
    const mr = m.r * 1.5;
    svg += `<circle cx="${n(m.x)}" cy="${n(m.y)}" r="${n(mr * 4)}" fill="url(#aMoonHalo)"/>`;
    svg += `<circle cx="${n(m.x)}" cy="${n(m.y)}" r="${n(mr)}" fill="#FFF6DA"/>`;
    svg += `<circle cx="${n(m.x + mr * 0.25)}" cy="${n(m.y + mr * 0.1)}" r="${n(mr * 0.85)}" fill="#F3E2B4" opacity="0.5"/>`;
    for (const [dx, dy, rr] of [
        [-0.3, -0.2, 0.18],
        [0.32, 0.3, 0.12],
        [0.1, -0.45, 0.08],
    ]) {
        svg += `<circle cx="${n(m.x + dx * mr)}" cy="${n(m.y + dy * mr)}" r="${n(rr * mr)}" fill="#E6D29C" opacity="0.6"/>`;
    }
    return svg;
}

function clouds(layout, t) {
    const { width: W, height: H } = layout;
    let svg = "";
    const specs = [
        [0.05, 0.12, 1.0, 8],
        [0.55, 0.08, 0.8, 5],
        [0.8, 0.22, 1.2, 6],
        [0.3, 0.3, 0.7, 4],
    ];
    for (const [i, [fx, fy, s, speed]] of specs.entries()) {
        const x = ((fx * W + t * speed + W * 0.3) % (W * 1.6)) - W * 0.3;
        const y = fy * H;
        const k = (s * W) / 1920;
        svg += `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k)})">`;
        svg += `<path d="M -160 30 Q -150 -20 -90 -12 Q -70 -60 -10 -46 Q 30 -80 80 -40 Q 150 -50 160 10 Q 170 40 120 44 L -130 44 Q -170 44 -160 30 Z" fill="#2C2668" opacity="0.92"/>`;
        svg += `<path d="M -150 20 Q -140 -16 -90 -8 Q -70 -52 -10 -40 Q 30 -72 80 -34 Q 140 -44 152 4" fill="none" stroke="#B9A6E8" stroke-width="5" opacity="${i % 2 ? 0.55 : 0.75}"/>`;
        svg += "</g>";
    }
    return svg;
}

function farVillage(layout) {
    const { width: W, height: H } = layout;
    const rand = createRandom(23);
    const hy = layout.horizonY;
    let svg = `<path d="M ${n(-W * 0.3)} ${n(hy - H * 0.04)} Q ${n(W * 0.15)} ${n(hy - H * 0.15)} ${n(W * 0.4)} ${n(hy - H * 0.06)} T ${n(W * 0.85)} ${n(hy - H * 0.1)} T ${n(W * 1.3)} ${n(hy - H * 0.05)} L ${n(W * 1.3)} ${n(H * 1.3)} L ${n(-W * 0.3)} ${n(H * 1.3)} Z" fill="#231C55"/>`;
    let x = -W * 0.25;
    while (x < W * 1.25) {
        const w = 40 + rand() * 70;
        const h = 30 + rand() * 80;
        const skip = x > W * 0.25 && x < W * 0.75;
        if (!skip) {
            svg += `<rect x="${n(x)}" y="${n(hy - h)}" width="${n(w)}" height="${n(h + 10)}" fill="#18123F"/>`;
            if (rand() > 0.45) {
                svg += `<rect x="${n(x + w * 0.3)}" y="${n(hy - h * 0.7)}" width="${n(w * 0.18)}" height="${n(h * 0.16)}" fill="#FFC86B" opacity="0.8"/>`;
            }
        }
        x += w + rand() * 30;
    }
    return svg;
}

function haveliLayer(layout, stage) {
    const A = haveliAnchors(layout);
    const { cx, w, h } = layout.haveli;
    let svg = `<defs><radialGradient id="aWin"><stop offset="0" stop-color="#FFD978" stop-opacity="0.85"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient>`;
    svg += `<linearGradient id="aMoonLight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#BFD2FF" stop-opacity="0.28"/><stop offset="0.5" stop-color="#BFD2FF" stop-opacity="0"/></linearGradient></defs>`;
    if ((stage.windowGlow || 0) > 0.05) {
        svg += `<circle cx="${n(A.window.x)}" cy="${n(A.window.y)}" r="${n(w * 0.34)}" fill="url(#aWin)" opacity="${n(stage.windowGlow)}"/>`;
    }
    svg += haveli(layout, stage);
    // moonlight wash from the left + ground haze
    svg += `<rect x="${n(cx - w / 2)}" y="${n(A.top - h * 0.2)}" width="${n(w)}" height="${n(A.base - A.top + h * 0.2)}" fill="url(#aMoonLight)"/>`;
    svg += renderRevealBeam(layout, stage.beam);
    return svg;
}

function ground(layout, t) {
    const { width: W, height: H } = layout;
    const hy = layout.horizonY;
    const gy = layout.groundY;
    const rand = createRandom(31);
    let svg = `<defs><linearGradient id="aGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3A52"/><stop offset="1" stop-color="#121A2A"/></linearGradient></defs>`;
    svg += `<path d="M ${n(-W * 0.3)} ${n(hy + 4)} L ${n(W * 1.3)} ${n(hy + 4)} L ${n(W * 1.3)} ${n(H * 1.3)} L ${n(-W * 0.3)} ${n(H * 1.3)} Z" fill="url(#aGround)"/>`;
    // path towards the haveli
    svg += `<path d="M ${n(W * 0.44)} ${n(hy + 6)} L ${n(W * 0.56)} ${n(hy + 6)} L ${n(W * 0.8)} ${n(H * 1.3)} L ${n(W * 0.2)} ${n(H * 1.3)} Z" fill="#3A4560" opacity="0.6"/>`;
    for (let i = 0; i < 26; i++) {
        const x = -W * 0.2 + rand() * W * 1.4;
        const y = hy + 20 + rand() * (gy - hy + H * 0.08);
        const s = 0.5 + (y - hy) / (gy - hy + 1);
        svg += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(16 * s)}" ry="${n(6 * s)}" fill="#4A5675" opacity="0.7"/>`;
    }
    for (let i = 0; i < 40; i++) {
        const x = -W * 0.2 + rand() * W * 1.4;
        const y = hy + 30 + rand() * (H - hy);
        const s = 0.6 + (y - hy) / (H - hy);
        const swayX = Math.sin(t * 1.8 + i) * 4 * s;
        svg += `<path d="M ${n(x - 8 * s)} ${n(y)} Q ${n(x - 6 * s + swayX)} ${n(y - 22 * s)} ${n(x - 2 * s + swayX * 1.4)} ${n(y - 30 * s)} M ${n(x)} ${n(y)} Q ${n(x + swayX)} ${n(y - 28 * s)} ${n(x + 6 * s + swayX * 1.4)} ${n(y - 36 * s)} M ${n(x + 8 * s)} ${n(y)} Q ${n(x + 8 * s + swayX)} ${n(y - 18 * s)} ${n(x + 14 * s + swayX)} ${n(y - 24 * s)}" stroke="#1E2B3E" stroke-width="${n(3 * s)}" fill="none" stroke-linecap="round"/>`;
    }
    return svg;
}

function foreground(layout, t) {
    const { width: W, height: H } = layout;
    const rand = createRandom(41);
    let svg = "";
    // dark leaves framing the bottom corners
    for (const side of [-1, 1]) {
        const bx = side === -1 ? -W * 0.06 : W * 1.06;
        for (let k = 0; k < 6; k++) {
            const a =
                (side === -1 ? -60 : -120) +
                (k - 2.5) * 16 * side +
                Math.sin(t * 1.4 + k) * 3;
            const len = H * (0.22 + (k % 3) * 0.05);
            svg += `<g transform="translate(${n(bx)} ${n(H * 1.04)}) rotate(${n(a)})"><path d="M 0 0 Q ${n(len * 0.5)} ${n(-len * 0.12)} ${n(len)} 0 Q ${n(len * 0.5)} ${n(len * 0.12)} 0 0 Z" fill="#070A16"/></g>`;
        }
    }
    // fireflies / bokeh
    for (let i = 0; i < 16; i++) {
        const x0 = rand() * W;
        const y0 = layout.horizonY + rand() * (H - layout.horizonY) * 0.8;
        const x = x0 + Math.sin(t * 0.7 + i * 1.3) * 40;
        const y = y0 + Math.cos(t * 0.9 + i) * 25;
        const glow = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.2 + i * 2.1));
        svg += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(10 + (i % 3) * 4)}" fill="#FFE98A" opacity="${n(glow * 0.18)}"/>`;
        svg += `<circle cx="${n(x)}" cy="${n(y)}" r="3" fill="#FFF6C2" opacity="${n(glow)}"/>`;
    }
    return svg;
}

function plainLayers(layout) {
    const { width: W, height: H } = layout;
    return [
        {
            f: 0,
            svg: `<defs><linearGradient id="aPlain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D2A6E"/><stop offset="1" stop-color="#B26A92"/></linearGradient></defs><rect x="${n(-W * 0.3)}" y="${n(-H * 0.3)}" width="${n(W * 1.6)}" height="${n(H * 1.6)}" fill="url(#aPlain)"/>`,
        },
    ];
}

/**
 * @returns {{ back: Array<{f:number, svg:string}>, front: Array<{f:number, svg:string}> }}
 */
export function renderAnimeLayers(id, layout, stage) {
    const t = stage.t || 0;
    if (id !== "haveli_night") return { back: plainLayers(layout), front: [] };
    return {
        back: [
            { f: 0.05, svg: sky(layout, t) },
            { f: 0.15, svg: clouds(layout, t) },
            { f: 0.3, svg: farVillage(layout) },
            { f: 0.6, svg: haveliLayer(layout, stage) },
            { f: 1, svg: ground(layout, t) },
        ],
        front: [{ f: 1.35, svg: foreground(layout, t) }],
    };
}
