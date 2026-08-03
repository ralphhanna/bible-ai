# Capability Index

Full reverse-decomposition of the target catalogue into capabilities. This is the **plan**:
a list of the capabilities the method's behaviour factors into, each noting the target(s) it
impacts. Capabilities marked ✓ are authored (pilot, from Prototyping).

The category headings below are a **visual grouping only** — a way to browse. They carry
no execution meaning; what matters is each capability's `impacts:` list (shown after the —).
A capability listed under one category routinely impacts targets in other categories.

Origin is **mde** for every capability below (framework-shipped); designer-authored capabilities
are added per project.

## Business Requirements
- business-scope — `business-requirements`
- capability-definition — `business-requirements`
- actor-and-role-model — `business-requirements`
- entity-model — `business-requirements`, `design`, `persistence`
- business-rule-catalogue — `business-requirements`
- use-case-catalogue — `business-requirements`
- entity-operations-and-access — `business-requirements`, `design`
- open-questions-tracking — `business-requirements`

## Design
- tech-stack-selection — `design`
- architecture-design — `design`, `architecture`
- design-decisions-log — `design`
- capability-design — `design`
- storage-view-model — `design`, `persistence`
- page-defaulting — `ui-design`
- ui-patterns — `ui-design`, `web-ui`
- page-composition — `ui-design`, `web-ui`
- page-spec — `design`, `web-ui`
- ui-catalog — `design`, `web-ui`
- operation-coverage — `design`, `web-ui`, `testing`
- erd-diagram — `design`
- navigation-diagram — `design`
- traceability-to-business-specs — `design`

## Architecture
- capability-slices — `architecture`
- layering-boundaries — `architecture`, `server`
- shared-access-enforcer — `architecture`, `web-ui`, `api`
- architecture-diagram — `architecture`
- interaction-diagrams — `architecture`
- cross-cutting-concerns — `architecture`
- repository-pattern — `architecture`, `server`, `persistence`
- transaction-boundaries — `architecture`, `server`, `persistence`
- user-identity — `architecture`, `server`, `api`

## Source Generation
- stack-conformant-source — `server`
- capability-vertical-slices — `server`, `architecture`
- source-trace-header — `server`
- standard-root-operations — `server`, `design`
- thin-routes-fat-services — `server`, `api`
- boundary-validation — `server`, `api`
- logging — `server`, `architecture`

## Web UI
- [single-tier-live-page](web-ui/single-tier-live-page.md) ✓ — `prototyping`, `web-ui`
- live-page-navigation — `web-ui`, `design`
- actionable-controls — `web-ui`
- lifecycle-transition-control — `web-ui`
- object-info-metadata — `ui-design`, `web-ui`
- carbon-ui-profile — `web-ui`
- real-dataset — `web-ui`
- governed-values-from-specs — `web-ui`, `business-requirements`
- operations-against-data — `web-ui`
- design-system-styling — `web-ui`
- ui-states (empty/loading/error/success) — `web-ui`
- stable-selectors — `web-ui`, `testing`

## Prototyping
- [model-derived-data-pipeline](prototyping/model-derived-data-pipeline.md) ✓ — `prototyping`
- [data-source-switch](prototyping/data-source-switch.md) ✓ — `prototyping`, `web-ui`, `design`
- [role-switcher](prototyping/role-switcher.md) ✓ — `prototyping`
- [annotations](prototyping/annotations.md) ✓ — `prototyping`, `web-ui`, `testing`
- [guided-workflows](prototyping/guided-workflows.md) ✓ — `prototyping`

## API
- capability-api-boundary — `api`, `architecture`
- endpoint-contracts — `api`
- request-response-validation — `api`
- status-code-discipline — `api`
- business-rule-responses — `api`
- openapi-contract — `api`

## Persistence
- schema-from-entities — `persistence`, `design`
- versioned-migrations — `persistence`
- runnable-migrate-seed — `persistence`
- meaningful-seed-data — `persistence`, `prototyping`
- constraints-and-keys — `persistence`
- persistence-integration-test — `persistence`, `testing`
- optimistic-locking — `persistence`, `design`, `api`
- audit-history — `persistence`, `design`

## Integration
- integration-spec — `integration`, `design`
- adapter-isolation — `integration`, `architecture`
- ownership-and-mapping — `integration`
- secrets-and-timeouts — `integration`
- idempotency-and-retries — `integration`
- compatibility-versioning — `integration`
- contract-and-failure-tests — `integration`, `testing`
- reconciliation-path — `integration`

## Testing
- dependency-resolution — `testing`, `server`
- coverage-threshold — `testing`
- test-style-by-layer — `testing`
- gherkin-traceability — `testing`
- ui-screenshots — `testing`, `web-ui`
- captured-command-output — `testing`
- required-operation-ui-coverage — `testing`, `design`
- static-vs-executable-classification — `testing`

## Documentation
- capability-docs — `documentation`
- change-rationale — `documentation`
- evidence-attachment — `documentation`
- stale-doc-detection — `documentation`
- release-notes — `documentation`

## Deployment
- containerization — `deployment`
- orchestration — `deployment`
- cloud-deployment — `deployment`
