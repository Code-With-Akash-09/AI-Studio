import { spawn } from "node:child_process";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPythonPath() {
    if (process.env.PYTHON_PATH) {
        return process.env.PYTHON_PATH;
    }

    const isWindows = process.platform === "win32";

    // Windows virtualenv location
    const winVenvExe = join(__dirname, "../../../../.venv/Scripts/python.exe");
    const winVenv = join(__dirname, "../../../../.venv/Scripts/python");
    if (fs.existsSync(winVenvExe)) return winVenvExe;
    if (fs.existsSync(winVenv)) return winVenv;

    // Unix / macOS virtualenv location
    const unixVenv = join(__dirname, "../../../../.venv/bin/python");
    if (fs.existsSync(unixVenv)) {
        return unixVenv;
    }

    // Windows standard binary name is "python", Unix is "python3"
    return isWindows ? "python" : "python3";
}

/**
 * Generate voice audio and optionally sentence timings.
 * @param {string} text - Narration text
 * @param {string} outputFile - Path to write audio (MP3)
 * @param {string} voice - Edge TTS voice name
 * @param {string|null} timingsFile - Path to write sentence timings JSON (optional)
 * @returns {Promise<void>}
 */
export function generateVoice(
    text,
    outputFile,
    voice = "en-US-ChristopherNeural",
    timingsFile = null,
) {
    return new Promise((resolve, reject) => {
        const pythonPath = getPythonPath();

        const args = [
            join(process.cwd(), "src/lib/services/tts/tts.py"),
            text,
            outputFile,
            voice,
        ];
        if (timingsFile) {
            args.push(timingsFile);
        }

        const python = spawn(pythonPath, args, {
            env: {
                ...process.env,
                PYTHONUTF8: "1",
                PYTHONIOENCODING: "utf-8",
            },
        });

        python.stdout.on("data", (data) => {
            console.log(data.toString().trim());
        });

        python.stderr.on("data", (data) => {
            console.error(data.toString());
        });

        python.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`TTS exited with code ${code}`));
            }
        });
    });
}
