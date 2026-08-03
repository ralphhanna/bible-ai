---
type: feature
id: boundary-validation
title: Boundary validation
origin: mde
impacts:
  - server
  - api
default: n/a
---

# Boundary validation

## Purpose

Validation happens where inputs cross into the system — API/UI boundaries and important
business-rule boundaries — not scattered or skipped.

## Impact on server

Validation happens at API/UI boundaries and important business-rule boundaries; it is explicit
and consistent.

## Impact on api

API endpoints validate request contracts deterministically; validation failures are testable
and return useful responses.

## Checks

- Does validation happen at API/UI boundaries and important business-rule boundaries
  (deterministic, testable)?
  · evidence: source at boundaries + validation tests
  · when: static
