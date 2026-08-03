---
type: feature
id: entity-model
title: Entity model
origin: mde
impacts:
  - business-requirements
  - persistence-design
  - persistence
# aspects this feature owns — each `<name> | <declaredAt>`. The compiler gathers
# these across all features into aspects-catalogue.json (the derived, single-source
# vocabulary); a source template (e.g. the entity template) references the catalogue
# for the aspects declaredAt its own kind. See features/README.md "Aspects".
aspects:
  - soft-deactivation | entity
default: n/a
---

# Entity model

## Purpose

Model business entities independently: the shared nouns that capabilities operate on.

One entity = one file at `specs/business/entities/<entity-slug>.md`. Entities are not duplicated inside capability folders.

## Impact on business-requirements

Each entity defines:

- purpose,
- capabilities that use it,
- properties,
- aspects,
- lifecycle/status values where relevant,
- operations and access scope,
- business rules,
- open questions.

Entities stay independent and shared. A capability may identify a primary entity, but that does not mean the capability owns the entity exclusively.

## Properties

Properties are business-visible attributes and relationships.

A property has:

- name,
- kind: `attribute` or `relationship`,
- business meaning,
- role(s),
- required flag,
- source basis,
- notes.

Properties merge what older templates separated as attributes, relationships, and display label.

## Relationship semantics

A relationship property records the business relationship, not only a target entity name. Where relevant it defines:

- role name at each end;
- cardinality;
- required or optional participation;
- ownership versus reference;
- temporal applicability;
- business properties carried by the relationship;
- whether the relationship is itself a business entity because it has identity, lifecycle, quantities, or history.

Use cases classify objects as driving, result, supporting, and impacted. If a durable business concept appears repeatedly in triggers, quantities, state changes, audit needs, or outcomes but has no entity, review the model for a missing business object rather than forcing it into a convenient existing entity.

## Property roles

Property roles describe how a property is used. A property may have more than one role.

Important roles:

- **display-label** — how users recognize the record in lists, lookups, and related displays (e.g. a name or preferred name). It may be a single property or derived from several. **Every entity has one.** This is the entity's business-facing identity — the business layer models *how people recognize the record*, not *what the database keys on*.
- **status** — current lifecycle/state value.
- **classification** — grouping/category property.
- **lifecycle** — date/value marking lifecycle boundaries.
- **contact** — contact or communication value.
- **reporting** — reporting-line relationship.
- **participant** — party/entity participating in an event or relationship.
- **descriptive** — ordinary descriptive information.

Showing a related entity uses the target entity's display label, not the raw technical id.

**No business "key" role.** The business layer does not model a key or a code column.
Do **not** invent code/number attributes (`EmployeeNumber`, `ClientCode`, `OrderNo`) to
give an entity a key — that is fabrication. A code/number property is legitimate **only when
the business actually uses it** — people quote it, an external system or import keys on it, or
a business rule references it — and that basis is recorded in the property's notes/source.
Whether a property needs a **unique constraint** is a persistence/design decision recorded in
the entity's `## Storage View` (see [[storage-view-model]]), not a business property role. Most
entities are identified by a surrogate-key aspect + display-label and have no unique business
column at all.

## Aspects

Aspects are system/design concerns attached to the entity. They are not business properties.

Rule:

- If users or business stakeholders care about it, it is a property.
- If the system needs it to manage the entity, it is an aspect.

Examples:

| Item | Classification |
|---|---|
| Preferred Name | Property role: display-label |
| Department | Property kind: relationship |
| Employee ID / UUID | Aspect: surrogate key |
| Version | Aspect: optimistic locking |
| Created By / Updated By | Aspect: audit trail |

Common aspects:

- surrogate key,
- optimistic locking,
- audit trail,
- soft delete / soft deactivation,
- tenant scoping,
- workflow management,
- attachable/commentable behavior.

## Impact on persistence-design

The design phase fills the entity file's `## Storage View`:

- columns,
- database types,
- indexes,
- constraints,
- migrations.

Do not create a separate `specs/design/entities/` file. The entity remains single-sourced.

Business properties become persistence columns or relationships only during design. Aspects may introduce technical columns such as `id`, `version`, `created_at`, or `updated_at` in Storage View.

## Impact on persistence

Schema and migrations trace back to entity properties, aspects, lifecycle/status, operations, and rules.

Storage choices should not leak backward into the business property list.

## Template impact

The entity template uses:

- `## Properties` for business-visible attributes and relationships,
- `## Aspects` for system/design concerns,
- `## Lifecycle / Status Values`,
- `## Operations`,
- `## Business Rules`,
- `## Storage View`.

## Audit

Judge whether each entity models a **real business thing with real attributes**, or is a
hollow record with vague, generic properties. Read the entity spec against the domain.

For each entity: are its `## Properties` concrete business attributes (named fields with a
clear type and meaning — `employmentStatus`, `startDate`, `allocationPercentage`), or filler
(`name`, `description`, `status` with no domain specificity that would fit any entity)? Do its
`## Lifecycle / Status Values` list real states with real meaning (proposed/approved/active/
completed), or a generic active/inactive stub? Do its `## Operations` name real, entity-specific
actions with roles and scope — or a boilerplate CRUD list? And does the entity **cohere** — do
its properties, states, operations, and the rules that govern it actually fit one business
concept, or is it a bag of generic fields?

Report each entity as **substantive** (concrete attributes, real states, coherent) or **hollow**
(generic properties / stub lifecycle / boilerplate operations). A complete-looking entity
template with vague fields is not a real domain model.

## Checks

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

```check scope=item target=business-requirements
# Aspect validity: an entity may only declare aspects that a FEATURE OWNS. The known set
# is aspects-catalogue.json (compiled from features' `aspects:` declarations); $item.aspectsValid
# / $item.unknownAspects are decided model-side against it. An unknown aspect does nothing
# downstream (no feature realizes it) — catching it here stops silent no-ops (a typo like
# "audit-traill", or a concept the app expects but no feature implements).
WHEN  $item.path MATCHES "specs/business/entities/[^/]+\.md$"
THEN  $item.aspectsValid IS "true"
  ELSE "entity declares unknown aspect(s): ${$item.unknownAspects} — not owned by any feature (see aspects-catalogue.json). Use a known aspect, fix the typo, or add a feature that owns this aspect."
```
