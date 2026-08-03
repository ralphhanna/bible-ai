---
type: target
id: TARGET-API-DESIGN
title: API Design Target Profile
applies_when:
  - a plan designs a capability's API surface, endpoints, or operations
  - a plan defines entity operations and the access that governs them
---

# API Design Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

API Design specifies a capability's API surface — its operations, the access that governs them, and the standard root operations — as Design Specs the team builds the real API from. It is the design counterpart of the API (implementation) target.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|

_No design-stage API-contract artifact._ The HTTP contract (endpoints, request/response shapes,
status codes) is **generated last from the real routes** into `openapi.yaml` (see the `api`
implementation target / `openapi-contract`), not authored at design. **Operations** are declared
on the entity (`## Operations`), **access** on each operation (roles + scope), and each operation
is **realized by a use case** (its `## Realization` names the operation) — so API design adds no
restated operation/endpoint table. This target governs the operation/access **design** (via the
checks below); the endpoint shape is downstream, code-first.

## Composed behavior

### Entity operations and access control  `[feature: entity-operations-and-access]`

The required-operation set (operations with ≥1 permitted role) is the denominator for design
coverage — page parts must render them (see `operation-coverage`).

### Semantic references in generated text  `[feature: semantic-references]`

API-design text tags **every concept** its endpoints serve as `{{kind:slug}}`.

### Standard root operations  `[feature: standard-root-operations]`

The exact command mapping is recorded in `specs/design/tech-stack.md` (the operations map,
written at stack selection).

## Validation checks

### Business transaction analysis  `[feature: business-transaction-analysis]`

- Does the main flow preserve the business condition named by the trigger and explicitly resolve,
  reduce, defer, reject, or record it in the outcome?
  · evidence: trigger + main flow + outcome
  · when: AI review
- Is the driving business object identified and carried through the transaction, or is its absence
  explicitly justified because the trigger is an immediate event with no durable business object?
  · evidence: use-case object roles + entity model
  · when: AI review
- Is the business goal expressed as a business outcome rather than only a record create/update or
  status-change operation?
  · evidence: Business Goal vs. Data Created / Changed / Viewed
  · when: AI review
- Are result, supporting, and materially impacted objects identified, with their resulting states
  reconciled?
  · evidence: object roles + state-change table + outcome
  · when: AI review
- Do durable concepts implied by needs, quantities, history, and lifecycle resolve to entities, or
  have a documented reason not to?
  · evidence: use-case wording vs. entity model + open questions
  · when: AI review
- Where fulfilment is quantified, are requested, fulfilled, remaining, multiplicity, and reversal
  semantics defined?
  · evidence: use case + rules + entity properties
  · when: AI review
- Does each complex or quantified transaction surface its important situations as **test
  conditions** (situation + one expected business result) that agree with the use case, entity
  cardinalities, lifecycle, and business rules — rather than forcing executable examples or
  per-step state tables into the business use case?
  · evidence: use-case Test Conditions section
  · when: static + AI review

### Entity operations and access control  `[feature: entity-operations-and-access]`

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

### Semantic references in generated text  `[feature: semantic-references]`

- Does generated text tag **every mention** of a known **concept** with a canonical `{{kind:slug}}`
  tag — not just the first mention — so no named concept survives as bare prose? Read the narrative
  (especially use-case `## Flow` steps and `## Conditions`): does any sentence name a concept that
  exists in the catalogue but leaves it untagged (the confabulation escape hatch)?
  · evidence: every named-concept mention in the prose vs. the catalogue; untagged known concepts
  · when: static + AI review
- Is every `{{...}}` tag well-formed — a canonical `<kind>` (per the trace schema) and a `<slug>`
  that resolves to a real object — with no dangling or fabricated references, and the **same object
  always the same slug** (no `performance-goal` in one place and `goals`/`objectives` in another)?
  · evidence: the tags vs. `specs/business/` + `specs/design/` objects; slug consistency per object
  · when: static + AI review

```check scope=item
# Well-formedness (deterministic): every {{...}} tag in a generated artifact must
# parse as {{<kind>:<slug>}}. Flags a malformed tag (missing kind or slug, spaces,
# empty). Completeness (did it tag what it should) and slug-resolves are the semantic
# checks above — a regex can't resolve slugs or judge untagged prose without false
# positives. This only fires on a present-but-malformed tag.
WHEN  $item.type IS "source"
  AND $item.content MATCHES "\{\{"
THEN  $item.content NOT MATCHES "\{\{\s*([^:}]+\}\}|:[^}]*\}\}|[^:}]*:\s*\}\}|\s*\}\})"
  ELSE "a {{...}} semantic tag is malformed — use {{<kind>:<slug>}} with a canonical kind and a resolvable slug (semantic-references)"
```

```check scope=system
# untaggedConcepts (app.untaggedConcepts in model.mjs): HIGH-PRECISION mechanical half of the
# naming-integrity gate. It flags a DISTINCTIVE concept name (a multi-word slug like
# `performance-goal` → "performance goal") appearing in a use case's narrative prose (## Flow /
# ## Conditions) OUTSIDE a {{…}} tag — an untagged known concept, the confabulation escape hatch.
# Single common-word slugs are deliberately NOT flagged here (too ambiguous for a regex — left to
# the AI-review check above); so a hit is a real untagged reference. Vacuous until use cases +
# multi-word concepts exist (inScope guards it).
WHEN  $app.untaggedConcepts.inScope IS "true"
THEN  $app.untaggedConcepts.clean IS "true"
  ELSE "a known concept is named in use-case prose but left untagged — ${$app.untaggedConcepts.hitCount}: ${$app.untaggedConcepts.hits}. Tag every mention {{kind:slug}} so the reference resolves and the AI can't drift or invent the name."
```

### Standard root operations  `[feature: standard-root-operations]`

- Does `tech-stack.md` record an operations map, and do the referenced root commands actually
  exist and perform the operation (install/start/build/test required when applicable; dev when
  a watch mode exists; migrate/seed/db:reset when a DB is used)?
  · evidence: `$techStack.operations` (below)
  · when: static

```check scope=plan
EVERY $o IN $techStack.operations
THEN  $o.ok IS "true"
ELSE  "operation '${$o.name}' is missing from tech-stack.md's Operations Map, references a package.json script that doesn't exist, or is a placeholder no-op (echo/exit 0)."
```
