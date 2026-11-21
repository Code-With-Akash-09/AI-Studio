/**
 * Classic-rig QA: contact sheets for spotting misalignment / glitches.
 *
 *   node .scripts/animation/rig-qa.mjs [sample.json] [--out=/workspace/anim-demo/qa/v5]
 *        [--vertical] [--no-matrix] [--no-shots] [--frames=24]
 *
 * 1. Test matrices per character (rendered straight from the rig):
 *    head angle x expression, head angle x mouth shape, expression x mouth shape,
 *    pose x arm/leg state (full body).
 * 2. Shot sheets from the exact render timeline (TTS from cache): for every shot
 *    and every scripted action, 24 consecutive frames, zoomed on each character's
 *    head and on the full body.
 * Writes only to --out. Needs python3 + Pillow for tiling (qa_tile.py).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { EXPRESSIONS, POSES } from "../../src/constants/animation.js";
import { getCharacter } from "../../src/lib/services/animation/characters.js";
import { buildClassicFrameSvg } from "../../src/lib/services/animation/classic/classicFrame.js";
import {
    classicGeometry,
    renderClassicCharacter,
} from "../../src/lib/services/animation/classic/classicRig.js";
import { buildCharacterTimeline } from "../../src/lib/services/animation/index.js";
import { frameState } from "../../src/lib/services/animation/timeline.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (k) => args.includes(`--${k}`);
const opt = (k, d) =>
    (args.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3) || d;
const samplePath =
    args.find((a) => !a.startsWith("--")) ||
    "src/lib/services/animation/samples/gali-ball-classic.json";
const outDir = path.resolve(opt("out", "/workspace/anim-demo/qa/latest"));
const nFrames = Number(opt("frames", 24));
const work = path.join(outDir, "_work");
fs.mkdirSync(work, { recursive: true });

const png = (svg) =>
    new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
const sheets = [];

const MOUTHS = ["X", "M", "F", "A", "B", "C", "E", "O", "U"];
const YAWS = [-0.35, 0, 0.15, 0.3, 0.45, 0.62, 0.9];
const base = (extra = {}) => ({
    t: 3.3,
    expression: "neutral",
    since: 10,
    pose: "idle",
    prevPose: "idle",
    poseSince: 10,
    mouth: "X",
    talking: false,
    level: 0,
    yaw: 0,
    facing: 1,
    look: [0.55, 0],
    blink: 0,
    stopAge: 10,
    ...extra,
});

/** One matrix sheet: rows x cols of states, head-zoomed or full body. */
function matrix(ch, name, rows, cols, make, { body = false } = {}) {
    const g = classicGeometry(ch.classic);
    const R = g.R;
    const cw = body ? R * 4.4 : R * 3;
    const chh = body ? R * 4.6 : R * 3;
    const W = Math.ceil(cols.length * cw);
    const H = Math.ceil(rows.length * chh);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#CFE8F7"/>`;
    const cells = [];
    rows.forEach((r, i) => {
        cols.forEach((c, j) => {
            const x = j * cw + cw / 2;
            const y = body
                ? (i + 1) * chh - R * 0.35
                : i * chh + chh / 2 - g.headCY;
            svg += renderClassicCharacter(ch, {
                ...make(r, c),
                x,
                y,
                groundY: y,
                scale: 1,
                uid: `m${i}x${j}`,
            });
            cells.push({
                box: [j * cw, i * chh, cw, chh],
                label: `${r} | ${c}`,
            });
        });
    });
    svg += "</svg>";
    const img = path.join(work, `${ch.id}-${name}.png`);
    fs.writeFileSync(img, png(svg));
    sheets.push({
        out: path.join(outDir, `matrix-${ch.id}-${name}.png`),
        title: `${ch.id}: ${name}`,
        cols: cols.length,
        cell: body ? [220, 230] : [210, 210],
        cells: cells.map((c) => ({ ...c, img })),
    });
}

if (!flag("no-matrix")) {
    for (const id of ["raazu", "golu", "nani"]) {
        const ch = getCharacter(id);
        if (!ch?.classic) continue;
        matrix(ch, "yaw-x-expression", EXPRESSIONS, YAWS, (e, yaw) =>
            base({ expression: e, yaw }),
        );
        matrix(ch, "yaw-x-mouth", MOUTHS, YAWS, (m, yaw) =>
            base({ mouth: m, talking: m !== "X", level: 0.6, yaw }),
        );
        matrix(ch, "expression-x-mouth", EXPRESSIONS, MOUTHS, (e, m) =>
            base({
                expression: e,
                mouth: m,
                talking: m !== "X",
                level: 0.6,
                yaw: 0.3,
            }),
        );
        matrix(
            ch,
            "blink-look-x-yaw",
            ["blink 0", "blink .5", "blink 1", "look L", "look R", "look up"],
            YAWS,
            (r, yaw) =>
                base({
                    yaw,
                    blink: r.startsWith("blink") ? Number(r.slice(6)) : 0,
                    look:
                        r === "look L"
                            ? [-0.6, 0]
                            : r === "look R"
                              ? [0.6, 0]
                              : r === "look up"
                                ? [0, -0.5]
                                : [0.55, 0],
                }),
        );
        const states = [
            "still",
            "walk 0",
            "walk .25",
            "walk .5",
            "walk .75",
            "run .25",
            "blend .05",
            "blend .15",
            "blend .3",
        ];
        matrix(
            ch,
            "pose-x-state",
            POSES,
            states,
            (pose, st) => {
                const s = base({ pose, yaw: 0.35 });
                if (st.startsWith("walk") || st.startsWith("run")) {
                    s.walk = {
                        phase: Number(st.split(" ")[1]),
                        amt: 1,
                        run: st.startsWith("run"),
                    };
                }
                if (st.startsWith("blend")) {
                    s.prevPose = "idle";
                    s.poseSince = Number(st.split(" ")[1]);
                }
                return s;
            },
            { body: true },
        );
    }
}

if (!flag("no-shots")) {
    const dialogue = JSON.parse(fs.readFileSync(samplePath, "utf8"));
    const tl = await buildCharacterTimeline(dialogue, {
        dimension: flag("vertical") ? "vertical" : undefined,
        cacheDir: "/workspace/anim-demo/tts-cache",
    });
    const { fps, layout } = tl;
    const windows = [];
    tl.events.forEach((e, i) => {
        const end = tl.events[i + 1]?.camStart ?? tl.duration;
        const mid = (Math.max(e.camStart, 0) + end) / 2;
        windows.push([
            `shot${i + 1}-${e.camera}`,
            Math.max(0, mid - nFrames / fps / 2),
        ]);
        windows.push([`shot${i + 1}-cut-in`, Math.max(0, e.camStart - 0.25)]);
    });
    for (const [id, tr] of Object.entries(tl.acting?.tracks || {})) {
        for (const sg of tr.segs) {
            if (Number.isFinite(sg.t0))
                windows.push([`${id}-${sg.type}`, Math.max(0, sg.t0 - 0.2)]);
        }
    }
    for (const ov of tl.acting?.overlays || []) {
        windows.push([`${ov.who}-${ov.type}-a`, ov.t0]);
        windows.push([`${ov.who}-${ov.type}-b`, ov.t0 + 1]);
    }
    const toScreen = (cam, wx, wy) => [
        (wx - cam.x) * cam.s + layout.width / 2,
        (wy - cam.y) * cam.s + layout.height / 2,
    ];
    for (const [label, t0] of windows) {
        const f0 = Math.round(t0 * fps);
        const per = {};
        for (let k = 0; k < nFrames; k++) {
            const f = f0 + k;
            const t = f / fps;
            if (t > tl.duration) break;
            const frame = frameState(tl, t, f);
            const img = path.join(work, `f${String(f).padStart(5, "0")}.png`);
            if (!fs.existsSync(img))
                fs.writeFileSync(img, png(buildClassicFrameSvg(tl, frame, f)));
            for (const { actor, state } of frame.chars) {
                const g = classicGeometry(actor.character.classic);
                const k2 = (state.scale ?? 1) * frame.camera.s;
                const [hx, hy] = toScreen(
                    frame.camera,
                    state.x,
                    state.y + g.headCY * state.scale,
                );
                const [bx, by] = toScreen(frame.camera, state.x, state.y);
                const hs = g.R * 2.5 * k2;
                const head = [hx - hs / 2, hy - hs / 2, hs, hs];
                const body = [
                    bx - g.R * 2.3 * k2,
                    by - g.R * 3.7 * k2,
                    g.R * 4.6 * k2,
                    g.R * 4 * k2,
                ];
                const onScreen = ([x, y, w, h]) =>
                    x + w > 0 &&
                    y + h > 0 &&
                    x < layout.width &&
                    y < layout.height;
                for (const [kind, box] of [
                    ["head", head],
                    ["body", body],
                ]) {
                    if (!onScreen(box)) continue;
                    const key = `${actor.id}-${kind}`;
                    per[key] ||= [];
                    per[key].push({
                        img,
                        box,
                        label: `f${f} ${t.toFixed(2)}s ${state.pose}/${state.expression} ${state.mouth || ""} y${(state.yaw ?? 0).toFixed(2)}`,
                    });
                }
            }
        }
        for (const [key, cells] of Object.entries(per)) {
            sheets.push({
                out: path.join(outDir, `shot-${label}-${key}.png`),
                title: `${label} ${key} (from ${t0.toFixed(2)}s)`,
                cols: 6,
                cell: key.endsWith("head") ? [260, 260] : [220, 200],
                cells,
            });
        }
    }
}

const manifest = path.join(work, "manifest.json");
fs.writeFileSync(manifest, JSON.stringify({ sheets }));
const r = spawnSync("python3", [path.join(here, "qa_tile.py"), manifest], {
    stdio: ["ignore", "ignore", "inherit"],
});
if (r.status !== 0) process.exit(r.status || 1);
fs.rmSync(work, { recursive: true, force: true });
console.log(`${sheets.length} QA sheets → ${outDir}`);
