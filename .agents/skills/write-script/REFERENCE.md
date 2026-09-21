# Write Script — Reference

Repo-agnostic. Discover **this** project’s URI env name, DB name, collection names, and any `--test` suffix from existing code. Do not import helpers from another product.

Env + how to invoke + flag combos → [runEnv.md](references/runEnv.md).

## Header comment

Shebang + block: Match / Writes / Safety / How to run / Env / Flags / Output (paths **relative to this folder**; list **this job’s** activity files, not a generic set).

## Flags

| Flag | Meaning |
|---|---|
| *(none)* | dry-run (no writes) |
| `--apply` | write (plan or undo) |
| `--undo` | restore from a prior run’s `actions.jsonl` (fallback: activity JSON); still dry-run unless `--apply` |
| `--from PATH` | undo source run dir (default: `output/latest` **before** archive) |
| `--verbose` / `-v` | stdout after **every** row/action |
| `--limit N` | cap scanned docs |
| `--batch N` | bulkWrite size (default 500) |
| `--csv PATH` | override input CSV |
| `--test` | only if **this** repo already uses test collections |

Parse locally. `dryRun: !args.includes("--apply")`. `verbose` if `--verbose` or `-v`.

If you find a helper that **writes unless `--dry-run`**, do not reuse it.

## Output (colocated, activity-based)

`outputRoot = join(dirname(fileURLToPath(import.meta.url)), "output")`.

On start: if `output/latest/` exists, rename it to `output/<runId>/`. Then write the new `latest/`.

**Always** (every job):

| File | Purpose |
|---|---|
| `run.json` / `run.cmd` | meta + command — **never** the URI |
| `report.json` | counts, flags, collection names, `runId` — **no** row arrays |
| `actions.jsonl` | every planned/applied mutation, **append + flush per action** |

**Then** one camelCase file **per activity this script performs**. The list is not fixed. Name the file after the bucket, namespaced by the thing you looked for.

Find + update example:

| Activity | Files |
|---|---|
| lookup | `xyzFound.json` + `xyzFound.jsonl`, `xyzNotFound.json` + `xyzNotFound.jsonl` |
| update | `xyzUpdated.json` + `.jsonl` (undo contract on each row) |
| skip already-correct | `xyzSkipped.json` + `.jsonl` |

Other jobs add their own: `csvSame` / `csvDiff`, `inserted`, `deleted`, `invalidRow`, … Do not cram two activities into one file.

`snapshots/` only for multi-step jobs → [undoAndSnapshots.md](references/undoAndSnapshots.md).

Pretty JSON: `JSON.stringify(payload, null, 4)` + trailing newline.

`--undo`: load from `--from` or `output/latest` **first** (`actions.jsonl`, else the mutation activity JSON). Then archive and write a new `latest/`. Reverse apply order. Multi-step: reverse **step** order per row.

## Crash-safe writes (required)

End-only files are **not** enough. A crash mid-`--apply` would leave Mongo changed and pretty JSON empty → undo from a **previous dry-run is wrong** (plan may differ from what actually wrote).

1. Open `actions.jsonl` (and each activity `.jsonl`) at start; **append one line and flush** when the row is decided (dry-run plan **and** apply). Do this **before** `bulkWrite` so a mid-batch crash still has every pending row. Undo of a not-yet-written doc is a no-op if `undo` restores `before`.
2. Rewrite pretty `.json` snapshots (indent 4) **after every flushed batch** and on clean exit — convenience, not the undo source.
3. On crash: undo from **this run’s** `actions.jsonl` (partial is OK). Missing jsonl → do not guess from an old dry-run; say so and stop.

`main().catch`: still close the client; jsonl already on disk is the record.

## Progress

```js
const PROGRESS_EVERY = 100

const logProgress = (label, counts) => {
  console.log(
    `  [${label}] scanned=${counts.examined} updated=${counts.updated} unchanged=${counts.unchanged}`,
  )
}

if (flags.verbose || counts.examined % PROGRESS_EVERY === 0) logProgress("scan", counts)
logProgress("batch", counts) // after each flushed batch — always
```

Banner before any I/O. Errors → `console.error`.

## Shared lib

Put reusable harness in `.scripts/lib/` **in this repo** after the second script: `runOutput.mjs`, flag parse, `mustGetEnv`, `appendJsonl`, pretty-JSON rewrite. Job-specific helpers stay in the job folder.

Mongo: `new MongoClient(mustGetEnv("MONGODB_URI"))`, connect, work, `close()` in `finally`. Do not follow app-pool “never close”.

## Data files

Job CSV → `.scripts/<scriptName>/data/`. Shared CSV → `.scripts/data/`. Resolve from `import.meta.url`; allow `--csv PATH`.
