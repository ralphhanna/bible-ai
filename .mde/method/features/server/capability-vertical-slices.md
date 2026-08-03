---
type: feature
id: capability-vertical-slices
title: Capability vertical slices (source)
origin: mde
impacts:
  - server
  - architecture
  - documentation
default: n/a
---

# Capability vertical slices (source)

## Purpose

When the app is capability-based, source is organized by capability/vertical slice — matching
the architecture's slices.

## Impact on server

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

## Impact on documentation

The Service/Repository `// MDE: <entity>.<op>` markers, together with the Route marker
(`capability-api-boundary`) and the UI panel's `operations:` list (`operation-coverage`), are the
source the **code-coverage matrix** (`code-coverage-matrix`) is derived from — the Entity ×
Operation × Layer grid that shows which layers implement each operation.

## Impact on architecture

The source layout realizes the architecture's capability slices (see `capability-slices`).

## Audit

Judge whether the server slice **does real work end to end** — route → service → repository →
database — not whether the files merely exist. Drive the running app and inspect its own log.

For each capability's operations: call the endpoint, then verify the effect **independently** —
a mutation (POST/PUT/PATCH/DELETE) must be visible via a separate read (GET or the db-report),
and the run's server log must show the request reaching route → service → repository / a real DB
query. A route that returns canned data, mutates nothing, or handles the request without touching
the database is a hollow slice that passes shape checks while doing nothing. Also check the layers
are real: a "service"/"repository" that is a pass-through with the logic inlined in the route, or a
repository that returns hardcoded rows instead of querying, is a slice in name only. Try an invalid
call — a bad payload should be rejected with a sane status, not swallowed.

Report each slice as **live** (persists + shows a real DB-backed route→service→repository path in
the log) or **hollow** (responds but nothing persists / no DB activity / layers are nominal). "The
route responds 200" and "the files are present" are not passes.

## Checks

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
