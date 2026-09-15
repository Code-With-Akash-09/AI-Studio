import { ObjectId } from "mongodb";
import { getCollection, isDBConnected } from "../connection.js";
import { deleteLocalVideo } from "../../services/storage/local.service.js";

/**
 * Save a generated video document to MongoDB.
 *
 * @param {Object} videoData
 * @returns {Promise<Object|null>} Saved video document
 */
export async function saveVideo(videoData) {
    if (!isDBConnected()) return null;

    const collection = getCollection("videos");
    if (!collection) return null;

    const doc = {
        title: videoData.title || `Video ${new Date().toLocaleDateString()}`,
        script: videoData.script,
        language: videoData.language || "en",
        voice: videoData.voice || "en-US-ChristopherNeural",
        duration: Number(videoData.duration || 0),
        dimension: videoData.dimension || "vertical",
        videoUrl: videoData.videoUrl,
        filename: videoData.filename,
        scenes: Array.isArray(videoData.scenes) ? videoData.scenes : [],
        userId: videoData.userId ? new ObjectId(videoData.userId) : null,
        metadata: {
            aiProvider: videoData.provider || "gemini",
            aiModel: videoData.model || null,
            dimension: videoData.dimension || "vertical",
            storage: "local",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        const result = await collection.insertOne(doc);
        console.log(
            `[VideoRepo] Saved video to MongoDB (ID: ${result.insertedId})`,
        );
        return {
            _id: result.insertedId,
            ...doc,
        };
    } catch (error) {
        console.error("[VideoRepo] Failed to save video:", error.message);
        return null;
    }
}

/**
 * List created videos with pagination and optional search filter.
 *
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @param {string} [options.search=""]
 * @param {string} [options.userId]
 * @returns {Promise<{videos: Array, total: number, page: number, totalPages: number}>}
 */
export async function listVideos({
    page = 1,
    limit = 10,
    search = "",
    userId = null,
} = {}) {
    if (!isDBConnected()) {
        return { videos: [], total: 0, page, totalPages: 0 };
    }

    const collection = getCollection("videos");
    if (!collection) {
        return { videos: [], total: 0, page, totalPages: 0 };
    }

    const query = {};
    if (userId) {
        query.userId = new ObjectId(userId);
    }

    if (search?.trim()) {
        query.$or = [
            { title: { $regex: search.trim(), $options: "i" } },
            { script: { $regex: search.trim(), $options: "i" } },
        ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    try {
        const [videos, total] = await Promise.all([
            collection
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(query),
        ]);

        return {
            videos,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        };
    } catch (error) {
        console.error("[VideoRepo] Failed to list videos:", error.message);
        return { videos: [], total: 0, page, totalPages: 0 };
    }
}

/**
 * Get a single video by MongoDB ObjectId.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getVideoById(id) {
    if (!isDBConnected() || !id) return null;

    const collection = getCollection("videos");
    if (!collection) return null;

    try {
        const query = ObjectId.isValid(id)
            ? { _id: new ObjectId(id) }
            : { filename: id };
        return await collection.findOne(query);
    } catch (error) {
        console.error(
            `[VideoRepo] Failed to get video by ID "${id}":`,
            error.message,
        );
        return null;
    }
}

/**
 * Delete a video from MongoDB and remove its local file from disk.
 * @param {string} id - Video MongoDB ID
 * @returns {Promise<boolean>}
 */
export async function deleteVideo(id) {
    if (!isDBConnected() || !id) return false;

    const collection = getCollection("videos");
    if (!collection) return false;

    try {
        const video = await getVideoById(id);
        if (!video) return false;

        const query = ObjectId.isValid(id)
            ? { _id: new ObjectId(id) }
            : { filename: id };
        const res = await collection.deleteOne(query);

        if (res.deletedCount > 0 && video.filename) {
            deleteLocalVideo(video.filename);
            return true;
        }
        return false;
    } catch (error) {
        console.error(
            `[VideoRepo] Failed to delete video by ID "${id}":`,
            error.message,
        );
        return false;
    }
}
