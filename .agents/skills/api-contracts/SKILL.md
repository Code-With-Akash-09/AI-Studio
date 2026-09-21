---
name: api-contracts
description: Enforces HTTP API wire contracts — path versioning (/api/vN), response envelopes, cursor pagination, optimistic concurrency, idempotency, and dual REST/Server Action paths. Use when adding or changing Route Handlers, Server Actions, API contracts, list endpoints, versioning, envelopes, or Idempotency-Key / ETag behavior.
---

# API Contracts

**Scope:** wire contract and versioning. File placement → [project-structure](../project-structure/SKILL.md). Prefer this skill over project-structure for contract/version work.

Details: [REFERENCE.md](REFERENCE.md).

## Versioning

- Path version: `/api/vN` (e.g. `/api/v1/...`).
- **Breaking** changes → `/api/v(N+1)`; additive changes stay on current `vN`.
- Payload `schemaVersion` (data-model evolution) is **independent** of URL version.

## Handlers

- Keep handlers thin; business logic in domain/services.
- Validate at the edge with Zod (shared schema modules).
- Prefer the project's existing handler factory and error helpers when present.
- Exceptions (SSE, OAuth redirects, webhooks, raw bytes): document why.

## Dual path

Server Actions and REST **must** reuse the same Zod schemas and service functions. Never fork validation or business rules in the action file.

## Lists

Prefer `{ items, page: { limit, nextCursor, total } }`. No bare arrays for new list endpoints unless the project contract documents an exception.

## Mutations

- Optimistic concurrency: `If-Match` / `expectedVersion`; echo `ETag` on writes.
- Unsafe side-effect POSTs: accept `Idempotency-Key`.
- Heavy / long work: `202` + `{ jobId, state, pollUrl }`.

## Envelope

Follow the project's existing response envelope when present. Default recommendation and error codes → [REFERENCE.md](REFERENCE.md).

## When finishing API work

- Match the project's API contract / OpenAPI if it exists.
- Intentional divergence → update the contract doc + a [decision-records](../decision-records/SKILL.md) entry.
