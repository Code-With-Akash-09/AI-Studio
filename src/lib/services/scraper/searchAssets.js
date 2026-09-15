import {
    cacheAssets,
    findCachedAssets,
} from "../../db/repositories/asset.repository.js";
import { searchPexels } from "./providers/pexels.js";

export async function searchAssets(
    scene,
    { dimension = "vertical", excludeUrls = [] } = {},
) {
    const visualType = scene.visualType?.toLowerCase();

    if (visualType === "text") {
        return {
            sceneId: scene.id,
            assets: [],
        };
    }

    const type = visualType === "video" ? "video" : "image";
    const queries = Array.isArray(scene.searchQueries)
        ? scene.searchQueries
        : [];
    const orientation = dimension === "horizontal" ? "landscape" : "portrait";
    const excludedSet = new Set(
        Array.isArray(excludeUrls) ? excludeUrls.filter(Boolean) : [],
    );

    // STEP 1: Check MongoDB Asset Cache first
    const cachedAssets = await findCachedAssets(queries, type, 18);
    const freshCached = (cachedAssets || []).filter(
        (asset) => asset.url && !excludedSet.has(asset.url),
    );

    if (freshCached.length >= 3) {
        console.log(
            `[Search] Using ${freshCached.length} unique cached assets from MongoDB for scene ${scene.id} (${dimension}).`,
        );
        return {
            sceneId: scene.id,
            assets: freshCached,
            source: "mongodb_cache",
        };
    }

    // STEP 2: Cache miss or cached assets already used -> Query Pexels API
    console.log(
        `[Search] Querying Pexels API (${orientation}) for fresh assets for scene ${scene.id}...`,
    );
    const allResults = [];

    for (const query of queries) {
        try {
            console.log(
                `Searching Pexels ${type} [${orientation}]: "${query}"`,
            );
            const results = await searchPexels(query, type, orientation);

            allResults.push(
                ...results.map((asset) => ({
                    ...asset,
                    query,
                })),
            );
        } catch (error) {
            console.error(
                `Pexels search failed for "${query}": ${error.message}`,
            );
        }
    }

    const uniqueResults = [
        ...new Map(
            allResults
                .filter((asset) => asset.url)
                .map((asset) => [asset.url, asset]),
        ).values(),
    ];

    // Filter out assets already used in earlier scenes of this video
    const freshLiveResults = uniqueResults.filter(
        (asset) => !excludedSet.has(asset.url),
    );
    const finalAssets =
        freshLiveResults.length > 0 ? freshLiveResults : uniqueResults;

    // STEP 3: Asynchronously cache retrieved Pexels assets into MongoDB
    if (uniqueResults.length > 0) {
        cacheAssets(uniqueResults, queries).catch((err) => {
            console.warn("[Search] Cache save error:", err.message);
        });
    }

    return {
        sceneId: scene.id,
        assets: finalAssets,
        source: "pexels_live",
    };
}
