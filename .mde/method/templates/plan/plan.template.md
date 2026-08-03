---
type: template
template: plan-folder-contract
artifact: plan
---

# Plan Folder Contract

This template describes the plan folder shape. It is not emitted as `plan.md`.

## Naming

Plan folders use number-prefixed slugs:

```text
plans/<NNN-slug>/
```

Examples:

```text
plans/001-conduct-business-analysis-for-hr/
plans/002-select-technology-stack/
```

The next `NNN` is the highest existing numeric prefix directly under `plans/` plus one.

## Files

```text
plans/<NNN-slug>/
  scope.md
  discussion.md
  imports/
  prototype/
  impact.md
  acceptance.md
  output.manifest
  tasks.md
  evidence.md
  log.md
  status.md
  release.md
```

`imports/`, `prototype/`, and `release.md` are created only when needed.

Do not create `plan.md`.

Do not create `impact-summary.md`; use `impact.md`.

Do not create `questions.md` or `decisions.md`; the reasoning trail is `discussion.md`.
