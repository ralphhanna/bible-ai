---
type: command
command: mde release branch
loads:
  - rules/core/*
  - rules/workflow/*
  - relevant targets
  - templates/release.template.md
  - specs/design/release-policy.md
---

# mde release branch

Purpose: package the **current branch's** delivered plans (its release train) into a release and
merge them to `main`. Replaces the former version-level `mde release`.

## Preconditions

- Work is on a branch off `main` (not `main` itself).
- **Every plan on the branch is `executed` or `cancelled`.** Anything else (`draft`, `evaluated`, `executing`, `blocked`) is *not* releasable: stop and report it so the user can `go`, `change`, or `cancel` it first. Release never builds; it only packages already-finished work.

## Behavior

The **entire branch** is released — every plan on it that is not `cancelled`. There is no per-plan
selection or partial release; the precondition already guarantees each plan is `executed` or
`cancelled`.

1. Apply the **release-time documentation actions the loaded targets mandate** — do not hardcode which; the loaded targets' capabilities specify what runs at release (e.g. the `changelog` capability dates the `## [Unreleased]` section per the policy's version scheme and opens a fresh one). Release **accumulates** what plans already wrote; it does not author new per-plan content.
2. **Merge the manifest (append-only — see below).** Bring the branch's release into `main`'s manifest without rebuilding across the whole repo and without a manifest merge conflict.
3. Land the branch's **source** changes on the target branch **according to `specs/design/release-policy.md`** (see *Release strategy*) — a direct merge or a pull request. Source files are mostly disjoint across well-scoped branches; a genuine overlap (two branches edited the same file) is the only thing needing human conflict resolution.
4. Create the release tag per the policy's `tagScheme` and `tagWhen`.
5. Mark every `executed` plan `released`: set lifecycle to `released`, write `plans/<id>/release.md`, append a release event to `log.md`, refresh derived `status.md` — recording the **branch it was released on** and the resulting tag. `cancelled` plans stay `cancelled` (acknowledged, not delivered).

## Merging the manifest (append-only, conflict-free)

The consolidated manifest is **accumulated**, never rebuilt across all branches in the repo. Releasing
a branch only **appends its own release plans** into `main`'s manifest. The files:

- `manifest/index.json` — the accumulated, append-oriented master record;
- `manifest/by-specs.json` — derived reverse-trace, always rebuilt from `index.json`;
- `manifest/release.manifest` — a **temporary**, per-release file holding only this branch's plans.

Steps (run from the project root; `<plan-ids>` = the branch's non-cancelled plans):

1. **Incoming build (on the branch).** Build a release manifest from **only this branch's release
   plans** — not the whole repo:
   ```text
   node .mde/method/scripts/build-app-manifest.mjs --release <plan-ids>
   ```
   This writes `manifest/release.manifest`.
2. **Copy to main.** Bring `manifest/release.manifest` onto `main` — a **new file** main does not
   have, so there is **no conflict**.
3. **Append + re-derive + clean up.** On `main`:
   ```text
   node .mde/method/scripts/build-app-manifest.mjs --append-release
   ```
   This **appends** `release.manifest` into `index.json` (append-only → no conflict), **re-derives**
   `by-specs.json` from the updated `index.json`, and **deletes** `release.manifest`.

Because the master record is append-only and the by-spec trace is derived (rebuilt, never merged),
releasing a branch **never conflicts on the manifest** and **never rebuilds across other unreleased
branches** — only this branch's plans are added.

## Base freshness

Releasing lands the branch on `main`. If `main` **advanced** since the branch's plans were evaluated
(another branch released in between), those plans are **base-stale** (the base is part of the
evaluation fingerprint): they revert to `draft` and must be **re-evaluated against the current
`main`** (regenerate + re-verify) before release — there is no rebase, and a textually clean merge of
stale work is not accepted. If `main` did not move, release proceeds directly.

## Release strategy

How the branch reaches the target branch is the project's choice, recorded once in `specs/design/release-policy.md`. Read it and follow `releaseStrategy`:

- **`merge`** — merge the branch into `targetBranch` (default `main`) directly, then tag.
- **`pull-request`** — open a PR from the branch into `prBase`, **stop there, do not merge or tag**; a human merges it. Plans become `released` on merge confirmation, not when the PR is opened.

If `release-policy.md` is **missing**, do not guess: ask the user whether to merge directly or open a PR, proceed with their answer, and offer to record it as the project's release policy. Honour `requireCleanCI` when set.

## Released status

When a delivered plan is released, its derived `status.md` records:

- `lifecycle: released`
- `released-on: <branch>` — the branch merged to `main`
- `released-tag: <release tag>`
- `released-into: main`

`released` is terminal. After release, correct **forward** with a new plan on a new branch.

## Boundary

Release/branch mechanics are not part of plan execution mechanics. Concurrent unreleased branches
are expected; when a branch lands on a `main` that other branches have already advanced, conflicts
are resolved at this release point (and a plan whose base thereby changed re-evaluates — see the
base-bound evaluation rule).
