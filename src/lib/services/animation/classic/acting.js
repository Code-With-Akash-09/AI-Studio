/**
 * Classic-style acting: blocking (walk / run / hop / jump into arms), facing,
 * head turns, pose changes with eased in-betweens, talking gestures, idle
 * acting (weight shifts, eye darts, frequent blinks, small gestures),
 * double-takes and the dramatic reveal beat. Pure + deterministic: every
 * value is a function of (timeline, t) so frames can render in any order.
 */
import { createRandom, hashString } from "../random.js";
import { classicGeometry, STEP_AMP } from "./classicRig.js";
import { blendShapes, mouthShapeFor } from "./mouths.js";
import { wordVisemes } from "./visemes.js";

export const MARKS = {
    left: 0.27,
    center: 0.5,
    right: 0.73,
    offL: -0.18,
    offR: 1.18,
};
const WALK_SPEED = 0.21; // stage widths per second
const RUN_SPEED = 0.7;
const HOP_DUR = 0.5;
const JUMP_DUR = 0.6;
const DOUBLETAKE_DUR = 1.1;
const HIDE_DUR = 0.55;

/** Dramatic reveal beat: zoom-punch → eye close-up → action pose. */
export const DRAMATIC = { punch: 0.18, eye: 0.95, end: 1.8 };
const POSE_BLEND = 0.34;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInOut = (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(p));

function markX(layout, to, fallback) {
    if (typeof to === "number" && Number.isFinite(to)) return to * layout.width;
    if (typeof to === "string" && to in MARKS) return MARKS[to] * layout.width;
    return fallback;
}

function blinkSchedule(id, duration) {
    const rand = createRandom(hashString(`classic-blink:${id}`));
    const out = [];
    let t = 0.4 + rand() * 1.2;
    while (t < duration + 2) {
        out.push(t);
        if (rand() < 0.25) out.push(t + 0.28); // double blink
        t += 1.4 + rand() * 1.8;
    }
    return out;
}

/**
 * Build the acting plan once per timeline.
 */
export function buildActing(dialogue, events, actors, layout) {
    const tracks = {};
    for (const id of dialogue.cast) {
        const init = dialogue.positions?.[id];
        tracks[id] = {
            x0: markX(layout, init, actors[id].x),
            segs: [],
        };
    }
    const overlays = [];
    const list = [];
    for (const ev of events) {
        for (const a of ev.actions || []) {
            const base =
                a.at === "end"
                    ? ev.end
                    : a.at === "after"
                      ? (ev.reactionEnd ?? ev.end)
                      : ev.start;
            list.push({ ...a, t0: Math.max(0, base + (a.delay || 0)) });
        }
    }
    list.sort((a, b) => a.t0 - b.t0);

    const plan = { tracks, overlays, layout, actors };
    for (const a of list) {
        const tr = tracks[a.who];
        if (!tr) continue;
        // a new movement ends any "held" state of this actor
        for (const s of tr.segs) {
            if (
                (s.type === "held" || s.type === "hidden") &&
                s.t1 > a.t0 &&
                s.t0 <= a.t0
            )
                s.t1 = a.t0;
        }
        const x0 = positionAt(plan, a.who, a.t0).x;
        switch (a.type) {
            case "walk":
            case "run": {
                const x1 = markX(layout, a.to, x0);
                const speed =
                    (a.type === "run" ? RUN_SPEED : WALK_SPEED) * layout.width;
                const dur = a.dur || Math.max(0.35, Math.abs(x1 - x0) / speed);
                tr.segs.push({
                    type: a.type,
                    t0: a.t0,
                    t1: a.t0 + dur,
                    x0,
                    x1,
                });
                break;
            }
            case "hop": {
                const x1 = markX(layout, a.to, x0);
                tr.segs.push({
                    type: "hop",
                    t0: a.t0,
                    t1: a.t0 + HOP_DUR,
                    x0,
                    x1,
                    // coming out of hiding: pass behind the protector, not over them
                    behind: !!positionAt(plan, a.who, a.t0 - 0.01).hidden,
                });
                break;
            }
            case "jump": {
                const holder = actors[a.to] ? a.to : null;
                if (!holder) break;
                const t1 = a.t0 + JUMP_DUR;
                tr.segs.push({ type: "jump", t0: a.t0, t1, x0, holder });
                tr.segs.push({ type: "held", t0: t1, t1: Infinity, holder });
                break;
            }
            case "hide": {
                // scurry behind the other character and peek out from behind them
                const holder = actors[a.to] ? a.to : null;
                if (!holder) break;
                const hp = positionAt(plan, holder, a.t0);
                const hg = classicGeometry(actors[holder].character.classic);
                const x1 = hp.x - hp.dir * hg.R * 0.75 * actors[holder].scale;
                const dur = Math.max(
                    0.5,
                    Math.abs(x1 - x0) / (RUN_SPEED * 0.8 * layout.width),
                );
                const t1 = a.t0 + dur;
                tr.segs.push({
                    type: "run",
                    t0: a.t0,
                    t1,
                    x0,
                    x1,
                    hide: true,
                    behind: true,
                    holder,
                });
                tr.segs.push({
                    type: "hidden",
                    t0: t1,
                    t1: Infinity,
                    holder,
                    x: x1,
                });
                break;
            }
            case "doubletake":
                overlays.push({
                    who: a.who,
                    type: "doubletake",
                    t0: a.t0,
                    t1: a.t0 + DOUBLETAKE_DUR,
                });
                break;
            case "dramatic":
                overlays.push({
                    who: a.who,
                    type: "dramatic",
                    t0: a.t0,
                    t1: a.t0 + DRAMATIC.end,
                });
                break;
            default:
                break;
        }
    }
    let end = 0;
    for (const tr of Object.values(tracks)) {
        for (const s of tr.segs)
            if (Number.isFinite(s.t1)) end = Math.max(end, s.t1);
    }
    for (const o of overlays) end = Math.max(end, o.t1);
    plan.end = end;
    plan.blinks = {};
    for (const id of dialogue.cast) plan.blinks[id] = blinkSchedule(id, 120);
    return plan;
}

function holderOffset(plan, holderId) {
    const holder = plan.actors[holderId];
    const g = classicGeometry(holder.character.classic);
    // carried on the holder's forward arm: feet at hip height, head beside the holder's head
    return {
        lift: (g.hipY - 10) * holder.scale,
        fwd: g.R * 1.7 * holder.scale,
    };
}

/** World position + motion info of an actor at time t. */
export function positionAt(plan, id, t, depth = 0) {
    const tr = plan.tracks[id];
    const actor = plan.actors[id];
    let x = tr.x0;
    let lift = 0;
    let move = null;
    let held = null;
    let hidden = null;
    let lastStop = -Infinity;
    for (const s of tr.segs) {
        if (t < s.t0) break;
        const p = clamp01((t - s.t0) / (s.t1 - s.t0));
        lift = 0; // later segments supersede earlier lifts
        if (s.type === "walk" || s.type === "run") {
            const e =
                s.type === "run"
                    ? p < 0.15
                        ? (p * p) / 0.3
                        : p > 0.9
                          ? 1 - ((1 - p) * (1 - p)) / 0.2
                          : 0.075 + (p - 0.15) * (0.875 / 0.75)
                    : easeInOut(p);
            x = s.x0 + (s.x1 - s.x0) * Math.min(1, e);
            if (t < s.t1) move = { type: s.type, seg: s, p };
            else lastStop = s.t1;
        } else if (s.type === "hop") {
            x = s.x0 + (s.x1 - s.x0) * easeInOut(p);
            if (t < s.t1) {
                lift = Math.sin(Math.PI * p) * (s.low ? 55 : 95) * actor.scale;
                move = { type: "hop", seg: s, p };
            } else lastStop = s.t1;
        } else if (s.type === "jump" && depth < 2) {
            const h = positionAt(plan, s.holder, t, depth + 1);
            const off = holderOffset(plan, s.holder);
            const tx = h.x + h.dir * off.fwd;
            x = s.x0 + (tx - s.x0) * easeInOut(p);
            lift = Math.sin(Math.PI * p) * 190 * actor.scale + off.lift * -p;
            if (t < s.t1) move = { type: "jump", seg: s, p };
            else lastStop = s.t1;
        } else if (s.type === "hidden") {
            if (t < s.t1) hidden = { holder: s.holder, since: t - s.t0 };
        } else if (s.type === "held" && depth < 2) {
            if (t < s.t1) {
                const h = positionAt(plan, s.holder, t, depth + 1);
                const off = holderOffset(plan, s.holder);
                x = h.x + h.dir * off.fwd;
                lift = -off.lift;
                held = { holder: s.holder, since: t - s.t0 };
            } else lastStop = s.t1;
        }
    }
    // facing: movement direction while moving, else towards the partner
    let dir;
    if (move && move.type !== "jump") {
        dir = Math.sign(move.seg.x1 - move.seg.x0) || 1;
    } else if (held && depth < 2) {
        dir = -positionAt(plan, held.holder, t, depth + 1).dir;
    } else if (hidden && depth < 2) {
        // peek out the same way the protector is looking
        dir = positionAt(plan, hidden.holder, t, depth + 1).dir;
    } else if (shielding(plan, id, t)) {
        // someone is hiding behind me: keep looking away from them (forward)
        dir = -Math.sign(shielding(plan, id, t) - x) || 1;
    } else {
        const other = Object.keys(plan.tracks).find((k) => k !== id);
        let ox = plan.tracks[other]?.x0 ?? plan.layout.width / 2;
        if (depth < 1 && other) ox = positionAt(plan, other, t, depth + 1).x;
        dir = Math.sign(ox - x) || (actor.slot === 1 ? -1 : 1);
    }
    return { x, lift: -lift, dir, move, held, hidden, stopAge: t - lastStop };
}

/** x where another actor hides (or is scurrying to hide) behind `id`, else null. */
function shielding(plan, id, t) {
    for (const [other, tr] of Object.entries(plan.tracks)) {
        if (other === id) continue;
        for (const s of tr.segs) {
            if (s.holder !== id || t < s.t0 || t >= s.t1) continue;
            if (s.type === "hidden") return s.x;
            if (s.hide) return s.x1;
        }
    }
    return null;
}

/** Smoothed facing value in [-1, 1] (turns take ~0.2s). */
function facingAt(plan, id, t) {
    let sum = 0;
    const N = 6;
    for (let i = 0; i < N; i++)
        sum += positionAt(plan, id, t - (i * 0.3) / N).dir;
    return sum / N;
}

function overlayFor(plan, id, t) {
    return plan.overlays.find((o) => o.who === id && t >= o.t0 && t < o.t1);
}

function eventIndexAt(events, t) {
    for (let i = events.length - 1; i >= 0; i--)
        if (t >= events[i].start) return i;
    return -1;
}

/** Raw (un-blended) performance of an actor at time t. */
function rawPerformance(timeline, id, t) {
    const { events } = timeline;
    const plan = timeline.acting;
    const idx = eventIndexAt(events, t);
    const ev = idx >= 0 ? events[idx] : null;
    const pos = positionAt(plan, id, t);
    const out = {
        pose: "idle",
        expression: "neutral",
        yaw: 0.35,
        talking: false,
        gesture: null,
        ev,
        idx,
    };
    if (ev) {
        const speaking = ev.speaker === id;
        const inReaction =
            ev.reactionStart !== null &&
            t >= ev.reactionStart &&
            t < ev.reactionEnd;
        if (speaking) {
            out.expression = ev.expression;
            out.pose = ev.pose;
            out.talking = t < ev.end;
            out.gesture = ev.gesture;
            if (ev.look === "camera") out.yaw = 0;
        } else {
            out.expression = ev.listener.expression;
            out.pose = ev.listener.pose;
            out.yaw = 0.45;
            if (inReaction) {
                out.expression = ev.reaction.expression;
                out.pose = ev.reaction.pose;
            }
        }
    }
    // idle glances to camera + small idle gestures
    const seed = hashString(id) % 97;
    const calm = ["neutral", "happy", "curious", "suspicious"].includes(
        out.expression,
    );
    if (out.pose === "idle" && calm && !out.talking && !pos.move) {
        const period = 5.2 + (seed % 3);
        const k = Math.floor((t + seed * 0.37) / period);
        const local = t + seed * 0.37 - k * period;
        if (local > 0.6 && local < 1.4) out.yaw = 0.05;
    }
    if (pos.move) {
        // 3/4 view while travelling reads better than a full profile
        out.yaw = pos.move.type === "run" ? 0.75 : 0.62;
        if (pos.move.type === "run") {
            out.pose = "idle";
            if (out.expression === "neutral") out.expression = "scared";
        }
        if (pos.move.type === "jump") {
            out.pose = "scared";
            out.expression = "scared";
            out.yaw = 0.5;
        }
    }
    if (pos.hidden || pos.move?.seg?.hide) {
        out.pose = "scared";
        if (["neutral", "happy", "curious"].includes(out.expression))
            out.expression = "scared";
        out.yaw = 0.3;
    }
    if (pos.held) {
        out.pose = "scared";
        out.expression =
            out.expression === "neutral" ? "scared" : out.expression;
        out.yaw = 0.2;
    }
    // holder catches
    for (const other of Object.keys(plan.tracks)) {
        if (other === id) continue;
        const op = positionAt(plan, other, t);
        if (
            op.held?.holder === id ||
            (op.move?.type === "jump" && op.move.p > 0.6)
        ) {
            out.pose = "catch";
        }
    }
    const ov = overlayFor(plan, id, t);
    if (ov?.type === "doubletake") {
        const s = t - ov.t0;
        if (s < 0.3) {
            out.yaw = 0.45;
            out.expression = "neutral";
        } else if (s < 0.62) {
            out.yaw = -0.35;
            out.expression = "happy";
        } else {
            out.yaw = 0.55;
            out.expression = "shocked";
            out.pose = "scared";
        }
    }
    if (ov?.type === "dramatic") {
        const s = t - ov.t0;
        out.expression = "intense";
        out.yaw = s < DRAMATIC.eye ? 0 : 0.3;
        out.pose = s < DRAMATIC.eye ? "idle" : "action";
    }
    return { ...out, pos };
}

/** Pose / expression keyframes (built lazily, sampled at 1/48s). */
function keyframes(timeline, id) {
    timeline._keys ||= {};
    if (timeline._keys[id]) return timeline._keys[id];
    const poses = [];
    const exprs = [];
    const step = 1 / 48;
    let lastPose = null;
    let lastExpr = null;
    for (let t = 0; t <= timeline.duration + step; t += step) {
        const r = rawPerformance(timeline, id, t);
        if (r.pose !== lastPose) {
            poses.push({ t, pose: r.pose });
            lastPose = r.pose;
        }
        if (r.expression !== lastExpr) {
            exprs.push({ t, expression: r.expression });
            lastExpr = r.expression;
        }
    }
    timeline._keys[id] = { poses, exprs };
    return timeline._keys[id];
}

function lastKey(list, t) {
    let i = -1;
    for (let k = 0; k < list.length; k++) {
        if (list[k].t <= t + 1e-6) i = k;
        else break;
    }
    return i;
}

function smoothYaw(timeline, id, t) {
    let sum = 0;
    const N = 8;
    for (let i = 0; i < N; i++)
        sum += rawPerformance(timeline, id, t - (i * 0.24) / N).yaw;
    return sum / N;
}

/** Low-passed loudness of the line being spoken at frame f (0..1). */
function levelAt(ev, f) {
    const env = ev.envelope || [];
    let sum = 0;
    let cnt = 0;
    for (let k = -2; k <= 2; k++) {
        const v = env[f + k];
        if (v !== undefined) {
            sum += v * (3 - Math.abs(k));
            cnt += 3 - Math.abs(k);
        }
    }
    return cnt ? sum / cnt : 0;
}

/**
 * Per-frame mouth shapes for one actor (built lazily once). Talking frames
 * follow the Edge TTS word timings (closed between words, loudness only
 * scales openness); everything else is the expression's resting mouth. The
 * whole track is then cross-faded with a [1 2 1] kernel so every change —
 * viseme, expression, start/end of a line — blends over two frames and the
 * mouth never jumps. Non-speakers only change mouth with their expression.
 */
function mouthTrack(timeline, id) {
    timeline._mouth ||= {};
    if (timeline._mouth[id]) return timeline._mouth[id];
    const fps = timeline.fps;
    const plan = timeline.acting;
    plan.visemes ||= timeline.events.map((ev) =>
        wordVisemes(ev.text, ev.words, ev.envelope || [], fps),
    );
    const keys = keyframes(timeline, id);
    const n = Math.ceil(timeline.duration * fps) + 2;
    const raw = [];
    for (let i = 0; i < n; i++) {
        const t = i / fps;
        const r = rawPerformance(timeline, id, t);
        const ei = lastKey(keys.exprs, t);
        const expression = ei >= 0 ? keys.exprs[ei].expression : "neutral";
        let shape;
        if (r.talking && r.ev) {
            const f = Math.floor((t - r.ev.start) * fps);
            const vis = plan.visemes[r.ev.index]?.[f] || "X";
            shape = mouthShapeFor(expression, true, vis, levelAt(r.ev, f));
        } else {
            shape = mouthShapeFor(expression, false);
        }
        raw.push(shape);
    }
    const track = raw.map((s, i) =>
        blendShapes([
            [raw[Math.max(0, i - 1)], 1],
            [s, 2],
            [raw[Math.min(n - 1, i + 1)], 1],
        ]),
    );
    timeline._mouth[id] = track;
    return track;
}

function blinkAt(list, t) {
    for (const b of list) {
        const d = (t - b) / 0.16;
        if (d >= 0 && d <= 1) return 1 - Math.abs(2 * d - 1);
        if (b > t) break;
    }
    return 0;
}

/**
 * Full classic state for one actor at time t (merged into the frame state).
 */
export function performanceAt(timeline, actor, t) {
    const plan = timeline.acting;
    const id = actor.id;
    const raw = rawPerformance(timeline, id, t);
    const { pos, ev } = raw;
    const keys = keyframes(timeline, id);
    const pi = lastKey(keys.poses, t);
    const ei = lastKey(keys.exprs, t);
    const pose = pi >= 0 ? keys.poses[pi].pose : "idle";
    const prevPose = pi > 0 ? keys.poses[pi - 1].pose : pose;
    const poseSince = pi >= 0 ? t - keys.poses[pi].t : 10;
    const expression = ei >= 0 ? keys.exprs[ei].expression : "neutral";
    const exprSince = ei >= 0 ? t - keys.exprs[ei].t : 10;

    // walking phase from distance travelled
    let walk = null;
    if (pos.move && (pos.move.type === "walk" || pos.move.type === "run")) {
        const run = pos.move.type === "run";
        // one cycle = two steps; a planted foot travels 2*amp per step
        const stride = 4 * (run ? STEP_AMP.run : STEP_AMP.walk) * actor.scale;
        const dist = Math.abs(pos.x - pos.move.seg.x0);
        const p = pos.move.p;
        const amt = clamp01(Math.min(p / 0.12, (1 - p) / 0.12, 1));
        walk = { phase: dist / stride, amt, run };
    }
    const vx =
        (positionAt(plan, id, t).x - positionAt(plan, id, t - 0.05).x) / 0.05;

    // talking level (low-passed so body/head bounce never jitters)
    const level =
        raw.talking && ev
            ? levelAt(ev, Math.floor((t - ev.start) * timeline.fps))
            : 0;
    const track = mouthTrack(timeline, id);
    const mouthShape =
        track[
            Math.min(
                track.length - 1,
                Math.max(0, Math.round(t * timeline.fps)),
            )
        ];
    const mouth = mouthShape.h > 0.05 ? "B" : "X";

    // eye darts (fast saccades between a few targets)
    const seed = hashString(id) % 89;
    const dartAt = (k) => {
        const r = createRandom(seed * 1000 + k);
        return [(r() - 0.5) * 0.6, (r() - 0.5) * 0.4];
    };
    const dp = (t + seed * 0.13) / 1.6;
    const dk = Math.floor(dp);
    const de = clamp01(((dp - dk) * 1.6) / 0.09); // ~90ms saccade, then hold
    const d0 = dartAt(dk - 1);
    const d1 = dartAt(dk);
    const dart = raw.talking
        ? [0, 0]
        : [
              d0[0] + (d1[0] - d0[0]) * easeInOut(de),
              d0[1] + (d1[1] - d0[1]) * easeInOut(de),
          ];
    // blink-cover on expression changes hides the eye-shape swap
    const cover =
        exprSince < 0.14 && ei > 0 ? Math.sin((Math.PI * exprSince) / 0.14) : 0;

    const ov = overlayFor(plan, id, t);
    const dramatic = ov?.type === "dramatic" ? t - ov.t0 : null;
    let wind = 0;
    if (dramatic !== null) {
        wind =
            dramatic > DRAMATIC.punch
                ? clamp01((DRAMATIC.end - dramatic) / 0.45)
                : 0;
    }
    // holder squash when catching
    let catchSince = null;
    for (const other of Object.keys(plan.tracks)) {
        if (other === id) continue;
        const op = positionAt(plan, other, t);
        if (op.held?.holder === id) catchSince = op.held.since;
    }

    // talking gestures ease in at the line start and out after its end
    let gesture = null;
    let gestureAmt = 0;
    if (ev && ev.speaker === id) {
        gesture = ev.gesture || "explain";
        const fin = clamp01((t - ev.start) / 0.25);
        const fout = clamp01((ev.end + 0.3 - t) / 0.3);
        gestureAmt = easeInOut(Math.min(fin, fout));
    }

    const facing = facingAt(plan, id, t);
    return {
        x: pos.x,
        y: actor.y + pos.lift,
        facing,
        // turn through the front view so the left/right mirror is never visible
        yaw: smoothYaw(timeline, id, t) * Math.min(1, Math.abs(facing) * 1.6),
        behind: !!pos.hidden || !!pos.move?.seg?.behind,
        walk,
        vx,
        stopAge: pos.stopAge,
        move: pos.move?.type || null,
        moveP: pos.move?.p ?? 0,
        held: !!pos.held,
        catchSince,
        pose,
        prevPose,
        poseSince,
        expression,
        prevExpression: ei > 0 ? keys.exprs[ei - 1].expression : expression,
        since: exprSince,
        // the whole line counts as talking; the mouth track closes in pauses
        talking: raw.talking,
        level,
        mouth,
        mouthShape,
        gesture,
        gestureAmt,
        look: [0.55 + dart[0], dart[1]],
        blink:
            dramatic !== null && dramatic < DRAMATIC.end - 0.1
                ? 0
                : Math.max(blinkAt(plan.blinks[id], t), cover),
        wind,
        dramatic,
    };
}

/** Run dust puffs (world coords) alive at time t. */
export function dustPuffs(timeline, t) {
    const plan = timeline.acting;
    const out = [];
    for (const [id, tr] of Object.entries(plan.tracks)) {
        const actor = plan.actors[id];
        for (const s of tr.segs) {
            if (s.type !== "run" && s.type !== "hop") continue;
            if (s.t0 > t || s.t1 < t - 0.6) continue;
            const times = [];
            if (s.type === "run") {
                for (let tau = s.t0; tau <= Math.min(s.t1, t); tau += 0.06)
                    times.push(tau);
            } else if (s.t1 <= t) times.push(s.t1);
            const dir = Math.sign(s.x1 - s.x0) || 1;
            for (const tau of times) {
                const age = t - tau;
                if (age < 0 || age > 0.6) continue;
                const p = positionAt(plan, id, tau);
                out.push({
                    x: p.x - dir * 40 * actor.scale - dir * age * 60,
                    y: actor.y - 18 - age * 40,
                    r: (16 + age * 70) * actor.scale,
                    o: 1 - age / 0.6,
                });
            }
        }
    }
    return out;
}

/** Dramatic overlay active at t (for camera + FX). */
export function dramaticAt(timeline, t) {
    const o = timeline.acting.overlays.find(
        (ov) => ov.type === "dramatic" && t >= ov.t0 && t < ov.t1,
    );
    if (!o) return null;
    const s = t - o.t0;
    const phase =
        s < DRAMATIC.punch ? "punch" : s < DRAMATIC.eye ? "eye" : "action";
    return { who: o.who, s, phase };
}
