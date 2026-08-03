---
type: feature
id: constraints-and-keys
title: Constraints and keys
origin: mde
impacts:
  - persistence
default: n/a
---

# Constraints and keys

## Purpose

Foreign keys, constraints, and audit/history fields are deliberate and aligned with design —
not accidental.

## Impact on persistence

Foreign keys/constraints are deliberate and aligned with the design model. Audit/history fields
are explicit when needed, not accidental. PostgreSQL-specific behavior is documented when used.

## Checks

- Are FKs/constraints deliberate and aligned with design, and are audit/history fields explicit
  where needed?
  · evidence: schema/migrations vs. entity design
  · when: static
