---
id: TEMPLATE-BUSINESS-SPECS-ROLE
type: template
title: Business Specs — Role / Actor
status: active
source_path: method/templates/business-specs/role.template.md
artifact: business-specs
used_by_commands:
  - mde go
relatedRules:
  - RULE-CORE-002
  - TARGET-BUSINESS-REQUIREMENTS
mergePolicy: user-owned   # human-curated statement of intent (specs-boundaries.md); user-owned after first write
---
---
id:         BM-ROLE-<SHORT-NAME>
type:       role
status:     draft
sourcePlan: <plan-id>
lastChange: YYYY-MM-DD
---

# Role: <Full Role Name>

## Slug

<role-slug>

## Responsibility

<one or two sentences: what this role is accountable for in the business>

## Business Goals

- <what this role is trying to achieve>

## Capabilities Used

- {{business-capability:<slug>}}  <!-- tag references with {{kind:slug}} (semantic-references feature) -->

## Key Permissions / Constraints

- <business-level permission, approval authority, or restriction>

## Open Questions

- <question>
