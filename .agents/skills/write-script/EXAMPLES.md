# Write Script — Examples

Folder `.scripts/exampleHeal/`. How to invoke (Infisical vs `.env.local`) and flag combos → [runEnv.md](references/runEnv.md).

`--undo` reads `actions.jsonl` **before** archiving `latest/`. Append jsonl as you go; rewrite pretty JSON each batch.

```js
#!/usr/bin/env node
/**
 * Example heal — set status to "done" when eligible.
 *
 * Safety
 *   Dry-run default. --apply writes. --undo restores from actions.jsonl.
 *
 * How to run — see skill references/runEnv.md (Infisical or confirmed .env.local).
 *
 * Output (this job)
 *   ./output/latest/actions.jsonl          always, flushed per action
 *   ./output/latest/statusFound.json       lookup hits
 *   ./output/latest/statusNotFound.json    lookup misses (none in this toy filter)
 *   ./output/latest/statusUpdated.json     mutations (undo contract)
 *   ./output/latest/statusSkipped.json     already-correct
 *   ./output/latest/report.json            counts only
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { MongoClient } from "mongodb"

const SCRIPT = "exampleHeal"
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const OUTPUT_ROOT = join(SCRIPT_DIR, "output")
const PROGRESS_EVERY = 100
const DEFAULT_BATCH = 500

const parseFlags = argv => {
  const args = argv.slice(2)
  const apply = args.includes("--apply")
  const num = name => {
    const i = args.indexOf(name)
    if (i === -1) return null
    const n = Number.parseInt(args[i + 1] ?? "", 10)
    return Number.isNaN(n) ? null : n
  }
  const str = name => {
    const i = args.indexOf(name)
    return i === -1 ? null : (args[i + 1] ?? null)
  }
  return {
    apply,
    dryRun: !apply,
    undo: args.includes("--undo"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    from: str("--from"),
    limit: num("--limit"),
    batchSize: num("--batch") ?? DEFAULT_BATCH,
  }
}

const mustGetEnv = name => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

const formatRunId = (date = new Date()) =>
  date.toISOString().replace(/[:.]/g, "-").slice(0, 19)

const writeJson = (path, payload) => {
  writeFileSync(path, `${JSON.stringify(payload, null, 4)}\n`)
}

const appendJsonl = (path, row) => {
  appendFileSync(path, `${JSON.stringify(row)}\n`)
}

const readJsonl = path =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line))

const archiveLatest = () => {
  const latest = join(OUTPUT_ROOT, "latest")
  if (!existsSync(latest)) return
  let name = formatRunId()
  try {
    const meta = JSON.parse(readFileSync(join(latest, "run.json"), "utf8"))
    if (meta.startedAt) name = formatRunId(new Date(meta.startedAt))
  } catch {
    // use now
  }
  let dest = join(OUTPUT_ROOT, name)
  let n = 1
  while (existsSync(dest)) {
    dest = join(OUTPUT_ROOT, `${name}-${n}`)
    n += 1
  }
  renameSync(latest, dest)
}

const initRunOutput = flags => {
  mkdirSync(OUTPUT_ROOT, { recursive: true })
  archiveLatest()
  const runId = formatRunId()
  const runDir = join(OUTPUT_ROOT, "latest")
  mkdirSync(runDir, { recursive: true })
  writeJson(join(runDir, "run.json"), {
    runId,
    script: SCRIPT,
    startedAt: new Date().toISOString(),
    argv: process.argv.slice(2),
    dryRun: flags.dryRun,
    undo: flags.undo,
  })
  writeFileSync(join(runDir, "actions.jsonl"), "")
  return {
    runId,
    runDir,
    report: join(runDir, "report.json"),
    actions: join(runDir, "actions.jsonl"),
    found: join(runDir, "statusFound.json"),
    notFound: join(runDir, "statusNotFound.json"),
    updated: join(runDir, "statusUpdated.json"),
    skipped: join(runDir, "statusSkipped.json"),
    foundJsonl: join(runDir, "statusFound.jsonl"),
    notFoundJsonl: join(runDir, "statusNotFound.jsonl"),
    updatedJsonl: join(runDir, "statusUpdated.jsonl"),
    skippedJsonl: join(runDir, "statusSkipped.jsonl"),
  }
}

const loadUndoRows = flags => {
  const source = flags.from ?? join(OUTPUT_ROOT, "latest")
  const jsonl = join(source, "actions.jsonl")
  if (!existsSync(jsonl)) throw new Error(`No actions.jsonl in ${source} — cannot undo from a dry-run guess`)
  const rows = readJsonl(jsonl).filter(row => row.undo)
  if (rows.length === 0) throw new Error(`No undo rows in ${jsonl}`)
  return { source, rows }
}

const logProgress = (label, counts) => {
  console.log(
    `  [${label}] scanned=${counts.examined} updated=${counts.updated} unchanged=${counts.unchanged}`,
  )
}

const main = async () => {
  const flags = parseFlags(process.argv)
  const undoSource = flags.undo ? loadUndoRows(flags) : null
  const out = initRunOutput(flags)

  console.log(`${SCRIPT} ${flags.undo ? "undo " : ""}${flags.dryRun ? "dry-run" : "--apply"}`)
  console.log(`Run output: ${out.runDir}`)
  if (undoSource) console.log(`Undo from: ${undoSource.source}`)

  const client = new MongoClient(mustGetEnv("MONGODB_URI"))
  const dbName = process.env.MONGODB_DB_NAME
  if (!dbName) throw new Error("Missing env MONGODB_DB_NAME")

  try {
    console.log("Connecting…")
    await client.connect()
    const coll = client.db(dbName).collection("applications")

    const counts = { examined: 0, updated: 0, unchanged: 0 }
    const found = []
    const notFound = []
    const updated = []
    const skipped = []

    const snapshotPretty = () => {
      writeJson(out.found, { runId: out.runId, count: found.length, rows: found })
      writeJson(out.notFound, { runId: out.runId, count: notFound.length, rows: notFound })
      writeJson(out.updated, { runId: out.runId, count: updated.length, rows: updated })
      writeJson(out.skipped, { runId: out.runId, count: skipped.length, rows: skipped })
      writeJson(out.report, { runId: out.runId, script: SCRIPT, dryRun: flags.dryRun, counts })
    }

    const recordUpdated = row => {
      updated.push(row)
      appendJsonl(out.updatedJsonl, row)
      appendJsonl(out.actions, { ts: new Date().toISOString(), dryRun: flags.dryRun, ...row })
    }

    if (undoSource) {
      for (const row of [...undoSource.rows].reverse()) {
        counts.examined += 1
        counts.updated += 1
        recordUpdated(row)
        if (!flags.dryRun) {
          await coll.bulkWrite(
            [{ updateOne: { filter: row.undo.filter, update: { $set: row.undo.$set } } }],
            { ordered: false },
          )
        }
        if (flags.verbose || counts.examined % PROGRESS_EVERY === 0) logProgress("undo", counts)
      }
      snapshotPretty()
    } else {
      const cursor = coll.find(
        { status: { $ne: "done" } },
        { ...(flags.limit != null ? { limit: flags.limit } : {}) },
      )
      const pending = []
      for await (const doc of cursor) {
        counts.examined += 1
        const hit = { id: String(doc._id) }
        found.push(hit)
        appendJsonl(out.foundJsonl, hit)

        if (doc.status === "done") {
          counts.unchanged += 1
          const skip = { id: String(doc._id), reason: "already-correct" }
          skipped.push(skip)
          appendJsonl(out.skippedJsonl, skip)
        } else {
          const before = { status: doc.status }
          const after = { status: "done" }
          const row = {
            id: String(doc._id),
            collection: coll.collectionName,
            op: "updateOne",
            filter: { _id: doc._id },
            before,
            after,
            undo: { op: "updateOne", filter: { _id: doc._id }, $set: before },
          }
          counts.updated += 1
          recordUpdated(row)
          pending.push(row)
        }
        if (flags.verbose || counts.examined % PROGRESS_EVERY === 0) logProgress("scan", counts)
        if (pending.length >= flags.batchSize) {
          if (!flags.dryRun) {
            await coll.bulkWrite(
              pending.map(r => ({
                updateOne: { filter: r.filter, update: { $set: r.after } },
              })),
              { ordered: false },
            )
          }
          logProgress("batch", counts)
          snapshotPretty()
          pending.length = 0
        }
      }
      if (pending.length) {
        if (!flags.dryRun) {
          await coll.bulkWrite(
            pending.map(r => ({
              updateOne: { filter: r.filter, update: { $set: r.after } },
            })),
            { ordered: false },
          )
        }
        logProgress("batch", counts)
      }
      snapshotPretty()
    }

    console.log("\nSummary")
    console.log(`  scanned=${counts.examined} ${flags.dryRun ? "wouldUpdate" : "updated"}=${counts.updated}`)
    console.log(`Report: ${out.report}`)
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
```

`--apply` appends jsonl when the row is **planned** (before `bulkWrite`). Mid-batch crash → jsonl still has pending rows; undo restores `before` (no-op if the write never landed). Do **not** wait until process exit. Do **not** undo from an older dry-run folder.
