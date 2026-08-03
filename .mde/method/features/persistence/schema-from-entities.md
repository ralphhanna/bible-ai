---
type: feature
id: schema-from-entities
title: Schema from entities
origin: mde
impacts:
  - persistence
  - persistence-design
default: n/a
---

# Schema from entities

## Purpose

Persistence reflects the entity model without making entities artificially owned by one
capability — schema follows the confirmed entities, not the other way around.

## Impact on persistence

Schema/migrations follow the confirmed entity model + each entity's `## Storage View`. Entities
remain shared concepts unless explicitly scoped otherwise. Foreign keys/constraints are
deliberate and aligned with design; audit/history fields are explicit when needed.
PostgreSQL-specific behavior is documented when used.

## Impact on persistence-design

The schema is the realization of the `## Storage View` recorded during design (see
`storage-view-model`).

## Checks

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
