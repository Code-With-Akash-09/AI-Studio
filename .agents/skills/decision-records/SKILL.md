---
name: decision-records
description: "Writes ADR-lite decision records under .artifacts/decisions/ as DECISION_YYYYMMDD_TITLE.md (optional entity subfolder). Use when recording an architecture, product, data-model, security, dependency, or workflow decision, or when the user says \"decision record\", \"ADR\", \"record the decision\", or \"log this decision\"."
---

# Decision Records

Placement/naming → [dev-artifacts](../dev-artifacts/SKILL.md). After related impl lands → [artifacts-upkeep](../artifacts-upkeep/SKILL.md). Durable choices from PRD/planning → often alongside [prd-workflow](../prd-workflow/SKILL.md).

## When to write

Any non-trivial choice a future maintainer would reverse-engineer from chat/PRs: architecture, product UX, workflow, data model, security, dependency, or implementation direction.

## Output path (`.artifacts/decisions/` only)

Dedicated parent so the decision trail stays searchable in one place.

| Scope | Directory |
|-------|-----------|
| Cross-cutting | `.artifacts/decisions/` |
| Clearly feature-scoped | `.artifacts/decisions/<entity>/` |

Create folders as needed. Do **not** put `DECISION_*` under `features/` or `general/analysis/`.

## Filename

```text
DECISION_YYYYMMDD_SHORT_TITLE.md
```

ALL_CAPS_SNAKE_CASE. Examples:

- `.artifacts/decisions/DECISION_20260805_PATH_API_VERSIONING.md`
- `.artifacts/decisions/auth/DECISION_20260805_SESSION_COOKIE_ONLY.md`

One file per decision. Supersede with a **new** file; mark the old Status as superseded — do not rewrite history.

## Template

```markdown
# Short title

- **Date:** YYYY-MM-DD
- **Status:** Accepted | Deferred | Superseded by `DECISION_YYYYMMDD_OTHER.md`
- **Actor:** Human | AI | Human + AI
- **Context:** Why this came up (1–3 sentences).
- **Decision:** What we chose (bullets OK).
- **Rationale:** Why this over alternatives.
- **Related:** code paths, ticket IDs, PRD/plan artifact paths
```

Also in [references/template.md](references/template.md).

## Rules of thumb

- Explicit user instructions → **Human** (unless framed as exploration).
- AI-chosen approaches that affect behavior/structure → **AI** or **Human + AI**.
- Keep entries short; deeper design → feature `guides/` / `analysis/` or [excalidraw](../excalidraw/SKILL.md).
