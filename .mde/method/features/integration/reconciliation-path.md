---
type: feature
id: reconciliation-path
title: Reconciliation path
origin: mde
impacts:
  - integration
default: n/a
---

# Reconciliation path

## Purpose

Asynchronous or synchronized data has an operational reconciliation path — a way to detect and
correct drift between systems.

## Impact on integration

There is an operational reconciliation path for asynchronous or synchronized data
(observability + a defined way to reconcile discrepancies). Unresolved destructive
synchronization, conflict resolution, or ownership decisions are kept as open `discussion.md`
entries during evaluation.

## Checks

- Is there an operational reconciliation path for async/synchronized data (observability +
  defined reconciliation)?
  · evidence: integration spec reconciliation/observability sections
  · when: static
