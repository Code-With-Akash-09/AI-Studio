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
import { aiResult, script } from "./pipeline-seed-plan.mjs";

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
