---
id: TEMPLATE-BUSINESS-SPECS-BUSINESS-RULE
type: template
title: Business Specs — Business Rule
status: active
source_path: method/templates/business-specs/business-rule.template.md
artifact: business-specs
used_by_commands:
  - mde go
relatedRules:
  - RULE-CORE-002
  - TARGET-BUSINESS-REQUIREMENTS
mergePolicy: user-owned   # human-curated statement of intent (specs-boundaries.md); user-owned after first write
---
---
id:         BM-RULE-<SHORT-NAME>
type:       business-rule
status:     draft
capability: <owning-capability-slug, or "shared" for cross-capability rules>
sourcePlan: <plan-id>
lastChange: YYYY-MM-DD
---

# Business Rule: <Full Rule Name>

> **Rule kinds.** Set the front-matter `kind:` to the rule's type — `business-rule`
> (constraint / decision / calculation / validation). **Access control is NOT a business
> rule:** who-may-do-what lives on the entity's `## Operations` list (roles + scope per
> operation), not here. (Earlier versions used `kind: access` rules + an `access-policy.md`;
> that is retired.)

## Slug

<rule-slug>

## Statement

<one clear sentence stating the rule>

## Owning Capability

{{business-capability:<slug>}}  <!-- or "shared" — shared rules live in specs/business/rules/; tag references with {{kind:slug}} (semantic-references feature) -->

## Affected Entities

- {{entity:<slug>}}

## Trigger / Context

<when or where the rule applies>

## Constraint / Decision / Calculation

<what the rule enforces, decides, or computes>

## Exceptions

- <condition under which the rule does not apply, or is overridden and by whom>

## Testability

<how this rule is verified — the observable behavior a test or validation checks.>

## Open Questions

- <question>
