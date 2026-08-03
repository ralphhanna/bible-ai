---
type: feature
id: capability-slices
title: Capability slices
origin: mde
impacts:
  - architecture
default: n/a
---

# Capability slices

## Purpose

Organize source by capability/vertical slice — each capability owns its layers, with shared
modules factored out.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-05 (Building-block view)
- **C4 model** — https://c4model.com/
  - C4-02 (Container diagram)


## Impact on architecture

The application is structured as capability slices: each in-scope capability is a grouped
slice containing its layers (UI/page → API/route → service/use-case → repository/adapter),
plus shared modules and the database/external systems. The slice is the unit the architecture
diagram groups and the layering checks apply within.

## Checks

- Is source organized by capability/vertical slice, each slice owning its layers with shared
  modules factored out?
  · evidence: source directory structure
  · when: static
