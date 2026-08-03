---
id: TEMPLATE-BUSINESS-SPECS-CAPABILITY
type: template
title: Business Specs — Capability Overview
status: active
source_path: method/templates/business-specs/capability-overview.template.md
artifact: business-specs
used_by_commands:
  - mde go
relatedRules:
  - RULE-CORE-002
  - TARGET-BUSINESS-REQUIREMENTS
mergePolicy: user-owned   # human-curated statement of intent (specs-boundaries.md); user-owned after first write
---
---
id:         BM-CAP-<SHORT-NAME>
type:       capability
status:     draft
capability: <capability-slug>
sourcePlan: <plan-id>
lastChange: YYYY-MM-DD
---

# Capability: <Full Capability Name>

<!-- Semantic references (semantic-references feature): tag EVERY reference to a known MDE
     object with {{kind:slug}} — this applies to ALL the reference sections below, not just
     entities/pages: use cases → {{use-case:slug}}, business rules → {{business-rule:slug}},
     roles → {{role:slug}}, entities → {{entity:slug}}, pages → {{web-page:slug}}. Do not
     leave use-case or business-rule slugs bare. Do not tag objects that don't exist. -->

## Slug

<capability-slug>

## Business Purpose

<one or two sentences: the business subject area this capability covers and why it exists>

## Primary Actors

- {{role:<slug>}}

## Business Outcomes

- <outcome the business gets from this capability>

## Primary Entity

{{entity:<slug>}}  <!-- the entity that anchors this capability's API, source module, and tests; or "none" with a reason -->

## Related Entities

- {{entity:<slug>}}

## Use Cases

- {{use-case:<slug>}}

## Business Rules

- {{business-rule:<slug>}}

## Expected Pages

- {{web-page:<slug>}} — <UI pattern, if known>

## Workflow

<one line summary; full detail in workflow.md when the capability has a multi-step flow>

## Open Questions

- <question>
