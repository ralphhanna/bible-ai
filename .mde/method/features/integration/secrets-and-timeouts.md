---
type: feature
id: secrets-and-timeouts
title: Secrets and timeouts
origin: mde
impacts:
  - integration
default: n/a
---

# Secrets and timeouts

## Purpose

External calls never block forever and never commit secrets — timeouts are explicit and secrets
are externalized.

## Impact on integration

Committed source contains **no secrets** (secrets externalized), and external calls have
**explicit timeouts**. Sensitive data handling is explicit.

## Checks

- Does committed source contain no secrets, and do external calls have explicit timeouts?
  · evidence: source scan + integration spec
  · when: static
