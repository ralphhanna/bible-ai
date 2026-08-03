---
type: feature
id: annotations
title: Annotations (reviewer feedback on live pages)
origin: mde
impacts:
  - web-ui
  - testing
default: on
---

# Annotations

## Purpose

Reviewer feedback attached to live page elements, persisted and re-displayed on reload, so
a reviewer (or an AI) can leave contextual notes on the running prototype. The mechanism is
**domain-agnostic** — it targets an element by `id`, then `data-testid`, then a DOM path,
and stores the note — so it ships as a **library copied once**, not regenerated per project.

## Impact on web-ui

A standard UI facet, produced **whenever UI is in scope** (cheap, domain-agnostic) — the user
does not have to request a "prototype." Delivered as a **shipped library** (copied into the
project once at `assets/annotations/`), not generated per project — regenerating fiddly
selector / re-attach logic each time is waste and a correctness risk.

**Dev-only — gated by an `.env` flag.** Annotations are a review/development affordance, not a
shipping feature: the toolbar/bridge mount only when a dev flag is on (e.g. `VITE_DEV_ANNOTATE` /
`MDE_DEV_TOOLS`), and are absent/disabled in a production build. (Same treatment as the
role/user switcher.)

Annotations attach to the **real application server, never the fake-API data layer** — they
are cross-cutting app/review metadata, not business data, and must survive the fake→real
capability transition. The annotation client calls a **relative** `/api/annotations` (routed to
the app server), not the capability resolver; the router persists to one JSON file. No new
server, no new port.

Requires **stable selectors / accessible labels** on important elements (`id` /
`data-testid` first, DOM path as fallback), so notes re-resolve to the same element across
reloads. This is the Web-UI "stable selectors" expectation, here motivated by annotation
targeting.

## Impact on testing

Stable selectors that annotations rely on are the same ones E2E tests use to drive the
running UI — keep important elements addressable.

**A live-app plan must ship an E2E test that proves app annotation actually works** — not just
that selectors exist. The test loads the running app embedded as the Workbench does, completes
the `mde-wb-hello` → `mde-app-ready` handshake, enters annotate mode, clicks an element, and
asserts the app posts an `mde-annotation` message (or that a note round-trips through
`/api/annotations` and re-resolves to the same element on reload). An app where this test is
absent or failing has **not** delivered the annotations facet, regardless of whether the library
files are present.

## Template impact

- **app-shell template** → a mount point for the annotation toolbar.
- **app-server template** → a mount point for the annotations router (`/api/annotations`).
- **assets** → the shipped annotation library is included once (`assets/annotations/`).

## Checks

- Is the annotations library present and **mounted on the app server** (not the fake API)?
  · evidence: the toolbar mounted in the app shell + the router mounted on the app server
  · when: static
- Are annotations a **copied library**, not regenerated bespoke code, and do they call a
  relative `/api/annotations` on the real server rather than the capability resolver?
  · evidence: `assets/annotations/` present; client calls `/api/annotations`
  · when: static
- **Is the app-side bridge file actually copied into the app and wired in (behind the dev
  flag)?** The `mde-annotate-bridge.js` master must be copied to the app's served web public dir
  (e.g. `src/web/public/mde-annotate-bridge.js`) **and** referenced by a `<script>` tag in the
  app shell (mounted behind the dev `.env` flag), and the annotations router mounted on the app
  server. Any plan that builds UI whose served app is missing the bridge file, the `<script>`
  reference, or the router mount has **not** delivered the facet — this is a verification failure,
  not a warning. (The library existing only under `.mde/assets/` does not count: it must
  reach the running app.)
  · evidence: `src/web/public/mde-annotate-bridge.js` exists; app-shell template references it
    behind the dev flag; annotations router mounted on the app server
  · when: static
- Do important elements carry **stable selectors** (`id`/`data-testid`) so notes re-resolve?
  · evidence: page source selectors
  · when: static
- **Does an E2E test prove app annotation works end-to-end?** Embedded-app handshake
  (`mde-wb-hello` → `mde-app-ready`), enter annotate mode, click an element, and assert an
  `mde-annotation` message is posted / a note round-trips `/api/annotations` and re-resolves on
  reload. Absent or failing ⇒ the facet is not delivered.
  · evidence: the annotation E2E spec + its run output under `evidence/logs/`
  · when: static (test present) + requires-environment (E2E proof)
