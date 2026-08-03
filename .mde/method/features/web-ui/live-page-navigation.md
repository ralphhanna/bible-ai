---
type: feature
id: live-page-navigation
title: Live-page navigation
origin: mde
impacts:
  - web-ui
  - ui-design
default: n/a
---

# Live-page navigation

## Purpose

A built page demonstrates the workflow, not a static screen — real client-routing links
between the app's pages, current page active.

## Impact on web-ui

For each live page, client routing contains **real links** to the app's sibling pages (at
least the primary catalog pages) with the current page marked active. A decorative menu (dead
links, `href="#"`) does not satisfy this; each target page must exist.

**When the UI renders a workflow** — any multi-step guide, rail, wizard, or stepper that walks
the user through a capability's stages (whether or not a prototype facet is enabled) — its
steps must **completely and faithfully represent** that capability's `workflow.md` stages: one
step per ordered stage, same order, label matching the stage. A stage may not be dropped,
merged, re-labeled, or re-ordered because it lacks a convenient existing route; a stage with no
live page to route to is a **gap to report** (pending/owed UI), not a stage to silently omit. A
workflow UI showing fewer steps than its source has stages misrepresents the business process
and is a defect — independent of any prototyping scope.

## Impact on ui-design

Navigation is consistent with the UI catalog + navigation diagram — they describe the same
page graph.

## Checks

- Does each live page have real client-routing links to the catalog's primary pages, current
  page active, each target page existing (no dead/`href="#"` menu)?
  · evidence: page routing source / E2E navigation
  · when: static (links present) + requires-environment (E2E drives them)
- Where the UI renders a workflow (guide/rail/wizard/stepper), does it have **one step per
  ordered stage** in the capability's `workflow.md` — same order, matching labels, no stage
  dropped/merged/re-labeled (a stage with no live route reported as a gap, not omitted)?
  · evidence: workflow UI steps vs. `workflow.md` Stages (count + order + labels)
  · when: static
