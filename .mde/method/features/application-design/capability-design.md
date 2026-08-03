---
type: feature
id: capability-design
title: Capability design
origin: mde
impacts:
  - application-design
default: n/a
---

# Capability design

## Purpose

For each in-scope capability, a **thin design index**: what the capability is, its primary
entity, its module boundary, and **references** to the artifacts that hold the detail — its
entities, use cases, and pages. It **indexes**; it does not restate.

## Impact on application-design

`specs/design/capabilities/<slug>/overview.md` records the capability's **primary entity**, its
**module boundary** (what it owns vs. consumes from other capabilities), and **references** (tagged
`{{kind:slug}}`) to: its **entities**, its **use cases**, and its **pages**. Design specs cover
every in-scope capability. Each reference traces to the artifact that owns the detail.

**The overview is an index of references, not a re-narration.** It **must not** contain:

- an **API / operations table** — operations are declared on the **entity** (`## Operations`),
  realized by **use cases** (each `## Realization` names the operation), and access lives on the
  operation (roles + scope); the HTTP contract is the generated `openapi.yaml` (code-first). The
  overview does not restate operations, endpoints, or access.
- a **pages table** — pages are their own specs under `specs/design/UI/pages/`; the overview
  **references** them, it does not copy their routes/purpose.
- **use-case realizations** — a use case's realization lives in its own file's `## Realization`
  section (see `use-case-realization`); the overview **references** the use cases, it does not
  restate their steps/operations.
- a **validation/errors** or **persistence-boundary** narrative — those are the api-design /
  persistence-design targets' concerns.

Duplicating any of these here is drift: the same fact then lives in two places and rots. Keep the
overview to capability identity + module boundary + references.

## Template impact

- `capability` design template → primary entity, module boundary, and **reference lists** (tagged
  `{{entity:…}}` / `{{use-case:…}}` / `{{web-page:…}}`) — **no** API/operations table, **no** pages
  table, **no** inline use-case realizations.

## Checks

- Does each in-scope capability's overview record its **primary entity** and **module boundary**,
  and **reference** (tagged `{{kind:slug}}`) its entities, use cases, and pages?
  · evidence: `specs/design/capabilities/<slug>/overview.md`
  · when: static + AI review
- Is the overview a **thin index** — free of a restated API/operations table, a pages table,
  inline use-case realizations, or a validation/persistence narrative (all of which live in their
  own artifacts)?
  · evidence: overview body vs. the entity `## Operations` / `UI/pages/` / use-case `## Realization`
  · when: static + AI review
- Does the capability **realize every in-scope use case** it owns (a filled `## Realization`
  section in each use-case file)?
  · evidence: capability's in-scope use cases vs. their `## Realization` sections
  · when: static + AI review
