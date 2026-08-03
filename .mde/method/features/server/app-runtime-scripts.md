---
type: feature
id: app-runtime-scripts
title: App runtime scripts (mde:install/build/test/health/start/kill/db-report)
origin: mde
impacts:
  - server
default: n/a
---

# App runtime scripts (mde:install/build/test/health/start/kill)

## Purpose

A generated app exposes a fixed set of **`mde:` scripts** so MDE, the Workbench,
CI, or a human can install, build, test, start, health-check, and stop the app
**the same way regardless of stack** — invoking a role, never guessing a command.

## Impact on server

The app declares these `mde:` scripts (npm scripts for a node stack; the stack's
equivalent otherwise, resolved by role — plain npm/tooling, **no pm2 in dev**):

| script | does | success |
|---|---|---|
| `mde:install` | install all deps (web + api + root) — **once** | exit 0 |
| `mde:ready` | prove every **user-provided** env config is present and working — **before build/test, every run** | exit 0 + evidence (see below) |
| `mde:build` | typecheck + build web + api | exit 0, artifacts produced |
| `mde:test` | run the tests **against the running app** | exit 0 |
| `mde:health` | ping `/health`, verify identity | component reports `status: pass`, name matches |
| `mde:start` | bring up **every tier** (web + api) on the declared ports, one command | components online + health passes |
| `mde:kill` | stop this app's processes, free its ports | ports freed |
| `mde:db-report` | report the app's database — health, a summary of schema objects, and full detail | exit 0, report produced |

Key rules:

- **`mde:ready` proves the environment, and blocks if it is not.** Distinct from
  `mde:install` (deps, run once): readiness runs **before every build/test**, because
  any user-provided config can be missing or down on a given run. It checks that every
  **user-provided** value is present *and working* — `DATABASE_URL` (open a connection
  + a trivial query, e.g. `SELECT 1`), any API keys/secrets (non-empty), any external
  service URLs (reachable) — writing the evidence (`env-check.log`, `db-connect.log`,
  and a per-service reach log) and **exiting non-zero with the exact missing/failed
  config** on any failure. It **connects for real** — a script that merely prints
  "now run mde:install, db:reset…" is not a readiness check and fails the contract (see
  [[install-dev]]'s db-connect round-trip). `mde:ready` is the entry point the framework
  runs *early* (before generation, when the plan's impact touches the environment), so a
  broken connection string is caught up front, not mid-build.
- **`mde:start` starts the whole app** — both web and API tiers in one invocation
  (compose them, e.g. `concurrently`), on the ports from `.env`. A start that
  lights up only one tier is a broken contract. (This is the app-start contract.)
- **`mde:test` is a pure consumer — it starts nothing.** The app is already
  running (started once by `mde:start`); tests run against it: unit (no server),
  API (hit the running API), UI (the browser driver's `baseURL` points at the
  running web tier), and DB (a connection to the one `DATABASE_URL`). It must
  **not** spin up a second server or a second database — one app, one DB, tested
  in place. This is why npm-test and app-run never collide.
- Callers invoke by **role** (`mde:start`, `mde:test`, …), never a hardcoded
  `dev`/`vite`/`tsx` command. Granular scripts (`test:unit`, etc.) may exist for
  humans but are not part of the contract; `mde:test` is the single aggregate.
- **`mde:db-report` inspects the app's one database** (`DATABASE_URL`) and reports
  it in **three parts**, so MDE / the Workbench / a human can see the live schema
  without a DB client:
  1. **Health** — can it connect to the database? (a `pass`/`fail` with the DB name).
  2. **Summary** — a list of the schema objects: tables (with row counts), plus
     views, sequences, indexes, enums/types — one line each, the at-a-glance
     inventory. It also reports the **migration state** from `schema_migrations`
     (see [[versioned-migrations]]): the current DB version, how many migrations
     are applied, and any **pending** (a migration file on disk not yet in
     `schema_migrations`) or **checksum-mismatched** migrations — so the report
     shows whether the live schema is up to date with `db/migrations/`.
  3. **Detail** — the **full JSON** of the schema objects: per table its columns
     (name, type, nullable, default), primary key, foreign keys, unique constraints,
     and indexes; and the other objects' definitions. This is the machine-readable
     record (the Workbench/verifier can read it; a human can diff it).
  It reads the **live database**, not the migration SQL — so it reports what actually
  exists. Output goes to stdout as structured JSON (health + summary + detail), and a
  copy is written to a declared report path so it is browsable
  (`reports/evidence/db-report.json`). It **mutates nothing** — read-only.
- **The same report is exposed live at `GET /api/db-report`** (the API tier), returning
  the identical JSON (health + summary + detail) computed against the live DB on request —
  so MDE / the Workbench / a human can fetch the current schema without running the CLI or
  reading a stale file. The `mde:db-report` script and the `/api/db-report` endpoint share
  one implementation (a `db-report` module the script and the route both call), so CLI and
  API never drift. The endpoint is **read-only** and returns the same shape as the file.

## Checks

- Are all `mde:` scripts (`mde:install`, `mde:build`, `mde:test`, `mde:health`,
  `mde:start`, `mde:kill`, and `mde:db-report` when the app has a database) declared?
  · evidence: `package.json` scripts (or the stack's script manifest)
  · when: static
- Does `mde:db-report` (for an app with a DB) connect to the live `DATABASE_URL` and
  emit the three parts — **health**, a **summary** of schema objects (tables + counts,
  views, sequences, indexes, enums) **including migration state** (current version,
  applied count, any pending/checksum-mismatched migrations from `schema_migrations`),
  and **full JSON detail** — read-only, to stdout and `reports/evidence/db-report.json`?
  · evidence: the `db-report` script; its output shape (health + summary incl. migration
    state + detail)
  · when: static (script present) + requires-environment (report produced against the DB)
- Is the same report exposed at **`GET /api/db-report`** (read-only), sharing one
  implementation with the CLI script (a `db-report` module both call, so CLI and API do
  not drift), returning the same health + summary + detail JSON?
  · evidence: an `/api/db-report` route + a shared db-report module used by both the
    route and the script
  · when: static (route + shared module) + requires-environment (endpoint returns the report)
- Does `mde:start` bring up **every** tier the app needs (both web and API for a
  split app), in one invocation?
  · evidence: the `mde:start` script composition
  · when: static (composition) + requires-environment (all ports come up)
- Does `mde:test` run against the **already-running** app — starting no server and
  no second database (one `DATABASE_URL`), consuming what `mde:start` launched?
  · evidence: the `mde:test` script; no `webServer`/self-start of tiers; tests
    point at the running app's URL and the single DB
  · when: static
- Do `mde:install` → `mde:build` → `mde:test` each exit 0, and does `mde:kill`
  free the app's ports?
  · evidence: captured run output
  · when: requires-environment

The "`mde:test` is a pure consumer" rule (a test must not boot its own app tier or reset
the DB in-process) is enforced deterministically by `persistence-integration-test` — that
feature owns the integration-test items and its `scope=item` check inspects their content.
This feature keeps the *script contract* (which scripts exist and what each does); the
per-test "no self-start" assertion lives where the test items are traced.
