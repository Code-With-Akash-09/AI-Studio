---
name: artifacts-upkeep
description: "Keeps project .artifacts/ in sync after implementation — updates PRDs, plans, status, references, and diagrams that drifted from the code. Use when finishing a feature slice, closing a plan phase, code diverges from a PRD/plan, or the user says \"update the artifacts\", \"sync artifacts\", or \"keep docs current\"."
---

# Artifacts Upkeep

Placement/naming → [dev-artifacts](../dev-artifacts/SKILL.md). New architecture choices → [decision-records](../decision-records/SKILL.md). Plans/PRDs originated via [prd-workflow](../prd-workflow/SKILL.md).

## When to run

After meaningful code/schema/API/UI changes, or when finishing a phase / feature slice — **before** claiming done. Also when the user asks to sync artifacts.

## Process

1. **Find related artifacts** under the project `.artifacts/` tree for the entity/area:
   - `PRD_*`, `IMPLEMENTATION_PLAN_*`, `status/`, `references/`, `guides/`, `analysis/`, `.artifacts/decisions/` (`DECISION_*`), `.excalidraw`
2. **Diff intent vs code** — what the artifacts claim vs what shipped.
3. **Patch drifted files** (prefer update over new duplicates):
   - Plans → mark phases done / adjust remaining work / note scope cuts
   - References & guides → match current behavior, paths, APIs
   - Status → current state (done / blocked / next)
   - Diagrams → only if structure or flow actually changed ([excalidraw](../excalidraw/SKILL.md))
4. **Decisions** — if the change was a non-trivial choice not yet recorded → write a [decision-records](../decision-records/SKILL.md) entry.
5. **Commit checkpoint** — if the related `IMPLEMENTATION_PLAN_*` has a checkpoint for this phase: remind the user to get a live suggestion via [git-commit](../git-commit/SKILL.md) before starting the next phase (plan hint ≠ final `git add`/message).
6. **Do not** invent a full new artifact tree; touch only what is stale or missing for the change.

## Finish checklist

- [ ] Related `.artifacts/` files updated (or confirmed still accurate)
- [ ] Plan/status reflects shipped work
- [ ] New durable choices logged via decision-records when warranted
- [ ] If phase had a commit checkpoint: user prompted to run git-commit (or confirmed already committed)
- [ ] Brief note to user: which artifact paths changed
