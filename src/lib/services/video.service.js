import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_BGM_VOLUME } from "../../constants/audio.js";
import { config } from "../config.js";
import {
    checkpointScene,
    completeJob,
    createJob,
    failJob,
    getJob,
    pauseJobQuota,
    saveScenePlan,
} from "../db/repositories/job.repository.js";
import { saveVideo } from "../db/repositories/video.repository.js";
import { getAudioDuration } from "../utils/ffmpeg.js";
import {
    cleanupTemp,
    downloadAsset,
    ensureDirectories,
} from "../utils/files.js";
import { analyzeScript } from "./ai/analyzeScript.js";
import { selectBestAsset } from "./ai/selectAsset.js";
import { synthesizeSceneVisual } from "./ai/synthesizeSceneVisual.js";
import { animationModeFor } from "./animation/flags.js";
import { resolveBgmTrack } from "./audio/bgm.service.js";
import { createCaptions } from "./captions/createCaptions.js";
import { createSrt } from "./captions/createSrt.js";
import { combineScenes } from "./renderer/combine.js";
import {
    renderImageScene,
    renderTextScene,
    renderVideoScene,
} from "./renderer/scenes.js";
import { searchAssets } from "./scraper/searchAssets.js";
import { generateVoice } from "./tts/tts.service.js";
import { resolveVoice } from "./tts/voices.js";

// ============================================================
// CREATE / RENDER INDIVIDUAL SCENE
// ============================================================

async function createScene(
    scene,
    index,
    {
        provider,
        model,
        voice,
        language = "en",
        geminiApiKeys,
        dimension = "vertical",
        visualEngine = "stock",
        excludeUrls = [],
        onProgress = () => {},
        progressStart = 20,
        progressEnd = 85,
        characterAnimation = false,
    } = {},
) {
    // Opt-in animated character-dialogue scene (ANIMATION_ENABLED + per job).
    // Any problem falls back to the normal visual path below.
    if (scene.visualType === "character") {
        // full-cartoon episode parts carry an already-validated dialogue
        if ((characterAnimation || scene.episode) && scene.dialogue) {
            const anim = await import("./animation/pipeline.js");
            const first = scene.episode
                ? scene.dialogue
                : anim.sanitizeCharacterDialogue(scene, { dimension });
            // episode parts get a second try without movement / Sheru
            const tries = first
                ? scene.episode
                    ? [first, anim.simplifyDialogue(first)]
                    : [first]
                : [];
            if (!tries.length)
                console.warn(
                    `[Animation] Character scene ${index} failed validation. Falling back to the normal visual.`,
                );
            for (const [k, dialogue] of tries.entries()) {
                try {
                    console.log(
                        `\n[Animation] Rendering character dialogue scene ${index}${k ? " (simplified retry)" : ""} (${dialogue.cast.join(" + ")}, ${dialogue.lines.length} lines, classic, voices only)...`,
                    );
                    const result = await anim.renderCharacterScene(
                        scene,
                        index,
                        {
                            dialogue,
                            dimension,
                            onProgress: (p) =>
                                onProgress(
                                    Math.round(
                                        progressStart +
                                            ((progressEnd - progressStart) *
                                                p) /
                                                100,
                                    ),
                                    `Animating cartoon scene ${index}...`,
                                    { currentScene: index },
                                ),
                        },
                    );
                    onProgress(progressEnd, `Scene ${index} rendered.`, {
                        currentScene: index,
                    });
                    return result;
                } catch (err) {
                    console.warn(
                        `[Animation] Character scene ${index}${k ? " (simplified)" : ""} failed (${err.message}).${k + 1 < tries.length ? " Retrying simplified." : " Falling back to the normal visual."}`,
                    );
                }
            }
        }
        scene = { ...scene, visualType: "video" };
    }

    console.log("\n=================================");
    console.log(`SCENE ${scene.id} (${dimension.toUpperCase()})`);
    console.log("=================================");
    console.log(`Narration: ${scene.narration}`);
    console.log(`Emotion: ${scene.emotion}`);
    console.log(`Visual type: ${scene.visualType}`);
    console.log(`Language: ${language}`);
    console.log(`Dimension: ${dimension}`);
    if (excludeUrls.length > 0) {
        console.log(
            `Excluding ${excludeUrls.length} previously used visual assets in this video.`,
        );
    }

    const audioPath = path.join(config.tempDir, `voice-${index}.mp3`);
    const timingsPath = path.join(config.tempDir, `timings-${index}.json`);

    console.log(`\nGenerating neural human voice (${voice})...`);
    await generateVoice(scene.narration, audioPath, voice, timingsPath);

    const duration = await getAudioDuration(audioPath);
    onProgress(
        Math.round(progressStart + (progressEnd - progressStart) * 0.2),
        `Voice generated for scene ${index}.`,
        { currentScene: index },
    );
    console.log(`Audio duration: ${duration.toFixed(2)} seconds`);

    // Read real sentence timings from Edge TTS (for perfect caption sync)
    let sentenceTimings = [];
    if (fs.existsSync(timingsPath)) {
        try {
            sentenceTimings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
            console.log(
                `Loaded ${sentenceTimings.length} sentence timings for sync`,
            );
        } catch (_e) {
            console.warn(
                "Could not parse timings file, using uniform captions",
            );
        }
    }

    const captions = createCaptions(scene.narration, duration, sentenceTimings);
    console.log("\nCaption timing:");
    console.log(JSON.stringify(captions, null, 2));

    const srtContent = createSrt(captions);
    const srtPath = path.join(config.tempDir, `scene-${index}.srt`);
    fs.writeFileSync(srtPath, srtContent, "utf8");

    const scenePath = path.join(config.tempDir, `scene-${index}.mp4`);

    if (scene.visualType === "text") {
        console.log(`\nRendering text scene (${dimension})...`);
        await renderTextScene(
            audioPath,
            scenePath,
            duration,
            scene.narration,
            language,
            dimension,
            String(index),
        );
        onProgress(progressEnd, `Scene ${index} rendered.`, {
            currentScene: index,
        });
        return {
            id: scene.id,
            path: scenePath,
            duration,
            captions,
            visualType: "text",
            narration: scene.narration,
            dimension,
            punchline: Boolean(scene.punchline),
            emotion: scene.emotion,
        };
    }

    let asset = null;
    let isVideo = false;
    let extension = "jpg";
    let inputPath = path.join(config.tempDir, `asset-${index}.${extension}`);

    if (visualEngine === "ai_realism") {
        // MODE 1: 100% AI Photorealistic Cinematic Visual Synthesis (Zero Mismatch)
        console.log(
            `\n[AI Realism Engine] Synthesizing custom 8K cinematic frame for Scene ${index}...`,
        );
        onProgress(
            Math.round(progressStart + (progressEnd - progressStart) * 0.55),
            `Synthesizing cinematic visual for scene ${index}...`,
            { currentScene: index },
        );

        try {
            const synthResult = await synthesizeSceneVisual(scene, inputPath, {
                dimension,
                seed: index * 1000 + (Date.now() % 10000),
            });

            asset = {
                type: "image",
                url: synthResult.path,
                source: "flux_synthesized",
                matchScore: 99,
                selectionReason: `Synthesized precision photorealistic frame: ${scene.visualBrief}`,
            };
            isVideo = false;
        } catch (synthErr) {
            console.warn(
                `[AI Realism Engine] Synthesis failed: ${synthErr.message}. Attempting stock search fallback...`,
            );
            // Fall back to stock search
            let searchResult = null;
            try {
                searchResult = await searchAssets(scene, {
                    dimension,
                    excludeUrls,
                });
            } catch (err) {
                console.warn(
                    `[Search] Stock fallback search failed: ${err.message}`,
                );
            }

            if (searchResult?.assets?.length) {
                asset = await selectBestAsset(scene, searchResult.assets, {
                    provider,
                    model,
                    geminiApiKeys,
                    excludeUrls,
                });
            }

            if (asset?.url) {
                isVideo = asset.type === "video" || asset.type === "gif";
                extension = isVideo ? "mp4" : "jpg";
                inputPath = path.join(
                    config.tempDir,
                    `asset-${index}.${extension}`,
                );
                await downloadAsset(asset.url, inputPath);
            } else {
                throw new Error(
                    `Could not synthesize visual or find fallback stock asset for scene ${scene.id}: ${synthErr.message}`,
                );
            }
        }
    } else {
        // MODE 2 / 3: Hybrid or Stock Video Search
        console.log(
            `\nSearching media assets (MongoDB Cache -> Pexels [${dimension}])...`,
        );
        let searchResult = null;
        try {
            searchResult = await searchAssets(scene, {
                dimension,
                excludeUrls,
            });
        } catch (err) {
            console.warn(`[Search] Stock search failed: ${err.message}`);
        }

        const hasStockAssets =
            searchResult &&
            Array.isArray(searchResult.assets) &&
            searchResult.assets.length > 0;

        if (hasStockAssets) {
            onProgress(
                Math.round(
                    progressStart + (progressEnd - progressStart) * 0.45,
                ),
                `Evaluating stock visual match for scene ${index}...`,
                { currentScene: index },
            );
            asset = await selectBestAsset(scene, searchResult.assets, {
                provider,
                model,
                geminiApiKeys,
                excludeUrls,
            });
        }

        const isLowMatch =
            !asset?.url ||
            (typeof asset.matchScore === "number" && asset.matchScore < 80);

        if (isLowMatch && visualEngine !== "stock") {
            console.log(
                `\n[Hybrid Fallback] Stock match score (${asset?.matchScore || 0}%) below threshold (80%). Synthesizing custom visual frame...`,
            );
            onProgress(
                Math.round(
                    progressStart + (progressEnd - progressStart) * 0.55,
                ),
                `Synthesizing custom visual for scene ${index}...`,
                { currentScene: index },
            );

            try {
                const synthResult = await synthesizeSceneVisual(
                    scene,
                    inputPath,
                    {
                        dimension,
                        seed: index * 1000 + (Date.now() % 10000),
                    },
                );

                asset = {
                    type: "image",
                    url: synthResult.path,
                    source: "flux_synthesized",
                    matchScore: 98,
                    selectionReason: `Synthesized precision visual frame: ${scene.visualBrief}`,
                };
                isVideo = false;
            } catch (synthErr) {
                console.warn(
                    `[Hybrid Fallback] Synthesis failed: ${synthErr.message}. ${asset?.url ? "Falling back to best stock asset." : "No fallback available."}`,
                );
                // If synthesis fails but we still have a stock URL (even low score), use it
                if (!asset?.url) {
                    throw new Error(
                        `No acceptable visual asset could be found or synthesized for scene ${scene.id}`,
                    );
                }
                // else: fall through to the stock asset download below
                isVideo = asset.type === "video" || asset.type === "gif";
                extension = isVideo ? "mp4" : "jpg";
                inputPath = path.join(
                    config.tempDir,
                    `asset-${index}.${extension}`,
                );
                await downloadAsset(asset.url, inputPath);
            }
        } else if (asset?.url) {
            onProgress(
                Math.round(progressStart + (progressEnd - progressStart) * 0.6),
                `Stock visual selected for scene ${index} (${asset.matchScore}% match).`,
                { currentScene: index },
            );
            console.log(
                `Selected stock asset type: ${asset.type} (${asset.matchScore}% match)`,
            );
            isVideo = asset.type === "video" || asset.type === "gif";
            extension = isVideo ? "mp4" : "jpg";
            inputPath = path.join(
                config.tempDir,
                `asset-${index}.${extension}`,
            );
            await downloadAsset(asset.url, inputPath);
        } else {
            throw new Error(
                `No acceptable visual asset could be found or synthesized for scene ${scene.id}`,
            );
        }
    }

    onProgress(
        Math.round(progressStart + (progressEnd - progressStart) * 0.7),
        `Rendering scene ${index} with motion...`,
        { currentScene: index },
    );

    const renderOptions = {
        onScreenHighlight: scene.onScreenHighlight,
        cameraShot: scene.cameraShot,
    };

    if (isVideo) {
        console.log(`\nRendering video scene (${dimension})...`);
        await renderVideoScene(
            inputPath,
            audioPath,
            scenePath,
            duration,
            captions,
            language,
            dimension,
            String(index),
            renderOptions,
        );
    } else {
        console.log(`\nRendering image scene (${dimension})...`);
        await renderImageScene(
            inputPath,
            audioPath,
            scenePath,
            duration,
            captions,
            language,
            dimension,
            String(index),
            renderOptions,
        );
    }

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    onProgress(progressEnd, `Scene ${index} rendered.`, {
        currentScene: index,
    });

    return {
        id: scene.id,
        path: scenePath,
        duration,
        captions,
        visualType: asset.type,
        assetUrl: asset.url,
        narration: scene.narration,
        dimension,
        visualBrief: scene.visualBrief,
        subject: scene.subject,
        environment: scene.environment,
        action: scene.action,
        cameraShot: scene.cameraShot,
        lightingMood: scene.lightingMood,
        onScreenHighlight: scene.onScreenHighlight,
        punchline: Boolean(scene.punchline),
        emotion: scene.emotion,
        matchScore: asset.matchScore || 85,
        selectionReason:
            asset.selectionReason || "Matched via directorial brief",
    };
}

// ============================================================
// MAIN RESUMABLE VIDEO GENERATION PIPELINE
// ============================================================

export async function generateVideo(script, options = {}) {
    const {
        jobId: requestedJobId,
        onProgress = () => {},
        provider = "gemini",
        model,
        language,
        gender = "male",
        voice,
        humanize = true,
        userId = null,
        geminiApiKeys = [],
        dimension = "vertical",
        visualEngine = "stock",
        bgmMood = "none",
        bgmVolume = DEFAULT_BGM_VOLUME,
        characterAnimation: characterAnimationOption,
        animationMode: animationModeOption,
    } = options;
    // opt-in animation (needs ANIMATION_ENABLED=true): "off" | "mix" (1-2
    // character scenes) | "full" (whole cartoon episode). Jobs that don't say
    // follow ANIMATION_PIPELINE_DEFAULT. Off → unchanged pipeline.
    let animationMode = animationModeFor({
        animationMode: animationModeOption,
        characterAnimation: characterAnimationOption,
    });

    const normDimension = ["horizontal", "landscape", "16:9"].includes(
        String(dimension || "")
            .toLowerCase()
            .trim(),
    )
        ? "horizontal"
        : "vertical";

    ensureDirectories();

    const jobId =
        requestedJobId ||
        `job-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    let existingJob = null;

    // Check if resuming an existing job
    if (requestedJobId) {
        existingJob = await getJob(requestedJobId);
        if (existingJob) {
            console.log(
                `\n[Pipeline] Resuming existing Job "${jobId}" (Status: ${existingJob.status}, Completed: ${existingJob.completedScenes?.length || 0} scenes)`,
            );
        }
    }

    // a resumed job keeps its own per-job choice
    if (
        existingJob &&
        characterAnimationOption === undefined &&
        animationModeOption === undefined
    ) {
        const saved =
            existingJob.options?.animationMode ||
            (existingJob.options?.characterAnimation ? "mix" : undefined);
        if (saved) animationMode = animationModeFor({ animationMode: saved });
    }
    const characterAnimation = animationMode === "mix";
    const fullCartoon = animationMode === "full";

    if (!existingJob) {
        await createJob({
            jobId,
            script,
            options: {
                provider,
                model,
                language,
                gender,
                voice,
                humanize,
                userId,
                geminiApiKeys,
                dimension: normDimension,
                visualEngine,
                bgmMood,
                bgmVolume,
                ...(characterAnimation ? { characterAnimation: true } : {}),
                ...(animationMode !== "off" ? { animationMode } : {}),
            },
        });
    }

    try {
        console.log("\n=================================");
        console.log("       AI VIDEO STUDIO (RESUMABLE)");
        console.log(`       Job ID: ${jobId}`);
        console.log(`       Provider: ${provider.toUpperCase()}`);
        console.log(
            `       Dimension: ${normDimension.toUpperCase()} (${normDimension === "horizontal" ? "16:9 1920x1080" : "9:16 1080x1920"})`,
        );
        if (model) console.log(`       Model: ${model}`);
        console.log("=================================\n");

        let scenes = existingJob?.scenePlan || [];
        let detectedLanguage =
            existingJob?.detectedLanguage || language || "en";
        let detectedMood = existingJob?.storylineMood || "inspirational";
        let selectedVoice = existingJob?.selectedVoice;
        let episodeMeta = existingJob?.episodeMeta || null;
        if (fullCartoon) console.log("       Mode: FULL CARTOON EPISODE");

        // Step 1 (full cartoon): the AI writes the whole episode
        if ((!scenes || scenes.length === 0) && fullCartoon) {
            console.log("STEP 1 — WRITING CARTOON EPISODE");
            onProgress(10, "Writing the cartoon episode...", { jobId });
            const ep = await import("./animation/episode.js");
            const written = await ep.writeEpisode(script, {
                provider,
                model,
                geminiApiKeys,
                dimension: normDimension,
            });
            scenes = ep.episodeScenes(written.episode, {
                dimension: normDimension,
            });
            detectedLanguage = "hi";
            detectedMood = written.episode.mood;
            selectedVoice = resolveVoice({
                voice,
                language: detectedLanguage,
                gender,
            });
            episodeMeta = {
                title: written.episode.title,
                source: written.source,
                provider: written.provider,
                guests: written.episode.guests.map((g) => ({
                    name: g.name,
                    role: g.role,
                })),
                parts: scenes.length,
                lines: scenes.reduce(
                    (a, sc) => a + sc.dialogue.lines.length,
                    0,
                ),
                errors: written.errors || [],
            };
            await saveScenePlan(jobId, {
                scenes,
                detectedLanguage,
                selectedVoice,
                storylineMood: detectedMood,
                episodeMeta,
            });
            onProgress(
                18,
                written.source === "template"
                    ? "AI episode unavailable — using the template episode."
                    : `Episode ready: ${episodeMeta.lines} lines${episodeMeta.guests.length ? `, guests: ${episodeMeta.guests.map((g) => g.name).join(", ")}` : ""}.`,
                { jobId },
            );
        }

        // Step 1: Script breakdown (skip if already analyzed in existing job)
        if (!scenes || scenes.length === 0) {
            console.log("STEP 1 — ANALYZING & HUMANIZING SCRIPT");
            onProgress(10, "Analyzing script & detecting language...", {
                jobId,
            });

            const analysis = await analyzeScript(script, {
                provider,
                model,
                language,
                humanize,
                geminiApiKeys,
                characterAnimation,
            });

            detectedLanguage = analysis.detectedLanguage || language || "en";
            detectedMood = analysis.storylineMood || "inspirational";
            selectedVoice = resolveVoice({
                voice,
                language: detectedLanguage,
                gender,
            });
            scenes = analysis.scenes;

            if (!Array.isArray(scenes) || scenes.length === 0) {
                throw new Error("AI returned 0 scenes.");
            }

            await saveScenePlan(jobId, {
                scenes,
                detectedLanguage,
                selectedVoice,
                storylineMood: detectedMood,
            });

            console.log(`Language detected: ${detectedLanguage}`);
            console.log(`Voice selected: ${selectedVoice}`);
            console.log(`Storyline mood detected: ${detectedMood}`);
        } else if (!selectedVoice) {
            selectedVoice = resolveVoice({
                voice,
                language: detectedLanguage,
                gender,
            });
        }

        onProgress(
            20,
            `${scenes.length} scenes ready in [${detectedLanguage}].`,
            { jobId },
        );

        // Step 2: Render Scenes (with checkpointing and disk verification)
        const sceneFiles = [];
        if (Array.isArray(existingJob?.completedScenes)) {
            for (const s of existingJob.completedScenes) {
                if (s?.path && fs.existsSync(s.path)) {
                    sceneFiles.push(s);
                } else {
                    console.log(
                        `[Pipeline] Scene ${s?.id || sceneFiles.length + 1} file missing on disk. Resuming render from this scene.`,
                    );
                    break;
                }
            }
        }
        const startIndex = sceneFiles.length;
        const usedAssetUrls = new Set(
            sceneFiles.map((s) => s.assetUrl).filter(Boolean),
        );

        if (startIndex > 0) {
            console.log(
                `[Pipeline] Keeping ${startIndex} validated scenes from disk. Resuming from Scene ${startIndex + 1}...`,
            );
        }

        for (let i = startIndex; i < scenes.length; i++) {
            const sceneProgress = 20 + Math.floor((i / scenes.length) * 65);
            const msg = `Rendering scene ${i + 1} of ${scenes.length}...`;
            onProgress(sceneProgress, msg, {
                jobId,
                currentScene: i + 1,
                totalScenes: scenes.length,
            });

            const sceneResult = await createScene(scenes[i], i + 1, {
                provider,
                model,
                voice: selectedVoice,
                language: detectedLanguage,
                geminiApiKeys,
                dimension: normDimension,
                visualEngine,
                characterAnimation,
                excludeUrls: Array.from(usedAssetUrls),
                onProgress,
                progressStart: 20 + Math.floor((i / scenes.length) * 65),
                progressEnd: 20 + Math.floor(((i + 1) / scenes.length) * 65),
            });

            sceneFiles.push(sceneResult);

            if (sceneResult?.assetUrl) {
                usedAssetUrls.add(sceneResult.assetUrl);
            }

            // Checkpoint scene progress to MongoDB
            await checkpointScene(jobId, {
                sceneIndex: i + 1,
                progress: sceneProgress,
                message: msg,
                sceneResult,
            });

            console.log(`\n✅ Scene ${scenes[i].id} completed & checkpointed.`);
        }

        // Step 3: Combine Scenes into final MP4 with storyline background audio
        const totalDuration = sceneFiles.reduce(
            (total, scene) => total + (scene.duration || 0),
            0,
        );

        const filename = `video-${Date.now()}.mp4`;
        const outputPath = path.join(config.outputDir, filename);

        // cartoon episodes are voices-only unless a music mood is picked
        const bgm = resolveBgmTrack({
            requestedMood: fullCartoon && bgmMood === "auto" ? "none" : bgmMood,
            detectedMood,
            volume: bgmVolume,
        });

        if (bgm) {
            console.log(
                `\n[Pipeline] Mixing storyline background audio: ${bgm.label} (${bgm.mood})`,
            );
            onProgress(
                92,
                `Mixing storyline background audio [${bgm.label}]...`,
                { jobId },
            );
        } else {
            console.log(`\n[Pipeline] Rendering video with voiceover only.`);
        }

        await combineScenes(sceneFiles, outputPath, {
            bgmPath: bgm?.trackPath || null,
            bgmVolume: bgm?.volume || DEFAULT_BGM_VOLUME,
            totalDuration,
        });

        // Step 4: Keep the final MP4 in the local output directory
        onProgress(95, "Saving video locally...", { jobId });
        const finalVideoUrl = `/videos/${filename}`;

        // Step 5: Save Video to MongoDB `videos` collection
        const savedVideo = await saveVideo({
            title: episodeMeta?.title || `${script.slice(0, 50).trim()}...`,
            script,
            language: detectedLanguage,
            voice: selectedVoice,
            duration: totalDuration,
            videoUrl: finalVideoUrl,
            filename,
            dimension: normDimension,
            scenes: sceneFiles,
            metadata: {
                aiProvider: provider,
                aiModel: model,
                dimension: normDimension,
                storage: "local",
                ...(animationMode !== "off" ? { animationMode } : {}),
                ...(episodeMeta ? { episode: episodeMeta } : {}),
                bgm: {
                    mood: bgm?.mood || "none",
                    label: bgm?.label || "None",
                    volume: bgm?.volume || 0,
                },
            },
            userId,
        });

        // Step 6: Mark Job as completed in MongoDB
        await completeJob(jobId, {
            videoId: savedVideo ? String(savedVideo._id) : null,
            videoUrl: finalVideoUrl,
            filename,
            duration: totalDuration,
        });

        // Cleanup temporary scene files on successful generation
        await cleanupTemp();

        console.log("\n=================================");
        console.log("       VIDEO CREATED & PERSISTED");
        console.log("=================================");
        console.log(`Job ID: ${jobId}`);
        console.log(`Video ID: ${savedVideo?._id || "local"}`);
        console.log(`Video URL: ${finalVideoUrl}`);
        console.log(`Dimension: ${normDimension}`);
        console.log("Storage: Local Storage");
        console.log(`Duration: ${totalDuration.toFixed(2)} seconds`);

        return {
            jobId,
            videoId: savedVideo ? String(savedVideo._id) : null,
            filename,
            videoUrl: finalVideoUrl,
            duration: totalDuration,
            dimension: normDimension,
            language: detectedLanguage,
            voice: selectedVoice,
            scenes: sceneFiles,
            storage: "local",
            animationMode,
            ...(episodeMeta ? { episode: episodeMeta } : {}),
        };
    } catch (error) {
        const errorMsg = error.message || String(error);
        const lowerErr = errorMsg.toLowerCase();
        const isQuotaOrHighDemand =
            error.status === 429 ||
            error.status === 503 ||
            errorMsg.includes("429") ||
            errorMsg.includes("503") ||
            lowerErr.includes("quota") ||
            lowerErr.includes("rate limit") ||
            lowerErr.includes("resource_exhausted") ||
            lowerErr.includes("overloaded") ||
            lowerErr.includes("high demand") ||
            lowerErr.includes("unavailable");

        if (isQuotaOrHighDemand) {
            console.warn(
                `[Pipeline] Quota / high-demand limit reached on Job "${jobId}". Checkpointing state for resume.`,
            );
            await pauseJobQuota(jobId, {
                error: errorMsg,
                retryAfterSeconds: 30,
            });
            error.jobId = jobId;
            error.canResume = true;
        } else {
            await failJob(jobId, errorMsg);
        }

        throw error;
    }
}
