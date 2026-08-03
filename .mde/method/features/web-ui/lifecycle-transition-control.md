---
type: feature
id: lifecycle-transition-control
title: State Transition subpanel (governed lifecycle change)
origin: mde
impacts:
  - web-ui
default: n/a
---

# State Transition subpanel (governed lifecycle change)

## Purpose

Present lifecycle decisions deliberately and safely without prescribing one universal control
shape. A state change belongs to a panel-owned action and exact target. It exposes the current
state, valid new state or decision, impact, rules, and confirmation before committing.

A lifecycle outcome may be committed with a record Save when state is one editable part of a
larger change. It may instead be a named terminal action such as Submit, Approve, Reject, Cancel,
Acknowledge, or Reopen when that action completes a scoped business review or decision. The Page
Spec declares which model applies; the method does not force every transition through a generic
Save.

## What counts as a lifecycle transition

An entity operation whose `kind` is `lifecycle`, with valid transitions, guards, consequences,
roles, and scope defined by the entity lifecycle and operation specifications. Use-case operations
that do not transition lifecycle remain ordinary `Operate` actions.

## Impact on web-ui

The `StateTransition` subpanel is owned by the panel/action that proposes or commits the change and
shows:

- **Current State** — the persisted state;
- **New State / Decision** — only valid reachable outcomes;
- **Impact** — consequences for affected objects, dates, permissions, or processes;
- **Rules** — guards, permissions, validation results, and blocking conditions.

The rendering follows the business semantics:

- **Edit-with-state:** when state is one field in a broader record edit, the proposed state is
  committed by that panel's Save action with the other edits.
- **Terminal decision:** when the use case is Submit, Approve, Reject, Cancel, Acknowledge, Reopen,
  or another lifecycle decision, the named action may commit immediately after required review or
  confirmation. It is terminal only for its declared panel context, not the whole page.

In both cases, the action targets the exact inline, selected, routed, draft, modal, or checked
record context defined by [[page-composition]]. It never falls back to a first/default record.
Abandoning the active context discards the proposed transition and leaves Current State unchanged.
Where the entity is versioned, the committing action carries the version and handles conflicts.

## Checks

- Does every lifecycle change appear through a `StateTransition` subpanel showing Current State,
  valid New State/Decision, Impact, and Rules before commit?
  · evidence: Page Spec panel/subpanel/action and rendered page
  · when: static + AI review at go / review app

- Does the transition offer only outcomes reachable from the current state, with guards and
  consequences drawn from the entity lifecycle and operation specifications?
  · evidence: rendered options and supporting text vs. entity lifecycle
  · when: static

- Does the committing action use the appropriate declared model—record Save for edit-with-state,
  or a named terminal action for a scoped lifecycle decision—without duplicating both paths?
  · evidence: Page Spec action and handler/API behavior
  · when: static + AI review at go / review app

- Is the action bound to the exact panel target and terminal scope, with required selection,
  permissions, validation, confirmation, persistence, and optimistic version handling?
  · evidence: Page Spec panel/action/relationships and implementation path
  · when: static + requires-environment

- Are non-lifecycle use-case operations left as `Operate` actions rather than being folded into
  the lifecycle selector?
  · evidence: operation kinds vs. rendered controls
  · when: static
