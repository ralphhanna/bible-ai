---
type: command
command: mde show version
loads:
  - rules/core/*
  - rules/workflow/*
---

# mde show version

Purpose: show current version/revision work state.

Report:

- current branch,
- active version/revision name if known,
- plans included,
- latest MDE reconciliation commit on this branch,
- unreconciled changes since that commit,
- release readiness findings.
