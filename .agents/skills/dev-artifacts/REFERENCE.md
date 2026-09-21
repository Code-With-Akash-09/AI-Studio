# Dev Artifacts — Reference

## Full Folder Structure

```
.artifacts/
├── database/
│   ├── schema/           ← collection/table definitions, indexes, validation rules
│   ├── queries/          ← server-side query plans and action mappings
│   └── migration/        ← migration scripts, backfill plans, sync analysis
│
├── api/
│   ├── guides/
│   ├── patterns/
│   └── checklists/
│
├── theme/
│   ├── guides/
│   ├── checklists/
│   ├── references/
│   ├── status/
│   └── analysis/
│
├── features/
│   └── <entityName>/     ← one folder per feature/entity
│       ├── guides/
│       ├── checklists/
│       ├── references/
│       ├── status/
│       ├── analysis/
│       └── patterns/
│       (or sub-entity grouping for large features:)
│       └── <subEntity>/
│
├── decisions/            ← ADR-lite decision records (see decision-records skill)
│   ├── DECISION_YYYYMMDD_TITLE.md
│   └── <entity>/         ← optional feature-scoped decisions
│       └── DECISION_YYYYMMDD_TITLE.md
│
└── general/
    ├── guides/
    ├── checklists/
    └── patterns/
```

## Category Definitions

**`database/`**
All database concerns: collection schemas, query/action plans, migration scripts, backfill analysis, sync strategies. NOT tied to a single feature — describes the data layer shared by the whole platform.

**`api/`**
API integration, endpoint patterns, and cross-feature implementation guides.

**`theme/`**
Theming, dark mode, styling guidelines, and color management.

**`features/`**
Feature-specific documentation, organized by entity/feature name. Each feature gets its own subfolder. Never place files directly in `features/` — always use an entity subfolder. Large features with many files may group further by sub-entity.

**`decisions/`**
ADR-lite decision records (`DECISION_YYYYMMDD_TITLE.md`). Cross-cutting entries live at the root of `decisions/`; clearly feature-scoped entries may use `decisions/<entity>/`. Do not scatter `DECISION_*` files under `features/` or `general/analysis/`. See the `decision-records` skill.

**`general/`**
Cross-cutting development guidelines, patterns, and best practices not tied to any single feature.

## Document Type Definitions

| Type | Purpose |
|---|---|
| `guides/` | Comprehensive implementation documentation |
| `patterns/` | Reusable code or UI patterns |
| `checklists/` | Task and progress tracking |
| `references/` | Quick reference materials |
| `status/` | Completion reports, changelogs, planned/future items |
| `analysis/` | Investigations, gap analyses, design discussions |
| `schema/` | Collection definitions and data models (under `database/`) |
| `queries/` | Query plans and server action mappings (under `database/`) |
| `migration/` | Migration scripts, backfill analysis, sync plans (under `database/`) |

## Placement Decision Guide

**Is it about the database layer?**
→ `database/schema/`, `database/queries/`, or `database/migration/`
→ Even if written during a specific feature's development — if the content is about the data model or DB operations, it belongs in `database/`

**Is it cross-cutting (not tied to one feature)?**
→ `general/guides/`, `general/patterns/`, or `general/checklists/`

**Is it feature-specific?**
→ `features/<entityName>/` using appropriate document-type subfolder
→ If the entity has ≥5 related files, consider grouping by sub-entity instead

**Never do:**
- Place a file in a folder just because the filename prefix matches the folder name
- Place a cross-platform DB schema under a single feature
- Put a future/planned item in `guides/` — use `status/` instead
- Put a reusable pattern in `guides/` — use `patterns/` instead
- Put an analysis or design discussion in `guides/` — use `analysis/` instead

## Naming Examples

| File | Correct path |
|---|---|
| Platform DB schema | `database/schema/MASTER_DB_SCHEMA.md` |
| Admin query plan | `database/queries/ADMIN_QUERY_PLAN.md` |
| User backfill analysis | `database/migration/USER_BACKFILL_AND_SYNC.md` |
| AI generation implementation | `features/roadmap/aiGeneration/AI_GENERATION_IMPLEMENTATION.md` |
| Quiz question flow | `features/roadmap/quiz/QUESTION_FLOW.md` |
| Mentor bookings plan | `features/mentors/guides/MENTOR_BOOKINGS_PLAN.md` |
| Category filter discussion | `features/mentors/analysis/CATEGORY_FILTER_DISCUSSION.md` |
| Notifications flow | `features/notifications/guides/NOTIFICATIONS_FLOW.md` |
| Reusable React pattern | `general/patterns/GENERIC_ERROR_BOUNDARY.md` |
| Domain glossary | `general/UBIQUITOUS_LANGUAGE.md` |
| Architecture diagram | `general/SYSTEM_ARCHITECTURE.excalidraw` |
| Feature flow diagram | `features/auth/AUTH_FLOW.excalidraw` |
