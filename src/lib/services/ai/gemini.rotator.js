import { GoogleGenAI } from "@google/genai";
import { config } from "../../config.js";

/**
 * Checks if an error is a Rate Limit, Quota Exceeded, or High Demand / Overloaded Model error.
 * @param {any} error
 * @returns {boolean}
 */
export function isQuotaOrRateLimitError(error) {
    if (!error) return false;

    const status = error.status || error.statusCode || error.status_code;
    if (status === 429 || status === 503 || status === 504 || status === 500) {
        return true;
    }

    const errStr =
        typeof error === "string"
            ? error
            : `${error.message || ""} ${error.stack || ""} ${JSON.stringify(error)}`;

    const lower = errStr.toLowerCase();
    return (
        lower.includes("resource_exhausted") ||
        lower.includes("429") ||
        lower.includes("quota") ||
        lower.includes("rate limit") ||
        lower.includes("too many requests") ||
        lower.includes("overloaded") ||
        lower.includes("high demand") ||
        lower.includes("unavailable") ||
        lower.includes("503") ||
        lower.includes("deadline_exceeded") ||
        lower.includes("service unavailable") ||
        lower.includes("temporarily unavailable") ||
        lower.includes("try again later")
    );
}

/**
 * Sleep helper for backoff delays.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Strip markdown code fences if present (e.g. ```json ... ```)
 * @param {string} rawText
 * @returns {any}
 */
function parseGeminiJSON(rawText) {
    if (!rawText?.trim()) {
        throw new Error("Gemini returned an empty response.");
    }

    const cleaned = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        console.error("Gemini returned invalid JSON:");
        console.error(rawText);
        throw new Error("Gemini returned invalid JSON output.");
    }
}

const MODEL_ALIASES = new Map([
    ["gemini 3.8 flash", "gemini-3.8-flash"],
    ["gemini 3.7 flash", "gemini-3.7-flash"],
    ["gemini 3.6 flash", "gemini-3.6-flash"],
    ["gemini 3.5 flash", "gemini-3.5-flash"],
    ["gemini 3.1 flash lite", "gemini-3.1-flash-lite"],
    ["gemini 3.5 flash lite", "gemini-3.5-flash-lite"],
]);

function normalizeModelName(model) {
    const normalized = String(model || "")
        .trim()
        .toLowerCase();
    return MODEL_ALIASES.get(normalized) || normalized;
}

/**
 * Build a prioritized list of fallback models to ensure high resilience
 * when a specific model is facing high traffic or capacity limits.
 *
 * @param {string} primaryModel
 * @returns {string[]}
 */
function getModelFallbackChain(primaryModel) {
    const defaultChain = [
        normalizeModelName(primaryModel),
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
    ];

    // Deduplicate and filter out empty model names
    return [
        ...new Set(
            defaultChain.map((m) => String(m || "").trim()).filter(Boolean),
        ),
    ];
}

/**
 * Execute Gemini generateContent with automated circular key rotation,
 * model fallbacks, and retry backoffs on quota / high-demand errors.
 *
 * @param {Object} opts
 * @param {string} opts.prompt - Text prompt
 * @param {string} opts.model - Gemini model identifier
 * @param {string[]|string} [opts.geminiApiKeys] - User-supplied Gemini API keys
 * @param {number} [opts.maxRetriesPerKey=2] - Number of quick retries per key for transient 503/high-demand
 * @returns {Promise<any>} Parsed JSON response
 */
export async function executeGeminiWithKeyRotation({
    prompt,
    model = "gemini-3.6-flash",
    geminiApiKeys = [],
    maxRetriesPerKey = 2,
}) {
    const userKeys = Array.isArray(geminiApiKeys)
        ? geminiApiKeys
        : typeof geminiApiKeys === "string" && geminiApiKeys.trim()
          ? [geminiApiKeys]
          : [];

    const rawCandidates = [...userKeys, config.geminiApiKey];
    const candidateKeys = [
        ...new Set(
            rawCandidates.map((k) => String(k || "").trim()).filter(Boolean),
        ),
    ];

    if (candidateKeys.length === 0) {
        throw new Error(
            "No Gemini API key found in user profile or environment variables (GEMINI_API_KEY).",
        );
    }

    const modelChain = getModelFallbackChain(model);
    let lastError = null;

    for (let kIndex = 0; kIndex < candidateKeys.length; kIndex++) {
        const currentKey = candidateKeys[kIndex];
        const maskedKey = `${currentKey.slice(0, 8)}...${currentKey.slice(-4)}`;

        for (const targetModel of modelChain) {
            for (let attempt = 0; attempt < maxRetriesPerKey; attempt++) {
                try {
                    const attemptLabel =
                        attempt > 0
                            ? ` (retry ${attempt + 1}/${maxRetriesPerKey})`
                            : "";
                    console.log(
                        `[Gemini Rotator] Calling [${targetModel}] with key ${kIndex + 1}/${candidateKeys.length} (${maskedKey})${attemptLabel}...`,
                    );

                    const ai = new GoogleGenAI({ apiKey: currentKey });
                    const response = await ai.models.generateContent({
                        model: targetModel,
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                        },
                    });

                    const text =
                        typeof response.text === "string" ? response.text : "";
                    const result = parseGeminiJSON(text);

                    console.log(
                        `[Gemini Rotator] Generation successful using model [${targetModel}] and key ${kIndex + 1}/${candidateKeys.length}.`,
                    );
                    return result;
                } catch (error) {
                    lastError = error;

                    if (isQuotaOrRateLimitError(error)) {
                        console.warn(
                            `[Gemini Rotator] Model [${targetModel}] / Key ${kIndex + 1} high-demand/quota limit hit: ${error.message || "RESOURCE_EXHAUSTED"}.`,
                        );

                        // If transient (503 / overloaded / high demand), wait a bit before retrying
                        if (attempt < maxRetriesPerKey - 1) {
                            const delayMs = (attempt + 1) * 1500;
                            console.log(
                                `[Gemini Rotator] High demand backoff: waiting ${delayMs}ms before retry...`,
                            );
                            await sleep(delayMs);
                        }
                    } else {
                        // Non-quota, non-transient error (e.g. invalid syntax/arguments)
                        console.error(
                            `[Gemini Rotator] Unrecoverable error on key ${kIndex + 1}:`,
                            error.message,
                        );
                        throw error;
                    }
                }
            }
        }

        if (kIndex < candidateKeys.length - 1) {
            console.log(
                `[Gemini Rotator] Key ${kIndex + 1} exhausted across all models. Rotating to next key (${kIndex + 2}/${candidateKeys.length})...`,
            );
        }
    }

    console.error(
        `[Gemini Rotator] All ${candidateKeys.length} Gemini API keys and fallback models are currently overloaded/exhausted.`,
    );
    throw lastError;
}
