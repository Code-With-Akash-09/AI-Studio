import { GoogleGenAI } from "@google/genai";
import { config } from "../../config.js";

/**
 * Checks if an error indicates a quota or rate limit exhaustion on the API key.
 * @param {any} error
 * @returns {boolean}
 */
export function isQuotaError(error) {
    if (!error) return false;

    const status = error.status || error.statusCode || error.status_code;
    if (status === 429) return true;

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
        lower.includes("too many requests")
    );
}

/**
 * Checks if an error indicates transient model overload or high demand.
 * @param {any} error
 * @returns {boolean}
 */
export function isModelOverloadError(error) {
    if (!error) return false;

    const status = error.status || error.statusCode || error.status_code;
    if (status === 503 || status === 504 || status === 500) return true;

    const errStr =
        typeof error === "string"
            ? error
            : `${error.message || ""} ${error.stack || ""} ${JSON.stringify(error)}`;

    const lower = errStr.toLowerCase();
    return (
        lower.includes("503") ||
        lower.includes("504") ||
        lower.includes("overloaded") ||
        lower.includes("high demand") ||
        lower.includes("unavailable") ||
        lower.includes("deadline_exceeded") ||
        lower.includes("temporarily unavailable") ||
        lower.includes("service unavailable") ||
        lower.includes("timeout")
    );
}

/**
 * Checks if a model was deprecated, removed, or not found.
 * @param {any} error
 * @returns {boolean}
 */
export function isModelNotFoundError(error) {
    if (!error) return false;
    const status = error.status || error.statusCode || error.status_code;
    if (status === 404) return true;

    const errStr =
        typeof error === "string"
            ? error
            : `${error.message || ""} ${error.stack || ""}`;
    const lower = errStr.toLowerCase();
    return lower.includes("not found") || lower.includes("no longer available");
}

/**
 * Checks if an error is either quota exhaustion or model overload.
 * @param {any} error
 * @returns {boolean}
 */
export function isQuotaOrRateLimitError(error) {
    return isQuotaError(error) || isModelOverloadError(error);
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
    ["gemini 2.5 flash", "gemini-2.5-flash"],
    ["gemini-2.5-flash", "gemini-2.5-flash"],
    ["gemini flash lite", "gemini-flash-lite-latest"],
    ["gemini-flash-lite", "gemini-flash-lite-latest"],
    ["gemini-flash-lite-latest", "gemini-flash-lite-latest"],
    ["gemini flash", "gemini-2.5-flash"],
    ["gemini-flash", "gemini-2.5-flash"],
    ["gemini 3.5 flash lite", "gemini-3.5-flash-lite"],
    ["gemini-3.5-flash-lite", "gemini-3.5-flash-lite"],
    ["gemini 3.5 flash", "gemini-3.5-flash"],
    ["gemini-3.5-flash", "gemini-3.5-flash"],
    ["gemini 3.6 flash", "gemini-3.6-flash"],
    ["gemini-3.6-flash", "gemini-3.6-flash"],
    ["gemini 3.7 flash", "gemini-3.7-flash"],
    ["gemini-3.7-flash", "gemini-3.7-flash"],
    ["gemini 3.8 flash", "gemini-3.8-flash"],
    ["gemini-3.8-flash", "gemini-3.8-flash"],
    ["gemini 3.1 flash lite", "gemini-3.1-flash-lite"],
    ["gemini-3.1-flash-lite", "gemini-3.1-flash-lite"],
]);

function normalizeModelName(model) {
    const normalized = String(model || "")
        .trim()
        .toLowerCase();
    return MODEL_ALIASES.get(normalized) || normalized;
}

/**
 * Verified free-tier models in priority order of performance and availability.
 */
const VERIFIED_FREE_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
];

/**
 * Build a prioritized list of fallback models.
 * @param {string} primaryModel
 * @returns {string[]}
 */
function getModelFallbackChain(primaryModel) {
    const normalized = normalizeModelName(primaryModel);
    const defaultChain = [normalized, ...VERIFIED_FREE_MODELS];

    return [
        ...new Set(
            defaultChain.map((m) => String(m || "").trim()).filter(Boolean),
        ),
    ];
}

// Track cooldown timestamps for keys hitting 429 quota/rate-limits (key -> expiration timestamp)
const keyCooldowns = new Map();

// Remember last successful key index to start next request from a known working key (0ms delay)
let currentKeyIndex = 0;

/**
 * Order candidate keys starting from the last working key, prioritizing
 * keys that are not on cooldown.
 *
 * @param {string[]} candidateKeys
 * @returns {{ key: string, originalIndex: number }[]}
 */
function getOrderedCandidateKeys(candidateKeys) {
    const now = Date.now();
    const count = candidateKeys.length;
    const startIdx = currentKeyIndex % count;

    const rotated = [];
    for (let i = 0; i < count; i++) {
        const idx = (startIdx + i) % count;
        rotated.push({ key: candidateKeys[idx], originalIndex: idx });
    }

    const available = [];
    const cooledDown = [];

    for (const item of rotated) {
        const cooldownUntil = keyCooldowns.get(item.key) || 0;
        if (cooldownUntil <= now) {
            available.push(item);
        } else {
            cooledDown.push({ ...item, cooldownUntil });
        }
    }

    cooledDown.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    return [...available, ...cooledDown];
}

/**
 * Execute Gemini generateContent with fast circular key rotation,
 * smart key cooldowns, instant failover, and model fallback chains.
 *
 * @param {Object} opts
 * @param {string} opts.prompt - Text prompt
 * @param {string} opts.model - Gemini model identifier
 * @param {string[]|string} [opts.geminiApiKeys] - User-supplied Gemini API keys
 * @param {number} [opts.timeoutMs=15000] - Timeout per attempt
 * @returns {Promise<any>} Parsed JSON response
 */
export async function executeGeminiWithKeyRotation({
    prompt,
    model = "gemini-2.5-flash",
    geminiApiKeys = [],
    timeoutMs = 15000,
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

    const orderedKeys = getOrderedCandidateKeys(candidateKeys);
    const modelChain = getModelFallbackChain(model);
    let lastError = null;

    for (let k = 0; k < orderedKeys.length; k++) {
        const { key: currentKey, originalIndex: keyIndex } = orderedKeys[k];
        const keyLabel = `${keyIndex + 1}/${candidateKeys.length}`;

        for (const targetModel of modelChain) {
            try {
                console.log(
                    `[Gemini Rotator] Calling [${targetModel}] with key ${keyLabel}...`,
                );

                const ai = new GoogleGenAI({ apiKey: currentKey });

                const requestPromise = ai.models.generateContent({
                    model: targetModel,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    },
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    `Timeout after ${timeoutMs}ms calling [${targetModel}]`,
                                ),
                            ),
                        timeoutMs,
                    ),
                );

                const response = await Promise.race([
                    requestPromise,
                    timeoutPromise,
                ]);

                const text =
                    typeof response.text === "string" ? response.text : "";
                const result = parseGeminiJSON(text);

                // Update last successful key pointer so subsequent calls hit working key directly
                currentKeyIndex = keyIndex;
                keyCooldowns.delete(currentKey);

                console.log(
                    `[Gemini Rotator] Generation successful using model [${targetModel}] and key ${keyLabel}.`,
                );
                return result;
            } catch (error) {
                lastError = error;

                if (isQuotaError(error)) {
                    // Quota or rate-limit is tied to the KEY/project.
                    // Put this key on a 60s cooldown and rotate to next key immediately!
                    keyCooldowns.set(currentKey, Date.now() + 60_000);
                    console.warn(
                        `[Gemini Rotator] Key ${keyLabel} quota exceeded: ${error.message || "429"}. Rotating to next key immediately...`,
                    );
                    // Break out of model chain for this exhausted key -> jump to next key
                    break;
                } else if (isModelOverloadError(error)) {
                    // Model overload (503 / high demand / timeout) is tied to the MODEL.
                    // Immediately try the next model in the fallback chain on this key!
                    console.warn(
                        `[Gemini Rotator] Model [${targetModel}] overloaded/high-demand: ${error.message || "503"}. Falling back to next model...`,
                    );
                } else if (isModelNotFoundError(error)) {
                    // Model discontinued or not found (404).
                    console.warn(
                        `[Gemini Rotator] Model [${targetModel}] not found or discontinued. Skipping...`,
                    );
                } else {
                    // Non-quota, non-transient error (e.g. invalid syntax/arguments)
                    console.error(
                        `[Gemini Rotator] Unrecoverable error on key ${keyLabel} with [${targetModel}]:`,
                        error.message,
                    );
                    throw error;
                }
            }
        }
    }

    console.error(
        `[Gemini Rotator] All ${candidateKeys.length} Gemini API keys and fallback models exhausted.`,
    );
    throw lastError;
}
