---
type: feature
id: status-code-discipline
title: Status code discipline
origin: mde
impacts:
  - api
default: n/a
---

# Status code discipline

## Purpose

Status codes are intentional and consistent — happy path, validation failure, business-rule
failure, and not-found/conflict each return the right code.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-04 (Status codes and errors)


## Impact on api

Status codes are intentional and consistent across endpoints. API tests cover the happy path,
validation-failure path, business-rule-failure path, and not-found/conflict path where
applicable.

## Checks

- Are status codes intentional and consistent, with API tests for happy / validation-failure /
  rule-failure / not-found-or-conflict paths?
  · evidence: `.feature` API scenarios + responses
  · when: requires-environment
