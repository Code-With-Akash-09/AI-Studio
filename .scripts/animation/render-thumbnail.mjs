/**
 * Code-rendered thumbnail (same rig + setting as the video).
 *
 *   node .scripts/animation/render-thumbnail.mjs --setting=siberian_forest \
 *        --title="आसमान में धमाका!" --dim=16x9 --out=thumb.jpg [--plate=plate.png]
 *
 * --plate also writes the text-free plate (reference image for an image model;
 * the matching prompt is printed — see thumbnail.js thumbnailPrompt()).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { FONTS_DIR } from "../../src/lib/services/animation/renderer.js";
import {
    thumbnailPrompt,
    thumbnailSvg,
} from "../../src/lib/services/animation/thumbnail.js";
import { getFFmpegPath } from "../../src/lib/utils/ffmpeg.js";

const arg = (k, d) => {
    const a = process.argv.find((x) => x.startsWith(`--${k}=`));
    return a ? a.slice(k.length + 3) : d;
};
const setting = arg("setting", "siberian_forest");
const title = arg("title", "");
const dim = arg("dim", "16x9");
const out = path.resolve(arg("out", `/tmp/thumb-${dim}.jpg`));
const plate = arg("plate", "");

const {
    svg,
    width: W,
    height: H,
} = thumbnailSvg({
    setting: setting.startsWith("{") ? JSON.parse(setting) : setting,
    dim,
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "thumb-"));
const png = path.join(tmp, "plate.png");
fs.writeFileSync(png, new Resvg(svg).render().asPng());
if (plate) fs.copyFileSync(png, path.resolve(plate));

// title + watermark with libass (HarfBuzz shapes Devanagari correctly)
const vertical = dim === "9x16";
const fs1 = vertical ? 190 : 132;
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: T,Baloo 2 ExtraBold,${fs1},&H0030D8FF,&H0030D8FF,&H00140A10,&H96000000,1,0,0,0,100,100,0,0,1,${vertical ? 11 : 8},5,${vertical ? 8 : 7},40,40,${vertical ? 90 : 30},1
Style: W,Poppins,${vertical ? 34 : 24},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,3,1,1,24,24,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${title ? `Dialogue: 0,0:00:00.00,0:00:05.00,T,,0,0,0,,${title.replace(/\s*\|\s*/g, "\\N")}` : ""}
Dialogue: 0,0:00:00.00,0:00:05.00,W,,0,0,0,,Raaz Explain Tv
`;
const assPath = path.join(tmp, "t.ass");
fs.writeFileSync(assPath, ass, "utf8");
const r = spawnSync(
    getFFmpegPath(),
    [
        "-loglevel",
        "error",
        "-y",
        "-i",
        png,
        "-vf",
        `ass=filename='${assPath}':fontsdir='${FONTS_DIR}'`,
        "-q:v",
        "2",
        out,
    ],
    { stdio: "inherit" },
);
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) process.exit(1);
console.log(out);
if (plate)
    console.log(
        `\n--- image-model prompt ---\n${thumbnailPrompt({ title, setting })}`,
    );
