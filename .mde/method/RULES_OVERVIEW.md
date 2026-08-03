# MDE Method Index

A terse map of the method. This file is an **index**, not a digest: it says what
exists and where, and defers the authoritative detail to the linked files, which are
loaded lazily at command time. Do not restate rule/command/target content here.

## Activation contract — what to read on `load mde`

On `load mde`, read **only**:

1. this file (`RULES_OVERVIEW.md`) — the map;
2. the root `mde` boot file / `README.md` — to resolve `<MDE_ROOT>`, `<METHOD_SOURCE>`, and write boundaries.

Do **not**, at activation:

- read every rule, target, or template (they total ~33k tokens; ~8% is enough to start);
- open plan files, Specs, or app source to "understand state" — read those only when a command needs them;
- re-read a file already in context this session.

Everything else loads **on demand**:

- **Project policy** (`specs/design/mde-policy.md`) — consulted by every
  command for `autoCommit` / `branchPrefix` / `debug`; small, defaults apply if absent.
- **Core rules** (`rules/core/*`) — stable framework concepts; loaded by every command.
- **Workflow rules** (`rules/workflow/*`) — plan-lifecycle mechanics; loaded by every command alongside core.
- **A command profile** (`commands/<cmd>.md`) — loaded when that command runs.
- **A target profile** (`targets/<name>.md`) — loaded only when that kind of work is active.
- **A template** (`templates/…`) — loaded only for an artifact being created or checked.

This keeps the method focused while preserving full coverage one load away.

## Core rules — `rules/core/` (framework: what MDE is)

| Rule | File | Covers |
|---|---|---|
| CORE-001 Framework architecture | `01-method-principles.rules.md` | Specs, plans, commands, targets, templates, manifests; commands target-agnostic; targets compiled from features |
| CORE-002 Artifact model | `02-artifact-model.rules.md` | artifact layers, capabilities/entities, plan artifact set, UI catalog, page specs, manifests, merge policy |
| CORE-004 Generated artifact quality | `04-generated-artifact-quality.rules.md` | intent-specific output; no near-duplicate pages; placeholders; honest status |

## Workflow rules — `rules/workflow/` (lifecycle: how a plan proceeds)

| Rule | File | Covers |
|---|---|---|
| WORKFLOW-001 Plan lifecycle | `01-plan-lifecycle.rules.md` | plan working model, draft/evaluate/go/cancel, clean baseline, working changes, DB/runtime apply exception |
| WORKFLOW-002 Branch and release | `02-branch-release.rules.md` | branch = release train of plans; base-bound plans; no rebase |
| WORKFLOW-003 Incoming files | `03-incoming-files.rules.md` | one identify→analyze→handle pipeline for imported/dirty/modified files |
| WORKFLOW-004 Change reconciliation | `04-change-reconciliation.rules.md` | drift detection; forward/backward/mixed/rejected reconciliation; entity-op↔page-part invariant |

## Commands — `commands/`

| Command | File | One-line |
|---|---|---|
| `mde start` | `start.md` | create an interactive draft plan (plan-local only) |
| `mde evaluate` | `evaluate.md` | derive impact + acceptance + pending manifest; mark `evaluated` |
| `mde go` | `go.md` | the single build step: materialize, verify, reconcile, commit |
| `mde change` | `change.md` | undo last build, return to `draft` for revision |
| `mde cancel` | `cancel.md` | abandon the plan; set `cancelled` |
| `mde show` | `show.md` | summarize current plan state; refresh the derived status snapshot |
| `mde show version` | `version.status.md` | summarize version/release state |
| `mde start branch` | `start.branch.md` | create the version branch (release train) |
| `mde release branch` | `release.branch.md` | merge + tag a release |
| `mde review app` | `review.app.md` | review app vs specs/targets; report (no changes); surface plan leftovers |
| `mde review method` | `review.method.md` | lint the method package + capability↔target drift + capability validation |
| `mde run` | `macro.md` | run a macro (a scripted sequence of commands) |

## Targets — `targets/` (catalog: `targets/catalog.md`)

Loaded only when relevant: `business-requirements`, `server`,
`architecture`, `testing`, `web-ui`, `api`, `persistence`, `documentation`,
`design`, `deployment`. See `targets/catalog.md` for which work activates each.

## Trace manifests

- Plan-local: `plans/<id>/output.manifest` — a **pure artifact trace**; touch
  state only (`planned/created/modified/blocked`). Schema:
  `templates/trace/manifest-entry.schema.json`. No verification verdicts here —
  those live in `evidence.md`, which references manifest entries.
- Consolidated: root `manifest/`, derived from plan-local manifests by
  `scripts/build-app-manifest.mjs` (`index.json`, `by-specs.json`).

## Plan artifact set

`plans/<NNN-slug>/`: `scope.md` (frame: intents + nested scope), `discussion.md`
(two-way reasoning trail; replaces questions/decisions), `impact.md`,
`acceptance.md`, `output.manifest`, `tasks.md`, `evidence.md`, `log.md`,
`status.md`, and release-time `release.md`. Full model: see the published
plan-status reference.
