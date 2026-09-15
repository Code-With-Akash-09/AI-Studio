export function formatErrorMessage(error) {
    if (!error) return "An unknown error occurred.";

    const errStr =
        typeof error === "string"
            ? error
            : `${error.message || ""} ${JSON.stringify(error)}`;

    const lower = errStr.toLowerCase();
    if (
        error.status === 429 ||
        error.status === 503 ||
        error.status === 504 ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("429") ||
        errStr.includes("503") ||
        lower.includes("quota") ||
        lower.includes("rate limit") ||
        lower.includes("overloaded") ||
        lower.includes("high demand") ||
        lower.includes("unavailable")
    ) {
        const retryMatch = errStr.match(/retryDelay["\s:]+["']?(\d+s?)/i);
        const delayMsg = retryMatch
            ? ` Please wait ${retryMatch[1]} before retrying.`
            : " The AI model is experiencing high demand. Please try again shortly.";

        return `Gemini API high demand / quota limit.${delayMsg}`;
    }

    if (
        errStr.includes("Pexels API error") ||
        errStr.includes("PEXELS_API_KEY")
    ) {
        return "Visual asset fetch failed. Please check your Pexels API key.";
    }

    return error.message || "Video generation failed.";
}
