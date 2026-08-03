---
type: feature
id: versioned-migrations
title: Versioned migrations
origin: mde
impacts:
  - persistence
default: n/a
---

# Versioned migrations

## Purpose

Migrations are versioned and **reversible**: every migration ships as a **pair** — an **up**
script that applies the change and a **down** script that rolls it back — so a change can always
be undone. Destructive changes are deliberate and confirmed.

## Impact on persistence

The agent computes the diff between the current schema and the target schema, and applies it as
**one** migration — one up/down pair per version bump, not one per table/entity/plan. Each new
migration increments the version (`00N_<name>.up/.down.sql`).

Migrations under `db/migrations/*` are versioned and ship as an **up/down pair**. Each versioned
change is **two files**: `<NNN>_<name>.up.sql` (apply) and `<NNN>_<name>.down.sql` (roll back the
*same* change — drop what the up created, revert what it altered). A migration with an up but **no
down** is a defect: the change cannot be reversed. The down is the deliberate inverse, not a
placeholder; for a genuinely irreversible/destructive change the down states so explicitly and the
change carries the user's confirmation and evidence. Migrations (both files) and seed data are
recorded in the manifest.

**Applied migrations are tracked — the runner is idempotent, not a blind re-run.** The app
maintains a **`schema_migrations`** table that records which migrations have been applied, so
`mde:db-report`/the runner knows the DB's current version and re-running the migrate step does
**not** re-apply already-applied migrations. The runner, on each apply: ensures the tracking table
exists, reads the applied set, applies **only** the pending `<NNN>_<name>.up.sql` in version order,
and records each one it applies. Applying every `.up.sql` unconditionally on every run — with no
tracking — is a defect (it is not idempotent and breaks on a partially-migrated DB).

The tracking table is a fixed contract:

```sql
CREATE TABLE schema_migrations (
  version    VARCHAR(100) PRIMARY KEY,           -- the migration's <NNN> version id
  name       VARCHAR(255) NOT NULL,              -- the migration name (<NNN>_<name>)
  checksum   VARCHAR(255),                       -- hash of the up.sql, to detect a changed migration
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- **`version`** is the primary key — a migration applied twice is impossible; the runner skips
  any version already present.
- **`checksum`** lets the runner detect a **changed already-applied migration** (the file was
  edited after being applied) — a mismatch is reported, not silently ignored (an applied migration
  should be immutable; edit forward with a new migration instead).
- A **down** (rollback) removes its version's row so the DB version moves back.
- The `schema_migrations` table is infrastructure, not a business entity — it is not modelled as an
  entity spec; it is created/owned by the migration runner.

**Database apply safety.** *Generating* migration files is repository work (Git-reversible);
*applying* them to a database is runtime work (not assumed rollback-safe — see RULE-CORE-001
"Database/runtime exception"). Before applying schema/data changes, the plan must record a rollback
strategy — **backup-restore** or **reverse-migration** (the paired `.down.sql` above is the
reverse-migration strategy). Destructive, forward-only, or data-changing migrations require explicit
user confirmation before apply.

## Checks

- Does each schema change compute the diff from the current schema and ship as **one** versioned
  pair, rather than one pair per entity/capability/plan?
  · evidence: `db/migrations/*` vs. the schema diff it applies
  · when: static
- Is every migration versioned and shipped as an **up/down pair** — each `<NNN>_<name>.up.sql`
  accompanied by a `<NNN>_<name>.down.sql` that reverses it?
  · evidence: paired `db/migrations/*.up.sql` + `*.down.sql`
  · when: static
- Are destructive/irreversible changes explicitly confirmed (down states the irreversibility;
  user confirmation + evidence recorded)?
  · evidence: down script + confirmation record
  · when: static
- Before any DB apply, is a rollback strategy recorded (backup-restore or reverse-migration), with
  destructive/forward-only/data-changing applies carrying explicit user confirmation?
  · evidence: plan record of rollback strategy + apply confirmation
  · when: requires-environment
- Are migrations (both files) and seed data recorded in the manifest?
  · evidence: manifest entries
  · when: static
- Does the migration runner track applied migrations in a **`schema_migrations`** table
  (version PK, name, checksum, applied_at) — ensuring the table exists, applying only **pending**
  migrations in version order, recording each, and skipping already-applied ones — rather than
  blindly re-applying every `.up.sql` on each run?
  · evidence: the migrate runner reads/writes `schema_migrations`; applies only pending versions
  · when: static (runner logic) + requires-environment (re-run applies nothing new)

```check scope=plan subject="Reversible Migrations" whenFailed="migrations have no down script (cannot be rolled back)" whenPassed="migrations have a down script"
# migrations = one entry per versioned migration (stem NNN_name), from the manifest.
# hasUp / hasDown = whether the stem has a .up.sql / .down.sql file.
# This check: every up migration must have a matching down, so the change can be rolled back.
EVERY $m IN $plan.migrations WHERE $m.hasUp IS "true"
THEN  $m.hasDown IS "true"
  ELSE "migration has an up but no down script — the change cannot be rolled back; add <stem>.down.sql; see ref"
```
