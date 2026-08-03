---
type: feature
id: architecture-design
title: Architecture design
origin: mde
impacts:
  - application-design
  - architecture
default: n/a
---

# Architecture design

## Purpose

Turn business specs into an application design the team can build from — layers, boundaries,
request flow, integration points — referencing the declared stack.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-01 (Identify the entity/system of interest)
  - ARC-42010-02 (Identify architecture stakeholders)
  - ARC-42010-08 (Record architecture constraints)
  - ARC-42010-11 (Verify architecture-description completeness)
- **arc42** — https://arc42.org/overview
  - ARC42-01 (Introduction and goals)
  - ARC42-04 (Solution strategy)


## Impact on application-design

`specs/design/architecture.md` records layers, boundaries, request flow, and integration
points, referencing the declared tech stack and keeping UI, API, service/domain, persistence,
and integration concerns separated. Every architecture artifact traces to business specs.

## Impact on architecture

The recorded architecture is what the Architecture target's layering/boundary checks and the
architecture/interaction diagrams are verified against.

## Template impact

- `app-design` / `architecture` templates → layers, boundaries, request flow.

## Checks

- Does architecture reference the declared stack and keep UI/API/service/persistence/
  integration concerns separated?
  · evidence: `specs/design/architecture.md`
  · when: static
- Is each architecture artifact traceable to business specs?
  · evidence: architecture ↔ capability/entity links
  · when: static
