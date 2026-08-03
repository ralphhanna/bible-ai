---
type: feature
id: openapi-contract
title: OpenAPI contract
origin: mde
impacts:
  - api
default: n/a
---

# OpenAPI contract

## Purpose

The API's request/response contracts (`endpoint-contracts`) exist as real code and route markers,
but nothing machine-readable describes them app-wide. A governed, generated `openapi.yaml` is that
single machine-readable contract — for client generation, documentation, and conformance testing —
derived from the real routes rather than hand-maintained prose that drifts from the code.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-07 (Machine-readable OpenAPI artifact)
  - API-OAS-08 (Validate implementation against OpenAPI)
  - API-OAS-09 (Generate documentation/client/test support)
  - API-OAS-10 (Pin supported OpenAPI version)

## Impact on api

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

## Checks

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
