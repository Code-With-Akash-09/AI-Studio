---
name: secrets-hygiene
description: Enforces no hardcoded secrets and no committed env files except .env.example; when Infisical config exists, Infisical is the only source of truth for real secrets. Use when touching env files, credentials, Infisical, secrets, config keys, auth/config work, or before suggesting commits that include env-like files.
---

# Secrets Hygiene

**Policy:** no real secrets in the repo, source, tests, fixtures, seeds, docs, audit payloads, tickets, or chat — ever.

Cross-check commit suggestions with [git-commit](../git-commit/SKILL.md). Flag patterns → [REFERENCE.md](REFERENCE.md).

## Always (every project)

- Never hardcode secrets in source, tests, fixtures, seeds, or docs.
- Never commit `.env`, `.env.local`, or any `.env.*` except **`.env.example`**.
- New keys → empty placeholder in `.env.example` only (no real values).
- Before finishing env/config/secret work: **scan the diff** for secret-shaped values (see [REFERENCE.md](REFERENCE.md)).
- Only non-secret config / public IDs in `NEXT_PUBLIC_*` (or project equivalent) when required.

## When Infisical config exists

Detect `.infisical.json` or `infisical.json` at the project root.

Then:

- **Infisical is the only source of truth** for real secrets.
- Local runs: `infisical run --env=<env> -- <cmd>` or the project's Infisical-backed scripts — not committed env files.
- New keys must exist in **Infisical and** `.env.example`.
- If the project has a secrets inventory doc (e.g. `docs/ops/secrets.md`), update it.
- Do not paste production secrets into tickets, chat, or shared writeups.
- Prefer gitignored export only as an offline escape hatch; delete afterward.

## When Infisical config is absent

Still enforce no-hardcode + `.env.example`-only. **Do not** invent Infisical setup unless the user asks.

## Finish checklist

- [ ] No secret values in the diff
- [ ] Only `.env.example` among env files (placeholders)
- [ ] If Infisical present: key in Infisical + example + inventory doc (if any)
- [ ] Local verify used Infisical/`infisical run` when applicable — not a committed env file
