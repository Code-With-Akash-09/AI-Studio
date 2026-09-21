---
name: code-style
description: "Mandatory TS/React product style: arrow functions, default export (unless multi-export), raw Tailwind outside components/ui, complexity ≤ 15, Server Action async+await, no default useMemo. Use before writing or editing any component, hook, page, action, or utility; when adding className; when a function grows branches. Required via app-code-standards — do not ship function UserCard or bg-primary outside shadcn."
---

# Code Style

**Load this turn** before writing product `.ts`/`.tsx`. Matching a sloppy existing file is not an exception.

## Arrow Functions & Exports

Always use arrow functions. Always use default exports unless a file exports multiple items.

```tsx
const UserCard = () => <div>...</div>
export default UserCard
```

**Incorrect:** `export function UserCard() { ... }`

Named exports are fine when the file exports multiple related items (`AuthProvider`, `withAuth`, `useAuthenticator`).

**Exception:** `components/ui/` is shadcn-managed — do not restyle or rewrite their exports.

## Tailwind Scope Boundary

Semantic tokens (`bg-primary`, `text-foreground`, `bg-card`) belong **only** inside `components/ui/`. All other code uses raw Tailwind (`bg-white`, `text-gray-900`, `bg-teal-700`).

> Tailwind v4 / `@theme` → [tailwind](../tailwind/SKILL.md). `cn()` / FieldGroup → [shadcn](../shadcn/SKILL.md). Base `nativeButton` → [shadcn-standard](../shadcn-standard/SKILL.md).

## React Compiler

When the project uses React Compiler: do **not** add `useMemo` / `useCallback` by default. Prefer `useEffectEvent`, `startTransition`, `useDeferredValue` only when needed.

## Server Actions

File-level `"use server"`: exported fns stay `async` and **`await`**. Do not drop `async` for Biome `useAwait`. Do not export consts/sync helpers — [project-structure REFERENCE](../project-structure/REFERENCE.md).

Keep the returned expression on the **same line** as `return` / `return await`. A newline after `return` is ASI (`undefined`). Formatters can glue `return` + `}` into `return }`.

## Complexity Budget

Keep cyclomatic complexity under 15 (Biome). ~10+ branches/loops in one fn → split helpers. SOLID: one job per fn. DRY: extract repeats — do not duplicate inline.
