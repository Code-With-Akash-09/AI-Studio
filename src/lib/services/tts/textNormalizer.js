/**
 * Phonetic & Text Normalization Engine for Human-Grade TTS
 * Ensures zero pronunciation quirks for acronyms, technical terms,
 * currency, numbers, and regional phrases.
 */

const ACRONYM_MAP = {
    OpenAI: "Open A.I.",
    APIs: "A.P.I.s",
    API: "A.P.I.",
    URLs: "U.R.L.s",
    URL: "U.R.L.",
    EVs: "E.V.s",
    EV: "E.V.",
    LLMs: "L.L.M.s",
    LLM: "L.L.M.",
    GPUs: "G.P.U.s",
    GPU: "G.P.U.",
    CPUs: "C.P.U.s",
    CPU: "C.P.U.",
    TTS: "T.T.S.",
    SEO: "S.E.O.",
    ROI: "R.O.I.",
    UI: "U.I.",
    UX: "U.X.",
    NASA: "Nasa",
    ISRO: "Isro",
    B2B: "B to B",
    B2C: "B to C",
    SaaS: "Sass",
    AI: "A.I.",
};

const COMMON_SYMBOLS_MAP = [
    { pattern: /\$([0-9]+(?:\.[0-9]+)?)\s*[kK]\b/g, replaceFn: (_, n) => `${n} thousand dollars` },
    { pattern: /\$([0-9]+(?:\.[0-9]+)?)\s*[mM]\b/g, replaceFn: (_, n) => `${n} million dollars` },
    { pattern: /\$([0-9]+(?:\.[0-9]+)?)\s*[bB]\b/g, replaceFn: (_, n) => `${n} billion dollars` },
    { pattern: /\$([0-9]+(?:\.[0-9]+)?)/g, replaceFn: (_, n) => `${n} dollars` },
    { pattern: /₹([0-9]+(?:\.[0-9]+)?)\s*[kK]\b/g, replaceFn: (_, n) => `${n} thousand rupees` },
    { pattern: /₹([0-9]+(?:\.[0-9]+)?)\s*(?:cr|Cr|crore)\b/g, replaceFn: (_, n) => `${n} crore rupees` },
    { pattern: /₹([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|Lakh)\b/g, replaceFn: (_, n) => `${n} lakh rupees` },
    { pattern: /₹([0-9]+(?:\.[0-9]+)?)/g, replaceFn: (_, n) => `${n} rupees` },
    { pattern: /€([0-9]+(?:\.[0-9]+)?)/g, replaceFn: (_, n) => `${n} euros` },
    { pattern: /([0-9]+)%\b/g, replaceFn: (_, n) => `${n} percent` },
    { pattern: /\b([0-9]+)x\b/gi, replaceFn: (_, n) => `${n} times` },
];

/**
 * Normalizes text for optimal neural TTS cadence, pronunciation, and flow.
 *
 * @param {string} text - Raw input text
 * @param {string} [language="en"] - Language code
 * @returns {string} Normalized phonetic text
 */
export const normalizeForTTS = (text, language = "en") => {
    if (!text || typeof text !== "string") return "";

    let normalized = text.trim();

    // 1. Symbol & Currency Normalization using safe replace functions
    for (const { pattern, replaceFn } of COMMON_SYMBOLS_MAP) {
        normalized = normalized.replace(pattern, replaceFn);
    }

    // 2. Acronym expansion for English/Hinglish (longest first to prevent sub-string clashes)
    if (!language || language.startsWith("en") || language === "auto") {
        for (const [acronym, expanded] of Object.entries(ACRONYM_MAP)) {
            const regex = new RegExp(`\\b${acronym}\\b`, "g");
            normalized = normalized.replace(regex, expanded);
        }
    }

    // 3. Clean up awkward spacing and double periods around punctuation
    normalized = normalized
        .replace(/\s+/g, " ")
        .replace(/\s+([,.:;?!])/g, "$1")
        .replace(/([.?!])([A-Za-z])/g, "$1 $2")
        .replace(/\.\s*\./g, ".");

    // 4. Natural pause enhancement for hyphens & ellipses
    normalized = normalized
        .replace(/—/g, ", ")
        .replace(/--/g, ", ")
        .replace(/\.{3,}/g, "... ");

    return normalized.trim();
};
