---
name: ui-design-web
description: High-end web UI design standards, redesign audit checklist, content rules, and web UX priorities for Next.js/React projects. Use when building new web pages, reviewing UI quality, redesigning existing pages, choosing fonts/colors/layout, or when UI looks generic or unprofessional. For React Native design rules → see ui-design-native skill.
---

# UI Design — Web

> React Native / iOS / Android design rules → see `ui-design-native` skill.

## High-End Design Standards

**Typography — never use these fonts:**
Inter, Roboto, Arial, Open Sans, Helvetica

**Use instead:** Geist, Clash Display, Plus Jakarta Sans, Outfit, Cabinet Grotesk, Satoshi

**Color:**
- No pure `#000000` backgrounds → use off-black or tinted dark (`#0a0a0a`, dark navy)
- No oversaturated accents → keep saturation below 80%
- No purple/blue "AI gradient" fingerprint
- Tint shadows to match background hue — never raw `rgba(0,0,0,0.3)`
- No `box-shadow: shadow-md` generics

**Layout:**
- No symmetrical 3-column Bootstrap-style grids → use asymmetric bento, zig-zag, or editorial split
- Always `min-h-[100dvh]` not `h-screen` — prevents iOS Safari viewport jump
- Macro whitespace: `py-24` minimum for sections — layouts must breathe
- Consistent max-width: `max-w-6xl` or `max-w-7xl`

**Motion:**
- No `linear` or `ease-in-out` transitions → use custom cubic-bezier: `cubic-bezier(0.32, 0.72, 0, 1)`
- GPU-safe only: animate `transform` and `opacity` — never `top`, `left`, `width`, `height`
- `backdrop-blur` only on fixed/sticky elements — never on scrolling containers (continuous GPU repaint)
- Staggered list entrances: 30–50ms delay per item

## Redesign Audit — Apply in Priority Order

1. **Font swap** — biggest instant improvement, lowest risk
2. **Color cleanup** — remove clashing accents, fix `#000` backgrounds, eliminate AI gradient
3. **Hover + active states** — `scale(0.98)` on press, 200–300ms transitions, visible focus rings
4. **Layout + spacing** — break symmetry, `min-h-[100dvh]`, double the padding
5. **Replace generic components** — no equal 3-card feature rows, no generic card borders
6. **Add loading / empty / error states** — skeleton loaders, meaningful empty states, inline errors
7. **Typography polish** — body max 65 chars/line, `text-wrap: balance` on headings

## Content Rules

- No AI clichés: "Elevate", "Seamless", "Unleash", "Game-changer", "Next-Gen", "Delve", "Tapestry"
- No round fake numbers: `47.2%` not `50%`, `$99.00` not `$100.00`
- No Lorem Ipsum — write real draft copy, even if placeholder-quality
- Sentence case on all headers (not Title Case)
- Active voice: "We couldn't save your changes" not "Changes could not be saved"
- No exclamation marks in success/error messages — be confident, not loud

## Web UX Priorities

**1. Accessibility (CRITICAL)**
- Contrast ≥4.5:1 for body text, ≥3:1 for large text
- All images have descriptive alt text
- Full keyboard navigation — visible focus rings on all interactive elements
- `aria-label` on icon-only buttons
- Skip-to-main-content link for keyboard users
- Don't convey information by color alone

**2. Performance (HIGH)**
- WebP/AVIF images with `srcset`/`sizes`
- Lazy load below-the-fold images and components
- Reserve space for async content — CLS < 0.1
- Virtualize lists with 50+ items
- Debounce/throttle scroll, resize, and input events

**3. Animation (MEDIUM)**
- 150–300ms for micro-interactions, ≤400ms for complex transitions
- Ease-out for entering elements, ease-in for exiting
- Always respect `prefers-reduced-motion` — reduce or disable animations
- Scale feedback on press: `scale(0.98)` or `scale(0.95)` restoring on release

**4. Forms (MEDIUM)**
- Visible label per input — never placeholder-only labels
- Inline validation on blur (not keystroke)
- Error message below the related field — not only at the top
- Progressive disclosure for complex forms

**5. Navigation (HIGH)**
- Predictable back behavior — never silently reset the stack
- Breadcrumbs for 3+ level hierarchies
- Preserve scroll position and filter state on back navigation
- Active nav item visually highlighted
