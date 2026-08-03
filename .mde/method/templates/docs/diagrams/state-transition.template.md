---
id: TEMPLATE-DOCS-DIAGRAM-STATE-TRANSITION
type: template
title: State-Transition Diagram
status: active
source_path: method/templates/docs/diagrams/state-transition.template.md
artifact: docs-diagram-state-transition
used_by_commands: []
---
# {{Entity}} Lifecycle

<!-- Lifecycle view for one entity that has a status/lifecycle: its states and the
transitions between them. One file per entity with a lifecycle (state-<entity-slug>.md);
entities without a lifecycle get none. Each state is a value from the entity's status set;
each transition edge is a lifecycle-transition operation the entity declares (label it with
the operation, e.g. submit/approve/cancel). Note guards or role restrictions on the edge
where they apply. Traces to specs/business/entities/<slug>.md ## Operations + status set. -->

```mermaid
stateDiagram-v2
    %% [*] --> Draft
    %% Draft --> Submitted: submit
    %% Submitted --> Acknowledged: acknowledge
    %% Submitted --> Draft: reject
```

## Traceability

<!-- Each state → a value in the entity's status set
     Each transition → a lifecycle-transition operation in the entity's ## Operations -->
