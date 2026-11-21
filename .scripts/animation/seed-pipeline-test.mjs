/**
 * Seeds a resumable pipeline job whose scene plan mixes normal scenes with an
 * animated character-dialogue scene, for end-to-end testing of the opt-in
 * animation step WITHOUT calling the AI (e.g. when the Gemini quota is used up).
 *
 *   node .scripts/animation/seed-pipeline-test.mjs [--user=<userId>] [--vertical]
 *
 * The plan goes through the real analyzeScript normalizer (normalizeAnalysis).
 * Then POST /api/generate { jobId, script, characterAnimation: true } resumes it.
 *
 * Safety: refuses to run unless MONGODB_DB_NAME is a separate test database
 * (name must contain "anim" or "test"), so it can never write to the live
 * pipeline's database.
 */
import { connectDB, closeDB, getDB } from "../../src/lib/db/connection.js";
import { config } from "../../src/lib/config.js";
import {
    createJob,
    saveScenePlan,
} from "../../src/lib/db/repositories/job.repository.js";
import { normalizeAnalysis } from "../../src/lib/services/ai/analyzeScript.js";
import { resolveVoice } from "../../src/lib/services/tts/voices.js";

const args = process.argv.slice(2);
const opt = (k) =>
    (args.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const dimension = args.includes("--horizontal") ? "horizontal" : "vertical";

if (!/anim|test/i.test(config.mongodbDbName)) {
    console.error(
        `Refusing to seed: MONGODB_DB_NAME must be a separate test DB (got a non-test name).`,
    );
    process.exit(1);
}

const script =
    "क्या आप जानते हैं कि उल्लू अपना सिर लगभग पूरा पीछे घुमा सकता है? रात को गोलू ने ये देखा तो उसे लगा कि ये कोई भूत है, लेकिन राज़ू ने उसे समझाया कि उल्लू की गर्दन में चौदह हड्डियाँ होती हैं, इसलिए वो इतना घूम पाता है। यानी ये भूत नहीं, विज्ञान है!";

// What the AI returns in character mode (same JSON shape as analyzeScript).
const aiResult = {
    detectedLanguage: "hi",
    narrativeTopic: "Owl neck rotation",
    storylineMood: "humorous",
    scenes: [
        {
            id: 1,
            narration: "क्या आप जानते हैं कि उल्लू अपना सिर लगभग पूरा पीछे घुमा सकता है?",
            visualBrief: "Close-up of an owl turning its head far around",
            subject: "owl",
            environment: "tree branch at dusk",
            action: "owl rotates its head",
            cameraShot: "close_up",
            lightingMood: "golden_hour",
            emotion: "curious",
            visualType: "video",
            searchQueries: ["owl turning head", "owl close up", "owl"],
            negativeKeywords: ["cartoon", "toy"],
            onScreenHighlight: "270°",
            punchline: false,
        },
        {
            id: 2,
            narration:
                "रात को गोलू ने ये देखा तो उसे लगा कि ये कोई भूत है, लेकिन राज़ू ने उसे समझाया कि उल्लू की गर्दन में चौदह हड्डियाँ होती हैं, इसलिए वो इतना घूम पाता है।",
            visualBrief: "Two kids talking about an owl at night",
            subject: "owl",
            environment: "old haveli at night",
            action: "kids discussing",
            cameraShot: "medium_shot",
            lightingMood: "dark_mysterious",
            emotion: "humorous",
            visualType: "character",
            searchQueries: ["owl at night", "owl eyes night"],
            negativeKeywords: ["cartoon"],
            onScreenHighlight: "14 हड्डियाँ",
            punchline: false,
            dialogue: {
                cast: ["Raazu", "Golu"],
                background: "haveli_night",
                lines: [
                    {
                        speaker: "Golu",
                        text: "राज़ू! उस उल्लू ने अपना सिर पूरा पीछे घुमा लिया, ये ज़रूर भूत है!",
                        expression: "scared",
                        pose: "scared",
                        listener: { expression: "curious", pose: "think" },
                        camera: "wide",
                        actions: [{ who: "golu", type: "hide", to: "raazu" }],
                    },
                    {
                        speaker: "Raazu",
                        text: "भूत नहीं गोलू, उल्लू की गर्दन में चौदह हड्डियाँ होती हैं।",
                        expression: "happy",
                        pose: "idle",
                        gesture: "explain",
                        listener: { expression: "scared", pose: "scared" },
                        camera: "wide",
                    },
                    {
                        speaker: "Raazu",
                        text: "इसीलिए वो अपना सिर इतना घुमा पाता है!",
                        expression: "happy",
                        pose: "point",
                        listener: { expression: "shocked", pose: "idle" },
                        beat: "humor",
                        reaction: {
                            expression: "shocked",
                            pose: "idle",
                            text: "वाह!",
                        },
                        camera: "wide",
                        // unsafe action on purpose: must be stripped
                        actions: [{ who: "golu", type: "jump", to: "raazu" }],
                    },
                ],
            },
        },
        {
            id: 3,
            narration: "यानी ये भूत नहीं, विज्ञान है!",
            visualBrief: "Bold text: science, not a ghost",
            subject: "text",
            environment: "",
            action: "",
            cameraShot: "medium_shot",
            lightingMood: "bright_natural",
            emotion: "humorous",
            visualType: "text",
            searchQueries: ["science"],
            negativeKeywords: [],
            onScreenHighlight: "विज्ञान!",
            punchline: true,
        },
    ],
};

const off = normalizeAnalysis(structuredClone(aiResult), {
    characterAnimation: false,
});
const on = normalizeAnalysis(structuredClone(aiResult), {
    characterAnimation: true,
});
console.log(
    "flag off → visualTypes:",
    off.scenes.map((s) => s.visualType).join(", "),
);
console.log(
    "flag on  → visualTypes:",
    on.scenes.map((s) => s.visualType).join(", "),
);

await connectDB();
const db = getDB();
if (!db || !/anim|test/i.test(db.databaseName)) {
    console.error("Not connected to the separate test DB; aborting.");
    process.exit(1);
}
const jobId = `job-animtest-${Date.now()}`;
await createJob({
    jobId,
    script,
    options: {
        provider: "openai",
        dimension,
        visualEngine: "stock",
        bgmMood: "none",
        characterAnimation: true,
        userId: opt("user") || null,
    },
});
await db
    .collection("jobs")
    .updateOne({ jobId }, { $set: { userId: opt("user") || null } });
await saveScenePlan(jobId, {
    scenes: on.scenes,
    detectedLanguage: "hi",
    selectedVoice: resolveVoice({ language: "hi", gender: "male" }),
    storylineMood: on.storylineMood,
});
console.log(`Seeded ${jobId} in the test DB (${on.scenes.length} scenes).`);
console.log(`JOB_ID=${jobId}`);
await closeDB();
