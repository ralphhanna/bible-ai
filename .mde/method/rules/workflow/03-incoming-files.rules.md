---
type: method-rule
id: RULE-WORKFLOW-003
title: Incoming Files
category: workflow
applies_to:
  - plans
  - imports
  - draft
  - evaluate
---

# Incoming Files

## Incoming files follow one pipeline

Any file a plan brings in — **imported** (`mde start import <file>`), **dirty before start**
(absorbed), or **modified during the session** — is handled the same way, not as three special
cases: **identify** it (record in `scope.md`/`discussion.md` with its source kind), **analyze** it
(review contents and disposition; raise conflicts as discussion entries), then **handle** it
(record the plan's action in `tasks.md`/`output.manifest`). Identify+analyze are draft work; handle
materializes at `evaluate`. Importing a file means analyzing its **contents** into discussion — never
just copying it. The enforcement lives in the `incoming-file-pipeline` feature (method-change
target); the user-facing description is in `managing-changes` → "Incoming files: one handling
pipeline".
