---
type: feature
id: guided-workflows
title: Guided workflows
origin: mde
impacts:
  - web-ui
default: on
---

# Guided workflows

## Purpose

End-user task flows that step a user through the **existing live pages** in a defined order,
with instructions and progress — they do **not** duplicate the app's screens. The unit is the
**capability workflow**: a capability's `workflow.md` ordered stages are the tour; each stage
maps to a use case → page spec → live route.

## Impact on web-ui

A standard UI facet, **generated** and produced **whenever UI is in scope and the project
defines capability workflows** — no longer opt-in, and the user does not have to request a
"prototype" to get it. If a capability has `workflow.md` stages, its guided workflow is built;
only a capability with no workflow has none (nothing to build, not a Non-goal decision).

Generated into a workflow catalog (deriving from Specs, not duplicating requirement text)
plus a `/workflows` library and an active-step rail on the live pages.

Source of truth: capability `workflow.md` stages → use cases → page specs.

## Template impact

- **workflow catalog + `/workflows` library** + an active-step rail on live pages.
- generated from `templates/prototype/workflow-guide.template.md`.

## Checks

- For every capability that defines `workflow.md` stages, is a guided workflow built that
  **derives from** that `workflow.md` + use cases (no duplicated requirement text) and **routes
  into the live pages** rather than re-implementing them?
  · evidence: workflow catalog source + route references vs. capability workflow.md set
  · when: static