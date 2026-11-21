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
    const sfx = [];
    for (const ev of events) {
        if (ev.reaction?.sfx)
            sfx.push({ type: ev.reaction.sfx, time: ev.reactionStart + 0.05 });
        if (ev.beat === "reveal") {
            sfx.push({ type: "riser", time: Math.max(0, ev.start - 1.2) });
            sfx.push({ type: "impact", time: ev.start });
        }
    }

    return {
        dialogue,
        layout,
        events,
        duration,
        actors,
        sfx,
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

    // Camera with easing from previous event's framing
    const prev = idx > 0 ? events[idx - 1] : null;
    const from = cameraTarget(timeline, prev);
    const to = cameraTarget(timeline, ev);
    const k = ev ? smooth((t - ev.start) / CAMERA_EASE) : 1;
    let camera = clampCamera(
        {
            s: from.s + (to.s - from.s) * k,
            x: from.x + (to.x - from.x) * k,
            y: from.y + (to.y - from.y) * k,
        },
        layout,
    );
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

    return { t, ev, stage, camera, shake, flash, chars };
}
