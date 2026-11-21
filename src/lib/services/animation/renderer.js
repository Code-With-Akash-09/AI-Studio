/**
 * Frame renderer: timeline state → SVG → PNG (resvg) → ffmpeg (libx264 + ASS).
 * Identical consecutive frames are rasterized once and reused.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { ANIMATION_OUTPUT_FPS } from "../../../constants/animation.js";
import { getFFmpegPath } from "../../utils/ffmpeg.js";
import { renderBackground, renderRevealBeam } from "./backgrounds.js";
import { renderCharacter } from "./rig.js";
import { frameState } from "./timeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FONTS_DIR = path.resolve(__dirname, "../../assets/fonts");

const n = (v) => Math.round(v * 100) / 100;

export function buildFrameSvg(timeline, frame) {
    const { layout, dialogue } = timeline;
    const W = layout.width;
    const H = layout.height;
    const { camera, shake } = frame;

    const camTransform = `translate(${n(W / 2 + shake[0])} ${n(H / 2 + shake[1])}) scale(${n(camera.s)}) translate(${n(-camera.x)} ${n(-camera.y)})`;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    svg += `<defs><radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient></defs>`;
    svg += `<g transform="${camTransform}">`;
    const background = frame.background || dialogue.background;
    svg += renderBackground(background, layout, frame.stage);
    if (background === "haveli_night") {
        svg += renderRevealBeam(layout, frame.stage.beam);
    }
    for (const { actor, state } of frame.chars) {
        svg += renderCharacter(actor.character, state);
    }
    svg += "</g>";
    svg += `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`;
    if (frame.flash > 0.01) {
        svg += `<rect width="${W}" height="${H}" fill="#FFFBE6" fill-opacity="${n(frame.flash * 0.85)}"/>`;
    }
    svg += "</svg>";
    return svg;
}

export function rasterize(svg) {
    return new Resvg(svg, { font: { loadSystemFonts: false } })
        .render()
        .asPng();
}

function ffmpegPathArg(p) {
    return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/**
 * Render the whole timeline to an MP4.
 * @param {object} timeline
 * @param {{ audioPath: string, assPath: string|null, outputPath: string, onProgress?: Function }} opts
 */
export async function renderVideo(
    timeline,
    { audioPath, assPath, outputPath, onProgress = () => {} },
) {
    const { fps, duration } = timeline;
    const totalFrames = Math.ceil(duration * fps);

    let vf = `fps=${ANIMATION_OUTPUT_FPS}`;
    if (assPath) {
        vf += `,ass=filename='${ffmpegPathArg(assPath)}':fontsdir='${ffmpegPathArg(FONTS_DIR)}'`;
    }
    vf += ",format=yuv420p";

    const args = [
        "-y",
        "-v",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-c:v",
        "png",
        "-i",
        "pipe:0",
        "-i",
        audioPath,
        "-filter_complex",
        `[0:v]${vf}[v];[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a]`,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-r",
        String(ANIMATION_OUTPUT_FPS),
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        duration.toFixed(3),
        "-movflags",
        "+faststart",
        outputPath,
    ];

    const proc = spawn(getFFmpegPath(), args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
        stderr += d.toString();
    });
    const done = new Promise((resolve, reject) => {
        proc.on("error", reject);
        proc.on("close", (code) =>
            code === 0
                ? resolve()
                : reject(
                      new Error(
                          `ffmpeg exited ${code}: ${stderr.slice(-2000)}`,
                      ),
                  ),
        );
    });

    let lastSvg = "";
    let lastPng = null;
    let rasterized = 0;
    for (let i = 0; i < totalFrames; i++) {
        const t = i / fps;
        const frame = frameState(timeline, t, i);
        const svg = buildFrameSvg(timeline, frame);
        if (svg !== lastSvg) {
            lastPng = rasterize(svg);
            lastSvg = svg;
            rasterized++;
        }
        if (!proc.stdin.write(lastPng)) {
            await Promise.race([once(proc.stdin, "drain"), done]);
        }
        if (i % fps === 0)
            onProgress(i / totalFrames, `Frame ${i}/${totalFrames}`);
    }
    proc.stdin.end();
    await done;
    return { totalFrames, rasterized };
}
