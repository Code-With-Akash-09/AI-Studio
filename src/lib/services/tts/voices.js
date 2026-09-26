/**
 * Default Free Edge Neural Voice mappings by language code.
 * Uses high-fidelity expressive neural voices.
 */
export const LANGUAGE_VOICES = {
    hi: {
        male: "hi-IN-MadhurNeural",
        female: "hi-IN-SwaraNeural",
    },
    en: {
        male: "en-US-AndrewNeural",
        female: "en-US-AvaNeural",
    },
    "en-in": {
        male: "en-IN-PrabhatNeural",
        female: "en-IN-NeerjaExpressiveNeural",
    },
    "en-gb": {
        male: "en-GB-RyanNeural",
        female: "en-GB-SoniaNeural",
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
        female: "fr-FR-VivienneMultilingualNeural",
    },
    de: {
        male: "de-DE-KillianNeural",
        female: "de-DE-KatjaNeural",
    },
};

/**
 * Curated list of high-tier voice profiles for voice selection & previews.
 */
export const VOICE_PROFILES = [
    {
        id: "en-US-AndrewNeural",
        name: "Andrew (Warm & Authentic)",
        gender: "male",
        language: "en",
        style: "Authentic Podcast & Creator",
    },
    {
        id: "en-US-AvaNeural",
        name: "Ava (Expressive & Friendly)",
        gender: "female",
        language: "en",
        style: "Engaging & Conversational",
    },
    {
        id: "en-US-BrianNeural",
        name: "Brian (Casual & Sincere)",
        gender: "male",
        language: "en",
        style: "Approachable Storyteller",
    },
    {
        id: "en-US-EmmaNeural",
        name: "Emma (Clear & Cheerful)",
        gender: "female",
        language: "en",
        style: "Upbeat & Dynamic",
    },
    {
        id: "en-US-ChristopherNeural",
        name: "Christopher (Deep & Authority)",
        gender: "male",
        language: "en",
        style: "Documentary & Cinematic",
    },
    {
        id: "en-IN-PrabhatNeural",
        name: "Prabhat (Indian English Male)",
        gender: "male",
        language: "en",
        style: "Natural & Clear Indian Accent",
    },
    {
        id: "en-IN-NeerjaExpressiveNeural",
        name: "Neerja (Indian English Female)",
        gender: "female",
        language: "en",
        style: "Expressive Indian Accent",
    },
    {
        id: "hi-IN-MadhurNeural",
        name: "Madhur (Hindi Male)",
        gender: "male",
        language: "hi",
        style: "Polished Hindi Narrator",
    },
    {
        id: "hi-IN-SwaraNeural",
        name: "Swara (Hindi Female)",
        gender: "female",
        language: "hi",
        style: "Sweet & Articulate Hindi",
    },
];

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
export function resolveVoice({ voice, language = "en", gender = "male", speakerRole } = {}) {
    if (voice && typeof voice === "string" && voice.trim().length > 0) {
        return voice.trim();
    }

    const langKey = String(language || "en")
        .toLowerCase()
        .trim();

    let targetGender =
        String(gender || "male")
            .toLowerCase()
            .trim() === "female"
            ? "female"
            : "male";

    // Dynamic Multi-Speaker overrides
    if (speakerRole === "character_female" || speakerRole === "female_guest") {
        targetGender = "female";
    } else if (speakerRole === "character_male" || speakerRole === "male_guest") {
        targetGender = "male";
    }

    // Direct match
    if (LANGUAGE_VOICES[langKey]) {
        return LANGUAGE_VOICES[langKey][targetGender];
    }

    // Prefix match (e.g., "hi-IN" -> "hi")
    const primaryCode = langKey.split("-")[0];
    if (LANGUAGE_VOICES[primaryCode]) {
        return LANGUAGE_VOICES[primaryCode][targetGender];
    }

    // Default to English
    return LANGUAGE_VOICES.en[targetGender] || LANGUAGE_VOICES.en.male;
}

/**
 * Calculates emotional prosody (rate, pitch, volume) based on scene emotion and tone settings.
 *
 * @param {Object} params
 * @param {string} [params.emotion="neutral"] - Scene emotion ("hyped", "shocked", "curious", "dramatic", "thoughtful", "humorous", "neutral")
 * @param {string} [params.vocalTone="auto"] - Global tone preset ("auto", "creator", "storyteller", "conversational", "documentary")
 * @param {number} [params.speedMultiplier=1.0] - Speed modifier (e.g. 1.05 for 5% faster)
 * @param {boolean} [params.isPunchline=false] - Whether this scene is the punchline
 * @returns {{ rate: string, pitch: string, volume: string }}
 */
export function getEmotionProsody({
    emotion = "neutral",
    vocalTone = "auto",
    speedMultiplier = 1.0,
    isPunchline = false,
} = {}) {
    let rateDelta = 0;
    let pitchDelta = 0;

    // Apply scene emotion adjustments
    switch (emotion?.toLowerCase()) {
        case "hyped":
            rateDelta += 7;
            pitchDelta += 4;
            break;
        case "shocked":
            rateDelta += 10;
            pitchDelta += 5;
            break;
        case "curious":
            rateDelta += 2;
            pitchDelta += 3;
            break;
        case "dramatic":
            rateDelta -= 6;
            pitchDelta -= 3;
            break;
        case "thoughtful":
            rateDelta -= 8;
            pitchDelta -= 2;
            break;
        case "humorous":
            rateDelta += 5;
            pitchDelta += 3;
            break;
        default:
            break;
    }

    // Apply global tone preset adjustments
    switch (vocalTone?.toLowerCase()) {
        case "creator":
            rateDelta += 6;
            pitchDelta += 2;
            break;
        case "storyteller":
            rateDelta -= 4;
            pitchDelta -= 2;
            break;
        case "documentary":
            rateDelta -= 6;
            pitchDelta -= 4;
            break;
        default:
            break;
    }

    // Punchline cadence
    if (isPunchline) {
        rateDelta -= 3;
        pitchDelta += 1;
    }

    // Base speed multiplier (e.g. 1.1 -> +10%)
    if (typeof speedMultiplier === "number" && speedMultiplier !== 1.0) {
        rateDelta += Math.round((speedMultiplier - 1.0) * 100);
    }

    // Bound limits to maintain natural human acoustics
    rateDelta = Math.max(-30, Math.min(35, rateDelta));
    pitchDelta = Math.max(-15, Math.min(15, pitchDelta));

    const rateStr = rateDelta >= 0 ? `+${rateDelta}%` : `${rateDelta}%`;
    const pitchStr = pitchDelta >= 0 ? `+${pitchDelta}Hz` : `${pitchDelta}Hz`;

    return {
        rate: rateStr,
        pitch: pitchStr,
        volume: "+0%",
    };
}
