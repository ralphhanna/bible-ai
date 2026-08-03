---
id: TEMPLATE-DOCS-DIAGRAM-INTERACTIONS
type: template
title: Interaction Diagrams
status: active
source_path: method/templates/docs/diagrams/interactions.template.md
artifact: docs-diagram-interactions
used_by_commands: []
---
# Interaction Diagrams

<!-- One Mermaid sequenceDiagram per significant use case / cross-capability flow.
Participants = collaborating boundaries (actor → UI/page → API/route → service/use-case
→ repository/adapter → DB/external). Show request + response; use alt/opt for
error/alternate paths. Keep one diagram per use case; cross-capability steps go through
APIs/interfaces only. Each diagram traces to a use case in Business Specs. -->

## <Use case name>

```mermaid
sequenceDiagram
    %% actor User
    %% User->>UI: ...
    %% UI->>API: ...
    %% API->>Service: ...
    %% Service->>Repository: ...
```

## Traceability

<!-- Each diagram → use case in Business Specs + the APIs/services it exercises -->
