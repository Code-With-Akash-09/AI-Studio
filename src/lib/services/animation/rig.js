/**
 * Code-driven 2D character rig (pure functions → SVG markup, no I/O).
 *
 * Every character is built from the same parametric parts (legs, torso, arms,
 * head, eyes with blink, brows, viseme mouths, accessories) styled by the
 * `rig` + `palette` block in characters.js. Local coordinates: feet at (0,0),
 * up is negative y, the character's "front" arm points toward +x.
 */

const OUTLINE_W = 7;

const n = (v) => Math.round(v * 10) / 10;

// ------------------------------------------------------------
// Expression presets
// ------------------------------------------------------------

const EXPRESSION_PRESETS = {
    neutral: {
        eyeMul: 1,
        pupil: 13,
        open: 1,
        brows: { l: { dy: 0, a: 0 }, r: { dy: 0, a: 0 } },
        mouth: "smallSmile",
        tilt: 0,
    },
    happy: {
        eyeMul: 1,
        pupil: 13,
        open: 0.8,
        brows: { l: { dy: -6, a: -4 }, r: { dy: -6, a: -4 } },
        mouth: "smile",
        tilt: 3,
    },
    curious: {
        eyeMul: 1.05,
        pupil: 12,
        open: 1,
        look: [0.6, -0.55],
        brows: { l: { dy: -18, a: -10 }, r: { dy: 4, a: 10 } },
        mouth: "oSmall",
        tilt: 7,
    },
    shocked: {
        eyeMul: 1.25,
        pupil: 7,
        open: 1,
        brows: { l: { dy: -26, a: -6 }, r: { dy: -26, a: -6 } },
        mouth: "O",
        tilt: 0,
    },
    scared: {
        eyeMul: 1.12,
        pupil: 7,
        open: 1,
        brows: { l: { dy: -14, a: -20 }, r: { dy: -14, a: -20 } },
        mouth: "grimace",
        tilt: 0,
        sweat: true,
        tremble: true,
    },
    laughing: {
        eyeMul: 1,
        pupil: 12,
        open: 1,
        closedHappy: true,
        brows: { l: { dy: -12, a: -6 }, r: { dy: -12, a: -6 } },
        mouth: "laughOpen",
        tilt: -5,
        bounce: true,
    },
    suspicious: {
        eyeMul: 1,
        pupil: 12,
        open: 0.45,
        look: [1, 0.1],
        lidLine: true,
        brows: { l: { dy: 6, a: 16 }, r: { dy: 6, a: 16 } },
        mouth: "smirk",
        tilt: -3,
    },
};

export function getExpressionPreset(expression) {
    return EXPRESSION_PRESETS[expression] || EXPRESSION_PRESETS.neutral;
}

// ------------------------------------------------------------
// Geometry helpers
// ------------------------------------------------------------

function anchors(rig) {
    const hipY = -rig.legH;
    const shoulderY = hipY - rig.torsoH;
    const headCY = shoulderY - rig.headR * 0.78;
    const shoulderX = rig.torsoTopW / 2 - 8;
    return { hipY, shoulderY, headCY, shoulderX };
}

/** Quadratic path from a → c that passes through b (the elbow). */
function limbPath(a, b, c) {
    const cx = 2 * b[0] - (a[0] + c[0]) / 2;
    const cy = 2 * b[1] - (a[1] + c[1]) / 2;
    return `M ${n(a[0])} ${n(a[1])} Q ${n(cx)} ${n(cy)} ${n(c[0])} ${n(c[1])}`;
}

function strokeTwice(d, width, color, outline) {
    return (
        `<path d="${d}" fill="none" stroke="${outline}" stroke-width="${width + OUTLINE_W * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
}

// ------------------------------------------------------------
// Arms / poses
// ------------------------------------------------------------

/** Returns world-space [shoulder, elbow, hand] for the given side (+1 front/right, -1 back/left). */
function armPoints(pose, side, rig, a) {
    const s = [side * a.shoulderX, a.shoulderY + 26];
    const sx = a.shoulderX;
    const R = rig.headR;
    const belly = a.shoulderY + rig.torsoH * 0.62;

    switch (pose) {
        case "point":
            if (side === 1) {
                return [
                    s,
                    [sx + 70, a.shoulderY - 6],
                    [sx + 150, a.shoulderY - 70],
                ];
            }
            break;
        case "think":
            if (side === 1) {
                return [
                    s,
                    [sx + 52, a.shoulderY + 92],
                    [R * 0.32, a.headCY + R * 0.88],
                ];
            }
            return [
                s,
                [-sx - 20, a.shoulderY + 100],
                [sx * 0.55, a.shoulderY + 104],
            ];
        case "scared":
            return [
                s,
                [side * (sx + 62), a.shoulderY + 34],
                [side * R * 0.98, a.headCY + R * 0.42],
            ];
        case "laugh":
            return [
                s,
                [side * (sx + 42), a.shoulderY + 86],
                [side * rig.torsoBottomW * 0.16, belly],
            ];
        case "shrug":
            return [
                s,
                [side * (sx + 64), a.shoulderY + 70],
                [side * (sx + 118), a.shoulderY + 4],
            ];
        case "hips":
            return [
                s,
                [side * (sx + 72), a.shoulderY + 66],
                [side * (rig.torsoBottomW / 2 - 6), a.hipY - 34],
            ];
        default:
            break;
    }
    return [
        s,
        [side * (sx + 18), a.shoulderY + 82],
        [side * (sx + 10), a.shoulderY + 158],
    ];
}

function drawArm(points, character, pose, side) {
    const { palette, rig } = character;
    const width = rig.torsoBottomW > 200 ? 36 : 30;
    const [s, e, h] = points;
    let svg = strokeTwice(
        limbPath(s, e, h),
        width,
        palette.outfit,
        palette.outline,
    );

    // Magnifier prop for the pointing hand
    if (pose === "point" && side === 1 && rig.prop === "magnifier") {
        const gx = h[0] + 38;
        const gy = h[1] - 38;
        svg += `<path d="M ${n(h[0])} ${n(h[1])} L ${n(gx - 18)} ${n(gy + 18)}" stroke="${palette.outline}" stroke-width="22" stroke-linecap="round"/>`;
        svg += `<path d="M ${n(h[0])} ${n(h[1])} L ${n(gx - 18)} ${n(gy + 18)}" stroke="#8B5A2B" stroke-width="10" stroke-linecap="round"/>`;
        svg += `<circle cx="${n(gx)}" cy="${n(gy)}" r="34" fill="#BFE9FF" fill-opacity="0.55" stroke="${palette.outline}" stroke-width="${OUTLINE_W + 4}"/>`;
        svg += `<circle cx="${n(gx)}" cy="${n(gy)}" r="34" fill="none" stroke="#D9A441" stroke-width="5"/>`;
        svg += `<path d="M ${n(gx - 16)} ${n(gy - 10)} Q ${n(gx - 12)} ${n(gy - 20)} ${n(gx - 2)} ${n(gy - 22)}" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    } else if (pose === "point" && side === 1) {
        // index finger
        svg += strokeTwice(
            `M ${n(h[0])} ${n(h[1])} L ${n(h[0] + 26)} ${n(h[1] - 18)}`,
            9,
            palette.skin,
            palette.outline,
        );
    }

    svg += `<circle cx="${n(h[0])}" cy="${n(h[1])}" r="21" fill="${palette.skin}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
    return svg;
}

// ------------------------------------------------------------
// Body
// ------------------------------------------------------------

function drawLegs(character, a) {
    const { palette, rig } = character;
    if (rig.saree) {
        const top = rig.torsoBottomW / 2;
        const bottom = top + 18;
        const y0 = a.hipY - 10;
        let svg = `<path d="M ${-top} ${y0} L ${top} ${y0} L ${bottom} -14 L ${-bottom} -14 Z" fill="${palette.pants}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`;
        svg += `<rect x="${-bottom}" y="-34" width="${bottom * 2}" height="20" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="5"/>`;
        svg += `<ellipse cx="-30" cy="-8" rx="30" ry="13" fill="${palette.shoes}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
        svg += `<ellipse cx="30" cy="-8" rx="30" ry="13" fill="${palette.shoes}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
        return svg;
    }
    const lx = rig.torsoBottomW * 0.2;
    const lw = Math.max(40, rig.torsoBottomW * 0.24);
    let svg = "";
    for (const side of [-1, 1]) {
        svg += `<rect x="${n(side * lx - lw / 2)}" y="${n(a.hipY - 12)}" width="${n(lw)}" height="${n(-a.hipY)}" rx="10" fill="${palette.pants}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
    }
    for (const side of [-1, 1]) {
        svg += `<ellipse cx="${n(side * lx + 10)}" cy="-10" rx="${n(lw * 0.78)}" ry="17" fill="${palette.shoes}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
    }
    return svg;
}

function drawTorso(character, a, breathe) {
    const { palette, rig } = character;
    const tw = rig.torsoTopW / 2;
    const bw = rig.torsoBottomW / 2;
    const sy = a.shoulderY;
    const hy = a.hipY;
    const bulge = bw - tw > 40 ? 28 : 6;
    const r = 26;
    const midY = (sy + hy) / 2 + 10;
    const d =
        `M ${-tw + r} ${sy} L ${tw - r} ${sy} Q ${tw} ${sy} ${tw + 2} ${sy + r} ` +
        `C ${bw + bulge} ${midY - 20} ${bw + bulge} ${midY + 30} ${bw} ${hy - 8} ` +
        `Q ${bw} ${hy} ${bw - 14} ${hy} L ${-bw + 14} ${hy} Q ${-bw} ${hy} ${-bw} ${hy - 8} ` +
        `C ${-bw - bulge} ${midY + 30} ${-bw - bulge} ${midY - 20} ${-tw - 2} ${sy + r} ` +
        `Q ${-tw} ${sy} ${-tw + r} ${sy} Z`;

    let svg = `<g transform="translate(0 ${hy}) scale(1 ${n(1 + breathe)}) translate(0 ${-hy})">`;
    svg += `<path d="${d}" fill="${palette.outfit}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`;

    if (rig.saree) {
        // diagonal pallu band
        svg += `<path d="M ${-tw + 10} ${sy + 4} L ${-tw + 52} ${sy + 4} L ${bw - 6} ${hy - 4} L ${bw - 48} ${hy - 4} Z" fill="${palette.accent}" fill-opacity="0.9" stroke="${palette.outline}" stroke-width="4"/>`;
    } else if (rig.prop === "magnifier") {
        // detective coat lapels + buttons
        svg += `<path d="M -36 ${sy + 2} L 0 ${sy + 70} L 36 ${sy + 2}" fill="none" stroke="${palette.outline}" stroke-width="6" stroke-linejoin="round"/>`;
        svg += `<path d="M 0 ${sy + 70} L 0 ${hy - 6}" stroke="${palette.outline}" stroke-width="5"/>`;
        for (const k of [0, 1, 2]) {
            svg += `<circle cx="14" cy="${n(sy + 92 + k * 36)}" r="6" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="3"/>`;
        }
        svg += `<path d="M ${-bw + 18} ${hy - 50} L ${-bw + 70} ${hy - 50}" stroke="${palette.outline}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
        // kurta placket
        svg += `<path d="M 0 ${sy + 4} L 0 ${sy + 80}" stroke="${palette.outline}" stroke-width="5"/>`;
        for (const k of [0, 1, 2]) {
            svg += `<circle cx="0" cy="${n(sy + 26 + k * 22)}" r="5" fill="#FFE1B0" stroke="${palette.outline}" stroke-width="3"/>`;
        }
        svg += `<path d="M ${-bw + 6} ${hy - 22} Q 0 ${hy - 6} ${bw - 6} ${hy - 22}" fill="none" stroke="${palette.outline}" stroke-width="4" opacity="0.5"/>`;
    }

    if (rig.scarf) {
        const w = tw * 1.3;
        const y0 = sy + rig.headR * 0.12;
        svg += `<rect x="${n(-w / 2)}" y="${n(y0)}" width="${n(w)}" height="30" rx="14" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
        if (rig.prop === "magnifier") {
            svg += `<path d="M ${n(w / 2 - 30)} ${n(y0 + 24)} L ${n(w / 2 - 12)} ${n(y0 + 84)} L ${n(w / 2 - 46)} ${n(y0 + 80)} Z" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="5" stroke-linejoin="round"/>`;
        } else {
            for (let k = -3; k <= 3; k++) {
                svg += `<path d="M ${n(k * (w / 8))} ${n(y0 + 4)} L ${n(k * (w / 8))} ${n(y0 + 26)}" stroke="#ffffff" stroke-width="4" opacity="0.6"/>`;
            }
            svg += `<path d="M ${n(-w / 2 + 6)} ${n(y0 + 15)} L ${n(w / 2 - 6)} ${n(y0 + 15)}" stroke="#ffffff" stroke-width="3" opacity="0.6"/>`;
            svg += `<path d="M ${n(-w / 2 + 20)} ${n(y0 + 26)} L ${n(-w / 2 + 6)} ${n(y0 + 70)} L ${n(-w / 2 + 36)} ${n(y0 + 66)} Z" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="5" stroke-linejoin="round"/>`;
        }
    }
    svg += "</g>";
    return svg;
}

// ------------------------------------------------------------
// Head
// ------------------------------------------------------------

function drawHair(character, front) {
    const { palette, rig } = character;
    const R = rig.headR;
    const st = `stroke="${palette.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"`;

    if (rig.hair === "bun") {
        if (!front) {
            return `<circle cx="0" cy="${n(-R * 1.02)}" r="${n(R * 0.36)}" fill="${palette.hair}" ${st}/>`;
        }
        return (
            `<path d="M ${n(-R * 1.0)} ${n(-R * 0.05)} C ${n(-R * 1.05)} ${n(-R * 0.98)} ${n(R * 1.05)} ${n(-R * 0.98)} ${n(R * 1.0)} ${n(-R * 0.05)} C ${n(R * 0.8)} ${n(-R * 0.55)} ${n(R * 0.1)} ${n(-R * 0.62)} 0 ${n(-R * 0.5)} C ${n(-R * 0.1)} ${n(-R * 0.62)} ${n(-R * 0.8)} ${n(-R * 0.55)} ${n(-R * 1.0)} ${n(-R * 0.05)} Z" fill="${palette.hair}" ${st}/>` +
            `<path d="M 0 ${n(-R * 0.52)} L 0 ${n(-R * 0.9)}" stroke="#B9B2A8" stroke-width="4"/>`
        );
    }
    if (!front) return "";

    if (rig.hair === "tuft") {
        return (
            `<path d="M ${n(-R * 0.97)} ${n(-R * 0.3)} C ${n(-R * 0.85)} ${n(-R * 1.0)} ${n(R * 0.85)} ${n(-R * 1.0)} ${n(R * 0.97)} ${n(-R * 0.3)} C ${n(R * 0.6)} ${n(-R * 0.68)} ${n(-R * 0.6)} ${n(-R * 0.68)} ${n(-R * 0.97)} ${n(-R * 0.3)} Z" fill="${palette.hair}" ${st}/>` +
            `<path d="M ${n(-R * 0.12)} ${n(-R * 0.86)} C ${n(-R * 0.3)} ${n(-R * 1.35)} ${n(R * 0.02)} ${n(-R * 1.48)} ${n(R * 0.05)} ${n(-R * 1.14)} C ${n(R * 0.2)} ${n(-R * 1.5)} ${n(R * 0.5)} ${n(-R * 1.3)} ${n(R * 0.16)} ${n(-R * 0.86)} Z" fill="${palette.hair}" ${st}/>`
        );
    }

    // messy (default)
    return (
        `<path d="M ${n(-R * 1.03)} ${n(-R * 0.02)} C ${n(-R * 1.12)} ${n(-R * 0.82)} ${n(-R * 0.5)} ${n(-R * 1.2)} 0 ${n(-R * 1.13)} C ${n(R * 0.55)} ${n(-R * 1.2)} ${n(R * 1.12)} ${n(-R * 0.82)} ${n(R * 1.03)} ${n(-R * 0.02)} C ${n(R * 0.92)} ${n(-R * 0.42)} ${n(R * 0.62)} ${n(-R * 0.52)} ${n(R * 0.36)} ${n(-R * 0.5)} L ${n(R * 0.44)} ${n(-R * 0.74)} L ${n(R * 0.12)} ${n(-R * 0.52)} L ${n(R * 0.04)} ${n(-R * 0.78)} L ${n(-R * 0.24)} ${n(-R * 0.5)} C ${n(-R * 0.6)} ${n(-R * 0.55)} ${n(-R * 0.92)} ${n(-R * 0.42)} ${n(-R * 1.03)} ${n(-R * 0.02)} Z" fill="${palette.hair}" ${st}/>` +
        `<path d="M ${n(R * 0.02)} ${n(-R * 1.1)} C ${n(R * 0.06)} ${n(-R * 1.52)} ${n(R * 0.52)} ${n(-R * 1.52)} ${n(R * 0.46)} ${n(-R * 1.28)} C ${n(R * 0.36)} ${n(-R * 1.36)} ${n(R * 0.22)} ${n(-R * 1.28)} ${n(R * 0.2)} ${n(-R * 1.08)} Z" fill="${palette.hair}" ${st}/>`
    );
}

function drawEyes(character, preset, state) {
    const { palette, rig } = character;
    const R = rig.headR;
    const ex = R * 0.37;
    const ey = -R * 0.04;
    const mul = rig.eyeScale * preset.eyeMul;
    const erx = 29 * mul;
    const ery = 37 * mul;
    const look = state.look || preset.look || [0.25, 0];
    const blink = Math.max(0, Math.min(1, state.blink || 0));
    let svg = "";

    for (const side of [-1, 1]) {
        const cx = side * ex;
        if (preset.closedHappy) {
            svg += `<path d="M ${n(cx - 24)} ${n(ey + 8)} Q ${n(cx)} ${n(ey - 24)} ${n(cx + 24)} ${n(ey + 8)}" fill="none" stroke="${palette.outline}" stroke-width="9" stroke-linecap="round"/>`;
            continue;
        }
        const open = preset.open * (1 - blink);
        if (open < 0.14) {
            svg += `<path d="M ${n(cx - erx)} ${n(ey + 4)} Q ${n(cx)} ${n(ey + 14)} ${n(cx + erx)} ${n(ey + 4)}" fill="none" stroke="${palette.outline}" stroke-width="8" stroke-linecap="round"/>`;
            continue;
        }
        const ry = ery * open;
        const cy = ey + ery * (1 - open) * 0.55;
        svg += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(erx)}" ry="${n(ry)}" fill="#ffffff" stroke="${palette.outline}" stroke-width="${OUTLINE_W - 1}"/>`;
        const pr = Math.min(preset.pupil * mul, ry * 0.72);
        const px = cx + look[0] * erx * 0.42;
        const py = cy + look[1] * ry * 0.4 + (open < 0.7 ? ry * 0.15 : 0);
        svg += `<circle cx="${n(px)}" cy="${n(py)}" r="${n(pr)}" fill="${palette.outline}"/>`;
        svg += `<circle cx="${n(px - pr * 0.35)}" cy="${n(py - pr * 0.38)}" r="${n(Math.max(2.5, pr * 0.34))}" fill="#ffffff"/>`;
        if (preset.lidLine) {
            svg += `<path d="M ${n(cx - erx - 3)} ${n(cy - ry + 3)} L ${n(cx + erx + 3)} ${n(cy - ry + 1)}" stroke="${palette.outline}" stroke-width="9" stroke-linecap="round"/>`;
        }
    }

    // Brows
    for (const side of [-1, 1]) {
        const b = side === -1 ? preset.brows.l : preset.brows.r;
        const bx = side * ex;
        const by = ey - ery * (preset.open < 1 ? 0.75 : 1) - 20 + b.dy;
        // positive angle = inner end down (angry), negative = inner end up (worried)
        const angle = side === -1 ? b.a : -b.a;
        svg += `<path d="M ${n(bx - 26)} ${n(by)} L ${n(bx + 26)} ${n(by)}" transform="rotate(${angle} ${n(bx)} ${n(by)})" stroke="${palette.hair === "#E6E1DA" ? "#8E8478" : palette.outline}" stroke-width="11" stroke-linecap="round"/>`;
    }

    if (rig.glasses) {
        const gr = Math.max(erx, ery) + 9;
        const gy = rig.hair === "bun" ? ey + 10 : ey;
        const r = rig.hair === "bun" ? gr * 0.85 : gr;
        for (const side of [-1, 1]) {
            svg += `<circle cx="${n(side * ex)}" cy="${n(gy)}" r="${n(r)}" fill="#ffffff" fill-opacity="0.12" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
        }
        svg += `<path d="M ${n(-ex + r)} ${n(gy)} Q 0 ${n(gy - 12)} ${n(ex - r)} ${n(gy)}" fill="none" stroke="${palette.outline}" stroke-width="${OUTLINE_W}"/>`;
    }
    return svg;
}

const MOUTH_DARK = "#4A1420";
const TONGUE = "#E2607A";

function openMouthPath(w, h) {
    return `M ${n(-w / 2)} 0 Q 0 ${n(-h * 0.35)} ${n(w / 2)} 0 Q ${n(w / 2)} ${n(h * 1.05)} 0 ${n(h * 1.05)} Q ${n(-w / 2)} ${n(h * 1.05)} ${n(-w / 2)} 0 Z`;
}

function drawOpenMouth(w, h, outline, { teeth = h > 18, dShape = false } = {}) {
    const d = dShape
        ? `M ${n(-w / 2)} ${n(-h * 0.1)} L ${n(w / 2)} ${n(-h * 0.1)} Q ${n(w / 2)} ${n(h)} 0 ${n(h)} Q ${n(-w / 2)} ${n(h)} ${n(-w / 2)} ${n(-h * 0.1)} Z`
        : openMouthPath(w, h);
    let svg = `<path d="${d}" fill="${MOUTH_DARK}" stroke="${outline}" stroke-width="6" stroke-linejoin="round"/>`;
    if (h > 16) {
        svg += `<ellipse cx="0" cy="${n(h * 0.78)}" rx="${n(w * 0.26)}" ry="${n(h * 0.2)}" fill="${TONGUE}"/>`;
    }
    if (teeth) {
        svg += `<rect x="${n(-w * 0.3)}" y="${n(dShape ? -h * 0.06 : -h * 0.08)}" width="${n(w * 0.6)}" height="${n(Math.max(6, h * 0.2))}" rx="3" fill="#ffffff"/>`;
    }
    return svg;
}

function drawMouth(character, preset, state) {
    const { palette, rig } = character;
    const R = rig.headR;
    const my = R * 0.5;
    const viseme = state.mouth || "X";
    const o = palette.outline;
    let inner = "";

    if (viseme === "X") {
        switch (preset.mouth) {
            case "smile":
                inner = `<path d="M -40 -6 Q 0 34 40 -6" fill="none" stroke="${o}" stroke-width="8" stroke-linecap="round"/>`;
                break;
            case "oSmall":
                inner = `<ellipse cx="6" cy="2" rx="10" ry="12" fill="${MOUTH_DARK}" stroke="${o}" stroke-width="5"/>`;
                break;
            case "O":
                inner = `<g transform="translate(0 -14)">${drawOpenMouth(40, 44, o, { teeth: false })}</g>`;
                break;
            case "grimace":
                inner =
                    `<rect x="-36" y="-12" width="72" height="28" rx="12" fill="#ffffff" stroke="${o}" stroke-width="6"/>` +
                    `<path d="M -32 2 L 32 2 M -14 -10 L -14 14 M 6 -10 L 6 14 M 22 -10 L 22 14" stroke="${o}" stroke-width="3"/>`;
                break;
            case "laughOpen":
                inner = `<g transform="translate(0 -12)">${drawOpenMouth(84, 52, o, { dShape: true })}</g>`;
                break;
            case "smirk":
                inner = `<path d="M -26 6 L 8 4 Q 22 2 30 -10" fill="none" stroke="${o}" stroke-width="8" stroke-linecap="round"/>`;
                break;
            default:
                inner = `<path d="M -26 0 Q 0 14 26 0" fill="none" stroke="${o}" stroke-width="8" stroke-linecap="round"/>`;
        }
    } else {
        const shapes = { A: [36, 14], B: [46, 26], C: [56, 40], O: [30, 34] };
        let [w, h] = shapes[viseme] || shapes.A;
        let dShape = false;
        let dx = 0;
        if (preset.mouth === "laughOpen") {
            w *= 1.4;
            h *= 1.15;
            dShape = true;
        } else if (preset.mouth === "grimace") {
            w *= 1.15;
        } else if (preset.mouth === "smirk") {
            w *= 0.85;
            dx = 6;
        } else if (preset.mouth === "O") {
            w *= 0.85;
            h *= 1.15;
        }
        inner = `<g transform="translate(${dx} ${n(-h * 0.3)})">${drawOpenMouth(w, h, o, { dShape, teeth: h > 18 || preset.mouth === "grimace" })}</g>`;
    }
    return `<g transform="translate(0 ${n(my)})">${inner}</g>`;
}

function drawHead(character, preset, state) {
    const { palette, rig } = character;
    const R = rig.headR;
    const st = `stroke="${palette.outline}" stroke-width="${OUTLINE_W}"`;
    let svg = drawHair(character, false);

    for (const side of [-1, 1]) {
        svg += `<circle cx="${n(side * R * 0.97)}" cy="10" r="${n(R * 0.2)}" fill="${palette.skin}" ${st}/>`;
    }
    svg += `<ellipse cx="0" cy="0" rx="${R}" ry="${n(R * 0.96)}" fill="${palette.skin}" ${st}/>`;
    svg += drawHair(character, true);

    if (rig.blush || preset.mouth === "laughOpen") {
        for (const side of [-1, 1]) {
            svg += `<ellipse cx="${n(side * R * 0.58)}" cy="${n(R * 0.34)}" rx="22" ry="12" fill="#FF6B6B" fill-opacity="0.42"/>`;
        }
    }

    svg += drawEyes(character, preset, state);

    // Nose
    if (rig.hair === "tuft") {
        svg += `<ellipse cx="6" cy="${n(R * 0.24)}" rx="15" ry="12" fill="${palette.skin}" stroke="${palette.outline}" stroke-width="5"/>`;
    } else {
        svg += `<path d="M 2 ${n(R * 0.14)} Q 16 ${n(R * 0.3)} 0 ${n(R * 0.32)}" fill="none" stroke="${palette.outline}" stroke-width="5" stroke-linecap="round"/>`;
    }

    svg += drawMouth(character, preset, state);

    if (preset.sweat) {
        const x = R * 0.92;
        const y = -R * 0.55;
        svg += `<path d="M ${n(x)} ${n(y)} C ${n(x + 14)} ${n(y + 20)} ${n(x + 14)} ${n(y + 34)} ${n(x)} ${n(y + 34)} C ${n(x - 14)} ${n(y + 34)} ${n(x - 14)} ${n(y + 20)} ${n(x)} ${n(y)} Z" fill="#8FD3FF" stroke="${palette.outline}" stroke-width="4"/>`;
        svg += `<path d="M ${n(-x + 6)} ${n(y + 30)} C ${n(-x + 16)} ${n(y + 44)} ${n(-x + 16)} ${n(y + 54)} ${n(-x + 6)} ${n(y + 54)} C ${n(-x - 4)} ${n(y + 54)} ${n(-x - 4)} ${n(y + 44)} ${n(-x + 6)} ${n(y + 30)} Z" fill="#8FD3FF" stroke="${palette.outline}" stroke-width="4"/>`;
    }
    return svg;
}

// ------------------------------------------------------------
// Public: full character
// ------------------------------------------------------------

/**
 * Build an SVG <g> for a character at a given state.
 *
 * @param {object} character - entry from CHARACTERS
 * @param {{
 *   x?: number, y?: number, scale?: number, flip?: boolean,
 *   expression?: string, pose?: string, mouth?: string,
 *   blink?: number, look?: [number, number], t?: number, talking?: boolean
 * }} state
 * @returns {string} SVG markup
 */
export function renderCharacter(character, state = {}) {
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
    const preset = getExpressionPreset(expression);
    const a = anchors(character.rig);
    const seed = character.id.length * 1.7;

    // Procedural secondary motion (deterministic from t)
    let bobY = Math.sin(t * 2.1 + seed) * 2.5;
    let jitterX = 0;
    if (talking) bobY -= Math.abs(Math.sin(t * 7 + seed)) * 6;
    if (preset.tremble) jitterX = Math.sin(t * 61 + seed) * 3.5;
    if (preset.bounce) bobY -= Math.abs(Math.sin(t * 11 + seed)) * 12;
    if (expression === "shocked") bobY -= 10;
    const breathe = Math.sin(t * 2.1 + seed) * 0.012;
    const tilt = preset.tilt + Math.sin(t * 1.3 + seed) * 1.2;

    const frontArmOverHead = pose === "scared" || pose === "think";
    const backArm = drawArm(
        armPoints(pose, -1, character.rig, a),
        character,
        pose,
        -1,
    );
    const frontArm = drawArm(
        armPoints(pose, 1, character.rig, a),
        character,
        pose,
        1,
    );

    const head =
        `<g transform="translate(0 ${n(a.headCY)}) rotate(${n(tilt)} 0 ${n(character.rig.headR * 0.8)})">` +
        drawHead(character, preset, state) +
        "</g>";

    const sx = (flip ? -1 : 1) * scale;
    let svg = `<g transform="translate(${n(x + jitterX)} ${n(y + bobY)}) scale(${n(sx * 1000) / 1000} ${scale})">`;
    svg += `<ellipse cx="0" cy="${n(-bobY / scale)}" rx="${n(character.rig.torsoBottomW * 0.75)}" ry="18" fill="#000000" fill-opacity="0.28"/>`;
    svg += drawLegs(character, a);
    if (!frontArmOverHead) svg += backArm;
    svg += drawTorso(character, a, breathe);
    if (!frontArmOverHead) svg += frontArm;
    svg += head;
    if (frontArmOverHead) svg += backArm + frontArm;
    svg += "</g>";
    return svg;
}

/** Approximate top-of-head height (px, unscaled) for layout. */
export function characterHeight(character) {
    const a = anchors(character.rig);
    return -(a.headCY - character.rig.headR * 1.5);
}
