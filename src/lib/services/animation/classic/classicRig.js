/**
 * "Classic" kids-TV rig: round chibi proportions (head ≈ half the height),
 * thick uniform dark outlines, flat bright colours, dot/oval eyes with a
 * shine, big open mouths, rosy cheeks, bouncy squash-and-stretch and classic
 * comedy reactions (jump-up shock, sweat drop, gloom lines, swirly dizzy
 * eyes, tear fountains, face-fault).
 *
 * Everything is drawn in code from the ORIGINAL cast's `classic` block in
 * characters.js — only the general art-direction genre is inspired by
 * classic Japanese kids' anime; no existing character design is imitated.
 *
 * Coordinates: feet at (0, 0), up is negative y, facing +x before flip.
 */

const n = (v) => Math.round(v * 10) / 10;
export const OUT = "#2A2233";
const LW = 7;
/** Classic characters are drawn a little larger on stage (they are short). */
export const CLASSIC_SCALE = 1.18;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function geometry(C) {
    const R = C.headR;
    const hipY = -C.legH;
    const bodyBottom = hipY + 10;
    const bodyTop = bodyBottom - C.bodyH;
    const headCY = bodyTop - R * 0.72;
    const shoulderX = C.bodyW * (C.body === "saree" ? 0.34 : 0.42);
    return {
        R,
        hipY,
        bodyBottom,
        bodyTop,
        headCY,
        shoulderX,
        shoulderY: bodyTop + 24,
    };
}

/** Head centre y (local, negative) — used by the timeline for camera targets. */
export function classicHeadCenterY(ch) {
    return geometry(ch.classic).headCY;
}

/** Outlined thick stroke (limbs, scarf tails, hair curls). */
function limb(d, color, width, outline = LW) {
    return (
        `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${n(width + outline * 2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
}

const stroke = (w = LW) =>
    `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ------------------------------------------------------------------ body

function drawLegs(C, g, pose, t) {
    let svg = "";
    const legW = C.body === "saree" ? 28 : 36;
    for (const side of [-1, 1]) {
        const hx = side * C.bodyW * 0.2;
        let end;
        if (pose === "facefault") {
            // after the -90° fall, local +x points up: legs stick up in the air
            const kick = Math.sin(t * 18 + side) * 10;
            end = [hx + C.bodyW * 0.5 + 95, g.hipY + side * 26 + kick];
        } else {
            end = [hx + side * 4, -16];
        }
        svg += limb(
            `M ${n(hx)} ${n(g.hipY - 8)} L ${n(end[0])} ${n(end[1])}`,
            C.pants,
            legW,
        );
        const shoeR = pose === "facefault" ? [20, 28] : [30, 18];
        svg += `<ellipse cx="${n(end[0] + (pose === "facefault" ? 8 : 8))}" cy="${n(end[1] + (pose === "facefault" ? 0 : 2))}" rx="${shoeR[0]}" ry="${shoeR[1]}" fill="${C.shoes}" ${stroke()}/>`;
    }
    return svg;
}

function roundedTrapezoid(tw, bw, top, bot, r) {
    return `M ${n(-tw)} ${n(top + r)} Q ${n(-tw)} ${n(top)} ${n(-tw + r)} ${n(top)} L ${n(tw - r)} ${n(top)} Q ${n(tw)} ${n(top)} ${n(tw)} ${n(top + r)} L ${n(bw)} ${n(bot - r)} Q ${n(bw)} ${n(bot)} ${n(bw - r)} ${n(bot)} L ${n(-bw + r)} ${n(bot)} Q ${n(-bw)} ${n(bot)} ${n(-bw)} ${n(bot - r)} Z`;
}

function drawBody(C, g, t) {
    const top = g.bodyTop;
    const bot = g.bodyBottom;
    let svg = "";
    if (C.body === "round") {
        const cy = (top + bot) / 2 + 4;
        svg += `<ellipse cx="0" cy="${n(cy)}" rx="${n(C.bodyW / 2)}" ry="${n(C.bodyH / 2 + 8)}" fill="${C.outfit}" ${stroke()}/>`;
        svg += `<path d="M 0 ${n(top + 20)} L 0 ${n(top + C.bodyH * 0.55)}" ${stroke(5)}/>`;
        for (const k of [0.28, 0.45]) {
            svg += `<circle cx="9" cy="${n(top + C.bodyH * k)}" r="5.5" fill="${C.shirt}" ${stroke(3)}/>`;
        }
        svg += `<path d="M ${n(-C.bodyW * 0.46)} ${n(cy + C.bodyH * 0.3)} Q 0 ${n(cy + C.bodyH * 0.52)} ${n(C.bodyW * 0.46)} ${n(cy + C.bodyH * 0.3)}" fill="none" stroke="${C.outfitDark}" stroke-width="9" stroke-linecap="round"/>`;
        svg += `<ellipse cx="0" cy="${n(top + 8)}" rx="${n(C.bodyW * 0.3)}" ry="15" fill="${C.accent}" ${stroke(6)}/>`;
        return svg;
    }
    if (C.body === "saree") {
        const tw = C.bodyW * 0.3;
        const bw = C.bodyW * 0.54;
        const mid = (top + bot) / 2;
        const d = `M ${n(-tw)} ${n(top + 20)} Q ${n(-tw)} ${n(top)} ${n(-tw + 20)} ${n(top)} L ${n(tw - 20)} ${n(top)} Q ${n(tw)} ${n(top)} ${n(tw)} ${n(top + 20)} Q ${n(bw * 0.9)} ${n(mid)} ${n(bw)} ${n(bot - 6)} Q 0 ${n(bot + 14)} ${n(-bw)} ${n(bot - 6)} Q ${n(-bw * 0.9)} ${n(mid)} ${n(-tw)} ${n(top + 20)} Z`;
        svg += `<path d="${d}" fill="${C.outfit}" ${stroke()}/>`;
        svg += `<path d="M ${n(-bw * 0.97)} ${n(bot - 18)} Q 0 ${n(bot + 2)} ${n(bw * 0.97)} ${n(bot - 18)}" fill="none" stroke="${C.accent}" stroke-width="12" stroke-linecap="round"/>`;
        // pallu over the shoulder
        svg += limb(
            `M ${n(-tw * 0.7)} ${n(top + 6)} Q ${n(bw * 0.2)} ${n(mid - 10)} ${n(bw * 0.78)} ${n(bot - 36)}`,
            C.outfitDark,
            34,
            5,
        );
        svg += `<path d="M ${n(-tw * 0.7 + 12)} ${n(top + 16)} Q ${n(bw * 0.2 + 10)} ${n(mid)} ${n(bw * 0.78 + 4)} ${n(bot - 22)}" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>`;
        return svg;
    }
    // coat (Raazu): short teal coat, cream shirt, mustard scarf
    const tw = C.bodyW * 0.4;
    const bw = C.bodyW * 0.5;
    svg += `<path d="${roundedTrapezoid(tw, bw, top, bot, 26)}" fill="${C.outfit}" ${stroke()}/>`;
    svg += `<path d="M ${n(-tw * 0.5)} ${n(top + 2)} L ${n(tw * 0.5)} ${n(top + 2)} L 0 ${n(top + C.bodyH * 0.58)} Z" fill="${C.shirt}" ${stroke(5)}/>`;
    svg += `<path d="M 0 ${n(top + C.bodyH * 0.58)} L 0 ${n(bot - 4)}" ${stroke(5)}/>`;
    for (const k of [0.68, 0.84]) {
        svg += `<circle cx="-11" cy="${n(top + C.bodyH * k)}" r="6" fill="${C.outfitDark}" ${stroke(3)}/>`;
    }
    svg += `<path d="M ${n(bw * 0.3)} ${n(bot - 34)} L ${n(bw * 0.75)} ${n(bot - 34)}" stroke="${C.outfitDark}" stroke-width="6" stroke-linecap="round"/>`;
    const sway = Math.sin(t * 3.1) * 8;
    svg += limb(
        `M ${n(-tw * 0.35)} ${n(top + 10)} Q ${n(-tw * 0.55 + sway * 0.4)} ${n(top + 60)} ${n(-tw * 0.45 + sway)} ${n(top + 96)}`,
        C.accent,
        30,
    );
    svg += `<ellipse cx="0" cy="${n(top + 4)}" rx="${n(tw * 0.95)}" ry="19" fill="${C.accent}" ${stroke(6)}/>`;
    return svg;
}

function armTargets(pose, side, C, g, t) {
    const ax = g.shoulderX;
    const sy = g.shoulderY;
    const R = g.R;
    const idle = [side * (ax + 16), sy + 76];
    switch (pose) {
        case "point":
            return side > 0 ? [ax + 112, sy - 58] : idle;
        case "think":
            return side > 0
                ? [R * 0.3, g.headCY + R * 0.8]
                : [ax * 0.1, sy + 66];
        case "scared":
            return [side * R * 0.8, g.headCY + R * 0.45];
        case "laugh":
            return [side * C.bodyW * 0.14, g.bodyTop + C.bodyH * 0.62];
        case "shrug":
            return [side * (ax + 88), sy - 10];
        case "hips":
            return [side * C.bodyW * 0.47, g.bodyTop + C.bodyH * 0.72];
        case "facefault":
            return [
                side * (ax + 36) + Math.sin(t * 20 + side) * 14,
                sy - 96 + Math.cos(t * 17 + side) * 10,
            ];
        default:
            return idle;
    }
}

function drawArm(C, g, pose, side, t) {
    const S = [side * g.shoulderX, g.shoulderY];
    const H = armTargets(pose, side, C, g, t);
    const E =
        pose === "hips"
            ? [side * (g.shoulderX + 52), (S[1] + H[1]) / 2]
            : [(S[0] + H[0]) / 2 + side * 16, (S[1] + H[1]) / 2 + 12];
    const color = C.body === "saree" ? C.skin : C.outfit;
    let svg = limb(
        `M ${n(S[0])} ${n(S[1])} Q ${n(E[0])} ${n(E[1])} ${n(H[0])} ${n(H[1])}`,
        color,
        30,
    );
    if (C.prop === "magnifier" && pose === "point" && side > 0) {
        const lens = [H[0] + 40, H[1] - 50];
        svg += limb(
            `M ${n(H[0])} ${n(H[1])} L ${n(lens[0] - 14)} ${n(lens[1] + 18)}`,
            "#8A5A2B",
            12,
            5,
        );
        svg += `<circle cx="${n(lens[0])}" cy="${n(lens[1])}" r="30" fill="#DFF6FF" fill-opacity="0.75" stroke="${OUT}" stroke-width="16"/>`;
        svg += `<circle cx="${n(lens[0])}" cy="${n(lens[1])}" r="30" fill="none" stroke="#E2A22E" stroke-width="8"/>`;
        svg += `<path d="M ${n(lens[0] - 14)} ${n(lens[1] - 4)} Q ${n(lens[0] - 10)} ${n(lens[1] - 14)} ${n(lens[0])} ${n(lens[1] - 16)}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>`;
    }
    svg += `<circle cx="${n(H[0])}" cy="${n(H[1])}" r="19" fill="${C.skin}" ${stroke(6)}/>`;
    return svg;
}

// ------------------------------------------------------------------ head

function hairCap(R, { sideY, fringeY, bumps, depth }) {
    const rx = R * 1.05;
    let d = `M ${n(-R * 1.02)} ${n(sideY)} A ${n(rx)} ${n(R * 1.07)} 0 1 1 ${n(R * 1.02)} ${n(sideY)} L ${n(R * 0.9)} ${n(fringeY)}`;
    const x0 = R * 0.9;
    const step = (2 * x0) / bumps;
    for (let i = 0; i < bumps; i++) {
        const a = x0 - i * step;
        const b = a - step;
        d += ` Q ${n((a + b) / 2)} ${n(fringeY + depth)} ${n(b)} ${n(fringeY)}`;
    }
    return `${d} Z`;
}

function drawHairBack(C, R) {
    if (C.hair === "bun") {
        return `<circle cx="0" cy="${n(-R * 1.0)}" r="${n(R * 0.38)}" fill="${C.hairColor}" ${stroke()}/><circle cx="${n(R * 0.22)}" cy="${n(-R * 1.18)}" r="9" fill="${C.accent}" ${stroke(4)}/>`;
    }
    return "";
}

function drawHairFront(C, R, t) {
    if (C.hair === "cowlick") {
        // messy rounded spikes on top (drawn first so the cap covers their base)
        const sway = Math.sin(t * 3.3) * 3;
        let s = "";
        for (const [deg, len] of [
            [-138, 1.3],
            [-112, 1.42],
            [-84, 1.36],
            [-58, 1.27],
        ]) {
            const a = ((deg + sway) * Math.PI) / 180;
            const w = 0.26;
            const p = (ang, r) =>
                `${n(Math.cos(ang) * R * r)} ${n(Math.sin(ang) * R * r)}`;
            s += `<path d="M ${p(a - w, 0.9)} Q ${p(a - w * 0.3, len * 0.95)} ${p(a + 0.05, len)} Q ${p(a + w * 0.4, len * 0.9)} ${p(a + w, 0.9)} Z" fill="${C.hairColor}" ${stroke()}/>`;
        }
        return (
            s +
            `<path d="${hairCap(R, { sideY: R * 0.12, fringeY: -R * 0.44, bumps: 4, depth: R * 0.24 })}" fill="${C.hairColor}" ${stroke()}/>`
        );
    }
    if (C.hair === "sprout") {
        const sway = Math.sin(t * 4.2) * 8;
        let s = "";
        for (const side of [-1, 0, 1]) {
            const top = -R * (side === 0 ? 1.68 : 1.52);
            s += limb(
                `M ${n(side * 10)} ${n(-R * 0.98)} Q ${n(side * 40 + sway * 0.5)} ${n(-R * 1.3)} ${n(side * 66 + sway)} ${n(top)}`,
                C.hairColor,
                15,
            );
        }
        return (
            s +
            `<path d="${hairCap(R, { sideY: -R * 0.12, fringeY: -R * 0.56, bumps: 5, depth: R * 0.13 })}" fill="${C.hairColor}" ${stroke()}/>`
        );
    }
    // bun: smooth parted fringe
    return `<path d="${hairCap(R, { sideY: R * 0.05, fringeY: -R * 0.46, bumps: 2, depth: R * 0.16 })}" fill="${C.hairColor}" ${stroke()}/>`;
}

function eyeMode(expression, talking) {
    switch (expression) {
        case "happy":
            return talking ? "open" : "arc";
        case "laughing":
            return "chevron";
        case "shocked":
            return "shock";
        case "scared":
            return "small";
        case "suspicious":
            return "lid";
        case "dizzy":
            return "swirl";
        case "crying":
            return "shut";
        default:
            return "open";
    }
}

function drawEyes(C, R, state, uid) {
    const { expression = "neutral", talking = false, t = 0 } = state;
    const round = C.eyes === "round";
    const ex = R * (round ? 0.4 : 0.36);
    const ey = R * 0.06;
    const rx = R * (round ? 0.2 : 0.18);
    const ry = R * (round ? 0.23 : 0.25);
    const mode = eyeMode(expression, talking);
    const look = state.look || [0.55, 0];
    const blink = state.blink || 0;
    let svg = "";
    for (const side of [-1, 1]) {
        const cx = side * ex;
        if (mode === "arc") {
            svg += `<path d="M ${n(cx - rx)} ${n(ey + ry * 0.25)} Q ${n(cx)} ${n(ey - ry * 1.0)} ${n(cx + rx)} ${n(ey + ry * 0.25)}" fill="none" ${stroke(9)}/>`;
            continue;
        }
        if (mode === "chevron") {
            const dir = -side; // > <  pointing to the middle
            svg += `<path d="M ${n(cx - dir * rx)} ${n(ey - ry * 0.55)} L ${n(cx + dir * rx * 0.7)} ${n(ey)} L ${n(cx - dir * rx)} ${n(ey + ry * 0.55)}" fill="none" ${stroke(9)}/>`;
            continue;
        }
        if (mode === "shut") {
            svg += `<path d="M ${n(cx - rx)} ${n(ey)} q ${n(rx / 2)} ${n(-ry * 0.35)} ${n(rx)} 0 t ${n(rx)} 0" fill="none" ${stroke(8)}/>`;
            continue;
        }
        if (blink > 0.55 && mode !== "shock" && mode !== "swirl") {
            svg += `<path d="M ${n(cx - rx)} ${n(ey)} Q ${n(cx)} ${n(ey + ry * 0.45)} ${n(cx + rx)} ${n(ey)}" fill="none" ${stroke(8)}/>`;
            continue;
        }
        let erx = rx;
        let ery = ry;
        if (mode === "shock") {
            erx = rx * 1.28;
            ery = ry * 1.22;
        }
        if (expression === "curious") ery *= side > 0 ? 1.08 : 0.92;
        svg += `<ellipse cx="${n(cx)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}" fill="#FFFFFF" ${stroke(6)}/>`;
        if (mode === "swirl") {
            const rot = (t * 420) % 360;
            let d = "";
            for (let i = 0; i <= 28; i++) {
                const a = i * 0.62;
                const r = (erx * 0.82 * i) / 28;
                d += `${i ? "L" : "M"} ${n(cx + Math.cos(a) * r)} ${n(ey + Math.sin(a) * r)} `;
            }
            svg += `<path d="${d}" fill="none" ${stroke(5)} transform="rotate(${n(side * rot)} ${n(cx)} ${n(ey)})"/>`;
            continue;
        }
        const px = cx + look[0] * erx * 0.38;
        const py =
            ey +
            look[1] * ery * 0.4 +
            (expression === "curious" ? -ery * 0.15 : 0);
        if (mode === "shock") {
            svg += `<circle cx="${n(cx)}" cy="${n(ey)}" r="${n(erx * 0.2)}" fill="${OUT}"/>`;
            continue;
        }
        const tremble = mode === "small" ? Math.sin(t * 47 + side) * 2.5 : 0;
        const prx = erx * (mode === "small" ? 0.34 : 0.52);
        const pry = ery * (mode === "small" ? 0.34 : 0.56);
        svg += `<ellipse cx="${n(px + tremble)}" cy="${n(py)}" rx="${n(prx)}" ry="${n(pry)}" fill="${OUT}"/>`;
        svg += `<circle cx="${n(px + tremble + prx * 0.35)}" cy="${n(py - pry * 0.4)}" r="${n(prx * 0.38)}" fill="#FFFFFF"/>`;
        if (mode === "lid") {
            const clip = `${uid}-lid${side}`;
            svg += `<defs><clipPath id="${clip}"><ellipse cx="${n(cx)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}"/></clipPath></defs>`;
            svg += `<rect x="${n(cx - erx - 4)}" y="${n(ey - ery - 4)}" width="${n(erx * 2 + 8)}" height="${n(ery * 0.95)}" fill="${C.skin}" clip-path="url(#${clip})"/>`;
            svg += `<path d="M ${n(cx - erx)} ${n(ey - ery * 0.05 + side * 4)} L ${n(cx + erx)} ${n(ey - ery * 0.05 - side * 4)}" ${stroke(8)}/>`;
        }
    }
    // brows
    const by = ey - ry - R * 0.14;
    const bl = R * 0.14;
    const lift = {
        neutral: [0, 0],
        happy: [6, 6],
        laughing: [10, 10],
        curious: [0, 14],
        shocked: [22, 22],
        scared: [14, -4],
        crying: [14, -4],
        suspicious: [-10, 6],
        dizzy: [4, 4],
    }[expression] || [0, 0];
    for (const side of [-1, 1]) {
        const cx = side * ex;
        const inner = [
            cx - side * bl,
            by - lift[0] * (side > 0 && expression === "curious" ? 1 : 1),
        ];
        const outer = [
            cx + side * bl,
            by -
                lift[1] * (expression === "curious" ? (side > 0 ? 1 : 0.2) : 1),
        ];
        if (expression === "curious" && side < 0) inner[1] = by + 2;
        svg += `<path d="M ${n(inner[0])} ${n(inner[1])} Q ${n(cx)} ${n(Math.min(inner[1], outer[1]) - 8)} ${n(outer[0])} ${n(outer[1])}" fill="none" ${stroke(9)}/>`;
    }
    // tears
    if (expression === "crying") {
        for (const side of [-1, 1]) {
            const sx = side * (ex + rx * 0.4);
            const wob = Math.sin(t * 16 + side) * 6;
            svg += limb(
                `M ${n(sx)} ${n(ey + 6)} Q ${n(side * (ex + rx * 2.4))} ${n(ey - ry * 0.6 + wob)} ${n(side * (ex + rx * 3.1))} ${n(ey + R * 0.95)}`,
                "#8ED8FF",
                16,
                3.5,
            );
            for (let i = 0; i < 3; i++) {
                const p = (t * 1.8 + i / 3) % 1;
                const dx = side * (ex + rx * (1.5 + p * 2.4));
                const dy = ey - ry * 0.4 + p * p * R * 0.9;
                svg += `<circle cx="${n(dx)}" cy="${n(dy)}" r="7" fill="#8ED8FF" ${stroke(3)}/>`;
            }
        }
    }
    if (expression === "laughing") {
        for (const side of [-1, 1]) {
            svg += `<path d="M ${n(side * (ex + rx * 1.1))} ${n(ey + 2)} c ${n(side * 6)} 10 ${n(side * 8)} 18 0 22 c ${n(-side * 8)} -4 ${n(-side * 6)} -12 0 -22 Z" fill="#8ED8FF" ${stroke(3)}/>`;
        }
    }
    return { svg, ex, ey, rx, ry };
}

function drawMouth(C, R, state, uid) {
    const { expression = "neutral", talking = false, mouth = "X" } = state;
    const my = R * (C.eyes === "round" ? 0.5 : 0.54);
    const mx = R * 0.04;
    const w = R * 0.22;
    const vis = { X: 0, A: 0.35, B: 0.65, C: 1, O: 0.8 }[mouth] ?? 0;
    let open = talking ? vis : 0;
    let shape = mouth === "O" && talking ? "round" : "d";
    switch (expression) {
        case "happy":
            open = Math.max(open, talking ? 0.3 : 0.5);
            break;
        case "laughing":
            open = Math.max(open, 0.85);
            break;
        case "shocked":
            shape = "round";
            open = Math.max(open, 0.9);
            break;
        case "crying":
            shape = "wail";
            open = Math.max(open, 0.75);
            break;
        case "curious":
            if (!talking) {
                shape = "round";
                open = 0.15;
            }
            break;
        case "dizzy":
            if (!talking) shape = "wavy";
            break;
        case "scared":
            if (!talking) shape = "wavy";
            break;
        default:
            break;
    }
    const g = `<g transform="translate(${n(mx)} ${n(my)})">`;
    if (shape === "wavy") {
        return `${g}<path d="M ${n(-w)} 0 q ${n(w / 4)} -12 ${n(w / 2)} 0 t ${n(w / 2)} 0 t ${n(w / 2)} 0 t ${n(w / 2)} 0" fill="none" ${stroke(7)}/></g>`;
    }
    if (open < 0.05) {
        if (expression === "suspicious") {
            return `${g}<path d="M ${n(-w * 0.8)} 6 Q 0 10 ${n(w * 0.8)} -8" fill="none" ${stroke(7)}/></g>`;
        }
        return `${g}<path d="M ${n(-w * 0.85)} 0 Q 0 ${n(w * 0.55)} ${n(w * 0.85)} 0" fill="none" ${stroke(7)}/></g>`;
    }
    const clip = `${uid}-mouth`;
    let d;
    if (shape === "round") {
        const rx = R * (0.08 + 0.08 * open);
        const ry = R * (0.08 + 0.13 * open);
        d = `M ${n(-rx)} ${n(ry)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(rx)} ${n(ry)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(-rx)} ${n(ry)} Z`;
        d = `M 0 0 m ${n(-rx)} ${n(ry)} a ${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0 Z`;
    } else if (shape === "wail") {
        const ww = w * 1.1;
        const h = R * (0.16 + 0.22 * open);
        d = `M ${n(-ww)} ${n(h * 0.25)} Q 0 ${n(-h * 0.35)} ${n(ww)} ${n(h * 0.25)} L ${n(ww * 0.7)} ${n(h)} Q 0 ${n(h * 1.15)} ${n(-ww * 0.7)} ${n(h)} Z`;
    } else {
        const ww = w * (1 + 0.25 * open);
        const h = R * (0.1 + 0.3 * open);
        d = `M ${n(-ww)} 0 Q 0 ${n(ww * 0.12)} ${n(ww)} 0 C ${n(ww)} ${n(h * 0.75)} ${n(ww * 0.55)} ${n(h)} 0 ${n(h)} C ${n(-ww * 0.55)} ${n(h)} ${n(-ww)} ${n(h * 0.75)} ${n(-ww)} 0 Z`;
    }
    let svg = `${g}<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`;
    svg += `<path d="${d}" fill="#7A1A2C"/>`;
    svg += `<g clip-path="url(#${clip})"><ellipse cx="0" cy="${n(R * 0.34)}" rx="${n(w * 0.7)}" ry="${n(R * 0.14)}" fill="#FF7A8A"/>`;
    if (shape === "d") {
        svg += `<rect x="${n(-w * 1.4)}" y="-6" width="${n(w * 2.8)}" height="${n(R * 0.05 + 6)}" fill="#FFFFFF"/>`;
    }
    svg += `</g><path d="${d}" fill="none" ${stroke(6)}/></g>`;
    return svg;
}

function drawGlasses(C, eyes, glint) {
    if (!C.glasses) return "";
    const { ex, ey, rx, ry } = eyes;
    let svg = "";
    if (C.glasses === "softsquare") {
        const w = rx * 2.7;
        const h = ry * 2.25;
        for (const side of [-1, 1]) {
            const x = side * ex - w / 2;
            const y = ey - h / 2;
            svg += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(w * 0.3)}" fill="#E6F7FF" fill-opacity="${n(0.18 + glint * 0.7)}" stroke="${OUT}" stroke-width="12"/>`;
            svg += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(w * 0.3)}" fill="none" stroke="${C.glassesColor}" stroke-width="5"/>`;
            svg += `<path d="M ${n(x + w * 0.2)} ${n(y + h * 0.42)} L ${n(x + w * 0.42)} ${n(y + h * 0.18)}" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
        }
        svg += `<path d="M ${n(-ex + w / 2)} ${n(ey - 6)} Q 0 ${n(ey - 18)} ${n(ex - w / 2)} ${n(ey - 6)}" fill="none" ${stroke(8)}/>`;
        if (glint > 0.05) {
            const gx = ex + w * 0.25;
            const gy = ey - h * 0.35;
            const s = 18 + glint * 26;
            svg += `<path d="M ${n(gx)} ${n(gy - s)} Q ${n(gx + 4)} ${n(gy - 4)} ${n(gx + s)} ${n(gy)} Q ${n(gx + 4)} ${n(gy + 4)} ${n(gx)} ${n(gy + s)} Q ${n(gx - 4)} ${n(gy + 4)} ${n(gx - s)} ${n(gy)} Q ${n(gx - 4)} ${n(gy - 4)} ${n(gx)} ${n(gy - s)} Z" fill="#FFFFFF" opacity="${n(glint)}"/>`;
        }
        return svg;
    }
    // small round reading glasses (Nani)
    const r = rx * 1.2;
    for (const side of [-1, 1]) {
        svg += `<circle cx="${n(side * ex)}" cy="${n(ey + ry * 0.3)}" r="${n(r)}" fill="#E6F7FF" fill-opacity="0.2" stroke="${OUT}" stroke-width="10"/><circle cx="${n(side * ex)}" cy="${n(ey + ry * 0.3)}" r="${n(r)}" fill="none" stroke="${C.glassesColor}" stroke-width="4"/>`;
    }
    svg += `<path d="M ${n(-ex + r)} ${n(ey + ry * 0.3)} L ${n(ex - r)} ${n(ey + ry * 0.3)}" ${stroke(7)}/>`;
    return svg;
}

function sweatDrop(x, y, s) {
    return `<path d="M ${n(x)} ${n(y - s)} C ${n(x + s * 0.65)} ${n(y - s * 0.05)} ${n(x + s * 0.6)} ${n(y + s * 0.62)} ${n(x)} ${n(y + s * 0.62)} C ${n(x - s * 0.6)} ${n(y + s * 0.62)} ${n(x - s * 0.65)} ${n(y - s * 0.05)} ${n(x)} ${n(y - s)} Z" fill="#8ED8FF" ${stroke(5)}/><ellipse cx="${n(x - s * 0.2)}" cy="${n(y + s * 0.15)}" rx="${n(s * 0.1)}" ry="${n(s * 0.18)}" fill="#FFFFFF"/>`;
}

function star(x, y, s, fill = "#FFD93B") {
    let d = "";
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? s * 0.45 : s;
        d += `${i ? "L" : "M"} ${n(x + Math.cos(a) * r)} ${n(y + Math.sin(a) * r)} `;
    }
    return `<path d="${d}Z" fill="${fill}" ${stroke(4)}/>`;
}

function drawSymbols(C, R, state, uid) {
    const { expression = "neutral", t = 0 } = state;
    const since = state.since ?? t;
    let svg = "";
    if (expression === "scared") {
        const clip = `${uid}-gloom`;
        svg += `<defs><clipPath id="${clip}"><circle cx="0" cy="0" r="${n(R * 0.98)}"/></clipPath></defs><g clip-path="url(#${clip})" opacity="0.55">`;
        for (let i = -3; i <= 3; i++) {
            svg += `<path d="M ${n(i * R * 0.2)} ${n(-R * 0.98)} L ${n(i * R * 0.2)} ${n(-R * 0.3 - Math.abs(i) * 6)}" stroke="#5A63E8" stroke-width="7" stroke-linecap="round"/>`;
        }
        svg += "</g>";
        svg += sweatDrop(R * 0.9, -R * 0.45 + ((t * 30) % 20), R * 0.2);
    }
    if (expression === "shocked") {
        const pop = clamp01(since / 0.15);
        for (const a of [-150, -122, -58, -30]) {
            const r = (a * Math.PI) / 180;
            const r0 = R * 1.22;
            const r1 = R * (1.22 + 0.35 * pop);
            svg += `<path d="M ${n(Math.cos(r) * r0)} ${n(Math.sin(r) * r0 - R * 0.1)} L ${n(Math.cos(r) * r1)} ${n(Math.sin(r) * r1 - R * 0.1)}" ${stroke(9)}/>`;
        }
    }
    if (expression === "suspicious") {
        const x = R * 0.72;
        const y = -R * 0.74;
        const s = 16;
        svg += `<path d="M ${x - s} ${y - 4} Q ${x - 4} ${y - 4} ${x - 4} ${y - s} M ${x + 4} ${y - s} Q ${x + 4} ${y - 4} ${x + s} ${y - 4} M ${x + s} ${y + 4} Q ${x + 4} ${y + 4} ${x + 4} ${y + s} M ${x - 4} ${y + s} Q ${x - 4} ${y + 4} ${x - s} ${y + 4}" fill="none" stroke="#E8384A" stroke-width="7" stroke-linecap="round"/>`;
    }
    if (expression === "dizzy") {
        for (let i = 0; i < 3; i++) {
            const a = t * 4.5 + (i * Math.PI * 2) / 3;
            svg += star(
                Math.cos(a) * R * 0.85,
                -R * 1.18 + Math.sin(a) * R * 0.2,
                17,
            );
        }
        svg += sweatDrop(-R * 0.92, -R * 0.4, R * 0.16);
    }
    return svg;
}

function motion(C, g, state) {
    const {
        t = 0,
        expression = "neutral",
        pose = "idle",
        talking = false,
    } = state;
    const since = state.since ?? t;
    const seed = C.headR * 0.07;
    const bob = Math.sin(t * 2.6 + seed);
    let dy = 0;
    let dx = 0;
    let sy = 1 + 0.018 * bob;
    let sx = 1 - 0.012 * bob;
    let air = 0;
    if (talking) {
        const b = Math.abs(Math.sin(t * 7.5 + seed));
        dy -= b * 7;
        sy += 0.03 * b;
        sx -= 0.02 * b;
    }
    if (expression === "laughing") {
        const b = Math.abs(Math.sin(t * 11 + seed));
        dy -= b * 16;
        sy += 0.05 * (b - 0.4);
        sx -= 0.035 * (b - 0.4);
    }
    if (expression === "scared") {
        dx += Math.sin(t * 55 + seed) * 3;
        sy *= 0.96;
        sx *= 1.03;
    }
    if (expression === "crying") dy -= Math.abs(Math.sin(t * 14)) * 4;
    if (expression === "shocked") {
        // jump-up shock: stretch in the air, squash on landing
        const p = since / 0.6;
        if (p >= 0 && p < 0.8) {
            air = Math.sin((Math.PI * p) / 0.8);
            dy -= air * 110;
            sy += 0.14 * air;
            sx -= 0.08 * air;
        } else if (p >= 0.8 && p < 1) {
            const q = Math.sin((Math.PI * (p - 0.8)) / 0.2);
            sy -= 0.14 * q;
            sx += 0.1 * q;
        } else {
            dx += Math.sin(t * 40) * 1.5;
        }
    }
    let fall = 0;
    if (pose === "facefault") {
        const p = clamp01(since / 0.22);
        fall = p * p;
        if (since > 0.22 && since < 0.42) {
            dy -= Math.sin((Math.PI * (since - 0.22)) / 0.2) * 14;
        }
    }
    let tilt = Math.sin(t * 1.4 + seed) * 1.5;
    if (talking) tilt += Math.sin(t * 5 + seed) * 2.5;
    if (expression === "curious") tilt += 7;
    if (expression === "suspicious") tilt -= 5;
    if (expression === "laughing") tilt += Math.sin(t * 11) * 5;
    return { dx, dy, sx, sy, air, fall, tilt };
}

/**
 * @param {object} ch - character from characters.js (needs `classic`)
 * @param {object} state - same per-frame state as the other rigs
 *   (x, y, scale, flip, t, blink, expression, pose, mouth, talking, look,
 *   since, uid, glint)
 */
export function renderClassicCharacter(ch, state = {}) {
    const C = { ...ch.classic };
    const {
        x = 0,
        y = 0,
        scale = 1,
        flip = false,
        pose = "idle",
        t = 0,
    } = state;
    const uid = state.uid || `c-${ch.id}`;
    const g = geometry(C);
    const R = g.R;
    const m = motion(C, g, state);

    const eyes = drawEyes(C, R, state, uid);
    let head = drawHairBack(C, R);
    for (const side of [-1, 1]) {
        head += `<circle cx="${n(side * R * 0.98)}" cy="${n(R * 0.12)}" r="${n(R * 0.17)}" fill="${C.skin}" ${stroke()}/>`;
    }
    const round = C.body === "round";
    head += `<ellipse cx="0" cy="0" rx="${n(R * (round ? 1.05 : 1))}" ry="${n(R * (round ? 0.98 : 1))}" fill="${C.skin}" ${stroke()}/>`;
    const rosy = ["laughing", "happy", "crying", "scared"].includes(
        state.expression,
    )
        ? 0.75
        : 0.5;
    for (const side of [-1, 1]) {
        head += `<ellipse cx="${n(side * R * 0.62)}" cy="${n(R * 0.36)}" rx="${n(R * 0.15)}" ry="${n(R * 0.09)}" fill="#FF7E96" opacity="${rosy}"/>`;
    }
    head += drawHairFront(C, R, t);
    head += eyes.svg;
    head +=
        C.nose === "button"
            ? `<ellipse cx="${n(R * 0.04)}" cy="${n(R * 0.3)}" rx="${n(R * 0.075)}" ry="${n(R * 0.058)}" fill="#E39468" ${stroke(4)}/>`
            : `<path d="M ${n(R * 0.05)} ${n(R * 0.24)} Q ${n(R * 0.17)} ${n(R * 0.32)} ${n(R * 0.05)} ${n(R * 0.39)}" fill="none" ${stroke(5)}/>`;
    head += drawMouth(C, R, state, uid);
    head += drawGlasses(C, eyes, clamp01(state.glint || 0));
    head += drawSymbols(C, R, state, uid);

    const armsOverHead = pose === "scared" || pose === "think";
    const backArm = drawArm(C, g, pose, -1, t);
    const frontArm = drawArm(C, g, pose, 1, t);

    let body = "";
    if (!armsOverHead) body += backArm;
    body += drawLegs(C, g, pose, t);
    body += drawBody(C, g, t);
    if (!armsOverHead) body += frontArm;
    body += `<g transform="translate(0 ${n(g.headCY)}) rotate(${n(m.tilt)} 0 ${n(R * 0.8)})">${head}</g>`;
    if (armsOverHead) body += backArm + frontArm;

    const fs = (flip ? -1 : 1) * scale;
    const shadowW =
        C.bodyW * 0.62 * scale * (1 - m.air * 0.35) * (1 + m.fall * 1.4);
    let svg = `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(shadowW)}" ry="${n(13 * scale)}" fill="${OUT}" fill-opacity="0.16"/>`;
    svg += `<g transform="translate(${n(x + m.dx)} ${n(y + m.dy)}) scale(${n(fs * m.sx * 1000) / 1000} ${n(scale * m.sy * 1000) / 1000})">`;
    if (m.fall > 0) {
        svg += `<g transform="translate(${n(R * 1.7 * m.fall)} ${n(-R * 0.98 * m.fall)}) rotate(${n(-88 * m.fall)})">${body}</g>`;
        if (m.fall >= 1) {
            const since = (state.since ?? 0) - 0.22;
            const puff = clamp01(1 - since / 0.6);
            if (puff > 0) {
                for (const k of [-1, 0.2, 1]) {
                    svg += `<circle cx="${n(-R * 2 * k + R * 1.2)}" cy="${n(-12 - puff * 20)}" r="${n(18 + (1 - puff) * 16)}" fill="#FFFFFF" fill-opacity="${n(puff * 0.9)}" ${stroke(4)} stroke-opacity="${n(puff * 0.6)}"/>`;
                }
            }
        }
    } else {
        svg += body;
    }
    svg += "</g>";
    return svg;
}
