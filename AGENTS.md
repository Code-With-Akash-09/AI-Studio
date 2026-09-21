# Agents workspace

Agents must **not** wait for the user to type “use skill X”. If the task matches a skill below, **read and follow** that skill’s `SKILL.md` without being asked.

---

## Universal (apply whenever the situation matches)

| When | Follow |
|------|--------|
| Every assistant reply (style, modes, `stop caveman` / `normal mode`) | [skills/agent-terse/SKILL.md](skills/agent-terse/SKILL.md) |
| Before any read, edit, or patch of an **existing** file (path may have moved; user may have edited since last turn) | [skills/verify-file-location/SKILL.md](skills/verify-file-location/SKILL.md) — resolve path, **Read immediately before** `StrReplace` / `Write` |
| Before **creating or renaming** any file or folder | [skills/naming-conventions/SKILL.md](skills/naming-conventions/SKILL.md) |
| Before **creating or moving** anything under a project `.artifacts/` tree | [skills/dev-artifacts/SKILL.md](skills/dev-artifacts/SKILL.md) |
| After meaningful impl / phase complete — sync related `.artifacts/` (plans, status, refs); remind phase commit if plan has a checkpoint | [skills/artifacts-upkeep/SKILL.md](skills/artifacts-upkeep/SKILL.md) |
| When suggesting **commit messages**, `git add` groupings, or staging splits (plan commit checkpoints = scope hint only) | [skills/git-commit/SKILL.md](skills/git-commit/SKILL.md) |
| When writing a **code review** to disk as markdown under `.artifacts/` | [skills/code-review-artifacts/SKILL.md](skills/code-review-artifacts/SKILL.md) |
| Env files, credentials, Infisical, secrets, or config keys (no hardcoded secrets; `.env.example` only) | [skills/secrets-hygiene/SKILL.md](skills/secrets-hygiene/SKILL.md) |
| Recording architecture / product / data / security decisions (`.artifacts/decisions/`) | [skills/decision-records/SKILL.md](skills/decision-records/SKILL.md) |
| Before any product `.ts`/`.tsx` write (Next/React web: `app/`, `actions/`, `components/`, `hooks/`, `store/`, `providers/`, `services/`, `managers/`, app `lib/`, `types/`, `schemas/`) | [skills/app-code-standards/SKILL.md](skills/app-code-standards/SKILL.md) — **same-turn Read** of `project-structure` **SKILL + REFERENCE** + `code-style`; add `forms-standard` if form-shaped. Do not write first. Memory from a prior turn ≠ a Read. |

---

## This repo (`skills/` — agent skills)

| When | Follow |
|------|--------|
| Creating a skill, editing skill layout, or changing `SKILL.md` conventions | [skills/create-skill/SKILL.md](skills/create-skill/SKILL.md) |

---

## Application / product code

**Web product `.ts`/`.tsx` is not optional.** `app-code-standards` (Universal) already loads `project-structure` (SKILL + REFERENCE) + `code-style` (+ `forms-standard` when form-shaped). Do **not** skip them because the user did not name the skill, or because a nearby file is sloppy.

Pattern A `index.ts` owns I/O; `services/` = connect/send only; `lib/` = no I/O. Next `"use server"` files export async functions only (`return await …`). Client UI uses `use*.ts`; RSC / `route.ts` / cron import `index.ts`.

Load the rest of this table when files, stack, or the request match — not the whole list on every chat.

| Area | Skills (open the one that matches) |
|------|-------------------------------------|
| Next.js layout (actions, hooks, store, services, lib, types, routes) | [skills/project-structure/SKILL.md](skills/project-structure/SKILL.md) + [REFERENCE.md](skills/project-structure/REFERENCE.md) — required via `app-code-standards` for web product writes |
| API wire contract / versioning (`/api/vN`, envelopes, lists, idempotency) | [skills/api-contracts/SKILL.md](skills/api-contracts/SKILL.md) — **plus** `project-structure` for file placement; this skill = HTTP contract |
| Capability authorize + UI gates; multi-tenant scope from context (not client) | [skills/scoped-authz/SKILL.md](skills/scoped-authz/SKILL.md) |
| Audit events on writes / auth / operator actions (any tenancy model) | [skills/mutation-audit/SKILL.md](skills/mutation-audit/SKILL.md) |
| TS/React implementation style (exports, Tailwind scope, complexity) | [skills/code-style/SKILL.md](skills/code-style/SKILL.md) — required via `app-code-standards` for web product writes |
| Forms | [skills/forms-standard/SKILL.md](skills/forms-standard/SKILL.md) — required when the change is form-shaped (`<form`, RHF, field/`useState` for inputs) |
| Tailwind v4 / tokens / CVA / dark mode | [skills/tailwind/SKILL.md](skills/tailwind/SKILL.md) |
| shadcn / `components.json` / registry | [skills/shadcn/SKILL.md](skills/shadcn/SKILL.md) **plus** [skills/shadcn-standard/SKILL.md](skills/shadcn-standard/SKILL.md) — CLI/registry vs house `nativeButton` / compose; this skill wins on conflict |
| Web UI quality / redesign | [skills/ui-design-web/SKILL.md](skills/ui-design-web/SKILL.md) |
| React Native UI / RN conventions | [skills/react-native-ui/SKILL.md](skills/react-native-ui/SKILL.md), [skills/react-native-styling/SKILL.md](skills/react-native-styling/SKILL.md), [skills/ui-design-native/SKILL.md](skills/ui-design-native/SKILL.md) |
| Heavy TypeScript types | [skills/typescript-advanced-types/SKILL.md](skills/typescript-advanced-types/SKILL.md) |
| MongoDB connections / pools | [skills/mongodb-connection/SKILL.md](skills/mongodb-connection/SKILL.md) |
| One-shot `.scripts/<name>/` Mongo ops (backfill / heal / migrate) | [skills/write-script/SKILL.md](skills/write-script/SKILL.md) — prefer over `mongodb-connection` for CLI scripts |
| MongoDB **performance** / indexes / slow queries | [skills/mongodb-query-optimizer/SKILL.md](skills/mongodb-query-optimizer/SKILL.md) |
| MongoDB schema / data modeling | [skills/mongodb-schema-design/SKILL.md](skills/mongodb-schema-design/SKILL.md) |
| PRD → plan / phased implementation (each phase includes a **commit checkpoint**) | [skills/prd-workflow/SKILL.md](skills/prd-workflow/SKILL.md) |
| Excalidraw diagrams | [skills/excalidraw/SKILL.md](skills/excalidraw/SKILL.md) |
| Next.js devtools-style CLI inspection | [skills/next-browser/SKILL.md](skills/next-browser/SKILL.md) |
| Discover / install external skills (`pnpx skills …`) | [skills/find-skills/SKILL.md](skills/find-skills/SKILL.md) |
| Stress-test a plan or design | [skills/grill-me/SKILL.md](skills/grill-me/SKILL.md) |
| JS/TS codebase health, dead code, boundaries, change-set risk, security candidates | [skills/fallow/SKILL.md](skills/fallow/SKILL.md) |
| Expo SDK upgrades and related dependency fixes | [skills/upgrading-expo/SKILL.md](skills/upgrading-expo/SKILL.md) |

If two skills overlap, prefer the **more specific** one (e.g. `forms-standard` over generic React advice for a form task; `shadcn-standard` over upstream `shadcn` for `nativeButton` / Base compose; `api-contracts` **and** `project-structure` together for HTTP routes — contract vs placement; `write-script` over `mongodb-connection` for `.scripts` CLI). For mutations: `scoped-authz` (who/where) + `mutation-audit` (what was recorded) together when both apply. For phased work: `prd-workflow` checkpoints → `git-commit` (live suggestion) → `artifacts-upkeep`.