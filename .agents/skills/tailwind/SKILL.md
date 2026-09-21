---
name: tailwind
description: Tailwind CSS v4 CSS-first configuration, OKLCH color tokens, CVA component variants, and dark mode setup. Use when configuring Tailwind v4, setting up design tokens, creating multi-variant components with CVA, implementing dark mode, or migrating from Tailwind v3.
---

# Tailwind v4

## Configuration

**`@theme` replaces `tailwind.config.ts`:**
```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.205 0 0);
  --color-primary-foreground: oklch(0.985 0 0);
  --color-muted: oklch(0.96 0.01 264);
  --color-muted-foreground: oklch(0.46 0.02 264);
  --color-destructive: oklch(0.53 0.22 27);
  --color-border: oklch(0.91 0.01 264);
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0.025 264);
  --radius-md: 0.375rem;
}

@custom-variant dark (&:where(.dark, .dark *));

.dark {
  --color-background: oklch(0.145 0.025 264);
  --color-foreground: oklch(0.985 0 0);
  --color-primary: oklch(0.985 0 0);
  --color-primary-foreground: oklch(0.145 0.025 264);
  --color-border: oklch(0.22 0.02 264);
}
```

| v3 | v4 |
|---|---|
| `tailwind.config.ts` | `@theme {}` in CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `darkMode: "class"` | `@custom-variant dark` |
| `theme.extend.colors` | `@theme { --color-*: value }` |
| plugins | `@utility` directives |

**Never use arbitrary values** — extend `@theme` instead:
```css
/* Correct */
@theme { --color-brand: oklch(0.65 0.15 240); }

/* Incorrect */
<div className="bg-[oklch(0.65_0.15_240)]">
```

## Color Tokens

Use **OKLCH** for perceptual uniformity: `oklch(lightness chroma hue)`.

**Alpha variants via `color-mix()`:**
```css
@theme {
  --color-primary-10: color-mix(in oklab, var(--color-primary) 10%, transparent);
  --color-primary-20: color-mix(in oklab, var(--color-primary) 20%, transparent);
}
```

**Dark mode:** use desaturated/lighter tonal variants — never invert light mode colors.

## Utilities

**`size-*` over `w-* h-*`** when dimensions are equal:
```tsx
/* Correct */ <Avatar className="size-10" />
/* Incorrect */ <Avatar className="w-10 h-10" />
```

**`@utility` for reusable custom utilities:**
```css
@utility text-gradient {
  @apply bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent;
}
```

## CVA — Component Variants

Use `class-variance-authority` for all multi-variant components:

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
)

export default Button
```

**Incorrect** — manual ternaries instead of CVA:
```tsx
// Never do this for multi-variant components
<button className={`base-classes ${variant === "outline" ? "border..." : "bg-..."}`}>
```

> Where tokens can be used (scope boundary) → `code-style` skill.
> For `cn()` and shadcn component patterns → `shadcn` skill.
