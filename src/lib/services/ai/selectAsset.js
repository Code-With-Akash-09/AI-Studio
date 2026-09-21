import { generateJSON } from "./ai.factory.js";

export async function selectBestAsset(
    scene,
    assets,
    { provider, model, geminiApiKeys, excludeUrls = [] } = {},
) {
    if (!assets || assets.length === 0) return null;

    const excludedSet = new Set(
        Array.isArray(excludeUrls) ? excludeUrls.filter(Boolean) : [],
    );

    // Negative keywords filtering (if any asset query contains negative terms)
    const negativeTerms = Array.isArray(scene.negativeKeywords)
        ? scene.negativeKeywords
              .map((k) => String(k).toLowerCase().trim())
              .filter(Boolean)
        : [];

    const isNegativeMatch = (asset) => {
        if (!asset) return false;
        const textToCheck =
            `${asset.query || ""} ${asset.url || ""}`.toLowerCase();
        return negativeTerms.some(
            (neg) => neg.length > 2 && textToCheck.includes(neg),
        );
    };

    // Prioritize assets that haven't been used yet in this video and don't match negative keywords
    const cleanAssets = assets.filter(
        (asset) =>
            asset.url && !excludedSet.has(asset.url) && !isNegativeMatch(asset),
    );
    const pool = cleanAssets.length > 0 ? cleanAssets : assets;

    const candidates = pool.slice(0, 20).map((asset, index) => ({
        index,
        type: asset.type,
        url: asset.url,
        thumbnail: asset.thumbnail,
        width: asset.width,
        height: asset.height,
        duration: asset.duration || null,
        query: asset.query,
    }));

    const prompt = `
You are an expert Hollywood film editor and director evaluating candidate stock visual footage for a specific scene.

SCENE DIRECTORIAL BRIEF:
- Narration: "${scene.narration}"
- Visual Brief: "${scene.visualBrief || scene.narration}"
- Focal Subject: "${scene.subject || "Not specified"}"
- Environment: "${scene.environment || "Not specified"}"
- Action: "${scene.action || "Not specified"}"
- Desired Camera Shot: "${scene.cameraShot || "medium_shot"}"
- Lighting & Mood: "${scene.lightingMood || "cinematic_warm"}"
- Negative Keywords to strictly avoid: ${JSON.stringify(negativeTerms)}

CANDIDATE STOCK ASSETS:
${JSON.stringify(candidates, null, 2)}

TASK:
Evaluate if any candidate stock asset GENUINELY and ACCURATELY represents the Scene Directorial Brief (matching both the focal subject AND the era/environment).
Score relevance from 0 to 100.

CRITICAL REJECTION RULES (STRICT ACCURACY):
1. ERA & SETTING MISMATCH: If the scene is historical, archaeological, space, deep sea, or fantasy, and candidate footage depicts modern domestic settings (e.g. modern kitchen, modern jars, modern office desks, smartphone users), YOU MUST REJECT (set "rejectAll": true, "matchScore": 30).
2. NEVER COMPROMISE: If no candidate genuinely depicts the specific subject in its proper context, set "rejectAll": true so our studio can synthesize a photorealistic custom visual instead.
3. Only accept an asset if its matchScore is >= 80 (literal, authentic depiction of the scene).

Return ONLY valid JSON:
{
  "rejectAll": false,
  "selectedIndex": 0,
  "matchScore": 92,
  "reason": "Clear explanation of how the selected visual accurately portrays the scene's focal subject and environment."
}
`;

    try {
        const selection = await generateJSON({
            prompt,
            provider,
            model,
            geminiApiKeys,
        });

        if (
            selection?.rejectAll === true ||
            (typeof selection?.matchScore === "number" &&
                selection.matchScore < 80)
        ) {
            console.log(
                `[Asset Selector] Rejected all stock candidates (Score: ${selection?.matchScore || 40}%). Reason: ${selection?.reason || "Poor scene match"}`,
            );
            const fallback = candidates[0] || assets[0];
            if (!fallback) return null;
            return {
                ...fallback,
                matchScore: selection?.matchScore || 40,
                selectionReason:
                    selection?.reason || "Rejected - low semantic match",
                isRejected: true,
            };
        }

        let selected = candidates[selection?.selectedIndex];

        if (
            scene.visualType?.toLowerCase() === "video" &&
            selected?.type !== "video"
        ) {
            selected = candidates.find((a) => a.type === "video") || selected;
        }

        if (
            ["image", "meme", "gif"].includes(
                scene.visualType?.toLowerCase(),
            ) &&
            selected?.type !== "image"
        ) {
            selected = candidates.find((a) => a.type === "image") || selected;
        }

        const chosen = selected || candidates[0] || assets[0];
        const matchScore =
            typeof selection?.matchScore === "number"
                ? selection.matchScore
                : 85;

        return {
            ...chosen,
            matchScore,
            selectionReason:
                selection?.reason || "Matched via directorial brief",
            cameraShot: scene.cameraShot,
            visualBrief: scene.visualBrief,
            onScreenHighlight: scene.onScreenHighlight,
        };
    } catch (err) {
        console.warn(`[Asset Selector] Evaluation error: ${err.message}`);
        const fallback = candidates[0] || assets[0];
        if (!fallback) return null;
        return {
            ...fallback,
            matchScore: 30,
            selectionReason: "Evaluation fallback",
            isRejected: true,
        };
    }
}
