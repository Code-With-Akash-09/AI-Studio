/**
 * Timeline: turns a normalized dialogue + per-line audio info into timed
 * events, then answers "what does every character / the camera look like at
 * time t?" deterministically (pure, no I/O).
 */
import { getStageLayout } from "./backgrounds.js";
import { CHARACTERS } from "./characters.js";
import { characterHeight } from "./rig.js";
import { createRandom, hashString } from "./random.js";

const INTRO = 0.6;
const OUTRO = 1.2;
const REACTION_MIN = 1.1;
const CAMERA_EASE = 0.4;
/** Camera moves start this long before the next line so the switch (and its whoosh) lands in the pause. */
const CAMERA_LEAD = 0.3;
/** Whoosh is placed slightly before the switch (pipeline uses -0.2s for scene cuts). */
const WHOOSH_LEAD = 0.15;
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
        };
    });
    const duration = cursor + OUTRO;

    // Screen switches: every camera re-frame or background change is a transition.
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
    dialogue.cast.forEach((id, slot) => {
        const character = CHARACTERS[id];
        actors[id] = {
            id,
            character,
            slot,
            x: layout.slots[slot],
            y: layout.groundY,
            scale: layout.characterScale,
            flip: slot === 1,
            blinks: blinkSchedule(id, duration),
            headY:
                layout.groundY -
                characterHeight(character) * layout.characterScale * 0.72,
        };
    });

    // SFX cues
    const sfx = transitions.map((tr) => ({
        type: "whoosh",
        time: Math.max(0, tr.time - WHOOSH_LEAD),
        transition: tr.kind,
    }));
    for (const ev of events) {
        if (ev.reaction?.sfx)
            sfx.push({ type: ev.reaction.sfx, time: ev.reactionStart + 0.05 });
        if (ev.beat === "reveal") {
            // riser builds into the switch, impact lands on the flash
            sfx.push({ type: "riser", time: Math.max(0, ev.camStart - 1.0) });
            sfx.push({ type: "impact", time: ev.start });
        }
    }

    return {
        dialogue,
        layout,
        events,
        duration,
        actors,
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

function cameraTarget(timeline, ev) {
    const { layout, actors } = timeline;
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    if (!ev) return { s: 1, x: cx, y: cy };
    switch (ev.camera) {
        case "speaker":
        case "listener": {
            const a =
                actors[ev.camera === "speaker" ? ev.speaker : ev.listenerId];
            return { s: 1.3, x: a.x, y: a.headY + layout.height * 0.12 };
        }
        case "closeup": {
            const a = actors[ev.speaker];
            return {
                s: layout.vertical ? 1.7 : 1.95,
                x: a.x,
                y: a.headY + layout.height * 0.05,
            };
        }
        case "reveal":
            return {
                s: 1.4,
                x: layout.haveli.cx,
                y: layout.horizonY - layout.haveli.h * 0.55,
            };
        default:
            return { s: 1, x: cx, y: cy };
    }
}

function cameraKey(ev) {
    if (ev.camera === "speaker") return `speaker:${ev.speaker}`;
    if (ev.camera === "listener") return `listener:${ev.listenerId}`;
    return ev.camera;
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
            flash = Math.max(
                flash,
                since < FLASH_DUR ? 1 - since / FLASH_DUR : 0,
            );
            beam = Math.max(beam, smooth(since / 0.8));
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
    const from = cameraTarget(timeline, prev);
    const to = cameraTarget(timeline, camEv);
    const anime = timeline.dialogue.style === "anime";
    // Anime style uses hard cuts (with speed lines); flat style eases.
    const k = !camEv
        ? 1
        : camEv.sceneCut || anime
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
            const amp = 12 * (1 - since / 0.4);
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
        if (!ev) return { actor, state };

        const speaking = actor.id === ev.speaker;
        const inReaction =
            ev.reactionStart !== null &&
            t >= ev.reactionStart &&
            t < ev.reactionEnd;

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
            }
        }
        return { actor, state };
    });

    // Anime FX flags
    const fx = { focus: null, speed: 0, impact: false, letterbox: 0 };
    if (anime && camEv) {
        const cutAge = t - camEv.camStart;
        if (camIdx > 0 && cutAge < 0.2 && !camEv.sceneCut)
            fx.speed = 1 - cutAge / 0.2;
        if (["closeup", "reveal"].includes(camEv.camera))
            fx.letterbox = Math.min(1, cutAge / 0.25);
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

    return { t, ev, stage, camera, shake, flash, chars, background, fx };
}
