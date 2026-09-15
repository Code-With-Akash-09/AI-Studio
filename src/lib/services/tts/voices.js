/**
 * Default Free Edge Neural Voice mappings by language code.
 */
export const LANGUAGE_VOICES = {
    hi: {
        male: "hi-IN-MadhurNeural",
        female: "hi-IN-SwaraNeural",
    },
    en: {
        male: "en-US-ChristopherNeural",
        female: "en-US-JennyNeural",
    },
    "en-in": {
        male: "en-IN-PrabhatNeural",
        female: "en-IN-NeerjaNeural",
    },
    mr: {
        male: "mr-IN-ManoharNeural",
        female: "mr-IN-AarohiNeural",
    },
    ta: {
        male: "ta-IN-ValluvarNeural",
        female: "ta-IN-PallaviNeural",
    },
    te: {
        male: "te-IN-MohanNeural",
        female: "te-IN-ShrutiNeural",
    },
    bn: {
        male: "bn-IN-BashkarNeural",
        female: "bn-IN-TanishaaNeural",
    },
    gu: {
        male: "gu-IN-NiranjanNeural",
        female: "gu-IN-DhwaniNeural",
    },
    ur: {
        male: "ur-IN-SalmanNeural",
        female: "ur-IN-GulNeural",
    },
    es: {
        male: "es-ES-AlvaroNeural",
        female: "es-ES-ElviraNeural",
    },
    fr: {
        male: "fr-FR-HenriNeural",
        female: "fr-FR-DeniseNeural",
    },
    de: {
        male: "de-DE-ConradNeural",
        female: "de-DE-KatjaNeural",
    },
};

/**
 * Resolve the optimal Edge TTS voice based on explicit voice name,
 * language code, and gender preference.
 *
 * @param {Object} options
 * @param {string} [options.voice] - Explicit voice name (overrides auto-selection)
 * @param {string} [options.language] - Language code (e.g. "hi", "en", "mr")
 * @param {string} [options.gender] - "male" | "female" (default: "male")
 * @returns {string} Edge TTS voice identifier
 */
export function resolveVoice({ voice, language = "en", gender = "male" } = {}) {
    if (voice && typeof voice === "string" && voice.trim().length > 0) {
        return voice.trim();
    }

    const langKey = String(language || "en")
        .toLowerCase()
        .trim();
    const gKey =
        String(gender || "male")
            .toLowerCase()
            .trim() === "female"
            ? "female"
            : "male";

    // Direct match
    if (LANGUAGE_VOICES[langKey]) {
        return LANGUAGE_VOICES[langKey][gKey];
    }

    // Prefix match (e.g., "hi-IN" -> "hi")
    const primaryCode = langKey.split("-")[0];
    if (LANGUAGE_VOICES[primaryCode]) {
        return LANGUAGE_VOICES[primaryCode][gKey];
    }

    // Default to English Male
    return LANGUAGE_VOICES.en.male;
}
