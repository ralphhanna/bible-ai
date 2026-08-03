---
type: feature
id: ui-catalog
title: UI catalog
origin: mde
impacts:
  - ui-design
  - web-ui
default: n/a
---

# UI catalog

## Purpose

The **panel inventory** — one row **per panel**, so the whole UI is visible in one place: every
page, its canvas, and each panel within it (source, purpose, services). A page with several
panels has several rows; the page/route/canvas columns repeat.

## Impact on ui-design

`specs/design/UI/ui-catalog.md` is a table with **one row per panel**:

| Page | Route | Capability | Canvas Type | Panel | Panel Type | Source | Purpose | Services |
|---|---|---|---|---|---|---|---|---|

- **Page / Route / Capability / Canvas Type** — the page-level columns (repeat for each of the page's
  panels); Canvas is the type (MultiPanel, Dashboard, Timeline, …).
- **Panel / Panel Type / Source / Purpose / Services** — the panel-level columns: the panel's name, its
  `panelType` (Detail | List), its `source` (entity / view / relationship), its **Purpose**
  (Maintenance | Reference), and its `services`.

Each row's panel matches the page-spec's `## Composition`. The catalog is the flat index over the
page set the `page-defaulting` capability derives and the user confirms — the single place to see
every panel and whether it is maintained or referenced.

**One page → many rows. Worked example (copy this shape, do not collapse a page to one row):**

`employee-profile.md` is a `MultiPanel` canvas with three panels, so it is **three rows** — not one
row with "employee maintenance, skills, assignments" in a single cell:

| Page | Route | Capability | Canvas Type | Panel | Panel Type | Source | Purpose | Services |
|---|---|---|---|---|---|---|---|---|
| employee-profile | /employees/:id | employee-records | MultiPanel | employee | Detail | Employee | Maintenance | Edit, Operate |
| employee-profile | /employees/:id | employee-records | MultiPanel | skills | List | Relationship (Employee↔Skill) | Maintenance | Edit |
| employee-profile | /employees/:id | employee-records | MultiPanel | assignments | List | Relationship (Employee↔Assignment) | Reference | Open |

The page/route/capability/canvas columns **repeat** on each panel row. A page-level table (one row
per page with panels listed in a prose cell) is **wrong for the catalog** — that page-level view is
`page-defaulting`'s page-set summary, a *different* artifact. The catalog is always panel rows.

## Impact on web-ui

Navigation must be consistent with the catalog — real client-routing links between the catalog's
pages, current page active, each target page exists — so the built app's page graph matches the
inventory.

## Template impact

- `ui-catalog` template → the panel inventory table (one row per panel).

## Checks

- Does the UI catalog list **one row per panel** (page / route / capability / canvas type + panel /
  panel type / source / purpose / services), with each row matching a panel in its page-spec's
  `## Composition`?
  · evidence: `specs/design/UI/ui-catalog.md` vs. the page specs
  · when: static
