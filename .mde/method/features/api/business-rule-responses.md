---
type: feature
id: business-rule-responses
title: Business-rule responses
origin: mde
impacts:
  - api
default: n/a
---

# Business-rule responses

## Purpose

Business-rule failures return useful, intentional responses — not generic errors.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-04 (Status codes and errors)


## Impact on api

Business-rule failures (from the rules in business specs) return useful responses with
intentional status codes. The API test suite covers a business-rule-failure path.

**A rule rejection must identify the rule it violated (structured, machine-checkable).** The
error response for a business-rule failure carries, in a **structured field** (e.g.
`error.rule` / `code` / `violation`), the **concept id of the violated rule** — its catalogue
path minus `.md`, e.g. `specs/business/capabilities/project-staffing/business-rules/assignment-conflict-check`
— plus a human-readable reason. Not a bare status code, not a free-text message alone: the
consumer (and the business-rule test) must be able to assert *which* rule fired by reading a
stable field, not by string-matching prose. This is what lets a business-rule test prove the
*specific* rule discriminates rather than that the endpoint refused something. One rejection
identifies exactly one rule (the first/violated one); the reason names the concept id somewhere
in the response body.

## Audit

Judge whether business rules are **enforced**, not merely **displayed**. A rule shown as
helpful UI text or a doc paragraph, but that the app never actually applies, is the common
fake ("the UI says checks are ready" but proposes anyway; guidance text with no rejection).

For each business rule, drive the running app to **violate it deliberately** — submit the
disallowed input (a transfer that breaks the constraint, a review out of its window, a
duplicate, an out-of-order lifecycle step). The app must **reject** it: an error response /
blocked action / validation message, *and* the bad state must **not** persist (read back
after — it should not be there). Corroborate against the server log that the request
reached the server and was refused.

Report each rule as **enforced** (violation rejected + not persisted, server-corroborated)
or **decorative** (stated in text/spec but the violating input goes through). A rule you can
break is not enforced, however prominently it is described.

## Checks

- Do business-rule failures return useful responses that **identify the violated rule in a
  structured field** (its concept id, not just a status code or prose), with an API/business-rule
  test that asserts on that field?
  · evidence: rule-handling code emits a structured error carrying the rule's concept id +
    a `tests/business-rules/` scenario whose reject assertion reads that field
  · when: static (code + assertion) + requires-environment (test run)
