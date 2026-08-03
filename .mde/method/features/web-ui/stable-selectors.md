---
type: feature
id: stable-selectors
title: Stable selectors
origin: mde
impacts:
  - web-ui
  - testing
default: n/a
---

# Stable selectors

## Purpose

Important elements carry stable selectors or accessible labels — enabling both E2E test
targeting and annotation targeting.

## Impact on web-ui

Stable selectors or accessible labels exist for important elements (`id` / `data-testid` first,
DOM path as fallback). This is the expectation the annotations capability and E2E tests both rely
on to address elements.

## Impact on testing

E2E/UI tests drive the running UI through these selectors; without them, scenarios are brittle.

## Checks

- Do important elements carry stable selectors / accessible labels (`id`/`data-testid`)?
  · evidence: page source selectors
  · when: static

```check scope=plan
# UI design compliance — DETERMINISTIC core, cross-cutting over all page artifacts
# (scope=plan scanning $plan.trace): every page must carry stable selectors
# (data-testid) so it is test- and annotation-addressable.
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $t.content CONTAINS "data-testid"
  ELSE "page has no stable selectors (data-testid) — not test/annotation-addressable"
```

<!-- semantic (AI pass, not a `check` block): "does every action the page spec's
     ## Actions declares have a corresponding stable selector / control?" needs
     the AI to distinguish primary page actions (a button + testid) from inline
     sub-actions ("Add skill" within a profile). $spec.page[$item.page].actions
     lists them; the AI judges coverage. A crude substring match over-flags inline
     actions, so the precise action↔selector mapping is a semantic check. -->

