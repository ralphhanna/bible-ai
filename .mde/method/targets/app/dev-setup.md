---
type: target
id: TARGET-DEV-SETUP
title: dev-setup
applies_when:
  - a plan prepares or verifies the development environment (operation setup)
  - a plan needs the runtime proven (database reachable, app starts) before building on it
inputs:
  - tech-stack
  - derived: from tech-stack — runtimes, services, and tools its axes require; ask for values and for permission to install or create them
---

# dev-setup

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Before any features are built on it, the development environment must be proven
real and runnable — not assumed. This target owns the readiness proof: the
environment is brought up (`install-dev`), the database is reached, the app
starts and identifies, and a minimal smoke test passes — each step captured as
a real log. Its whole reason to exist is that "the environment works" becomes a
**required, evidenced output** a plan must produce, so it can never be quietly
deferred as "requires environment."

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (`—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output. Each log is the real captured output of that smokescreen step, written live — a missing log means the step did not run; a log present but showing a non-zero exit / connection error is a blocker, not a satisfied output.

| output | path | perEach | when |
|---|---|---|---|
| env-check-log | plans/{plan}/evidence/logs/env-check.log | — | always |
| db-connect-log | plans/{plan}/evidence/logs/db-connect.log | — | db-in-scope |
| migrate-log | plans/{plan}/evidence/logs/migrate.log | — | migrations-exist |
| health-log | plans/{plan}/evidence/logs/health.log | — | always |
| smoke-log | plans/{plan}/evidence/logs/smoke.log | — | always |
| teardown-log | plans/{plan}/evidence/logs/teardown.log | — | always |

**`db-connect.log` is the proof the database is reachable** — a real connection to the live
`DATABASE_URL` plus a trivial round-trip (`SELECT 1` or equivalent). When the app has a
database (`db-in-scope`), a dev-setup plan's manifest **must** contain it and the verifier's
mandated-output gate fails when it is missing: a plan cannot claim it prepared the environment
while having no evidence the database was ever reached. Once `db-connect.log` shows a live
connection, the runtime is **proven capable**, so any later `requires-environment` check in the
same plan may **not** be deferred for "no environment" — that is a defect (see the evaluate
deferral audit). The connection detail logged is host/port/db only, **never the password**.

This is distinct from `db-report.json` (mandated by `TARGET-PERSISTENCE`): `db-connect.log`
proves the database is **reachable** (an environment fact any dev-setup plan owes when a DB is
in scope); `db-report.json` proves the **schema the migrations declared exists** (a
schema-building fact only a plan that actually creates schema owes). A pure environment-prep
plan that defers schema owes the former, not the latter.

## Composed behavior

_(no feature impacts this target)_

## Validation checks

### Dev environment setup (install-dev)  `[feature: install-dev]`

- Does the app ship an `install-dev` script that sets up `.env` (from
  `.env.example`, non-destructive), installs deps/tooling, checks the DB is
  reachable, and runs a smokescreen — reporting blockers clearly?
  · evidence: the `install-dev` script
  · when: static
- **Smokescreen logs exist — every required step wrote its log.** Are all of
  `env-check.log`, `db-connect.log`, `migrate.log` (when the app has migrations),
  `health.log`, `smoke.log`, and `teardown.log` present under `evidence/logs/`? A
  missing log means that step did not run — the smokescreen is incomplete, not
  passed.
  · evidence: the `evidence/logs/*.log` set listed above
  · when: requires-environment
- **Smokescreen logs show success — not just present, but green.** Does
  `db-connect.log` show a live connection + trivial round-trip, `health.log` show
  `status: pass` with the matching app name, `smoke.log` show exit 0, and none of
  the logs show a non-zero exit or connection/auth error? A log that exists but
  shows failure is a blocker, never a pass.
  · evidence: the contents of `evidence/logs/db-connect.log`, `health.log`, `smoke.log`
  · when: requires-environment
- **A blocker was reported, not deferred.** If `install-dev` could not reach the DB
  (or hit an auth failure), does it report the exact connection tried (host/port/db,
  never the password) and direct the user to fix `.env` and re-run — rather than
  silently skipping, or marking the check deferred while a real runtime was present?
  · evidence: `db-connect.log` (the failed connection detail) + `status.md`/`log.md` blocker note
  · when: requires-environment
- **Proven-capable runtime does not defer downstream.** Once `db-connect.log` shows
  a live connection, are the plan's other `requires-environment` checks (the
  persistence integration test, etc.) actually run — not deferred for "no
  environment"? A deferral of an executable check while `db-connect.log` proves the
  DB was reachable is a defect.
  · evidence: `db-connect.log` (live) cross-checked against `evidence.md` deferrals
  · when: requires-environment

<!-- installDev.dbConnectReal is model-computed: db-connect.log is present when the app
     has a DB in scope, AND its content shows a REAL round-trip — a connection opened and
     a trivial query (SELECT 1 / query result / row returned), not a script that merely
     PRINTED instructions ("now run mde:install, db:reset, then mde:start"). Closes the
     cheat where install-dev prints a to-do list instead of connecting, producing a
     non-empty log that proves nothing. Only fires when the app has a DB (db-in-scope). -->
```check scope=plan target=dev-setup
WHEN  $plan.installDev.dbInScope IS "true"
THEN  $plan.installDev.dbConnectReal IS "true"
  ELSE "install-dev: db-connect.log does not prove a REAL database round-trip — it is missing, empty, or only prints instructions (e.g. 'now run mde:install…') instead of opening a connection and running a trivial query (SELECT 1). A script that prints a to-do list is not a readiness check; connect for real and capture the round-trip."
```
