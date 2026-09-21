---
name: write-script
description: "Enforces one-shot Node ESM Mongo ops under `.scripts/<scriptName>/` — dry-run default, `--apply` writes, colocated `output/`, always-on action log, undo-ready rows. Use when writing or running a `.scripts` job, backfill, heal, migrate, CSV reconcile, import, or data-fix script; when the user says \"write a script\" or mentions `--apply`, `--undo`, `--verbose`, dry-run. Not for app MongoClient pools, schema design, or query-index work."
---

# Write Script

**Scope:** CLI one-shots under `.scripts/<scriptName>/index.mjs`. Not app services, Route Handlers, or Server Actions. Standalone — do **not** copy a prior project’s collection names, DB default, or `lib/` helpers.

Secrets → [secrets-hygiene](../secrets-hygiene/SKILL.md). Folders/files → [naming-conventions](../naming-conventions/SKILL.md) (`index.mjs` is the required entry). App `MongoClient` pools → `mongodb-connection` from `mongodb/agent-skills` if installed (this skill **overrides**: one-shots **must** `close()` in `finally`). Omit `output/` from staging ([git-commit](../git-commit/SKILL.md)).

Prefer `.scripts/lib/` already in **this** repo. Do not invent a second flag parser or output tree.

Details → [REFERENCE.md](REFERENCE.md). Env + flag combos → [references/runEnv.md](references/runEnv.md). Row / snapshot contract → [references/undoAndSnapshots.md](references/undoAndSnapshots.md). Skeleton → [EXAMPLES.md](EXAMPLES.md).

## Layout

One camelCase folder per job. Script id = folder name. Output lives **in that folder**.

```
.scripts/
  lib/                         ← shared harness; only once a second script needs it
  exampleHeal/
    index.mjs                  ← only entry
    helpers.mjs                ← optional, this job only
    data/                      ← optional CSV
    output/latest/             ← this run; previous latest/ archived beside it
```

## Env (before any run command)

Look at repo root for `.infisical.json`, `infisical.json`, or `.Infisical.json`.

- **Found** → Infisical only: `infisical run --env=<env> -- node .scripts/<name>/index.mjs …` (never `--env-file=.env.local`).
- **Missing** → ask **once**: Infisical (user will add config) vs `--env-file=.env.local`. Do not assume `.env.local`.

Flag combos → [runEnv.md](references/runEnv.md).

## Safety

Dry-run is default. `--apply` is the **only** write switch. `--undo` still needs `--apply`.

- Never `--apply` on first run; `--apply` / `--undo --apply` only after the user asks.
- `deleteMany` / drop / bulk `$unset` of real fields → confirm first.
- Every mutation row reversible. `actions.jsonl` **always**, appended **as each action happens** (crash-safe). End-only JSON is not enough for undo.
- Never log `MONGODB_URI`. Gitignore `.scripts/*/output/`.

Env vars: `MONGODB_URI` required. `MONGODB_DB_NAME` from env — this repo’s default if one exists, else require the var. Collections: this repo’s names; `--test` only if the repo already has that pattern.

## Logging

Silent loop = bug. Banner before connect. Phase start/finish. Progress: every batch **always**; every **100** rows default; `--verbose` / `-v` → every row. Summary last.

## Agent workflow

1. Reuse `.scripts/lib/` or an existing job folder
2. Create `.scripts/<scriptName>/index.mjs`; output via `import.meta.url` → `./output`
3. Resolve Infisical vs `.env.local` (ask once if no config). Dry-run first. `--apply` only if asked
4. `MongoClient.close()` in `finally`; `main().catch` → `process.exitCode = 1`

## Finish checklist

- [ ] Infisical run cmd, or one confirmation if no config file
- [ ] `.scripts/<camelCase>/index.mjs` + colocated `output/`
- [ ] Dry-run default; `--apply` only write switch; `--undo` from **jsonl** before archive
- [ ] Activity-named files (not a fixed set); `actions.jsonl` flushed per action
- [ ] Pretty JSON indent **4**, rewritten each batch; row `before`/`undo`; multi-step snapshots
- [ ] Progress default 100; `-v` every row; client closed; `output/` not staged
