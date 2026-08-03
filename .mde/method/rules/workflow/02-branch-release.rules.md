---
type: method-rule
id: RULE-WORKFLOW-002
title: Branch and Release
category: workflow
applies_to:
  - branch
  - release
  - plans
  - base
---

# Branch and Release

## Branch model: a branch is a release train of plans

Work happens on a **branch off `main`** that holds an ordered **sequence of plans** (a release
train). `mde start branch` creates a branch (base `main` by default); `mde start` creates a plan
**in the current branch, never on `main`**. **`mde release branch`** releases the current branch's
plans to `main` (honoring `release-policy.md`). Switching between branches is plain **git** (commit
the current branch, `git checkout` another) — MDE adds no branch-switching command of its own.
`mde cancel` abandons the **tail draft plan** (the latest plan whose successors on the branch are
all still `draft`).

**A plan is base-bound.** The base (the branch state a plan's commits sit on) is part of the
evaluation fingerprint, alongside plan inputs and method version. If the base changes — the branch
advances underneath the plan, or the plan is taken to a different base — the evaluation is invalid:
the plan **reverts to `draft`** and is re-reviewed + re-evaluated against the new base. Generated
artifacts are base-specific and regenerated, never replayed. **There is no rebase.** Changing a
plan's base by moving it to another branch is the future **`mde move`** (export the plan's contract,
undo it on the source, import onto the target as `draft`, re-evaluate) — the way a plan is promoted
ahead of others across branches.
