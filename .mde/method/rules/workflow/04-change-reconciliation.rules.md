---
type: method-rule
id: RULE-WORKFLOW-004
title: Change Reconciliation
category: workflow
applies_to:
  - drift
  - reconciliation
  - plans
  - specs
  - page-specs
  - ui-catalog
  - source
  - output
---

# Change Reconciliation

MDE does not assume artifacts remain synchronized.

Users and AI may change real artifacts while a plan is active. Users may also edit artifacts manually outside MDE. Any direct edit, generated output, or discovery may create drift.

The plan's job is to detect, classify, explain, and reconcile those changes.

## Reconciliation directions

A reconciliation plan classifies drift as:

- **forward**: specs/page specs drive prototype/app/output changes,
- **backward**: prototype/source/output retrofits specs/page specs/UI catalog,
- **mixed**: both sides changed and must be merged,
- **rejected**: change is invalid, temporary, experimental, or should be reverted.

## Evaluate as reconciliation checkpoint

`mde evaluate` is the main reconciliation checkpoint.

It compares:

- current working changes,
- plan intent and scope,
- `impact.md`,
- `output.manifest`,
- relevant specs/artifacts,
- and the clean baseline established at start.

It then classifies changes as:

- **expected**: matches current impact/scope,
- **new-in-scope**: not previously listed, but appears consistent with intent,
- **needs-confirmation**: plausible, but user should confirm,
- **out-of-scope**: does not belong to the current plan,
- **unwanted**: should be selectively reverted,
- **unknown/manual**: changed outside clear plan attribution.

## Review and correct

After evaluate, the user may:

- continue with the current changes,
- adjust artifacts directly,
- update scope/impact to include newly accepted changes,
- selectively revert unwanted changes,
- or cancel the plan for full rollback.

The default is adjust and continue. Full rollback is handled by `mde cancel`, not by ordinary evaluate.

## Reconciliation work

A reconciliation pass should:

1. detect changed, added, deleted, or newly generated artifacts,
2. classify the artifact layer,
3. classify the reconciliation direction,
4. infer affected upstream/downstream artifacts,
5. update impact with what is now known,
6. propose or apply user-directed corrections,
7. record touched artifacts in the plan-local manifest,
8. refresh consolidated trace when finalization changes it.

## Prototype and source discoveries

When a prototype introduces pages, actions, workflows, fields, validations, filters, or navigation not captured in Page Specs or UI Catalog, MDE must flag drift and propose retrofitting Page Specs and the UI Catalog.

When source changes imply intended behavior, MDE may propose retrofitting Page Specs, UI Catalog, Design Specs, or Business Specs. User confirmation is required before treating source-discovered intent as durable truth.

## Entity operations and page parts

The operations an entity declares and the operations the UI renders are two sides of one relationship.

- **Down-gap (model -> design):** an entity operation some role may perform, but no page part renders it.
- **Up-drift (design -> model):** a page part renders an operation that no entity declares or no role may perform.

The operation id `<entity>.<op>` is the join key.

Every `mde go` must leave this relationship consistent for artifacts touched by the plan. `mde start` may re-check the invariant before building on top of existing work. `mde review app` audits it app-wide.

## Cancel and rollback

`mde cancel` rolls back the plan's repository changes to the start baseline when possible.

Selective revert during review is allowed for specific files, hunks, or generated artifacts. It does not cancel the plan.

Applied runtime/database changes are different from repository changes and require the rollback strategy declared by the relevant DB apply step.

Core reconciliation does not require a specific Git workflow; command profiles define exact mechanics.
