/**
 * Modern Unicode emoji regex matching all emoji pictographs and symbols.
 */
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

/**
 * Escapes characters for FFmpeg drawtext filter and cleans unsupported emojis
 * to prevent missing-glyph boxes in video subtitles.
 *
 * @param {string} text - Raw caption text
 * @returns {string} Safe text for FFmpeg drawtext
 */
export function escapeDrawtext(text) {
    return String(text || "")
        .replace(EMOJI_REGEX, "") // Remove emojis to avoid missing-glyph boxes in subtitles
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "’")
        .replace(/‘/g, "’")
        .replace(/"/g, "”")
        .replace(/“/g, "”")
        .replace(/”/g, "”")
        .replace(/:/g, "\\:")
        .replace(/%/g, "\\%")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .trim();
}
