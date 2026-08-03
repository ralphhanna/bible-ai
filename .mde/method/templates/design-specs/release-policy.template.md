---
id: TEMPLATE-RELEASE-POLICY
type: template
title: Release Policy
status: active
source_path: method/templates/design-specs/release-policy.template.md
artifact: release-policy
used_by_commands:
- mde release
mergePolicy: user-owned   # a decided project policy — human-curated (specs-boundaries.md)
---
# Release Policy

How this project's releases reach `main`. `mde release` reads this file to decide
whether to merge directly or open a pull request, and how to tag. Recorded once
per project (like `tech-stack.md`); change it only deliberately.

| Setting | Value | Notes |
|---|---|---|
| releaseStrategy | `merge` \| `pull-request` | `merge`: the version branch is merged straight into the target branch. `pull-request`: open a PR from the version branch and stop — a human merges it. |
| targetBranch | `main` | The branch released work lands on. |
| prBase | `main` | PR base branch (used only when `releaseStrategy: pull-request`). |
| tagScheme | e.g. `v{semver}` | How the version/revision tag is named. |
| tagWhen | `on-merge` \| `after-pr-merge` | Whether `mde release` tags now (direct merge) or the tag is created once the PR is merged. |
| requireCleanCI | `yes` \| `no` | If `yes`, release expects CI/checks green before merge or before opening the PR. |

## Rationale

<!-- One line on why this strategy (e.g. "team requires review on main; PR mandatory"). -->

## Notes

<!-- User-guarded zone. Provenance lives in the manifest, not here. -->
