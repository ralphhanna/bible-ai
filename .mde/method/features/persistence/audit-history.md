---
type: feature
id: audit-history
title: Audit history
origin: mde
impacts:
  - persistence
  - persistence-design
aspects:
  - audit-trail | entity
default: n/a
---

# Audit history

## Purpose

When the business needs to know **who changed what, when** (and optionally the before/after),
the entity carries audit fields and/or a history trail — deliberately, per the design, not as
an accidental side effect.

## Impact on persistence-design

An entity that requires auditing declares it in design: the **audit fields** it carries
(`created_at` / `created_by` / `updated_at` / `updated_by` at minimum) and, when full change
history is required, a **history mechanism** (a `<entity>_history` table or an append-only
change log) — recorded in the `## Storage View`. Auditing is opt-in per entity and driven by a
business rule or use case that asks for it; the design names which entities are audited and to
what depth (fields-only vs. full history).

## Impact on persistence

The schema realizes the declared audit fields and, where full history is required, the history
table / change-log with the captured columns. History is written on the same path as the
mutation (trigger, repository hook, or service step) so it cannot be bypassed by a normal write.
Audit/history rows are not editable through the app.

## Checks

- For each entity the design marks as audited, are the declared audit fields present in the
  schema (and the history table/log present when full history is required)?
  · evidence: schema/migrations vs. the audited-entity list in design
  · when: static
- Is history written on the mutation path (not optional/bypassable), and are audit rows not
  app-editable?
  · evidence: repository/trigger/service write path
  · when: static

## Impact on server

Auditing is not just a schema fact — the write path **sets** the audit fields. The entity's
repository update (the mutation path) sets `updated_at`/`updated_by` (and insert sets
`created_*`), and the site carries the inline marker `// MDE: audit-history — …` (see
`source-trace-header`). A `created_at` column that no write populates is a dead column, not
auditing.

<!-- Spec-driven (scope=plan): fires for every touched entity whose spec DECLARES the
     Audit aspect — not keyed on the manifest's feature tag (which the generator may
     omit, silently zeroing the check). Deterministic layers: schema columns +
     repository write with the audit-history marker. The [ASK] covers the judgment a
     regex can't: is the write on the unbypassable mutation path, and are audit rows
     not app-editable. $plan.expectedTables carries the model-computed flags. -->
```check scope=plan subject="Audit Columns" whenFailed="audited entities are missing audit columns in the schema" whenPassed="audited entities have their audit columns"
# audited = the entity's spec declares the Audit aspect.
# allColumnsPresent = the migration table has every Storage-View column (incl. audit).
# This check (schema layer): an audited entity's table must carry the audit columns.
EVERY $e IN $plan.expectedTables WHERE $e.audited IS "true"
THEN  $e.allColumnsPresent IS "true"
  ELSE "audited entity's table is missing declared audit columns (created_at/updated_at/by); see ref"
```

```check scope=plan subject="Audit Writes" whenFailed="audited entities never write their audit fields (dead columns)" whenPassed="audited entities write their audit fields"
# auditRealized = the entity's repository actually WRITES the audit fields on update
#   AND marks the site with // MDE: audit-history (column present but never written = dead).
# This check (code layer): auditing must be implemented, not just have columns.
EVERY $e IN $plan.expectedTables WHERE $e.audited IS "true"
THEN  $e.auditRealized IS "true"
  ELSE "audited entity has audit columns but its repository does not set them on the mutation path (or is missing the // MDE: audit-history marker) — dead audit columns; see ref"
  ASK "For ${$e.entity}: is the audit write on the UNBYPASSABLE mutation path (trigger/repository/service, not optional), and are audit rows not editable through the app?"
```
