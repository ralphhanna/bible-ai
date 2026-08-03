---
type: target
id: TARGET-PERSISTENCE-DESIGN
title: Persistence Design Target Profile
applies_when:
  - a plan designs the physical data model (storage view, schema) from the entity model
  - a plan designs audit/history or concurrency (optimistic locking) for the data
---

# Persistence Design Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Persistence Design turns the business entity model into the physical data model — storage view, schema, audit/history, and concurrency — as Design Specs the team builds persistence from. It is the design counterpart of the Persistence (implementation) target; the entities themselves are defined in Business Specs.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| storage-view | specs/business/entities/{entity}.md (## Storage View) | entity | always |

## Composed behavior

### Audit history  `[feature: audit-history]`

An entity that requires auditing declares it in design: the **audit fields** it carries
(`created_at` / `created_by` / `updated_at` / `updated_by` at minimum) and, when full change
history is required, a **history mechanism** (a `<entity>_history` table or an append-only
change log) — recorded in the `## Storage View`. Auditing is opt-in per entity and driven by a
business rule or use case that asks for it; the design names which entities are audited and to
what depth (fields-only vs. full history).

### Entity model  `[feature: entity-model]`

The design phase fills the entity file's `## Storage View`:

- columns,
- database types,
- indexes,
- constraints,
- migrations.

Do not create a separate `specs/design/entities/` file. The entity remains single-sourced.

Business properties become persistence columns or relationships only during design. Aspects may introduce technical columns such as `id`, `version`, `created_at`, or `updated_at` in Storage View.

### Optimistic locking  `[feature: optimistic-locking]`

An entity that is concurrently editable declares a **version field** in its `## Storage View`
(e.g. an integer `version` or a `row_version`/`updated_at` used as a concurrency token). The
design records which entities require optimistic locking and which token they use (the default
is no locking — it is opt-in per entity, with a reason when an editable entity omits it).

### Schema from entities  `[feature: schema-from-entities]`

The schema is the realization of the `## Storage View` recorded during design (see
`storage-view-model`).

### Semantic references in generated text  `[feature: semantic-references]`

Persistence-design text tags **every concept** whose storage it describes as `{{kind:slug}}`.

### Storage View (physical model)  `[feature: storage-view-model]`

The design phase fills each entity's `## Storage View` section (schema columns + DB types,
indexes, uniqueness/constraints) using the entity template. It MUST NOT create a separate
`design/entities/` file or restate the business attributes already above.

**Each filled entity gets its own manifest entry.** Verification discovers "the entities this
design plan is responsible for" (`$plan.storageDesignEntities`) **from the manifest**, not by
re-scanning `specs/business/entities/` on disk — so an entity whose `## Storage View` was filled
but whose file was never recorded as a manifest entry (`action: modify`, `outputType:
entity-spec` or `business-spec`) is **invisible** to the design-completeness check below, and the
gap goes undetected rather than failing loudly. So every entity the plan fills a Storage View
for MUST appear in `output.manifest` as its own entry — do not fold it into
`specs/design/persistence-design.md`'s entry alone (that document's own `sourceRef` legitimately
self-references its own path, not the entities it designed for; it does not substitute for the
per-entity entries).

## Validation checks

### Audit history  `[feature: audit-history]`

- For each entity the design marks as audited, are the declared audit fields present in the
  schema (and the history table/log present when full history is required)?
  · evidence: schema/migrations vs. the audited-entity list in design
  · when: static
- Is history written on the mutation path (not optional/bypassable), and are audit rows not
  app-editable?
  · evidence: repository/trigger/service write path
  · when: static

### Entity model  `[feature: entity-model]`

- Does each entity define purpose, properties, aspects, lifecycle/status where relevant, operations, and open questions?
  · evidence: `specs/business/entities/<entity-slug>.md`
  · when: static

- Are attributes and relationships expressed as properties with `kind = attribute | relationship`?
  · evidence: `## Properties`
  · when: static

- Is the display label expressed as a property role rather than a duplicated section?
  · evidence: `## Properties` role column
  · when: static

- Are all code/number properties (e.g. `*Code`, `*No`, `*Number`, `*Id`-style codes) ones the
  **business actually uses** — quoted by people, keyed on by an external system/import, or named
  by a business rule — with that basis recorded in notes/source? No fabricated code/number
  attribute is present just to manufacture a key or look "enterprisey." The business layer models
  no "key"; where the business has no natural code, the entity has **none** — identity is the
  surrogate-key aspect + display-label.
  · evidence: `## Properties` code/number rows vs. notes/source basis, business rules, open questions
  · when: static

- Are system IDs, UUIDs, version fields, and audit metadata kept out of Properties and represented as Aspects / Storage View details?
  · evidence: `## Properties`, `## Aspects`, `## Storage View`
  · when: static

- Does each entity have a display label for user presentation, distinct from raw technical id?
  · evidence: property role `display-label`
  · when: static

- Is the entity single-sourced in `specs/business/entities/` and not duplicated inside capability folders or `specs/design/entities/`?
  · evidence: repository layout
  · when: static

- Do relationship properties define business cardinality, participation, and role names where material, and are relationship entities used when the relationship has its own lifecycle, quantities, identity, or history?
  · evidence: entity relationship properties vs. use cases and rules
  · when: static + AI review

- Do durable concepts implied by use-case triggers, quantities, state changes, and outcomes resolve to entities or have an explicit reason not to?
  · evidence: use-case object roles and state-change tables vs. entity catalogue
  · when: AI review

- Does every aspect an entity declares in `## Aspects` resolve to a **known aspect** — one
  a feature owns (in `aspects-catalogue.json`)? An unrecognized aspect (a typo, or a concept
  no feature implements) is silently ineffective, so it is a defect.
  · evidence: entity `## Aspects` vs. `targets/aspects-catalogue.json`
  · when: static

### Optimistic locking  `[feature: optimistic-locking]`

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

### Schema from entities  `[feature: schema-from-entities]`

- Does the schema match the entity design / Storage View, with deliberate FKs/constraints?
  · evidence: migrations vs. entity Storage Views
  · when: static
- For each touched entity, does the migration **create its Storage-View table** with **every
  declared column** present?
  · evidence: `create table <table>` + columns vs. the entity's `## Storage View`
  · when: static
- Do APIs/services avoid leaking raw database details unnecessarily?
  · evidence: repository/service boundaries
  · when: static

```check scope=plan subject="Database Tables" whenFailed="entity tables are missing from the migration" whenPassed="entity tables are created"
# expectedTables = one entry per entity the plan touched that declares a Storage View.
# tableExists = the migration creates a table with the entity's Storage-View table name.
# This check: every entity's table must exist in the migration (schema follows the spec).
EVERY $e IN $plan.expectedTables
THEN  $e.tableExists IS "true"
  ELSE "entity has a Storage View but the migration creates no matching table — schema not derived from the entity; see ref"
```

```check scope=plan subject="Table Columns" whenFailed="tables are missing declared columns" whenPassed="tables have all declared columns"
# allColumnsPresent = every column the entity's Storage View lists appears in its
#   create-table body. (missingColumns names the ones that don't.)
# This check: the table must have every declared column, not just exist.
EVERY $e IN $plan.expectedTables WHERE $e.tableExists IS "true"
THEN  $e.allColumnsPresent IS "true"
  ELSE "migration table is missing columns the entity's Storage View declares; see ref (missingColumns)"
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

### Storage View (physical model)  `[feature: storage-view-model]`

- Is the physical model recorded in each entity's `## Storage View` (not a separate
  `design/entities/` file)?
  · evidence: entity files' `## Storage View`
  · when: static
- Does the storage view match the business attributes/relationships above it?
  · evidence: entity file consistency
  · when: static
- Is every UNIQUE constraint / unique index on a property the **business actually enforces
  uniqueness on** (a real rule — quoted id, external key, no-duplicates policy), not a fabricated
  code column added to manufacture a key? Uniqueness is decided here, not as a business property
  role; most entities need none (identity is the surrogate key).
  · evidence: `## Storage View` Constraints/Indexes vs. business rules and property source basis
  · when: static
- **Design completeness:** does **every** entity the plan designed have a filled `## Storage
  View` (a table + columns)? The implementation's `schema-from-entities` check depends on this.
  · evidence: each produced entity spec's `## Storage View`
  · when: static

<!-- Storage View is a DESIGN-stage output: the Business-Analysis plan creates the
     entity specs WITHOUT a Storage View (correct — the physical model is filled during
     design), and the DESIGN plan fills it. So this check must fire at DESIGN, not BA —
     otherwise it wrongly blames the BA plan for a gap the design plan owns. The
     WHEN-gate ties it to persistence-design; on a BA plan (no persistence-design
     loaded) it does not run. A missing Storage View is then attributed to the DESIGN
     plan, where the defect belongs. -->
```check scope=plan subject="Storage Views" whenFailed="designed entities have no Storage View (physical model undefined)" whenPassed="designed entities have a complete Storage View"
# designEntities = the app's entity specs (the ones this design plan is responsible for).
# hasStorageView = the spec's ## Storage View defines a table and at least one column.
# This check (DESIGN stage only — gated on persistence-design): every entity must have a
#   complete Storage View by the end of design. Missing = a DESIGN defect (the design
#   plan didn't fill the physical model), not a BA defect.
EVERY $ent IN $plan.storageDesignEntities
THEN  $ent.hasStorageView IS "true"
  ELSE "entity spec has no complete ## Storage View (table + columns) — the physical model is undefined; the design plan must fill it before code generation; see ref"
```
