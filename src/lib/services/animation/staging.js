/**
 * Staging: keeps every character (and Sheru the dog) properly framed.
 *
 * - Pure geometry helpers: world-space boxes for a classic character (full
 *   silhouette, head, torso) and for Sheru, plus the stage safe area.
 * - Auto-fixes used while the acting plan is built (`fitX`, `hideSpot`,
 *   `entranceFor`) so authored or AI-generated scripts can't park a character
 *   half outside the frame, or bury a hiding character fully behind another.
 * - `planSheru()`: Sheru never pops up behind a prop any more; he trots in
 *   from outside the frame to a free spot and stays fully visible.
 *
 * The frame-by-frame validator that reports violations lives in
 * stagingQA.js (it needs frameState from timeline.js).
 */
import { classicGeometry } from "./classic/classicRig.js";

/** Safe-area margins as a fraction of the canvas. */
export const SAFE_AREA = { side: 0.025, top: 0.02 };

/**
 * Horizontal silhouette extent per pose, in head radii: [back, forward]
 * (measured from the rendered rig; arms / pointing hands included).
 */
const POSE_EXTENT = {
    point: [1.25, 2.0],
    action: [1.25, 2.6],
    shrug: [1.5, 1.5],
    scared: [1.3, 1.2],
    facefault: [2.1, 2.1],
    catch: [1.3, 1.2],
};
/** Default (idle-ish) silhouette half-width, in head radii. */
export const CORE_EXTENT = 1.25;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** World-space boxes of a classic character in a given state. */
export function characterBoxes(actor, state = {}) {
    const g = classicGeometry(actor.character.classic);
    const C = actor.character.classic;
    const k = state.scale ?? actor.scale ?? 1;
    const R = g.R * k;
    const x = state.x ?? actor.x;
    const y = state.y ?? actor.y;
    const dir = (state.facing ?? 1) >= 0 ? 1 : -1;
    const [back, fwd] = POSE_EXTENT[state.pose] || [CORE_EXTENT, CORE_EXTENT];
    const facefault = state.pose === "facefault";
    const full = {
        x0: x - (dir > 0 ? back : fwd) * R,
        x1: x + (dir > 0 ? fwd : back) * R,
        y0: y - (facefault ? 3.05 : 3.5) * R,
        y1: y + 0.15 * R,
    };
    const core = {
        x0: x - CORE_EXTENT * R,
        x1: x + CORE_EXTENT * R,
        y0: full.y0,
        y1: full.y1,
    };
    const hy = y + g.headCY * k;
    // the drawn head is round: an inset box so empty corners don't count
    const head = facefault
        ? null
        : { x0: x - R * 0.88, x1: x + R * 0.88, y0: hy - R, y1: hy + R * 0.9 };
    const half = C.bodyW * 0.5 * k;
    const torso = facefault
        ? null
        : {
              x0: x - half,
              x1: x + half,
              y0: y + g.bodyTop * k,
              y1: y + g.hipY * k,
          };
    return { full, core, head, torso };
}

/** Half-width (world px) of a character's idle silhouette. */
export function coreHalfWidth(actor) {
    return (
        classicGeometry(actor.character.classic).R * actor.scale * CORE_EXTENT
    );
}

/**
 * Clamp a standing x so the character's idle silhouette sits inside the
 * stage safe area (with the widest framing every point of [0, W] is on
 * screen). Off-stage marks (entrances / exits) are left alone.
 */
export function fitX(layout, actor, x) {
    if (!Number.isFinite(x)) return x;
    // deliberate off-stage mark: make sure nothing of the body peeks in
    // (offL/offR are only 0.18W out, less than a 9:16 body half-width)
    const out = coreHalfWidth(actor) * 1.15 + 40;
    if (x < 0) return Math.min(x, -out);
    if (x > layout.width) return Math.max(x, layout.width + out);
    const m = layout.width * SAFE_AREA.side + coreHalfWidth(actor);
    return clamp(x, m, layout.width - m);
}

/** Clamp a computed standing x into the safe area (no off-stage special case). */
export function clampX(layout, actor, x) {
    const m = layout.width * SAFE_AREA.side + coreHalfWidth(actor);
    return clamp(x, m, layout.width - m);
}

/**
 * Where `hider` stands when hiding behind `holder` (holder at hx, facing
 * hdir). Classic peek: the hider stays drawn behind the holder but is
 * offset far enough that head + shoulders show. Prefers the side away from
 * the holder's facing; uses the other side when that would leave the safe
 * area (the old behaviour pushed Golu half out of a 9:16 frame).
 */
export function hideSpot(layout, hider, holder, hx, hdir) {
    const gh = classicGeometry(holder.character.classic);
    const gi = classicGeometry(hider.character.classic);
    const off = (gh.R * holder.scale + gi.R * hider.scale) * 0.75;
    const m = layout.width * SAFE_AREA.side + coreHalfWidth(hider);
    const ok = (x) => x >= m && x <= layout.width - m;
    const behind = hx - hdir * off;
    if (ok(behind)) return behind;
    const front = hx + hdir * off;
    if (ok(front)) return front;
    return clamp(behind, m, layout.width - m);
}

/** True when x is a deliberate off-stage position. */
export const isOffStage = (layout, x) => x < 0 || x > layout.width;

/* ------------------------------------------------------------------ */
/* Sheru (stage dog)                                                    */
/* ------------------------------------------------------------------ */

/** Sheru silhouette in local px (facing left, scale 1, feet at y=0). */
export const SHERU_LOCAL = { x0: -126, x1: 120, y0: -176, y1: 8 };
const SHERU_TROT_SPEED = 0.4; // stage widths per second
const SHERU_SETTLE = 0.3;

export function sheruScale(layout, classicScale) {
    return (layout.vertical ? 1.25 : 1) * classicScale * 0.9;
}

/** World box of Sheru at (x, y, scale, facing: -1 = head to the left). */
export function sheruBox(x, y, scale, facing = -1) {
    const a = SHERU_LOCAL.x0 * scale;
    const b = SHERU_LOCAL.x1 * scale;
    return {
        x0: x + (facing < 0 ? a : -b),
        x1: x + (facing < 0 ? b : -a),
        y0: y + SHERU_LOCAL.y0 * scale,
        y1: y + SHERU_LOCAL.y1 * scale,
    };
}

export function boxOverlap(a, b) {
    if (!a || !b) return 0;
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return w > 0 && h > 0 ? w * h : 0;
}
export const boxArea = (b) =>
    b ? Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0) : 0;

/**
 * Plan Sheru for the first line that stages him ({"dog": 1}).
 * He trots in from outside the stage on the side the speaker is facing and
 * eases to a stop on a spot that keeps every character's head clear (and
 * most of each torso). Whenever a character later moves onto / next to his
 * spot (or hides there), he trots aside to a new free spot while they move;
 * if there is no free spot left he trots out of the frame.
 *
 * @param {object} p
 * @param {object} p.layout
 * @param {Array} p.events
 * @param {object} p.actors
 * @param {(id:string, t:number) => {x:number, dir:number, lift:number, hidden?:object}} p.positionAt
 * @param {Array<{t0:number, t1:number}>} p.moves - every character move (for re-spotting)
 * @param {number} p.classicScale
 * @param {number} p.end - scene end (s)
 * @param {(ev:object) => number} [p.revealDelay]
 */
export function planSheru({
    layout,
    events,
    actors,
    positionAt,
    moves = [],
    classicScale,
    end,
    revealDelay,
}) {
    const ev = events.find((e) => e.stage?.dog);
    if (!ev) return null;
    const scale = sheruScale(layout, classicScale);
    const W = layout.width;
    // horizontal: a little behind the characters' plane (above the
    // captions); vertical: just in front of them, between the pair
    const y = layout.vertical
        ? layout.groundY + layout.height * 0.004
        : layout.groundY - layout.height * 0.035;
    const front = layout.vertical;
    const t0 = ev.start + (revealDelay ? revealDelay(ev) : 0.2);
    const speaker = actors[ev.speaker];
    const sdir = speaker ? positionAt(speaker.id, t0).dir : 1;
    const side = sdir >= 0 ? 1 : -1; // enter from where the speaker looks
    const m = W * SAFE_AREA.side;
    const half = Math.max(-SHERU_LOCAL.x0, SHERU_LOCAL.x1) * scale;
    // 16:9: keep clear of the corner foreground props (gali grass tufts sit
    // at his paw height); in 9:16 he stands well above them
    const edge = layout.vertical ? m : Math.max(m, W * 0.1);
    const lo = edge + half;
    const hi = W - edge - half;
    const pref = layout.revealSpot?.x ?? W / 2;
    const speed = SHERU_TROT_SPEED * W;
    const durFor = (a, b) => Math.max(0.6, (Math.abs(b - a) / speed) * 1.27);

    /** Overlap cost of a spot over [ta, tb]; > 1 means it reads as a glitch. */
    const conflict = (x, facing, ta, tb) => {
        const box = sheruBox(x, y, scale, facing);
        let worst = 0;
        // every 0.1s plus the instant each move ends (short rests matter)
        const ts = [];
        for (let t = ta; t <= tb + 1e-6; t += 0.1) ts.push(t);
        ts.push(tb);
        for (const mv of moves)
            if (mv.t1 >= ta && mv.t1 <= tb) ts.push(mv.t1 + 0.005);
        for (const t of ts) {
            for (const a of Object.values(actors)) {
                const p = positionAt(a.id, t);
                if (p.move) continue; // passing by is not staging
                const b = characterBoxes(a, {
                    x: p.x,
                    y: a.y + p.lift,
                    facing: p.dir,
                });
                let c;
                if (front) {
                    // Sheru drawn in front: never over a head, at most a third of a torso
                    const head = boxOverlap(box, b.head) / boxArea(b.head);
                    const torso = boxOverlap(box, b.torso) / boxArea(b.torso);
                    c = Math.max(head / 0.06, torso / 0.4);
                } else {
                    // Sheru drawn behind: nobody may cover him
                    c = boxOverlap(box, b.core) / boxArea(box) / 0.08;
                }
                worst = Math.max(worst, c);
            }
        }
        return worst;
    };
    const best = (facing, ta, tb, near) => {
        let out = null;
        for (let x = lo; x <= hi; x += W / 120) {
            // ta may depend on the spot (arrival time of the entrance)
            const a = typeof ta === "function" ? ta(x) : ta;
            const c = conflict(x, facing, a, Math.max(a, tb));
            const score = Math.max(0, c - 0.6) * 100 + Math.abs(x - near) / W;
            if (!out || score < out.score) out = { x, c, score };
        }
        return out;
    };

    const segs = [];
    let facing = -side;
    const xIn =
        side > 0
            ? W - SHERU_LOCAL.x0 * scale + 40
            : -SHERU_LOCAL.x1 * scale - 40;
    // first spot: good from his arrival until the next character move
    const guess = t0 + durFor(xIn, pref);
    // moves that start while he is trotting in count for his first spot
    const settle = Math.max(
        guess,
        ...moves.filter((mv) => mv.t0 > t0 && mv.t0 < guess).map((mv) => mv.t1),
    );
    const changes = [
        ...new Set(moves.filter((mv) => mv.t0 >= guess).map((mv) => mv.t0)),
    ].sort((a, b) => a - b);
    const firstEnd = Math.min(end, changes[0] ?? end);
    const first = best(
        facing,
        (sx) => t0 + durFor(xIn, sx) - 0.3,
        Math.max(settle, firstEnd),
        pref,
    );
    const dur0 = durFor(xIn, first.x);
    segs.push({ t0, t1: t0 + dur0, x0: xIn, x1: first.x, facing });
    let x = first.x;
    let gone = first.c > 1;
    if (gone)
        segs.push({
            t0: t0 + dur0,
            t1: t0 + dur0 + durFor(x, xIn),
            x0: x,
            x1: xIn,
            facing: -facing,
            exit: true,
        });
    for (let k = 0; k < changes.length && !gone; k++) {
        const T = changes[k];
        const last = segs[segs.length - 1];
        const start = Math.max(T, last.t1);
        // the window this spot must hold for: after the move(s) starting at T
        const moveEnd = Math.max(
            ...moves.filter((mv) => mv.t0 === T).map((mv) => mv.t1),
        );
        const next = Math.min(end, changes[k + 1] ?? end);
        if (conflict(x, facing, start, Math.max(moveEnd, next)) <= 1) continue;
        const cand = best(facing, start, Math.max(moveEnd, next), x);
        if (cand.c > 1) {
            // nowhere free: trot out of the frame (nearest side)
            const xo =
                x > W / 2
                    ? W - SHERU_LOCAL.x0 * scale + 40
                    : -SHERU_LOCAL.x1 * scale - 40;
            const f = xo > x ? 1 : -1;
            segs.push({
                t0: start,
                t1: start + durFor(x, xo),
                x0: x,
                x1: xo,
                facing: f,
                exit: true,
            });
            gone = true;
            break;
        }
        const f = cand.x > x ? 1 : -1;
        segs.push({
            t0: start,
            t1: start + durFor(x, cand.x),
            x0: x,
            x1: cand.x,
            facing: f,
        });
        x = cand.x;
        facing = f;
    }
    const lastSeg = segs[segs.length - 1];
    return {
        t0,
        t1: segs[0].t1,
        x1: segs[0].x1,
        end: lastSeg.t1,
        segs,
        y,
        scale,
        facing: segs[0].facing,
        front,
        line: ev.index,
    };
}

/**
 * Position fraction along the entrance: ease-in over the first 12%, constant
 * speed, ease-out over the last 30% (continuous velocity, no jumps).
 */
export function trotEase(p) {
    const a = 0.12;
    const b = 0.3;
    const v = 1 / (1 - a / 2 - b / 2); // cruise speed (fraction per unit p)
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    if (p < a) return (v * p * p) / (2 * a);
    if (p < 1 - b) return (v * a) / 2 + v * (p - a);
    const q = 1 - p;
    return 1 - (v * q * q) / (2 * b);
}

/** Sheru's state at time t (null before his entrance / after he left). */
export function sheruAt(plan, t) {
    if (!plan || t < plan.t0) return null;
    const { y, scale } = plan;
    let seg = plan.segs[0];
    for (const sg of plan.segs) if (t >= sg.t0) seg = sg;
    const p = clamp((t - seg.t0) / (seg.t1 - seg.t0), 0, 1);
    if (seg.exit && p >= 1) return null;
    const x = seg.x0 + (seg.x1 - seg.x0) * trotEase(p);
    const moving = p < 1;
    const dist = Math.abs(x - seg.x0);
    const stride = 150 * scale;
    let lift = 0;
    let squash = 0;
    if (moving)
        lift = Math.abs(Math.sin((dist / stride) * Math.PI)) * 10 * scale;
    const since = t - seg.t1;
    if (!moving && since < SHERU_SETTLE) {
        // small settle hop on arrival
        const q = since / SHERU_SETTLE;
        lift = Math.sin(Math.PI * q) * 16 * scale;
        squash = q > 0.5 ? Math.sin(Math.PI * Math.min(1, q * 2)) * 0.06 : 0;
    }
    return {
        x,
        y: y - lift,
        groundY: y,
        scale,
        facing: seg.facing,
        moving,
        entering: seg === plan.segs[0] && moving,
        trot: moving ? (dist / stride) % 1 : 0,
        trotAmt: moving ? Math.min(1, p / 0.08, (1 - p) / 0.15) : 0,
        squash,
        t,
        front: plan.front,
    };
}
