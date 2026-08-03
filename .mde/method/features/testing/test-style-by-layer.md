---
type: feature
id: test-style-by-layer
title: Test style by layer
origin: mde
impacts:
  - testing
default: n/a
---

# Test style by layer

## Purpose

Tests are written in a layer-specific style so behavioral tests read as specifications and unit
tests stay close to the code.

## Impact on testing

- **API** and **UI/E2E** behavior → **Gherkin `.feature`** files (Given/When/Then) with step
  definitions wired to the real route/UI (the stack's Cucumber binding).
- **Unit** tests → the stack's **native** runner (vitest/jest, pytest, xUnit) — not Gherkin;
  cover rules, validation, calculations, mapping logic.
A plan implementing API/UI behavior with **no `.feature` files** for those layers fails this.

## Checks

- Are API and UI/E2E behaviors expressed as Gherkin `.feature` scenarios (steps wired to the
  real route/UI), and are unit tests in the native runner?
  · evidence: presence of `.feature` files for API/UI + native unit tests
  · when: static
