---
name: prd-workflow
description: "Two-phase local PRD workflow — discovery interview to PRD, then PRD to phased implementation plan. All outputs go to .artifacts/. Use when planning a new feature, writing a PRD, creating an implementation plan, or when the user says \"write a PRD\", \"plan this feature\", \"document requirements\", or \"create an implementation plan\"."
---

# PRD Workflow

**Local-only — no GitHub issues or PRs. All outputs go to `.artifacts/`.**

## Phase 1 — Discovery & PRD

1. **Ask** for a detailed problem description + any solution ideas
2. **Explore the codebase** to validate assertions and understand the current architecture
3. **Interview relentlessly** using the grill-me pattern — one decision-tree branch at a time — until shared understanding is reached
4. **Sketch major modules** to build or modify; identify deep modules (small interface hiding large implementation — more testable, more AI-navigable)
5. **Quality gate** — every requirement must be concrete and measurable:
   - Never: "fast", "easy", "intuitive", "seamless", "better"
   - Always: "returns results within 200ms for 10k records", "achieves ≥85% Precision@10 in benchmark", "reduces error rate below 1%"
6. **Write PRD** using the schema in [REFERENCE.md](REFERENCE.md)
7. **Output:** `.artifacts/features/<entityName>/guides/PRD_<FEATURE_NAME>.md`

## Phase 2 — Phased Implementation Plan

1. **Identify durable architectural decisions** upfront — these stay stable across all phases:
   - Route structures / URL patterns
   - Database schema shape and key data models
   - Authentication / authorization approach
   - Third-party service boundaries
2. **Break into vertical slices** (tracer bullets) — each phase cuts through ALL layers end-to-end (schema + API + UI + tests). Never horizontal layer-by-layer.
3. **Present proposed phases** — for each: title, user stories covered, what to build, acceptance criteria, **commit checkpoint**
4. **Quiz the user:** does the granularity feel right? Too coarse / too fine? Merge or split?
5. **Finalize only after approval**
6. **Output:** `.artifacts/features/<entityName>/guides/IMPLEMENTATION_PLAN_<FEATURE_NAME>.md`
7. **Durable choices** made during planning → [decision-records](../decision-records/SKILL.md) under `.artifacts/decisions/`
8. **After a phase ships** → suggest commit via [git-commit](../git-commit/SKILL.md) (checkpoint = hint; live tree wins) → [artifacts-upkeep](../artifacts-upkeep/SKILL.md)

### Commit checkpoints (required on every phase)

- **Default:** one checkpoint at the end of each phase (after acceptance criteria pass).
- Split into 2+ checkpoints only if the phase has clearly independent shippable bits.
- Record: suggested subject hint, likely path buckets, “do not mix later-phase files.”
- Checkpoint is **planning guidance only** — at ship time always run [git-commit](../git-commit/SKILL.md) for exact `git add` / message from the working tree. Keep the checkpoint’s **staging boundary**; refine type/subject/paths as needed.

## Output Naming

```
.artifacts/features/auth/guides/PRD_SIGN_IN_FLOW.md
.artifacts/features/auth/guides/IMPLEMENTATION_PLAN_SIGN_IN_FLOW.md
.artifacts/features/notifications/guides/PRD_PUSH_NOTIFICATIONS.md
```

> Full PRD template and implementation plan template → see [REFERENCE.md](REFERENCE.md).
> Placement → [dev-artifacts](../dev-artifacts/SKILL.md). Interview pattern → [grill-me](../grill-me/SKILL.md).
