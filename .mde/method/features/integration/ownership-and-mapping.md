---
type: feature
id: ownership-and-mapping
title: Ownership and mapping
origin: mde
impacts:
  - integration
default: n/a
---

# Ownership and mapping

## Purpose

For every exchanged entity/field, who owns the data and the decision is explicit, and the
mapping between external and internal shapes is defined.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **AsyncAPI** — https://www.asyncapi.com/docs/reference/specification/latest
  - EVT-ASYNC-01 (Identify producers and consumers)


## Impact on integration

Data and decision **ownership** is explicit for every exchanged entity/field (source of truth,
direction). The mapping between the external contract and the internal model is defined (owned
by the adapter).

## Checks

- Is data/decision ownership explicit for every exchanged entity/field, with the external↔
  internal mapping defined?
  · evidence: integration spec ownership + mapping sections
  · when: static
