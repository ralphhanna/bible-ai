---
type: feature
id: interaction-diagrams
title: Interaction diagrams
origin: mde
impacts:
  - architecture
default: n/a
---

# Interaction diagrams

## Purpose

Sequence views of key use cases — the boundaries that actually collaborate, request and
response per step, with error/alternate paths marked. Views, never new sources of truth.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-05 (Produce architecture views)
  - ARC-42010-06 (Define model kinds and notation)
- **arc42** — https://arc42.org/overview
  - ARC42-06 (Runtime view)
- **C4 model** — https://c4model.com/diagrams
  - C4-05 (Dynamic diagram)


## Impact on architecture

When significant use cases / cross-capability flows are in scope, render each as a Mermaid
`sequenceDiagram` in `docs/diagrams/interactions.md` (under `## Interaction Diagrams`), one per
key use case, titled with the use case it traces to. Participants are real collaborating
boundaries (actor → UI → API → service → repository → DB/external); show request + response per
step; mark error/alternate paths with `alt`/`opt`. One use case per diagram; cross-capability
flows cross boundaries only through APIs. Every diagram traces to a use case + the APIs/services
it exercises.

## Template impact

- `interactions` diagram template → the Mermaid `sequenceDiagram` skeleton.

## Checks

- When significant use cases are in scope, are there interaction diagrams in
  `docs/diagrams/interactions.md` (one per key flow) with real collaborating boundaries,
  request/response per step, and error paths, each tracing to a use case?
  · evidence: `docs/diagrams/interactions.md`
  · when: static
