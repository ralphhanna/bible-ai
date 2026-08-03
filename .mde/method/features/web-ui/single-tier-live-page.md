---
type: feature
id: single-tier-live-page
title: Single-tier live page (one tier = production)
origin: mde
impacts:
  - web-ui
default: n/a
---

# Single-tier live page

## Purpose

There is **one** UI tier: the live page — **no separate mock-up artifact**. The page renders
against a **fake JSON API** until the capability's real API exists, then against the real API
with **no frontend change** (see `data-source-switch`). The same file is the prototype and the
production page.

This retires the former two-tier model (hand-built `mockups/<slug>.html` alongside live
pages), which produced two concrete artifacts per screen that drifted in styling and data.

## Impact on web-ui

When UI is in scope, the live pages are produced directly — there is no separate "prototype"
request and no mock-up tier. A built page is the live page, and the Web-UI operational
expectations apply to it (real data from the data source, working filters/nav/controls,
design-system styling). The drift guards (governed values trace to Business Specs; styling has a
single source) hold regardless.

**One file per page.** Each page spec is realized as its **own** page component file at
`src/web/src/pages/<page>.tsx` — one file per page in the UI catalog. Pages are **not**
collapsed into `App.tsx` or a single shared file: `App.tsx` wires routing and mounts the
pages; each page's markup/behaviour lives in its own `pages/<page>.tsx`. A single file
containing many pages is drift — it defeats per-page ownership, review, and traceability.

Locations (one tree, no separate prototype UI):

| Thing | Location |
|---|---|
| Each page (one file per page) | `src/web/src/pages/<page>.tsx` (one per page spec — live = production) |
| App shell / routing | `src/web/src/App.tsx` (mounts pages; not the pages themselves) |
| API client | `src/web/src/api/` (resolves data source; no hard-coded base URL) |
| Fake-API server + transform | `tools/fake-api/` (dev tooling) |
| Seed data | `db/seeds/` |

## Checks

- Do the live pages live at `src/web/src/pages/` (**one tree**), with fake-API tooling under
  `tools/fake-api/` — **no separate mock-up/prototype UI location**?
  · evidence: directory layout
  · when: static
- Is there **one file per page** — each page spec realized as its own `src/web/src/pages/<page>.tsx`,
  not collapsed into `App.tsx` or a single file?
  · evidence: one `pages/<page>.tsx` per page in `UI/ui-catalog.md`
  · when: static
