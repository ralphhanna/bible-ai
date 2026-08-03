---
type: feature
id: operation-coverage
title: UI coverage (design §6)
origin: mde
impacts:
  - ui-design
  - web-ui
  - testing
default: n/a
---

# UI coverage (design §6)

## Purpose

Ensure the UI **covers what the business design defines** — and produce a **coverage report** so
the gap is visible and verifiable. Coverage has **dimensions**; the set is **open**, not a fixed
list. The UI must come to cover any new kind of coverable element the design adds, without editing
this capability.

- **For-sure dimensions** (always checked when present; uncovered = a **blocking** gap for a
  complete-design plan):
  - **Entity operations** — every operation some role may perform (`<entity>.<op>`) is rendered
    by ≥1 panel.
  - **Use cases** — every in-scope use case is served by ≥1 page.
- **Open-door dimensions** (checked when the design defines them; uncovered is **reported**, not
  blocking, until explicitly promoted): **workflows** (stages represented), **role dashboards /
  landings**, **KPIs**, and any future element kind. A new dimension extends the report; it does
  not require editing this capability to be *reported*.

## The coverage report

`mde evaluate` derives `specs/design/UI/operation-coverage.md` — one section per coverage
dimension present in the design. Each row: the coverable element → the page(s)/panel(s) that
cover it → **uncovered** flagged. The report is the reviewable evidence and the verification
input (it is a real artifact, not a summary).

## Impact on ui-design

A panel claims operations via its `## Composition` `operations:` (`<entity>.<op>`); a page serves
a use case via its `## Supported Use Cases`. For a **complete-design** plan, coverage of the
**for-sure** dimensions is the plan's contract: `mde evaluate` derives "every required operation
rendered and every in-scope use case served" into `acceptance.md`, and an uncovered for-sure
element = that plan failed. A BA/partial plan's un-covered elements are **pending**, not defects.
Inversely, a panel op-id resolving to no permitted entity operation is **up-drift** — always a
failure (within-plan); reconcile to the entity. App-wide gaps are found by `mde review app`.

## Impact on web-ui

A panel claims operations; the live page renders them.

## Impact on testing

The rendered, role-permitted operations are the denominator for `required-operation-ui-coverage`
(each must have a performing E2E scenario).

## Checks

- **Up-drift (always):** does every panel operation id resolve to a declared, role-permitted
  entity operation?
  · evidence: page-spec `## Composition` panel operations vs. entity `## Operations`
  · when: static
- **Down-coverage, for-sure dimensions (complete-design plans only):** is every role-permitted
  in-scope operation rendered by a panel, and every in-scope use case served by a page?
  · evidence: `operation-coverage.md` (entity-operations + use-cases sections) vs. `acceptance.md`
  · when: static

The down-coverage question has no single owning plan — a required operation and the panel that
should render it may come from two entirely different plans, so it can only be answered whole-app
(see `.mde/mde.specs/design/verification.md`). Gated on `operation-coverage.md` existing (the
complete-design signal), same condition the script-level gate used before this moved here; the
report not existing yet is "pending design", not a failure, and this check simply does not fire.

```check scope=system
WHEN  $app.hasFile["specs/design/UI/operation-coverage.md"] IS "true"
ASK   "Read every entity's ## Operations table across specs/business/entities/**, every panel's operations: list in every page-spec's ## Composition under specs/design/UI/pages/**, and every page's ## Supported Use Cases, across the whole project. List any role-permitted entity operation (<entity>.<op>) that no panel renders, and any in-scope use case that no page serves. Do not report up-drift here (a panel operation id with no declaring entity) — that is a separate, always-on, plan-scoped check."
```
- **Coverage report present and current:** does `operation-coverage.md` exist with one section per
  dimension the design defines (entity-operations, use-cases, and any open-door dimensions
  present), each element marked covered or uncovered?
  · evidence: `specs/design/UI/operation-coverage.md`
  · when: static
