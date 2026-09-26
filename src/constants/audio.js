export const BGM_MOODS = [
    {
        value: "auto",
        label: "Auto (AI Storyline Match)",
        description:
            "AI analyzes narrative mood and selects best matching music",
    },
    {
        value: "inspirational",
        label: "Inspirational & Uplifting",
        description: "Piano, soft acoustic strings, uplifting progress",
    },
    {
        value: "dramatic",
        label: "Dramatic & Cinematic",
        description:
            "Deep orchestral strings, tension buildup, powerful impact",
    },
    {
        value: "upbeat",
        label: "Upbeat & Energetic",
        description: "Modern electronic pulse, drums, high momentum",
    },
    {
        value: "chill",
        label: "Chill & Lo-Fi",
        description: "Relaxed hip-hop groove, warm chords, mellow vibe",
    },
    {
        value: "suspense",
        label: "Suspense & Mystery",
        description: "Dark ambient synth, tense ticking, investigative feel",
    },
    {
        value: "humorous",
        label: "Playful & Quirky",
        description: "Lighthearted rhythm, pizzicato strings, comedic timing",
    },
    {
        value: "none",
        label: "None (Voice Only)",
        description: "Clean voiceover with no background music",
    },
];

export const BGM_VOLUMES = [
    { value: 0.1, label: "Subtle (10%)" },
    { value: 0.15, label: "Balanced (15%)" },
    { value: 0.25, label: "Prominent (25%)" },
];

export const VOCAL_TONES = [
    {
        value: "auto",
        label: "Dynamic Emotion (AI Match)",
        description:
            "Adapts pitch & energy per scene emotion (hype, suspense, curiosity)",
    },
    {
        value: "creator",
        label: "High-Energy Creator",
        description: "Fast-paced, vibrant, punchy delivery for viral shorts",
    },
    {
        value: "storyteller",
        label: "Cinematic Storyteller",
        description: "Deep, measured, evocative cadence with dramatic pauses",
    },
    {
        value: "conversational",
        label: "Casual & Friendly",
        description: "Natural, approachable podcast-style speaking tone",
    },
    {
        value: "documentary",
        label: "Documentary & Authority",
        description: "Authoritative, resonant, and articulate articulation",
    },
];

export const VOCAL_SPEEDS = [
    { value: 0.9, label: "0.9x (Relaxed)" },
    { value: 1.0, label: "1.0x (Normal)" },
    { value: 1.1, label: "1.1x (Punchy / Reels)" },
    { value: 1.2, label: "1.2x (High Speed)" },
];

export const DEFAULT_BGM_MOOD = "auto";
export const DEFAULT_BGM_VOLUME = 0.1;
export const DEFAULT_VOCAL_TONE = "auto";
export const DEFAULT_VOCAL_SPEED = 1.0;
