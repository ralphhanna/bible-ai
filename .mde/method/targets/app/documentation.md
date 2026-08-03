---
type: target
id: TARGET-DOCUMENTATION
title: Documentation and Evidence Target Profile
applies_when:
  - a plan creates or modifies docs, walkthroughs, screenshots, API docs, diagrams, or release notes
  - a plan implements or changes a capability or feature (document the implemented scope)
---

# Documentation and Evidence Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Documentation should explain the implemented/reconciled system and provide evidence of verification.

## Outputs

The artifacts a plan loading this target must produce. The verifier reads this
(authoritative) list and checks the plan's manifest contains each. `perEach` names
the spec set that enumerates instances (from specs — never the plan); `when` gates
applicability.

| output | path | perEach | when |
|---|---|---|---|
| capability-doc | docs/capabilities/{cap}.md | business-capability | always |
| use-case-walkthrough | docs/walkthroughs/{slug}.md | use-case | web-ui |
| user-guide | docs/user-guide.md | — | web-ui |
| operator-guide | docs/operator-guide.md | — | deployment |
| erd | docs/diagrams/erd.md | — | data-model-in-scope |
| nav-diagram | docs/diagrams/navigation.md | — | web-ui |

<!-- `when` gates an output to the plan that can actually produce it — the OTHER
     target whose scope this documentation output depends on (documentation's own
     rows are cross-target by nature: they describe deliverables that only make
     sense once a different target is also loaded). Walkthroughs and the nav
     diagram are UI deliverables (screenshots/pages of the running UI), so
     `web-ui` — they belong to the frontend plan, not the backend. The ERD is a
     data-model deliverable (`data-model-in-scope` stays a named condition, not a
     target id — it is true for EITHER persistence target, or any plan that simply
     touched an entity). capability-docs applies to any implementing plan. The
     user-guide is a single whole-system end-user manual (`web-ui`). The
     operator-guide is the install/deploy/run runbook, produced when `deployment`
     is in scope. -->

## Composed behavior

### Capability docs (scope-specific)  `[feature: capability-docs]`

Implementation includes documentation (business/requirements/design/api/user as applicable),
alongside source and tests. Docs are **scope-specific**: document the capability/capability
implemented or changed, not other capabilities. Docs trace to capabilities, page specs, use
cases, APIs, or plans. API docs are updated when endpoints/contracts change. Generated
docs/output do not become authoritative unless explicitly confirmed and reconciled.

**Per use-case walkthrough.** For each in-scope use case the plan implements or changes, the
docs include a **full step-by-step walkthrough** — an ordered narrative of the actor's path
through the use case, with a **screenshot at every step** showing the screen at that point.
Reuse the screenshots already captured from the running UI for the Testing target
(`reports/evidence/screenshots/`, see the `ui-screenshots` capability) rather than re-capturing or
hand-supplying images; where a step's screen was not captured there, capture it from the
running UI during the same run. Each walkthrough lives at `docs/walkthroughs/<use-case-slug>.md`,
traces to its use case, and references the screenshot for each step inline. A use case whose
walkthrough is absent, has no screenshots, or whose screenshots are stale relative to the
current UI is incomplete — flag it, do not keep a stale walkthrough as if current.

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

The Service/Repository `// MDE: <entity>.<op>` markers, together with the Route marker
(`capability-api-boundary`) and the UI panel's `operations:` list (`operation-coverage`), are the
source the **code-coverage matrix** (`code-coverage-matrix`) is derived from — the Entity ×
Operation × Layer grid that shows which layers implement each operation.

### Change rationale  `[feature: change-rationale]`

Docs make the change and its reasoning legible to a reviewer. Screenshots/walkthroughs are
updated when UI behavior materially changes.

### Changelog (per-plan, accumulated at release)  `[feature: changelog]`

When `changelog.track: on`:
- **`mde evaluate` writes the plan's entry** into the root `CHANGELOG.md` under `## [Unreleased]`,
  derived from the plan's scope/intent. It is a **candidate artifact** in `output.manifest`, so the
  **user reviews and edits it** before `go` — not hidden until commit. The unit is the plan
  (whatever the plan changed is its entry — a BA plan logs a requirement change, a build plan logs
  a capability). There is no per-file or per-release unit.
- **`mde release` accumulates** — it renames the `## [Unreleased]` section to `## [<version>] —
  <date>` under the new version/tag (per the release policy's `tagScheme`), and opens a fresh empty
  `## [Unreleased]`. Release authors no new content; it only rolls up what plans already wrote.

### Code coverage matrix (Entity × Operation × Layer)  `[feature: code-coverage-matrix]`

When source implementing entity operations is in scope, produce the code-coverage matrix as a
report: **rows = entity operations** (`<entity>.<op>`, CRUD + lifecycle from the entity
`## Operations`), **columns = UI / API / Service / Repository / DB**, each cell marked present
or missing, derived from the markers above. Where a row has a marked Route but a missing
Service/Repository mark, that is a layering gap (owned by `capability-vertical-slices`); a row
missing entirely at a layer is a coverage gap. The matrix is **regenerated from current
source**, never hand-maintained — it is a view that re-derives, like the ERD.

`mde review app` surfaces this matrix as the CRUD sub-section of its Coverage report (it runs
the applicable targets' checks and consolidates); the matrix is where "which layers implement
each operation" is read off at a glance across the whole app.

### ERD diagram (logical)  `[feature: erd-diagram]`

When the data model is in scope, the logical ERD (`docs/diagrams/erd.dot` + rendered
`docs/diagrams/erd.svg`, embedded in `docs/diagrams/erd.md`) is present and current: bare entity
nodes (no columns), every relationship with explicit cardinality + a short verb label, laid out
by Graphviz to minimize crossings (group by capability, hubs central; split per-capability if
large). If BA already produced it, design **refines the DOT and re-renders the SVG** rather than
recreating it; if it is absent, design produces it. Every entity and relationship traces to a
`specs/business/entities/<slug>.md`. Lives under `docs/diagrams/`, never `specs/`.

The `erd.md` page has a **`## Reading` section** below the embedded SVG — the plain-English
narration of the diagram (one sentence per relationship, verb + cardinality quantifier), kept in
sync when the DOT changes (both derive from the same entity relationships). It is part of
`erd.md`, not a separate file.

### Evidence attachment  `[feature: evidence-attachment]`

Evidence is attached to the relevant plan. It distinguishes build, unit test,
API/integration test, and E2E/test-browser evidence (the captured artifacts from the Testing
capabilities live under the plan's `evidence/`).

### Navigation diagram  `[feature: navigation-diagram]`

When UI is in scope, produce a navigation diagram as a Mermaid `flowchart` in
`docs/diagrams/navigation.md` (under `## Navigation`), one node per page. Every node traces to
a page in `UI/ui-catalog.md` and its page spec; every edge is a real navigation action defined in
a page spec. Group by capability, landing pages central, split if unreadable. Consistent with
the live pages' client-routing navigation. Lives under `docs/diagrams/`, never `specs/`.

### Operator guide (install / deploy / run)  `[feature: operator-guide]`

When a deployment target is in scope, the app ships an **operator guide** at
`docs/operator-guide.md` — the runbook for someone installing, deploying, and operating the
app (not developing it). It covers: prerequisites and environment/config (env vars, database
connection, ports), **install** and build steps, **deployment** (per the loaded deployment
target — e.g. folder-proxy/Apache, container, cloud), starting/stopping and health checks,
and **common operational issues / troubleshooting** (failed DB connection, migration/seed,
port conflicts, proxy/base-path). It traces to the deployment target and the app's actual
config (`.env`/config source, start scripts), not invented values. An operator guide missing
the install or deployment steps for the in-scope deployment target is incomplete; flag it.

### Release notes  `[feature: release-notes]`

Release notes identify included plans and important reconciliation commits (produced at
release, version-level — see `version.release`).

### Semantic references in generated text  `[feature: semantic-references]`

Docs, reports, knowledge pages, and walkthroughs tag **every concept** they name as `{{kind:slug}}`
— a walkthrough of a use case tags the use case and every concept it walks through — so generated
documentation links to the model rather than restating names.

### Stale-doc detection  `[feature: stale-doc-detection]`

Screenshots/walkthroughs are updated when UI behavior materially changes; API docs when
contracts change; diagrams under `docs/diagrams/` when architecture/entities/flows/navigation
change. Where a doc/screenshot is now stale, it is flagged rather than kept as if current.

### User guide (whole-system, end-user)  `[feature: user-guide]`

When the UI is in scope, the app ships **one consolidated user guide** at
`docs/user-guide.md` — the manual an end user reads to operate the application. Unlike the
per-use-case walkthroughs (which trace a single actor path), the user guide is a **single,
cohesive, whole-system** document: what the app is for, how to sign in, the main
screens/navigation, and how to accomplish the primary tasks across capabilities, written for
a non-technical user. It links to the per-use-case walkthroughs for step detail rather than
duplicating them, and references the running UI (reuse existing `reports/evidence/screenshots/`). One
guide per app, kept current with the UI — a user guide that omits an implemented primary task,
or whose screens are stale relative to the current UI, is incomplete; flag it.

## Validation checks

### Capability docs (scope-specific)  `[feature: capability-docs]`

- Did the plan produce docs for the capability/capability it implemented (scope-specific, traced
  to capabilities/specs/APIs), with API docs updated when contracts changed?
  · evidence: `docs/` for the implemented scope
  · when: static
- For each in-scope use case, does `docs/walkthroughs/<use-case-slug>.md` exist with an ordered
  step-by-step narrative and a screenshot per step (reusing `reports/evidence/screenshots/`), traced to
  the use case, with stale/missing screenshots flagged rather than kept?
  · evidence: `docs/walkthroughs/` + the use case's screenshots
  · when: requires-environment

<!-- Mandated-output coverage (every loaded target produced its ## Outputs) is a
     built-in plan-level gate in the verifier, attributed to the owning target —
     not a per-capability check block (which would mislabel the finding). -->

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

- Is source organized by capability/vertical slice when capability-based?
  · evidence: source directory structure
  · when: static
- Does each server slice have **one file per layer** — `<Slice>Types`, `<Slice>Repository`,
  `<Slice>Service`, `<Slice>Routes` as separate files (a slice with a Service/Routes but no
  Repository, or layers collapsed into one file, is drift)?
  · evidence: slice directory file set
  · when: static
- Does every entity operation implemented by a slice carry the `// MDE: <entity>.<op>` marker at
  its Service method **and** its Repository method (the same convention Routes already carries)?
  · evidence: marked Service/Repository methods per `entity.op`
  · when: static

### Change rationale  `[feature: change-rationale]`

- Can a reviewer understand what changed and why from the docs?
  · evidence: change docs / walkthrough updates
  · when: static

### Changelog (per-plan, accumulated at release)  `[feature: changelog]`

- When `changelog.track: on`, did `mde evaluate` write/update this plan's entry under
  `## [Unreleased]` in the root `CHANGELOG.md` (present in the manifest as a candidate artifact)?
  · evidence: `CHANGELOG.md` `[Unreleased]` section + the manifest entry for it
  · when: static
- When `changelog.track: on`, does `mde release` move `[Unreleased]` into a dated version section
  (semver per policy) and leave a fresh `[Unreleased]` — accumulating, not re-authoring?
  · evidence: released `CHANGELOG.md` version heading vs. the released plans
  · when: static

### Code coverage matrix (Entity × Operation × Layer)  `[feature: code-coverage-matrix]`

- When source implementing entity operations is in scope, is the code-coverage matrix present
  as a report (rows = entity operations, columns = UI/API/Service/Repository/DB), each cell
  derived from the `// MDE: <entity>.<op>` markers and Storage View — not hand-maintained?
  · evidence: the code-coverage report (e.g. `reports/evidence/code-coverage.md`) vs. the source markers
  · when: static
- Is the matrix **current** with the source it is derived from — every entity operation present
  as a row, and each cell agreeing with the marker actually in source (no cell claimed present
  whose marker is absent, nor missing whose marker exists)?
  · evidence: matrix cells re-derived from current source markers
  · when: static

### ERD diagram (logical)  `[feature: erd-diagram]`

- When the entity model is defined/refined (BA) or a data model is in scope (design), is the
  logical ERD authored as Graphviz DOT in `docs/diagrams/erd.dot` (entities + relationships, no
  attributes), each node tracing to an entity file, grouped/clustered to minimize crossings?
  · evidence: `docs/diagrams/erd.dot`
  · when: static
- Is `docs/diagrams/erd.svg` rendered from `erd.dot` (via `render-diagram.mjs`, native or WASM
  Graphviz) and current with it, and embedded by `docs/diagrams/erd.md`?
  · evidence: `docs/diagrams/erd.svg` rendered from the current `erd.dot`
  · when: static — run `render-diagram.mjs` directly; only defer if it exits non-zero with both
    backends unavailable, and capture that exact error as the deferral reason
- Does `docs/diagrams/erd.md` include a **`## Reading` section** — the diagram in plain English,
  one sentence per relationship (verb + cardinality quantifier, e.g. "Every Employee fills exactly
  one Position") — covering the same relationships the DOT draws (a relationship in the diagram
  with no sentence, or a sentence for a relationship not in the diagram, is drift)?
  · evidence: `docs/diagrams/erd.md ## Reading` vs the relationships in `erd.dot`
  · when: static
- Does **every relationship carry a real role name** — a meaningful verb phrase (`fills`,
  `reports to`, `is assigned to`) on the edge label in `erd.dot` and in the reading sentence — and
  **not** a generic `has` / `relates to` / `associated with` / `links to` / bare FK name? A
  contentless label means the model under-specifies the relationship.
  · evidence: edge labels in `erd.dot`; the verbs in `erd.md ## Reading`
  · when: static

### Evidence attachment  `[feature: evidence-attachment]`

- Is evidence attached to the relevant plan, distinguishing build / unit / API-integration /
  E2E evidence?
  · evidence: plan `evidence/` + `evidence.md`
  · when: static

### Navigation diagram  `[feature: navigation-diagram]`

- When UI is in scope, is there a navigation diagram in `docs/diagrams/navigation.md` whose
  nodes trace to UI-catalog pages and whose edges trace to page-spec navigation actions?
  · evidence: `docs/diagrams/navigation.md`
  · when: static

### Operator guide (install / deploy / run)  `[feature: operator-guide]`

- When a deployment target is in scope, does `docs/operator-guide.md` exist covering
  prerequisites/config (env, database, ports), install/build, deployment for the in-scope
  deployment target, start/stop/health, and troubleshooting of common operational issues,
  traced to the app's real config and start scripts (not invented)? A guide missing the
  install or deployment steps for the in-scope target fails.
  · evidence: `docs/operator-guide.md`
  · when: static

### Release notes  `[feature: release-notes]`

- Do release notes identify the included plans and important reconciliation commits?
  · evidence: release notes / `release.md`
  · when: static

### Semantic references in generated text  `[feature: semantic-references]`

- Does generated text tag **every mention** of a known **concept** with a canonical `{{kind:slug}}`
  tag — not just the first mention — so no named concept survives as bare prose? Read the narrative
  (especially use-case `## Flow` steps and `## Conditions`): does any sentence name a concept that
  exists in the catalogue but leaves it untagged (the confabulation escape hatch)?
  · evidence: every named-concept mention in the prose vs. the catalogue; untagged known concepts
  · when: static + AI review
- Is every `{{...}}` tag well-formed — a canonical `<kind>` (per the trace schema) and a `<slug>`
  that resolves to a real object — with no dangling or fabricated references, and the **same object
  always the same slug** (no `performance-goal` in one place and `goals`/`objectives` in another)?
  · evidence: the tags vs. `specs/business/` + `specs/design/` objects; slug consistency per object
  · when: static + AI review

```check scope=item
# Well-formedness (deterministic): every {{...}} tag in a generated artifact must
# parse as {{<kind>:<slug>}}. Flags a malformed tag (missing kind or slug, spaces,
# empty). Completeness (did it tag what it should) and slug-resolves are the semantic
# checks above — a regex can't resolve slugs or judge untagged prose without false
# positives. This only fires on a present-but-malformed tag.
WHEN  $item.type IS "source"
  AND $item.content MATCHES "\{\{"
THEN  $item.content NOT MATCHES "\{\{\s*([^:}]+\}\}|:[^}]*\}\}|[^:}]*:\s*\}\}|\s*\}\})"
  ELSE "a {{...}} semantic tag is malformed — use {{<kind>:<slug>}} with a canonical kind and a resolvable slug (semantic-references)"
```

```check scope=system
# untaggedConcepts (app.untaggedConcepts in model.mjs): HIGH-PRECISION mechanical half of the
# naming-integrity gate. It flags a DISTINCTIVE concept name (a multi-word slug like
# `performance-goal` → "performance goal") appearing in a use case's narrative prose (## Flow /
# ## Conditions) OUTSIDE a {{…}} tag — an untagged known concept, the confabulation escape hatch.
# Single common-word slugs are deliberately NOT flagged here (too ambiguous for a regex — left to
# the AI-review check above); so a hit is a real untagged reference. Vacuous until use cases +
# multi-word concepts exist (inScope guards it).
WHEN  $app.untaggedConcepts.inScope IS "true"
THEN  $app.untaggedConcepts.clean IS "true"
  ELSE "a known concept is named in use-case prose but left untagged — ${$app.untaggedConcepts.hitCount}: ${$app.untaggedConcepts.hits}. Tag every mention {{kind:slug}} so the reference resolves and the AI can't drift or invent the name."
```

### Stale-doc detection  `[feature: stale-doc-detection]`

- Are stale screenshots/docs flagged (and updated where behavior changed) rather than silently
  kept?
  · evidence: doc/diagram updates vs. the change; stale flags
  · when: static

### User guide (whole-system, end-user)  `[feature: user-guide]`

- When the UI is in scope, does a single `docs/user-guide.md` exist that covers the app
  whole-system for an end user (purpose, sign-in, navigation/main screens, and how to do the
  primary tasks across capabilities), linking to the per-use-case walkthroughs rather than
  duplicating them? A guide that omits an implemented primary task, or whose screens are stale
  relative to the current UI, fails.
  · evidence: `docs/user-guide.md`
  · when: static
