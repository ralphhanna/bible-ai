---
type: target
id: TARGET-METHOD-CHANGE
title: Method Change Target Profile
applies_when:
  - a plan creates, modifies, or deletes files under .mde/method/ (rules, commands, capabilities, templates, targets, scripts)
  - a plan changes the MDE method itself rather than a project's specs/source
---

# Method Change Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

A method-change plan revises MDE itself — its rules, commands, capabilities, templates, targets,
or scripts. The method package must stay internally consistent (capabilities ↔ compiled targets)
and aligned with its canonical reference docs. This target carries the checks that hold before
such a plan finalizes.

## Composed behavior

### Commands stay target/feature-agnostic  `[feature: commands-stay-target-agnostic]`

When a method-change plan adds or modifies a **command** (`.mde/method/commands/*.md`), check the
change does not introduce target/feature/artifact-specific logic into the command. A new
required artifact, check, or gate must be added as a **feature** (impacting the right target),
not as inline command text. A command edit that names a specific target/feature/artifact, lists
required artifacts, or hardcodes a domain gate is a violation — move it to a feature and have
the command defer to the loaded targets instead.

### Incoming files follow one handling pipeline  `[feature: incoming-file-pipeline]`

When a plan brings in a file by any route — an imported file under `plans/<id>/imports/`, an
absorbed dirty file present at start, or a file edited mid-session — confirm it was carried through
the identify→analyze→handle pipeline rather than handled ad hoc. An imported file that was copied
but whose **contents** were never analyzed into `discussion.md`, or an absorbed/edited file with no
disposition entry and no manifest handling, is a pipeline violation to resolve before finalizing.

### Method internal consistency (review before go)  `[feature: method-internal-consistency]`

Before `go` finalizes a method change, run **`mde review method`** and resolve what it reports:
feature↔target drift, structural lint (front matter, duplicate ids), and orphaned
features (a feature tagged to no target). If a changed or added feature left the
compiled `targets/` stale, **recompile** (`node .mde/method/scripts/compile-targets.mjs`) so the
package is consistent, and include the recompiled targets in the plan's manifest. A method-change
plan must not finalize with the method internally inconsistent.

### Reference-doc reconciliation (method ↔ docs/reference)  `[feature: reference-doc-reconciliation]`

Before `go` finalizes a method change, **if `.mde/docs/reference/` exists**, reconcile the change
against it: confirm the changed rules/commands/features/templates do not **contradict** the
reference docs. Where the change intentionally supersedes a doc, **update that doc in this plan**
and record it in the manifest, so the canonical model and the method agree. A method change that
conflicts with the reference docs is a defect to resolve before finalizing. When the folder does
**not** exist (projects do not ship the reference docs), this does not apply — skip it.

## Validation checks

### Commands stay target/feature-agnostic  `[feature: commands-stay-target-agnostic]`

- For every command file this plan changed, is it free of target/feature/artifact-specific
  logic — it iterates the loaded targets and defers *which artifacts/checks/gates* to them, naming
  no specific target, feature, diagram, or required-artifact list?
  · evidence: the changed `commands/*.md` vs. RULE-CORE-001 "Commands are target-agnostic"
  · when: static
- Was any new required artifact / check / gate added as a **feature** (tagged to a target),
  rather than as inline command text?
  · evidence: new/changed feature under `features/` rather than command prose
  · when: static

### Incoming files follow one handling pipeline  `[feature: incoming-file-pipeline]`

- For each file this plan brought in (imported / absorbed-dirty / session-edited), is it
  **identified** in `scope.md`/`discussion.md` with its source kind recorded?
  · evidence: `discussion.md` entry referencing the file + its source kind
  · when: static
- Were the file's **contents analyzed** into a `discussion.md` disposition (accept/reject/partial),
  with any conflict raised as an entry — not merely copied into `imports/`?
  · evidence: `discussion.md` disposition entry for the file (not just the copied file)
  · when: static
- Is the plan's **handling** of the file recorded in `tasks.md`/`output.manifest` (what the plan
  owns or produces because of it)?
  · evidence: `output.manifest` entry / `tasks.md` row tracing to the file
  · when: static

### Method internal consistency (review before go)  `[feature: method-internal-consistency]`

- Was `mde review method` run for this method change and its findings resolved (no feature↔
  target drift, no structural-lint failures, no orphaned features)?
  · evidence: `reports/review/method-review.md` (clean) + recompiled `targets/` in the manifest
  · when: static
- If any feature was added/changed, were the compiled `targets/` recompiled and included in the
  manifest (not left stale)?
  · evidence: `targets/` recompile reflected in the plan's `output.manifest`
  · when: static

### Reference-doc reconciliation (method ↔ docs/reference)  `[feature: reference-doc-reconciliation]`

- When `.mde/docs/reference/` exists, is the method change **consistent** with the reference docs
  (no contradiction), with any superseded doc updated in the same plan and manifest-listed?
  · evidence: changed method files vs. `.mde/docs/reference/*`; updated docs in the manifest
  · when: static
