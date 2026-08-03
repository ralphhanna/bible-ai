---
type: feature
id: cross-cutting-concerns
title: Cross-cutting concerns
origin: mde
impacts:
  - architecture
  - server
default: n/a
---

# Cross-cutting concerns

## Purpose

Make validation, auth, logging, errors, and transactions **explicit** in the architecture
rather than scattered ad hoc.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-08 (Cross-cutting concepts)
- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-05 (Input validation)
  - SEC-ASVS-07 (Error handling and logging)


## Impact on architecture

Cross-cutting concerns — validation, authentication/authorization, logging, error handling,
and transactions — are explicit (where they live, how they apply across layers), not implicit
or duplicated per route. Validation happens at API/UI and important business-rule boundaries.

**Request context (the blessed propagation pattern).** The per-request cross-cutting data —
`correlationId` (logging), `principalId` (identity/access), and the **transaction/connection**
(atomicity) — is carried in **one request-scoped context object** established at the request
boundary and **threaded through** the service and repository layers. This is deliberately a
*single* object passed around (e.g. `ctx: { correlationId, principalId, tx }`, or a
request-scoped `logger.child({ correlationId, principalId })` alongside the active connection) —
**not** three separately re-derived values per layer. Merging these into one context is the
intended design, not a smell: it is what makes logs correlate (`logging`), requests attributable
(`user-identity`), and multi-write use cases atomic (`transaction-boundaries`) with a single
threaded value. A layer that re-derives its own correlation id, or opens its own transaction
instead of using the context's, breaks the pattern. The individual capabilities own their field's
*content*; this concern owns that they travel **together, established once, passed down**.

## Impact on server

The request-context pattern is **realized in source**: middleware at the request boundary builds
the one context object, and service/repository signatures take it. This is the source form of the
design intent above — checked only when source is in scope, not at design time.

## Checks

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
