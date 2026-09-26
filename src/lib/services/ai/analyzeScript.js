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
You are an expert Hollywood film director and visual storyboard director specializing in high-engagement short-form video creation.

Your task is to take the user's SCRIPT and break it down into sequential, highly relevant visual scenes with rich directorial specifications.

CRITICAL SCRIPT & DIRECTING RULES:
1. EXACT WORDS ONLY: You MUST preserve the user's EXACT words, phrases, and sentences verbatim.
2. NO REWRITING: Do NOT rephrase, summarize, rewrite, or paraphrase the narration.
3. NO INVENTED WORDS: Do NOT add introductory filler or reaction words (do NOT add "Oh wow", "Wait...", "Umm...", "अरे वाह" unless they were literally in the user's script).
4. SEQUENTIAL COVERAGE: Split the entire user script into consecutive, non-overlapping scene narrations (1-2 sentences per scene) so that reading the scene narrations in order reproduces the user's EXACT script word-for-word.
5. NO TRANSLATION IN NARRATION: "narration" MUST be in the exact same language and script as the input script.
6. SCENE-TO-SCRIPT VISUAL ALIGNMENT: The visual elements (subject, environment, action, search queries) MUST directly represent the specific concept or event mentioned in the narration segment. Avoid generic, vague, or disconnected stock concepts.
7. SEARCH QUERIES (ENGLISH): Provide 2-3 specific English search queries ordered from most specific focal subject to contextual environment.
8. NEGATIVE KEYWORDS (ENGLISH): Provide 2-3 negative keywords representing irrelevant, generic, or clashing visuals to avoid (e.g. "modern office", "cartoon", "isolated white background").
9. ON-SCREEN HIGHLIGHT: Extract 1-4 punchy words, numbers, or key facts from the narration to highlight on screen (e.g., "3,000 YEARS OLD", "80% UNEXPLORED", "INSTANT SPEED").
10. NARRATIVE CONTINUITY: Ensure visual continuity of era, environment, and tone across all scenes.

${languageDirective}

STORYLINE ATMOSPHERE:
- "storylineMood": Pick exactly one from ["inspirational", "dramatic", "upbeat", "chill", "suspense", "humorous"]
- "narrativeTopic": Concise topic description (e.g. "Ancient Egyptian Pyramids & Preserved Artifacts")

FOR EVERY SCENE PROVIDE:
- id: sequential scene number (1, 2, 3...)
- narration: the EXACT words from this segment of the input script (verbatim, unaltered)
- visualBrief: 1 concise, vivid cinematic description of what is visible on screen
- subject: main focal object, character, or entity
- environment: physical setting/location of the scene
- action: dynamic motion or event occurring in this shot
- cameraShot: one of ["close_up", "wide_establishing", "macro", "aerial_drone", "pov", "tracking", "medium_shot"]
- lightingMood: one of ["cinematic_warm", "dark_mysterious", "bright_natural", "golden_hour", "neon_cyberpunk", "vintage_retro", "dramatic_shadows"]
- emotion: one of ["hyped", "curious", "shocked", "humorous", "dramatic", "thoughtful", "neutral"]
- speakerRole: one of ["narrator", "host", "expert", "character_male", "character_female"] (defaults to "narrator", or switch when dialogue/quote is present)
- ambientAtmosphere: one of ["nature_wind", "cyber_hum", "room_ambient", "cinematic_space", "ancient_temple", "none"]
- visualType: one of ["video", "image", "text"]
- searchQueries: array of 2-3 specific English search terms
- negativeKeywords: array of 2-3 terms to avoid
- onScreenHighlight: short punchy text/number for visual emphasis
- punchline: boolean (true if conclusion or dramatic climax)

Return this exact JSON structure:
{
  "detectedLanguage": "en",
  "narrativeTopic": "Ancient Egyptian Archaeology",
  "storylineMood": "dramatic",
  "scenes": [
    {
      "id": 1,
      "narration": "<exact verbatim segment of user script>",
      "visualBrief": "Macro close-up of a clay amphora jar with hieroglyphic markings in an ancient tomb",
      "subject": "Ancient clay honey jar with intact wax seal",
      "environment": "Dim stone burial chamber inside an ancient Egyptian pyramid",
      "action": "Archaeologist gently brushing sand away from an ancient relic",
      "cameraShot": "macro",
      "lightingMood": "cinematic_warm",
      "emotion": "curious",
      "speakerRole": "narrator",
      "ambientAtmosphere": "ancient_temple",
      "visualType": "video",
      "searchQueries": ["ancient egyptian artifacts tomb", "clay jar antique archaeology", "pyramid interior torchlight"],
      "negativeKeywords": ["modern grocery supermarket", "plastic bottle", "cartoon"],
      "onScreenHighlight": "3,000 YEARS OLD",
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

    const validMoods = [
        "inspirational",
        "dramatic",
        "upbeat",
        "chill",
        "suspense",
        "humorous",
    ];
    const rawMood = String(result.storylineMood || "")
        .toLowerCase()
        .trim();
    const storylineMood = validMoods.includes(rawMood)
        ? rawMood
        : "inspirational";

    const validShots = [
        "close_up",
        "wide_establishing",
        "macro",
        "aerial_drone",
        "pov",
        "tracking",
        "medium_shot",
    ];

    const validLighting = [
        "cinematic_warm",
        "dark_mysterious",
        "bright_natural",
        "golden_hour",
        "neon_cyberpunk",
        "vintage_retro",
        "dramatic_shadows",
    ];

    const validSpeakerRoles = [
        "narrator",
        "host",
        "expert",
        "character_male",
        "character_female",
    ];

    const validAmbients = [
        "nature_wind",
        "cyber_hum",
        "room_ambient",
        "cinematic_space",
        "ancient_temple",
        "none",
    ];

    result.detectedLanguage = detectedLanguage;
    result.narrativeTopic = String(
        result.narrativeTopic || "Story Video",
    ).trim();
    result.storylineMood = storylineMood;
    result.scenes = result.scenes
        .map((scene, index) => {
            const rawShot = String(
                scene.cameraShot || "medium_shot",
            ).toLowerCase();
            const cameraShot = validShots.includes(rawShot)
                ? rawShot
                : "medium_shot";

            const rawLighting = String(
                scene.lightingMood || "cinematic_warm",
            ).toLowerCase();
            const lightingMood = validLighting.includes(rawLighting)
                ? rawLighting
                : "cinematic_warm";

            const rawSpeakerRole = String(
                scene.speakerRole || "narrator",
            ).toLowerCase();
            const speakerRole = validSpeakerRoles.includes(rawSpeakerRole)
                ? rawSpeakerRole
                : "narrator";

            const rawAmbient = String(
                scene.ambientAtmosphere || "none",
            ).toLowerCase();
            const ambientAtmosphere = validAmbients.includes(rawAmbient)
                ? rawAmbient
                : "none";

            return {
                id: scene.id || index + 1,
                narration: String(scene.narration || "").trim(),
                visualBrief: String(
                    scene.visualBrief || scene.narration || "",
                ).trim(),
                subject: String(scene.subject || "").trim(),
                environment: String(scene.environment || "").trim(),
                action: String(scene.action || "").trim(),
                cameraShot,
                lightingMood,
                emotion: scene.emotion || "neutral",
                speakerRole,
                ambientAtmosphere,
                visualType: String(scene.visualType || "video").toLowerCase(),
                searchQueries:
                    Array.isArray(scene.searchQueries) &&
                    scene.searchQueries.length > 0
                        ? scene.searchQueries
                              .map((q) => String(q).trim())
                              .filter(Boolean)
                        : [String(scene.subject || "cinematic video").trim()],
                negativeKeywords: Array.isArray(scene.negativeKeywords)
                    ? scene.negativeKeywords
                          .map((k) => String(k).trim())
                          .filter(Boolean)
                    : [],
                onScreenHighlight: String(scene.onScreenHighlight || "").trim(),
                punchline: Boolean(scene.punchline),
            };
        })
        .filter((scene) => scene.narration.length > 0);

    if (result.scenes.length === 0) {
        throw new Error("All generated scenes were empty.");
    }

    return result;
}
