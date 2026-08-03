---
type: command
command: mde change
loads:
  - rules/core/*
  - rules/workflow/*
  - active plan
---

# mde change

Purpose: reopen a plan that has already completed `go` but has not yet been released, roll
back its plan-owned built artifacts, and return it to `draft` so a fresh evaluate (then `go`)
rebuilds. Pre-`go`, do not reach for this command: amend `scope.md` / `discussion.md` directly
and re-run `mde evaluate` if needed. `change` exists for the post-`go` rollback/rebuild case.

## Behavior

1. **If the plan is pre-`go`, stop using `mde change`.** For `draft` plans, update
   `scope.md` / `discussion.md` as ordinary plan editing. For `evaluated` plans, record the
   change, set lifecycle back to `draft`, and re-run `mde evaluate`. Delete nothing and do not
   call this rollback command.
2. **For post-`go` plans only, capture the requested change** in `discussion.md` (a resolved
   decision), and in `scope.md` if the scope itself changed.
3. **Roll back the built plan-owned set.** For `executed` / `partially-executed` / `blocked`
   plans, the plan wrote **durable** artifacts, so roll back the build — but only the
   manifest-listed plan-owned files (`git restore`/revert scoped to those paths, or revert the
   reconciliation commit on the version branch; `main` is never touched). Leave external dirty
   files untouched and warn if any exist. Rolling back the plan-owned set is what handles
   **removals** — a rebuild that produces fewer artifacts leaves no orphans.
4. **Set lifecycle to `draft`**; update `log.md` and derived `status.md`. Draft is the forcing
   function — the next `mde evaluate` re-derives all plan artifacts (the candidate artifacts,
   impact, acceptance, tasks, manifest) from the changed contract, and `go` rebuilds.

Pre-`go`, `change` is not needed. Editing the plan and re-running `evaluate` is the normal path,
since nothing has been accepted by `go` yet.

## Preconditions

- The plan has completed `go` (`executed`, `partially-executed`, or `blocked`) and has not been
  released. If the plan is still `draft` or `evaluated`, amend the plan directly and re-evaluate
  instead of using `mde change`.

These apply when rolling back a completed unreleased build:

- **Safe rollback scope.** The plan must be the active/latest unreleased plan, or there must be
  no later plan commits depending on it. If later plans exist on the version branch, do not roll
  back automatically — recommend a new corrective plan unless the user approves a rebase.
- **Manifest-scoped.** Roll back only manifest-listed plan-owned files; external/user-owned dirty
  files are never reverted or deleted — warn that they exist and leave them as-is.

## Boundary

`change` is available only after `go` and before `mde release`. It never touches `main`.
Pre-`go` plan edits are ordinary plan amendments followed by `mde evaluate`; post-`go` changes
use `mde change` to roll back and rebuild on the version branch only.
