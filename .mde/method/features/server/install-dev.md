---
type: feature
id: install-dev
title: Dev environment setup (install-dev)
origin: mde
impacts:
  - server
  - dev-setup
default: n/a
---

# Dev environment setup (install-dev)

## Purpose

A generated app can bring its **development environment** up from nothing by a
single documented script — so a new machine (or a verification run) goes from
clone to a working, testable app without undocumented manual steps. This is what
makes the runtime checks (DB reachable, app starts, tests pass) actually runnable
rather than perpetually deferred.

## Impact on server

The app ships an **`install-dev`** script (a committed script, or an `mde:` script
role) that provisions the dev environment end to end:

- **Set up `.env`** — create `.env` from the committed `.env.example` if absent
  (never overwrite an existing one); fill machine-specific values.
- **Install tooling / dependencies** — run `mde:install`; ensure the stack's
  required tools are present (or report clearly what is missing and how to get it).
- **Check the database** — verify the DB from `DATABASE_URL` is installed and
  reachable, and (where the app has migrations) that migrations apply to it. A DB
  that is absent or unreachable is reported as a **blocker**, with the exact
  connection it tried — not silently skipped.
- **Smokescreen** — a minimal end-to-end check that the environment works: start
  the app (`mde:start`), hit `/__mde/health` and confirm identity, and run a small
  smoke test. Tear down what it started.

**Every smokescreen step writes a real log to `evidence/logs/` as it runs** — the
smokescreen is only "passed" when the logs exist and show success, not when the
agent says it passed. The required set (one file per step, captured live, never
reconstructed after the fact):

| log | proves | pass condition in the log |
|---|---|---|
| `evidence/logs/env-check.log` | `.env` resolved, `DATABASE_URL` present | the resolved connection target (host/port/db, **never the password**) is printed |
| `evidence/logs/db-connect.log` | the DB is reachable on `DATABASE_URL` | a real connection opened and a trivial round-trip (`SELECT 1` or equivalent) returned |
| `evidence/logs/migrate.log` | migrations apply (when the app has any) | the migrate operation ran to completion, exit 0 |
| `evidence/logs/health.log` | the app started and identifies | `mde:start` came up and `/__mde/health` returned `status: pass` with the matching app name |
| `evidence/logs/smoke.log` | the small smoke test passed against the running app | the smoke test ran and exited 0 |
| `evidence/logs/teardown.log` | what was started was stopped | `mde:kill` freed the app's ports |

Each log is the **real captured stdout/stderr of that step**, timestamped, written
while the step runs — not a summary typed afterward. A missing log means the step
did not run; a log present but showing a non-zero exit or an error means the step
**failed** — either is a blocker, never a pass. `db-connect.log` in particular is
the anchor: once it shows a live connection, the environment is **proven capable**,
so any later `requires-environment` check in the same plan may **not** be deferred
for "no environment" (see [[persistence-integration-test]] and plan.evaluate's
deferral audit — a proven-capable runtime that defers executable checks is a defect).

The script is **idempotent** (safe to re-run) and **reports blockers clearly**
(missing tool, DB unreachable, port unavailable) rather than failing opaquely or
proceeding on a broken environment. On a connection/auth failure it reports the
exact connection it tried (host/port/db, never the password) and directs the user
to fix `.env`, then re-run — it does not silently skip or defer.

## Checks

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
