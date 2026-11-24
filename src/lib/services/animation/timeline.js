/**
 * Timeline: turns a normalized dialogue + per-line audio info into timed
 * events, then answers "what does every character / the camera look like at
 * time t?" deterministically (pure, no I/O).
 */
import { getStageLayout } from "./backgrounds.js";
import {
    DRAMATIC,
    buildActing,
    dramaticAt,
    performanceAt,
    positionAt,
} from "./classic/acting.js";
import { CLASSIC_SCALE, classicHeadCenterY } from "./classic/classicRig.js";
import { CHARACTERS } from "./characters.js";
import { characterHeight } from "./rig.js";
import { createRandom, hashString } from "./random.js";
import {
    SAFE_AREA,
    characterBoxes,
    coreHalfWidth,
    isOffStage,
    planSheru,
    sheruAt,
    sheruBox,
} from "./staging.js";

const INTRO = 0.6;
const OUTRO = 1.2;
const REACTION_MIN = 1.1;
const CAMERA_EASE = 0.4;
/** Camera moves start this long before the next line so the switch lands in the pause. */
const CAMERA_LEAD = 0.3;
const FLASH_DUR = 0.45;

/**
 * @param {object} dialogue - normalized dialogue
 * @param {Array<{duration:number, envelope:number[]}>} lineAudio
 * @param {{width:number, height:number, fps:number}} opts
 */
export function buildTimeline(dialogue, lineAudio, { width, height, fps }) {
    const layout = getStageLayout(width, height);
    let cursor = INTRO;
    const events = dialogue.lines.map((line, i) => {
        const audio = lineAudio[i];
        const start = cursor;
        const end = start + audio.duration;
        const reactionDur = line.reaction
            ? Math.max(REACTION_MIN, line.pauseAfter)
            : 0;
        const pause = line.reaction ? reactionDur : line.pauseAfter;
        cursor = end + pause;
        return {
            ...line,
            start,
            end,
            reactionStart: line.reaction ? end : null,
            reactionEnd: line.reaction ? end + reactionDur : null,
            nextStart: cursor,
            envelope: audio.envelope,
            words: audio.words || [],
        };
    });
    const duration = cursor + OUTRO;

    // Screen switches: every camera re-frame or background change is a transition
    // (visual only — no sound is attached to screen switches).
    const transitions = [];
    let prevKey = "wide";
    let prevBg = dialogue.background;
    events.forEach((ev, i) => {
        const key = cameraKey(ev);
        const bg = ev.background || prevBg;
        const sceneChange = bg !== prevBg;
        ev.bg = bg;
        ev.camStart = ev.start;
        ev.sceneCut = sceneChange;
        if (key !== prevKey || sceneChange) {
            const prev = events[i - 1];
            const gapStart = prev ? (prev.reactionEnd ?? prev.end) : 0.1;
            ev.camStart = Math.max(gapStart, ev.start - CAMERA_LEAD);
            transitions.push({
                time: ev.camStart,
                kind: sceneChange ? "scene" : "camera",
                from: prevKey,
                to: key,
                line: ev.index,
            });
        }
        prevKey = key;
        prevBg = bg;
    });

    // Character placement
    const actors = {};
    const classic = dialogue.style === "classic";
    dialogue.cast.forEach((id, slot) => {
        const character = CHARACTERS[id];
        const scale = classic
            ? (layout.vertical ? 1.25 : 1) * CLASSIC_SCALE
            : layout.characterScale;
        actors[id] = {
            id,
            character,
            slot,
            x: layout.slots[slot],
            y: layout.groundY,
            scale,
            flip: slot === 1,
            blinks: blinkSchedule(id, duration),
            headY: classic
                ? layout.groundY + classicHeadCenterY(character) * scale
                : layout.groundY -
                  characterHeight(character) * layout.characterScale * 0.72,
        };
    });

    // SFX cues: story beats only (comedy reaction + reveal impact).
    // Screen switches (camera cuts / background changes) never get a sound.
    // Off unless the dialogue opts in with "sfx": true (default audio = voices only).
    const sfx = [];
    for (const ev of dialogue.sfx ? events : []) {
        if (ev.reaction?.sfx)
            sfx.push({ type: ev.reaction.sfx, time: ev.reactionStart + 0.05 });
        if (ev.beat === "reveal") sfx.push({ type: "impact", time: ev.start });
    }

    const acting = classic
        ? buildActing(dialogue, events, actors, layout)
        : null;
    // Sheru trots in (never pops up half-hidden behind a prop)
    const sheru = acting
        ? planSheru({
              layout,
              events,
              actors,
              positionAt: (id, t) => positionAt(acting, id, t),
              moves: Object.values(acting.tracks).flatMap((tr) =>
                  tr.segs.filter(
                      (sg) =>
                          Number.isFinite(sg.t1) &&
                          sg.type !== "hidden" &&
                          sg.type !== "held",
                  ),
              ),
              classicScale: CLASSIC_SCALE,
              end: Math.max(duration, acting.end + 0.9),
              revealDelay: (ev) =>
                  ev.actions?.some((a) => a.type === "dramatic")
                      ? DRAMATIC.end - 0.35
                      : 0.25,
          })
        : null;
    // every walk-off / trot-out has finished (fully off-stage) before the
    // last second of the part: its final frames show full characters or none
    let total = acting ? Math.max(duration, acting.end + 1.15) : duration;
    if (sheru) {
        const lastMove = Math.max(
            sheru.t1,
            ...(sheru.segs || [])
                .map((sg) => sg.t1)
                .filter((v) => Number.isFinite(v)),
        );
        total = Math.max(total, sheru.t1 + 1, sheru.end + 0.3, lastMove + 1.15);
    }

    return {
        dialogue,
        layout,
        events,
        duration: total,
        acting,
        actors,
        sheru,
        sfx: sfx.sort((a, b) => a.time - b.time),
        transitions,
        fps,
        width,
        height,
    };
}

function blinkSchedule(id, duration) {
    const rand = createRandom(hashString(id));
    const out = [];
    let t = 0.8 + rand() * 1.5;
    while (t < duration) {
        out.push(t);
        t += 2.2 + rand() * 2.6;
    }
    return out;
}

function blinkAmount(blinks, t) {
    for (const b of blinks) {
        const d = (t - b) / 0.2;
        if (d >= 0 && d <= 1) return 1 - Math.abs(2 * d - 1);
    }
    return 0;
}

function visemeFor(level, frameKey) {
    if (level < 0.12) return "X";
    if (level < 0.35) return "A";
    const v = level < 0.62 ? "B" : "C";
    return hashString(frameKey) % 5 === 0 ? "O" : v;
}

const smooth = (x) => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
};

/** Actor x / head y at time t (moving actors in the classic style). */
function actorFocus(timeline, a, t) {
    if (!timeline.acting) return { x: a.x, headY: a.headY };
    const p = positionAt(timeline.acting, a.id, t);
    return { x: p.x, headY: a.headY + p.lift };
}

function cameraTarget(timeline, ev, t = 0) {
    const { layout, actors } = timeline;
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    if (!ev) return { s: 1, x: cx, y: cy };
    switch (ev.camera) {
        case "speaker":
        case "listener": {
            const a = actorFocus(
                timeline,
                actors[ev.camera === "speaker" ? ev.speaker : ev.listenerId],
                t,
            );
            return { s: 1.3, x: a.x, y: a.headY + layout.height * 0.12 };
        }
        case "closeup": {
            const a = actorFocus(timeline, actors[ev.speaker], t);
            return {
                s: layout.vertical ? 1.7 : 1.95,
                x: a.x,
                y: a.headY + layout.height * 0.05,
            };
        }
        case "reveal":
            if (layout.revealSpot && ev.bg !== "haveli_night") {
                return { s: 1.35, ...layout.revealSpot };
            }
            return {
                s: 1.4,
                x: layout.haveli.cx,
                y: layout.horizonY - layout.haveli.h * 0.55,
            };
        default:
            if (layout.vertical && timeline.acting) {
                // Shorts framing: push in on the pair, keep heads in the upper-middle
                // safe area and the bottom ~20% free for captions / Shorts UI
                // fit everyone on stage (and Sheru once he is in) inside the
                // safe area: zoom out from 1.15 toward 1 when they spread
                let lo = Infinity;
                let hi = -Infinity;
                for (const ac of Object.values(actors)) {
                    const fx = actorFocus(timeline, ac, t).x;
                    if (fx < 0 || fx > layout.width) continue; // entering/exiting
                    const h = coreHalfWidth(ac);
                    lo = Math.min(lo, fx - h);
                    hi = Math.max(hi, fx + h);
                }
                const sp = timeline.sheru;
                const ss = sheruAt(sp, t);
                if (ss && !ss.entering && ss.x > 0 && ss.x < layout.width) {
                    const b = sheruBox(ss.x, sp.y, sp.scale, ss.facing);
                    lo = Math.min(lo, b.x0);
                    hi = Math.max(hi, b.x1);
                } else if (ss?.entering && t > sp.t1 - 0.5) {
                    const w = smooth((t - (sp.t1 - 0.5)) / 0.5);
                    const b = sheruBox(sp.x1, sp.y, sp.scale, sp.facing);
                    if (Number.isFinite(lo)) {
                        lo += (Math.min(lo, b.x0) - lo) * w;
                        hi += (Math.max(hi, b.x1) - hi) * w;
                    } else {
                        lo = b.x0;
                        hi = b.x1;
                    }
                }
                if (!Number.isFinite(lo)) {
                    lo = layout.width * 0.3;
                    hi = layout.width * 0.7;
                }
                const mid = (lo + hi) / 2;
                const margin = layout.width * SAFE_AREA.side * 2;
                const fit = layout.width / Math.max(1, hi - lo + margin);
                // a face-fault reaction needs room to fall: ease the push-in
                // out a little and lean toward the faller (no face off the edge)
                let ff = 0;
                let lean = 0;
                if (
                    ev.reaction?.pose === "facefault" &&
                    ev.reactionStart !== null &&
                    t > ev.reactionStart - 0.2
                ) {
                    const p = Math.min(1, (t - ev.reactionStart + 0.2) / 0.5);
                    ff = p * p * (3 - 2 * p);
                    const who = actors[ev.listenerId];
                    if (who) lean = actorFocus(timeline, who, t).x - mid;
                }
                const s = Math.max(1, Math.min(1.15 - 0.2 * ff, fit));
                const half = layout.width / (2 * s);
                let x = mid + lean * 0.45 * ff;
                // the face-fault lean must not push anyone out of frame
                if (hi - lo <= 2 * half)
                    x = Math.min(lo + half, Math.max(hi - half, x));
                return {
                    s,
                    x: Math.min(layout.width - half, Math.max(half, x)),
                    y: layout.groundY - layout.height * 0.27,
                };
            }
            return { s: 1, x: cx, y: cy };
    }
}

function cameraKey(ev) {
    if (ev.camera === "speaker") return `speaker:${ev.speaker}`;
    if (ev.camera === "listener") return `listener:${ev.listenerId}`;
    return ev.camera;
}

/** Is the actor mid entrance / exit from off-stage at t (classic acting)? */
export function transitingAt(timeline, actorId, t) {
    const tr = timeline.acting?.tracks?.[actorId];
    if (!tr) return false;
    const { layout } = timeline;
    return tr.segs.some(
        (sg) =>
            t >= sg.t0 - 0.05 &&
            t <= sg.t1 + 0.05 &&
            Number.isFinite(sg.x0) &&
            Number.isFinite(sg.x1) &&
            (isOffStage(layout, sg.x0) || isOffStage(layout, sg.x1)),
    );
}

const PARTIAL_MARGIN = 10; // screen px

/**
 * "Full character or none": nudge (or, if needed, widen) a framing so that
 * nobody standing on stage is cut in half by the left / right frame edge.
 * The shot's subject stays fully inside; everyone else ends up fully inside
 * or fully outside. Boxes are world-space core boxes {x0, x1, id}.
 * `loose`: the subject itself may be cropped (extreme eye close-up).
 * `keepScale`: never zoom out to find a fit (crash-zoom motion).
 */
export function fitNoPartial(
    layout,
    cam,
    boxes,
    subject,
    loose = false,
    keepScale = false,
) {
    const W = layout.width;
    const H = layout.height;
    const solve = (s) => {
        const half = W / (2 * s);
        if (half * 2 > W + 0.5) return null;
        let allowed = [[half, W - half]];
        const cut = (opts) => {
            const out = [];
            for (const [a, b] of allowed)
                for (const [c, d] of opts) {
                    const lo = Math.max(a, c);
                    const hi = Math.min(b, d);
                    if (lo <= hi) out.push([lo, hi]);
                }
            allowed = out;
        };
        const m = PARTIAL_MARGIN / s;
        for (const b of boxes) {
            const inside = [b.x1 + m - half, b.x0 - m + half];
            if (b.id === subject && !loose) cut([inside]);
            else
                cut([
                    inside,
                    [-Infinity, b.x0 - half - m],
                    [b.x1 + half + m, Infinity],
                ]);
            if (!allowed.length) return null;
        }
        let best = null;
        for (const [a, b] of allowed) {
            const x = Math.min(b, Math.max(a, cam.x));
            if (best === null || Math.abs(x - cam.x) < Math.abs(best - cam.x))
                best = x;
        }
        return best;
    };
    const x0 = solve(cam.s);
    if (x0 !== null) return { ...cam, x: x0 };
    // the ~0.2s crash zoom keeps its scale (no zoom jump mid-punch)
    if (keepScale) return cam;
    // an eye close-up may push in tighter to lose a neighbour's sliver
    if (loose)
        for (let s = cam.s + 0.1; s <= cam.s * 1.6; s += 0.1) {
            const x = solve(s);
            if (x !== null) {
                const halfH = H / (2 * s);
                return {
                    s,
                    x,
                    y: Math.min(H - halfH, Math.max(halfH, cam.y)),
                };
            }
        }
    for (let s = cam.s - 0.05; s > 1.0001; s -= 0.05) {
        const x = solve(s);
        if (x !== null) {
            const halfH = H / (2 * s);
            return {
                s,
                x,
                y: Math.min(H - halfH, Math.max(halfH, cam.y)),
            };
        }
    }
    return { s: 1, x: W / 2, y: H / 2 };
}

/** Clamp the camera so zoomed frames never show outside the stage. */
function clampCamera(cam, layout) {
    const halfW = layout.width / (2 * cam.s);
    const halfH = layout.height / (2 * cam.s);
    return {
        s: cam.s,
        x: Math.min(layout.width - halfW, Math.max(halfW, cam.x)),
        y: Math.min(layout.height - halfH, Math.max(halfH, cam.y)),
    };
}

export function activeEventIndex(timeline, t) {
    const { events } = timeline;
    for (let i = events.length - 1; i >= 0; i--) {
        if (t >= events[i].start) return i;
    }
    return -1;
}

/**
 * Full frame state at time t.
 */
let probingEye = false;
let fitMiss = false;

/** Does a dramatic beat's whole eye close-up (starting at t0) fit without
 *  a half-cut neighbour on every frame? Memoised per beat. */
function eyeShotFits(timeline, t0) {
    const memo = (timeline._eyeFit ??= new Map());
    const key = t0.toFixed(3);
    if (!memo.has(key)) {
        let ok = true;
        probingEye = true;
        try {
            const step = 1 / (timeline.fps || 24);
            for (let s = DRAMATIC.punch; s < DRAMATIC.eye && ok; s += step) {
                fitMiss = false;
                frameState(timeline, t0 + s, 0);
                if (fitMiss) ok = false;
            }
        } finally {
            probingEye = false;
            fitMiss = false;
        }
        memo.set(key, ok);
    }
    return memo.get(key);
}

export function frameState(timeline, t, frameIndex) {
    const { events, actors, layout } = timeline;
    const idx = activeEventIndex(timeline, t);
    const ev = idx >= 0 ? events[idx] : null;

    // Stage (background) state accumulates across lines
    const stage = { t, ...timeline.dialogue.stage };
    let beam = 0;
    let flash = 0;
    let glint = 0;
    for (let i = 0; i <= idx; i++) {
        const e = events[i];
        if (e.stage) Object.assign(stage, e.stage);
        if (e.beat === "reveal") {
            const since = t - e.start;
            const dramaBeat = e.actions?.some((a) => a.type === "dramatic");
            flash = Math.max(
                flash,
                (since < FLASH_DUR ? 1 - since / FLASH_DUR : 0) *
                    (dramaBeat ? 0.3 : 1),
            );
            const hold = e.actions?.some((a) => a.type === "dramatic")
                ? DRAMATIC.end - 0.15
                : 0;
            beam = Math.max(beam, smooth((since - hold) / 0.7));
            glint = Math.max(glint, 0.5 + 0.5 * Math.sin(t * 9));
        }
    }
    stage.beam = beam;
    stage.mirrorGlint = glint;

    // Camera: eases from the previous framing, starting at the line's camStart
    // (scene/background changes are hard cuts).
    let camIdx = -1;
    for (let i = events.length - 1; i >= 0; i--) {
        if (t >= events[i].camStart) {
            camIdx = i;
            break;
        }
    }
    const camEv = camIdx >= 0 ? events[camIdx] : null;
    const prev = camIdx > 0 ? events[camIdx - 1] : null;
    const from = cameraTarget(timeline, prev, t);
    const to = cameraTarget(timeline, camEv, t);
    const anime = timeline.dialogue.style === "anime";
    const classic = timeline.dialogue.style === "classic";
    // Anime style uses hard cuts (with speed lines); flat style eases.
    const k = !camEv
        ? 1
        : camEv.sceneCut || anime || classic
          ? 1
          : smooth((t - camEv.camStart) / CAMERA_EASE);
    const background = camEv?.bg || timeline.dialogue.background;
    const raw = {
        s: from.s + (to.s - from.s) * k,
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
    };
    if (anime) {
        // slow handheld drift + push-in so parallax layers keep moving
        const since = camEv ? t - camEv.camStart : t;
        raw.s *= 1.03 + Math.min(since, 6) * 0.006;
        raw.x += Math.sin(t * 0.21) * layout.width * 0.012;
        raw.y += Math.sin(t * 0.17 + 1) * layout.height * 0.006;
    }
    let camera = clampCamera(raw, layout);
    let shake = [0, 0];
    if (ev?.beat === "humor" && ev.reactionStart !== null) {
        const since = t - ev.reactionStart;
        if (since >= 0 && since < 0.4) {
            const amp = 7 * (1 - since / 0.4);
            shake = [
                Math.sin(frameIndex * 2.7) * amp,
                Math.cos(frameIndex * 3.3) * amp,
            ];
        }
    }
    if (ev?.beat === "reveal" && t - ev.start < 0.3) {
        camera = {
            ...camera,
            s: camera.s * (1 + 0.06 * (1 - (t - ev.start) / 0.3)),
        };
    }

    // Classic dramatic beat: zoom-punch → intense eye close-up → action pose
    const drama = timeline.acting ? dramaticAt(timeline, t) : null;
    const preDrama = camera;
    if (drama) {
        const a = actors[drama.who];
        const f = actorFocus(timeline, a, t);
        const eyeY = f.headY + a.character.classic.headR * 0.06 * a.scale;
        if (drama.phase === "punch") {
            const p = drama.s / DRAMATIC.punch;
            const target = {
                s: 1.9,
                x: f.x,
                y: f.headY + layout.height * 0.06,
            };
            const k2 = 1 + Math.sin(Math.PI * Math.min(1, p)) * 0.12;
            camera = clampCamera(
                {
                    s:
                        (camera.s +
                            (target.s - camera.s) * Math.min(1, p * 1.4)) *
                        k2,
                    x: camera.x + (target.x - camera.x) * Math.min(1, p * 1.4),
                    y: camera.y + (target.y - camera.y) * Math.min(1, p * 1.4),
                },
                layout,
            );
        } else if (drama.phase === "eye") {
            const p =
                (drama.s - DRAMATIC.punch) / (DRAMATIC.eye - DRAMATIC.punch);
            camera = clampCamera(
                {
                    s: (layout.vertical ? 2.9 : 3.5) * (1 + p * 0.08),
                    x: f.x,
                    y: eyeY,
                },
                layout,
            );
        } else {
            const p = (drama.s - DRAMATIC.eye) / (DRAMATIC.end - DRAMATIC.eye);
            const act = {
                s: 1.45 * (1 + p * 0.06),
                x: f.x + layout.width * 0.04 * (a.slot === 1 ? -1 : 1),
                y: f.headY + layout.height * 0.14,
            };
            // ease out of the action framing into the line's own shot (no jump)
            const w = smooth(Math.max(0, (p - 0.55) / 0.45));
            drama.fade = w;
            camera = clampCamera(
                {
                    s: act.s + (camera.s - act.s) * w,
                    x: act.x + (camera.x - act.x) * w,
                    y: act.y + (camera.y - act.y) * w,
                },
                layout,
            );
            if (p < 0.25) {
                const amp = 10 * (1 - p / 0.25);
                shake = [
                    Math.sin(frameIndex * 2.9) * amp,
                    Math.cos(frameIndex * 3.7) * amp,
                ];
            }
        }
    }

    // Characters
    const chars = Object.values(actors).map((actor) => {
        const state = {
            x: actor.x,
            y: actor.y,
            scale: actor.scale,
            flip: actor.flip,
            t,
            blink: blinkAmount(actor.blinks, t),
            expression: "neutral",
            pose: "idle",
            mouth: "X",
            talking: false,
            look: [0.55, 0],
        };
        state.since = t;
        if (timeline.acting) {
            Object.assign(state, performanceAt(timeline, actor, t), {
                groundY: actor.y,
            });
            return { actor, state };
        }
        if (!ev) return { actor, state };

        const speaking = actor.id === ev.speaker;
        const inReaction =
            ev.reactionStart !== null &&
            t >= ev.reactionStart &&
            t < ev.reactionEnd;

        state.since = t - ev.start;
        if (speaking) {
            state.expression = ev.expression;
            state.pose = ev.pose;
            if (ev.look === "camera") state.look = [0, 0.05];
            if (t < ev.end) {
                const f = Math.floor((t - ev.start) * timeline.fps);
                const level = ev.envelope[f] ?? 0;
                state.mouth = visemeFor(level, `${ev.index}:${f}`);
                state.talking = state.mouth !== "X";
            }
        } else {
            state.expression = ev.listener.expression;
            state.pose = ev.listener.pose;
            if (inReaction) {
                state.expression = ev.reaction.expression;
                state.pose = ev.reaction.pose;
                state.since = t - ev.reactionStart;
            }
        }
        return { actor, state };
    });

    // classic: no character cut in half by the frame edge (except one
    // walking in / out from off-stage, which is motion, not framing)
    if (classic && timeline.acting) {
        const subj = drama
            ? drama.who
            : camEv?.camera === "listener"
              ? camEv.listenerId
              : ["speaker", "closeup"].includes(camEv?.camera)
                ? camEv.speaker
                : null;
        const boxes = [];
        for (const { actor, state } of chars) {
            if (transitingAt(timeline, actor.id, t)) continue;
            const fx = state.x ?? actor.x;
            if (isOffStage(layout, fx)) continue;
            const b = characterBoxes(actor, state).core;
            boxes.push({ x0: b.x0, x1: b.x1, id: actor.id });
        }
        // a standing Sheru counts too (trotting in / out is motion)
        const dog = sheruAt(timeline.sheru, t);
        if (dog && !dog.moving && !dog.entering && !isOffStage(layout, dog.x)) {
            const b = sheruBox(dog.x, dog.groundY, dog.scale, dog.facing);
            boxes.push({ x0: b.x0, x1: b.x1, id: "sheru" });
        }
        const eye = drama?.phase === "eye";
        const punch = drama?.phase === "punch";
        if (boxes.length) {
            const fitted = fitNoPartial(
                layout,
                camera,
                boxes,
                subj,
                eye,
                punch,
            );
            if (eye && probingEye) fitMiss = fitted.s < camera.s - 1e-6;
            else if (
                (eye || punch) &&
                !probingEye &&
                !eyeShotFits(timeline, t - drama.s)
            )
                // this beat's eye close-up would show a half neighbour: hold
                // one steady shot (no crash zoom, no flicker to a wide)
                camera = fitNoPartial(layout, preDrama, boxes, subj);
            else camera = fitted;
        }
    }

    // Anime FX flags
    const fx = { focus: null, speed: 0, impact: false, letterbox: 0 };
    if (anime && camEv) {
        const cutAge = t - camEv.camStart;
        if (camIdx > 0 && cutAge < 0.2 && !camEv.sceneCut)
            fx.speed = 1 - cutAge / 0.2;
        if (["closeup", "reveal"].includes(camEv.camera))
            fx.letterbox = Math.min(1, cutAge / 0.25);
    }
    if (classic && ev?.beat === "reveal") {
        for (const c of chars) {
            if (
                c.actor.character.classic?.glasses &&
                c.actor.id === ev.speaker
            ) {
                const hold = ev.actions?.some((a) => a.type === "dramatic")
                    ? DRAMATIC.eye + 0.15
                    : 0.35;
                c.state.glint = Math.max(
                    0,
                    1 - Math.abs(t - ev.start - hold) / 0.45,
                );
            }
        }
    }
    if (drama) fx.dramatic = drama;
    if (classic && ev && camEv?.camera === "closeup" && !drama) {
        // gag backdrop behind a shocked/scared close-up
        fx.gag = ["shocked", "scared", "crying"].includes(ev.expression);
    }
    if (anime && ev) {
        const speakerActor = actors[ev.speaker];
        const listenerActor = actors[ev.listenerId];
        const inReaction =
            ev.reactionStart !== null &&
            t >= ev.reactionStart &&
            t < ev.reactionEnd;
        if (inReaction && ev.beat === "humor") {
            fx.focus = {
                x: listenerActor.x,
                y: listenerActor.headY + layout.height * 0.06,
                strength: 0.75,
            };
        } else if (
            t < ev.end + 0.2 &&
            (ev.camera === "closeup" ||
                ["shocked", "scared"].includes(ev.expression))
        ) {
            fx.focus = {
                x: speakerActor.x,
                y: speakerActor.headY + layout.height * 0.06,
                strength: ev.camera === "closeup" ? 0.9 : 0.6,
            };
        }
        if (
            (ev.beat === "reveal" || ev.expression === "shocked") &&
            t >= ev.start &&
            t - ev.start < (ev.beat === "reveal" ? 0.17 : 0.09)
        ) {
            fx.impact = true;
        }
        for (const c of chars) {
            if (
                c.actor.character.anime?.glasses &&
                c.actor.id === ev.speaker &&
                ev.beat === "reveal"
            ) {
                c.state.glint = Math.max(
                    0,
                    1 - Math.abs(t - ev.start - 0.35) / 0.45,
                );
            }
        }
    }

    const sheru = sheruAt(timeline.sheru, t);
    return {
        t,
        ev,
        stage,
        camera,
        shake,
        flash,
        chars,
        sheru,
        background,
        fx,
        shot: drama ? "dramatic" : camEv?.camera || "wide",
        // who a speaker / listener / close-up shot is framed on
        subject:
            !camEv || drama
                ? null
                : camEv.camera === "listener"
                  ? camEv.listenerId
                  : ["speaker", "closeup"].includes(camEv.camera)
                    ? camEv.speaker
                    : null,
        camIdx,
    };
}
