# Templates

Templates are artifact contracts.

Rules should not duplicate template structure. When generating an artifact, use the closest template. If no suitable template exists, create the artifact and record a template improvement candidate.

## Template classes

- Specs templates: business/Design Specs artifacts
- plan templates: plan, impact, decisions, tasks, evidence, release
- target template: reusable structure for new `targets/<name>.md` profiles
- stack templates: implementation stack choices
- scaffold assets: raw files that may be copied/adapted but are not strict contracts
