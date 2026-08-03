---
id: TEMPLATE-DOCS-DIAGRAM-NAVIGATION
type: template
title: Navigation Diagram
status: active
source_path: method/templates/docs/diagrams/navigation.template.md
artifact: docs-diagram-navigation
used_by_commands: []
---
# Navigation

<!-- Page-to-page navigation map: how a user moves through the application — entry
points, primary pages, and the navigation edges between them. One node per page.
Every node traces to a page in ui-catalog.md and its page spec under design/UI/pages/;
every edge is a real navigation action defined in a page spec (link, button, flow).
Group nodes by capability; place shared/landing pages centrally to avoid crossing
lines; split into per-capability maps if one diagram becomes unreadable. Consistent
with the live pages' client-routing navigation (Web UI target). -->

```mermaid
flowchart TD
    %% Home --> Employees
    %% Employees --> EmployeeDetail
```

## Traceability

<!-- Each node → ui-catalog.md page + design/UI/pages/<slug>.md
     Each edge → a navigation action in a page spec -->
