---
type: feature
id: code-coverage-matrix
title: Code coverage matrix (Entity × Operation × Layer)
origin: mde
impacts:
  - documentation
default: n/a
---

# Code coverage matrix (Entity × Operation × Layer)

## Purpose

A single consolidated view of **implementation** coverage — for every entity operation
(CRUD **and** lifecycle), which application layers actually implement it: UI, API, Service,
Repository, DB. This measures whether the **code exists** at each layer, distinct from
whether it is **tested** (that is test coverage, `coverage-threshold`/`gherkin-traceability`).

It is a **derived report**, not a new source of truth: every cell is read from markers the
other features already mandate — the `// MDE: <entity>.<op>` markers at Route
(`capability-api-boundary`), Service and Repository (`capability-vertical-slices`), the panel
`operations:` list (`operation-coverage`) for UI, and the entity's `## Storage View` for the
DB table/column. So the matrix restates what is already true in source into one scannable
grid; it invents no coverage of its own. A cell missing here is the *same* gap the owning
feature's own check already flags — the matrix is the index, those checks are the authority.

## Impact on documentation

When source implementing entity operations is in scope, produce the code-coverage matrix as a
report: **rows = entity operations** (`<entity>.<op>`, CRUD + lifecycle from the entity
`## Operations`), **columns = UI / API / Service / Repository / DB**, each cell marked present
or missing, derived from the markers above. Where a row has a marked Route but a missing
Service/Repository mark, that is a layering gap (owned by `capability-vertical-slices`); a row
missing entirely at a layer is a coverage gap. The matrix is **regenerated from current
source**, never hand-maintained — it is a view that re-derives, like the ERD.

`mde review app` surfaces this matrix as the CRUD sub-section of its Coverage report (it runs
the applicable targets' checks and consolidates); the matrix is where "which layers implement
each operation" is read off at a glance across the whole app.

## Template impact

- `code-coverage` report template → the Entity × Operation × Layer grid (markdown table),
  regenerated from source markers.

## Checks

- When source implementing entity operations is in scope, is the code-coverage matrix present
  as a report (rows = entity operations, columns = UI/API/Service/Repository/DB), each cell
  derived from the `// MDE: <entity>.<op>` markers and Storage View — not hand-maintained?
  · evidence: the code-coverage report (e.g. `reports/evidence/code-coverage.md`) vs. the source markers
  · when: static
- Is the matrix **current** with the source it is derived from — every entity operation present
  as a row, and each cell agreeing with the marker actually in source (no cell claimed present
  whose marker is absent, nor missing whose marker exists)?
  · evidence: matrix cells re-derived from current source markers
  · when: static
