---
type: method-rule
id: RULE-CORE-002
title: Artifact Model
category: core
applies_to:
  - specs
  - business-specs
  - design-specs
  - capabilities
  - entities
  - page-specs
  - ui-catalog
  - source
  - tests
  - output
  - trace
---

# Artifact Model

MDE projects are made of aligned artifact layers. Each layer has a clear job.

## Artifact layers

- **Business Specs**: business overview, roles, capabilities, entities, business rules, use cases, workflows, and open questions.
- **Design Specs**: durable application design decisions, architecture, UI catalog, page specs, API design, persistence design, and design decisions.
- **UI catalog**: page inventory, page purpose, route/navigation role, capability relationship, and composition/pattern usage.
- **Page specs**: page-level intent, route/context, canvases, panels, actions, validation, states, and navigation.
- **Prototypes**: exploratory or live UI behavior used to understand and review experience.
- **App source**: implementation code.
- **Tests**: behavioral and technical verification.
- **Docs/output**: generated evidence, documentation, diagrams, screenshots, reports, and presentations.
- **Plan-local manifest**: per-plan artifact trace at `plans/<plan-id>/output.manifest`.
- **Consolidated manifest**: project-level trace derived under root `manifest/`.

## Plan folders

Plan IDs are number-prefixed slugs under `plans/`, such as `plans/001-conduct-business-analysis-for-hr/`.

The next plan number is the highest existing numeric prefix directly under `plans/` plus one. Date-first plan folders are not the standard plan ID format.

A plan folder may contain these artifacts. Plan depth controls which are required, condensed, optional, or skipped.

- `scope.md`: user-authored frame: intent(s), scope, deferred items, non-goals, assumptions, and constraints.
- `discussion.md`: curated two-way reasoning trail; entries resolve in place. A settled decision is a resolved discussion entry.
- `imports/`: plan-local source material supplied by the user.
- `prototype/`: optional exploratory artifacts.
- `impact.md`: current review surface: intended changes, touched areas, risks, gaps, scope drift, and doc/test expectations.
- `acceptance.md`: definition of done and test expectations when the plan depth requires it.
- `output.manifest`: plan-local artifact trace.
- `tasks.md`: execution task status when task tracking is useful.
- `evidence.md`: verification evidence when verification is required.
- `log.md`: append-oriented event timeline.
- `status.md`: derived plan status snapshot.
- `release.md`: release close-out, present only after release.

Plans do not use `plan.md` as the canonical plan record. Plans do not require every artifact for every plan. Fast plans may use only scope, impact/log, manifest, and outcome information.

## Plan depth

A plan has an internal depth profile:

- **fast**: bounded, low-risk changes; minimal plan artifacts.
- **standard**: normal design or implementation changes.
- **full**: broad, risky, cross-cutting, or review-heavy work.

Plan depth affects ceremony only. It does not change the core lifecycle or trace obligations.

A plan may be promoted to a deeper profile when scope, risk, uncertainty, or touched areas expand.

## Working changes

How working changes flow through the plan lifecycle (logical plan boundaries; evaluate/go/cancel semantics) is a workflow rule — see `rules/workflow/01-plan-lifecycle.rules.md`.

## Capabilities

An application/business has multiple capabilities.

A capability is a business subject area or vertical slice of the application.

Pages, use cases, business rules, APIs, implementation modules, tests, and documentation should be associated with capabilities.

Entities are independent shared business concepts. Entities are not owned by one capability by default.

Each capability may identify a **primary entity** to anchor API design, source-code module boundaries, and implementation/test scope.

Capabilities may reference other entities and other capabilities through defined interfaces or APIs.

Detailed capability discovery, requirements structure, business rules, and use cases are governed by the Business Requirements target profile when BA or requirements work is active.

## Business Specs layout

Business Specs uses capability folders:

```text
specs/business/
  business-overview.md
  discussion.md
  roles/<role-slug>.md
  entities/<entity-slug>.md
  rules/<rule-slug>.md
  capabilities/<capability-slug>/
    overview.md
    workflow.md
    use-cases/<use-case-slug>.md
    business-rules/<rule-slug>.md
```

Entities and roles are shared and live at the top level, never inside a capability. A capability's own use cases and business rules live inside its folder. Rules that span capabilities live in `specs/business/rules/`.

Each entity is one file at `specs/business/entities/<slug>.md`. It holds business meaning first and may later be extended with a `## Storage View` during design/implementation. Do not create a separate `specs/design/entities/` directory.

## Entity model

Business entity specs use **Properties** and **Aspects**.

- **Properties** are business-visible attributes and relationships. If users or business stakeholders care about it, it is a property.
- **Aspects** are system/design concerns attached to the entity. If the system needs it to manage the entity, it is an aspect.

Examples:

| Item | Classification |
|---|---|
| Preferred Name | Property role: display-label |
| Department | Property kind: relationship |
| Employee ID / UUID | Aspect: surrogate key |
| Version | Aspect: optimistic locking |
| Created By / Updated By | Aspect: audit trail |

Do not list system IDs as business properties. The **display-label** (how users recognize the record) is a property role, not a separate duplicated section. The business layer does not model a "key" — uniqueness is a persistence/design concern (a unique constraint in the Storage View), decided only when the business actually enforces uniqueness on a real property.

## Merge policy

Every durable artifact may carry a `mergePolicy` stamp saying how a later `mde go` treats an existing copy:

- **`user-owned`**: human-curated truth; regeneration must not clobber it.
- **`generated-guarded`**: derived and re-derivable, but edits are preserved by merge.
- **`generated`**: fully regeneratable output; may be overwritten.

Commands and target profiles decide when merge policy is required and how it is enforced.
