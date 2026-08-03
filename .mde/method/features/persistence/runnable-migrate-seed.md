---
type: feature
id: runnable-migrate-seed
title: Runnable migrate/seed (no orphaned SQL)
origin: mde
impacts:
  - persistence
default: n/a
---

# Runnable migrate/seed (no orphaned SQL)

## Purpose

Migrations and seeds must be **runnable through the project**, not just present as files — a
fresh clone can apply them with the project's own tooling. Orphaned SQL is a defect.

## Impact on persistence

A plan introducing persistence adds: `package.json` scripts (or stack equivalent) to apply the
schema and load seeds — `migrate`, `seed`, `db:reset` — backed by a real migration tool or a
committed runner script; plus a documented one-command bring-up (install → migrate → seed →
start). **Orphaned SQL** — migration/seed files no script or source applies — is a defect even
if the files are correct.

**Each migration applies atomically.** A single migration — its schema statements *and* the
record marking it applied — either all takes effect or none does. A migration that fails
part-way must leave the database as if it never ran, not half-migrated. (A real migration tool
gives this; a hand-rolled runner must too.)

## Checks

- Is there a runnable path to apply migrations + seeds (`migrate`/`seed`/`db:reset` scripts or
  a committed runner) and a documented one-command DB bring-up — no orphaned SQL?
  · evidence: operations map + runner; `migrate.log`/`seed.log` apply output
  · when: static (scripts exist) + requires-environment (apply output)
- Does each migration apply atomically — schema change and applied-record together, all-or-nothing?
  · evidence: the runner (migration tool, or a hand-rolled runner that wraps each migration in a transaction)
  · when: static (runner inspection)
