---
type: feature
id: endpoint-contracts
title: Endpoint contracts
origin: mde
impacts:
  - api
default: n/a
---

# Endpoint contracts

## Purpose

Request and response contracts are explicit and testable — not implicit shapes.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-01 (Paths and operations)
  - API-OAS-02 (Request parameters and bodies)
  - API-OAS-03 (Response schemas)
  - API-OAS-05 (Authentication/security schemes)


## Impact on api

Each endpoint has explicit request and response contracts. APIs do not expose internal
persistence details unnecessarily. Authorization/authentication requirements are explicit when
in scope (enforced by the shared enforcer — see `shared-access-enforcer`).

## Checks

- Are request/response contracts explicit per endpoint, without leaking internal persistence
  detail?
  · evidence: route/controller contracts + API tests
  · when: static
