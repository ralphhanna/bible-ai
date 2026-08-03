---
id: TEMPLATE-ACCEPTANCE
type: template
title: Plan Acceptance
artifact: plan
used_by_commands:
  - mde evaluate
  - mde go
---

# Acceptance

The plan's **definition of done** — AI-derived during `mde evaluate` from the
contract (`scope.md` + resolved `discussion.md`) and the rules (Testing target),
and **confirmable by the user before `mde go`**. `evidence.md` is checked against
this file; it does not duplicate evidence — it states the criteria evidence must meet.

This file is AI-owned. User *seeds* (e.g. "must have an audit-trail test") are
`discussion.md` entries that this derivation consumes; request changes via
`mde change`.

## Acceptance Criteria

The conditions that must be true for the plan to count as done. Each cites the
intent/scope it satisfies.

| ID | Criterion | Satisfies (spec) |
|---|---|---|
| AC1 | {{condition that must hold}} | 1.1 |

## Test Plan

The scenarios that will verify the plan. Proven later in `evidence.md`.

Style follows the Testing target's layer split: **api** and **e2e/ui** scenarios are
**Gherkin** (`.feature` Given/When/Then, named in the Scenario column); **unit**
scenarios are native (vitest/pytest/…). Each api/e2e row names the `.feature` Scenario
it becomes.

| ID | Scenario | Type | Style | Covers (AC / spec) |
|---|---|---|---|---|
| T1 | {{Gherkin Scenario name for added API/UI behavior}} | api / e2e | gherkin | AC1 |
| T2 | {{native unit scenario for a rule/calc/validation}} | unit | native | AC1 |

**Updated scenarios:** {{existing scenarios to update}}

**Excluded (with reason):** {{tests explicitly out of scope and why}}
