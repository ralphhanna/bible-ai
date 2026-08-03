---
type: feature
id: stale-doc-detection
title: Stale-doc detection
origin: mde
impacts:
  - documentation
default: n/a
---

# Stale-doc detection

## Purpose

Stale screenshots/docs are **flagged**, not silently kept — outdated documentation is surfaced
rather than left to mislead.

## Impact on documentation

Screenshots/walkthroughs are updated when UI behavior materially changes; API docs when
contracts change; diagrams under `docs/diagrams/` when architecture/entities/flows/navigation
change. Where a doc/screenshot is now stale, it is flagged rather than kept as if current.

## Checks

- Are stale screenshots/docs flagged (and updated where behavior changed) rather than silently
  kept?
  · evidence: doc/diagram updates vs. the change; stale flags
  · when: static
