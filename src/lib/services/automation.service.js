/**
 * Automated (no user input) video generation: one topic in, one finished
 * video out. Used by POST /api/generate/auto and
 * .scripts/animation/auto-episode.mjs (cron).
 *
 * It deliberately passes NO animationMode, so the server default decides:
 *   ANIMATION_ENABLED=true + ANIMATION_PIPELINE_DEFAULT=full → the AI writes a
 *   full cartoon episode (hosts + script-specific guests) for every topic.
 * Other defaults: AUTOMATION_DIMENSION (vertical), AUTOMATION_BGM (none),
 * AUTOMATION_PROVIDER (gemini).
 */
import { findUserById } from "../db/repositories/user.repository.js";
import { defaultAnimationMode } from "./animation/flags.js";
import { generateVideo } from "./video.service.js";

export async function generateAutomatedVideo({
    topic,
    jobId,
    userId = process.env.AUTOMATION_USER_ID || null,
    user = null,
    dimension = process.env.AUTOMATION_DIMENSION || "vertical",
    provider = process.env.AUTOMATION_PROVIDER || "gemini",
    bgmMood = process.env.AUTOMATION_BGM || "none",
    onProgress = () => {},
} = {}) {
    const text = String(topic || "").trim();
    if (text.length < 10)
        throw new Error("An automated video needs a topic of 10+ characters.");
    const owner = user || (userId ? await findUserById(userId) : null);
    const mode = defaultAnimationMode();
    console.log(
        `[Automation] Topic: "${text.slice(0, 80)}" | mode: ${mode} (ANIMATION_PIPELINE_DEFAULT) | ${dimension} | owner: ${owner ? "user" : "none"}`,
    );
    return generateVideo(text, {
        ...(jobId ? { jobId } : {}),
        provider,
        language: "hi",
        gender: "male",
        dimension,
        bgmMood,
        userId: owner ? String(owner._id) : null,
        geminiApiKeys: Array.isArray(owner?.geminiApiKeys)
            ? owner.geminiApiKeys
            : [],
        onProgress,
        // no animationMode on purpose: the server default applies
    });
}
