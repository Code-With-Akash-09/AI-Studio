# Run env and flag examples

`<script>` = `.scripts/exampleHeal/index.mjs`. Swap the folder for the job.

## Prefix (choose one)

**Infisical config at repo root** (`.infisical.json`, `infisical.json`, or `.Infisical.json`):

```bash
infisical run --env=<env> -- node .scripts/exampleHeal/index.mjs
```

Use the project’s usual Infisical env name (`dev`, `local`, …). Never `--env-file=.env.local` in this case.

**No Infisical file:** ask once — Infisical (they will add config) vs `.env.local`. If they pick `.env.local`:

```bash
node --env-file=.env.local .scripts/exampleHeal/index.mjs
```

Below, `RUN` means that prefix + `node .scripts/exampleHeal/index.mjs`.

## Main combinations (not a full cartesian)

Dry-run (default):

```bash
RUN
RUN --limit 20
RUN -v --limit 20
RUN --verbose --limit 20
RUN --csv .scripts/exampleHeal/data/input.csv
RUN --csv .scripts/exampleHeal/data/input.csv --limit 50
```

Apply (only after the user asks):

```bash
RUN --apply
RUN --apply --limit 20
RUN --apply -v --limit 20
RUN --apply --batch 200 --limit 20
RUN --apply --csv .scripts/exampleHeal/data/input.csv --limit 50
RUN --apply --test --limit 20
```

`--test` only if **this** repo already has test collections.

Undo (loads artifacts **before** archiving `latest/`; `--apply` to write restorations):

```bash
RUN --undo
RUN --undo --limit 20
RUN --undo -v
RUN --undo --apply
RUN --undo --apply -v
RUN --undo --from .scripts/exampleHeal/output/<runId>
RUN --undo --from .scripts/exampleHeal/output/<runId> --apply
```

`--batch` with `--undo` is optional (same bulk size). `--csv` does not apply to undo unless the job is CSV-driven restore.
