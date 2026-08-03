---
type: feature
id: tech-stack-selection
title: Technology stack selection
origin: mde
impacts:
  - application-design
default: n/a
---

# Technology stack selection

## Purpose

`specs/design/tech-stack.md` is the authoritative record of the stack axes — selected once,
read by every later plan. The stack is multi-axis (frontend, backend, data-source, testing,
plus database/auth/deployment).

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-08 (Record architecture constraints)
- **arc42** — https://arc42.org/overview
  - ARC42-02 (Architecture constraints)
  - ARC42-04 (Solution strategy)


## Impact on application-design

When design/build work is needed and no stack is recorded, select it first: present the
starter stacks in `templates/stack/` plus `custom`; let the user choose; capture constraints;
write `tech-stack.md` from the chosen template recording per-axis choices + one-line
rationale each. Record the **standard root operations map** (install/start/dev/build/test +
db subcommands). The chosen template's targets block determines which target profiles later
plans load. Complete when every axis has a selected option and a rationale.

## Template impact

- `templates/stack/<name>.template.md` → seeds `tech-stack.md` (axes + rationale + operations map).

## Checks

- Does `tech-stack.md` record a selected option + one-line rationale for every axis/category?
  · evidence: `specs/design/tech-stack.md`
  · when: static
- Is the standard root operations map present (install/start/build/test, dev/migrate/seed as applicable)?
  · evidence: `tech-stack.md` operations map
  · when: static
