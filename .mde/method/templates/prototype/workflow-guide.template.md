---
id: TEMPLATE-PROTOTYPE-WORKFLOW-GUIDE
type: template
title: Prototype Guided Workflows
artifact: prototype
used_by_commands:
  - mde go
relatedRules:
  - TARGET-PROTOTYPING
  - TARGET-WEB-UI
  - TARGET-BUSINESS-REQUIREMENTS
---

# Prototype Guided Workflows (generated, opt-in)

<!-- Semantic references (semantic-references feature): tag named MDE objects {{kind:slug}} —
     {{use-case:slug}} for the workflow, {{web-page:slug}} for pages stepped through,
     {{entity:slug}}/{{role:slug}} as named. Do not tag objects that don't exist. -->

Shape for the **generated** guided-workflows facet (Prototyping target → Interactive /
reviewable prototypes). Steps a user through the **existing live pages** in a defined
order — it does **not** duplicate the app's screens. Opt-in per plan.

## Source of truth (derive, do not duplicate)

The unit is the **capability workflow**:

```
specs/business/capabilities/<cap>/workflow.md   (ordered Stages)
   each stage → a use case (use-cases/<slug>.md)
      each use case → a page spec → a live route
```

Generate a catalog **referencing** these by id/path — do **not** copy large requirement
text into the catalog.

## What to generate

1. **`<web>/workflows/workflows.<ext>`** — the catalog: one `Workflow` per capability
   (id, title, capability, actor, goal, optional prerequisites, `sourcePath`), with ordered
   `steps`. Each `step` = `{ id, title, instruction, route, expectedResult? }` where
   `route` is an **existing app route** (from the stage's page spec). A step may carry an
   optional `target` (`elementId` / `testId`) to point at a control on that page.

2. **`/workflows` library page** — list workflows grouped by capability (title, actor,
   goal; status if progress exists; start/resume).

3. **`/workflows/:id` detail** — overview, prerequisites, ordered steps, related rules,
   start/resume/restart.

4. **Active-step rail** — when a workflow is active, a compact rail on the live pages shows
   the current step (title, instruction, expected result) with prev / mark-done / next, and
   (if annotations are present) an "add annotation" action that captures workflow+step
   context. The rail appears on existing pages; it never replaces them.

## Progress

Per-session, prototype-grade: `localStorage` (e.g. `workflow-progress-v1`) holding
`{ workflowId, currentStepId, completedStepIds, status }`. Production moves this to backend
user state.

## Derivation rules (no invention)

- Every workflow traces to a capability `workflow.md`; every step's `route` is a real route
  defined by a page spec. Do not invent steps or routes not backed by the model.

## Verification (at `mde go`)

- Catalog entries trace to existing use cases; every `step.route` is a real app route (unit).
- Starting a workflow shows the rail and routes into the live page (E2E); progress survives reload.

## Notes

This template defines the **shape**; the catalog and pages are generated from each
project's capability workflows and use cases.
