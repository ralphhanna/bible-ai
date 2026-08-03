---
type: operation-coverage
template: operation-coverage
artifact: design-specs
version: 1
mergePolicy: generated-guarded   # derived from the model + page specs; re-derivable, edits preserved
---

# UI Coverage Report

Does the UI cover what the business design defines? One section per coverage **dimension** present
in the design. The set of dimensions is **open** — entity-operations and use-cases are always
checked when present; others (workflows, role dashboards, KPIs, …) appear when the design defines
them. Uncovered **for-sure** elements (entity-operations, use-cases) are a defect for a
complete-design plan; open-door dimensions are reported.

Derived by `mde evaluate` from the entities' `## Operations`, the use-case catalogue, and the page
specs' `## Composition` / `## Supported Use Cases`.

## Entity Operations  *(for-sure — uncovered = defect)*

One row per required operation (`<entity>.<op>` some role may perform). Covered = ≥1 panel's
`operations:` claims it.

| Operation | Source | Covered by (page.panel) | Status |
|---|---|---|---|
| {{op_id}} | {{source}} | {{covering_panels}} | {{covered_or_UNCOVERED}} |

## Use Cases  *(for-sure — uncovered = defect)*

One row per in-scope use case. Covered = ≥1 page lists it under `## Supported Use Cases`.

| Use Case | Capability | Covered by (page) | Status |
|---|---|---|---|
| {{use_case_id}} | {{capability}} | {{covering_pages}} | {{covered_or_UNCOVERED}} |

<!-- Open-door dimensions: add a `## <Dimension>` section ONLY when the design defines that kind
of element (e.g. ## Workflows, ## Role Dashboards, ## KPIs). Same row shape: element → covering
page(s)/panel(s) → status. These are reported, not blocking, until promoted to for-sure. Do not
emit empty sections for dimensions the design does not define. -->

## Summary

- Entity operations: {{covered_count}} / {{required_count}} covered.
- Use cases: {{covered_uc}} / {{total_uc}} covered.
- {{open_door_lines}}
- **Uncovered for-sure elements (defects for a complete-design plan):** {{uncovered_list_or_none}}
