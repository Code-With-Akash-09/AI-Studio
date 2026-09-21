# Undo rows and snapshot files

Every mutation (including dry-run **plans**) must restore the exact pre-change document.

## Action / updates row

One object per write (or planned write). **Source of truth:** append to `actions.jsonl` immediately. Pretty activity JSON (e.g. `xyzUpdated.json`) is a snapshot.

Undo a crashed `--apply` from **this run’s** `actions.jsonl`, including a partial file. A previous dry-run is **not** a substitute — the apply path may have used a different `--limit` / filter / batch.

```js
{
  id: "<stable id, usually String(_id)>",
  collection: "<name actually used>",
  op: "updateOne", // updateOne | replaceOne | insertOne | deleteOne
  filter: { _id: "…" },
  before: { /* fields that will change, enough to restore exactly */ },
  after: { /* fields after this op */ },
  undo: {
    op: "updateOne",
    filter: { _id: "…" },
    $set: { /* === before */ },
    // if before had missing keys that after $unset: include $unset here
  },
}
```

Inverse map:

| Forward `op` | `undo.op` |
|---|---|
| `updateOne` / `replaceOne` | `updateOne` / `replaceOne` with `before` (use `$set` + `$unset` so extra keys disappear) |
| `insertOne` | `deleteOne` with the same `_id` filter |
| `deleteOne` | `insertOne` with full `before` document |

Do not record `{ $set: newValue }` without `before`. Skip rows that need no write — they go on the skip activity file only (`reason` + id), not the mutation file.

`--undo --apply` replays `undo` (or `insertOne`/`deleteOne` inverses) **in reverse** of apply order.

## Multi-step jobs

Do not cram all stages into one unlabeled blob.

**Per row** (inside the mutation activity JSON / each jsonl line):

```js
{
  id: "…",
  collection: "…",
  snapshots: {
    before: { /* doc (or changed fields) before step 1 */ },
    afterStep1: { /* after first mutation */ },
    afterStep2: { /* … */ },
    final: { /* after last mutation */ },
  },
  steps: [
    { name: "step1", op, filter, before, after, undo },
    { name: "step2", op, filter, before, after, undo },
  ],
}
```

`snapshots.final` must equal the last `after`. `snapshots.before` must equal step1 `before`.

**Per run files** under `output/latest/snapshots/` (same keys, arrays or maps by id — pick one and keep it):

| File | When |
|---|---|
| `before.json` | state before any write |
| `afterStep1.json` | after first stage |
| `afterStepN.json` | after each later stage |
| `final.json` | after last stage |

Single-step jobs: **no** `snapshots/` folder; `before` / `after` / `undo` on the row is enough.

`report.json` stays counts-only. Do not nest full docs there.
