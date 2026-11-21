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
                out.push({ onset: onsetOf(c), vowel: "a", inherent: true });
            }
        } else if (isMatra(c) && out.length) {
            out[out.length - 1].vowel = vowelOf(c);
            out[out.length - 1].inherent = false;
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
    // Hindi schwa deletion: a word-final consonant with the inherent "a" is
    // spoken as a coda (तुम = tum, not tuma) — lips close for a labial coda.
    const last = out[out.length - 1];
    if (out.length > 1 && last.vowel === "a" && last.inherent) {
        out.pop();
        if (last.onset) out[out.length - 1].coda = last.onset;
    }
    return out.map((s) => ({
        onset: s.onset,
        viseme: VOWEL_VISEME[s.vowel] || "B",
        coda: s.coda || null,
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

/**
 * Per-frame visemes synced to Edge TTS word boundaries.
 * Each word's syllables are spread over that word's own time span; the mouth
 * is closed (X) between words and wherever the audio is near-silent. Loudness
 * is applied later (it only scales how far the jaw opens).
 * @param {string} text - full line (fallback when no word timings)
 * @param {{t:number,d:number,w:string}[]} words - seconds from clip start
 * @param {number[]} envelope - per-frame loudness 0..1
 * @param {number} fps
 * @returns {string[]}
 */
export function wordVisemes(text, words, envelope, fps) {
    if (!words?.length) return lineVisemes(text, envelope);
    const n = envelope.length;
    const out = new Array(n).fill("X");
    for (const word of words) {
        const f0 = Math.max(0, Math.round(word.t * fps));
        const f1 = Math.min(
            n,
            Math.max(f0 + 3, Math.round((word.t + word.d) * fps)),
        );
        const span = f1 - f0;
        if (span <= 0) continue;
        let syl = syllables(word.w || "");
        if (!syl.length) syl = [{ onset: null, viseme: "B" }];
        // every shape must hold >= 3 frames: fit the word's shapes to its span
        const slots = Math.max(1, Math.floor(span / 3));
        let seq = [];
        for (const s of syl) {
            if (s.onset) seq.push({ v: s.onset, onset: true });
            seq.push({ v: s.viseme, onset: false });
            if (s.coda) seq.push({ v: s.coda, onset: true });
        }
        // drop onsets first, then merge vowels, until it fits
        while (seq.length > slots && seq.some((x) => x.onset)) {
            // drop the last non-initial onset first (word-initial closure reads best)
            let k = -1;
            for (let q = seq.length - 1; q > 0; q--)
                if (seq[q].onset) {
                    k = q;
                    break;
                }
            if (k < 0) k = 0;
            seq.splice(k, 1);
        }
        while (seq.length > slots) {
            const OPEN = "CBAEOUFMX";
            // merge the pair whose second shape is least open into the first
            let best = 1;
            for (let q = 1; q < seq.length; q++)
                if (OPEN.indexOf(seq[q].v) > OPEN.indexOf(seq[best].v))
                    best = q;
            seq.splice(best, 1);
        }
        // collapse identical neighbours
        seq = seq.filter((x, q) => q === 0 || x.v !== seq[q - 1].v);
        for (let f = f0; f < f1; f++) {
            const q = Math.min(
                seq.length - 1,
                Math.floor(((f - f0) / span) * seq.length),
            );
            out[f] = seq[q].v;
        }
    }
    // short gaps between words: keep the mouth closed only when the gap
    // can hold for 3 frames, otherwise bridge with the previous shape
    for (let i = 0; i < n; i++) {
        if (out[i] !== "X") continue;
        let j = i;
        while (j < n && out[j] === "X") j++;
        const silent = envelope.slice(i, j).every((v) => v < 0.05);
        if (j - i < 3 && i > 0 && j < n && !silent) {
            for (let k = i; k < j; k++) out[k] = out[i - 1];
        }
        i = j;
    }
    return holdMin(out, 3);
}
