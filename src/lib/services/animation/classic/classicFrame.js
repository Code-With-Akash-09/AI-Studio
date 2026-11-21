/**
 * Compose one classic-style frame: flat parallax layers → characters →
 * foreground → simple comedy FX (gag sunburst backdrop on shocked close-ups,
 * reveal flash). Hard cuts only; no colour grading.
 */
import { focusLines, letterbox, speedLines } from "../anime/fx.js";
import { dustPuffs } from "./acting.js";
import { renderClassicLayers } from "./classicBackgrounds.js";
import { classicGeometry, OUT, renderClassicCharacter } from "./classicRig.js";

const n = (v) => Math.round(v * 100) / 100;

function parallax(layout, camera, shake, f) {
    const W = layout.width;
    const H = layout.height;
    const s = 1 + (camera.s - 1) * f;
    const x = W / 2 + (camera.x - W / 2) * f;
    const y = H / 2 + (camera.y - H / 2) * f;
    return `translate(${n(W / 2 + shake[0] * f)} ${n(H / 2 + shake[1] * f)}) scale(${n(s)}) translate(${n(-x)} ${n(-y)})`;
}

/** Classic gag backdrop: rotating two-tone sunburst. */
function sunburst(W, H, t) {
    const cx = W / 2;
    const cy = H * 0.42;
    const R = Math.hypot(W, H);
    const rays = 18;
    let d = "";
    for (let i = 0; i < rays; i++) {
        const a0 = (i * 2 * Math.PI) / rays + t * 0.6;
        const a1 = a0 + Math.PI / rays;
        d += `M ${n(cx)} ${n(cy)} L ${n(cx + Math.cos(a0) * R)} ${n(cy + Math.sin(a0) * R)} L ${n(cx + Math.cos(a1) * R)} ${n(cy + Math.sin(a1) * R)} Z `;
    }
    return `<rect width="${W}" height="${H}" fill="#FFD93B"/><path d="${d}" fill="#FF9E3B"/>`;
}

export function buildClassicFrameSvg(timeline, frame, frameIndex) {
    const { layout } = timeline;
    const W = layout.width;
    const H = layout.height;
    const { camera, shake, fx = {} } = frame;
    const background = frame.background || timeline.dialogue.background;
    const layers = renderClassicLayers(background, layout, frame.stage);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    if (fx.gag) {
        svg += sunburst(W, H, frame.t);
    } else {
        for (const layer of layers.back) {
            svg += `<g transform="${parallax(layout, camera, shake, layer.f)}">${layer.svg}</g>`;
        }
    }
    let chars = "";
    if (timeline.acting) {
        for (const p of dustPuffs(timeline, frame.t)) {
            chars += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.r)}" fill="#FFFFFF" fill-opacity="${n(p.o * 0.85)}" stroke="${OUT}" stroke-width="4" stroke-opacity="${n(p.o * 0.5)}"/>`;
        }
    }
    // stable z-order: hiding actors behind, carried / airborne actors in front
    const layer = (st) =>
        st.behind ? -1 : st.held || st.move === "jump" ? 1 : 0;
    const ordered = [...frame.chars].sort(
        (a, b) => layer(a.state) - layer(b.state),
    );
    for (const { actor, state } of ordered) {
        const uid = `c${actor.slot}f${frameIndex % 2}`;
        const vis = visibility(layout, camera, actor, state);
        if (vis === "none") continue;
        const partial = vis === "partial";
        const body = renderClassicCharacter(actor.character, {
            ...state,
            fallDir: fallDirection(layout, camera, actor, state),
            uid,
        });
        chars += partial ? anchorClips(body) : body;
    }
    svg += `<g transform="${parallax(layout, camera, shake, 1)}">${chars}</g>`;
    if (!fx.gag) {
        for (const layer of layers.front) {
            svg += `<g transform="${parallax(layout, camera, shake, layer.f)}">${layer.svg}</g>`;
        }
    }
    const drama = fx.dramatic;
    if (drama) {
        // dark vignette + radial speed lines (+ wind streaks / cinematic bars on
        // the eye shot); everything fades out with the camera at the end
        const k = 1 - (drama.fade || 0);
        if (k > 0.01) {
            const vig = (drama.phase === "eye" ? 0.85 : 0.6) * k;
            svg += `<defs><radialGradient id="cVig" cx="0.5" cy="0.5" r="0.72"><stop offset="0.35" stop-color="#0B0618" stop-opacity="0"/><stop offset="1" stop-color="#0B0618" stop-opacity="${n(vig)}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#cVig)"/>`;
            const fy = drama.phase === "eye" ? H * 0.5 : H * 0.42;
            svg += focusLines(W, H, W / 2, fy, frameIndex, {
                color: "#FFFFFF",
                count: drama.phase === "eye" ? 70 : 55,
                clear: drama.phase === "eye" ? 0.42 : 0.36,
                opacity: (drama.phase === "punch" ? 0.9 : 0.55) * k,
            });
            if (drama.phase !== "punch")
                svg += speedLines(W, H, frameIndex, 0.8 * k);
            if (drama.phase === "eye") svg += letterbox(W, H, 1);
        }
    }
    if (frame.flash > 0.01) {
        svg += `<rect width="${W}" height="${H}" fill="#FFFFFF" fill-opacity="${n(frame.flash * 0.75)}"/>`;
    }
    svg += "</svg>";
    return flattenOpacity(svg);
}

/**
 * `opacity` on a leaf shape makes resvg allocate an isolated layer; for shapes that
 * end up fully off-canvas (big camera zooms) that layer is empty and resvg panics
 * (geom.rs unwrap on None). Fill/stroke opacity renders the same for our flat,
 * non-overlapping fills and strokes without creating a layer.
 */
function flattenOpacity(svg) {
    return svg.replace(
        /<(rect|path|ellipse|circle|line|polygon)\b([^>]*?)\sopacity="([\d.]+)"([^>]*?)\/>/g,
        (m, tag, a, o, b) =>
            /fill-opacity|stroke-opacity/.test(a + b)
                ? m
                : `<${tag}${a} fill-opacity="${o}" stroke-opacity="${o}"${b}/>`,
    );
}

/**
 * Face-fault falls backward (away from the facing direction) unless that
 * would carry the head off the canvas edge (e.g. vertical Shorts framing);
 * then the character face-plants forward instead. World-space sign (+1 = +x).
 */
function fallDirection(layout, camera, actor, state) {
    const dir = (state.facing ?? 1) >= 0 ? 1 : -1;
    if (state.pose !== "facefault" && state.prevPose !== "facefault")
        return -dir;
    const g = classicGeometry(actor.character.classic);
    const k = (state.scale ?? 1) * camera.s;
    const sx = (state.x - camera.x) * camera.s + layout.width / 2;
    const reach = (Math.abs(g.headCY) + g.R * 1.1 - g.R * 1.7) * k + 20;
    const room = -dir > 0 ? layout.width - sx : sx;
    return room >= reach ? -dir : dir;
}

/**
 * "none" if the character is entirely off-canvas, "partial" if its face (where all
 * the rig's clip-paths live) crosses the canvas edge, else "full".
 */
function visibility(layout, camera, actor, state) {
    const g = classicGeometry(actor.character.classic);
    const k = state.scale ?? 1;
    const toX = (wx) => (wx - camera.x) * camera.s + layout.width / 2;
    const toY = (wy) => (wy - camera.y) * camera.s + layout.height / 2;
    const W = layout.width;
    const H = layout.height;
    if (
        toX(state.x + g.R * 2.6 * k) < -40 ||
        toX(state.x - g.R * 2.6 * k) > W + 40
    )
        return "none";
    // a face-faulted head lies beside the feet: widen the face band
    const band = state.pose === "facefault" ? 2.6 : 1.1;
    const x0 = toX(state.x - g.R * band * k);
    const x1 = toX(state.x + g.R * band * k);
    const y0 = toY(state.y + (g.headCY - g.R * 1.1) * k);
    if (x1 < -40 || x0 > W + 40 || toY(state.y + 60) < -40 || y0 > H + 40)
        return "none";
    // head band (face-faults put the head near the ground)
    const low = state.pose === "facefault" ? 60 : (g.headCY + g.R * 1.1) * k;
    const y1 = toY(state.y + low);
    const pad = 0; // only the face features (eyes/mouth, all clipped) matter
    return x0 < pad || x1 > W - pad || y0 < pad || y1 > H - pad
        ? "partial"
        : "full";
}

/**
 * resvg 2.6 panics (geom.rs fit_to_rect unwrap) when a clipped group's layer lies
 * entirely outside the canvas, which happens on big zooms. Two invisible 1px
 * anchors far apart make every clipped layer's bounds intersect the canvas.
 * Only used for characters that are partly off-screen (it costs a canvas-sized layer).
 */
const ANCHOR =
    '<rect x="-100000" y="-100000" width="1" height="1" fill="#000" fill-opacity="0.001"/><rect x="100000" y="100000" width="1" height="1" fill="#000" fill-opacity="0.001"/>';
function anchorClips(svg) {
    return svg
        .replace(/(<g clip-path="url\(#[^)]+\)"[^>]*>)/g, `$1${ANCHOR}`)
        .replace(
            /<(rect|path|ellipse|circle)\b([^>]*?)\sclip-path="(url\(#[^)]+\))"([^>]*?)\/>/g,
            (_m, tag, a, clip, b) =>
                `<g clip-path="${clip}">${ANCHOR}<${tag}${a}${b}/></g>`,
        );
}
