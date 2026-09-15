import { generateJSON } from "./ai.factory.js";

export async function analyzeScript(
    script,
    { provider, model, language, geminiApiKeys } = {},
) {
    if (!script || typeof script !== "string") {
        throw new Error("A valid script is required.");
    }

    const languageDirective =
        language && language !== "auto"
            ? `The user specified language: "${language}". Ensure narrations preserve this language.`
            : "Detect the language and script used in the SCRIPT (e.g. Hindi 'hi', English 'en', Marathi 'mr', Hinglish, etc.).";

    const prompt = `
You are an expert multi-language short-form video director.

Your task is to take the user's SCRIPT and break it down into sequential visual scenes for video production.

CRITICAL VERBATIM SCRIPT PRESERVATION RULES:
1. EXACT WORDS ONLY: You MUST preserve the user's EXACT words, phrases, and sentences verbatim.
2. NO REWRITING: Do NOT rephrase, summarize, rewrite, or paraphrase the text.
3. NO INVENTED WORDS: Do NOT add introductory filler or reaction words (do NOT add "Oh wow", "Wait...", "Umm...", "अरे वाह" unless they were literally in the user's script).
4. SEQUENTIAL COVERAGE: Split the entire user script into consecutive, non-overlapping scene narrations (1-2 sentences per scene) so that reading the scene narrations in order reproduces the user's EXACT script word-for-word.
5. NO TRANSLATION: "narration" MUST be in the exact same language and script as the input script.
6. "searchQueries": MUST ALWAYS BE IN ENGLISH (2-3 specific keywords) describing what visual footage matches this specific scene.
7. VISUAL DIVERSITY: Each scene MUST have UNIQUE and DISTINCT "searchQueries" capturing different actions, angles, and concepts to prevent repeating the same video clip or photo across scenes.

${languageDirective}

For every scene provide:
- id: sequential scene number (1, 2, 3...)
- narration: the EXACT words from this segment of the input script (verbatim, unaltered)
- emotion: one of ["hyped", "curious", "shocked", "humorous", "dramatic", "thoughtful", "neutral"]
- visualType: one of ["video", "image", "text"]
- searchQueries: array of 2-3 specific, diverse ENGLISH search keywords for stock footage
- punchline: boolean (true if conclusion or climax)

Return this exact JSON structure:
{
  "detectedLanguage": "hi",
  "scenes": [
    {
      "id": 1,
      "narration": "<exact verbatim segment of user script>",
      "emotion": "curious",
      "visualType": "video",
      "searchQueries": ["relevant english keywords", "stock video query"],
      "punchline": false
    }
  ]
}

USER SCRIPT:
${script}
`;

    const result = await generateJSON({
        prompt,
        provider,
        model,
        geminiApiKeys,
    });

    if (!result || !Array.isArray(result.scenes)) {
        console.error("Invalid AI script analysis result:", result);
        throw new Error("AI response does not contain a scenes array.");
    }

    if (result.scenes.length === 0) {
        throw new Error("AI returned 0 scenes.");
    }

    const detectedLanguage = String(result.detectedLanguage || language || "en")
        .toLowerCase()
        .trim();

    result.detectedLanguage = detectedLanguage;
    result.scenes = result.scenes
        .map((scene, index) => ({
            id: scene.id || index + 1,
            narration: String(scene.narration || "").trim(),
            emotion: scene.emotion || "neutral",
            visualType: String(scene.visualType || "image").toLowerCase(),
            searchQueries: Array.isArray(scene.searchQueries)
                ? scene.searchQueries
                : [],
            punchline: Boolean(scene.punchline),
        }))
        .filter((scene) => scene.narration.length > 0);

    if (result.scenes.length === 0) {
        throw new Error("All generated scenes were empty.");
    }

    return result;
}
