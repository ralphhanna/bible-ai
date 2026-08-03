---
id: TEMPLATE-DOCS-DIAGRAM-ERD
type: template
title: ERD Diagram
status: active
source_path: method/templates/docs/diagrams/erd.template.md
artifact: docs-diagram-erd
used_by_commands: []
---
# Data Model (ERD)

<!-- Logical ERD — entities + relationships only, NO attributes (attributes live in
each entity's ## Storage View under specs/business/entities/). This file is a VIEW,
not a source of truth: every entity and relationship traces to an entity file.

The diagram is authored as Graphviz DOT in erd.dot and rendered to erd.svg with
real edge-crossing minimization (Graphviz handles layout — do not hand-place):
    node .mde/method/scripts/render-diagram.mjs docs/diagrams/erd.dot docs/diagrams/erd.svg
Edit erd.dot and re-render; erd.svg is generated, erd.dot is the source. -->

![Logical ERD](erd.svg)

## Traceability

<!-- Each entity/relationship → specs/business/entities/<slug>.md -->
