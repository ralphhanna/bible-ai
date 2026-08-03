---
type: feature
id: business-scope
title: Business scope
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Business scope

## Purpose

Capture what the business needs at a business level, clearly enough to drive design, page
specs, use cases, rules, prototypes, implementation, and tests.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-03 (Context and scope)


## Impact on business-requirements

Business analysis identifies: business problem/opportunity, business goals, in-scope and
out-of-scope areas, assumptions, constraints, stakeholders/actors, and open questions.
Written to `specs/business/business-overview.md` (scope/goals/assumptions/constraints) with
open + resolved questions in the plan's `discussion.md` (see `open-questions-tracking`).

## Template impact

- `business-overview` template → scope / goals / assumptions / constraints sections.
- open + resolved business questions → the plan's `discussion.md`.

## Checks

- Are business problem, goals, in/out-of-scope, assumptions, constraints, stakeholders, and
  open questions all identified (missing/deferred marked explicitly, not pretended complete)?
  · evidence: `specs/business/business-overview.md` + `plans/<plan-id>/discussion.md`
  · when: static
