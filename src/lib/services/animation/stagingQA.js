/**
 * Frame-by-frame staging validator for classic timelines. Pure math (no
 * rendering): walks every output frame and reports
 *   - edge:     a character / Sheru cut by the frame edge in a wide shot
 *               (entrances and exits from off-stage are allowed),
 *   - subject:  the subject of a speaker/listener/close-up shot has its head
 *               outside the frame,
 *   - occluded: a head (or more than half a torso) covered by someone drawn
 *               in front, or by a foreground prop,
 *   - peek:     a hiding character shows less than ~half the head,
 *   - pop:      something appears (or vanishes) in one frame without a cut,
 *   - end:      someone cut by the frame edge in the last second / last
 *               frame of the part (exits included: full character or none).
 * Outside wide shots, a character half cut by the left / right edge is an
 * "edge" violation too (only an extreme eye close-up may crop its subject).
 */
import {
    boxArea,
    boxOverlap,
    characterBoxes,
    isOffStage,
    sheruBox,
} from "./staging.js";
import { frameState } from "./timeline.js";

const EDGE_TOL = 6; // px
const POP_JUMP = 0.35;
/** The last END_WINDOW seconds (and the last frame) get the strict check. */
const END_WINDOW = 1.0;

function toScreen(layout, cam, b) {
    if (!b) return null;
    const sx = (x) => (x - cam.x) * cam.s + layout.width / 2;
    const sy = (y) => (y - cam.y) * cam.s + layout.height / 2;
    return { x0: sx(b.x0), x1: sx(b.x1), y0: sy(b.y0), y1: sy(b.y1) };
}

function visibleFraction(layout, b) {
    const a = boxArea(b);
    if (!a) return 0;
    return (
        boxOverlap(b, { x0: 0, y0: 0, x1: layout.width, y1: layout.height }) / a
    );
}

/** Foreground props drawn over the characters (screen space). */
function foregroundBoxes(timeline, frame) {
    const { layout } = timeline;
    const bg = frame.background || timeline.dialogue.background;
    if (bg !== "gali_day" || frame.fx?.gag) return [];
    // grass tufts in the two bottom corners (parallax f = 1.25), see
    // classicBackgrounds.js foreground()
    const { width: W, height: H } = layout;
    const f = 1.25;
    const cam = frame.camera;
    const s = 1 + (cam.s - 1) * f;
    const cx = W / 2 + (cam.x - W / 2) * f;
    const cy = H / 2 + (cam.y - H / 2) * f;
    const tf = (x, y) => [(x - cx) * s + W / 2, (y - cy) * s + H / 2];
    return [
        [-W * 0.02 - 90, W * 0.02 + 150],
        [W * 1.02 - 150, W * 1.02 + 90],
    ].map(([a, b]) => {
        const [x0, y0] = tf(a, H * 1.02 - 175);
        const [x1, y1] = tf(b, H * 1.02 + 40);
        return { x0, y0, x1, y1, id: "foreground-grass" };
    });
}

/** Is the actor mid entrance / exit from off-stage at t? */
function transiting(timeline, actorId, t) {
    const tr = timeline.acting?.tracks?.[actorId];
    if (!tr) return false;
    const { layout } = timeline;
    return tr.segs.some(
        (s) =>
            t >= s.t0 - 0.05 &&
            t <= s.t1 + 0.05 &&
            Number.isFinite(s.x0) &&
            Number.isFinite(s.x1) &&
            (isOffStage(layout, s.x0) || isOffStage(layout, s.x1)),
    );
}

/**
 * @param {object} timeline - classic timeline (buildTimeline)
 * @param {{fps?: number, maxPerKind?: number}} [opts]
 * @returns {{frames:number, violations: Array, counts: Record<string, number>}}
 */
export function validateStaging(timeline, opts = {}) {
    const { layout } = timeline;
    const fps = opts.fps || timeline.fps;
    const nFrames = Math.ceil(timeline.duration * fps);
    const violations = [];
    const counts = {};
    const add = (v) => {
        counts[v.kind] = (counts[v.kind] || 0) + 1;
        if (
            violations.filter((x) => x.kind === v.kind && x.who === v.who)
                .length < (opts.maxPerKind || 5)
        )
            violations.push(v);
    };
    if (timeline.dialogue.style !== "classic" || !timeline.acting)
        return { frames: 0, violations, counts };
    let prev = null;
    for (let f = 0; f < nFrames; f++) {
        const t = f / fps;
        const frame = frameState(timeline, t, f);
        const cam = frame.camera;
        const wide =
            frame.shot === "wide" && !frame.fx?.dramatic && !frame.fx?.gag;
        const items = [];
        for (const { actor, state } of frame.chars) {
            const b = characterBoxes(actor, state);
            items.push({
                who: actor.id,
                state,
                layer: state.behind
                    ? -1
                    : state.held || state.move === "jump"
                      ? 1
                      : 0,
                full: toScreen(layout, cam, b.full),
                core: toScreen(layout, cam, b.core),
                head: toScreen(layout, cam, b.head),
                torso: toScreen(layout, cam, b.torso),
                moving: !!state.move,
                transit: transiting(timeline, actor.id, t),
                hiding: !!state.behind && !state.move,
            });
        }
        if (frame.sheru) {
            const s = frame.sheru;
            const box = toScreen(
                layout,
                cam,
                sheruBox(s.x, s.groundY, s.scale, s.facing),
            );
            items.push({
                who: "sheru",
                layer: s.front ? 2 : -2,
                full: box,
                core: box,
                head: null,
                torso: null,
                moving: s.moving,
                transit: s.moving,
                entering: s.entering,
                dog: true,
            });
        }
        const at = { frame: f, t: Number(t.toFixed(2)), shot: frame.shot };

        // 1. frame edges. Wide shots: nobody cut at all (top included).
        // Every other shot: nobody cut in half by the left / right edge (full
        // character or none) — except the subject of an extreme eye close-up.
        const loose =
            frame.fx?.dramatic && frame.fx.dramatic.phase === "eye"
                ? frame.fx.dramatic.who
                : null;
        // the ~0.2s crash zoom of a dramatic beat is camera motion
        const crash = frame.fx?.dramatic?.phase === "punch";
        const tail = t >= timeline.duration - END_WINDOW || f === nFrames - 1;
        for (const it of items) {
            const b = it.core;
            const sideCut =
                (b.x0 < -EDGE_TOL && b.x1 > EDGE_TOL) ||
                (b.x0 < layout.width - EDGE_TOL &&
                    b.x1 > layout.width + EDGE_TOL);
            const cut = sideCut || b.y0 < -EDGE_TOL;
            const inFrame = visibleFraction(layout, b) > 0;
            if (wide && cut && inFrame && !it.transit)
                add({ kind: "edge", who: it.who, ...at });
            else if (
                !wide &&
                sideCut &&
                !it.transit &&
                it.who !== loose &&
                !crash
            )
                add({ kind: "edge", who: it.who, ...at });
            // 1b. the end of a part / video (last second, last frame): full
            // characters or none, exits included
            if (tail && sideCut && it.who !== loose)
                add({ kind: "end", who: it.who, ...at });
        }
        // 2. subject of a close shot
        if (frame.subject) {
            const id = frame.subject;
            const it = items.find((i) => i.who === id);
            if (
                it?.head &&
                visibleFraction(layout, it.head) < 0.9 &&
                !it.transit
            )
                add({ kind: "subject", who: id, ...at });
        }
        // 3. occlusion (z-order as drawn) + 4. peeks
        const fg = foregroundBoxes(timeline, frame);
        for (const it of items) {
            if (!it.head && !it.dog) continue;
            // occluders: anyone drawn in front (characters share layer 0, so
            // treat the other one as covering too: conservative). Someone
            // just passing by (walk / trot) is a transient overlap, not staging.
            const covering = (o) =>
                o !== it &&
                !o.moving &&
                !o.transit &&
                (o.layer > it.layer ||
                    (o.layer === it.layer && !o.dog && !it.dog));
            const over = items.filter(covering).map((o) => o.core);
            over.push(...fg);
            const target = it.dog ? it.full : it.head;
            const vis = visibleFraction(layout, target);
            if (vis < 0.05) continue; // off screen: handled by edge / pop
            const cov = Math.min(
                1,
                over.reduce((sum, o) => sum + boxOverlap(target, o), 0) /
                    boxArea(target),
            );
            if (it.hiding) {
                if (cov > 0.5)
                    add({
                        kind: "peek",
                        who: it.who,
                        cover: +cov.toFixed(2),
                        ...at,
                    });
                continue;
            }
            if (it.moving || it.transit) continue;
            if (it.dog) {
                if (cov > 0.12)
                    add({
                        kind: "occluded",
                        who: it.who,
                        cover: +cov.toFixed(2),
                        ...at,
                    });
                continue;
            }
            const torsoCov = it.torso
                ? Math.min(
                      1,
                      over
                          .filter(
                              (o) =>
                                  o.id === "foreground-grass" ||
                                  items.find((i) => i.core === o)?.dog ||
                                  items.find((i) => i.core === o)?.layer >
                                      it.layer,
                          )
                          .reduce(
                              (sum, o) => sum + boxOverlap(it.torso, o),
                              0,
                          ) / boxArea(it.torso),
                  )
                : 0;
            if (cov > 0.12 || torsoCov > 0.5)
                add({
                    kind: "occluded",
                    who: it.who,
                    cover: +cov.toFixed(2),
                    torso: +torsoCov.toFixed(2),
                    ...at,
                });
        }
        // 5. pops (no cut between the two frames)
        // only judged on a still camera: cuts and camera moves legitimately
        // bring things into view; the pose-independent box is used so a pose
        // change (arms out, face-fault) is not mistaken for a pop
        const cut =
            prev &&
            (prev.camIdx !== frame.camIdx ||
                prev.shot !== frame.shot ||
                Math.abs(prev.cam.s - cam.s) > 0.01 ||
                Math.abs(prev.cam.x - cam.x) > 4 ||
                Math.abs(prev.cam.y - cam.y) > 4);
        const vis = {};
        for (const it of items) vis[it.who] = visibleFraction(layout, it.core);
        if (prev && !cut) {
            for (const who of new Set([
                ...Object.keys(vis),
                ...Object.keys(prev.vis),
            ])) {
                const a = prev.vis[who] ?? 0;
                const b = vis[who] ?? 0;
                if (Math.abs(b - a) > POP_JUMP)
                    add({
                        kind: "pop",
                        who,
                        from: +a.toFixed(2),
                        to: +b.toFixed(2),
                        ...at,
                    });
            }
        }
        prev = { camIdx: frame.camIdx, shot: frame.shot, cam, vis };
    }
    return { frames: nFrames, violations, counts };
}
