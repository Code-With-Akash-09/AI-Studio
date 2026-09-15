import { getCollection, isDBConnected } from "../connection.js";

/**
 * Create a new generation job record in MongoDB.
 *
 * @param {Object} jobData
 * @returns {Promise<Object>}
 */
export async function createJob(jobData) {
    if (!isDBConnected()) return null;

    const collection = getCollection("jobs");
    if (!collection) return null;

    const doc = {
        jobId: jobData.jobId,
        script: jobData.script,
        options: jobData.options || {},
        status: "processing",
        progress: 5,
        progressMessage: "Starting video generation...",
        detectedLanguage: null,
        selectedVoice: null,
        scenePlan: [],
        completedScenes: [],
        currentSceneIndex: 0,
        totalScenes: 0,
        videoUrl: null,
        videoId: null,
        error: null,
        retryAfterSeconds: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        await collection.insertOne(doc);
        return doc;
    } catch (error) {
        console.warn("[JobRepo] Failed to create job record:", error.message);
        return null;
    }
}

/**
 * Retrieve a job document by jobId.
 * @param {string} jobId
 * @returns {Promise<Object|null>}
 */
export async function getJob(jobId) {
    if (!isDBConnected() || !jobId) return null;

    const collection = getCollection("jobs");
    if (!collection) return null;

    try {
        return await collection.findOne({ jobId });
    } catch (error) {
        console.warn(`[JobRepo] Failed to get job "${jobId}":`, error.message);
        return null;
    }
}

/**
 * Checkpoint a completed scene into the job document in MongoDB.
 *
 * @param {string} jobId
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function checkpointScene(jobId, data) {
    if (!isDBConnected() || !jobId) return;

    const collection = getCollection("jobs");
    if (!collection) return;

    try {
        await collection.updateOne(
            { jobId },
            {
                $set: {
                    currentSceneIndex: data.sceneIndex,
                    progress: data.progress,
                    progressMessage: data.message,
                    updatedAt: new Date(),
                },
                $push: {
                    completedScenes: data.sceneResult,
                },
            },
        );
    } catch (error) {
        console.warn("[JobRepo] Checkpoint scene error:", error.message);
    }
}

/**
 * Save AI Scene Plan into Job record.
 * @param {string} jobId
 * @param {Object} plan
 */
export async function saveScenePlan(jobId, plan) {
    if (!isDBConnected() || !jobId) return;

    const collection = getCollection("jobs");
    if (!collection) return;

    try {
        await collection.updateOne(
            { jobId },
            {
                $set: {
                    detectedLanguage: plan.detectedLanguage,
                    selectedVoice: plan.selectedVoice,
                    scenePlan: plan.scenes,
                    totalScenes: plan.scenes.length,
                    progress: 20,
                    progressMessage: `${plan.scenes.length} scenes planned in [${plan.detectedLanguage}].`,
                    updatedAt: new Date(),
                },
            },
        );
    } catch (error) {
        console.warn("[JobRepo] Save scene plan error:", error.message);
    }
}

/**
 * Mark job as paused due to AI Quota Limit / 429 rate limit.
 *
 * @param {string} jobId
 * @param {Object} details
 */
export async function pauseJobQuota(jobId, details = {}) {
    if (!isDBConnected() || !jobId) return;

    const collection = getCollection("jobs");
    if (!collection) return;

    try {
        await collection.updateOne(
            { jobId },
            {
                $set: {
                    status: "paused_quota_exceeded",
                    error: details.error,
                    retryAfterSeconds: details.retryAfterSeconds || 60,
                    progressMessage:
                        "AI quota exceeded. Job paused and can be resumed.",
                    updatedAt: new Date(),
                },
            },
        );
        console.log(
            `[JobRepo] Job "${jobId}" paused (quota exceeded). Can be resumed.`,
        );
    } catch (error) {
        console.warn("[JobRepo] Pause job error:", error.message);
    }
}

/**
 * Mark job as completed with final video details.
 * @param {string} jobId
 * @param {Object} details
 */
export async function completeJob(jobId, details = {}) {
    if (!isDBConnected() || !jobId) return;

    const collection = getCollection("jobs");
    if (!collection) return;

    try {
        await collection.updateOne(
            { jobId },
            {
                $set: {
                    status: "completed",
                    progress: 100,
                    progressMessage: "Video ready.",
                    videoUrl: details.videoUrl,
                    videoId: details.videoId || null,
                    updatedAt: new Date(),
                },
            },
        );
    } catch (error) {
        console.warn("[JobRepo] Complete job error:", error.message);
    }
}

/**
 * Mark job as failed.
 * @param {string} jobId
 * @param {string} error
 */
export async function failJob(jobId, error) {
    if (!isDBConnected() || !jobId) return;

    const collection = getCollection("jobs");
    if (!collection) return;

    try {
        await collection.updateOne(
            { jobId },
            {
                $set: {
                    status: "failed",
                    error: String(error),
                    progressMessage: "Video generation failed.",
                    updatedAt: new Date(),
                },
            },
        );
    } catch (err) {
        console.warn("[JobRepo] Fail job error:", err.message);
    }
}
