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

export const DEFAULT_BGM_MOOD = "auto";
export const DEFAULT_BGM_VOLUME = 0.1;
