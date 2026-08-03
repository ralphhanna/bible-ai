---
id: TEMPLATE-DOCS-DIAGRAM-USE-CASES
type: template
title: Use Case / Actor Diagram
status: active
source_path: method/templates/docs/diagrams/use-cases.template.md
artifact: docs-diagram-use-cases
used_by_commands: []
---
# Use Cases & Actors

<!-- Logical Use Case / Actor view — actors/roles and the use cases they perform,
plus include/extend relationships between use cases. This file is a VIEW, not a
source of truth: every actor traces to the actor/role model and every use case
traces to specs/business/capabilities/<slug>/use-cases/<slug>.md. Group by
capability and lay out to avoid crossing lines; split per-capability if large. -->

```mermaid
flowchart LR
    %% Actors (left) → use cases (right); group use cases by capability.
    %% hrAdmin([HR Administrator])
    %% UC_onboard["Onboard employee"]
    %% hrAdmin --> UC_onboard
    %% include/extend between use cases:
    %% UC_onboard -.->|include| UC_validateIdentity
```

## Traceability

<!-- Each actor → actor/role model; each use case → its use-case file. -->
