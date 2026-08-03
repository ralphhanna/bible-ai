---
type: feature
id: navigation-diagram
title: Navigation diagram
origin: mde
impacts:
  - documentation
default: n/a
---

# Navigation diagram

## Purpose

The page-to-page map — entry points, primary pages, and the navigation edges between them. A
view, never a new source of truth.

## Impact on documentation

When UI is in scope, produce a navigation diagram as a Mermaid `flowchart` in
`docs/diagrams/navigation.md` (under `## Navigation`), one node per page. Every node traces to
a page in `UI/ui-catalog.md` and its page spec; every edge is a real navigation action defined in
a page spec. Group by capability, landing pages central, split if unreadable. Consistent with
the live pages' client-routing navigation. Lives under `docs/diagrams/`, never `specs/`.

## Template impact

- `navigation` diagram template → the Mermaid `flowchart` skeleton.

## Checks

- When UI is in scope, is there a navigation diagram in `docs/diagrams/navigation.md` whose
  nodes trace to UI-catalog pages and whose edges trace to page-spec navigation actions?
  · evidence: `docs/diagrams/navigation.md`
  · when: static
