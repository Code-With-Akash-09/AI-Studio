---
name: scoped-authz
description: Enforces fail-closed capability checks on the server plus matching UI gates, and when multi-tenant, tenant scope from auth context only via the data layer. Use when adding mutations, authorize/Can gates, roles, capabilities, tenant scoping, repositories, or control-plane vs tenant-plane data access.
---

# Scoped Authz

Capability authorize applies to **any** app with a catalogue. Tenant rules apply **when the project is multi-tenant**. Cross-link writes → [mutation-audit](../mutation-audit/SKILL.md).

Prefer the project's existing authz helpers / capability catalogue / repository factories when present — do not invent parallel stacks.

## Capabilities (always when catalogue exists)

### Server

- Gate mutating / sensitive work with the project's authorize helper **inside** the shared domain/service (same path REST + Server Actions).
- Capability strings from the catalogue only (`subject:action` style). Extend catalogue + role matrix + tests together — no ad-hoc strings.
- Absence = **deny** (fail-closed).
- Sensitive reads may need the same gate when siblings or the contract require it.
- Control/operator plane: use operator guards — do not reuse tenant capabilities there.

### UI

- Wrap mutating controls with the project's capability component/hook (`Can` / `useCan` or equivalent).
- UI capability string **must match** the server check — UI hide is not security.
- Prefer hide; use disabled only when the control must stay visible.
- Nav / settings entries follow existing capability patterns.

## Tenant isolation (multi-tenant projects only)

Skip this section for single-tenant apps.

1. **Data layer only** — tenant reads/writes via the project's repository/scoped data API; no raw driver in feature/domain/UI code.
2. **Fail closed** — missing tenant in context → error; never default to another tenant or skip the filter.
3. **Tenant from context** — from auth/session/host, **never** from body/query/form as source of truth. Reject writes whose tenant ≠ context.
4. **Stable entity ids** — prefixed/generated ids; never business keys (email, code) as primary ids when the project uses envelopes.
5. **Planes separate** — control/operator collections stay on control repos; no casual cross-tenant queries.

Also: caches, jobs, search, exports, AI payloads stay tenant-scoped; indexes lead with `tenantId` when that is the project convention.

## Finish checklist

- [ ] Mutating service calls authorize (or operator guard)
- [ ] Capability in catalogue (or catalogue + matrix updated)
- [ ] UI gates use the same capability string
- [ ] If multi-tenant: no raw driver; no trusted client `tenantId`; scoped repos only
