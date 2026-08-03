---
type: feature
id: compatibility-versioning
title: Compatibility and versioning
origin: mde
impacts:
  - integration
default: n/a
---

# Compatibility and versioning

## Purpose

Contract versioning and compatibility behavior are defined — so an external contract change
doesn't silently break the integration.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **AsyncAPI** — https://www.asyncapi.com/docs/reference/specification/latest
  - EVT-ASYNC-08 (Compatibility and versioning)


## Impact on integration

Contract versioning and compatibility behavior are defined (how version changes are detected
and handled).

## Checks

- Are contract versioning and compatibility behavior defined?
  · evidence: integration spec compatibility section
  · when: static
