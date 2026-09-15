/**
 * Generates an ASS (Advanced SubStation Alpha) subtitle file from captions.
 *
 * Uses libass-compatible styling so production FFmpeg static builds
 * (which have --enable-libass but may lack --enable-libfreetype at runtime)
 * can render subtitles via the `ass` filter instead of `drawtext`.
 *
 * Style notes:
 *  - Alignment 2  = bottom-center (standard subtitle position)
 *  - Alignment 5  = center-screen (for text-only scenes)
 *  - MarginV      = pixels from the bottom/top edge
 *  - Outline + Shadow give the subtitle the "boxed" look
 *  - Bold=1 for readability
 */

function formatAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100); // centiseconds
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Build a minimal ASS file from captions array.
 *
 * @param {Array<{text: string, start: number, end: number}>} captions
 * @param {{
 *   fontSize?: number,
 *   marginV?: number,
 *   alignment?: number,
 *   width?: number,
 *   height?: number,
 *   fontName?: string
 * }} opts
 * @returns {string} ASS file content
 */
export function createAss(captions, opts = {}) {
    if (!Array.isArray(captions)) {
        throw new Error("Captions must be an array.");
    }

    const {
        fontSize = 52,
        marginV = 80,
        alignment = 2, // 2 = bottom-center
        width = 1080,
        height = 1920,
        fontName = "Arial",
    } = opts;

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
Collisions: Normal
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,1,0,0,0,100,100,0,0,3,3,1,${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const events = captions
        .map(
            (c) =>
                `Dialogue: 0,${formatAssTime(c.start)},${formatAssTime(c.end)},Default,,0,0,0,,${c.text}`,
        )
        .join("\n");

    return `${header}\n${events}\n`;
}
