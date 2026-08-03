---
type: feature
id: row-selection-affordance
title: Row selection affordance (advisory)
origin: mde
impacts:
  - web-ui
default: on
---

# Row selection affordance (advisory)

## Purpose

Soft guidance on how a list row is selected. This is **advice, not a rule** — there is no check
and nothing fails a build over it. It exists to nudge generation away from redundant controls.

## Impact on web-ui

**Prefer a clickable row over a per-row "Select" button.** When a row in a list can be selected
by **clicking the row itself**, and there is a **clear visual cue** that the row is selectable and
which row is selected — a pointer cursor on hover, a hover state, and a distinct selected/active
style — an explicit per-row `Select` button is redundant chrome. Advise against adding it in that
case: the row *is* the affordance.

Add an explicit selection control only when the AI judges it genuinely warranted — for example
when selecting a row is not obviously distinct from opening it, or the interaction needs a clear
separate "choose this one" step. **Left to the AI's judgment**; the method only advises the
lighter, cue-driven default.

This complements — it does not override — [[actionable-controls]] (controls must do something),
[[reference-display]] (navigate/choose by display-label, not raw id), and [[stable-selectors]]
(selectable elements remain test/annotation-addressable whether the affordance is a row or a
button).

## Checks

- Where row click performs selection, does the row provide visible hover/selectable and selected
  states without adding a redundant per-row Select button? Where selection and opening are
  different operations, is their distinction clear and keyboard accessible?
  · evidence: Page Spec List action/relationship and rendered list behavior
  · when: AI review at go / review app (advisory)
