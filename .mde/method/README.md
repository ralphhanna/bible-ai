# MDE Simplified Method — Event-Loaded Edition

This method keeps the always-loaded rule set small while preserving coverage through command and target profiles.

## Loading model

- **Boot file**: the project root `mde` file resolves `<MDE_ROOT>`, `<METHOD_SOURCE>`, project paths, and command write boundaries before any `mde ...` command runs.
- **Core rules**: MDE framework architecture and stable concepts (*what MDE is*).
- **Workflow rules**: plan-lifecycle mechanics (*how a plan proceeds*), loaded with core.
- **Commands**: event-specific mechanics.
- **Targets**: specialized work coverage loaded only when relevant.
- **Templates**: artifact shapes.

## Rules: core + workflow

Rules are split by concern; both groups load together for every command
(`rules/core/*` + `rules/workflow/*`).

**Core** (`rules/core/`) — stable framework concepts, *what MDE is*:

1. Framework Architecture Principles
2. Artifact Model
3. Generated Artifact Quality

**Workflow** (`rules/workflow/`) — plan-lifecycle mechanics, *how a plan proceeds*:

1. Plan Lifecycle
2. Branch and Release
3. Incoming Files
4. Change Reconciliation

## Commands

Commands define operational behavior for events such as:

- start (create a draft plan),
- evaluate (preview impact + pending manifest),
- go (build — locks the impact, materializes artifacts, and verifies them),
- change, cancel,
- show,
- review app, review method,
- start version, release.

Version/release/branch/commit mechanics live in command instructions, not always-loaded rules.

## Plans

Plan folders keep the existing naming and file contract:

- Plan IDs are number-prefixed slugs: `plans/<NNN-slug>/`, for example `plans/001-conduct-business-analysis-for-hr/`.
- `plans/active-plan.md` stores the active plan pointer.
- The next `NNN` is the highest existing numeric prefix under `plans/` plus one.
- Plans do not use date-first folder names and do not use a catch-all `plan.md`.

Plan files keep their existing roles:

- Intake: `scope.md`, `discussion.md`, `log.md`, `status.md`
- Approval/execution: `impact.md`, `acceptance.md`, `output.manifest`, `tasks.md`, `evidence.md`
- Optional/reference: `imports/`, `prototype/`
- Release: `release.md`

## Targets

Targets define specialized coverage and are loaded only when relevant:

- business requirements,
- source generation,
- architecture,
- testing,
- web UI,
- API,
- persistence,
- documentation.

## Trace

The method preserves the existing two-level manifest model:

- **Plan-local manifest**: `plans/<plan-id>/output.manifest`
- **Consolidated app manifest**: `manifest/`

Plan-local manifests record the outputs, source inputs, governing rules, ownership, status, and verification for a single plan.

The consolidated manifest is derived from plan-local manifests and may include files such as `manifest/index.json`, `manifest/by-specs.json`, and deferral or trace views.

Product trace belongs in `plans/` and root-level `manifest/`.
