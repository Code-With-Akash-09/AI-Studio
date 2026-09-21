# API Contracts — Reference

## Default response envelope

Prefer the project's existing envelope when present. Recommended default:

```jsonc
// success
{ "error": false, "message": "ok", "data": { /* payload */ } }

// failure
{
  "error": true,
  "message": "Human-readable summary",
  "data": null,
  "code": "VALIDATION_ERROR",
  "details": [{ "field": "email", "issue": "invalid" }],
  "requestId": "req_…"
}
```

- Set HTTP status correctly (200/201/202/4xx/5xx); clients also read the envelope.
- Include `requestId` on every response when the project supports it.
- List payloads live in `data` (see pagination below).

## Pagination

**Cursor (default for large lists):** `?limit=30&cursor=<opaque>`

```jsonc
{ "items": [ … ], "page": { "limit": 30, "nextCursor": "crs_…|null", "total": 762 } }
```

- `total` may be best-effort/cached for huge collections.
- Offset pagination (`?page=1&pageSize=30`) only for small admin lists when the contract allows it.
- Filtering: explicit query params per endpoint; free-text via `?q=` when search exists.
- Sorting: `?sort=-createdAt` (`-` = desc); whitelist index-backed fields only.

Do **not** return a bare array for new list endpoints unless the project contract documents an exception.

## Common error codes

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 422 | Bad input / Zod failure |
| `UNAUTHENTICATED` | 401 | Missing/invalid session |
| `FORBIDDEN` / `OUT_OF_SCOPE` | 403 | Authz or scope failure |
| `NOT_FOUND` | 404 | Missing resource |
| `CONFLICT` / `DUPLICATE` | 409 | Unique / state conflict |
| `PRECONDITION_FAILED` | 412 | Version / `If-Match` mismatch |
| `RATE_LIMITED` | 429 | Throttle |
| `QUOTA_EXCEEDED` | 429 | Quota |
| `DEPENDENCY_UNAVAILABLE` | 503 | Downstream down |
| `INTERNAL` | 500 | Unexpected |

Throw via the project's shared error helpers — never invent ad-hoc error shapes.

## Mutations

### Optimistic concurrency

- Accept `If-Match: <version>` and/or body `expectedVersion`.
- Echo `ETag` on writes (and preferably entity GETs).
- Mismatch → `412 PRECONDITION_FAILED` with current version.

### Idempotency

Unsafe side-effect POSTs (import, allot, submit, publish, provision, AI generate, enroll) accept:

```http
Idempotency-Key: <uuid>
```

Replays return the original result. Store keys per project conventions (Redis, jobs table, etc.).

### Long-running work

Return **202 Accepted** with a job handle:

```jsonc
{ "error": false, "data": { "jobId": "job_…", "state": "queued", "pollUrl": "/api/v1/jobs/job_…" } }
```

## Dual path (REST + Server Actions)

- Route Handlers for HTTP / third-party clients.
- Server Actions for same-app mutations.
- **Same** Zod schemas and service functions — never fork validation or business rules in the action file.

## Versioning detail

| Change type | Action |
|-------------|--------|
| Additive field, new optional query, new endpoint under `/vN` | Stay on current `/api/vN` |
| Rename/remove field, change meaning, break clients | Ship `/api/v(N+1)` |
| Document / DB shape evolution | Bump payload `schemaVersion` (independent of URL `/vN`) |

## Drift

If intentionally diverging from the project's API contract doc, update that doc and add a short [decision-records](../decision-records/SKILL.md) entry — no silent drift.
