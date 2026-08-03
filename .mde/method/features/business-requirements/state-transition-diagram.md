---
type: feature
id: state-transition-diagram
title: State-transition diagram
origin: mde
impacts:
  - business-requirements
default: n/a
---

# State-transition diagram

## Purpose

The lifecycle view for an entity that has one — its states and the transitions between them. A
view, never a new source of truth: every state and transition traces to the entity's declared
status/lifecycle and its lifecycle-transition operations. It is a property of the **entity
model**, not of the UI — it is produced wherever an entity with a lifecycle is in scope,
including backend-only plans with no UI. Produced **where relevant** — only for entities that
actually carry a lifecycle.

## Impact on business-requirements

When business analysis defines or refines the entity model and an **in-scope entity declares a
status/lifecycle with transitions** (e.g. a review moving `draft → submitted → acknowledged`, an
assignment `proposed → approved → cancelled`), produce a state-transition diagram as a Mermaid
`stateDiagram-v2` in `docs/diagrams/state-<entity-slug>.md` (under `## <Entity> Lifecycle`), one
diagram per such entity. Each **state** is a value from that entity's status set; each
**transition edge** is a lifecycle-transition operation the entity declares (labelled with the
operation, e.g. `submit`, `approve`, `cancel`), and where the operation is guarded or
role-restricted the edge notes that. This is triggered by the **entity's lifecycle**, not by
whether UI is in scope. Entities with no lifecycle (no status set / no transition operations) get
**no** diagram — this artifact is required only where the lifecycle exists. Every state and
transition traces to `specs/business/entities/<slug>.md`. Lives under `docs/diagrams/`, never
`specs/`.

## Template impact

- `state-transition` diagram template → the Mermaid `stateDiagram-v2` skeleton.

## Checks

- For each in-scope entity that declares a status/lifecycle with transitions, is there a
  state-transition diagram in `docs/diagrams/state-<entity-slug>.md` whose states trace to that
  entity's status set and whose transitions trace to its lifecycle-transition operations?
  · evidence: `docs/diagrams/state-<entity-slug>.md` vs. the entity's `## Operations` / status set
  · when: static
- Are entities **without** a lifecycle correctly given no state diagram (the artifact is
  required only where a lifecycle exists, not one per entity), and is it produced regardless of
  whether UI is in scope?
  · evidence: the set of state diagrams vs. the set of entities with status/transition operations
  · when: static
