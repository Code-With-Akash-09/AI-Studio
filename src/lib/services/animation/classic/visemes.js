/**
 * Text-driven mouth shapes for the classic rig.
 *
 * The Hindi line is split into Devanagari syllables; each syllable's vowel
 * picks a viseme (A/B/C wide-open family, E spread, O round, U pucker) and
 * labial / labio-dental onsets add a brief M (lips pressed) or F (teeth on
 * lip). Syllables are spread over the line's voiced frames (from the TTS
 * loudness envelope), so the mouth follows both the text and the audio.
 */

const isConsonant = (c) =>
    (c >= 0x0915 && c <= 0x0939) || (c >= 0x0958 && c <= 0x095f);
const isIndependentVowel = (c) => c >= 0x0904 && c <= 0x0914;
const isMatra = (c) => c >= 0x093e && c <= 0x094c;
const VIRAMA = 0x094d;

const VOWEL_VISEME = {
    a: "B",
    aa: "C",
    i: "E",
    u: "U",
    e: "E",
    ai: "B",
    o: "O",
};

function vowelOf(code) {
    switch (code) {
        case 0x093e: // ा
        case 0x0906: // आ
            return "aa";
        case 0x093f: // ि
        case 0x0940: // ी
        case 0x0907: // इ
        case 0x0908: // ई
        case 0x0943: // ृ
        case 0x090b: // ऋ
            return "i";
        case 0x0941: // ु
        case 0x0942: // ू
        case 0x0909: // उ
        case 0x090a: // ऊ
            return "u";
        case 0x0947: // े
        case 0x090f: // ए
        case 0x0946:
            return "e";
        case 0x0948: // ै
        case 0x0910: // ऐ
        case 0x0945:
            return "ai";
        case 0x094b: // ो
        case 0x094c: // ौ
        case 0x0913: // ओ
        case 0x0914: // औ
        case 0x0949: // ॉ
        case 0x094a:
        case 0x0911:
        case 0x0912:
            return "o";
        default:
            return "a";
    }
}

function onsetOf(code) {
    if (code >= 0x092a && code <= 0x092e) return "M"; // प फ ब भ म
    if (code === 0x0935 || code === 0x095e) return "F"; // व फ़
    return null;
}

/** @returns {Array<{onset: string|null, viseme: string}>} */
export function syllables(text) {
    const out = [];
    let prev = 0;
    for (const ch of String(text || "")) {
        const c = ch.codePointAt(0);
        if (isConsonant(c)) {
            if (prev === VIRAMA && out.length) {
                // conjunct: keep the first onset of the cluster
            } else {
                out.push({ onset: onsetOf(c), vowel: "a" });
            }
        } else if (isMatra(c) && out.length) {
            out[out.length - 1].vowel = vowelOf(c);
        } else if (isIndependentVowel(c)) {
            out.push({ onset: null, vowel: vowelOf(c) });
        } else if (/[A-Za-z]/.test(ch)) {
            // Latin words: rough vowel mapping per letter vowel
            const v = ch.toLowerCase();
            if ("aeiou".includes(v)) {
                out.push({
                    onset: null,
                    vowel: { a: "aa", e: "e", i: "i", o: "o", u: "u" }[v],
                });
            }
        }
        prev = c;
    }
    return out.map((s) => ({
        onset: s.onset,
        viseme: VOWEL_VISEME[s.vowel] || "B",
    }));
}

/**
 * Per-frame visemes for one line.
 * @param {string} text
 * @param {number[]} envelope - per-frame loudness 0..1
 * @returns {string[]} viseme per frame (X = closed/rest)
 */
export function lineVisemes(text, envelope) {
    const syl = syllables(text);
    const voiced = envelope.map((l) => l >= 0.1);
    const total = voiced.filter(Boolean).length;
    const out = new Array(envelope.length).fill("X");
    if (!syl.length || !total) return out;
    let v = 0;
    for (let f = 0; f < envelope.length; f++) {
        if (!voiced[f]) continue;
        const pos = (v / total) * syl.length;
        const s = syl[Math.min(syl.length - 1, Math.floor(pos))];
        const frac = pos - Math.floor(pos);
        let vis = s.onset && frac < 0.3 ? s.onset : s.viseme;
        const level = envelope[f];
        if (level < 0.25 && (vis === "C" || vis === "B")) vis = "A";
        if (level > 0.7 && vis === "B") vis = "C";
        out[f] = vis;
        v++;
    }
    return holdMin(out, 3);
}

/**
 * Merge mouth-shape runs shorter than `min` frames into the previous shape so
 * the mouth never flickers (each shape is held for at least 2-3 frames).
 */
export function holdMin(frames, min = 3) {
    const out = frames.slice();
    let i = 0;
    while (i < out.length) {
        let j = i;
        while (j < out.length && out[j] === out[i]) j++;
        if (j - i < min && i > 0) {
            const prev = out[i - 1];
            for (let k = i; k < j; k++) out[k] = prev;
            // re-scan from the merged run start
            let s = i - 1;
            while (s > 0 && out[s - 1] === prev) s--;
            i = s;
            if (j - s >= min) i = j;
            continue;
        }
        i = j;
    }
    return out;
}
