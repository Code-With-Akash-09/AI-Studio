---
name: code-review-artifacts
description: Writes terse, actionable code review findings to a markdown file under the project `.artifacts/` tree. Use when the user asks for a code review, diff review, review written to artifacts, or review saved as markdown; follow dev-artifacts for path and ALL_CAPS_SNAKE_CASE naming.
---

# Code Review Artifacts

## Role

Produce **one** review document per request. **Write the file** under project `.artifacts/`. Do **not** apply patches, run linters, or frame output as remote review-thread commentary.

## Placement and name

Follow [dev-artifacts/SKILL.md](../dev-artifacts/SKILL.md) and [REFERENCE.md](../dev-artifacts/REFERENCE.md): treat as **Explanation** → **`features/<entity>/analysis/`** when the diff is feature-scoped. Cross-cutting reviews → **`general/guides/`** (or `general/CODE_REVIEW_*.md` at `general/` root when matching one-off style like `UBIQUITOUS_LANGUAGE.md`). Filename **ALL_CAPS_SNAKE_CASE**, e.g. `CODE_REVIEW_AUTH_20260415.md`. Never place files directly under `features/` without an `entity` folder.

## Document shape

Optional top line: scope (branch, commit, paths reviewed). Then bullet list of findings — **one line per finding** unless Auto-Clarity applies.

**Finding line pattern:**

`L<line>: <problem>. <fix>.` or `path/to/file:L<line>: <problem>. <fix>.`  
For a range: `L88-L140: …`

**Severity (prefix when mixing severities):** `bug:` | `risk:` | `nit:` | `q:` — plain text labels (no emoji required).

**Keep:** exact line numbers, symbol names in backticks, concrete fix. **Drop:** hedging, throat-clearing, restating the diff line-by-line.

## Auto-Clarity

For **security/CVE-class** issues, **architecture** disagreements needing rationale, or **onboarding** context where the author needs the why: write a **short normal paragraph** for that finding, then continue terse one-liners for the rest.

## Boundaries

- Output is the artifact file only; user copies or shares it elsewhere if needed.
- Does not approve or request changes as a gate; does not run `git` writes.
