# Rules Catalog

Rules are split into **core** (stable framework concepts — what MDE is) and **workflow**
(plan-lifecycle mechanics — how the lifecycle proceeds). Both groups load together for every
command (`rules/core/*` + `rules/workflow/*`).

## Core rules — `rules/core/`

| Rule ID | Title | File |
|---|---|---|
| RULE-CORE-001 | Framework Architecture Principles | rules/core/01-method-principles.rules.md |
| RULE-CORE-002 | Artifact Model | rules/core/02-artifact-model.rules.md |
| RULE-CORE-004 | Generated Artifact Quality | rules/core/04-generated-artifact-quality.rules.md |

## Workflow rules — `rules/workflow/`

| Rule ID | Title | File |
|---|---|---|
| RULE-WORKFLOW-001 | Plan Lifecycle | rules/workflow/01-plan-lifecycle.rules.md |
| RULE-WORKFLOW-002 | Branch and Release | rules/workflow/02-branch-release.rules.md |
| RULE-WORKFLOW-003 | Incoming Files | rules/workflow/03-incoming-files.rules.md |
| RULE-WORKFLOW-004 | Change Reconciliation | rules/workflow/04-change-reconciliation.rules.md |
