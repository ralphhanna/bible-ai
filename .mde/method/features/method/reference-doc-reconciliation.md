---
type: feature
id: reference-doc-reconciliation
title: Reference-doc reconciliation (method ↔ docs/reference)
origin: mde
impacts:
  - method-change
default: n/a
---

# Reference-doc reconciliation

## Purpose

The reference docs under `.mde/docs/reference/` are the **canonical model** of the method
(e.g. `plan-status.md`, `features-targets-validation.md`, `core-concepts.md`). A method
change must not silently contradict them: where it supersedes a doc, the doc is updated in the
**same plan** so method and reference stay in sync.

## Impact on method-change

Before `go` finalizes a method change, **if `.mde/docs/reference/` exists**, reconcile the change
against it: confirm the changed rules/commands/features/templates do not **contradict** the
reference docs. Where the change intentionally supersedes a doc, **update that doc in this plan**
and record it in the manifest, so the canonical model and the method agree. A method change that
conflicts with the reference docs is a defect to resolve before finalizing. When the folder does
**not** exist (projects do not ship the reference docs), this does not apply — skip it.

## Checks

- When `.mde/docs/reference/` exists, is the method change **consistent** with the reference docs
  (no contradiction), with any superseded doc updated in the same plan and manifest-listed?
  · evidence: changed method files vs. `.mde/docs/reference/*`; updated docs in the manifest
  · when: static
