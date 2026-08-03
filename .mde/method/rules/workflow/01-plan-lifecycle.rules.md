---
type: method-rule
id: RULE-WORKFLOW-001
title: Plan Lifecycle
category: workflow
applies_to:
  - plans
  - draft
  - evaluate
  - go
  - cancel
  - baseline
---

# Plan Lifecycle

How a plan proceeds from start to finalize. The stable framework concepts these steps operate over are in `rules/core/`.

## Plan working model

A plan is a governed change context, not a physical sandbox.

`mde start` is conservative:

- it opens the plan,
- captures initial intent and scope,
- establishes a clean baseline for rollback/change detection,
- and must not autonomously modify durable business, design, source, test, docs, runtime, or **`.mde/method/`** artifacts.

**Draft (chat) writes only plan-local files.** While a plan is in `draft`, the user and AI shape it through conversation, but the only files written are the plan's own — `scope.md`, `discussion.md`, and draft previews under the plan folder. Draft does **not** write durable artifacts: Specs, design, source, tests, docs, runtime, **or `.mde/method/` files** (rules, commands, features, templates, targets). The method is a durable write-target exactly like specs/source — and, like them, only when the plan's scope covers it.

**Capture in discussion; evaluate materializes.** A user request during draft to create or change any durable artifact — including a method file — is **recorded as a `discussion.md` decision** (the intent), not written on the spot. **`mde evaluate` is what materializes** durable candidate artifacts from the contract (planned-manifest-first); `mde go` accepts and commits them. So: chat → a discussion decision; evaluate → writes the file. Editing a durable or method file directly during draft/chat is a boundary violation. (The positive how-to — explore in draft, record diagnosis/fix/impact in `discussion.md`, let evaluate write it — is in `start.md`'s draft section.)

The durable artifacts a plan produces are plan-owned candidate changes (recorded in `output.manifest`) until the plan is finalized at `go`.

## Working changes

Plan boundaries are logical, not physical.

During an active plan, user-directed work may modify artifacts in their normal durable locations. The plan tracks those changes through impact, manifest, log, and change detection.

`evaluate` compares the current working changes against intent, scope, impact, and manifest. `go` finalizes accepted changes. `cancel` rolls back plan changes where rollback is available.

## Clean baseline rule

A new plan requires a clean working tree by default. Existing uncommitted changes must be handled before start by one of these choices:

- commit them,
- stash/shelve them,
- discard them,
- or explicitly absorb them into the new plan.

The baseline must be clear enough for the plan to detect, explain, and roll back its own changes.

## Evaluate and go

`evaluate` is a review/checkpoint command. It refreshes impact, detects current changes, classifies drift, and may create or update real artifacts as draft plan changes.

`go` finalizes the current accepted plan changes. Think of `go` as commit/finalize/close, not as the first moment work is allowed to happen.

**`go` is user-initiated.** The agent may **state that `go` is the next step** once a plan is `evaluated`, but it must **not ask the user to commit** — never solicit the commit, never prompt "shall I commit / ready to finalize?", and never ask for a commit **half-way** through the work. The agent does the plan work and stops at a reviewable state; the user runs `mde go` when they decide.

`cancel` rolls back the plan changes to the start baseline, subject to runtime/database rollback limits.

## Database/runtime exception

Repository artifacts can usually be rolled back by Git. Applied runtime changes, especially database schema/data changes, cannot be assumed rollback-safe.

Database changes may be prepared as migration files during the plan, but applying them requires an explicit DB apply decision and a declared rollback strategy:

- **backup-restore**, or
- **reverse-migration**.

Destructive, forward-only, or data-changing migrations require explicit user confirmation before apply.
