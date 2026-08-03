---
type: feature
id: method-internal-consistency
title: Method internal consistency (review before go)
origin: mde
impacts:
  - method-change
default: n/a
---

# Method internal consistency

## Purpose

When a plan changes the method itself (any artifact under `.mde/method/`), the method package
must be internally consistent before the change is finalized — features are the source of
truth and the compiled `targets/` must be in sync with them. A feature edit that leaves the
compiled targets stale is **drift**, the same class as editing a spec without reconciling the app.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-10 (Identify inconsistencies and unresolved concerns)


## Impact on method-change

Before `go` finalizes a method change, run **`mde review method`** and resolve what it reports:
feature↔target drift, structural lint (front matter, duplicate ids), and orphaned
features (a feature tagged to no target). If a changed or added feature left the
compiled `targets/` stale, **recompile** (`node .mde/method/scripts/compile-targets.mjs`) so the
package is consistent, and include the recompiled targets in the plan's manifest. A method-change
plan must not finalize with the method internally inconsistent.

## Checks

- Was `mde review method` run for this method change and its findings resolved (no feature↔
  target drift, no structural-lint failures, no orphaned features)?
  · evidence: `reports/review/method-review.md` (clean) + recompiled `targets/` in the manifest
  · when: static
- If any feature was added/changed, were the compiled `targets/` recompiled and included in the
  manifest (not left stale)?
  · evidence: `targets/` recompile reflected in the plan's `output.manifest`
  · when: static
