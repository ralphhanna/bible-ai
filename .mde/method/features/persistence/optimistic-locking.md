---
type: feature
id: optimistic-locking
title: Optimistic locking
origin: mde
impacts:
  - persistence
  - persistence-design
  - api
aspects:
  - optimistic-locking | entity
default: n/a
---

# Optimistic locking

## Purpose

Concurrent updates to the same record must not silently overwrite each other. When an entity
is concurrently editable, it carries a **version** and updates are guarded by it — a stale
update is rejected, not lost.

## Impact on persistence-design

An entity that is concurrently editable declares a **version field** in its `## Storage View`
(e.g. an integer `version` or a `row_version`/`updated_at` used as a concurrency token). The
design records which entities require optimistic locking and which token they use (the default
is no locking — it is opt-in per entity, with a reason when an editable entity omits it).

## Impact on persistence

The schema includes the version column; every UPDATE is conditioned on the version the client
read (`WHERE id = ? AND version = ?`) and **increments** it. A zero-row update result means the
record changed under the caller — a **conflict**, surfaced to the caller, never a silent
no-op. Migrations add the version column with a sane default for existing rows.

## Impact on server

The version-guarded UPDATE in the repository carries the inline marker
`// MDE: optimistic-locking — …` at the statement that guards + increments the version (see
`source-trace-header`), so the capability is **declared** at its implementation site, not
inferred from the SQL shape. Locking is a vertical slice — schema column → repository
guard/increment → service conflict → API 409 → a conflict test — and the repository site is the
anchor that must be marked.

## Impact on api

An update whose version no longer matches returns a **conflict** response (HTTP 409 or the
stack equivalent) carrying the current state, not a 200 — so the client can re-read and retry.
The API does not last-write-wins silently.

## Checks

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
