---
type: feature
id: integration-spec
title: Integration specification
origin: mde
impacts:
  - integration
  - application-design
default: n/a
---

# Integration specification

## Purpose

Every in-scope external system has a non-placeholder contract+adapter design recording how the
app integrates with it.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-03 (Context and scope)
- **AsyncAPI** — https://www.asyncapi.com/docs/reference/specification/latest
  - EVT-ASYNC-01 (Identify producers and consumers)
  - EVT-ASYNC-05 (Define protocol and bindings)


## Impact on integration

`specs/design/integrations/<system-slug>.md` exists for every in-scope external system and
records ownership, mapping, authentication/secrets, timeout/retry/idempotency, compatibility,
failure recovery, observability, and test environment.

## Impact on application-design

The integration spec is part of design specs, created from the integration template and
reviewed against the Integration target.

## Template impact

- `integration` design-spec template → the per-system contract+adapter sections.

## Checks

- Does every in-scope external system have a non-placeholder integration spec recording
  ownership, mapping, auth/secrets, timeout/retry/idempotency, compatibility, recovery,
  observability, and test environment?
  · evidence: `specs/design/integrations/<slug>.md`
  · when: static
