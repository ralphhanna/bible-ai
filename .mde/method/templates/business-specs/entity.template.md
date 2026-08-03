---
type: entity
id: <entity-slug>
title: <Entity Name>
status: draft
mergePolicy: user-owned
---

# <Entity Name>

<!-- Semantic references (semantic-references feature): when this text names another known MDE
     object, tag it {{kind:slug}} — e.g. {{entity:employee}}, {{business-capability:project-assignments}},
     {{role:staffing-manager}}. Tag on first mention; do not tag objects that don't exist. -->

## Purpose

<Plain business meaning of the entity. Say what this thing represents in the business and why it matters. Tag any related entity/capability/role you name, e.g. an {{entity:employee}} this belongs to.>

## Used By Capabilities

| Capability | Usage |
|---|---|
| {{business-capability:<slug>}} | <how the capability uses this entity> |

## Properties

Properties are business-visible attributes and relationships.

Use **Kind** to distinguish:

- `attribute` — a scalar or descriptive business value.
- `relationship` — a reference/association to another business entity.

Use **Role** to describe how the property is used. A property may have more than one role.

Common roles:

- `display-label` — how users recognize the record in lists, lookups, and related displays (a name or preferred name). Every entity has one. There is **no** business "key" role — do not add a code/number column to manufacture one; uniqueness is decided later in `## Storage View`.
- `status` — lifecycle/current-state value.
- `classification` — categorizes or groups the entity.
- `lifecycle` — dates or values that mark lifecycle boundaries.
- `contact` — communication/contact value.
- `reporting` — reporting-line relationship.
- `participant` — party/entity participating in an event or relationship.
- `descriptive` — ordinary descriptive information.

Do not include system-generated IDs, versions, audit fields, or technical foreign keys here. Those are **Aspects** or **Storage View** details.

| Property | Kind | Meaning | Role | Required | Source | Notes |
|---|---|---|---|---|---|---|
| <property-name> | attribute / relationship | <business meaning> | <role(s)> | yes / no | confirmed / inferred / open-question | <notes, including cardinality for relationships if useful> |

## Aspects

Aspects are system/design concerns attached to the entity. They are not business properties.

Rule:

- If users or business stakeholders care about it, it is a **Property**.
- If the system needs it to manage the entity, it is an **Aspect**.

**The valid aspects are the ones a feature OWNS** — listed in `targets/aspects-catalogue.json`
(compiled from the features that declare and implement them; each entry names its
`implementedBy` feature). Declare only aspects from that catalogue; an aspect no feature owns
does nothing downstream and is flagged by validation. Common ones (see the catalogue for the
authoritative, current set): `surrogate-key`, `audit-trail`, `optimistic-locking`,
`soft-deactivation`. To make a new aspect available, add it to a feature that implements it
(`aspects: - <name> | entity`) — that is what puts it in the catalogue.

| Aspect | Meaning | Required | Source | Notes |
|---|---|---|---|---|
| surrogate-key | Entity uses a system-generated technical identifier. | yes / no | inferred / confirmed | Not a business property. Usually implemented as id/UUID in Storage View. |
| audit-trail | Entity records creation/update metadata. | yes / no | inferred / confirmed | Examples: created by/on, updated by/on. |
| optimistic-locking | Entity uses a version token to prevent conflicting updates. | yes / no | inferred / confirmed | Usually implemented as version/concurrency token. |

## Lifecycle / Status Values

List lifecycle/status values when the entity has meaningful states.

| Status | Meaning | Notes |
|---|---|---|
| <status> | <business meaning> | <transition notes or constraints> |

## Operations

The operations this entity supports: what can be done to the entity and who may do it.

The operation id (`<entity-slug>.<op>`) is the join key used by page specs, tests, implementation, and review.

| Operation id | Kind | Meaning | Roles permitted | Scope | Notes |
|---|---|---|---|---|---|
| `<entity>.list` | crud | List records. | <role, …> | <scope expr> | |
| `<entity>.read` | crud | View one record. | <role, …> | <scope expr> | |
| `<entity>.create` | crud | Create a record. | <role, …> | any | |
| `<entity>.update` | crud | Update a record. | <role, …> | <scope expr> | |
| `<entity>.<transition>` | lifecycle | <status transition> | <role, …> | <scope expr> | |
| `<entity>.<action>` | use-case | <capability action> | <role, …> | <scope expr> | |

Rules:

- `kind` is one of `crud`, `lifecycle`, or `use-case`.
- CRUD includes `list` and `read`; omit operations that are not allowed.
- `Roles permitted` are role ids from `specs/business/roles/`.
- `Scope` is an inline prose row predicate such as "the acting user", "employees who report to the acting user", "records in the acting user's department", or "any".
- Access is declared on operations here; do not create a separate access-policy artifact unless the method explicitly introduces one later.

## Business Rules

Entity-specific rules. Cross-capability rules may also live under `specs/business/rules/` or capability business-rule folders.

| Rule | Meaning | Notes |
|---|---|---|
| <rule-name> | <business rule> | <source/impact> |

## Open Questions

| Question | Why It Matters | Suggested Default |
|---|---|---|
| <question> | <why it affects design/implementation> | <safe default or blank> |

## Storage View

<!-- Filled during design/implementation by the Persistence Design target. Business-analysis plans may leave this empty or skeletal. Do not create a separate specs/design/entities/<slug>.md file.
     Uniqueness lives HERE: add a UNIQUE constraint (or unique index) on a property ONLY when the
     business actually enforces uniqueness on it (e.g. `email`, `orderNumber`). This is a design
     decision, not a business property role — most entities need none (identity is the surrogate key). -->


### Schema

| Column | DB Type | Constraints | Notes |
|---|---|---|---|

### Indexes

| Name | Columns | Kind | Notes |
|---|---|---|---|

### Migration History

| Migration | Plan | Action | Notes |
|---|---|---|---|

## Notes

<!-- User-guarded zone. Add free-form notes here; they survive AI regeneration of structured sections above. -->
