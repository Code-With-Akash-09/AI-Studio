---
name: project-structure
description: "Mandatory Next.js product layout: Pattern A actions own I/O, services are connect/send only, lib has no I/O, Zustand store is two files. Use before any new or moved .ts/.tsx under app/actions/hooks/store/providers/services/managers/lib/types/schemas; when asking where a file goes; when adding a page, action, hook, API route, or provider. Required via app-code-standards — do not write from memory."
---

# Project Structure

**Load this turn** before placing product files. Also read [REFERENCE.md](REFERENCE.md). Do not copy a nearby file’s wrong folder.

> Fills gaps in `~/.cursor/skills-cursor/nextjs-project-structure/SKILL.md` (components, routing). This skill = actions, store, services, lib, types.

## Where Does It Go?

| Kind | Place |
|---|---|
| App read/write/orchestrate (Mongo, auth flow, notify fan-out) | `actions/[domain]/[actionName]/` (A) or `actions/[domain].ts` (B) |
| Connect / SDK init / send-only (`getDb`, SES send, Slack post, Better Auth) | `services/` |
| Pure helper (no `getDb`, no `fetch`, no SDK send) | `lib/` |
| Shared TS shapes | `types/` |
| Shared zod (form + server parse) | `schemas/` |
| HTTP webhook / partner / cron entry | `app/api/.../route.ts` — **thin**: parse → call action |
| Shared client state (2+ components) | `store/index.ts` + `store/reducer.ts` only |
| Root data provider | `providers/` (Zustand, not `useState`+context) |
| Class with state across calls | `managers/` |
| UI hook, no network | `hooks/` |

TanStack installed → Pattern A. No TanStack → Pattern B (`"use server"` file).

## Ban

- Domain dumps at `actions/[domain]/*.ts` (`examLifecycle.ts`, `helpers.ts`, `types.ts`)
- Collection maps, queries, template compose, membership I/O in `services/`
- I/O in `lib/`
- Extra files in `store/` (dispatch helpers → `lib/`; fetch → action `use*`)
- Sibling `index.ts` that only re-exports another action — **own the function body**
- Logic in `route.ts` beyond parse/auth envelope (see [api-contracts](../api-contracts/SKILL.md))

## Pattern A (required details in REFERENCE)

Folder = `index.ts` + `use[ActionName].ts` only. Client UI imports the hook. RSC / `route.ts` / cron import `index.ts`. File-level `"use server"`: **exported** fns are `async` and `await`; no exported consts/sync helpers.

## Short rules

**`store/`:** `devtools(redux(reducer))` + immer `produce()`. No slices. Action `{ type: "SCREAMING_SNAKE_CASE", payload: unknown }`. Second Zustand store only if the domain is independent shared state.

**`providers/`:** Zustand only. Prefer server `initial*` props; Pattern A `use*` for client refetch. Do not block `children` on `user == null` if the layout already has the session.

**`hooks/`:** `useDebounce` ✓. `useFetchUser` ✗ → `actions/user/getUser/useGetUser.ts`.

**`services/`:** `mongodb/client.ts` (`getDb`), `auth` init, SES/Slack send. Callers use `getDb().collection("exams")` inside action `index.ts`.

**`managers/` vs `lib/` vs `services/`:** functions only → `lib/`. Connect → `services/`. Stateful singleton → `managers/`.
