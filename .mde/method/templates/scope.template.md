---
id: TEMPLATE-SCOPE
type: template
title: Plan Scope
artifact: plan
used_by_commands:
  - mde start
  - mde change
---

# Plan Scope

The scope is the user-authored **frame**: what you want and where. It does not contain
decisions (those are resolved `discussion.md` entries), and it does not contain
rule-derived requirements, test plans, doc plans, or acceptance criteria (those are
Business Specs or `acceptance.md` / `impact.md`, derived during evaluate).

## Intents

One or more numbered intents. Each is a "what I want" statement in user language, no
implementation detail. Scope nests under its intent; the dotted ID is the link.

### 1 · {{intent title}}

**Want:** {{what the user wants to accomplish}}

**In scope:**
  - 1.1 · {{committed item}}

**Deferred:**
  - 1.2 · {{ours, but not now}} · reason: {{why parked}} {{· see D<n>}}

**Non-goals:**
  - 1.3 · {{not this system, by design}} · reason: {{why excluded}} {{· see D<n>}}

## Assumptions

- A1 · {{condition accepted as true for the plan}}
- {{1.A1 · intent-specific assumption, dotted under its intent}}

## Constraints

- C1 · {{limitation the plan must respect}}
- {{2.C1 · intent-specific constraint, dotted under its intent}}

## Notes

{{optional notes}}
