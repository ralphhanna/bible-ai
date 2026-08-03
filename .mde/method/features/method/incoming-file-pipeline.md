---
type: feature
id: incoming-file-pipeline
title: Incoming files follow one handling pipeline
origin: mde
impacts:
  - method-change
default: n/a
---

# Incoming files follow one handling pipeline

## Purpose

Give teeth to the rule that **any file entering a plan** — imported (`mde start import <file>`),
dirty before `mde start`, or modified during the session — is handled the **same way**: a uniform
**identify → analyze → handle** pipeline, not three special cases. Historically this was only prose
in `plan-status.md` §imports/, with no command/rule/check, so an agent could (and did) import a file
by copying it without analyzing its contents into discussion. This feature is the enforceable
check that the pipeline was followed.

The pipeline:
1. **Identify** — record the incoming file in `scope.md`/`discussion.md` as a plan input, noting its
   *source kind* (`imports/` copy, in-place dirty, or session edit) as an attribute of the entry.
2. **Analyze** — review contents and disposition (accept/reject/partially use); raise any conflict
   with existing Specs/state as a `discussion.md` entry the user resolves.
3. **Handle** — record the plan's action in `tasks.md`/`output.manifest`.

Steps 1–2 are draft; step 3 materializes at `mde evaluate`. (This is the method-side enforcement;
the user-facing description lives in `managing-changes.md` → "Incoming files: one handling
pipeline".)

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-10 (Malicious input and file handling)


## Impact on method-change

When a plan brings in a file by any route — an imported file under `plans/<id>/imports/`, an
absorbed dirty file present at start, or a file edited mid-session — confirm it was carried through
the identify→analyze→handle pipeline rather than handled ad hoc. An imported file that was copied
but whose **contents** were never analyzed into `discussion.md`, or an absorbed/edited file with no
disposition entry and no manifest handling, is a pipeline violation to resolve before finalizing.

## Checks

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
