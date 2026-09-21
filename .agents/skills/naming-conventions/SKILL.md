---
name: naming-conventions
description: "Enforces camelCase for product files and folders, with exceptions for Next.js App Router names, kebab URL segments, shadcn shims, Expo Router, agent skill folders, and .artifacts/. Use when creating new files or folders, deciding where to put something, or naming any new component, hook, service, or utility."
---

# Naming Conventions

## Default Rule — camelCase Everywhere

All file and folder names use camelCase.

| Correct | Incorrect | Why |
|---|---|---|
| `userProfile.tsx` | `UserProfile.tsx` | PascalCase is for exports, not filenames |
| `authService.ts` | `auth-service.ts` | kebab-case not used |
| `useMediaQuery.ts` | `use_media_query.ts` | snake_case not used |
| `apiActions/` | `api-actions/` | folders also camelCase |
| `userProvider.tsx` | `UserProvider.tsx` | even providers are camelCase filenames |

## Framework Exceptions

These are framework-mandated — the framework requires these exact names. Exempt from camelCase.

**Next.js App Router:**
```
page.tsx        layout.tsx      loading.tsx
error.tsx       route.ts        middleware.ts
not-found.tsx   template.tsx    default.tsx
(auth)/         (app)/          ← route groups (parentheses required)
[id]/           [...slug]/      ← dynamic / catch-all segments
```

**Next.js URL folders** (public path segments) may be kebab-case when the URL is multi-word (`question-bank/`, `webhook-logs/`). Files **inside** those folders stay camelCase (`libraryBanksGrid.tsx`). Product `hooks/` / `actions/` / `lib/` stay camelCase.

**shadcn shims:** generated kebab files (e.g. `hooks/use-mobile.ts`) may stay as the registry left them. New product hooks are still `useMobile.ts`.

**Expo Router:**
```
_layout.tsx          ← stack/tab layout definition
(auth)/              ← route group (parentheses required)
(app)/               ← route group
[id].tsx             ← dynamic segment (brackets required)
[...slug].tsx        ← catch-all segment
+not-found.tsx       ← 404 page
```

## `.artifacts/` Exception

All files inside `.artifacts/` use **ALL_CAPS_SNAKE_CASE**.

## Agent Skills Exception

Skill folders inside `~/.agents/skills/` use **kebab-case** — matches installed skills (`grill-me/`, `find-skills/`). Also kebab: Next **URL** folders (`question-bank/`) and leftover shadcn shims. Product `actions/` / `hooks/` / `lib/` stay camelCase.

```
.artifacts/
├── general/guides/AGENT_SKILLS_OVERVIEW.md        ✓
├── features/auth/guides/PRD_AUTH_FLOW.md           ✓
├── database/schema/MASTER_DB_SCHEMA.md             ✓
└── general/AUTH_FLOW.excalidraw                    ✓
```

**Incorrect inside `.artifacts/`:**
```
.artifacts/features/auth/guides/authFlowPrd.md     ✗  (camelCase)
.artifacts/features/auth/guides/auth-flow-prd.md   ✗  (kebab-case)
```

> See `dev-artifacts` skill for the full `.artifacts/` folder structure and placement rules.

## Quick Decision

```
New file? → camelCase
  Exception: Next/Expo framework file or route group? → required name
  Exception: Next public URL folder (multi-word)? → kebab-case folder, camelCase files inside
  Exception: shadcn-generated shim? → leave registry name
  Exception: inside .artifacts/? → ALL_CAPS_SNAKE_CASE
  Exception: ~/.agents/skills/? → kebab-case folder
```
