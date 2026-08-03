---
type: feature
id: entity-operations-and-access
title: Entity operations and access control
origin: mde
impacts:
  - business-requirements
  - api-design
  - architecture
default: n/a
---

# Entity operations and access control

## Purpose

Access control lives **on the entity**, not in a separate artifact. Each entity declares an
enumerated `## Operations` list — the authoritative statement of what can be done to it and
who may do it. This list is also the **coverage denominator** for design and UI tests.

## Impact on business-requirements

Each operation carries: an **id** `<entity>.<op>` (the join key), a **kind**
(`crud | lifecycle | use-case`), the **roles permitted** (ids from `specs/business/roles/`),
and a **scope** — an inline prose row-predicate ("the acting user", "employees who report to
the acting user", "any") that the AI resolves to a filter. There is **no `access-policy.md`**
and no `kind: access` rule; a role's cross-capability permissions are a derived rollup, never
hand-authored.

## Impact on api-design

The required-operation set (operations with ≥1 permitted role) is the denominator for design
coverage — page parts must render them (see `operation-coverage`).

## Impact on architecture

One **shared enforcer** reads the operations and enforces them: soft in the prototype (a view
filter), binding on the real API. `mde go` records the resolved row-filter so prototype and
real API share one contract (see `shared-access-enforcer`).

## Template impact

- `entity` template → the `## Operations` section.

## Audit

Judge whether each entity's operations are **real, entity-specific actions with meaningful
access**, or a generic CRUD list with placeholder roles. Read the entity's `## Operations` table.

Real operations name domain actions beyond bare CRUD where the business has them
(`employee.transfer`, `assignment.approve`, `review.acknowledge`), each with a *specific* role
set and scope that reflect who may really do it and over which records — not "any role, any
scope" on every row. A fake operations table is create/read/update/delete with no lifecycle
actions the domain clearly needs, or every operation permitting the same roles with an
undifferentiated "any" scope. Cross-check against the entity's lifecycle and rules: a status the
entity declares but no operation transitions is a gap; an operation the use-cases never invoke is
an orphan.

Report the operations as **modelled** (domain-specific actions, differentiated roles/scope,
consistent with lifecycle and use-cases) or **boilerplate** (generic CRUD, undifferentiated
access). A full CRUD table is not a substantive operation model if the domain's real actions and
access rules are absent.

## Checks

- Does each owned entity declare `## Operations` (Create/Update, Read as List + Read-one,
  Search/Delete present-or-reasoned, plus lifecycle + use-case actions), each with permitted
  roles + a resolvable scope predicate?
  · evidence: entity `## Operations` sections
  · when: static
- Is access modeled only on operations (no `access-policy.md`, no `kind: access` rule)?
  · evidence: absence of access-policy artifacts
  · when: static

```check scope=plan subject="Entity Operations" whenFailed="designed entities declare no operations" whenPassed="designed entities declare their operations"
# designEntities = every entity spec this plan produced.
# hasOperations = the spec's ## Operations lists at least one operation.
# This check (design stage): a designed entity must enumerate its operations — the
#   authoritative set every downstream coverage check (API, tests, ACL) depends on.
EVERY $ent IN $plan.designEntities
THEN  $ent.hasOperations IS "true"
  ELSE "entity spec declares no ## Operations — the operation set is undefined; API/test/ACL coverage cannot be verified against it; see ref"
```

```check scope=plan subject="Access Design" whenFailed="entities have operations with no permitted roles defined" whenPassed="entities define permitted roles for all operations"
# allOperationsHaveRoles = every operation in the spec lists ≥1 permitted role
#   (operationsMissingRoles names any that don't).
# This check (design stage): access is defined AT DESIGN TIME — every operation states
#   who may perform it. Without this the implementation ACL check has no roles to
#   enforce; "no permission check" at code gen is really an undefined design here.
EVERY $ent IN $plan.designEntities WHERE $ent.hasOperations IS "true"
THEN  $ent.allOperationsHaveRoles IS "true"
  ELSE "entity has operations with no permitted roles defined — access is undefined in the design (see operationsMissingRoles); the implementation cannot enforce what the design didn't specify; see ref"
```

<!-- designOpCoverage (app.designOpCoverage in model.mjs): every operation an ENTITY declares
     (specs/business/entities/*.md ## Operations) must be REALIZED by a use case — referenced by
     an `operation:` uri in some use case's ## Realization section. The coverage denominator is the
     use-case realization, NOT a restated API table in the capability overview (code-first: the
     HTTP contract is the generated openapi.yaml, access lives on the entity operation). An op no
     realization names is orphaned; an op a realization names that no entity declares has drifted
     from the BA. scope=system: entity operations are a whole-app set, so this runs at
     `mde review app`, not per-plan. Vacuous until realizations exist (inScope guards it). -->
```check scope=system
WHEN  $app.designOpCoverage.inScope IS "true"
THEN  $app.designOpCoverage.complete IS "true"
  ELSE "design does not realize every declared entity operation — ${$app.designOpCoverage.missingCount} of ${$app.designOpCoverage.entityOpCount} entity operations are referenced by no use-case ## Realization (missing: ${$app.designOpCoverage.missing}). Every operation an entity declares must be realized by a use case (or removed if the domain never uses it); a design that realizes a subset has silently narrowed the BA."
```
