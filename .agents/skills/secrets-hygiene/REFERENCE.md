# Secrets Hygiene — Reference

## Patterns to flag in diffs

Treat as secrets unless clearly placeholders (`""`, `changeme`, `your-…-here`, `<…>`, `xxx`):

| Pattern class | Examples |
|---------------|----------|
| Private keys | `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY` |
| JWTs | `eyJ…` three-segment base64 |
| Cloud keys | `AKIA…`, `sk_live_…`, `sk-…`, `ghp_…`, `xox[baprs]-…` |
| Connection strings | `mongodb+srv://user:pass@…`, `postgres://…:…@…` |
| Generic assignments | `PASSWORD=`, `SECRET=`, `API_KEY=`, `TOKEN=` with non-empty real-looking values |
| Inline literals | hardcoded secrets in source, tests, fixtures, seeds, decision docs |

## Allow / expect

| Path / case | OK? |
|-------------|-----|
| `.env.example` with empty or placeholder values | Yes |
| Public IDs / non-secret config in `NEXT_PUBLIC_*` (or equivalent) | Yes when truly non-secret |
| `.env`, `.env.local`, `.env.production`, other `.env.*` | **Never commit** |
| Real values in Infisical UI / `infisical run` env | Yes — outside the repo |

## Infisical detection

Look for either file at the project root:

- `.infisical.json`
- `infisical.json`

Presence → Infisical SoT rules in [SKILL.md](SKILL.md). Absence → still enforce no-hardcode + `.env.example`-only; do not invent Infisical setup unless asked.

## New key checklist (Infisical projects)

1. Add key to Infisical (correct env/path).
2. Add empty placeholder to `.env.example`.
3. Update secrets inventory doc if the project has one (e.g. `docs/ops/secrets.md`).
4. Verify locally via `infisical run` / project Infisical-backed scripts — not a committed env file.
5. Scan the diff: no real secret values.

## Cross-links

- Commit staging: [git-commit](../git-commit/SKILL.md) — never suggest committing secrets or `.env*`.
- Audit payloads: never put secrets in Mongo / audit `before`/`after`/`metadata` when an audit skill or project rule applies.
