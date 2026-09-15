import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../../config.js";
import { runFFmpeg } from "../../utils/ffmpeg.js";
import { getFontFileName } from "../../utils/fonts.js";
import { createAss } from "../captions/createAss.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONTS_DIR = path.resolve(__dirname, "../../assets/fonts");

// ============================================================
// ASS SUBTITLE FILE BUILDER
// ============================================================

/**
 * Write an ASS subtitle file for a scene and return its absolute path.
 * Uses libass (--enable-libass) which is always present in the production
 * static FFmpeg build — unlike drawtext which requires libfreetype at runtime.
 *
 * @param {Array<{text:string, start:number, end:number}>} captions
 * @param {string} sceneId - Used to name the temp file
 * @param {string} [language="en"]
 * @param {string} [dimension="vertical"]
 * @returns {string} absolute path to the written .ass file
 */
function writeAssFile(
    captions,
    sceneId,
    language = "en",
    dimension = "vertical",
) {
    if (!captions || captions.length === 0) return null;

    const isHorizontal = dimension === "horizontal";
    const width = isHorizontal ? 1920 : 1080;
    const height = isHorizontal ? 1080 : 1920;
    const fontSize = isHorizontal ? 46 : 52;
    // marginV: distance from bottom edge for bottom-center alignment (alignment=2)
    const marginV = isHorizontal ? 60 : 80;

    // Pick font name heuristic — ASS fontname must match a font installed on the
    // host OR we embed the font reference. For robustness we fall back to "Arial"
    // which is universally available. libass will substitute if the font is missing.
    const fontFileName = getFontFileName(captions[0]?.text ?? "", language);
    // Strip extension, e.g. "Mukta-Bold.ttf" -> "Mukta-Bold"
    const fontName = fontFileName.replace(/\.[^.]+$/, "");

    const assContent = createAss(captions, {
        fontSize,
        marginV,
        alignment: 2, // bottom-center
        width,
        height,
        fontName,
    });

    const assPath = path.join(config.tempDir, `scene-${sceneId}.ass`);
    fs.writeFileSync(assPath, assContent, "utf8");
    return assPath;
}

/**
 * Builds safe FFmpeg ass filter argument with fontsdir option.
 * Resolves paths relative to process.cwd() when possible to eliminate
 * Windows drive letter colons (e.g. C:\) and path spaces.
 *
 * @param {string} assPath - Path to ASS subtitle file
 * @returns {string} FFmpeg filter option string
 */
function buildAssFilter(assPath) {
    if (!assPath) return "";

    let safeAssPath = path.relative(process.cwd(), assPath).replace(/\\/g, "/");
    if (safeAssPath.startsWith("..") || path.isAbsolute(safeAssPath)) {
        safeAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    }

    let safeFontsDir = path
        .relative(process.cwd(), FONTS_DIR)
        .replace(/\\/g, "/");
    if (safeFontsDir.startsWith("..") || path.isAbsolute(safeFontsDir)) {
        safeFontsDir = FONTS_DIR.replace(/\\/g, "/").replace(/:/g, "\\:");
    }

    return `ass=filename='${safeAssPath}':fontsdir='${safeFontsDir}'`;
}

// ============================================================
// IMAGE SCENE
// ============================================================

export async function renderImageScene(
    imagePath,
    audioPath,
    outputPath,
    duration,
    captions,
    language = "en",
    dimension = "vertical",
    sceneId = "0",
) {
    const isHorizontal = dimension === "horizontal";
    const width = isHorizontal ? 1920 : 1080;
    const height = isHorizontal ? 1080 : 1920;

    const assPath = writeAssFile(captions, sceneId, language, dimension);

    let vfilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=30,setpts=PTS-STARTPTS`;
    if (assPath) {
        vfilter += `,${buildAssFilter(assPath)}`;
    }

    const filterComplex =
        `[0:v]${vfilter}[vout];` +
        `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[aout]`;

    await runFFmpeg([
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-i",
        audioPath,
        "-t",
        String(duration),
        "-filter_complex",
        filterComplex,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-pix_fmt",
        "yuv420p",
        outputPath,
    ]);
}

// ============================================================
// VIDEO / GIF SCENE
// ============================================================

export async function renderVideoScene(
    videoPath,
    audioPath,
    outputPath,
    duration,
    captions,
    language = "en",
    dimension = "vertical",
    sceneId = "0",
) {
    const isHorizontal = dimension === "horizontal";
    const width = isHorizontal ? 1920 : 1080;
    const height = isHorizontal ? 1080 : 1920;

    const assPath = writeAssFile(captions, sceneId, language, dimension);

    let vfilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=30,setpts=PTS-STARTPTS`;
    if (assPath) {
        vfilter += `,${buildAssFilter(assPath)}`;
    }

    const filterComplex =
        `[0:v]${vfilter}[vout];` +
        `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[aout]`;

    await runFFmpeg([
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        videoPath,
        "-i",
        audioPath,
        "-t",
        String(duration),
        "-filter_complex",
        filterComplex,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-pix_fmt",
        "yuv420p",
        outputPath,
    ]);
}

// ============================================================
// TEXT SCENE
// ============================================================

export async function renderTextScene(
    audioPath,
    outputPath,
    duration,
    text,
    language = "en",
    dimension = "vertical",
    sceneId = "0",
) {
    const isHorizontal = dimension === "horizontal";
    const width = isHorizontal ? 1920 : 1080;
    const height = isHorizontal ? 1080 : 1920;

    // For text scenes put a single static caption covering the full duration
    const caption = [{ text, start: 0, end: duration }];
    const assPath = writeAssFile(caption, sceneId, language, dimension);

    // Override alignment to center-screen (5) for text scenes
    if (assPath) {
        // Rewrite with center alignment
        const fontFileName = getFontFileName(text, language);
        const fontName = fontFileName.replace(/\.[^.]+$/, "");
        const assContent = createAss(caption, {
            fontSize: isHorizontal ? 60 : 72,
            marginV: 0,
            alignment: 5, // center-screen
            width,
            height,
            fontName,
        });
        fs.writeFileSync(assPath, assContent, "utf8");
    }

    const assFilter = assPath ? `,${buildAssFilter(assPath)}` : "";
    const filterComplex =
        `[0:v]fps=30,setpts=PTS-STARTPTS${assFilter}[vout];` +
        `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[aout]`;

    await runFFmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=black:s=${width}x${height}:r=30`,
        "-i",
        audioPath,
        "-t",
        String(duration),
        "-filter_complex",
        filterComplex,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-pix_fmt",
        "yuv420p",
        outputPath,
    ]);
}
