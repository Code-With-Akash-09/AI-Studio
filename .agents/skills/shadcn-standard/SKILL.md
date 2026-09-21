---
name: shadcn-standard
description: "House rules on top of the upstream shadcn skill. nativeButton={false} only when the rendered host is not a button. Use when composing shadcn Button, PopoverTrigger, DialogTrigger, asChild, render, nativeButton, Base vs Radix, components.json, or wrapping registry UI. Load with shadcn — this skill wins on conflict. Never patch gitignored skills/shadcn/."
---

# shadcn Standard

Delta over [shadcn](../shadcn/SKILL.md). **Read that skill this turn** (CLI, FieldGroup, `cn()`, Base vs Radix). This file = extra rules only. Conflict → **this skill wins**. Do not edit gitignored `skills/shadcn/` — `pnpx skills update` owns it.

## `nativeButton` (Base UI)

Set `nativeButton={false}` **only** when `render` / the host is **not** a `<button>` (`<a>`, `Link`, `<span>`, `InputGroupAddon`, …).

Do **not** set it when the host is still a button (`render={<Button />}`, `PopoverTrigger` + `Button`). That nests buttons or trips “expected a non-button”.

Need a native `<button>` without composing `Button`? `render={<button className={buttonVariants()} type="button" />}`.

**Incorrect** — flag on a button host:

```tsx
<PopoverTrigger render={<Button />} nativeButton={false}>
```

**Incorrect** — missing on a link host:

```tsx
<Button render={<a href="/docs" />}>Docs</Button>
```

**Correct:**

```tsx
<Button render={<a href="/docs" />} nativeButton={false}>
  Docs
</Button>
<PopoverTrigger render={<Button />}>Open</PopoverTrigger>
```

Radix uses `asChild`, not `nativeButton`.
