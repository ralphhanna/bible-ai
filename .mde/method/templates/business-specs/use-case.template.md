---
id: TEMPLATE-BUSINESS-SPECS-USE-CASE
type: template
title: Business Specs — Use Case
status: active
source_path: method/templates/business-specs/use-case.template.md
artifact: business-specs
used_by_commands:
  - mde go
relatedRules:
  - RULE-CORE-002
  - TARGET-BUSINESS-REQUIREMENTS
mergePolicy: user-owned   # human-curated statement of intent (specs-boundaries.md); user-owned after first write
---
---
id:         BM-UC-<SHORT-NAME>
type:       use-case
status:     draft
capability: <capability-short-name>
sourcePlan: <plan-id>
lastChange: YYYY-MM-DD
---

# Use Case: <Full Use Case Name>

<!-- Semantic references (semantic-references feature): tag references to known MDE objects
     with {{kind:slug}} — {{role:slug}} for actors, {{entity:slug}} for entities,
     {{business-capability:slug}} for the capability, {{business-rule:slug}} for rules named. -->

## Short Name

<use-case-slug>

## Capability

{{business-capability:<capability-short-name>}}

## Business Goal

<one sentence: what the user achieves when this use case completes successfully>

## Primary Actor

{{role:<slug>}}

## Supporting Actors

- {{role:<slug>}}

## Trigger

<what initiates this use case>

## Outcome

<one sentence: the business state after this use case completes successfully — this is what the
 next use case in the journey consumes as its trigger>

## Preceded By

<!-- The use case(s) that must precede this one in the capability journey — each a reference to a
     use case IN THIS CAPABILITY. This is how the workflow/journey is derived (no separate
     workflow.md). A journey START has none — write "None". May list several (a use case reachable
     from more than one path). Do NOT restate the predecessor's trigger/outcome — reference only.
     The edges must be acyclic. -->

- {{use-case:<slug>}}

## Flow

<!-- High-level BUSINESS steps — what the actor accomplishes, not UI/API mechanics. Each step is
     NUMBERED (S1, S2, …); the step # is the join key the ## Realization section (below) uses to
     attach mechanics. A step may carry the conditions it must satisfy inline (business half only:
     situation + expected result). Design fields (page/operation/API) go in ## Realization. -->

- **S1** — <step: what the actor does>
- **S2** — <step>
- **S3** — <step>
  - conditions:
    - **<Semantic Condition Title>** — situation: <starting condition> → expectedResult: <the one required outcome>
    - **<Semantic Condition Title>** — situation: <…> → expectedResult: <…>

## Conditions

<!-- USE-CASE-LEVEL conditions only: whole-transaction outcomes (the final result), authorization
     at entry, traceability — conditions NOT about a single step. Step-scoped conditions live
     inline under their step above. Each: SEMANTIC TITLE, a situation, ONE expected result. Do NOT
     combine a valid case and its rejection in one condition — they are separate conditions.
     Business language only; realization (API status, rule uri, persistence) goes in ## Realization. -->

- **<Semantic Condition Title>**
  - situation: <the relevant starting condition>
  - expectedResult: <the one required ending condition>

## Business Rules

<!-- Rules this use case governs (catalogue trace). Which step ENFORCES which rule is a Design
     detail — recorded as `rules applied` in ## Realization, not here. -->

- {{business-rule:<slug>}}

## Business Objects Involved

- {{entity:<slug>}}

## Open Questions

- <question>

<!-- NOTE: no ## Realization section here. Business analysis does NOT create or scaffold it.
     The DESIGN pass (Application Design target, use-case-realization) ADDS a ## Realization
     section to this same file and fills it — do not pre-create empty "(unrealized)" step/condition
     stubs during BA. The realization lives in this file (not a separate specs/design/** doc). -->
