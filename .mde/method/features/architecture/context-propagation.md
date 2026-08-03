---
type: feature
id: context-propagation
title: Request context propagation
origin: mde
impacts:
  - architecture
  - server
default: n/a
---

# Request context propagation

## Purpose

A request carries a **single request context** — established once at the boundary and **threaded
down** through service and repository layers — so every layer serving that request sees the same
identity, correlation, and transaction. This is an architecture invariant that exists **whether or
not the app logs**: the transaction handle is threaded for write correctness, the principal for
authorization scope, the correlation id for tracing. Logging *consumes* this context (see
[[logging]]) but is not the reason it exists.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-08 (Cross-cutting concepts)


## The context

Established at the **request boundary** (middleware), threaded into lower layers, never re-derived
per layer:

| Field | Meaning | Established |
|---|---|---|
| `correlationId` | one id per inbound request, stable for its whole lifetime | generated at the boundary |
| `principalId` | the acting principal (`PrincipalContext.principalId`) | resolved at the boundary from the request |
| transaction / connection | the unit-of-work handle where writes occur | opened at the boundary of a write; passed to repositories |

## Impact on architecture

The boundary establishes the context **once** and passes it down — a request-scoped object (e.g.
`{ correlationId, principalId }` plus the transaction handle) threaded into service and repository
calls. A layer that **re-derives** its own correlation id, resolves its own principal, or opens its
own transaction breaks the invariant: the whole point is that one request = one context, seen
identically at every layer. This is what lets a repository line be attributed to the same request
as the route that triggered it, and a multi-repository write share one transaction.

## Impact on server

Generated code threads the context, it does not reconstruct it: the boundary builds it, lower
layers receive it as a parameter (or an async context), and writes within a request use the
**passed** transaction — not a fresh connection per repository. Where the entity is versioned, the
optimistic-locking version rides the same request path (see [[optimistic-locking]]).

## Checks

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
