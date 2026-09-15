import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Resolves the optimal FFmpeg executable path across Windows, macOS, and Linux.
 * 1. Honors explicit FFMPEG_PATH environment variable if set and file exists.
 * 2. Uses bundled ffmpeg-static if binary exists on disk.
 * 3. Falls back to system FFmpeg binary available on PATH (ffmpeg / ffmpeg.exe).
 *
 * @returns {string} Executable path or command
 */
export function getFFmpegPath() {
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
        return process.env.FFMPEG_PATH;
    }

    try {
        const staticPath = require("ffmpeg-static");
        if (staticPath && fs.existsSync(staticPath)) {
            return staticPath;
        }
    } catch (_) {}

    return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

// ============================================================
// RUN FFMPEG
// ============================================================

export function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpegExecutable = getFFmpegPath();
        const proc = spawn(ffmpegExecutable, args);

        let errorOutput = "";

        proc.stderr.on("data", (data) => {
            const text = data.toString();
            errorOutput += text;
            console.log(text);
        });

        proc.on("error", reject);

        proc.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `FFmpeg exited with code ${code}\n\n${errorOutput.slice(-5000)}`,
                    ),
                );
            }
        });
    });
}

// ============================================================
// AUDIO DURATION
// ============================================================

export function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
        const ffmpegExecutable = getFFmpegPath();
        const proc = spawn(ffmpegExecutable, [
            "-i",
            audioPath,
            "-f",
            "null",
            "-",
        ]);

        let output = "";

        proc.stderr.on("data", (data) => {
            output += data.toString();
        });

        proc.on("error", reject);

        proc.on("close", () => {
            const match = output.match(/Duration: (\d+):(\d+):([\d.]+)/);

            if (!match) {
                reject(
                    new Error(
                        `Could not determine audio duration: ${audioPath}`,
                    ),
                );
                return;
            }

            const hours = Number(match[1]);
            const minutes = Number(match[2]);
            const seconds = Number(match[3]);

            resolve(hours * 3600 + minutes * 60 + seconds);
        });
    });
}
