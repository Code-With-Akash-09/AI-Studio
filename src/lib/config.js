import { join } from "node:path";
import { cwd } from "node:process";

// Ensure environment variables are loaded in standalone scripts / server
try {
    process.loadEnvFile(".env.local");
} catch {}
try {
    process.loadEnvFile(".env");
} catch {}

const PORT = Number(process.env.PORT) || 3000;

function parseCorsOrigin() {
    const raw = process.env.CORS_ORIGIN;
    if (!raw) {
        return [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            `http://localhost:${PORT}`,
        ];
    }
    if (raw.includes(",")) {
        return raw.split(",").map((o) => o.trim());
    }
    return raw;
}

const projectRoot = cwd();

export const config = {
    port: PORT,
    corsOrigin: parseCorsOrigin(),
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    pexelsApiKey: process.env.PEXELS_API_KEY || "",
    mongodbUri: process.env.MONGODB_URI || "",
    mongodbDbName: process.env.MONGODB_DB_NAME || "ai-studio",
    jwtAccessSecret:
        process.env.JWT_ACCESS_SECRET ||
        "ai_video_studio_jwt_access_secret_key_2026",
    jwtRefreshSecret:
        process.env.JWT_REFRESH_SECRET ||
        "ai_video_studio_jwt_refresh_secret_key_2026",
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "7d",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    outputDir: join(projectRoot, "public", "videos"),
    tempDir: join(projectRoot, "temp"),
};
