---
type: feature
id: transaction-boundaries
title: Transaction boundaries
origin: mde
impacts:
  - architecture
  - server
  - persistence
default: n/a
---

# Transaction boundaries

## Purpose

A use case that performs multiple writes either commits **all** of them or **none** — the
transaction boundary is explicit and owned by one layer, not scattered across repositories.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-08 (Cross-cutting concepts)


## Impact on architecture

The **service / use-case layer owns the transaction**: a use case that mutates more than once
(or across repositories) opens a transaction, and all its writes participate in it. Repositories
**accept** a transaction/connection rather than each opening their own — so the boundary is the
business operation, not the individual query. Read-only use cases need none.

## Impact on server

Multi-write use cases are wrapped in a single transaction (the stack's mechanism — a
`withTransaction`/`unitOfWork` helper, a transactional service method, etc.); repository methods
take the active transaction/connection. A failure mid-way **rolls back** the whole unit; no
partial commit is left behind. Transactions are not opened in routes/controllers or held open
across user think-time.

## Impact on persistence

The repository layer participates in the caller's transaction (same connection) rather than
auto-committing per call, so the service's boundary is honoured at the database.

## Checks

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
