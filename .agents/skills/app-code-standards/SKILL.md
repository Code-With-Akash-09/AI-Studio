---
name: app-code-standards
description: "Mandatory pre-write gate for product TypeScript/React/Next.js code. Forces a same-turn Read of project-structure (SKILL + REFERENCE) and code-style before any .ts/.tsx Write or StrReplace, plus forms-standard when form-shaped and shadcn-standard when composing registry UI. Use when writing, editing, scaffolding, refactoring, remapping, or reviewing app/actions/components/hooks/store/providers/services/managers/lib/types/schemas code; when adding a page, component, hook, action, API route, form, Button, or nativeButton; never skip because the user did not name these skills."
---

# App Code Standards Gate

**Do not write product code first.** Guessing these rules from memory or a prior turn = fail. **Read the linked files this turn** before the first `Write` / `StrReplace` of application `.ts` / `.tsx`.

## Triggers (any one)

- New, edited, or **moved** `.ts` / `.tsx` under `app/`, `actions/`, `components/` (except `components/ui/`), `hooks/`, `store/`, `providers/`, `services/`, `managers/`, app `lib/`, `types/`, `schemas/`
- User asks for a page, component, hook, action, route, provider, store change, remap, or form
- Task is Next.js / React web product work (not this skills repo, not markdown-only)

## Same-turn reads (required)

1. [project-structure](../project-structure/SKILL.md) **and** [REFERENCE.md](../project-structure/REFERENCE.md) — placement, I/O boundaries, `"use server"`, Pattern A
2. [code-style](../code-style/SKILL.md) — arrow fns, default export, Tailwind token scope, complexity ≤ 15, async+await
3. [forms-standard](../forms-standard/SKILL.md) — **also** if any of: `<form`, `useForm`, `useFieldArray`, field/validation/submit, `useState` for inputs / loading / errors, “login/signup/settings form”
4. [shadcn-standard](../shadcn-standard/SKILL.md) — **also** if composing registry UI (`Button`, `nativeButton`, `asChild`, `render`, triggers). Still **Read** [shadcn](../shadcn/SKILL.md) this turn; house skill wins on conflict.

Then **follow them**. Do not “match existing sloppy file” when that file violates these skills.

## Skip only

| Skip this gate | Use instead |
|---|---|
| This `~/.agents` skills repo | `create-skill` / the matching skill |
| React Native / Expo UI | `react-native-ui` + `react-native-styling` + `ui-design-native` |
| shadcn-managed `components/ui/` | `shadcn` + `shadcn-standard` (do not restyle exports; do not patch gitignored `shadcn`) |
| Markdown / `.artifacts/` only | `dev-artifacts` / `artifacts-upkeep` |

HTTP envelope / `/api/vN` → still load this gate, **plus** [api-contracts](../api-contracts/SKILL.md).

## Finish

Before claiming done:

- Placement matches project-structure (I/O in action `index.ts`; `services/` connect/send only; `lib/` no I/O)
- `"use server"` files export async fns only; those fns `await`
- Client UI uses `use*.ts`; RSC / routes / cron use `index.ts`
- Style matches code-style
- Forms: RHF + zod + `zodResolver`, no form `useState`
