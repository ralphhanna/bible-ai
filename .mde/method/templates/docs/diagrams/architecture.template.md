---
id: TEMPLATE-DOCS-DIAGRAM-ARCHITECTURE
type: template
title: Architecture Diagram
status: active
source_path: method/templates/docs/diagrams/architecture.template.md
artifact: docs-diagram-architecture
used_by_commands: []
---
# Architecture

<!-- Static layer / component view: the capability slices and the layers within them
(UI → API/route → service/use-case → repository/adapter → DB/external), and how they
connect. This is the static counterpart to the interaction diagrams (behavior over
time) and the ERD (data model).
- Show each in-scope capability as a grouped slice (subgraph) containing its layers.
- Include shared modules and the database / external systems.
- Cross-capability edges go ONLY through APIs/interfaces — never into another
  capability's internals; make the boundaries explicit.
Every node traces to a capability design (design/capabilities/<slug>/overview.md) or a
shared module. This file is a VIEW, not a source of truth. -->

```mermaid
flowchart TB
    %% subgraph Employees
    %%   EmpUI[UI] --> EmpAPI[API] --> EmpSvc[Service] --> EmpRepo[Repository]
    %% end
    %% EmpRepo --> DB[(PostgreSQL)]
```

## Traceability

<!-- Each node → design/capabilities/<slug>/overview.md or a shared module -->
