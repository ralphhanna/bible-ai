---
type: feature
id: repository-pattern
title: Repository pattern
origin: mde
impacts:
  - architecture
  - server
  - persistence
default: n/a
---

# Repository pattern

## Purpose

Persistence is reached through **repositories** — a per-capability data-access boundary — so
domain/service code never issues raw queries or depends on the driver. This makes the
data-access style explicit rather than implicit, and is what the persistence-integration test
exercises.

## Impact on architecture

Each capability that owns persistence exposes a **repository** (or equivalent data-access
interface): services/use-cases depend on the repository interface, the repository owns the SQL
/ driver / mapping, and nothing above it touches the database directly. This is the concrete
form of the layering rule "repositories/adapters own persistence" — the repository is that
boundary.

## Impact on server

Generated data-access code lives in repository modules (e.g. `src/server/<cap>/Repository.ts`
or the stack equivalent), not inline in routes, services, or pages. Mapping between rows and
domain shapes lives in the repository. Routes/services call repository methods, not the driver.

## Impact on persistence

The repository is the single place the schema is queried for its capability — so schema
changes have one consumer to update, and the persistence-integration test drives the **real**
repository against the **real** schema (see `persistence-integration-test`).

## Checks

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
