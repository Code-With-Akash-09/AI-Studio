import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";

/**
 * Check if the local video storage directory is writable and accessible.
 * @returns {{ healthy: boolean, storagePath: string, totalFiles: number, totalSizeBytes: number, totalSizeMB: number }}
 */
export function getLocalStorageStatus() {
    try {
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }

        // Verify write permission by checking directory access
        fs.accessSync(config.outputDir, fs.constants.R_OK | fs.constants.W_OK);

        const files = fs.readdirSync(config.outputDir);
        let totalSizeBytes = 0;

        for (const file of files) {
            try {
                const stat = fs.statSync(path.join(config.outputDir, file));
                if (stat.isFile()) {
                    totalSizeBytes += stat.size;
                }
            } catch {
                // Ignore transient file stat errors
            }
        }

        return {
            healthy: true,
            storagePath: config.outputDir,
            totalFiles: files.length,
            totalSizeBytes,
            totalSizeMB: Math.round((totalSizeBytes / 1024 / 1024) * 10) / 10,
        };
    } catch (error) {
        console.error("[LocalStorage] Storage directory error:", error.message);
        return {
            healthy: false,
            storagePath: config.outputDir,
            totalFiles: 0,
            totalSizeBytes: 0,
            totalSizeMB: 0,
            error: error.message,
        };
    }
}

/**
 * Delete a local video file from public/videos.
 * @param {string} filename - The video file name (e.g. video-12345.mp4)
 * @returns {boolean} Whether the file was deleted
 */
export function deleteLocalVideo(filename) {
    if (!filename) return false;

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(config.outputDir, safeFilename);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(
                `[LocalStorage] Deleted local video file: ${safeFilename}`,
            );
            return true;
        }
        return false;
    } catch (error) {
        console.error(
            `[LocalStorage] Failed to delete file "${safeFilename}":`,
            error.message,
        );
        return false;
    }
}
