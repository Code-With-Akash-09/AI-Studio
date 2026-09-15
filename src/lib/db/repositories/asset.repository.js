import { getCollection, isDBConnected } from "../connection.js";

/**
 * Extract clean lowercase search tags from queries and scene text.
 * @param {string[]} searchQueries
 * @returns {string[]}
 */
export function normalizeTags(searchQueries = []) {
    const rawTokens = searchQueries
        .flatMap((q) =>
            String(q || "")
                .toLowerCase()
                .split(/\s+/),
        )
        .map((t) => t.replace(/[^a-z0-9]/g, "").trim())
        .filter((t) => t.length >= 3);

    return [...new Set(rawTokens)];
}

/**
 * Find cached media assets in MongoDB by matching search tags.
 *
 * @param {string[]} searchQueries - AI search queries (e.g. ["developer coding", "stressed computer"])
 * @param {"video" | "image"} [type="video"]
 * @param {number} [limit=10]
 * @returns {Promise<Array|null>} Array of matching assets or null if cache miss/DB offline
 */
export async function findCachedAssets(
    searchQueries,
    type = "video",
    limit = 10,
) {
    if (!isDBConnected()) return null;

    const tags = normalizeTags(searchQueries);
    if (tags.length === 0) return null;

    const collection = getCollection("assets");
    if (!collection) return null;

    try {
        const query = {
            tags: { $in: tags },
        };

        if (type) {
            query.type = type === "image" ? "image" : "video";
        }

        const matches = await collection
            .find(query)
            .sort({ usageCount: -1, lastUsedAt: -1 })
            .limit(limit)
            .toArray();

        if (!matches || matches.length === 0) {
            return null;
        }

        console.log(
            `[AssetCache] Cache HIT! Found ${matches.length} existing assets for tags: [${tags.slice(0, 4).join(", ")}] (0 Pexels API calls needed)`,
        );

        // Increment usage count asynchronously in background
        const ids = matches.map((m) => m._id);
        collection
            .updateMany(
                { _id: { $in: ids } },
                { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
            )
            .catch(() => {});

        return matches.map((item) => ({
            id: item.sourceId || String(item._id),
            type: item.type,
            url: item.url,
            thumbnail: item.thumbnail,
            width: item.width,
            height: item.height,
            duration: item.duration,
            source: item.source || "cached_pexels",
        }));
    } catch (error) {
        console.warn("[AssetCache] Cache query error:", error.message);
        return null;
    }
}

/**
 * Save newly fetched Pexels assets into MongoDB cache with search tags.
 *
 * @param {Array} assets - Assets from Pexels API
 * @param {string[]} searchQueries - Associated search queries
 * @returns {Promise<void>}
 */
export async function cacheAssets(assets, searchQueries = []) {
    if (!isDBConnected() || !Array.isArray(assets) || assets.length === 0) {
        return;
    }

    const collection = getCollection("assets");
    if (!collection) return;

    const tags = normalizeTags(searchQueries);

    try {
        const operations = assets.map((asset) => ({
            updateOne: {
                filter: {
                    sourceId: String(asset.id || asset.url),
                },
                update: {
                    $set: {
                        source: asset.source || "pexels",
                        sourceId: String(asset.id || asset.url),
                        type: asset.type === "image" ? "image" : "video",
                        url: asset.url,
                        thumbnail: asset.thumbnail || null,
                        width: asset.width || 1080,
                        height: asset.height || 1920,
                        duration: asset.duration || null,
                        lastUsedAt: new Date(),
                    },
                    $addToSet: {
                        tags: { $each: tags },
                    },
                    $setOnInsert: {
                        usageCount: 1,
                        createdAt: new Date(),
                    },
                },
                upsert: true,
            },
        }));

        if (operations.length > 0) {
            await collection.bulkWrite(operations, { ordered: false });
            console.log(
                `[AssetCache] Cached ${operations.length} new assets into MongoDB.`,
            );
        }
    } catch (error) {
        console.warn("[AssetCache] Bulk cache save warning:", error.message);
    }
}
