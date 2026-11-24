/**
 * Automated daily video (cron-friendly), in-process — no HTTP, no login.
 *
 *   node .scripts/animation/auto-episode.mjs --topic="Why honey never spoils"
 *   node .scripts/animation/auto-episode.mjs --topics-file=topics.txt   # next unused line
 *     [--user=<userId>] [--horizontal]
 *
 * Uses the server defaults from .env.local: with ANIMATION_ENABLED=true and
 * ANIMATION_PIPELINE_DEFAULT=full each topic becomes a full cartoon episode.
 * --topics-file keeps a "<file>.done" list so each topic is used once.
 * Example crontab (daily 9:00):
 *   0 9 * * * cd /path/to/ai-studio && node .scripts/animation/auto-episode.mjs --topics-file=topics.txt >> logs/auto.log 2>&1
 */
import fs from "node:fs";
import { closeDB, connectDB } from "../../src/lib/db/connection.js";
import { generateAutomatedVideo } from "../../src/lib/services/automation.service.js";

const args = process.argv.slice(2);
const opt = (k) =>
    (args.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);

let topic = opt("topic");
const file = opt("topics-file");
if (!topic && file) {
    const done = fs.existsSync(`${file}.done`)
        ? new Set(
              fs
                  .readFileSync(`${file}.done`, "utf8")
                  .split("\n")
                  .map((l) => l.trim()),
          )
        : new Set();
    topic = fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#") && !done.has(l));
    if (!topic) {
        console.log("[Automation] No unused topics left.");
        process.exit(0);
    }
}
if (!topic) {
    console.error('Usage: auto-episode.mjs --topic="..." | --topics-file=path');
    process.exit(1);
}

await connectDB();
try {
    const r = await generateAutomatedVideo({
        topic,
        ...(opt("user") ? { userId: opt("user") } : {}),
        ...(args.includes("--horizontal") ? { dimension: "horizontal" } : {}),
    });
    if (file) fs.appendFileSync(`${file}.done`, `${topic}\n`);
    console.log(
        `[Automation] Done: ${r.videoUrl} (${r.duration.toFixed(1)}s, mode ${r.animationMode}${r.episode ? `, episode ${r.episode.source}, guests ${r.episode.guests.map((g) => g.name).join(", ") || "none"}` : ""})`,
    );
    console.log(
        `RESULT ${JSON.stringify({ videoUrl: r.videoUrl, videoId: r.videoId, jobId: r.jobId, animationMode: r.animationMode, episode: r.episode })}`,
    );
} finally {
    await closeDB();
}
