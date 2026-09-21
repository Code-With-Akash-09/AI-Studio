---
name: mutation-audit
description: Requires append-only audit events for data writes, auth/session/RBAC changes, and operator actions — with sanitized payloads and no secrets. Use when adding mutations, Server Actions, write APIs, auth changes, role changes, or operator/admin actions; independent of multi-tenancy.
---

# Mutation Audit

Applies whenever the project has (or should have) an audit store — **with or without** multi-tenancy. Authz/scope → [scoped-authz](../scoped-authz/SKILL.md). Secrets in payloads → [secrets-hygiene](../secrets-hygiene/SKILL.md).

Prefer existing audit helpers; do not invent a third store or custom inserts.

## When to emit

Any feature that **writes data**, changes **auth/session/roles**, or performs an **operator/admin** action. Reads, pure UI, and idempotent no-ops do not need new events.

If intentionally skipping audit → [decision-records](../decision-records/SKILL.md) with why. Silent skips forbidden.

## Baseline + semantic

1. Go through the project's data layer so auto-emit runs when the project supports it (`collection.create|update|delete` style).
2. **Still** add a rich semantic event for meaningful domain actions (`user.invite`, `role.create`, `settings.update`, …). Auto-emit alone is not enough for product/compliance readability.
3. High-churn / excluded collections: emit semantic events from the domain service when the action matters.

## Event shape (adapt to project helpers)

```typescript
// Tenant / org-scoped example
await recordAuditEvent(ctx, {
  action: "role.create", // dotted <domain>.<verb>
  objectType: "role",
  objectRef: doc._id, // entity id, not email/code
  before: sanitizeAuditSummary(previous),
  after: sanitizeAuditSummary(doc),
  reason: input.reason ?? null,
})
```

- Actor / request id / impersonation from context — do not forge.
- `before` / `after` / `metadata` via sanitize helpers only — **never** passwords, tokens, secrets, raw files, or huge free text.
- Operator/control plane: use the project's control audit helper with `action`, target type/id, reason, small non-secret metadata.

Details → [REFERENCE.md](REFERENCE.md).

## Non-negotiables

- Audit is **append-only** — never update/delete audit rows.
- Audit failure must **not** block the business write (follow existing swallow/report helpers).
- Emit in the **same** service function REST and Server Actions share — no fork.
- Ship audit in the **same change set** as the mutation when adding new write paths; cover the audit path in tests when practical.

## Finish checklist

- [ ] Write via data layer / repository
- [ ] Semantic audit helper called (tenant, control, or auth helper)
- [ ] Stable dotted `action`; entity id refs
- [ ] Payloads sanitized — no secrets
- [ ] Skip (if any) logged via decision-records
