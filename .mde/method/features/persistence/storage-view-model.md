---
type: feature
id: storage-view-model
title: Storage View (physical model)
origin: mde
impacts:
  - persistence-design
  - persistence
aspects:
  - surrogate-key | entity
default: n/a
---

# Storage View (physical model)

## Purpose

Record the physical data model **inside the entity file**, not a separate design/entities
layer — single-sourcing the entity (RULE-CORE-002).

## Impact on persistence-design

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

## Impact on persistence

Migrations follow the `## Storage View`; the schema is the realization of it. The ERD (logical)
and the Storage View (physical) both trace to the same entity file.

## Template impact

- `entity` template → the `## Storage View` section.

## Checks

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
