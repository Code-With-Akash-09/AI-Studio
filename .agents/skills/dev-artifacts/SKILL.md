---
name: dev-artifacts
description: "Governs the .artifacts/ folder — naming, placement, Diátaxis document type classification, and special types (ubiquitous language, excalidraw diagrams). Use when creating any development artifact: PRDs, plans, schemas, diagrams, checklists, guides, analysis docs, or glossaries. See REFERENCE.md for the full folder structure and all category definitions."
---

# Dev Artifacts

## Core Rules

- `.artifacts/` lives at the project root — git-ignored globally, per-project `.gitignore` entry needed
- All markdown files inside: **ALL_CAPS_SNAKE_CASE** (e.g. `PRD_AUTH_FLOW.md`)
- All `.excalidraw` diagram files: **ALL_CAPS_SNAKE_CASE** (e.g. `AUTH_FLOW.excalidraw`)

## Diátaxis → Folder Mapping

Before placing a file, classify its content type:

| Type | Purpose | Maps to |
|---|---|---|
| Tutorial | Step-by-step lesson for a newcomer | `guides/` |
| How-To Guide | Problem-solving steps for a specific task | `guides/` |
| Reference | Technical spec, API description, data model | `references/` |
| Explanation | Design rationale, trade-off analysis, discussion | `analysis/` |

## Quick Placement Decision

```
New artifact?
  ├── Decision record (ADR-lite)?
  │   → decisions/ | decisions/<entity>/
  ├── About the DB layer (schemas, queries, migrations)?
  │   → database/schema/ | database/queries/ | database/migration/
  ├── Cross-cutting (not tied to one feature)?
  │   → general/guides/ | general/patterns/ | general/checklists/
  └── Feature-specific?
      ├── ≥5 related files for this feature? → features/<entity>/<subEntity>/
      └── <5 files? → features/<entity>/guides|references|analysis|checklists|status|patterns/

Never place files directly in features/ without an entity subfolder.
```

## Special Document Types

**Ubiquitous Language** — generate when terms are overloaded or ambiguous across the codebase:
- Path: `.artifacts/general/UBIQUITOUS_LANGUAGE.md`
- Format: term tables per domain, aliases to avoid, flagged ambiguities, example dialogue between dev and domain expert

**Excalidraw diagrams** (generated via `excalidraw` skill):
- Feature-specific: `.artifacts/features/<entityName>/DIAGRAM_NAME.excalidraw`
- Cross-cutting: `.artifacts/general/DIAGRAM_NAME.excalidraw`

**Decision records** (via [decision-records](../decision-records/SKILL.md)):
- Cross-cutting: `.artifacts/decisions/DECISION_YYYYMMDD_TITLE.md`
- Feature-scoped: `.artifacts/decisions/<entity>/DECISION_YYYYMMDD_TITLE.md`

**Keep in sync** after impl → [artifacts-upkeep](../artifacts-upkeep/SKILL.md).

## Examples

```
.artifacts/
├── database/
│   ├── schema/MASTER_DB_SCHEMA.md
│   └── queries/ADMIN_QUERY_PLAN.md
├── api/
│   └── guides/API_INTEGRATION_GUIDE.md
├── decisions/
│   ├── DECISION_20260805_PATH_API_VERSIONING.md
│   └── auth/DECISION_20260805_SESSION_COOKIE_ONLY.md
├── features/
│   ├── auth/
│   │   ├── guides/PRD_AUTH_FLOW.md
│   │   ├── guides/IMPLEMENTATION_PLAN_AUTH.md
│   │   └── AUTH_FLOW.excalidraw
│   └── roadmap/
│       ├── aiGeneration/
│       │   └── AI_GENERATION_IMPLEMENTATION.md
│       └── quiz/
│           └── QUESTION_FLOW.md
└── general/
    ├── UBIQUITOUS_LANGUAGE.md
    ├── patterns/GENERIC_ERROR_BOUNDARY.md
    └── DB_ARCHITECTURE.excalidraw
```

> For the complete folder structure, all category definitions, and document-type descriptions → see [REFERENCE.md](REFERENCE.md).
