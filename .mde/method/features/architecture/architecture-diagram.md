---
type: feature
id: architecture-diagram
title: Architecture diagram (static structure)
origin: mde
impacts:
  - architecture
default: n/a
---

# Architecture diagram (static structure)

## Purpose

A static structural view of the system — capability slices, their layers, shared modules, and
the database/external systems, with boundaries explicit. A view, never a new source of truth.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-05 (Produce architecture views)
  - ARC-42010-06 (Define model kinds and notation)
- **arc42** — https://arc42.org/overview
  - ARC42-05 (Building-block view)
- **C4 model** — https://c4model.com/
  - C4-01..C4-09 (System Context / Container / Component / Deployment diagrams)


## Impact on architecture

When source/architecture is in scope, render a Mermaid `flowchart` in
`docs/diagrams/architecture.md` (under `## Architecture`): each in-scope capability as a
grouped `subgraph` of its layers, plus shared modules and DB/external systems; cross-capability
edges drawn **only** through APIs/interfaces (never into another capability's internals). Every
node traces to a capability design or a shared module.

## Template impact

- `architecture` diagram template → the Mermaid `flowchart` skeleton.

## Checks

- When source/architecture is in scope, is there a static architecture diagram in
  `docs/diagrams/architecture.md` showing capability slices + layers, with cross-capability
  edges only through APIs and every node tracing to a design?
  · evidence: `docs/diagrams/architecture.md`
  · when: static
