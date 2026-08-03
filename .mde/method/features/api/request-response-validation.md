---
type: feature
id: request-response-validation
title: Request/response validation
origin: mde
impacts:
  - api
default: n/a
---

# Request/response validation

## Purpose

Validation failures are deterministic and testable — the same input always fails the same way.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-02 (Request parameters and bodies)
- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-05 (Input validation)


## Impact on api

Validation happens at the API boundary; validation failures are deterministic and testable
(see `boundary-validation`). The API test suite covers a validation-failure path.

## Checks

- Are validation failures deterministic and testable, with an API test covering a validation-
  failure path?
  · evidence: validation code + `.feature` validation-failure scenario
  · when: static (code) + requires-environment (test run)
