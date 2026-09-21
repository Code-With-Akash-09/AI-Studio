# PRD Workflow — Reference

## PRD Template

```markdown
# PRD: [Feature Name]

## Executive Summary

**Problem:** [1–2 sentences on the pain point from the user's perspective]

**Solution:** [1–2 sentences on the proposed fix]

**Success Criteria:**
- [Measurable KPI 1 — e.g. "Reduces sign-in time from 45s to under 10s"]
- [Measurable KPI 2]
- [Measurable KPI 3]

---

## User Experience & Functionality

### User Personas
- **[Persona name]:** [Who they are, their context, what they need]

### User Stories
1. As a [user type], I want [action] so that [benefit]
2. As a [user type], I want [action] so that [benefit]
(Be extensive — cover all edge cases and states)

### Acceptance Criteria
- [ ] [Specific, verifiable condition]
- [ ] [Specific, verifiable condition]

### Non-Goals
- [What we are explicitly NOT building in this iteration]

---

## Technical Specifications

### Architecture Overview
[Data flow and component interaction — which modules are involved and how they connect]

### Integration Points
- **API/DB:** [endpoints, collections, queries affected]
- **Auth:** [authentication/authorization approach]
- **Third-party:** [external services involved]

### Security & Privacy
[Data handling, access control, compliance considerations]

---

## AI System Requirements (if applicable)

### Tool Requirements
[What tools and APIs are needed]

### Evaluation Strategy
[How to measure output quality — benchmark, pass rate, precision target]

---

## Risks & Roadmap

### Phased Rollout
- **MVP:** [Core functionality]
- **v1.1:** [Enhancements]
- **v2.0:** [Future scope]

### Technical Risks
- [Risk: mitigation approach]
- [Risk: mitigation approach]
```

---

## Implementation Plan Template

```markdown
# Implementation Plan: [Feature Name]

> Source PRD: .artifacts/features/<entityName>/guides/PRD_<FEATURE_NAME>.md

## Architectural Decisions

Durable decisions that apply across all phases:

- **Routes:** [URL patterns and structure]
- **Schema:** [Database collections/tables affected]
- **Key models:** [TypeScript interfaces/types involved]
- **Auth boundary:** [Who can access what]
- **Service boundaries:** [External integrations]

---

## Phase 1: [Phase Title]

**User stories covered:** #1, #2

**What to build:**
[Concise description of the end-to-end behavior this phase delivers. Describe what the user experiences, not layer-by-layer implementation.]

**Acceptance criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

**Commit checkpoint** (after acceptance criteria pass):
- **Suggested subject hint:** `feat(scope): short imperative summary`
- **Likely paths:** `src/.../`, `src/.../` (buckets, not every file)
- **Boundary:** do not stage later-phase files if touched early
- **At ship time:** run [git-commit](../git-commit/SKILL.md) — checkpoint is a hint; live tree wins for exact paths/message

---

## Phase 2: [Phase Title]

**User stories covered:** #3, #4

**What to build:**
[...]

**Acceptance criteria:**
- [ ] [...]

**Commit checkpoint** (after acceptance criteria pass):
- **Suggested subject hint:** `add(scope): ...`
- **Likely paths:** `...`
- **Boundary:** ...
- **At ship time:** run git-commit skill
```

---

## Quality Checklist

**Requirements language — reject these, replace with measurables:**

| Vague ✗ | Measurable ✓ |
|---|---|
| "The search should be fast" | "Returns results within 200ms for a 10k record dataset" |
| "Easy to use" | "Achieves 100% Lighthouse Accessibility score" |
| "Relevant results" | "Achieves ≥85% Precision@10 in benchmark evaluation" |
| "Better performance" | "Reduces bundle size by ≥20% vs current baseline" |
| "Seamless experience" | "Error rate below 1% in production over 7-day window" |

**PRD review checklist before finalizing:**
- [ ] Every success criterion is measurable with a specific number
- [ ] Non-goals explicitly listed — scope is bounded
- [ ] User stories cover happy path, error states, and edge cases
- [ ] Acceptance criteria are verifiable (pass/fail, not subjective)
- [ ] Technical risks are identified with mitigation approaches
- [ ] AI system requirements included if any ML/AI component exists

**Implementation plan review before finalizing:**
- [ ] Each phase is a vertical slice (schema + API + UI + tests)
- [ ] No phase is purely horizontal (e.g. "just the DB layer")
- [ ] Durable architectural decisions documented upfront
- [ ] Each phase has a **commit checkpoint** (subject hint + likely paths + boundary)
- [ ] User has approved the phase breakdown and granularity
