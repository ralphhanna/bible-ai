---
type: feature
id: capability-api-boundary
title: Capability API boundary
origin: mde
impacts:
  - api
  - architecture
default: n/a
---

# Capability API boundary

## Purpose

Each capability exposes its own API boundary when implemented; endpoints map to capability use
cases, not random database operations.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-01 (Paths and operations)


## Impact on api

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

## Impact on architecture

The API boundary is the only sanctioned cross-capability edge (see `layering-boundaries`); its
existence also flips that capability's pages to the real API (see `data-source-switch`).

## Audit

Judge whether each endpoint **does real work end to end**, not whether a route merely exists.
A route that returns hardcoded/canned data, or handles the request without ever touching the
database, is a shell that passes shape checks while doing nothing.

For each declared operation, call the endpoint against the running app and:

- **Mutate, then verify persistence independently.** POST/PUT/DELETE, then read the record
  back via a *separate* GET (or the DB report) — the change must be there. A write the next
  read can't see never reached the data store.
- **Confirm the data path in the log.** A real request should leave route → service →
  repository / a DB query in the server log. A response with no corresponding DB activity is
  serving canned data.
- **Try an invalid call.** A bad payload / missing field should be rejected with a sane
  status, not swallowed — a route that accepts anything isn't validating.

Report each endpoint as **live** (persists + shows a DB-backed path in the log) or **hollow**
(responds but nothing persists / no DB activity). "The route responds 200" is not a pass.

## Checks

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
