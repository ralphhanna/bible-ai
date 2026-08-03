---
type: feature
id: stack-conformant-source
title: Stack-conformant source
origin: mde
impacts:
  - server
default: n/a
---

# Stack-conformant source

## Purpose

Generated source follows the declared stack and project conventions, with consistent error
and logging patterns — not ad hoc per file.

## Impact on server

Source follows the declared stack and project conventions. Errors and logging follow a
consistent pattern. Placeholder code is allowed only when clearly marked and
confirmed/deferred.

## Checks

- Does generated source follow the declared stack + conventions, with consistent error/logging
  patterns?
  · evidence: generated source
  · when: static
- Is any placeholder code clearly marked and confirmed/deferred (not silent)?
  · evidence: placeholder markers + scope
  · when: static
