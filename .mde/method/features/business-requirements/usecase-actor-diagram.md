---
type: feature
id: usecase-actor-diagram
title: Use Case / Actor diagram
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Use Case / Actor diagram

## Purpose

A logical view of **who does what** — the actors/roles and the use cases they perform, and how
use cases relate (include/extend) — derived from the use-case catalogue and the actor/role
model. A view, never a new source of truth; it visualizes the BA text, it does not replace it.

## Impact on business-requirements

When business analysis defines or refines actors, roles, or use cases, produce a Use Case /
Actor diagram as a Mermaid diagram in `docs/diagrams/use-cases.md` (under `## Use Cases &
Actors`): every primary **actor/role** appears as a node, every **use case** from the catalogue
appears as a node, and each actor is linked to the use cases it performs. Where the catalogue
records `include`/`extend` relationships between use cases, show them with a labelled edge.
Group by capability and lay out to avoid crossing lines (split per-capability if large). Every
actor traces to the actor/role model (`actor-and-role-model`) and every use case traces to a
`specs/business/capabilities/<slug>/use-cases/<slug>.md`. Lives under `docs/diagrams/`, never
`specs/`.

## Template impact

- `use-case-diagram` template → the Mermaid skeleton (actor nodes, use-case nodes,
  actor→use-case edges, include/extend edges).

## Checks

- When actors/roles or use cases are in scope, is there a Use Case / Actor diagram in
  `docs/diagrams/use-cases.md` showing each primary actor, each catalogued use case, the
  actor→use-case links (and include/extend where recorded), each node tracing to its
  actor/role model or use-case file, laid out to avoid crossing lines?
  · evidence: `docs/diagrams/use-cases.md`
  · when: static
- Does the diagram cover **every** in-scope use case and actor (none dropped) and introduce no
  use case or actor absent from the BA text?
  · evidence: diagram nodes vs. use-case files + actor/role model
  · when: static
