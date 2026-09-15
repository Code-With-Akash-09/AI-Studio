import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

// ============================================================
// ENSURE DIRECTORIES
// ============================================================

export function ensureDirectories() {
    fs.mkdirSync(config.tempDir, { recursive: true });
    fs.mkdirSync(config.outputDir, { recursive: true });
}

// ============================================================
// CLEANUP TEMP
// ============================================================

export function cleanupTemp() {
    if (!fs.existsSync(config.tempDir)) return;

    try {
        const files = fs.readdirSync(config.tempDir);
        for (const file of files) {
            const filePath = path.join(config.tempDir, file);
            try {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            } catch (fileErr) {
                console.warn(
                    `[Cleanup] Skipped locked file ${file}: ${fileErr.message}`,
                );
            }
        }
    } catch (err) {
        console.warn(`[Cleanup] Failed to clean temp dir: ${err.message}`);
    }
}

// ============================================================
// DOWNLOAD ASSET
// ============================================================

export async function downloadAsset(url, filePath) {
    console.log("Downloading remote asset...");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Asset download failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    console.log("Temporary asset downloaded.");
}
