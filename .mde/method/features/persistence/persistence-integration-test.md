---
type: feature
id: persistence-integration-test
title: Persistence integration test (real schema, no mocked DB)
origin: mde
impacts:
  - persistence
  - testing
default: n/a
---

# Persistence integration test (real schema, no mocked DB)

## Purpose

Persistence is proven against a **real** schema, not a mocked/fake pool. Mocks pass even when
the SQL is invalid or columns do not match. Faking the project's own database is banned
(RULE-CORE-004).

## Impact on persistence

A plan touching `db/migrations/*` or `db/seeds/*` must be exercised against a real schema, not
mocks. A persistence layer exercised only through mocks is unverified.

## Impact on testing

At least one integration test **applies the real migrations** (and seeds) to an isolated
real/ephemeral test database or schema (a local instance of the stack's own database, a test
container, or an embedded equivalent) and runs a **real repository query** through the real
driver: at least one insert->read
round-trip per table-owning capability, plus a constraint/FK behavior where defined.

The test harness must reset the **one** `DATABASE_URL` (migrate then seed) and point API
and repository tests at it before app/database modules are imported (see [[env-contract]]).
A stale, unreset database is not valid verification.

Faking the project's own DB (a stub `query()` returning canned rows, an in-memory stand-in) is a
verification failure and must be removed, not supplemented. Mocking a genuinely external service
is fine.

## Checks

- **Static - no faked DB:** no repository/persistence test fakes the project's own database.
  - evidence: test source review
  - when: static
- **Static - test is a pure consumer:** the integration test does not boot its own app tier
  (`createApp()`/`express()`/`.listen(...)`/`new Server`) or reset the database in-process
  (`DROP`/`TRUNCATE TABLE`, `migrate.reset/latest`, `resetDatabase`). Per the `mde:test`
  contract (`app-runtime-scripts`), the test hits the app **already running** (its `baseURL`)
  and the **one** `DATABASE_URL` — it starts no second server or database.
  - evidence: test source review — no in-process server construction or DB reset
  - when: static
- **Required - real integration test:** the suite resets the one `DATABASE_URL` (real
  migrations and seeds applied there), points tests at it, and runs a real repository query
  (insert->read round-trip per table-owning capability). A stale, unreset database is a failure.
  - evidence: integration run output (`evidence/logs/`) + `migrate.log`/`seed.log`
  - when: requires-environment
- **Required - the change actually landed in the DB:** after applying the up migration to the
  isolated target, **generate a real schema dump** via the stack's own `db:schema-dump` operation
  (`tech-stack.md` Operations Map — the command is whatever the chosen database's own tooling
  produces a real, structural schema dump; this method names no database engine) and **read it
  against every touched entity's `## Storage View`**: does each declared
  table exist, with every declared column — i.e. the migration's changes really took place, not
  merely that the SQL ran without error. The static `schema-from-entities` check proves the
  migration *declares* the table; this proves the database *has* it. Save the dump as evidence
  and record the comparison result (table-by-table, column-by-column) in `evidence.md`.
  - evidence: the `db:schema-dump` output saved under `evidence/logs/schema-dump.*`, compared
    against entity Storage Views, with the comparison result recorded in `evidence.md`
  - when: requires-environment
- **Reversibility (down) applies cleanly:** applying the paired **down** migration to the target
  rolls the change back without error (and, where non-destructive, restores the prior state) — the
  down is exercised, not just present.
  - evidence: down-apply output in `evidence/logs/`
  - when: requires-environment

<!-- check: the deterministic ($-model) form of the `when: static` checks above.
     The runner assembles the model, scopes $item to THIS capability's manifest
     entries by default, resolves $-paths, applies operators, and emits a complaint
     when a THEN fails. Prose `when: requires-environment`/semantic checks stay
     above for the AI pass — only the mechanizable ones get a check block. -->
```check scope=item
# Static — no faked DB: my test artifacts must not mock the project's own database.
WHEN  $item.type IS "test"
THEN  $item.content NOT MATCHES "(mock|stub|fake|vi\.fn|jest\.fn).*(query|pool|client|db)"
  ELSE "faked project DB (RULE-CORE-004 — mock external services only, never the app's own DB)"
# Static — pure consumer: a test must not boot its own app tier or reset the DB in-process.
# It hits the app mde:start launched (baseURL) and the one DATABASE_URL (see app-runtime-scripts).
WHEN  $item.type IS "test"
THEN  $item.content NOT MATCHES "(createApp\s*\(|express\s*\(\)|\.listen\s*\(|new\s+Server\b|(DROP|TRUNCATE)\s+TABLE|migrate\.(reset|latest)\s*\(|resetDatabase\s*\()"
  ELSE "test self-starts the app tier or resets the DB in-process — mde:test must be a pure consumer of the app mde:start launched (hit the running app's URL + the one DATABASE_URL), not boot a second server/DB"
```

<!-- Semantic (AI judgment) — a schema dump's format is stack-specific (raw SQL DDL, an
     ORM's introspection JSON, a plain-text schema listing, …), so no single regex/DSL
     check can parse "does this dump have column X" across every stack. The AI
     reads the captured dump directly against each touched entity's Storage View — the
     same comparison schema-from-entities.md does statically against the MIGRATION FILES,
     here done against the LIVE dump so a hand-patched migration (a column added later,
     out of band) or a migration that silently failed to apply cannot hide the gap. -->
```check scope=plan
# hasSchemaDump = a captured schema-dump artifact exists under evidence/logs/ for this
# plan (model-computed: a file matching schema-dump.* in the plan's evidence/logs/).
WHEN  $plan.persistenceInScope IS "true"
  AND $plan.hasSchemaDump IS "false"
ASK   "This plan touches persistence but evidence/logs/ has no captured db:schema-dump output. Confirm: was db:schema-dump run against the isolated test target after migrating, and if so where was its output saved? If it was never run, that is the defect to report — not a pass."
```

```check scope=plan
EVERY $e IN $plan.expectedTables
ASK   "Read the captured schema dump under evidence/logs/ (whatever format the stack's db:schema-dump produced) and confirm entity '${$e.entity}' Storage View — table '${$e.table}' — actually exists in the LIVE dump with every declared column present, not just in the migration source. Name any table or column the dump is missing that the Storage View declares; that is a real defect (the migration source can lie about what actually got applied)."
```
