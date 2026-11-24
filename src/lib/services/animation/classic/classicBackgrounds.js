/**
 * Classic-style backgrounds: bright, flat, cheerful Indian neighbourhood
 * ("gali") in daylight, split into parallax layers. Pure → SVG.
 * Layers: { f, svg } where f is the parallax factor (0 = fixed, 1 = moves
 * with the characters, >1 = foreground).
 */
import { renderBackground, renderRevealBeam } from "../backgrounds.js";
import { createRandom } from "../random.js";
import { getSetting, renderSettingLayers } from "./settings.js";

const n = (v) => Math.round(v * 10) / 10;
const LINE = "#4B3F63";
const ln = (w = 3.5) =>
    `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const OUT = "#2A2233";

function cloud(x, y, s) {
    const puffs = [
        [-0.9, 0.1, 0.45],
        [-0.4, -0.25, 0.6],
        [0.25, -0.35, 0.68],
        [0.85, 0, 0.5],
        [0.2, 0.15, 0.55],
    ];
    let shade = "";
    let body = "";
    for (const [dx, dy, r] of puffs) {
        shade += `<circle cx="${n(x + dx * s)}" cy="${n(y + dy * s + s * 0.1)}" r="${n(r * s)}" fill="#CFE9FB"/>`;
        body += `<circle cx="${n(x + dx * s)}" cy="${n(y + dy * s)}" r="${n(r * s)}" fill="#FFFFFF"/>`;
    }
    return `${shade}${body}<rect x="${n(x - s * 1.3)}" y="${n(y + s * 0.25)}" width="${n(s * 2.6)}" height="${n(s * 0.5)}" fill="#BFE8FF"/>`;
}

function sky(layout, t) {
    const { width: W, height: H } = layout;
    const sun = [W * 0.86, H * 0.13];
    let rays = "";
    for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6 + t * 0.15;
        rays += `<path d="M ${n(sun[0] + Math.cos(a - 0.08) * H * 0.09)} ${n(sun[1] + Math.sin(a - 0.08) * H * 0.09)} L ${n(sun[0] + Math.cos(a) * H * 0.15)} ${n(sun[1] + Math.sin(a) * H * 0.15)} L ${n(sun[0] + Math.cos(a + 0.08) * H * 0.09)} ${n(sun[1] + Math.sin(a + 0.08) * H * 0.09)} Z" fill="#FFE98A"/>`;
    }
    return (
        `<defs><linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FB2F2"/><stop offset="0.75" stop-color="#9FDCFF"/><stop offset="1" stop-color="#CDEFFF"/></linearGradient></defs>` +
        `<rect x="${n(-W * 0.2)}" y="${n(-H * 0.2)}" width="${n(W * 1.4)}" height="${n(H * 1.4)}" fill="url(#cSky)"/>` +
        rays +
        `<circle cx="${n(sun[0])}" cy="${n(sun[1])}" r="${n(H * 0.075)}" fill="#FFD93B" stroke="#FFB627" stroke-width="5"/>`
    );
}

function kites(layout, t) {
    const { width: W, height: H } = layout;
    let s = "";
    const list = [
        [W * 0.2, H * 0.16, "#FF5C8A", "#FFD93B", 0],
        [W * 0.64, H * 0.1, "#46C46E", "#FFFFFF", 1.7],
    ];
    for (const [x0, y0, c1, c2, ph] of list) {
        const x = x0 + Math.sin(t * 0.9 + ph) * 14;
        const y = y0 + Math.cos(t * 1.3 + ph) * 8;
        const k = H * 0.032;
        const rot = Math.sin(t * 1.1 + ph) * 10;
        s += `<path d="M ${n(x)} ${n(y + k)} Q ${n(x + 60)} ${n(y + H * 0.2)} ${n(x + 140)} ${n(y + H * 0.45)}" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.8"/>`;
        s += `<g transform="rotate(${n(rot)} ${n(x)} ${n(y)})"><path d="M ${n(x)} ${n(y - k)} L ${n(x + k * 0.8)} ${n(y)} L ${n(x)} ${n(y + k)} L ${n(x - k * 0.8)} ${n(y)} Z" fill="${c1}" ${ln(2.5)}/><path d="M ${n(x)} ${n(y - k)} L ${n(x + k * 0.8)} ${n(y)} L ${n(x)} ${n(y)} Z" fill="${c2}"/><path d="M ${n(x)} ${n(y + k)} l -8 14 l 16 0 Z" fill="${c2}" ${ln(2)}/></g>`;
    }
    return s;
}

function clouds(layout, t) {
    const { width: W, height: H } = layout;
    let s = "";
    const base = [
        [0.12, 0.2, 0.06],
        [0.42, 0.09, 0.05],
        [0.66, 0.26, 0.065],
        [0.95, 0.15, 0.055],
    ];
    const span = W * 1.5;
    for (const [fx, fy, fs] of base) {
        const x = ((((fx * W + t * 9) % span) + span) % span) - W * 0.2;
        s += cloud(x, fy * H, fs * H);
    }
    return s;
}

function farRooftops(layout) {
    const { width: W, height: H } = layout;
    const rand = createRandom(4242);
    const base = H * 0.66;
    const colors = [
        "#F7CDB0",
        "#CDE8C4",
        "#F8E7A8",
        "#C7DDF5",
        "#EBC4D8",
        "#F5D9B8",
    ];
    let s = "";
    let x = -W * 0.25;
    while (x < W * 1.25) {
        const w = W * (0.07 + rand() * 0.06);
        const h = H * (0.12 + rand() * 0.14);
        const c = colors[Math.floor(rand() * colors.length)];
        s += `<rect x="${n(x)}" y="${n(base - h)}" width="${n(w)}" height="${n(h + H * 0.2)}" fill="${c}" ${ln(2.5)}/>`;
        for (let r = 0; r < 2; r++) {
            for (let k = 0; k < 2; k++) {
                s += `<rect x="${n(x + w * (0.2 + k * 0.4))}" y="${n(base - h + h * (0.2 + r * 0.38))}" width="${n(w * 0.2)}" height="${n(h * 0.18)}" fill="#8FB7D9" opacity="0.7"/>`;
            }
        }
        const roll = rand();
        if (roll < 0.45) {
            // black water tank
            const tx = x + w * 0.55;
            const tw = w * 0.28;
            s += `<rect x="${n(tx)}" y="${n(base - h - tw * 0.9)}" width="${n(tw)}" height="${n(tw * 0.9)}" rx="4" fill="#3A3A44" ${ln(2)}/><ellipse cx="${n(tx + tw / 2)}" cy="${n(base - h - tw * 0.9)}" rx="${n(tw / 2)}" ry="${n(tw * 0.14)}" fill="#55555F" ${ln(2)}/>`;
        } else if (roll < 0.7) {
            s += `<path d="M ${n(x + w * 0.3)} ${n(base - h)} L ${n(x + w * 0.3)} ${n(base - h - H * 0.06)} M ${n(x + w * 0.18)} ${n(base - h - H * 0.05)} L ${n(x + w * 0.42)} ${n(base - h - H * 0.05)} M ${n(x + w * 0.22)} ${n(base - h - H * 0.035)} L ${n(x + w * 0.38)} ${n(base - h - H * 0.035)}" ${ln(2.5)} fill="none"/>`;
        } else {
            const tr = H * (0.04 + rand() * 0.03);
            s += `<circle cx="${n(x + w * 0.9)}" cy="${n(base - h * 0.4)}" r="${n(tr)}" fill="#6CC46A"/><circle cx="${n(x + w * 0.9 + tr * 0.8)}" cy="${n(base - h * 0.4 + tr * 0.3)}" r="${n(tr * 0.8)}" fill="#5AB45A"/>`;
        }
        x += w + W * 0.005;
    }
    return s;
}

function house(x, base, w, h, c, trim, rand) {
    let s = `<rect x="${n(x)}" y="${n(base - h)}" width="${n(w)}" height="${n(h)}" fill="${c}" ${ln(4)}/>`;
    // roof parapet
    s += `<rect x="${n(x - 8)}" y="${n(base - h - 18)}" width="${n(w + 16)}" height="22" rx="4" fill="${trim}" ${ln(4)}/>`;
    // floor band
    const mid = base - h * 0.5;
    s += `<rect x="${n(x)}" y="${n(mid - 8)}" width="${n(w)}" height="14" fill="${trim}" ${ln(3)}/>`;
    // upper floor: balcony or windows
    if (rand() < 0.55) {
        const bx = x + w * 0.15;
        const bw = w * 0.7;
        s += `<rect x="${n(bx + bw * 0.25)}" y="${n(base - h * 0.88)}" width="${n(bw * 0.5)}" height="${n(h * 0.3)}" rx="10" fill="#6E4A8E" ${ln(3)}/>`;
        s += `<rect x="${n(bx)}" y="${n(mid - h * 0.16)}" width="${n(bw)}" height="${n(h * 0.14)}" fill="none" ${ln(4)}/>`;
        for (let i = 1; i < 9; i++) {
            s += `<path d="M ${n(bx + (bw * i) / 9)} ${n(mid - h * 0.16)} L ${n(bx + (bw * i) / 9)} ${n(mid - h * 0.02)}" ${ln(3)}/>`;
        }
        // potted plants
        for (const k of [0.12, 0.86]) {
            const px = bx + bw * k;
            s += `<path d="M ${n(px - 16)} ${n(mid - h * 0.16)} L ${n(px + 16)} ${n(mid - h * 0.16)} L ${n(px + 11)} ${n(mid - h * 0.16 + 24)} L ${n(px - 11)} ${n(mid - h * 0.16 + 24)} Z" fill="#D9774A" ${ln(3)}/><circle cx="${n(px)}" cy="${n(mid - h * 0.16 - 14)}" r="20" fill="#4DB35A" ${ln(3)}/><circle cx="${n(px + 6)}" cy="${n(mid - h * 0.16 - 26)}" r="5" fill="#FF5C8A"/>`;
        }
    } else {
        for (const k of [0.18, 0.58]) {
            const wx = x + w * k;
            const ww = w * 0.24;
            s += `<rect x="${n(wx)}" y="${n(base - h * 0.84)}" width="${n(ww)}" height="${n(h * 0.24)}" fill="#9AD3F5" ${ln(3)}/>`;
            s += `<rect x="${n(wx - ww * 0.28)}" y="${n(base - h * 0.84)}" width="${n(ww * 0.28)}" height="${n(h * 0.24)}" fill="#38A88A" ${ln(3)}/><rect x="${n(wx + ww)}" y="${n(base - h * 0.84)}" width="${n(ww * 0.28)}" height="${n(h * 0.24)}" fill="#38A88A" ${ln(3)}/>`;
        }
    }
    // ground floor: door + window
    const dw = w * 0.26;
    const dx = x + w * 0.14;
    s += `<path d="M ${n(dx)} ${n(base)} L ${n(dx)} ${n(base - h * 0.3)} Q ${n(dx + dw / 2)} ${n(base - h * 0.4)} ${n(dx + dw)} ${n(base - h * 0.3)} L ${n(dx + dw)} ${n(base)} Z" fill="#9A5B34" ${ln(4)}/>`;
    s += `<circle cx="${n(dx + dw * 0.8)}" cy="${n(base - h * 0.15)}" r="4" fill="#FFD93B"/>`;
    s += `<rect x="${n(dx - 10)}" y="${n(base - 8)}" width="${n(dw + 20)}" height="12" fill="#C9C2B4" ${ln(3)}/>`;
    const wx = x + w * 0.56;
    s += `<rect x="${n(wx)}" y="${n(base - h * 0.36)}" width="${n(w * 0.3)}" height="${n(h * 0.2)}" fill="#9AD3F5" ${ln(3)}/><path d="M ${n(wx + w * 0.15)} ${n(base - h * 0.36)} L ${n(wx + w * 0.15)} ${n(base - h * 0.16)}" ${ln(3)}/>`;
    // toran (festive bunting) over the door
    for (let i = 0; i < 5; i++) {
        const tx = dx - 6 + ((dw + 12) * i) / 4;
        s += `<path d="M ${n(tx - 7)} ${n(base - h * 0.42)} L ${n(tx + 7)} ${n(base - h * 0.42)} L ${n(tx)} ${n(base - h * 0.42 + 16)} Z" fill="${i % 2 ? "#FF8A24" : "#46C46E"}"/>`;
    }
    return s;
}

function galiRow(layout, t) {
    const { width: W, height: H } = layout;
    const rand = createRandom(777);
    const base = H * 0.76;
    const colors = [
        "#FF9EB0",
        "#FFD45E",
        "#7ED8C3",
        "#8EC5FF",
        "#FFB36B",
        "#C9A7FF",
    ];
    const trims = ["#FFFFFF", "#FFF1C9", "#F0F7FF"];
    let s = "";
    let x = -W * 0.32;
    let i = 0;
    const tops = [];
    while (x < W * 1.32) {
        const w = W * (0.17 + rand() * 0.05);
        const h = H * (0.5 + rand() * 0.12);
        s += house(
            x,
            base,
            w,
            h,
            colors[i % colors.length],
            trims[i % trims.length],
            rand,
        );
        tops.push([x, base - h, w]);
        x += w + W * 0.012;
        i++;
    }
    // neem tree between two houses
    const tx = W * 0.83;
    s += `<rect x="${n(tx - 16)}" y="${n(base - H * 0.3)}" width="32" height="${n(H * 0.3)}" fill="#8A5A3B" ${ln(4)}/>`;
    for (const [dx, dy, r, c] of [
        [-60, -0.36, 70, "#3FA34D"],
        [50, -0.38, 75, "#3FA34D"],
        [0, -0.46, 85, "#4DB35A"],
        [-20, -0.4, 50, "#62C46A"],
    ]) {
        s += `<circle cx="${n(tx + dx + Math.sin(t * 1.2 + dx) * 3)}" cy="${n(base + dy * H)}" r="${r}" fill="${c}" ${ln(4)}/>`;
    }
    // sagging electric cables + clothesline with laundry
    const cy = H * 0.24;
    s += `<path d="M ${n(-W * 0.3)} ${n(cy)} Q ${n(W * 0.2)} ${n(cy + 60)} ${n(W * 0.7)} ${n(cy + 8)} T ${n(W * 1.4)} ${n(cy + 20)}" fill="none" stroke="#2F2A3A" stroke-width="3"/>`;
    s += `<path d="M ${n(-W * 0.3)} ${n(cy + 22)} Q ${n(W * 0.25)} ${n(cy + 90)} ${n(W * 0.75)} ${n(cy + 30)} T ${n(W * 1.4)} ${n(cy + 40)}" fill="none" stroke="#2F2A3A" stroke-width="2.5"/>`;
    const lineY = base - H * 0.33;
    const lx0 = W * 0.36;
    const lx1 = W * 0.62;
    s += `<path d="M ${n(lx0)} ${n(lineY)} Q ${n((lx0 + lx1) / 2)} ${n(lineY + 26)} ${n(lx1)} ${n(lineY)}" fill="none" stroke="#FFFFFF" stroke-width="3"/>`;
    const cloth = ["#FF5C8A", "#3FB2F2", "#FFD93B", "#46C46E"];
    for (let k = 0; k < 4; k++) {
        const cx = lx0 + ((lx1 - lx0) * (k + 0.7)) / 4.4;
        const sag = Math.sin((Math.PI * (cx - lx0)) / (lx1 - lx0)) * 22;
        const sw = Math.sin(t * 2 + k) * 3;
        s += `<path d="M ${n(cx - 20)} ${n(lineY + sag)} L ${n(cx + 20)} ${n(lineY + sag)} L ${n(cx + 16 + sw)} ${n(lineY + sag + 44)} L ${n(cx - 16 + sw)} ${n(lineY + sag + 44)} Z" fill="${cloth[k]}" ${ln(3)}/>`;
    }
    return s;
}

function ground(layout, stage) {
    const { width: W, height: H } = layout;
    const top = H * 0.76;
    const t = stage.t || 0;
    let s = `<rect x="${n(-W * 0.4)}" y="${n(top)}" width="${n(W * 1.8)}" height="${n(H * 0.5)}" fill="#EBD9B0"/>`;
    s += `<rect x="${n(-W * 0.4)}" y="${n(top)}" width="${n(W * 1.8)}" height="${n(H * 0.025)}" fill="#C9BFAE" ${ln(3)}/>`;
    const rand = createRandom(99);
    for (let i = 0; i < 26; i++) {
        s += `<ellipse cx="${n(-W * 0.3 + rand() * W * 1.6)}" cy="${n(top + H * 0.05 + rand() * H * 0.2)}" rx="${n(6 + rand() * 10)}" ry="${n(3 + rand() * 4)}" fill="#D6C394"/>`;
    }
    // chalk hopscotch on the lane
    const hx = W * 0.38;
    const hy = H * 0.94;
    for (let k = 0; k < 3; k++) {
        s += `<rect x="${n(hx + k * 70)}" y="${n(hy - 18)}" width="62" height="36" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.75" transform="skewX(-25)"/>`;
    }
    // low planter wall in the middle, always behind the characters' feet
    // (Sheru is a stage actor now: he trots in, see staging.js)
    const px = layout.revealSpot.x;
    const py = layout.vertical ? layout.groundY - H * 0.045 : H * 0.83;
    s += `<rect x="${n(px - 120)}" y="${n(py - 30)}" width="240" height="70" rx="12" fill="#F28C5A" ${ln(5)}/>`;
    s += `<rect x="${n(px - 120)}" y="${n(py - 30)}" width="240" height="18" rx="8" fill="#FFB08A" ${ln(4)}/>`;
    for (const k of [-80, -20, 45, 95]) {
        s += `<circle cx="${n(px + k)}" cy="${n(py - 40)}" r="22" fill="#4DB35A" ${ln(3.5)}/><circle cx="${n(px + k + 6)}" cy="${n(py - 54)}" r="6" fill="${k % 2 ? "#FFD93B" : "#FF5C8A"}"/>`;
    }
    return s;
}

function foreground(layout, t) {
    const { width: W, height: H } = layout;
    let s = "";
    for (const [x, flip] of [
        [-W * 0.02, 1],
        [W * 1.02, -1],
    ]) {
        for (let i = 0; i < 5; i++) {
            const a = -60 + i * 30 + Math.sin(t * 1.5 + i) * 4;
            s += `<ellipse cx="${n(x + flip * 40)}" cy="${n(H * 1.02 - 60)}" rx="22" ry="90" fill="${i % 2 ? "#3FA34D" : "#4DB35A"}" stroke="${OUT}" stroke-width="5" transform="rotate(${n(flip * a)} ${n(x)} ${n(H * 1.02)})"/>`;
        }
    }
    return s;
}

/**
 * @returns {{back: Array<{f:number, svg:string}>, front: Array<{f:number, svg:string}>}}
 */
export function renderClassicLayers(id, layout, stage = {}) {
    const t = stage.t || 0;
    const setting = getSetting(id);
    if (setting) return renderSettingLayers(setting, layout, stage);
    if (id === "gali_day") {
        return {
            back: [
                { f: 0.03, svg: sky(layout, t) },
                { f: 0.08, svg: kites(layout, t) },
                { f: 0.12, svg: clouds(layout, t) },
                { f: 0.3, svg: farRooftops(layout) },
                { f: 0.65, svg: galiRow(layout, t) },
                { f: 1, svg: ground(layout, stage) },
            ],
            front: [{ f: 1.25, svg: foreground(layout, t) }],
        };
    }
    // other backgrounds: reuse the flat scene as a single layer
    let svg = renderBackground(id, layout, stage);
    if (id === "haveli_night") svg += renderRevealBeam(layout, stage.beam);
    return { back: [{ f: 1, svg }], front: [] };
}
