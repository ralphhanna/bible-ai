---
type: command
command: mde start branch
loads:
  - rules/core/*
  - rules/workflow/*
  - specs/design/mde-policy.md
---

# mde start branch

Purpose: create a branch off `main` to hold an ordered **sequence of plans** (a release train)
before plan execution commits begin. A branch, not a
"version", is the unit you release.

## Behavior

1. Confirm the requested branch title. If omitted, **default the branch name to the first plan's
   name** (the next plan started in it); the user may choose a different title.
2. Check current Git state and base branch. The base is **`main` by default** (`--from <base>` may
   override). Do not silently branch from another plan's branch.
3. Create the branch: name = **`<branchPrefix><title>`**, where `branchPrefix` comes from
   `specs/design/mde-policy.md` (**default empty** — so the branch is exactly `<title>`). E.g. with
   the default: `git checkout -b <title>`; with `branchPrefix: mde/`: `git checkout -b mde/<title>`.
   Any **uncommitted plan-local work** already in the tree is carried onto the new branch by the
   checkout — the supported way to recover when a plan was started before its branch existed.
4. Record the active branch context if the framework maintains command state.
5. Do not create a release tag.

## Branch convention

Branch name = `<branchPrefix><title>`, with `branchPrefix` from the project policy
(`mde-policy.md`). The branch holds a sequence of plans; switching between branches is plain git
(`git checkout`) — MDE adds no branch-switching command of its own.

## Boundary

`main` represents released state, not active plan work. Plan commits happen on the active branch.
A branch is released with `mde release branch`.
