import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";

const execFileAsync = promisify(execFile);

// Use ffmpeg-static binary; fall back to system ffmpeg if unavailable
const FFMPEG_BIN = ffmpegStatic || "ffmpeg";

const AIHORDE_API = "https://stablehorde.net/api/v2";
// Free anonymous key — override with AIHORDE_API_KEY env var for priority.
const AIHORDE_KEY = process.env.AIHORDE_API_KEY || "0000000000";

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(destPath);

        const request = client.get(url, { timeout: 60000 }, (response) => {
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                file.close();
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                return downloadFile(response.headers.location, destPath)
                    .then(resolve)
                    .catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                return reject(
                    new Error(
                        `Download failed with HTTP ${response.statusCode}`,
                    ),
                );
            }
            response.pipe(file);
            file.on("finish", () => file.close(resolve));
        });

        request.on("error", (err) => {
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(err);
        });
        request.on("timeout", () => {
            request.destroy();
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(new Error("Download timed out after 60 seconds"));
        });
    });
}

function postJson(url, payload, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
                apikey: AIHORDE_KEY,
                ...extraHeaders,
            },
            timeout: 30000,
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        return reject(
                            new Error(
                                `AI Horde API ${res.statusCode}: ${json?.message || data}`,
                            ),
                        );
                    }
                    resolve(json);
                } catch {
                    reject(new Error(`Invalid JSON: ${data}`));
                }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
        req.write(body);
        req.end();
    });
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method: "GET",
            headers: { apikey: AIHORDE_KEY },
            timeout: 15000,
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error(`Invalid JSON: ${data}`));
                }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
        req.end();
    });
}

// ─── Watermark Removal (ffmpeg crop) ─────────────────────────────────────────

/**
 * Use ffmpeg to paint over the Pollinations watermark badge at the top-left.
 * The badge is a dark rounded rectangle with white "pollinations.ai" text.
 * We cover it with a black filled box — the rest of the image is untouched.
 */
async function removePollinationsWatermark(inputPath) {
    if (!FFMPEG_BIN) {
        console.warn(
            "[Synthesis] ffmpeg not found — watermark removal skipped.",
        );
        return;
    }

    const outputPath = `${inputPath}.clean.jpg`;
    try {
        console.log(
            `[Synthesis] Running ffmpeg watermark removal on: ${inputPath}`,
        );
        console.log(`[Synthesis] Using ffmpeg binary: ${FFMPEG_BIN}`);

        // Pollinations badge can appear in any corner depending on the model/seed.
        // Cover all four corners (420x90px each) to guarantee no watermark survives.
        // iw/ih refer to the input image width/height via ffmpeg expressions.
        const { stdout, stderr } = await execFileAsync(FFMPEG_BIN, [
            "-y",
            "-i",
            inputPath,
            "-vf",
            [
                // Top-left
                "drawbox=x=0:y=0:w=420:h=90:color=black@1.0:t=fill",
                // Top-right
                "drawbox=x=iw-420:y=0:w=420:h=90:color=black@1.0:t=fill",
                // Bottom-left
                "drawbox=x=0:y=ih-90:w=420:h=90:color=black@1.0:t=fill",
                // Bottom-right
                "drawbox=x=iw-420:y=ih-90:w=420:h=90:color=black@1.0:t=fill",
            ].join(","),
            "-q:v",
            "1",
            outputPath,
        ]);

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) {
            throw new Error("ffmpeg produced empty output");
        }

        fs.renameSync(outputPath, inputPath);
        console.log(
            `[Synthesis] ✂️  Watermark blacked out (${fs.statSync(inputPath).size} bytes).`,
        );
    } catch (err) {
        console.warn(`[Synthesis] ⚠️  Watermark removal failed: ${err.message}`);
        if (fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch {}
        }
    }
}

// ─── Provider A: AI Horde (Flux.1-Schnell fp8) ───────────────────────────────

/**
 * Submit to AI Horde and poll until done.
 * Returns the Cloudflare R2 URL of the finished image (no watermark).
 */
async function generateViaAIHorde(prompt, negPrompt, width, height, signal) {
    const snap64 = (n) => Math.round(n / 64) * 64;
    const w = snap64(Math.min(width, 1024));
    const h = snap64(Math.min(height, 1024));

    const payload = {
        prompt: `${prompt} ### ${negPrompt}`,
        params: {
            sampler_name: "k_euler",
            cfg_scale: 1,
            steps: 4,
            width: w,
            height: h,
            n: 1,
            karras: false,
            hires_fix: false,
            post_processing: [],
        },
        models: ["Flux.1-Schnell fp8 (Compact)"],
        nsfw: false,
        censor_nsfw: true,
        trusted_workers: false,
        slow_workers: true,
        r2: true,
    };

    if (signal?.aborted) throw new Error("AI Horde cancelled");

    console.log("[AI Horde] Submitting request...");
    const submitRes = await postJson(`${AIHORDE_API}/generate/async`, payload);
    const jobId = submitRes.id;
    if (!jobId) {
        throw new Error(`Submission failed: ${JSON.stringify(submitRes)}`);
    }
    console.log(`[AI Horde] Job: ${jobId}`);

    // Adaptive polling — max 2 minutes for horde
    const maxWaitMs = 120000;
    const pollInterval = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        if (signal?.aborted) throw new Error("AI Horde cancelled");
        await new Promise((r) => setTimeout(r, pollInterval));
        if (signal?.aborted) throw new Error("AI Horde cancelled");

        const check = await getJson(`${AIHORDE_API}/generate/check/${jobId}`);
        console.log(
            `[AI Horde] Queue: ${check.queue_position ?? "?"} | done: ${check.done}`,
        );

        if (check.faulted) {
            throw new Error(`AI Horde job faulted: ${jobId}`);
        }
        if (check.done) {
            const result = await getJson(
                `${AIHORDE_API}/generate/status/${jobId}`,
            );
            const imgUrl = result?.generations?.[0]?.img;
            if (!imgUrl) {
                throw new Error(
                    `No image URL in result: ${JSON.stringify(result)}`,
                );
            }
            console.log("[AI Horde] ✅ Image ready.");
            return imgUrl;
        }
    }

    throw new Error(`AI Horde timed out after ${maxWaitMs / 1000}s`);
}

// ─── Provider B: Pollinations (fast fallback, watermark cropped) ──────────────

/**
 * Generate via Pollinations (fast, ~5-15s) and strip the watermark using ffmpeg.
 */
async function generateViaPollinations(
    prompt,
    negPrompt,
    width,
    height,
    destPath,
    signal,
) {
    if (signal?.aborted) throw new Error("Pollinations cancelled");

    // Use 'turbo' (SDXL Turbo) — fastest model, usually sub-10s
    const encodedPrompt = encodeURIComponent(
        `photorealistic documentary photography, ${prompt}`.slice(0, 400),
    );
    const encodedNeg = encodeURIComponent(negPrompt.slice(0, 200));
    const seed = Math.floor(Math.random() * 999999) + 1;
    const imageUrl = [
        `https://image.pollinations.ai/prompt/${encodedPrompt}`,
        `?width=${width}&height=${height}`,
        `&seed=${seed}&model=turbo`,
        `&nologo=true&nofeed=true&private=true&enhance=false`,
        `&negative_prompt=${encodedNeg}`,
    ].join("");

    const tmpPath = destPath.replace(/\.jpg$/, "-poll.jpg");
    console.log("[Pollinations] Downloading image...");
    await downloadFile(imageUrl, tmpPath);

    if (signal?.aborted) {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        throw new Error("Pollinations cancelled");
    }

    if (!fs.existsSync(tmpPath) || fs.statSync(tmpPath).size < 1024) {
        throw new Error("Pollinations returned empty/invalid image");
    }

    // Move to dest then strip the watermark region
    fs.renameSync(tmpPath, destPath);
    await removePollinationsWatermark(destPath);

    console.log("[Pollinations] ✅ Image ready (watermark removed).");
    return imageUrl;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Synthesizes a high-definition photorealistic visual frame for the given scene.
 *
 * Strategy:
 *   1. Both AI Horde (Flux.1-Schnell, zero watermark) and Pollinations (fast,
 *      watermark cropped) are started concurrently.
 *   2. Whichever finishes first wins; the other is cancelled.
 *   3. This guarantees fast delivery (~10-30s) while still preferring the
 *      higher-quality, truly watermark-free AI Horde result when available.
 *
 * @param {Object} scene
 * @param {string|Object} [outputPathOrOptions]
 * @param {Object} [options] - { dimension: "vertical"|"horizontal" }
 */
export async function synthesizeSceneVisual(
    scene,
    outputPathOrOptions,
    options = {},
) {
    // --- Resolve output path & options ---
    let targetPath = null;
    let effectiveOptions = options;

    if (
        typeof outputPathOrOptions === "object" &&
        outputPathOrOptions !== null
    ) {
        effectiveOptions = outputPathOrOptions;
    } else if (typeof outputPathOrOptions === "string") {
        targetPath = outputPathOrOptions;
    }

    if (!targetPath) {
        targetPath = path.join(
            os.tmpdir(),
            `synth-scene-${scene.id || Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        );
    }

    const { dimension = "vertical" } = effectiveOptions;
    const isVertical = dimension === "vertical" || dimension === "9:16";
    // Keep within bounds supported by both providers
    const width = isVertical ? 640 : 1024;
    const height = isVertical ? 1136 : 576;

    // --- Build prompts ---
    const promptParts = [
        scene.visualBrief || scene.narration,
        scene.subject ? `Focal subject: ${scene.subject}` : null,
        scene.environment ? `Setting: ${scene.environment}` : null,
        scene.cameraShot
            ? `${scene.cameraShot.replace(/_/g, " ")} shot`
            : "cinematic shot",
        scene.lightingMood
            ? `${scene.lightingMood.replace(/_/g, " ")} lighting`
            : "cinematic lighting",
        "photorealistic, 8K, hyperdetailed, documentary photography, Hasselblad 85mm f/1.4",
    ].filter(Boolean);

    const negParts = [
        ...(scene.negativeKeywords || []),
        "watermark",
        "logo",
        "text",
        "branding",
        "signature",
        "cartoon",
        "anime",
        "CGI",
        "illustration",
        "3D render",
        "blurry",
        "low quality",
        "border",
        "frame",
    ];

    const fullPrompt = promptParts.join(", ");
    const negPrompt = [...new Set(negParts)].join(", ");

    console.log(
        `\n[Synthesis] ▶ Scene ${scene.id || "?"} — "${fullPrompt.slice(0, 80)}..."`,
    );
    console.log(
        `[Synthesis] Dimensions: ${width}x${height} | Mode: race(AI_Horde ↔ Pollinations)`,
    );

    // --- Race both providers ---
    // We use a manual "first-resolved" race with AbortController signals.
    let settled = false;
    const controllers = [new AbortController(), new AbortController()];

    function makeRaceEntry(label, promise) {
        return promise.then(
            (result) => ({ label, result, error: null }),
            (error) => ({ label, result: null, error }),
        );
    }

    // Provider A: AI Horde — start immediately
    const hordePromise = makeRaceEntry(
        "ai_horde",
        generateViaAIHorde(
            fullPrompt,
            negPrompt,
            width,
            height,
            controllers[0].signal,
        ).then(async (imgUrl) => {
            if (settled) return null;
            console.log("[Synthesis] AI Horde won the race ✨");
            await downloadFile(imgUrl, targetPath);
            return {
                url: imgUrl,
                provider: "ai_horde_flux",
                source: "ai_synthesized",
            };
        }),
    );

    // Provider B: Pollinations — start after a 5s head start for AI Horde
    // (avoids burning Pollinations quota when AI Horde is fast)
    const pollinationsPromise = makeRaceEntry(
        "pollinations",
        new Promise((res, rej) => {
            setTimeout(async () => {
                if (controllers[1].signal.aborted) {
                    return rej(
                        new Error("Pollinations cancelled before start"),
                    );
                }
                try {
                    const url = await generateViaPollinations(
                        fullPrompt,
                        negPrompt,
                        width,
                        height,
                        targetPath,
                        controllers[1].signal,
                    );
                    if (settled) {
                        res(null);
                        return;
                    }
                    console.log("[Synthesis] Pollinations won the race 🚀");
                    res({
                        url,
                        provider: "pollinations_turbo",
                        source: "ai_synthesized_fallback",
                    });
                } catch (err) {
                    rej(err);
                }
            }, 5000);
        }),
    );

    // Manual first-settled race — returns first non-error result
    const result = await new Promise((resolve, reject) => {
        let errorCount = 0;
        const total = 2;

        function handleResult({ label, result, error }) {
            if (settled) return;
            if (result) {
                settled = true;
                // Cancel the other provider
                controllers.forEach((c) => {
                    c.abort();
                });
                resolve({ label, ...result });
            } else {
                console.warn(`[Synthesis] ${label} failed: ${error.message}`);
                errorCount++;
                if (errorCount === total) {
                    reject(
                        new Error(
                            `Both providers failed. Last: ${error.message}`,
                        ),
                    );
                }
            }
        }

        hordePromise.then(({ label, result, error }) => {
            if (result === null && settled) return; // cancelled after race was already won
            handleResult({ label, result, error });
        });
        pollinationsPromise.then(({ label, result, error }) => {
            if (result === null && settled) return; // cancelled after race was already won
            handleResult({ label, result, error });
        });
    });

    // Verify the output file
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size < 1024) {
        throw new Error(
            "Synthesis succeeded but output file is missing or empty.",
        );
    }

    const fileSize = fs.statSync(targetPath).size;
    console.log(
        `[Synthesis] ✅ Scene ${scene.id ?? "?"} complete — ${result.label} | ${fileSize} bytes\n`,
    );

    return {
        path: targetPath,
        url: result.url,
        prompt: fullPrompt,
        width,
        height,
        provider: result.provider,
        source: result.source,
    };
}
