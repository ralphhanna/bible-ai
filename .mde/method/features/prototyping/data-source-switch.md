---
type: feature
id: data-source-switch
title: Capability-aware data-source switch (fake → real)
origin: mde
impacts:
  - web-ui
  - application-design
default: n/a
---

# Capability-aware data-source switch (fake → real)

## Purpose

The switch from the fake JSON API to the real API must happen **when the real API is
generated**, not as a manual step. It realizes the **`data-source` stack axis** recorded in
`specs/design/tech-stack.md`, resolved **per capability** by the API client:

```text
src/server/<cap>/Routes.ts exists?  → page uses the REAL  /api/<cap>
otherwise                           → page uses the FAKE  JSON API
```

Each capability flips itself the moment its real API is generated — automatically,
incrementally, nothing to forget.

## Impact on application-design

The `data-source` axis is **declared** in the stack templates and **recorded** in
`specs/design/tech-stack.md` (Application Design target reads it and ties it to the resolver). Source →
reader → enforcer: the axis is real only when it has all three.

## Impact on web-ui

Each page must resolve to the **real** `/api/<cap>` once `src/server/<cap>/Routes.ts`
exists, and to the **fake** JSON API otherwise; no page hard-codes a base URL. The fake-API
pipeline serves a capability until its real API exists; the resolver realizes the axis, so the
UI promotes to production with **no page rewrite** — only the resolver flips as real APIs appear.

## Template impact

- **API client template** (`src/web/src/api/`) → the per-capability resolver.

## Checks

- Does the API client resolve **per capability** (real `/api/<cap>` when `Routes.ts` exists,
  else fake), and does **no page hard-code a base URL**?
  · evidence: API client source + page imports
  · when: static
- Does every page still on the fake API **genuinely lack** a real API for its capability
  (else it is drift)?
  · evidence: per-page resolved source vs. `src/server/<cap>/Routes.ts` presence
  · when: static
