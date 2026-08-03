---
type: target
id: TARGET-API
title: API Target Profile
applies_when:
  - a plan creates or modifies backend/API endpoints
  - a capability declares or changes an API boundary
requires:
  - testing
  - documentation
---

# API Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

APIs are the integration boundary for capabilities.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| route | src/server/{cap}/{Cap}Routes.ts | business-capability | always |
| service | src/server/{cap}/{Cap}Service.ts | business-capability | always |
| types | src/server/{cap}/{Cap}Types.ts | business-capability | always |
| rule-enforcement | src/server/{cap}/{Cap}Service.ts (validation) | business-rule | always |
| shared-infra | src/server/shared/ | — | always |
| auth-endpoint | src/server/shared/auth/ (login/logout route) | — | auth-in-scope |
| openapi-contract | openapi.yaml | — | always |

## Composed behavior

### App start contract — start script + health round-trip  `[feature: app-start-contract]`

The API app provides the **`mde:start`** script (ports from `.env`; resolves a busy port by ownership,
not blind kill) and the **`GET /__mde/health`** endpoint that echoes the token from
`.mde/runtime/health-token`. The API's port comes from `.env` (e.g. `PORT`/`FAKE_API_PORT`), not a
hardcoded default. A caller can prove the running API belongs to this folder via the round-trip.

### Authentication (real auth + guarded dev bypass)  `[feature: authentication]`

Each request is authenticated at the boundary before the handler runs:

- A **login endpoint** verifies the credential and issues a session/token; subsequent requests
  carry it and it is validated — an unauthenticated/invalid request is rejected with **`401`**. The
  resolved principal is attached to the request for [[user-identity]] and the access enforcer.
- **AuthN vs authZ status codes:** unauthenticated (no/invalid identity) is **`401`**;
  authenticated-but-not-permitted (authZ, the enforcer) is **`403`** — keep them distinct.
- When the dev bypass is active, the boundary attaches the seeded principal and skips the `401`
  gate — endpoints behave identically downstream because the principal shape is unchanged.

### Base-path routing — one model for dev and Apache deploy  `[feature: base-path-routing]`

The API mounts under a **path prefix** (e.g. `/<app>/api`), read from config — not rooted at `/`.
Cookies/CORS/redirects are path-aware so they work behind the folder. The API is reachable at its
prefix both on its dev port (via the proxy) and under Apache.

Because the frontend calls the API **same-origin** through the proxy (see web-ui), the API does
**not** rely on CORS for the app to function — a same-origin request needs none. A hardcoded
single-origin allow-list (e.g. only the standalone dev port) is a portability smell: it signals
the frontend is calling cross-origin, which breaks under the framed/proxied origin. Prefer
same-origin; where cross-origin is genuinely needed, the allow-list is config-driven, not a
literal that only matches the standalone case.

### Boundary validation  `[feature: boundary-validation]`

API endpoints validate request contracts deterministically; validation failures are testable
and return useful responses.

### Business-rule responses  `[feature: business-rule-responses]`

Business-rule failures (from the rules in business specs) return useful responses with
intentional status codes. The API test suite covers a business-rule-failure path.

**A rule rejection must identify the rule it violated (structured, machine-checkable).** The
error response for a business-rule failure carries, in a **structured field** (e.g.
`error.rule` / `code` / `violation`), the **concept id of the violated rule** — its catalogue
path minus `.md`, e.g. `specs/business/capabilities/project-staffing/business-rules/assignment-conflict-check`
— plus a human-readable reason. Not a bare status code, not a free-text message alone: the
consumer (and the business-rule test) must be able to assert *which* rule fired by reading a
stable field, not by string-matching prose. This is what lets a business-rule test prove the
*specific* rule discriminates rather than that the endpoint refused something. One rejection
identifies exactly one rule (the first/violated one); the reason names the concept id somewhere
in the response body.

### Capability API boundary  `[feature: capability-api-boundary]`

Each capability exposes its own API boundary (`src/server/<cap>/Routes.ts` or stack
equivalent). Endpoints map to capability use cases. Cross-capability access goes through APIs or
defined interfaces, not internals. APIs do not expose internal persistence details
unnecessarily.

**Every entity operation has an endpoint.** Each operation a role may perform — CRUD **and**
lifecycle (submit/approve/close/cancel/…), from the entity's `## Operations` — is implemented by
a route handler, and that handler declares the operation with the inline marker
`// MDE: <entity>.<op> — …` (see `source-trace-header`). Routes express operations as verb+path
(`router.post('/reviews/:id/submit')`), so the marker is what ties a handler to its operation id
without guessing. This is the API twin of the test-coverage requirement (`gherkin-traceability`):
the **same** operation set must have both a route (here) and a `.capability` scenario (there). An
operation with no marked route is an uncovered endpoint — the API does not implement it.

### Endpoint contracts  `[feature: endpoint-contracts]`

Each endpoint has explicit request and response contracts. APIs do not expose internal
persistence details unnecessarily. Authorization/authentication requirements are explicit when
in scope (enforced by the shared enforcer — see `shared-access-enforcer`).

### Environment contract (.env — identity, ports, one DB)  `[feature: env-contract]`

The API client reads `VITE_API_URL` / `API_HOST` + `API_PORT` from the injected
process env rather than hardcoding an API host/port or a `http://localhost:<port>`
literal. (This is the same same-origin, config-sourced rule the `base-path-routing`
capability enforces for the API base.)

### OpenAPI contract  `[feature: openapi-contract]`

**Generate `openapi.yaml` from the real routes, not by hand.** Each marked route
(`// MDE: <entity>.<op>`, see `capability-api-boundary`/`source-trace-header`) contributes one
OpenAPI operation: path, method, parameters, request body, response schemas (from
`endpoint-contracts`), status codes (from `status-code-discipline`/`business-rule-responses`), and
the security scheme (from `authentication`) when auth is in scope. A hand-written `openapi.yaml`
that is never regenerated from the routes is exactly the drift this feature exists to prevent —
the artifact is generated output, not authored prose.

**Pin the supported OpenAPI version.** Declare the exact OAS version (e.g. `3.1.0`) the generated
document targets, recorded once (e.g. in the API's package.json or a generation config), so the
generator and any consuming tooling agree on the schema dialect.

**Validate the implementation against its own contract.** A conformance test (or the same suite
`gherkin-traceability`/`contract-and-failure-tests` already runs) checks that real requests/
responses match the generated schemas — a contract nobody validates against is decorative,
the same failure mode `gherkin-traceability` bans for `.feature` files that never run.

Documentation/client/test support (a Swagger UI page, a generated client, contract-test
scaffolding) are optional derived outputs — useful, never required to satisfy this feature.

### Optimistic locking  `[feature: optimistic-locking]`

An update whose version no longer matches returns a **conflict** response (HTTP 409 or the
stack equivalent) carrying the current state, not a 200 — so the client can re-read and retry.
The API does not last-write-wins silently.

### Related-entity display (Display Label)  `[feature: reference-display]`

**The API response carries the display-label, not just the foreign id.** If the UI must render
a related entity's name (impact on web-ui, above), the API response for that resource must
already include it — a UI that has to make a second lookup to resolve a foreign id into a name
is drift; the display-label is a property of the response shape, not something the client
derives. This holds for **every** endpoint that returns the referencing resource, not only
`list`/`read`: a `create`/`update` response is a defect if it omits the display-label of an
entity it just validated and referenced, forcing the caller to fall back to the raw id (e.g.
`row.employeeName ?? row.employeeId` in the UI) until the next refetch.

### Request/response validation  `[feature: request-response-validation]`

Validation happens at the API boundary; validation failures are deterministic and testable
(see `boundary-validation`). The API test suite covers a validation-failure path.

### Shared access enforcer  `[feature: shared-access-enforcer]`

On the real API the same enforcer is **binding** (a guard), applying the recorded row-filter
predicate per operation.

### Status code discipline  `[feature: status-code-discipline]`

Status codes are intentional and consistent across endpoints. API tests cover the happy path,
validation-failure path, business-rule-failure path, and not-found/conflict path where
applicable.

### Test correlation id (tests prove they hit the server)  `[feature: test-correlation-id]`

The request boundary reads an **inbound** `X-Correlation-Id` header as the request's
correlation id (generating one only when the header is absent, so production is
unaffected), and logs it at the boundary. The recording itself is already guaranteed by
[[logging]]'s boundary log point — this feature only requires the id be sourced from the
inbound header so a test's id appears in the server's own log.

### Thin routes, fat services  `[feature: thin-routes-fat-services]`

API routes delegate to services/use-cases; they do not embed business logic or direct
persistence.

### User identity context  `[feature: user-identity]`

Each request resolves the identity context at the boundary (from the authenticated session /
token — auth itself is out of scope here) and makes it available to the handler. Endpoints that
enforce access do so via the enforcer reading this context, not via ad-hoc checks.

## Validation checks

### App start contract — start script + health round-trip  `[feature: app-start-contract]`

- Does the app provide a contracted **`mde:start`** script that reads its ports from `.env` (not
  hardcoded) and resolves a busy port by ownership rather than blind-killing?
  · evidence: `package.json` `mde:start` (or stack equivalent) reading `.env`
  · when: static
- Does the app expose **`GET /__mde/health`** returning both **identity**
  (`status: pass|warn|fail`, `app` = `APP_ID`, `component` = `web`/`api`) and
  **ownership** (the token written to `.mde/runtime/health-token`, plus the app-root
  folder)? Identity lets a caller verify *which app/tier* answers a port before
  loading it; the token round-trip proves the app belongs to *this folder*.
  · evidence: health handler returning status/app/component + echoing
    `.mde/runtime/health-token`; a round-trip test
  · when: static (handler) + requires-environment (round-trip against a running app)
- On a port conflict, is it resolved by **ownership** (reuse if ours; free/reassign if foreign), never
  by killing whatever holds the port?
  · evidence: `mde:start` conflict-handling path
  · when: static
- For a split web+api app, does the contracted start bring up **every tier** (web dev server **and**
  API) in one command — not just one tier?
  · evidence: `mde:start`/`dev:full` composing both tiers (e.g. `concurrently "npm:dev" "npm:dev:web"`);
    both ports listening after one invocation
  · when: static (script) + requires-environment (both ports up after start)
  · why: the workbench Start invokes one command and embeds the web port; a one-tier start leaves the
    app half-running and times out the poll

```check scope=plan
# WB start contract (deterministic): a plan that produces a runnable app (server/web
# source or a package.json) must define the contracted `mde:start` script the
# workbench invokes — without it the WB Start button has nothing to call. Reads the
# produced package.json content.
WHEN $plan.producesRunnableApp IS "true"
THEN  $plan.packageJson MATCHES "\"mde:start\"\s*:"
  ELSE "no contracted 'mde:start' script in package.json — the workbench Start button has no entry point to launch the app"
```

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

### Base-path routing — one model for dev and Apache deploy  `[feature: base-path-routing]`

- Does the web app take its base path from config (bundler `base` + router `basename` + API base
  URL), with **no hardcoded root** for assets/routes/API calls?
  · evidence: build config + router setup reading the base; assets resolve under the folder
  · when: static
- **No hardcoded API host.** Does the web source avoid absolute cross-origin API URLs
  (`http://localhost:<port>`, `http://127.0.0.1:<port>`, any literal `host:port`) as the API
  base — calling the API SAME-ORIGIN at the base-relative `<base>/api/…` instead?
  · evidence: api client / config; grep the web source finds no absolute API host literal
  · when: static
- **API base has no silent empty fallback.** Does the API base resolve to the app's origin +
  base path (not `import.meta.env.VITE_X || ''` → root-relative `/api` that would hit the proxy
  origin), and is any bundler env var it reads placed in the **bundler's env dir** (Vite `root`),
  not a directory the bundler does not scan?
  · evidence: api base construction; the bundler env file location matches the bundler root
  · when: static
- Does the API mount under a configurable path prefix (not assume `/`), path-aware for
  cookies/CORS/redirects?
  · evidence: API bootstrap reading the prefix; a route reachable under the prefix
  · when: static (mount) + requires-environment (reachable under the prefix behind the proxy)
- **CORS is not a single-origin literal.** Does the API avoid a hardcoded single-origin CORS
  allow-list (e.g. only the standalone dev port) — relying on same-origin, or a config-driven
  allow-list — so the app is not broken when framed/proxied at a different origin?
  · evidence: CORS config source; no literal single-origin that only matches the standalone case
  · when: static
- Does the same build/config work **both** on a dev port behind the workbench proxy **and** under
  Apache folders (one model, no dev-only assumptions)?
  · evidence: base path sourced once from config; verified via the app-start health round-trip at the
    based path
  · when: requires-environment

### Boundary validation  `[feature: boundary-validation]`

- Does validation happen at API/UI boundaries and important business-rule boundaries
  (deterministic, testable)?
  · evidence: source at boundaries + validation tests
  · when: static

### Business-rule responses  `[feature: business-rule-responses]`

- Do business-rule failures return useful responses that **identify the violated rule in a
  structured field** (its concept id, not just a status code or prose), with an API/business-rule
  test that asserts on that field?
  · evidence: rule-handling code emits a structured error carrying the rule's concept id +
    a `tests/business-rules/` scenario whose reject assertion reads that field
  · when: static (code + assertion) + requires-environment (test run)

### Capability API boundary  `[feature: capability-api-boundary]`

- Does each implemented capability expose its own API boundary, with endpoints mapping to use
  cases and cross-capability access only through APIs?
  · evidence: `src/server/<cap>/` routes
  · when: static
- Does **every entity operation** (CRUD **and** lifecycle) have a route handler implementing it,
  marked `// MDE: <entity>.<op>`? (The API twin of `gherkin-traceability` over the same
  operation set.)
  · evidence: a marked route handler per `entity.op`
  · when: static

```check scope=plan target=api subject="API End-Points" whenFailed="are missing (no route implements the operation)" whenPassed="are implemented"
# expectedOperations = every operation declared in the entity specs, CRUD and lifecycle.
# routePresent = a route implements this operation (it has the // MDE: <entity>.<op>
#   marker, or a matching HTTP verb + path). "true" means the endpoint exists.
# This check: every operation must have an endpoint. Missing one is a real coverage gap.
EVERY $op IN $plan.expectedOperations
THEN  $op.routePresent IS "true"
  ELSE "no API endpoint implements this operation (no route found, marked or verb-mapped); see ref"
```

```check scope=plan target=api subject="Operation Markers" whenFailed="routes are unmarked (endpoint exists but no // MDE: marker)" whenPassed="routes are marked"
# routeMarked = a route carries the explicit // MDE: <entity>.<op> marker declaring it.
# This check: an endpoint that exists (routePresent) must also be marked, so its
# operation is declared, not just inferred. Unmarked = a traceability gap, not a missing
# endpoint.
EVERY $op IN $plan.expectedOperations WHERE $op.routePresent IS "true"
THEN  $op.routeMarked IS "true"
  ELSE "endpoint exists but is not marked // MDE: <entity>.<op> — the route is present (see ref) but its operation is not declared; add the marker for traceability"
```

### Endpoint contracts  `[feature: endpoint-contracts]`

- Are request/response contracts explicit per endpoint, without leaking internal persistence
  detail?
  · evidence: route/controller contracts + API tests
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

### OpenAPI contract  `[feature: openapi-contract]`

- Is `openapi.yaml` generated from the real routes (one operation per marked `entity.op`), rather
  than hand-authored and never regenerated?
  · evidence: `openapi.yaml` operations vs. marked routes in `src/server/*/Routes.ts`
  · when: static
- Does the generated document declare a pinned OpenAPI version?
  · evidence: `openapi.yaml` `openapi:` field
  · when: static
- Is the implementation validated against the generated contract (a conformance test asserts real
  requests/responses match the declared schemas)?
  · evidence: contract-test run + captured output
  · when: requires-environment

```check scope=plan target=api subject="OpenAPI Operations" whenFailed="operations have no entry in openapi.yaml" whenPassed="operations are declared"
# expectedOperations = every operation declared in the entity specs, CRUD and lifecycle.
# openApiDeclared = the generated openapi.yaml declares a path+method for this operation
#   (derived from its marked route, same trace-join as capability-api-boundary).
# This check: every implemented operation must appear in the machine-readable contract.
EVERY $op IN $plan.expectedOperations WHERE $op.routeMarked IS "true"
THEN  $op.openApiDeclared IS "true"
  ELSE "operation has a route but no matching openapi.yaml entry — the machine-readable contract is out of date; regenerate it from the routes; see ref"
```

### Optimistic locking  `[feature: optimistic-locking]`

- Does each concurrently-editable entity declare a version token in its `## Storage View`
  (or explicitly omit locking with a reason)?
  · evidence: entity Storage View vs. the editable-entity list
  · when: static
- Are UPDATEs version-guarded (conditioned on the read version, incrementing it) so a stale
  write is rejected rather than overwriting?
  · evidence: repository/SQL update path
  · when: static
- Does a version mismatch return a conflict response (not 200) carrying current state?
  · evidence: API conflict-path code + a `.capability` conflict scenario
  · when: static (code) + requires-environment (test run)

<!-- Spec-driven (scope=plan): fires for every touched entity whose spec DECLARES
     locking — not keyed on the manifest capability tag. Deterministic layers: schema
     version column (via allColumnsPresent) + repository version-guarded/incrementing
     UPDATE carrying the // MDE: optimistic-locking marker (joined to the entity's repo
     via the manifest trace, matched against the entity's own table). The [ASK] covers
     the layers a regex cannot judge: service/API surface the conflict (409, current
     state) and a conflict test proves a stale write is rejected. -->
```check scope=plan subject="Version Columns" whenFailed="lockable entities are missing the version column in the schema" whenPassed="lockable entities have the version column"
# locked = the entity's spec declares the Version / optimistic-locking aspect.
# allColumnsPresent = the migration table has every Storage-View column (incl. version).
# This check (schema layer): a locked entity's table must carry the version column.
EVERY $e IN $plan.expectedTables WHERE $e.locked IS "true"
THEN  $e.allColumnsPresent IS "true"
  ELSE "locked entity's table is missing its version column; see ref"
```

```check scope=plan subject="Locking Enforcement" whenFailed="lockable entities do not enforce version-guarded updates" whenPassed="lockable entities enforce version-guarded updates"
# lockingRealized = the entity's repository UPDATE guards on the read version and
#   increments it (WHERE …version=… , version=version+1) AND marks the site with
#   // MDE: optimistic-locking (a version column with no enforcement doesn't count).
# This check (code layer): locking must be enforced in the repository, not just declared.
EVERY $e IN $plan.expectedTables WHERE $e.locked IS "true"
THEN  $e.lockingRealized IS "true"
  ELSE "locked entity's repository UPDATE is not version-guarded/incrementing (WHERE …version=… , version=version+1), or is missing the // MDE: optimistic-locking marker — version column without enforcement; see ref"
  ASK "For ${$e.entity}: does a stale-version update surface a CONFLICT end-to-end (service raises it, API returns 409 with current state, not a silent 200), and is there a conflict test proving a stale write is rejected?"
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

### Request/response validation  `[feature: request-response-validation]`

- Are validation failures deterministic and testable, with an API test covering a validation-
  failure path?
  · evidence: validation code + `.feature` validation-failure scenario
  · when: static (code) + requires-environment (test run)

### Shared access enforcer  `[feature: shared-access-enforcer]`

- Is access enforced by one shared enforcer reading entity operations + recorded scope
  filters (soft in prototype, binding on real API), not bespoke per-capability ACL?
  · evidence: enforcer source consumed by prototype + API
  · when: static
- Is **every entity operation** ACL-enforced — present in the enforcer, with the enforcer's
  permitted roles covering the spec's `## Operations` "Permitted roles"?
  · evidence: enforcer operation→roles map vs. entity `## Operations`
  · when: static
- Are the row-level **Scope** rules (e.g. "employees who report to the acting manager") applied
  as the recorded row-filter predicate per operation?
  · evidence: scope predicate in the enforcer/service
  · when: static (presence) + AI review (correctness)

```check scope=plan target=api subject="Access Controls" whenFailed="operations have no permission check (any caller can perform them)" whenPassed="operations are access-controlled"
# expectedOperations = every operation declared in the entity specs (CRUD + lifecycle).
# aclEnforced = the operation's id appears in the shared access enforcer, so a permission
#   check runs for it (the enforcer decides which roles may perform it).
# This check: every operation must have a permission check. An operation the enforcer
# doesn't list has NO permission check — any caller can perform it (a security hole).
EVERY $op IN $plan.expectedOperations
THEN  $op.aclEnforced IS "true"
  ELSE "operation has no permission check — its id is absent from the shared access enforcer, so any caller can perform it (no access control); see ref"
```

```check scope=plan target=api subject="Access Roles" whenFailed="operations allow the wrong roles (drift from the spec)" whenPassed="operations allow the specified roles"
# rolesMatch = the roles the enforcer allows for this operation cover the roles the
#   entity spec's ## Operations "Permitted roles" lists (role labels matched to code slugs).
# This check: an operation that HAS a permission check must allow the roles the business
#   specified — no drift. (Only runs for operations that have a permission check; the
#   coverage check above owns the ones that have none.)
EVERY $op IN $plan.expectedOperations WHERE $op.aclEnforced IS "true"
THEN  $op.rolesMatch IS "true"
  ELSE "the permission check allows a different role set than the spec's permitted roles for this operation — access drift from ## Operations; see ref"
```

```check scope=plan
# Row-level scope is judgment, not greppable. SOURCE/API concern (the enforcer is code
# on the real API), so gate on api — a design-only plan (no api loaded) never fires it.
WHEN  "api" IN $plan.loaded
ASK   "Are the entity ## Operations 'Scope' rules (e.g. 'employees who report to the acting manager', 'the acting employee') applied as a row-filter predicate per operation on the real API — not just the role check? Point to where each scoped operation restricts rows."
```

### Status code discipline  `[feature: status-code-discipline]`

- Are status codes intentional and consistent, with API tests for happy / validation-failure /
  rule-failure / not-found-or-conflict paths?
  · evidence: `.feature` API scenarios + responses
  · when: requires-environment

### Test correlation id (tests prove they hit the server)  `[feature: test-correlation-id]`

- Do tests that drive the running app send `X-Correlation-Id: <TestID>+<RunId>` on their
  requests, with the RunId injected by `mde:test` (not hardcoded)?
  · evidence: test/support source setting the header; `mde:test` injecting the run id
  · when: static

- For each test claimed **passed** that drives the app, does a line carrying its
  `<TestID>+<RunId>` appear in this run's captured server log — proving the test reached
  the server, not just that a `.feature`/test file exists?
  · evidence: the preserved server log (per [[captured-command-output]]'s LOG_PATH) cross-referenced with the test report
  · when: requires-environment

<!-- correlationId.serverReadsHeader is model-computed: the request-boundary source reads
     an inbound X-Correlation-Id header (not only server-generated), so a test-set id can
     appear in the server log. Static-checkable from the boundary source; the per-test
     log correlation itself is requires-environment (needs a real run) and is the ASK. -->
```check scope=plan target=api
WHEN  $plan.correlationId.serverPresent IS "true"
THEN  $plan.correlationId.serverReadsHeader IS "true"
  ELSE "the request boundary does not read an inbound X-Correlation-Id header — a test's correlation id can never appear in the server log, so tests cannot be proven to have reached the app. Source the request's correlation id from the inbound header (generate one only when absent)."
```

### Thin routes, fat services  `[feature: thin-routes-fat-services]`

- Are routes/controllers thin, with business logic in services and data access in repositories
  (not in route bodies or UI handlers)?
  · evidence: source layering
  · when: static

### User identity context  `[feature: user-identity]`

- Is there a single identity/principal context object (user, roles, tenant) built at the
  boundary and passed through the layers — not read from globals or re-derived deeper down?
  · evidence: source — where the context is constructed and how it is propagated
  · when: static
- Does the shared access enforcer consume this context (rather than building its own identity),
  and do services/repositories receive identity/scope as input?
  · evidence: enforcer + service/repository signatures
  · when: static
