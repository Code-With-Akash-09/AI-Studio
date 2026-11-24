export const AI_PROVIDERS = [
    { value: "gemini", label: "Google Gemini" },
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic Claude" },
];

export const GEMINI_MODELS = [
    {
        value: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash (Recommended)",
        description: "Fastest flagship free-tier model, high accuracy",
    },
    {
        value: "gemini-flash-lite-latest",
        label: "Gemini Flash-Lite (Ultra Fast)",
        description: "Lowest latency lightweight model",
    },
    {
        value: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        description: "Next-gen lightweight model",
    },
    {
        value: "gemini-3.5-flash",
        label: "Gemini 3.5 Flash",
        description: "High capacity flash model",
    },
    {
        value: "gemini-3.6-flash",
        label: "Gemini 3.6 Flash",
        description: "Standard flash model",
    },
    {
        value: "gemini-3.7-flash",
        label: "Gemini 3.7 Flash",
        description: "Enhanced reasoning model",
    },
    {
        value: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        description: "Latest generation flash model",
    },
];

export const VOICE_GENDERS = [
    { value: "male", label: "Male Voice" },
    { value: "female", label: "Female Voice" },
];

export const ASPECT_RATIOS = [
    { value: "vertical", label: "9:16 Reels", iconName: "Smartphone" },
    { value: "horizontal", label: "16:9 Landscape", iconName: "Monitor" },
];

export const LANGUAGES = [
    { value: "", label: "Auto-detect language" },
    { value: "en", label: "English (US/UK)" },
    { value: "hi", label: "Hindi (हिंदी)" },
    { value: "mr", label: "Marathi (मराठी)" },
    { value: "ta", label: "Tamil (தமிழ்)" },
    { value: "te", label: "Telugu (తెలుగు)" },
    { value: "bn", label: "Bengali (বাংলা)" },
    { value: "gu", label: "Gujarati (ગુજરાતી)" },
    { value: "es", label: "Spanish (Español)" },
    { value: "fr", label: "French (Français)" },
    { value: "de", label: "German (Deutsch)" },
];

export const VISUAL_ENGINES = [
    {
        value: "ai_realism",
        label: "AI Photorealism (Recommended)",
        description: "100% scene-accurate imagery with cinematic motion",
    },
    {
        value: "hybrid",
        label: "Smart Hybrid (Stock + AI)",
        description: "Strictly vetted stock with AI photorealism fallback",
    },
    {
        value: "stock",
        label: "Stock Video Only",
        description: "Pexels stock video footage only",
    },
];
