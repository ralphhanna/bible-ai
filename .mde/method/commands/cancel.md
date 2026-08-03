---
type: command
command: mde cancel
loads:
  - rules/core/*
  - rules/workflow/*
  - active plan
---

# mde cancel

Purpose: abandon the active plan — undo its changes and drop the plan. `cancel` is `change`'s
rollback **without** keeping the plan: both roll back the plan-owned files; `change` returns the
plan to `draft` to rebuild, `cancel` ends it.

## Preconditions

- **Tail-draft rule.** Cancel applies to the **tail draft plan** — the latest plan on the branch **all of whose successors are still `draft`**. A plan with any non-`draft` (evaluated/executing/executed) plan after it on the branch **cannot** be cancelled (something is built on top of it); recommend a new corrective plan instead. Example: with `112 evaluated, 113 draft`, `112` is cancellable (its only successor 113 is draft); with `017 evaluated, 018 evaluated`, `017` is not.
- **Manifest-scoped rollback.** Roll back only the plan's manifest-listed plan-owned files; external/user-owned dirty files are never reverted or deleted — warn that they exist and leave them as-is.

## Behavior

1. Undo the plan's execution on the current branch — **only the manifest-listed plan-owned files**
   (`git restore`/revert scoped to those paths, or revert the reconciliation commit). `main` is
   never touched; external dirty files are left untouched (warn if any exist).
2. Exclude the plan from the delivered release scope.
3. Set lifecycle to `cancelled` (terminal), clear the active-plan pointer, and
   record the cancellation in `log.md`.

## Boundary

`cancel` is available only before release and only for the **tail draft plan** (rollback safe for later unreleased work); after release, correct forward with a new plan. It is a
governed wrapper — git rollback plus the bookkeeping (state, pointer, log), not a
raw `git reset`.
