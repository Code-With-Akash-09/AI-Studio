/**
 * Screen-space anime FX (pure → SVG): manga focus lines, speed lines,
 * impact-frame filter + burst, cinematic letterbox, colour grade.
 */
import { createRandom } from "../random.js";

const n = (v) => Math.round(v * 10) / 10;

/** Concentration lines converging on (cx, cy), re-drawn every other frame. */
export function focusLines(
    W,
    H,
    cx,
    cy,
    frameIndex,
    { color = "#0B0716", count = 90, clear = 0.32, opacity = 0.85 } = {},
) {
    const rand = createRandom(1000 + Math.floor(frameIndex / 2));
    const R = Math.hypot(W, H);
    const inner = Math.min(W, H) * clear;
    let d = "";
    for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2;
        const w = 0.004 + rand() * 0.012;
        const r0 = inner * (0.9 + rand() * 0.6);
        const p1 = [cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R];
        const p2 = [cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R];
        const p0 = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0];
        d += `M ${n(p1[0])} ${n(p1[1])} L ${n(p0[0])} ${n(p0[1])} L ${n(p2[0])} ${n(p2[1])} Z `;
    }
    return `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
}

/** Horizontal whip/speed streaks used on camera cuts. */
export function speedLines(W, H, frameIndex, amount = 1) {
    const rand = createRandom(2000 + frameIndex);
    let svg = "";
    for (let i = 0; i < 38; i++) {
        const y = rand() * H;
        const len = W * (0.2 + rand() * 0.6);
        const x = rand() * W - len / 2;
        const h = 2 + rand() * 6;
        svg += `<rect x="${n(x)}" y="${n(y)}" width="${n(len)}" height="${n(h)}" rx="${n(h / 2)}" fill="#FFFFFF" opacity="${n((0.25 + rand() * 0.45) * amount)}"/>`;
    }
    return svg;
}

export const impactFilter = (W, H) =>
    `<filter id="impactFrame" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="-0.3 -0.59 -0.11 0 1 -0.3 -0.59 -0.11 0 1 -0.3 -0.59 -0.11 0 1 0 0 0 1 0"/><feComponentTransfer><feFuncR type="discrete" tableValues="0.06 0.98"/><feFuncG type="discrete" tableValues="0.02 0.9"/><feFuncB type="discrete" tableValues="0.1 0.86"/></feComponentTransfer></filter>`;

export function impactBurst(W, H, cx, cy, frameIndex) {
    return focusLines(W, H, cx, cy, frameIndex, {
        color: "#000000",
        count: 140,
        clear: 0.18,
        opacity: 1,
    });
}

export function letterbox(W, H, amount) {
    if (amount <= 0.01) return "";
    const bar = H * 0.085 * amount;
    return `<rect x="0" y="0" width="${W}" height="${n(bar)}" fill="#000"/><rect x="0" y="${n(H - bar)}" width="${W}" height="${n(bar)}" fill="#000"/>`;
}

export function colorGrade(W, H) {
    return (
        `<defs><radialGradient id="aVig" cx="0.5" cy="0.45" r="0.8"><stop offset="0.55" stop-color="#0A0420" stop-opacity="0"/><stop offset="1" stop-color="#0A0420" stop-opacity="0.6"/></radialGradient>` +
        `<linearGradient id="aTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2A8A" stop-opacity="0.18"/><stop offset="0.5" stop-color="#3B2A8A" stop-opacity="0"/><stop offset="1" stop-color="#FF7AA8" stop-opacity="0.06"/></linearGradient></defs>` +
        `<rect width="${W}" height="${H}" fill="url(#aTop)"/><rect width="${W}" height="${H}" fill="url(#aVig)"/>`
    );
}
