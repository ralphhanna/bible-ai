---
type: feature
id: design-decisions-log
title: Design decisions log
origin: mde
impacts:
  - application-design
default: n/a
---

# Design decisions log

## Purpose

Record every significant design choice with its rationale and alternatives, so source
patterns trace back to a decision rather than appearing unexplained.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-07 (Record architecture decisions and rationale)
- **arc42** — https://arc42.org/overview
  - ARC42-09 (Architecture decisions)


## Impact on application-design

`specs/design/design-decisions.md` carries one entry per significant choice: what, why,
alternatives considered. Source patterns trace back to a decision entry.

## Template impact

- `design-decisions` section in the design templates → one entry per decision.

## Checks

- Does every significant choice have a design-decision entry (what/why/alternatives), and do
  source patterns trace back to one?
  · evidence: `specs/design/design-decisions.md`
  · when: static
