---
type: target
id: TARGET-SERVER
title: Source Generation Target Profile
applies_when:
  - a plan creates or modifies application source code
  - a plan generates implementation files from Specs, page specs, UI catalog, or business rules
requires:
  - testing
  - documentation
---

# Source Generation Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Generated source must be useful, traceable, and maintainable. It must not be placeholder-heavy code that only appears to satisfy the command.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| capability-slice | src/server/{cap}/ | business-capability | always |
| shared-module | src/server/shared/ | — | always |
| app-entry | src/server/index.ts | — | always |
| auth-boundary | src/server/shared/auth/ | — | auth-in-scope |

## Composed behavior

### App runtime scripts (mde:install/build/test/health/start/kill/db-report)  `[feature: app-runtime-scripts]`

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

### Authentication (real auth + guarded dev bypass)  `[feature: authentication]`

The real auth is generated once, using the technique **recorded in the stack's auth axis** (never
a library the method hardcodes):

- an **auth boundary** module (middleware/guard) that verifies the session/token and resolves the
  principal, with the **guarded bypass** as an explicit early-return keyed on the env flag +
  prod-guard (above);
- credential verification via the stack's chosen scheme (hashing algorithm + session/token
  approach from `tech-stack.md`), with a **login/logout endpoint**; secrets via [[env-contract]];
- the bypass flag and any dev-user selector live in **one** place (the boundary), not spread
  through routes; the prod-guard assertion runs at startup.

### Boundary validation  `[feature: boundary-validation]`

Validation happens at API/UI boundaries and important business-rule boundaries; it is explicit
and consistent.

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

Source is organized by capability/vertical slice when the app is capability-based: each
capability's UI/route/service/repository code lives together, shared modules factored out.

**One file per class/layer.** Within a server capability slice `src/server/<slice>/`, each
layer is its **own** file — never collapsed into a single module:

| Layer | File | Owns |
|---|---|---|
| Types/contracts | `<Slice>Types.ts` | request/response + domain types for the slice |
| Repository (DAL) | `<Slice>Repository.ts` | **all** data access — SQL/queries live here, nowhere else |
| Service | `<Slice>Service.ts` | business behaviour; calls the repository, holds **no** SQL |
| Routes | `<Slice>Routes.ts` | thin HTTP wiring; delegates to the service (see `thin-routes-fat-services`) |

A slice that ships a `Routes` or `Service` but **no `Repository`** (persistence folded into the
service), or that puts more than one layer in one file, is drift — it defeats the layering the
architecture mandates. Cross-cutting code (db pool, config, identity, access, errors) is factored
into `src/server/shared/`, not duplicated per slice.

**Operation markers at Service and Repository.** Each entity operation (CRUD **and** lifecycle)
implemented by a slice is marked at its Service method and Repository method with the inline
`// MDE: <entity>.<op> — …` marker (see `source-trace-header`), the same convention `Routes`
already carries (`capability-api-boundary`). This is what lets a **code coverage** report — every
entity operation joined against which layers implement it (UI panel, API route, Service method,
Repository method, DB table/column) — be *derived* from the markers already present in source,
rather than hand-maintained. An operation with a marked Route but an unmarked (or missing) Service
/Repository method is a layering gap: the endpoint exists but its business logic or data access
is not declared where the marker convention says it should be.

### Request context propagation  `[feature: context-propagation]`

Generated code threads the context, it does not reconstruct it: the boundary builds it, lower
layers receive it as a parameter (or an async context), and writes within a request use the
**passed** transaction — not a fresh connection per repository. Where the entity is versioned, the
optimistic-locking version rides the same request path (see [[optimistic-locking]]).

### Cross-cutting concerns  `[feature: cross-cutting-concerns]`

The request-context pattern is **realized in source**: middleware at the request boundary builds
the one context object, and service/repository signatures take it. This is the source form of the
design intent above — checked only when source is in scope, not at design time.

### Dependency resolution (static)  `[feature: dependency-resolution]`

Generated source must only use declared dependencies.

### Environment contract (.env — identity, ports, one DB)  `[feature: env-contract]`

The app ships a committed **`.env.example`** (the real `.env` is gitignored)
declaring, at minimum:

- **Identity:** `APP_ID` (short unique slug), `APP_NAME` (single source of truth
  for names), `APP_VERSION`.
- **Web tier:** `WEB_HOST`, `WEB_PORT` (preferred), `WEB_PORT_RANGE` (fallback band).
- **API tier** (only when the app has a real API — omit for single-tier /
  fake-API apps): `API_HOST`, `API_PORT`, `API_PORT_RANGE`.
- **One database per environment:** a single `DATABASE_URL` when the app has a DB. A test
  needing isolation configures its own in its own test setup. MDE never runs two APIs or
  juggles two DBs.
- **Logging:** `LOG_LEVEL` (error/warn/info/debug) and `LOG_PATH` — the log
  destination the shared logger writes to (see [[logging]]). When `LOG_PATH` is
  unset it **defaults to `logs/app.log`** under a root `logs/` directory (the app
  creates `logs/` if absent); it always also mirrors to stdout. Env-configured,
  never hardcoded — this is what lets a test run capture the app's log to a known
  file by setting `LOG_PATH` (see [[required-operation-ui-coverage]] —
  log-as-test-evidence). `logs/` is runtime output (gitignored), not a governed
  artifact.

**Port ranges are per-app and disjoint** across the project's apps — the
anti-collision guarantee (app A uses 52xx/31xx, app B uses 53xx/32xx). A range
that overlaps another app's is a defect.

**Component names are derived, not authored:** `{APP_NAME}-{component}` →
`mde-hr-web`, `mde-hr-api`. Nothing declares them twice.

**Derived keys are injected at launch, not authored in `.env`:** MDE sets `PORT`
(the selected port for this component), `MDE_COMPONENT` (`web`/`api`),
`MDE_APP_ROOT`, `VITE_BASE_PATH` (`/<app-id>/`, so the web bundler emits
prefixed URLs), and `VITE_API_URL` (`http://host:<api.port>`) into the process
env. The app **reads** these; it must **not** hardcode a port, host, base path, or
API host.

### Dev environment setup (install-dev)  `[feature: install-dev]`

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

### Layering and boundaries  `[feature: layering-boundaries]`

Generated source obeys the layering: thin routes, business logic in services, data access in
repositories, validation at boundaries (see `thin-routes-fat-services`, `boundary-validation`).

### Logging  `[feature: logging]`

Generated source logs through the shared logger, not raw `console.*` / `print`, with a
consistent level discipline (error / warn / info / debug). It logs at the **hard-core points**
above (request boundary in/out; caught errors) and reasonably beyond, without per-row noise.
Errors are logged where handled (not swallowed silently), and logs **never** contain secrets or
full sensitive payloads (the logger's redaction list covers auth headers / `password` / `token`).

**Destination is env-configured — `LOG_PATH` (and level via `LOG_LEVEL`).** The log destination
is **not hardcoded**: the logger reads `LOG_PATH` from `.env` (see [[env-contract]]) and writes
there. When `LOG_PATH` is unset it **defaults to `logs/app.log`** under a root `logs/` directory
(created if absent) and always also mirrors to stdout. This is what lets a test run capture the
app's log to a known file by setting `LOG_PATH` for that run (see
[[required-operation-ui-coverage]] — log-as-test-evidence). `logs/` is gitignored runtime output.
The logging setup lives in one place; modules obtain the logger rather than each configuring their
own. Log lines carry the request context's `correlationId` + `principalId` (from
[[context-propagation]]) — logging stamps the propagated context; it does not build it.

### Related-entity display (Display Label)  `[feature: reference-display]`

**The repository SQL-joins the referenced table to produce the display-label column, rather
than the service/route papering over a missing one.** A repository method that selects a row
with a foreign key (`employee_id`, `project_id`, `manager_id`, …) joins the referenced table
(`LEFT JOIN employees e ON e.id = x.employee_id`) and aliases its display-label column into the
result (`e.full_name AS employee_name`) — the same query shape for `list`, `read`, `create`, and
`update`. A `create`/`update` that already fetched the related entity for validation (to confirm
it exists / is active) has the display-label in hand and must include it in the returned shape,
not `RETURNING *` the bare row and leave the name null.

### Repository pattern  `[feature: repository-pattern]`

Generated data-access code lives in repository modules (e.g. `src/server/<cap>/Repository.ts`
or the stack equivalent), not inline in routes, services, or pages. Mapping between rows and
domain shapes lives in the repository. Routes/services call repository methods, not the driver.

### Source trace header  `[feature: source-trace-header]`

Each governed source file has a lightweight MDE header (or equivalent file-level trace).
Generated source traces to a capability, primary entity, page spec, use case, business rule,
or explicit user instruction.

**Inline capability markers.** Where a cross-layer capability is implemented in code, the
implementing statement/block carries a marker naming it:

```
// MDE: <capability-id> — <what this line/block does for the capability>
```

The marker sits immediately above (or on) the code that realizes the capability. Examples:

```ts
// MDE: optimistic-locking — guard on the client's version, increment on write
`UPDATE employees SET …, version = version + 1, … WHERE id = $1 AND version = $10 RETURNING *`

// MDE: audit-history — set audit fields on the mutation path
`… updated_at = now(), updated_by = $11 …`
```

This is the file header's finer-grained sibling: the header says *which capability governs this
file*; the marker says *where in the file a capability is realized*. Declaration over inference —
generation **states** the capability at its implementation site rather than leaving the verifier
to guess it from a SQL/regex shape. Capabilities that mandate an inline marker say so in their own
`## Impact`; verification checks the marker is present at the required layer and (via `[ASK]`)
that the marked code truly implements it.

### Stack-conformant source  `[feature: stack-conformant-source]`

Source follows the declared stack and project conventions. Errors and logging follow a
consistent pattern. Placeholder code is allowed only when clearly marked and
confirmed/deferred.

### Standard root operations  `[feature: standard-root-operations]`

Required operation keys (when applicable): `install`, `start`, `dev`, `build`, `test`,
`test:unit`/`test:api`/`test:ui`, `migrate`, `seed`, `db:reset`, `db:schema-dump` (when
persistence is in scope). Node stacks use `package.json` scripts; non-Node stacks commit
root-discoverable scripts/targets. The names are a contract — not buried in prose; placeholder
`echo`/`exit 0` no-ops do not satisfy it.

**`db:schema-dump` is intentionally stack-specific, not a hardcoded command.** It maps to
whatever the chosen database's own tooling produces a real, structural schema dump, or the
ORM's own introspection command where one exists. The method does not assume a database
engine anywhere; the tech-stack selection at design time records the correct command for
`db:schema-dump` in `tech-stack.md`'s Operations Map, the same way it already records
`migrate`/`seed`/`db:reset`.

### Thin routes, fat services  `[feature: thin-routes-fat-services]`

Routes/controllers remain thin. Business logic belongs in service/use-case/domain logic, not
UI handlers or route bodies. Data access belongs in repositories/adapters, not pages or route
bodies.

### Transaction boundaries  `[feature: transaction-boundaries]`

Multi-write use cases are wrapped in a single transaction (the stack's mechanism — a
`withTransaction`/`unitOfWork` helper, a transactional service method, etc.); repository methods
take the active transaction/connection. A failure mid-way **rolls back** the whole unit; no
partial commit is left behind. Transactions are not opened in routes/controllers or held open
across user think-time.

### User identity context  `[feature: user-identity]`

The identity context is a typed object created at the boundary and passed (explicitly or via a
request-scoped container) to the code that needs it. Services/use-cases receive it as input;
repositories receive whatever scope value they filter on, sourced from it. No business layer
reads identity from process globals or re-decodes a token.

## Validation checks

### App runtime scripts (mde:install/build/test/health/start/kill/db-report)  `[feature: app-runtime-scripts]`

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

### Authentication (real auth + guarded dev bypass)  `[feature: authentication]`

- Is authentication resolved at a **single boundary** producing the principal [[user-identity]]
  threads down — real verification always present (not a separate fake implementation), with the
  dev bypass as one guarded early-return, not credential handling scattered through handlers?
  · evidence: the boundary module + the bypass early-return + startup guard
  · when: static
- Are credentials verified using the **stack's recorded auth technique** (`tech-stack.md`) — never
  stored/compared in plaintext — with sessions/tokens signed and expiring, secrets from the
  environment, and unauthenticated requests rejected with `401` (distinct from authZ's `403`)?
  · evidence: `tech-stack.md` auth axis + login/verify path, token handling, env-sourced secrets, 401 vs 403
  · when: static
- Is the dev bypass **fail-closed**: off by default, unable to activate under a production config
  (startup refuses/ignores), and loud when active?
  · evidence: the bypass flag handling + the production guard + the active-bypass log/indicator
  · when: static
- Is the auth **technique** recorded in `tech-stack.md` (scheme + hashing/library) rather than an
  ad-hoc choice, and is the **real** auth path covered by at least one E2E test (not only the
  bypass)?
  · evidence: `specs/design/tech-stack.md` auth axis + an E2E test through the real login
  · when: static + requires-environment
- Does persistence realize what the **recorded mechanism** requires — for local-db, an identity
  entity with a credential aspect (hashed password column, role link) in the schema, and seeded
  users with **hashed** passwords (the bypass's seeded people as real rows)? For a non-local
  mechanism, no password column is forced (external subject id instead)?
  · evidence: identity entity `## Storage View` + migration + hashed-password seeds vs. the auth axis
  · when: static + requires-environment

```check scope=item
# Real-auth safety (POLICY, not technique): an auth/login source must not COMPARE a
# password in plaintext. Flags the classic `password === input` / `password ==`
# equality-compare smell. It does NOT prescribe a library — bcrypt/argon2/scrypt or
# the stack's chosen scheme all satisfy it by NOT doing a plaintext compare; the
# *technique* is the stack's call (tech-stack.md auth axis), the *no-plaintext* rule
# is the method's.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*(auth|login|session).*\.(ts|js|mjs)$"
THEN  $item.content NOT MATCHES "[Pp]assword\w*\s*===?\s*"
  ELSE "auth source compares a password in plaintext (`password === …`) — verify credentials via the stack's chosen hashing scheme (tech-stack.md), never a plaintext compare"
```

```check scope=item
# Bypass must be prod-guarded: an auth boundary that reads a bypass/dev flag must also
# reference a production guard (NODE_ENV/production) so the bypass can't activate in
# prod. Flags a bypass flag with no prod guard in the same file — fail-open risk.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*(auth|login|session|middleware).*\.(ts|js|mjs)$"
  AND $item.content MATCHES "(AUTH_BYPASS|BYPASS_AUTH|DEV_AUTH|authBypass|devLogin|bypass)"
THEN  $item.content MATCHES "(production|NODE_ENV|isProd|PROD)"
  ELSE "auth bypass flag present with no production guard in the same module — the bypass must fail closed (refused when NODE_ENV=production); add the prod guard"
```

### Boundary validation  `[feature: boundary-validation]`

- Does validation happen at API/UI boundaries and important business-rule boundaries
  (deterministic, testable)?
  · evidence: source at boundaries + validation tests
  · when: static

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

- Is source organized by capability/vertical slice when capability-based?
  · evidence: source directory structure
  · when: static
- Does each server slice have **one file per layer** — `<Slice>Types`, `<Slice>Repository`,
  `<Slice>Service`, `<Slice>Routes` as separate files (a slice with a Service/Routes but no
  Repository, or layers collapsed into one file, is drift)?
  · evidence: slice directory file set
  · when: static
- Does every entity operation implemented by a slice carry the `// MDE: <entity>.<op>` marker at
  its Service method **and** its Repository method (the same convention Routes already carries)?
  · evidence: marked Service/Repository methods per `entity.op`
  · when: static

```check scope=plan target=server subject="Service/Repository Operation Markers" whenFailed="are missing at Service/Repository (endpoint routed but business logic/data access undeclared)" whenPassed="are marked at Service and Repository"
# serviceMarked/repositoryMarked = the slice's Service/Repository method implementing this
#   operation carries the // MDE: <entity>.<op> marker.
# This check: a routed operation (routePresent, from capability-api-boundary) must also be
# marked at Service and Repository — not just at the Route — so the code coverage matrix
# (mde review app) can derive layer coverage from markers instead of guessing.
EVERY $op IN $plan.expectedOperations WHERE $op.routePresent IS "true"
THEN  $op.serviceMarked IS "true" AND $op.repositoryMarked IS "true"
  ELSE "operation has a marked Route but its Service/Repository method is unmarked or missing — layering gap; see ref"
```

```check scope=plan target=server
# serverSlices = one entry per src/server/<slice>/ dir (excluding shared/), with
#   hasTypes/hasRepository/hasService/hasRoutes = whether each layer file is present.
# This check: a slice with a Service must also have a Repository — data access belongs
# in its own file, not folded into the service (that's the layering being skipped).
EVERY $s IN $plan.serverSlices WHERE $s.hasService IS "true"
THEN  $s.hasRepository IS "true"
  ELSE "server slice has a Service but no Repository — data access is not in a repository (layering skipped); see ref"
```

### Request context propagation  `[feature: context-propagation]`

- Is a **single request context** (`correlationId`, `principalId`, and the transaction/connection
  where writes occur) established once at the boundary and **passed** through the service/repository
  layers — rather than each layer re-deriving its own id, principal, or transaction?
  · evidence: request-boundary source (context construction) + lower-layer signatures receiving it
  · when: static

```check scope=plan
# Judgment layer: threading is a design property a regex can't fully decide. The request
# context (correlationId + principalId + the transaction/connection for writes) is a SINGLE
# object established at the boundary and passed down — a repository sees the SAME context as
# its route. This is the invariant [[logging]] then relies on to correlate log lines.
WHEN  "server" IN $plan.loaded
ASK   "Is one request context (correlationId, principalId, and the transaction/connection where writes occur) established once at the request boundary and PASSED through the service and repository layers — so a repository operates under the SAME correlationId and transaction as its route, rather than re-deriving its own? Writes within a request must share one transaction, not open a fresh connection per repository."
```

### Cross-cutting concerns  `[feature: cross-cutting-concerns]`

- **(design)** Are cross-cutting concerns (validation, auth, logging, errors, transactions)
  explicit in the architecture rather than scattered ad hoc?
  · evidence: architecture doc
  · when: static
- **(source)** Is a **request context** (`correlationId` + `principalId` + transaction/connection)
  established at the boundary and passed through the layers as one object — not re-derived per
  layer?
  · evidence: boundary middleware building the context + service/repo signatures taking it
  · when: static (shape) + AI review (threading)

```check scope=plan
# Judgment: the ONE request context established at the boundary and threaded down.
# SOURCE check — gated on server, so a design-only plan never fires it.
# Deterministic sub-parts live in logging (labels reach logs) and transaction-boundaries
# (a transaction is used in services); this [ASK] owns that they are the SAME object
# passed through, not three re-derived values.
WHEN  "server" IN $plan.loaded
ASK   "Is there ONE request-scoped context (correlationId, principalId, and the transaction/connection) built at the request boundary and passed through the service/repository layers — rather than each layer re-deriving its own id or opening its own transaction? A single context object threaded down is the intended design."
```

### Dependency resolution (static)  `[feature: dependency-resolution]`

- Does every import/require in generated source resolve to a declared manifest dependency?
  · evidence: dependency-resolution check output
  · when: static

### Environment contract (.env — identity, ports, one DB)  `[feature: env-contract]`

- Is a `.env.example` committed with the required keys — identity (`APP_ID`,
  `APP_NAME`, `APP_VERSION`), web tier (`WEB_HOST`, `WEB_PORT`, `WEB_PORT_RANGE`),
  api tier when present, and a single `DATABASE_URL` when the app has a DB?
  · evidence: `.env.example`
  · when: static
- Are the app's port **ranges disjoint** from every other app in the project (no
  overlap between any two apps' `WEB_PORT_RANGE` / `API_PORT_RANGE`)?
  · evidence: each app's `.env.example` port ranges
  · when: static
- Does the source avoid **hardcoded ports / hosts / API-URLs** — reading `PORT`,
  the API base, and the bundler base from env instead (no `http://localhost:<port>`
  literal as an API base, no `import.meta.env.X || ''` silent-empty fallback)?
  · evidence: server/web source; api client / config
  · when: static
- Is there exactly **one** `DATABASE_URL` per environment (no required second
  test-DB in the app contract)?
  · evidence: `.env.example`
  · when: static

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

### Layering and boundaries  `[feature: layering-boundaries]`

- Do capabilities communicate only through APIs/interfaces, with no capability reaching into
  another's internals?
  · evidence: source import graph / boundaries
  · when: static
- Are layers respected (UI→API/adapter, routes→services, services own logic, repos own
  persistence)?
  · evidence: source layering
  · when: static

```check scope=plan target=server
# Boundary smell (deterministic): a capability slice must not import another slice's
# internals — capabilities talk through APIs/interfaces, not by reaching into a
# sibling's files. `$plan.crossSliceImports` is the (model-computed) set of server
# files that import a KNOWN sibling slice's dir; every member is a violation, so the
# THEN is unsatisfiable and each is reported (ref = the offending file).
EVERY $f IN $plan.crossSliceImports
THEN  $f.slice IS ""
  ELSE "server file imports another capability slice's internals — cross-slice coupling; communicate through an API/interface instead; see ref"
```

### Logging  `[feature: logging]`

- Does generated source log through one shared structured logger (not ad-hoc `console.*`),
  with consistent levels, and never logging secrets/sensitive payloads?
  · evidence: source — logger usage + the single logging setup
  · when: static
- Are the **hard-core log points** present — a line at the **request boundary in/out** and at
  **caught errors** (never swallowed) — and do request-serving log lines carry the required labels
  `correlationId` + `principalId` (from the request context)?
  · evidence: request-boundary source + error-handling + log-call labels
  · when: static

```check scope=plan target=server
# trace = every artifact the plan produced (each with a path, type, content).
# This check: no server source file may use ad-hoc console.* — only the shared logger
#   module may. (Skips the logger file itself, which wraps console, and .d.ts types.)
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/server/.*\.(ts|js)$"
  AND $t.path NOT MATCHES "(logger)\.(ts|js)$"
  AND $t.path NOT MATCHES "\.d\.ts$"
THEN  $t.content NOT MATCHES "\bconsole\.(log|info|warn|error|debug)\("
  ELSE "server source uses ad-hoc console.* — log through the shared structured logger instead; see ref"
```

```check scope=plan
# logCallBlob = only the lines that are actual logger calls / .child() context (not the
#   whole file), so a label defined in a type but never logged does NOT pass.
# This check: log calls must carry 'correlationId'. A single request-context object —
#   logger.child({ correlationId, principalId }) or ctx carrying them — satisfies it
#   (merging the fields is the intended design). Propagation across layers is the [ASK].
WHEN  "server" IN $plan.loaded
THEN  $plan.logCallBlob MATCHES "correlationId"
  ELSE "no log call carries 'correlationId' — request lines cannot be correlated (the label may be typed but is never logged); see the logging label contract + request-context pattern"
```

```check scope=plan
# This check: log calls must carry 'principalId' (see logCallBlob above) so a request
#   is attributable to its acting principal.
WHEN  "server" IN $plan.loaded
THEN  $plan.logCallBlob MATCHES "principalId"
  ELSE "no log call carries 'principalId' — a request cannot be attributed to its acting principal (the label may be typed but is never logged)"
```

```check scope=plan
# Judgment layer: log-point discipline + redaction a regex can't decide. (Context
# threading is [[context-propagation]]'s ASK, not repeated here.)
WHEN  "server" IN $plan.loaded
ASK   "Are the hard-core log points present (a line at the request boundary in/out, and caught errors logged where handled rather than swallowed) without over-logging (no per-row DB noise, no double-logging the same event across layers)? Do logs never contain secrets or full sensitive payloads (auth headers, password, token redacted)?"
```

### Related-entity display (Display Label)  `[feature: reference-display]`

- When a page shows a related entity (a reference/foreign field, picker, or join column), is it
  rendered by the related entity's **display-label** property rather than a raw `id`/UUID (a unique
  property shown only when it is the display-label property or explicitly for disambiguation)?
  · evidence: page rendering of reference fields vs. the entity property role `display-label`
  · when: static

- When a create/edit form **captures** a reference, is it a selection control (dropdown / picker /
  combobox) listing the related entity by **display-label** — labelled by the entity (`Employee`,
  `Reviewer`), not `Employee ID` / `Reviewer ID` — rather than a free-text field where the user
  types a raw id/code (`mgr-001`)?
  · evidence: form field for each reference vs. a display-label-populated select
  · when: static

- Does the repository's read query (`list`/`findById`) **`JOIN`** each referenced entity's table
  and alias its display-label column into the result, rather than selecting only the bare foreign
  id column?
  · evidence: repository SQL — a `JOIN` per foreign-key column, with an aliased display-label
    column in the `SELECT` list
  · when: static

- Does a `create`/`update` repository method or its calling service — when it already fetched the
  related entity for validation — **include that entity's display-label** in the returned/response
  shape, rather than returning the bare row (`RETURNING *`) with the display-label field left
  null/absent?
  · evidence: create/update method body — the fetched related entity's display-label flows into
    the returned object
  · when: static

```check scope=item
# Fields-vs-spec: an artifact for an entity that has a display-label must reference
# that label field, not just the id. Catches the classic "page shows employee id /
# department_id instead of the name" generation bug. $item.entity comes from the
# artifact's source.ref; the entity spec declares the display-label field.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $spec.entity[$item.entity].displayLabel EXISTS
THEN  $item.content CONTAINS-ANY $spec.entity[$item.entity].displayLabelForms
  ELSE "page for this entity does not reference its display-label field — likely showing the id, not the name"
```

```check scope=item
# Reference INPUT smell: a form that labels a reference field "<X> ID" (Employee ID,
# Reviewer ID) or renders a raw-id text input is entering references by id, not by a
# name picker. A create/edit page should choose the related entity by display-label
# in a <select>/combobox — the raw key is submitted, never typed. Flags the exact
# defect (a visible "... ID" form label on a page that has form inputs).
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $item.content MATCHES "<(input|form)"
THEN  $item.content NOT MATCHES ">\s*[A-Z][A-Za-z ]* ID\s*(\*?)\s*<"
  ELSE "form labels a reference as '<X> ID' — capture references with a name dropdown of the related entity's display-label, not a raw-id text field"
```

```check scope=item
# Repository join smell: a Repository file whose SELECT targets a foreign-key-shaped
# column (something_id) but contains NO "JOIN" anywhere in the file is very likely
# returning the bare foreign id with no way for the caller to show a name — the
# repository never fetched the referenced row at all. A file with NO foreign-key
# column in its SELECT (a leaf entity with no references) correctly never matches the
# WHEN and is not flagged. This is a smell, not a proof (a service-layer join, or a
# genuinely reference-free entity using an _id-shaped OWN column, can false-positive
# rarely) — the AI semantic pass judges borderline cases.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*Repository\.(t|j)s$"
  AND $item.content MATCHES "SELECT[\s\S]*?\w+_id\b[\s\S]*?FROM"
THEN  $item.content MATCHES "\bJOIN\b"
  ELSE "repository selects a foreign-key column (…_id) but has no JOIN anywhere in the file — the referenced entity's display-label is never fetched, so callers can only show the raw id; add a JOIN and alias the referenced table's display-label column into the SELECT"
```

```check scope=plan
# Semantic (AI judgment) — the deterministic join-smell check above can only see
# "does this file contain the word JOIN anywhere," which cannot confirm the join is
# actually WIRED to the SELECTed foreign-key column, or that a create/update method
# that already fetched the related entity (for validation) actually carries that
# entity's display-label into what it returns rather than discarding it. The AI reads
# each Repository/Service file the smell check flagged (or any create/update method
# with FK validation) and judges: does every response shape genuinely include the
# related entity's display-label, end to end, not just the word JOIN being present
# somewhere unrelated?
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES "src/server/.*(Repository|Service)\.(t|j)s$"
ASK   "In ${$t.path}: for every method that returns a row/object carrying a foreign-key reference (employee_id, project_id, manager_id, …), does the returned shape also carry that related entity's display-label (e.g. employeeName, projectName) — via a real SQL JOIN for list/read, or by threading through an already-fetched related entity for create/update — rather than leaving the caller with only the raw id? List any method whose response has a foreign-key field but no corresponding display-label field."
```

### Repository pattern  `[feature: repository-pattern]`

- Does each persistence-owning capability access the database through a repository (interface +
  implementation), with services depending on the interface and no direct DB access above it?
  · evidence: source layering (repository modules; no driver use in routes/services/pages)
  · when: static
- Does row↔domain mapping live in the repository (not leaked into services/UI)?
  · evidence: repository source
  · when: static

```check scope=plan target=server
# Layering smell (deterministic): a Service must not issue queries — SQL / the DB
# driver belongs in the Repository. Match only genuine call sites, NOT bare uppercase
# words (the trace header carries "update own profile" etc., which must not trip this):
# a .query(/.execute( call, a pool/db handle, or an SQL keyword immediately opening a
# quoted/template string. Iterates slices that actually have a Service file.
EVERY $s IN $plan.serverSlices WHERE $s.hasService IS "true"
THEN  $s.serviceFile.content NOT MATCHES "(\.(query|execute)\(|\b(pool|db|client)\.(query|execute)|(SELECT |INSERT INTO |DELETE FROM )[\"'`A-Za-z_])"
  ELSE "Service issues SQL/DB queries — data access must live in the Repository, not the Service; see ref"
```

### Source trace header  `[feature: source-trace-header]`

- Does each governed source file carry a lightweight header tracing to a capability/entity/
  page-spec/use-case/rule/instruction?
  · evidence: source file headers
  · when: static
- Where a cross-layer capability is implemented, does the implementing site carry an
  `// MDE: <capability> — <note>` marker (declared, not inferred)? Presence per layer is checked
  by the owning capability; here the marker's **form** is validated.
  · evidence: inline `// MDE:` markers at implementation sites
  · when: static

```check scope=plan
# Cross-cutting: every GOVERNED source artifact must carry a valid trace header —
# regardless of which capability produced it. So this is a scope=plan check that
# scans $plan.trace (all manifest items), not a per-item check on this capability's
# own entries. "Governed" = the app's own logic (.ts/.tsx/.js/.jsx/.mjs), NOT
# stylesheets, markup, type-declarations (.d.ts/.d.mts), or copied assets.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "\.(ts|tsx|js|jsx|mjs)$"
  AND $t.path NOT MATCHES "\.d\.(ts|mts)$"
  AND $t.path NOT MATCHES "(mde-annotate-bridge|annotations-core|annotations-router)"
THEN  $t.content MATCHES "MDE trace"
  ELSE "governed source file is missing its MDE trace header"
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "\.(ts|tsx|js|jsx|mjs)$"
  AND $t.content MATCHES "MDE trace"
THEN  $t.content MATCHES "capability\s*=\s*\S"
  ELSE "MDE trace header is invalid — it does not name a capability (capability=…)"
```

### Stack-conformant source  `[feature: stack-conformant-source]`

- Does generated source follow the declared stack + conventions, with consistent error/logging
  patterns?
  · evidence: generated source
  · when: static
- Is any placeholder code clearly marked and confirmed/deferred (not silent)?
  · evidence: placeholder markers + scope
  · when: static

### Standard root operations  `[feature: standard-root-operations]`

- Does `tech-stack.md` record an operations map, and do the referenced root commands actually
  exist and perform the operation (install/start/build/test required when applicable; dev when
  a watch mode exists; migrate/seed/db:reset when a DB is used)?
  · evidence: `$techStack.operations` (below)
  · when: static

```check scope=plan
EVERY $o IN $techStack.operations
THEN  $o.ok IS "true"
ELSE  "operation '${$o.name}' is missing from tech-stack.md's Operations Map, references a package.json script that doesn't exist, or is a placeholder no-op (echo/exit 0)."
```

### Thin routes, fat services  `[feature: thin-routes-fat-services]`

- Are routes/controllers thin, with business logic in services and data access in repositories
  (not in route bodies or UI handlers)?
  · evidence: source layering
  · when: static

### Transaction boundaries  `[feature: transaction-boundaries]`

- Does each multi-write use case run inside a single transaction owned by the service/use-case
  layer, with repositories participating (not each opening their own)?
  · evidence: service/use-case source + repository signatures
  · when: static
- Does a mid-operation failure roll back the whole unit (no partial commit), with no transaction
  opened in routes or held across user think-time?
  · evidence: transaction-handling source + a failure-path test
  · when: static (code) + requires-environment (failure test)

<!-- Deterministic part is only "the MECHANISM exists" — a transaction helper
     (withTransaction/unitOfWork/BEGIN) is present in the source when persistence is in
     scope. "Every MULTI-WRITE use case uses it, with rollback, repos participating" is
     NOT reliably greppable (it needs to know which use cases do >1 write), so it is an
     [ASK]. We deliberately do not fake a deterministic assertion we cannot trust. -->
```check scope=plan
# serviceBlob = the concatenated source of the service layer (src/server/*Service.ts).
# This check: a transaction must actually be USED in a service — a call to a helper
#   (withTransaction/unitOfWork/…) or a request context carrying it (ctx.tx, tx.query).
#   A helper merely DEFINED in db.ts that no service calls doesn't count. Whether each
#   multi-write use case is atomic (rollback, repos participating) is the [ASK] below.
WHEN  "persistence" IN $plan.loaded
THEN  $plan.serviceBlob MATCHES "(withTransaction|unitOfWork|beginTransaction|runInTransaction)\s*[(<]|\b(ctx|context)\.(tx|trx|transaction|connection)\b|\b(tx|trx)\.(query|commit)\b"
  ELSE "no transaction is used in the service layer (a helper/context.tx may be defined but no use case wraps its writes) — multi-write use cases are not atomic; see transaction-boundaries + the request-context pattern"
```

```check scope=plan
# Judgment layer: the boundary is correct, not just present.
WHEN  "persistence" IN $plan.loaded
ASK   "Does each MULTI-WRITE use case run inside ONE transaction owned by the service/use-case layer (repositories accept the active connection, not each opening their own), with a mid-operation failure rolling back the whole unit and no transaction opened in routes or held across user think-time?"
```

### User identity context  `[feature: user-identity]`

- Is there a single identity/principal context object (user, roles, tenant) built at the
  boundary and passed through the layers — not read from globals or re-derived deeper down?
  · evidence: source — where the context is constructed and how it is propagated
  · when: static
- Does the shared access enforcer consume this context (rather than building its own identity),
  and do services/repositories receive identity/scope as input?
  · evidence: enforcer + service/repository signatures
  · when: static
