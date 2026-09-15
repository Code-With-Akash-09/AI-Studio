import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { config } from "../../config.js";
import { executeGeminiWithKeyRotation } from "./gemini.rotator.js";

const DEFAULT_MODELS = {
    gemini: "gemini-3.6-flash",
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-20241022",
};

export async function generateJSON({
    prompt,
    provider = "gemini",
    model,
    geminiApiKeys,
}) {
    const targetProvider = (provider || "gemini").toLowerCase();
    const targetModel =
        model || DEFAULT_MODELS[targetProvider] || "gemini-3.6-flash";

    if (targetProvider === "gemini") {
        return executeGeminiWithKeyRotation({
            prompt,
            model: targetModel,
            geminiApiKeys,
        });
    }

    if (targetProvider === "openai") {
        if (!config.openaiApiKey) {
            throw new Error(
                "OPENAI_API_KEY is missing in environment variables.",
            );
        }

        const client = new OpenAI({ apiKey: config.openaiApiKey });
        const response = await client.chat.completions.create({
            model: targetModel,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert AI video assistant. Always respond with valid JSON only.",
                },
                { role: "user", content: prompt },
            ],
        });

        const text = response.choices[0]?.message?.content || "";
        return parseJSONResponse(text, "OpenAI");
    }

    if (targetProvider === "anthropic" || targetProvider === "claude") {
        if (!config.anthropicApiKey) {
            throw new Error(
                "ANTHROPIC_API_KEY is missing in environment variables.",
            );
        }

        const client = new Anthropic({ apiKey: config.anthropicApiKey });
        const response = await client.messages.create({
            model: targetModel,
            max_tokens: 2048,
            messages: [
                {
                    role: "user",
                    content: `${prompt}\n\nIMPORTANT: Respond ONLY with valid raw JSON without markdown markers or extra text.`,
                },
            ],
        });

        const text = response.content[0]?.text || "";
        return parseJSONResponse(text, "Anthropic");
    }

    throw new Error(
        `Unsupported AI provider: ${provider}. Supported providers: gemini, openai, anthropic.`,
    );
}

function parseJSONResponse(rawText, providerName) {
    if (!rawText?.trim()) {
        throw new Error(`${providerName} returned an empty response.`);
    }

    // Strip markdown code fences if present (e.g. ```json ... ```)
    const cleaned = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        console.error(`${providerName} returned invalid JSON:`);
        console.error(rawText);
        throw new Error(`${providerName} returned invalid JSON output.`);
    }
}
