---
type: ui-catalog
template: ui-catalog
artifact: design-specs
version: 3
mergePolicy: user-owned   # the manually-curated navigation map (specs-boundaries.md)
---

# UI Catalog

## Purpose

The UI Catalog is the **panel inventory** — one row **per panel** across all pages, so the whole
UI is visible in one place: every page, its canvas, and each panel within it (source, purpose,
services). A page with several panels has several rows.

Use cases, page specs, prototypes, and app implementation reference the catalog instead of
inventing duplicate pages or panels.

## Panels

One row per panel. Page / Route / Capability / Canvas / Roles repeat for each of the page's panels.

| Page | Route | Capability | Roles | Canvas Type | Panel | Panel Type | Source | Purpose | Services |
|---|---|---|---|---|---|---|---|---|---|
| {{page_id}} | {{route}} | {{capability}} | {{roles}} | {{canvas_type}} | {{panel}} | {{detail_or_list}} | {{source}} | {{maintenance_or_reference}} | {{services}} |

- **Roles** — the page's `## Roles` list (navigation only — which roles' menu shows this page; not access control). Taken from the page spec.
- **Canvas** — the canvas type: MultiPanel / Dashboard / Calendar / Timeline / Kanban / Tree / Map / Diagram / Workflow.
- **Panel Type** — Detail (one record) | List (many).
- **Source** — the entity, view, or relationship the panel is about.
- **Purpose** — Maintenance (full edit; the canonical place the source is edited) | Reference (read-only/summary, navigates to the Maintenance panel).
- **Services** — Edit / Operate / Open / Inspect / Order / Transfer.

Each row matches a panel in that page's `## Composition` (page-spec).

## Navigation Map

| From Page | Action/Trigger | To Page | Purpose |
|---|---|---|---|
| {{from_page}} | {{trigger}} | {{to_page}} | {{purpose}} |
