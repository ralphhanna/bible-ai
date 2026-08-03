# business/entities — one file per business entity (kebab-case).

Business entities are first-class business objects (Employee, Skill, ClientProject, PerformanceReview, etc.). Each file records:

- What the entity is in business terms (not storage types)
- Key business attributes (names, descriptions, relationships)
- Relationships to other entities
- Source capabilities / use cases that govern it

The entity's `## Storage View` captures the storage/type representation during design or implementation. Do not create a duplicate entity under `specs/design/`.
