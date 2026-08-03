---
type: feature
id: shared-access-enforcer
title: Shared access enforcer
origin: mde
impacts:
  - architecture
  - web-ui
  - api
default: n/a
---

# Shared access enforcer

## Purpose

One **shared enforcer** reads the entity `## Operations` and enforces access consistently —
**soft** in the prototype (a view filter), **binding** on the real API. Prototype and real API
share one contract.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-04 (Authorization and access control)


## Impact on architecture

A single enforcer component consumes the entities' operations + resolved scope filters
(recorded by `mde go`) and applies them. There is no per-capability bespoke ACL code and no
`access-policy.md`.

## Impact on web-ui

In the prototype the enforcer hides/disables operations a role may not perform — a view
filter, not security (routes stay reachable).

## Impact on api

On the real API the same enforcer is **binding** (a guard), applying the recorded row-filter
predicate per operation.

## Checks

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
