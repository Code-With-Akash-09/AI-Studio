/**
 * "Classic" kids-TV rig: round chibi proportions (head ≈ half the height),
 * thick uniform dark outlines, flat bright colours, dot/oval eyes with a
 * shine, big open mouths, rosy cheeks — animated with:
 *
 *  - head turns (front → 3/4 → profile) by projecting facial features on a sphere
 *  - walk / run cycles (bob, arm swing, lean, speed-blur legs when running)
 *  - eased pose in-betweens with anticipation, overshoot and squash-and-stretch
 *  - talking gestures (explain / wave / fist / nod), head nods on syllables
 *  - text-driven mouth shapes (X M A B C E O U F)
 *  - secondary motion: hair, scarf, gamchha, coat tails and kurta hem follow-through
 *  - comedy reactions (jump-up shock, sweat drop, gloom, dizzy swirls, tears,
 *    face-fault) and an "intense" dramatic eye for reveal beats
 *
 * Everything is drawn in code from the ORIGINAL cast's `classic` block in
 * characters.js — only the general art-direction genre is inspired by
 * classic Japanese kids' TV; no existing character design is imitated.
 *
 * Coordinates: feet at (0, 0), up is negative y, facing +x before flip.
 */

const n = (v) => Math.round(v * 10) / 10;
export const OUT = "#2A2233";
const LW = 7;
/** Classic characters are drawn a little larger on stage (they are short). */
export const CLASSIC_SCALE = 1.18;
const POSE_BLEND = 0.34;
/** Foot travel (local px, either side of the hip) per walk / run step. */
export const STEP_AMP = { walk: 40, run: 52 };

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const backOut = (p) => {
    const c = 1.9;
    const x = clamp01(p) - 1;
    return 1 + (c + 1) * x * x * x + c * x * x;
};

export function classicGeometry(C) {
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
    return classicGeometry(ch.classic).headCY;
}

function limb(d, color, width, outline = LW) {
    return (
        `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${n(width + outline * 2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
}

const stroke = (w = LW) =>
    `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ------------------------------------------------------------ motion

function motion(C, g, s) {
    const { t = 0, expression = "neutral", pose = "idle" } = s;
    const since = s.since ?? t;
    const seed = C.headR * 0.07;
    const walk = s.walk;
    const idle = !walk && !s.held && !s.move;
    const m = {
        dx: 0,
        dy: 0,
        sx: 1,
        sy: 1,
        lean: 0,
        tilt: 0,
        headDy: 0,
        headPop: 1,
        air: 0,
        fall: 0,
        trail: 0,
    };
    // breathing + weight shift
    const bob = Math.sin(t * 2.6 + seed);
    m.sy += 0.02 * bob;
    m.sx -= 0.013 * bob;
    if (idle) {
        m.dx += Math.sin(t * 0.65 + seed) * 6;
        m.lean += Math.sin(t * 0.65 + seed) * 1.4;
    }
    m.tilt = Math.sin(t * 1.4 + seed) * 2;
    // talking: bounce + head nods on syllables
    if (s.talking) {
        const lv = s.level || 0;
        m.dy -= lv * 8;
        m.sy += 0.025 * lv;
        m.headDy += lv * 7;
        m.tilt += Math.sin(t * 4.6 + seed) * 3;
        if (s.gesture === "nod") m.headDy += Math.abs(Math.sin(t * 7)) * 8;
    }
    // walk / run
    if (walk) {
        const ph = walk.phase * Math.PI * 2;
        // body is highest at mid-stance (two bobs per cycle), never jittery
        m.dy -= (0.5 - 0.5 * Math.cos(2 * ph)) * (walk.run ? 12 : 8) * walk.amt;
        m.lean += (walk.run ? 6 : 3) * walk.amt;
        m.tilt += Math.sin(ph) * 1.5 * walk.amt;
    }
    if (expression === "laughing") {
        const b = Math.abs(Math.sin(t * 11 + seed));
        m.dy -= b * 14;
        m.sy += 0.05 * (b - 0.4);
        m.sx -= 0.035 * (b - 0.4);
        m.tilt += Math.sin(t * 11) * 5;
    }
    if (expression === "scared" && !walk) {
        // trembling: low-frequency (~3 Hz) so it reads at 24fps instead of aliasing
        m.dx += Math.sin(t * 19 + seed) * 2.2;
        m.sy *= 0.96;
        m.sx *= 1.03;
    }
    if (expression === "crying") m.dy -= Math.abs(Math.sin(t * 14)) * 4;
    if (expression === "curious") m.tilt += 7;
    if (expression === "suspicious") m.tilt -= 5;
    if (expression === "shocked" && !s.held && !s.move) {
        const p = since / 0.6;
        if (p >= 0 && p < 0.12) {
            const a = Math.sin((Math.PI * p) / 0.12);
            m.sy -= 0.1 * a; // anticipation crouch
            m.sx += 0.07 * a;
        } else if (p >= 0.12 && p < 0.8) {
            m.air = Math.sin((Math.PI * (p - 0.12)) / 0.68);
            m.dy -= m.air * 115;
            m.sy += 0.16 * m.air;
            m.sx -= 0.09 * m.air;
        } else if (p >= 0.8 && p < 1) {
            const q = Math.sin((Math.PI * (p - 0.8)) / 0.2);
            m.sy -= 0.15 * q;
            m.sx += 0.11 * q;
        } else {
            m.dx += Math.sin(t * 16) * 1;
        }
    }
    // expression change → head pop
    if (since >= 0 && since < 0.25)
        m.headPop = 1 + 0.08 * Math.sin((Math.PI * since) / 0.25);
    // pose change → anticipation squash, then overshoot stretch
    const ps = s.poseSince ?? 10;
    if (s.prevPose && s.prevPose !== pose && ps < 0.45) {
        if (ps < 0.1) {
            const a = Math.sin((Math.PI * ps) / 0.1);
            m.sy -= 0.07 * a;
            m.sx += 0.05 * a;
        } else if (ps < 0.4) {
            const q = Math.sin((Math.PI * (ps - 0.1)) / 0.3);
            m.sy += 0.05 * q;
            m.sx -= 0.03 * q;
        }
    }
    // landing squash after a hop / jump / run stop
    const sa = s.stopAge ?? 10;
    if (sa >= 0 && sa < 0.3) {
        const q = Math.sin((Math.PI * sa) / 0.3) * (1 - sa / 0.3);
        m.sy -= 0.14 * q;
        m.sx += 0.1 * q;
    }
    if (
        s.catchSince !== null &&
        s.catchSince !== undefined &&
        s.catchSince < 0.45
    ) {
        const q =
            Math.sin((Math.PI * s.catchSince) / 0.45) *
            (1 - s.catchSince / 0.45);
        m.sy -= 0.12 * q;
        m.sx += 0.08 * q;
        m.dy += 10 * q;
    }
    if (s.held) m.tilt += Math.sin(t * 6) * 3;
    if (pose === "action") m.lean += 9;
    // face-fault: stiffen + hop, fall with overshoot, bounce, recover
    if (pose === "facefault") {
        if (ps < 0.1) {
            m.dy -= Math.sin((Math.PI * ps) / 0.1) * 30;
            m.sy += 0.06;
        } else {
            const p = clamp01((ps - 0.1) / 0.22);
            let f = p * p;
            if (ps > 0.32) {
                const q = ps - 0.32;
                f = 1 + Math.sin(q * 22) * Math.exp(-q * 7) * 0.09;
                m.dy -= Math.max(0, Math.sin(q * 22)) * Math.exp(-q * 7) * 16;
            }
            m.fall = f;
        }
    } else if (s.prevPose === "facefault" && ps < 0.42) {
        const p = ps / 0.42;
        m.fall = 1 - backOut(p);
        m.dy -= Math.sin(Math.PI * p) * 40;
    }
    // secondary-motion drive: speed + follow-through spring + wind
    const speed = Math.min(1, Math.abs(s.vx || 0) / 900);
    let spring = 0;
    if (sa >= 0 && sa < 0.8)
        spring = Math.sin(sa * 15) * Math.exp(-sa * 5) * 0.7;
    m.trail = Math.max(
        -0.6,
        Math.min(1.4, speed + spring + (s.wind || 0) * 1.1),
    );
    return m;
}

// ------------------------------------------------------------ arms + legs

function poseHand(pose, side, C, g, t) {
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
            // both hands clutching the belly
            return [side * C.bodyW * 0.16, g.bodyBottom - C.bodyH * 0.22];
        case "shrug":
            return [side * (ax + 88), sy - 10];
        case "hips":
            return [side * C.bodyW * 0.47, g.bodyTop + C.bodyH * 0.72];
        case "catch":
            return [side > 0 ? ax + 70 : ax + 20, sy + 34];
        case "action":
            return side > 0 ? [ax + 150, sy - 34] : [-(ax + 70), sy + 26];
        case "scratch":
            return side > 0
                ? [R * 0.35 + Math.sin(t * 12) * 6, g.headCY - R * 0.62]
                : idle;
        case "adjust":
            return side > 0 ? [R * 0.14, g.headCY + R * 0.12] : idle;
        case "facefault":
            return [
                side * (ax + 36) + Math.sin(t * 9 + side) * 10,
                sy - 96 + Math.cos(t * 8 + side) * 7,
            ];
        default:
            return idle;
    }
}

function handTarget(C, g, s, side) {
    const { t = 0, pose = "idle" } = s;
    const cur = poseHand(pose, side, C, g, t);
    const prev = poseHand(s.prevPose || pose, side, C, g, t);
    const p = (s.poseSince ?? 10) / POSE_BLEND;
    let w;
    if (p < 0.2)
        w = -0.12 * Math.sin((Math.PI * p) / 0.2); // anticipation
    else w = backOut((p - 0.2) / 0.8); // overshoot + settle
    let H = [
        prev[0] + (cur[0] - prev[0]) * w,
        prev[1] + (cur[1] - prev[1]) * w,
    ];
    const ax = g.shoulderX;
    const sy = g.shoulderY;
    // talking gestures layered on an idle pose
    if (s.talking && pose === "idle" && s.gesture) {
        const lv = 0.6 + 0.4 * (s.level || 0);
        switch (s.gesture) {
            case "wave":
                if (side > 0) H = [ax + 60 + Math.sin(t * 14) * 26, sy - 92];
                break;
            case "fist":
                if (side > 0)
                    H = [
                        ax + 44,
                        sy - 30 - Math.abs(Math.sin(t * 6)) * 45 * lv,
                    ];
                break;
            case "nod":
                break;
            default: // explain: open hands at chest height, moving with the speech
                H = [
                    side * (ax + 34) + Math.sin(t * 5 + side) * 14 * lv,
                    sy + 28 - Math.abs(Math.sin(t * 4 + side * 0.8)) * 34 * lv,
                ];
        }
    }
    // walk / run arm swing
    if (s.walk) {
        const ph = s.walk.phase * Math.PI * 2 + (side > 0 ? 0 : Math.PI);
        const a = s.walk.amt;
        const swing = Math.cos(ph) * (s.walk.run ? 44 : 30) * a;
        H = [
            H[0] + swing,
            H[1] - Math.abs(Math.cos(ph)) * (s.walk.run ? 14 : 6) * a,
        ];
    }
    return H;
}

function drawArm(C, g, s, side) {
    const S = [side * g.shoulderX, g.shoulderY];
    const H = handTarget(C, g, s, side);
    const E =
        s.pose === "hips"
            ? [side * (g.shoulderX + 52), (S[1] + H[1]) / 2]
            : [(S[0] + H[0]) / 2 + side * 16, (S[1] + H[1]) / 2 + 12];
    const color = C.body === "saree" ? C.skin : C.outfit;
    let svg = limb(
        `M ${n(S[0])} ${n(S[1])} Q ${n(E[0])} ${n(E[1])} ${n(H[0])} ${n(H[1])}`,
        color,
        30,
    );
    const holdsProp =
        C.prop === "magnifier" &&
        side > 0 &&
        (s.pose === "point" || s.pose === "action");
    if (holdsProp) {
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

function drawLegs(C, g, s) {
    const { t = 0, pose = "idle" } = s;
    let svg = "";
    const legW = C.body === "saree" ? 28 : 36;
    const walk = s.walk;
    for (const side of [-1, 1]) {
        let hx = side * C.bodyW * 0.2;
        let end;
        let knee = null;
        if (pose === "facefault") {
            const kick = Math.sin(t * 9 + side) * 10;
            end = [hx + C.bodyW * 0.5 + 95, g.hipY + side * 26 + kick];
        } else if (s.held || s.move === "jump") {
            const kick = Math.sin(t * 10 + side * 2) * 10;
            end = [hx + 30 + kick, g.hipY + 34];
        } else if (walk) {
            // planted-foot cycle: during stance the foot moves back linearly at
            // exactly the body speed (stride = 4*amp, see acting.js), during
            // swing it eases forward with a lift — no foot sliding
            hx *= 0.4;
            const amp = (walk.run ? STEP_AMP.run : STEP_AMP.walk) * walk.amt;
            const q = (((walk.phase + (side > 0 ? 0 : 0.5)) % 1) + 1) % 1;
            let fx;
            let lift = 0;
            if (q < 0.5) {
                fx = amp * (1 - 4 * q);
            } else {
                const w = (q - 0.5) * 2;
                fx = -amp + 2 * amp * (0.5 - 0.5 * Math.cos(Math.PI * w));
                lift = Math.sin(Math.PI * w) * (walk.run ? 34 : 22) * walk.amt;
            }
            fx += hx;
            end = [fx, -16 - lift];
            knee = [(hx + fx) / 2 + 6 + lift * 0.8, (g.hipY - 8 + end[1]) / 2];
        } else if (pose === "action") {
            end = [hx * 2.6 + side * 10, -16];
        } else {
            end = [hx + side * 4, -16];
        }
        const d = knee
            ? `M ${n(hx)} ${n(g.hipY - 8)} Q ${n(knee[0])} ${n(knee[1])} ${n(end[0])} ${n(end[1])}`
            : `M ${n(hx)} ${n(g.hipY - 8)} L ${n(end[0])} ${n(end[1])}`;
        svg += limb(d, C.pants, legW);
        const up = pose === "facefault";
        svg += `<ellipse cx="${n(end[0] + 8)}" cy="${n(end[1] + (up ? 0 : 2))}" rx="${up ? 20 : 30}" ry="${up ? 28 : 18}" fill="${C.shoes}" ${stroke()}/>`;
    }
    return svg;
}

// ------------------------------------------------------------ body

function roundedTrapezoid(tw, bw, top, bot, r) {
    return `M ${n(-tw)} ${n(top + r)} Q ${n(-tw)} ${n(top)} ${n(-tw + r)} ${n(top)} L ${n(tw - r)} ${n(top)} Q ${n(tw)} ${n(top)} ${n(tw)} ${n(top + r)} L ${n(bw)} ${n(bot - r)} Q ${n(bw)} ${n(bot)} ${n(bw - r)} ${n(bot)} L ${n(-bw + r)} ${n(bot)} Q ${n(-bw)} ${n(bot)} ${n(-bw)} ${n(bot - r)} Z`;
}

/** Things that hang behind the body (scarf / gamchha ends, coat tail). */
function drawBehind(C, g, m, t) {
    const top = g.bodyTop;
    const tr = m.trail;
    const flutter = Math.sin(t * (8 + tr * 14)) * (6 + tr * 10);
    if (C.body === "coat") {
        const bw = C.bodyW * 0.5;
        return `<path d="M ${n(-bw + 6)} ${n(g.bodyBottom - 40)} L ${n(-bw - 10 - tr * 40)} ${n(g.bodyBottom + 4 - tr * 10 + flutter * 0.3)} L ${n(-bw + 30)} ${n(g.bodyBottom - 2)} Z" fill="${C.outfitDark}" ${stroke(5)}/>`;
    }
    if (C.gamchha) {
        const x0 = -C.bodyW * 0.24;
        const d = `M ${n(x0)} ${n(top + 6)} Q ${n(x0 - 30 - tr * 40)} ${n(top + 50 - tr * 20)} ${n(x0 - 26 - tr * 95)} ${n(top + 100 - tr * 55 + flutter)}`;
        return (
            limb(d, C.gamchha, 32, 6) +
            `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="10 14" stroke-linecap="round"/>`
        );
    }
    return "";
}

function drawBody(C, g, m, t) {
    const top = g.bodyTop;
    const bot = g.bodyBottom;
    const tr = m.trail;
    let svg = "";
    if (C.body === "round") {
        const cy = (top + bot) / 2 + 4;
        svg += `<ellipse cx="0" cy="${n(cy)}" rx="${n(C.bodyW / 2)}" ry="${n(C.bodyH / 2 + 8)}" fill="${C.outfit}" ${stroke()}/>`;
        svg += `<path d="M 0 ${n(top + 20)} L 0 ${n(top + C.bodyH * 0.55)}" ${stroke(5)}/>`;
        for (const k of [0.28, 0.45]) {
            svg += `<circle cx="9" cy="${n(top + C.bodyH * k)}" r="5.5" fill="${C.shirt}" ${stroke(3)}/>`;
        }
        // kurta hem: flutters and trails with movement
        let hem = "";
        for (let i = 0; i <= 8; i++) {
            const u = i / 8;
            const x = -C.bodyW * 0.46 + u * C.bodyW * 0.92;
            const y =
                cy +
                C.bodyH * 0.3 +
                Math.sin(Math.PI * u) * C.bodyH * 0.22 +
                Math.sin(u * 9 + t * (7 + tr * 10)) * (1.5 + tr * 4);
            hem += `${i ? "L" : "M"} ${n(x - tr * 6 * u)} ${n(y)} `;
        }
        svg += `<path d="${hem}" fill="none" stroke="${C.outfitDark}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
        if (C.gamchha) {
            svg += `<path d="M ${n(-C.bodyW * 0.34)} ${n(top + 2)} Q 0 ${n(top + 30)} ${n(C.bodyW * 0.34)} ${n(top + 2)} Q 0 ${n(top + 14)} ${n(-C.bodyW * 0.34)} ${n(top + 2)} Z" fill="${C.gamchha}" ${stroke(6)}/>`;
            svg += `<path d="M ${n(-C.bodyW * 0.26)} ${n(top + 10)} Q 0 ${n(top + 30)} ${n(C.bodyW * 0.26)} ${n(top + 10)}" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="9 12"/>`;
        } else {
            svg += `<ellipse cx="0" cy="${n(top + 8)}" rx="${n(C.bodyW * 0.3)}" ry="15" fill="${C.accent}" ${stroke(6)}/>`;
        }
        return svg;
    }
    if (C.body === "saree") {
        const tw = C.bodyW * 0.3;
        const bw = C.bodyW * 0.54;
        const mid = (top + bot) / 2;
        const sway = Math.sin(t * 2) * 3 - tr * 10;
        const d = `M ${n(-tw)} ${n(top + 20)} Q ${n(-tw)} ${n(top)} ${n(-tw + 20)} ${n(top)} L ${n(tw - 20)} ${n(top)} Q ${n(tw)} ${n(top)} ${n(tw)} ${n(top + 20)} Q ${n(bw * 0.9)} ${n(mid)} ${n(bw + sway)} ${n(bot - 6)} Q 0 ${n(bot + 14)} ${n(-bw + sway)} ${n(bot - 6)} Q ${n(-bw * 0.9)} ${n(mid)} ${n(-tw)} ${n(top + 20)} Z`;
        svg += `<path d="${d}" fill="${C.outfit}" ${stroke()}/>`;
        svg += `<path d="M ${n(-bw * 0.97 + sway)} ${n(bot - 18)} Q 0 ${n(bot + 2)} ${n(bw * 0.97 + sway)} ${n(bot - 18)}" fill="none" stroke="${C.accent}" stroke-width="12" stroke-linecap="round"/>`;
        svg += limb(
            `M ${n(-tw * 0.7)} ${n(top + 6)} Q ${n(bw * 0.2)} ${n(mid - 10)} ${n(bw * 0.78)} ${n(bot - 36)}`,
            C.outfitDark,
            34,
            5,
        );
        svg += `<path d="M ${n(-tw * 0.7 + 12)} ${n(top + 16)} Q ${n(bw * 0.2 + 10)} ${n(mid)} ${n(bw * 0.78 + 4)} ${n(bot - 22)}" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>`;
        return svg;
    }
    // coat (Raazu)
    const tw = C.bodyW * 0.4;
    const bw = C.bodyW * 0.5;
    svg += `<path d="${roundedTrapezoid(tw, bw, top, bot, 26)}" fill="${C.outfit}" ${stroke()}/>`;
    svg += `<path d="M ${n(-tw * 0.5)} ${n(top + 2)} L ${n(tw * 0.5)} ${n(top + 2)} L 0 ${n(top + C.bodyH * 0.58)} Z" fill="${C.shirt}" ${stroke(5)}/>`;
    svg += `<path d="M 0 ${n(top + C.bodyH * 0.58)} L 0 ${n(bot - 4)}" ${stroke(5)}/>`;
    for (const k of [0.68, 0.84]) {
        svg += `<circle cx="-11" cy="${n(top + C.bodyH * k)}" r="6" fill="${C.outfitDark}" ${stroke(3)}/>`;
    }
    svg += `<path d="M ${n(bw * 0.3)} ${n(bot - 34)} L ${n(bw * 0.75)} ${n(bot - 34)}" stroke="${C.outfitDark}" stroke-width="6" stroke-linecap="round"/>`;
    // scarf tail streams back with speed / wind
    const flutter = Math.sin(t * (6 + tr * 16)) * (8 + tr * 10);
    svg += limb(
        `M ${n(-tw * 0.35)} ${n(top + 10)} Q ${n(-tw * 0.55 - tr * 50 + flutter * 0.4)} ${n(top + 60 - tr * 30)} ${n(-tw * 0.45 - tr * 120 + flutter)} ${n(top + 96 - tr * 70)}`,
        C.accent,
        30,
    );
    svg += `<ellipse cx="0" cy="${n(top + 4)}" rx="${n(tw * 0.95)}" ry="19" fill="${C.accent}" ${stroke(6)}/>`;
    return svg;
}

// ------------------------------------------------------------ head

/** Sphere projection for facial features (yaw in [-1, 1] → ±65°). */
function projector(R, yaw) {
    const th = (yaw * 65 * Math.PI) / 180;
    return (fx) => {
        const phi = Math.asin(Math.max(-1, Math.min(1, fx / R)));
        const a = phi + th;
        return { x: R * Math.sin(a), sc: Math.cos(a), a };
    };
}

function hairCap(R, { sideY, fringeY, bumps, depth }) {
    let d = `M ${n(-R * 1.02)} ${n(sideY)} A ${n(R * 1.05)} ${n(R * 1.07)} 0 1 1 ${n(R * 1.02)} ${n(sideY)} L ${n(R * 0.9)} ${n(fringeY)}`;
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

function drawHairFront(C, R, t, yaw, m, wind) {
    const shift = -Math.sin((yaw * 65 * Math.PI) / 180) * R * 0.12;
    const tr = m.trail;
    let s = `<g transform="translate(${n(shift)} 0)">`;
    if (C.hair === "cowlick") {
        const sway = Math.sin(t * 3.3) * 3;
        for (const [deg, len, i] of [
            [-138, 1.3, 0],
            [-112, 1.42, 1],
            [-84, 1.36, 2],
            [-58, 1.27, 3],
        ]) {
            const flick = Math.sin(t * (10 + wind * 26) + i) * (2 + wind * 7);
            const a = ((deg + sway - tr * 22 + flick) * Math.PI) / 180;
            const w = 0.26;
            const L = len + wind * 0.12;
            const p = (ang, r) =>
                `${n(Math.cos(ang) * R * r)} ${n(Math.sin(ang) * R * r)}`;
            s += `<path d="M ${p(a - w, 0.9)} Q ${p(a - w * 0.3, L * 0.95)} ${p(a + 0.05, L)} Q ${p(a + w * 0.4, L * 0.9)} ${p(a + w, 0.9)} Z" fill="${C.hairColor}" ${stroke()}/>`;
        }
        s += `<path d="${hairCap(R, { sideY: R * 0.12, fringeY: -R * 0.44, bumps: 4, depth: R * 0.24 })}" fill="${C.hairColor}" ${stroke()}/>`;
    } else if (C.hair === "swirl") {
        // one soft swirl lock on top (follows movement)
        const rot =
            -tr * 26 + Math.sin(t * 4) * 5 + Math.sin(t * 26) * wind * 6;
        s += `<g transform="rotate(${n(rot)} 0 ${n(-R * 0.98)})"><path d="M ${n(-R * 0.22)} ${n(-R * 0.92)} C ${n(-R * 0.36)} ${n(-R * 1.42)} ${n(R * 0.36)} ${n(-R * 1.58)} ${n(R * 0.36)} ${n(-R * 1.22)} C ${n(R * 0.36)} ${n(-R * 1.02)} ${n(R * 0.08)} ${n(-R * 1.0)} ${n(R * 0.08)} ${n(-R * 1.18)} C ${n(R * 0.08)} ${n(-R * 1.28)} ${n(R * 0.2)} ${n(-R * 1.28)} ${n(R * 0.2)} ${n(-R * 1.2)} L ${n(R * 0.22)} ${n(-R * 0.9)} Z" fill="${C.hairColor}" ${stroke()}/></g>`;
        s += `<path d="${hairCap(R, { sideY: -R * 0.12, fringeY: -R * 0.56, bumps: 5, depth: R * 0.13 })}" fill="${C.hairColor}" ${stroke()}/>`;
    } else {
        s += `<path d="${hairCap(R, { sideY: R * 0.05, fringeY: -R * 0.46, bumps: 2, depth: R * 0.16 })}" fill="${C.hairColor}" ${stroke()}/>`;
    }
    return `${s}</g>`;
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
        case "intense":
            return "intense";
        default:
            return "open";
    }
}

function drawEyes(C, R, s, uid, proj) {
    const { expression = "neutral", talking = false, t = 0 } = s;
    const round = C.eyes === "round";
    const ex = R * (round ? 0.4 : 0.36);
    const ey = R * 0.06;
    const rx = R * (round ? 0.2 : 0.18);
    const ry = R * (round ? 0.23 : 0.25);
    const mode = eyeMode(expression, talking);
    const look = s.look || [0.55, 0];
    const blink = s.blink || 0;
    const yaw = s.yaw || 0;
    let svg = "";
    const visible = [];
    for (const side of [-1, 1]) {
        const P = proj(side * ex);
        if (P.sc < 0.15) continue;
        const k = 0.45 + 0.55 * P.sc;
        const cx = P.x;
        const erxBase = rx * k;
        visible.push({ side, cx, k });
        if (mode === "arc") {
            svg += `<path d="M ${n(cx - erxBase)} ${n(ey + ry * 0.25)} Q ${n(cx)} ${n(ey - ry * 1.0)} ${n(cx + erxBase)} ${n(ey + ry * 0.25)}" fill="none" ${stroke(9)}/>`;
            continue;
        }
        if (mode === "chevron") {
            const dir = -side;
            svg += `<path d="M ${n(cx - dir * erxBase)} ${n(ey - ry * 0.55)} L ${n(cx + dir * erxBase * 0.7)} ${n(ey)} L ${n(cx - dir * erxBase)} ${n(ey + ry * 0.55)}" fill="none" ${stroke(9)}/>`;
            continue;
        }
        if (mode === "shut") {
            svg += `<path d="M ${n(cx - erxBase)} ${n(ey)} q ${n(erxBase / 2)} ${n(-ry * 0.35)} ${n(erxBase)} 0 t ${n(erxBase)} 0" fill="none" ${stroke(8)}/>`;
            continue;
        }
        if (blink > 0.55 && mode !== "shock" && mode !== "swirl") {
            svg += `<path d="M ${n(cx - erxBase)} ${n(ey)} Q ${n(cx)} ${n(ey + ry * 0.45)} ${n(cx + erxBase)} ${n(ey)}" fill="none" ${stroke(8)}/>`;
            continue;
        }
        let erx = erxBase;
        let ery = ry * (1 - blink * 0.6);
        if (mode === "shock") {
            erx *= 1.28;
            ery *= 1.22;
        }
        if (mode === "intense") {
            erx *= 1.12;
            ery *= 0.92;
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
        const px = cx + (look[0] * 0.38 + yaw * 0.2) * erx;
        const py =
            ey +
            look[1] * ery * 0.4 +
            (expression === "curious" ? -ery * 0.15 : 0);
        if (mode === "shock") {
            svg += `<circle cx="${n(cx)}" cy="${n(ey)}" r="${n(erx * 0.2)}" fill="${OUT}"/>`;
            continue;
        }
        if (mode === "intense") {
            const clip = `${uid}-iris${side}`;
            const ir = Math.min(erx, ery) * 0.78;
            svg += `<defs><clipPath id="${clip}"><ellipse cx="${n(cx)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}"/></clipPath></defs><g clip-path="url(#${clip})">`;
            svg += `<circle cx="${n(px)}" cy="${n(ey)}" r="${n(ir)}" fill="${C.iris || "#3A2A1E"}" ${stroke(4)}/>`;
            svg += `<circle cx="${n(px)}" cy="${n(ey)}" r="${n(ir * 0.62)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="3"/>`;
            svg += `<circle cx="${n(px)}" cy="${n(ey)}" r="${n(ir * 0.34)}" fill="${OUT}"/>`;
            svg += `<path d="M ${n(px - ir * 0.2)} ${n(ey - ir * 0.95)} L ${n(px + ir * 0.12)} ${n(ey - ir * 0.95)} L ${n(px - ir * 0.05)} ${n(ey - ir * 0.05)} Z" fill="#FFFFFF"/>`;
            svg += `<circle cx="${n(px + ir * 0.45)}" cy="${n(ey + ir * 0.4)}" r="${n(ir * 0.12)}" fill="#FFFFFF"/>`;
            // heavy upper lid shadow
            svg += `<rect x="${n(cx - erx - 4)}" y="${n(ey - ery - 4)}" width="${n(erx * 2 + 8)}" height="${n(ery * 0.42)}" fill="${C.skin}"/>`;
            svg += "</g>";
            svg += `<path d="M ${n(cx - erx * 1.08)} ${n(ey - ery * 0.5 - side * 6)} L ${n(cx + erx * 1.08)} ${n(ey - ery * 0.5 + side * 6)}" ${stroke(10)}/>`;
            continue;
        }
        const tremble = mode === "small" ? Math.sin(t * 47 + side) * 2.5 : 0;
        const prx = erx * (mode === "small" ? 0.34 : 0.52);
        const pry = ery * (mode === "small" ? 0.34 : 0.56);
        svg += `<ellipse cx="${n(px + tremble)}" cy="${n(py)}" rx="${n(prx)}" ry="${n(pry)}" fill="${OUT}"/>`;
        svg += `<circle cx="${n(px + tremble + prx * 0.35)}" cy="${n(py - pry * 0.4)}" r="${n(Math.max(2, prx * 0.38))}" fill="#FFFFFF"/>`;
        if (mode === "lid") {
            const clip = `${uid}-lid${side}`;
            svg += `<defs><clipPath id="${clip}"><ellipse cx="${n(cx)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}"/></clipPath></defs>`;
            svg += `<rect x="${n(cx - erx - 4)}" y="${n(ey - ery - 4)}" width="${n(erx * 2 + 8)}" height="${n(ery * 0.95)}" fill="${C.skin}" clip-path="url(#${clip})"/>`;
            svg += `<path d="M ${n(cx - erx)} ${n(ey - ery * 0.05 + side * 4)} L ${n(cx + erx)} ${n(ey - ery * 0.05 - side * 4)}" ${stroke(8)}/>`;
        }
    }
    // brows (with talking eyebrow lifts)
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
        intense: [-16, 8],
    }[expression] || [0, 0];
    const talkLift = s.talking ? Math.max(0, (s.level || 0) - 0.55) * 18 : 0;
    for (const v of visible) {
        const { side, cx, k } = v;
        const ib = bl * k;
        const inner = [cx - side * ib, by - lift[0] - talkLift];
        const outer = [cx + side * ib, by - lift[1] - talkLift * 0.5];
        if (expression === "curious" && side < 0) inner[1] = by + 2;
        svg += `<path d="M ${n(inner[0])} ${n(inner[1])} Q ${n(cx)} ${n(Math.min(inner[1], outer[1]) - 8)} ${n(outer[0])} ${n(outer[1])}" fill="none" ${stroke(expression === "intense" ? 11 : 9)}/>`;
    }
    if (expression === "crying") {
        for (const v of visible) {
            const side = v.side;
            const sx = v.cx + side * rx * 0.4;
            const wob = Math.sin(t * 16 + side) * 6;
            svg += limb(
                `M ${n(sx)} ${n(ey + 6)} Q ${n(v.cx + side * rx * 2.4)} ${n(ey - ry * 0.6 + wob)} ${n(v.cx + side * rx * 3.1)} ${n(ey + R * 0.95)}`,
                "#8ED8FF",
                16,
                3.5,
            );
            for (let i = 0; i < 3; i++) {
                const p = (t * 1.8 + i / 3) % 1;
                const dx = v.cx + side * rx * (1.5 + p * 2.4);
                const dy = ey - ry * 0.4 + p * p * R * 0.9;
                svg += `<circle cx="${n(dx)}" cy="${n(dy)}" r="7" fill="#8ED8FF" ${stroke(3)}/>`;
            }
        }
    }
    if (expression === "laughing") {
        for (const v of visible) {
            const side = v.side;
            svg += `<path d="M ${n(v.cx + side * rx * 1.1)} ${n(ey + 2)} c ${n(side * 6)} 10 ${n(side * 8)} 18 0 22 c ${n(-side * 8)} -4 ${n(-side * 6)} -12 0 -22 Z" fill="#8ED8FF" ${stroke(3)}/>`;
        }
    }
    return { svg, ex, ey, rx, ry, visible };
}

function mouthPath(shape, open, w, R) {
    switch (shape) {
        case "round": {
            const rx = R * (0.08 + 0.08 * open);
            const ry = R * (0.08 + 0.13 * open);
            return `M 0 0 m ${n(-rx)} ${n(ry)} a ${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0 Z`;
        }
        case "pucker": {
            const rx = R * 0.055;
            const ry = R * 0.075;
            return `M 0 0 m ${n(-rx)} ${n(ry)} a ${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0 Z`;
        }
        case "wide": {
            const ww = w * 1.25;
            const h = R * (0.08 + 0.1 * open);
            return `M ${n(-ww)} 0 Q 0 ${n(-h * 0.25)} ${n(ww)} 0 Q ${n(ww * 0.92)} ${n(h)} 0 ${n(h * 1.05)} Q ${n(-ww * 0.92)} ${n(h)} ${n(-ww)} 0 Z`;
        }
        case "wail": {
            const ww = w * 1.1;
            const h = R * (0.16 + 0.22 * open);
            return `M ${n(-ww)} ${n(h * 0.25)} Q 0 ${n(-h * 0.35)} ${n(ww)} ${n(h * 0.25)} L ${n(ww * 0.7)} ${n(h)} Q 0 ${n(h * 1.15)} ${n(-ww * 0.7)} ${n(h)} Z`;
        }
        default: {
            const ww = w * (1 + 0.25 * open);
            const h = R * (0.1 + 0.3 * open);
            return `M ${n(-ww)} 0 Q 0 ${n(ww * 0.12)} ${n(ww)} 0 C ${n(ww)} ${n(h * 0.75)} ${n(ww * 0.55)} ${n(h)} 0 ${n(h)} C ${n(-ww * 0.55)} ${n(h)} ${n(-ww)} ${n(h * 0.75)} ${n(-ww)} 0 Z`;
        }
    }
}

function drawMouth(C, R, s, uid, proj) {
    const { expression = "neutral", talking = false, mouth = "X" } = s;
    const my = R * (C.eyes === "round" ? 0.5 : 0.54);
    const P = proj(R * 0.04);
    const kx = 0.55 + 0.45 * Math.max(0, P.sc);
    const w = R * 0.22;
    let shape = "d";
    let open = 0;
    let teeth = false;
    let lip = false;
    if (talking) {
        switch (mouth) {
            case "M":
                shape = "pressed";
                break;
            case "F":
                shape = "wide";
                open = 0.25;
                teeth = true;
                lip = true;
                break;
            case "A":
                open = 0.35;
                break;
            case "B":
                open = 0.65;
                break;
            case "C":
                open = 1;
                break;
            case "E":
                shape = "wide";
                open = 0.6;
                teeth = true;
                break;
            case "O":
                shape = "round";
                open = 0.75;
                break;
            case "U":
                shape = "pucker";
                open = 0.4;
                break;
            default:
                shape = "line";
        }
    }
    switch (expression) {
        case "happy":
            if (shape === "d" || shape === "line" || !talking) {
                shape = "d";
                open = Math.max(open, talking ? 0.3 : 0.5);
            }
            break;
        case "laughing":
            shape = "d";
            open = Math.max(open, 0.85);
            break;
        case "shocked":
            if (!talking || shape !== "pressed") {
                shape = "round";
                open = Math.max(open, 0.9);
            }
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
        case "scared":
            if (!talking) shape = "wavy";
            break;
        case "intense":
            if (!talking) shape = "pressed";
            break;
        default:
            if (!talking) shape = "line";
    }
    const g = `<g transform="translate(${n(P.x * 0.92)} ${n(my)}) scale(${n(kx * 100) / 100} 1)">`;
    if (shape === "wavy") {
        return `${g}<path d="M ${n(-w)} 0 q ${n(w / 4)} -12 ${n(w / 2)} 0 t ${n(w / 2)} 0 t ${n(w / 2)} 0 t ${n(w / 2)} 0" fill="none" ${stroke(7)}/></g>`;
    }
    if (shape === "pressed") {
        return `${g}<path d="M ${n(-w * 0.55)} 2 L ${n(w * 0.55)} 2" ${stroke(9)}/></g>`;
    }
    if (shape === "line") {
        if (expression === "suspicious") {
            return `${g}<path d="M ${n(-w * 0.8)} 6 Q 0 10 ${n(w * 0.8)} -8" fill="none" ${stroke(7)}/></g>`;
        }
        return `${g}<path d="M ${n(-w * 0.85)} 0 Q 0 ${n(w * 0.55)} ${n(w * 0.85)} 0" fill="none" ${stroke(7)}/></g>`;
    }
    const clip = `${uid}-mouth`;
    const d = mouthPath(shape, open, w, R);
    let svg = `${g}<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`;
    svg += `<path d="${d}" fill="#7A1A2C"/>`;
    svg += `<g clip-path="url(#${clip})">`;
    if (shape !== "pucker") {
        svg += `<ellipse cx="0" cy="${n(R * 0.34)}" rx="${n(w * 0.7)}" ry="${n(R * 0.14)}" fill="#FF7A8A"/>`;
    }
    if (shape === "d" || teeth) {
        svg += `<rect x="${n(-w * 1.5)}" y="-8" width="${n(w * 3)}" height="${n(R * 0.05 + 8)}" fill="#FFFFFF"/>`;
    }
    svg += "</g>";
    svg += `<path d="${d}" fill="none" ${stroke(6)}/>`;
    if (lip)
        svg += `<path d="M ${n(-w * 0.8)} ${n(R * 0.1)} Q 0 ${n(R * 0.05)} ${n(w * 0.8)} ${n(R * 0.1)}" fill="none" ${stroke(6)}/>`;
    return `${svg}</g>`;
}

function drawGlasses(C, eyes, glint, proj) {
    if (!C.glasses) return "";
    const { ey, rx, ry, visible } = eyes;
    let svg = "";
    const lenses = visible.map((v) => ({ ...v }));
    if (!lenses.length) return "";
    if (C.glasses === "softsquare") {
        for (const L of lenses) {
            const w = rx * 2.7 * L.k;
            const h = ry * 2.25;
            const x = L.cx - w / 2;
            const y = ey - h / 2;
            L.l = x;
            L.r = x + w;
            svg += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(w * 0.3)}" fill="#E6F7FF" fill-opacity="${n(0.18 + glint * 0.7)}" stroke="${OUT}" stroke-width="12"/>`;
            svg += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(w * 0.3)}" fill="none" stroke="${C.glassesColor}" stroke-width="5"/>`;
            svg += `<path d="M ${n(x + w * 0.2)} ${n(y + h * 0.42)} L ${n(x + w * 0.42)} ${n(y + h * 0.18)}" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
        }
    } else {
        for (const L of lenses) {
            const r = rx * 1.2;
            L.l = L.cx - r * L.k;
            L.r = L.cx + r * L.k;
            svg += `<ellipse cx="${n(L.cx)}" cy="${n(ey + ry * 0.3)}" rx="${n(r * L.k)}" ry="${n(r)}" fill="#E6F7FF" fill-opacity="0.2" stroke="${OUT}" stroke-width="10"/><ellipse cx="${n(L.cx)}" cy="${n(ey + ry * 0.3)}" rx="${n(r * L.k)}" ry="${n(r)}" fill="none" stroke="${C.glassesColor}" stroke-width="4"/>`;
        }
    }
    const gy = C.glasses === "small" ? ey + ry * 0.3 : ey - 6;
    if (lenses.length === 2) {
        svg += `<path d="M ${n(lenses[0].r)} ${n(gy)} Q ${n((lenses[0].r + lenses[1].l) / 2)} ${n(gy - 12)} ${n(lenses[1].l)} ${n(gy)}" fill="none" ${stroke(8)}/>`;
    } else {
        // profile: temple arm back to the ear
        const L = lenses[0];
        const ear = proj(-eyes.R * 0.98 * Math.sign(L.cx || 1));
        svg += `<path d="M ${n(L.cx > 0 ? L.l : L.r)} ${n(gy)} L ${n(ear.x)} ${n(gy + 8)}" ${stroke(8)}/>`;
    }
    if (glint > 0.05 && lenses.length) {
        const L = lenses[lenses.length - 1];
        const gx = L.cx + rx * 0.7;
        const gyy = ey - ry * 0.8;
        const sz = 18 + glint * 26;
        svg += `<path d="M ${n(gx)} ${n(gyy - sz)} Q ${n(gx + 4)} ${n(gyy - 4)} ${n(gx + sz)} ${n(gyy)} Q ${n(gx + 4)} ${n(gyy + 4)} ${n(gx)} ${n(gyy + sz)} Q ${n(gx - 4)} ${n(gyy + 4)} ${n(gx - sz)} ${n(gyy)} Q ${n(gx - 4)} ${n(gyy - 4)} ${n(gx)} ${n(gyy - sz)} Z" fill="#FFFFFF" opacity="${n(glint)}"/>`;
    }
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

function drawSymbols(R, s, uid) {
    const { expression = "neutral", t = 0 } = s;
    const since = s.since ?? t;
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
        // detached "surprise" ticks beside the temples (never on top of the head,
        // where they read as antennae); they pop in and fade after a moment
        const pop = clamp01(since / 0.15);
        const fade = 1 - clamp01((since - 1.1) / 0.4);
        if (fade > 0) {
            for (const a of [-168, -148, -32, -12]) {
                const r = (a * Math.PI) / 180;
                const r0 = R * 1.36;
                const r1 = R * (1.36 + 0.3 * pop);
                svg += `<path d="M ${n(Math.cos(r) * r0)} ${n(Math.sin(r) * r0 - R * 0.05)} L ${n(Math.cos(r) * r1)} ${n(Math.sin(r) * r1 - R * 0.05)}" ${stroke(8)} opacity="${n(fade)}"/>`;
            }
        }
    }
    if (expression === "suspicious") {
        const x = R * 0.72;
        const y = -R * 0.74;
        const q = 16;
        svg += `<path d="M ${x - q} ${y - 4} Q ${x - 4} ${y - 4} ${x - 4} ${y - q} M ${x + 4} ${y - q} Q ${x + 4} ${y - 4} ${x + q} ${y - 4} M ${x + q} ${y + 4} Q ${x + 4} ${y + 4} ${x + 4} ${y + q} M ${x - 4} ${y + q} Q ${x - 4} ${y + 4} ${x - q} ${y + 4}" fill="none" stroke="#E8384A" stroke-width="7" stroke-linecap="round"/>`;
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
    if (expression === "intense") {
        // dramatic shadow band across the upper face
        const clip = `${uid}-shade`;
        svg += `<defs><clipPath id="${clip}"><circle cx="0" cy="0" r="${n(R)}"/></clipPath></defs><rect x="${n(-R)}" y="${n(-R)}" width="${n(R * 2)}" height="${n(R * 0.78)}" fill="#1A1030" opacity="0.28" clip-path="url(#${clip})"/>`;
    }
    return svg;
}

function drawHead(C, R, s, uid, m) {
    const yaw = Math.max(-1, Math.min(1, s.yaw || 0));
    const proj = projector(R, yaw);
    const t = s.t || 0;
    const wind = s.wind || 0;
    let head = drawHairBack(C, R);
    // ears: far side peeks behind the face, near side sits on the face in profile
    const earsFront = [];
    for (const side of [-1, 1]) {
        const P = proj(side * R * 0.98);
        const deg = Math.abs((P.a * 180) / Math.PI);
        const ear = `<circle cx="${n(P.x)}" cy="${n(R * 0.12)}" r="${n(R * 0.17)}" fill="${C.skin}" ${stroke()}/>`;
        if (deg < 72) earsFront.push(ear);
        else if (deg < 112) head += ear;
    }
    const round = C.body === "round";
    const faceRx = R * (round ? 1.05 : 1);
    const faceRy = R * (round ? 0.98 : 1);
    head += `<ellipse cx="0" cy="0" rx="${n(faceRx)}" ry="${n(faceRy)}" fill="${C.skin}" ${stroke()}/>`;
    // back-of-head hair when turned
    const turn = Math.sin((Math.abs(yaw) * 65 * Math.PI) / 180);
    if (turn > 0.3) {
        const clip = `${uid}-back`;
        const dir = Math.sign(yaw);
        const bx = -dir * faceRx;
        const w = faceRx * 0.62 * turn;
        head += `<defs><clipPath id="${clip}"><ellipse cx="0" cy="0" rx="${n(faceRx)}" ry="${n(faceRy)}"/></clipPath></defs>`;
        head += `<path d="M ${n(bx)} ${n(-R)} L ${n(bx + dir * w)} ${n(-R)} Q ${n(bx + dir * w * 1.15)} ${n(R * 0.15)} ${n(bx + dir * w * 0.4)} ${n(R * 0.45)} L ${n(bx)} ${n(R * 0.45)} Z" fill="${C.hairColor}" clip-path="url(#${clip})"/>`;
        head += `<ellipse cx="0" cy="0" rx="${n(faceRx)}" ry="${n(faceRy)}" fill="none" ${stroke()}/>`;
    }
    head += earsFront.join("");
    const rosy = ["laughing", "happy", "crying", "scared"].includes(
        s.expression,
    )
        ? 0.75
        : 0.5;
    for (const side of [-1, 1]) {
        const P = proj(side * R * 0.62);
        if (P.sc < 0.2) continue;
        head += `<ellipse cx="${n(P.x)}" cy="${n(R * 0.36)}" rx="${n(R * 0.15 * (0.5 + 0.5 * P.sc))}" ry="${n(R * 0.09)}" fill="#FF7E96" opacity="${rosy}"/>`;
    }
    head += drawHairFront(C, R, t, yaw, m, wind);
    const eyes = drawEyes(C, R, s, uid, proj);
    eyes.R = R;
    head += eyes.svg;
    const N = proj(R * 0.05);
    const bump = Math.abs(Math.sin((yaw * 65 * Math.PI) / 180));
    const nx = N.x + Math.sign(yaw || 1) * R * 0.07 * bump;
    head +=
        C.nose === "button"
            ? `<ellipse cx="${n(nx)}" cy="${n(R * 0.3)}" rx="${n(R * 0.075)}" ry="${n(R * 0.058)}" fill="#E39468" ${stroke(4)}/>`
            : bump > 0.55
              ? `<path d="M ${n(N.x)} ${n(R * 0.2)} Q ${n(nx + Math.sign(yaw) * R * 0.08)} ${n(R * 0.3)} ${n(N.x)} ${n(R * 0.38)}" fill="${C.skin}" ${stroke(5)}/>`
              : `<path d="M ${n(nx)} ${n(R * 0.24)} Q ${n(nx + R * 0.12)} ${n(R * 0.32)} ${n(nx)} ${n(R * 0.39)}" fill="none" ${stroke(5)}/>`;
    head += drawMouth(C, R, s, uid, proj);
    head += drawGlasses(C, eyes, clamp01(s.glint || 0), proj);
    head += drawSymbols(R, s, uid);
    return head;
}

/**
 * @param {object} ch - character from characters.js (needs `classic`)
 * @param {object} state - per-frame state (see classic/acting.js performanceAt)
 */
export function renderClassicCharacter(ch, state = {}) {
    const C = { ...ch.classic };
    const { x = 0, y = 0, scale = 1, t = 0 } = state;
    const facing = state.facing ?? (state.flip ? -1 : 1);
    const pose = state.pose || "idle";
    const s = { ...state, pose };
    const uid = state.uid || `c-${ch.id}`;
    const g = classicGeometry(C);
    const R = g.R;
    const m = motion(C, g, s);

    const head = drawHead(C, R, s, uid, m);
    const armsOverHead = ["scared", "think", "scratch", "adjust"].includes(
        pose,
    );
    const backArm = drawArm(C, g, s, -1);
    const frontArm = drawArm(C, g, s, 1);

    let body = drawBehind(C, g, m, t);
    if (!armsOverHead) body += backArm;
    body += drawLegs(C, g, s);
    body += drawBody(C, g, m, t);
    if (!armsOverHead) body += frontArm;
    body += `<g transform="translate(0 ${n(g.headCY + m.headDy)}) rotate(${n(m.tilt)} 0 ${n(R * 0.8)}) scale(${n(m.headPop * 1000) / 1000})">${head}</g>`;
    if (armsOverHead) body += backArm + frontArm;

    const dir = facing >= 0 ? 1 : -1;
    // no horizontal squash while turning: the turn is carried by the head yaw
    // (acting.js eases yaw to front-view at the flip), so the mirror is invisible
    const fs = dir * scale;
    const groundY = state.groundY ?? y;
    const airborne = Math.max(0, groundY - y) / 200 + m.air * 0.6;
    const shadowW =
        C.bodyW *
        0.62 *
        scale *
        Math.max(0.4, 1 - airborne * 0.5) *
        (1 + m.fall * 1.4);
    let svg = `<ellipse cx="${n(x)}" cy="${n(groundY)}" rx="${n(shadowW)}" ry="${n(13 * scale)}" fill="${OUT}" fill-opacity="0.16"/>`;
    svg += `<g transform="translate(${n(x + m.dx * scale)} ${n(y + m.dy * scale)}) scale(${n(fs * m.sx * 1000) / 1000} ${n(scale * m.sy * 1000) / 1000}) rotate(${n(m.lean)})">`;
    if (m.fall > 0.001) {
        svg += `<g transform="translate(${n(R * 1.7 * m.fall)} ${n(-R * 0.98 * m.fall)}) rotate(${n(-88 * m.fall)})">${body}</g>`;
        const since = (s.poseSince ?? 0) - 0.32;
        if (pose === "facefault" && since > 0) {
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
