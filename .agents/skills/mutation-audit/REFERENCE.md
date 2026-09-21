# Mutation Audit — Reference

## Plane routing (when the project has multiple)

| Plane | When | Typical helper |
|-------|------|----------------|
| Org / tenant | Data under a tenant or org scope | `recordAuditEvent` (or project equivalent) |
| Control / operator | Unscoped operator actions | `recordControlAudit` (or equivalent) |
| Auth | Login, logout, refresh, step-up, failures | Auth audit helpers that route to the right plane |

Use whatever names exist in the project — match siblings; do not invent a parallel API.

## Semantic action naming

- Dotted: `<domain>.<verb>` — e.g. `user.invite`, `marks.publish`, `tenant.suspend`
- Stable over time; renaming is a breaking audit-consumer change
- `objectRef` / `targetId` = entity id, never email / roll / business code

## Sanitize rules

Never place in `before` / `after` / `metadata`:

- Passwords, password hashes, OTP codes
- JWTs, session tokens, API keys, private keys
- Full file / blob bodies
- Large free-text fields (truncate or omit; store refs instead)

Prefer project `sanitizeAuditSummary` (or equivalent). If missing, strip known secret fields explicitly before logging.

## Auto-emit vs semantic

| Layer | Purpose |
|-------|---------|
| Auto-emit from repos | Low-level `{collection}.create\|update\|delete` |
| Semantic domain event | Product-readable “what happened” |

Both when the project supports auto-emit. Semantic alone if auto-emit is excluded for that collection.

## Skipping audit

Rare. Requires a [decision-records](../decision-records/SKILL.md) entry under `.artifacts/decisions/` explaining why. Never skip silently.
