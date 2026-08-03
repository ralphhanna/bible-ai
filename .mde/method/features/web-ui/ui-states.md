---
type: feature
id: ui-states
title: UI states (empty/loading/error/success)
origin: mde
impacts:
  - web-ui
default: n/a
---

# UI states (empty/loading/error/success)

## Purpose

Pages represent the states a real user hits — not just the happy populated view.

## Impact on web-ui

Empty, loading, error, and success states are represented where relevant to the page. Each
asserted error/empty/validation state is reachable and rendered.

## Checks

- Are empty, loading, error, and success states represented where relevant?
  · evidence: page source for each state + E2E reaching them (screenshots)
  · when: static (states present) + requires-environment (rendered proof)
