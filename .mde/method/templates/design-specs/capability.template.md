---
type: design-capability
template: capability
artifact: business-specs
version: 2
mergePolicy: user-owned   # human-curated statement of intent (specs-boundaries.md); user-owned after first write
---

# Capability: {{capability_name}}

<!-- Semantic references (semantic-references feature): tag named MDE objects {{kind:slug}} —
     {{business-capability:slug}}, {{entity:slug}}, {{use-case:slug}}, {{business-rule:slug}},
     {{role:slug}}, {{web-page:slug}}. (Distinct from the {{snake_case}} fill-in placeholders.) -->

## Capability ID

{{capability_id}}

## Purpose

{{business_purpose}}

## Description

A capability is a business subject area or vertical slice of the application.

## Primary Actors

- {{actor}}

## Business Outcomes

- {{outcome}}

## Primary Entity

{{primary_entity}}

The primary entity anchors the vertical slice, API boundary, source-code module, and test scope when applicable.

## Related Entities

Entities are independent shared business/data concepts and may be used by multiple capabilities.

- {{related_entity}}

## Related Pages

- {{page_id}} — {{page_name}}

## Related Use Cases

- {{use_case_id}} — {{use_case_name}}

## Related Business Rules

- {{business_rule_id}} — {{business_rule_name}}

## API Boundary

- Base API: `/api/{{capability_api_name}}`
- Integration style: capability communicates with other vertical slices through APIs or defined interfaces.

## Integration Points

| Capability | Interface/API | Purpose |
|---|---|---|
| {{capability}} | {{interface}} | {{purpose}} |

## Implementation Status

Draft / Designed / Prototyped / Implemented / Verified
