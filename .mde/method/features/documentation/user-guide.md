---
type: feature
id: user-guide
title: User guide (whole-system, end-user)
origin: mde
impacts:
  - documentation
default: n/a
---

# User guide (whole-system, end-user)

## Purpose

A UI-bearing app ships one consolidated, whole-system manual an end user reads to operate the
application — distinct from the per-use-case walkthroughs, which each trace a single actor path.

## Impact on documentation

When the UI is in scope, the app ships **one consolidated user guide** at
`docs/user-guide.md` — the manual an end user reads to operate the application. Unlike the
per-use-case walkthroughs (which trace a single actor path), the user guide is a **single,
cohesive, whole-system** document: what the app is for, how to sign in, the main
screens/navigation, and how to accomplish the primary tasks across capabilities, written for
a non-technical user. It links to the per-use-case walkthroughs for step detail rather than
duplicating them, and references the running UI (reuse existing `reports/evidence/screenshots/`). One
guide per app, kept current with the UI — a user guide that omits an implemented primary task,
or whose screens are stale relative to the current UI, is incomplete; flag it.

## Checks

- When the UI is in scope, does a single `docs/user-guide.md` exist that covers the app
  whole-system for an end user (purpose, sign-in, navigation/main screens, and how to do the
  primary tasks across capabilities), linking to the per-use-case walkthroughs rather than
  duplicating them? A guide that omits an implemented primary task, or whose screens are stale
  relative to the current UI, fails.
  · evidence: `docs/user-guide.md`
  · when: static
