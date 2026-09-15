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

    // Prioritize assets that haven't been used yet in this video
    const freshAssets = assets.filter(
        (asset) => asset.url && !excludedSet.has(asset.url),
    );
    const pool = freshAssets.length > 0 ? freshAssets : assets;

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
You are an expert AI video editor and director.

Choose the SINGLE BEST visual asset for this video scene. Ensure maximum visual variety and avoid repetitive footage.

SCENE NARRATION:
${scene.narration}

EMOTION:
${scene.emotion}

VISUAL TYPE:
${scene.visualType}

CANDIDATE ASSETS:
${JSON.stringify(candidates, null, 2)}

Choose the asset that best matches the scene.

Consider:
- High relevance to the specific action or mood of this scene
- Visual variety and uniqueness (avoid repetitive or generic background loops)
- Visual quality and sharpness
- Suitability for modern dynamic video production

Return ONLY valid JSON:

{
  "selectedIndex": 0,
  "reason": "short explanation of why this visual fits this specific scene"
}
`;

    try {
        const selection = await generateJSON({
            prompt,
            provider,
            model,
            geminiApiKeys,
        });

        let selected = candidates[selection?.selectedIndex];

        if (
            scene.visualType.toLowerCase() === "video" &&
            selected?.type !== "video"
        ) {
            selected = candidates.find((a) => a.type === "video") || selected;
        }

        if (
            ["image", "meme", "gif"].includes(scene.visualType.toLowerCase()) &&
            selected?.type !== "image"
        ) {
            selected = candidates.find((a) => a.type === "image") || selected;
        }

        return {
            ...(selected || candidates[0] || assets[0]),
            selectionReason: selection?.reason || "Default selection",
        };
    } catch (_err) {
        // Fallback to first available fresh candidate
        return {
            ...(candidates[0] || assets[0]),
            selectionReason: "Heuristic fallback",
        };
    }
}
