/**
 * Build synced captions from real TTS sentence timings.
 *
 * Each sentence from Edge TTS is shown at its exact spoken time.
 * Sentences are split into chunks of MAX_CHARS to prevent text overflow
 * outside the 1080px video frame width.
 *
 * Fallback (no timings): uniform split across word groups.
 *
 * @param {string} text - Full narration text
 * @param {number} duration - Total audio duration in seconds
 * @param {Array<{text:string, start:number, end:number}>} sentenceTimings
 * @returns {Array<{text:string, start:number, end:number}>}
 */

const MAX_CHARS_PER_LINE = 32; // ~32 chars fits comfortably within 1080px at fontsize 52

/**
 * Split a sentence into <=MAX_CHARS_PER_LINE chunks, breaking on word boundaries.
 */
function splitToLines(text) {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let current = "";

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > MAX_CHARS_PER_LINE && current.length > 0) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }

    if (current.length > 0) lines.push(current);
    return lines;
}

export function createCaptions(text, duration, sentenceTimings = []) {
    // ── Real timing path (Edge TTS SentenceBoundary events) ─────────────────
    if (sentenceTimings.length > 0) {
        const captions = [];

        for (const sentence of sentenceTimings) {
            const lines = splitToLines(sentence.text.trim());
            if (lines.length === 0) continue;

            const sentDuration = sentence.end - sentence.start;
            const timePerLine = sentDuration / lines.length;

            lines.forEach((line, i) => {
                captions.push({
                    text: line,
                    start: sentence.start + i * timePerLine,
                    end: sentence.start + (i + 1) * timePerLine,
                });
            });
        }

        return captions;
    }

    // ── Fallback: uniform split across word groups ───────────────────────────
    const words = text.trim().split(/\s+/);
    const chunks = [];
    let current = "";

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > MAX_CHARS_PER_LINE && current.length > 0) {
            chunks.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current.length > 0) chunks.push(current);

    if (chunks.length === 0) return [];

    const chunkDuration = duration / chunks.length;

    return chunks.map((chunk, index) => ({
        text: chunk,
        start: index * chunkDuration,
        end: (index + 1) * chunkDuration,
    }));
}
