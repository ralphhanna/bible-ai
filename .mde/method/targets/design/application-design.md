---
type: target
id: TARGET-APPLICATION-DESIGN
title: Application Design Target Profile
applies_when:
  - a plan designs the application as a whole (architecture, capability composition, cross-cutting decisions)
  - a plan designs a capability before or alongside implementation
  - a plan records significant design decisions or traceability to business specs
  - a plan selects or records the application technology stack
  - a plan designs an external integration
inputs:
  - user: technology stack selection
---

# Application Design Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Application Design turns Business Specs into the whole-application design the team builds from — architecture, capability composition, technology stack, and cross-cutting design decisions — without being source code. The per-concern facets (API, persistence, UI) have their own design targets; this target owns the general, application-wide design that ties them together.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| capability-design | specs/design/capabilities/{cap}/overview.md | business-capability | design-in-scope |
| tech-stack | specs/design/tech-stack.md | — | design-in-scope |

## Composed behavior

### Architecture design  `[feature: architecture-design]`

`specs/design/architecture.md` records layers, boundaries, request flow, and integration
points, referencing the declared tech stack and keeping UI, API, service/domain, persistence,
and integration concerns separated. Every architecture artifact traces to business specs.

### Capability design  `[feature: capability-design]`

`specs/design/capabilities/<slug>/overview.md` records the capability's **primary entity**, its
**module boundary** (what it owns vs. consumes from other capabilities), and **references** (tagged
`{{kind:slug}}`) to: its **entities**, its **use cases**, and its **pages**. Design specs cover
every in-scope capability. Each reference traces to the artifact that owns the detail.

**The overview is an index of references, not a re-narration.** It **must not** contain:

- an **API / operations table** — operations are declared on the **entity** (`## Operations`),
  realized by **use cases** (each `## Realization` names the operation), and access lives on the
  operation (roles + scope); the HTTP contract is the generated `openapi.yaml` (code-first). The
  overview does not restate operations, endpoints, or access.
- a **pages table** — pages are their own specs under `specs/design/UI/pages/`; the overview
  **references** them, it does not copy their routes/purpose.
- **use-case realizations** — a use case's realization lives in its own file's `## Realization`
  section (see `use-case-realization`); the overview **references** the use cases, it does not
  restate their steps/operations.
- a **validation/errors** or **persistence-boundary** narrative — those are the api-design /
  persistence-design targets' concerns.

Duplicating any of these here is drift: the same fact then lives in two places and rots. Keep the
overview to capability identity + module boundary + references.

### Capability-aware data-source switch (fake → real)  `[feature: data-source-switch]`

The `data-source` axis is **declared** in the stack templates and **recorded** in
`specs/design/tech-stack.md` (Application Design target reads it and ties it to the resolver). Source →
reader → enforcer: the axis is real only when it has all three.

### Design decisions log  `[feature: design-decisions-log]`

`specs/design/design-decisions.md` carries one entry per significant choice: what, why,
alternatives considered. Source patterns trace back to a decision entry.

### Integration specification  `[feature: integration-spec]`

The integration spec is part of design specs, created from the integration template and
reviewed against the Integration target.

### Semantic references in generated text  `[feature: semantic-references]`

Design-overview and decision text tags **every concept** it names as `{{kind:slug}}`, so design
traces to the same vocabulary the business specs use.

### Technology stack selection  `[feature: tech-stack-selection]`

When design/build work is needed and no stack is recorded, select it first: present the
starter stacks in `templates/stack/` plus `custom`; let the user choose; capture constraints;
write `tech-stack.md` from the chosen template recording per-axis choices + one-line
rationale each. Record the **standard root operations map** (install/start/dev/build/test +
db subcommands). The chosen template's targets block determines which target profiles later
plans load. Complete when every axis has a selected option and a rationale.

### Traceability to business specs  `[feature: traceability-to-business-specs]`

Each architecture / decision / entity / page artifact is traceable to business specs. Design
entities match the business entities they implement. Concerns stay layered (no business logic
hidden in UI or persistence). All design diagrams live under `docs/diagrams/` (never `specs/`),
each a view tracing to its source.

**Use-case realization trace.** The `## Realization` section (`use-case-realization`, in the same
use-case file) traces onto the business sections of that file:

- a **realization step entry** realizes a **business step**, joined by its **step #** (S1, S2, …);
- a **condition realization** realizes a **condition**, joined by its **title**;
- a realization step **invokes** an entity operation (by OKF uri), **applies** a business rule (by
  OKF uri), is **exposed-through** an API operation, and is **rendered-through** a page interaction.

Design may add mechanics but must **not silently change** the actor, business intent, numbered
steps, or a condition's situation / expected result. If design discovers the business behaviour
must change, the business sections are updated first, through the governed change process.

### Use-case realization  `[feature: use-case-realization]`

The realization is a **`## Realization` section the design pass ADDS to the same use-case file**
(`specs/business/capabilities/{cap}/use-cases/{uc}.md`, `mergePolicy: user-owned`) — **not** a
separate `specs/design/**` document. Business analysis produces the file **without** this section
(no empty or `(unrealized)` scaffold); the design pass **appends and fills it**, without rewriting
the user-owned business sections above it — the same way the Persistence Design target adds an
entity's `## Storage View`. Every **in-scope use case has a filled `## Realization` section after
design** (a use case still missing it, or one carrying only `(unrealized)` stubs, is unrealized).

The realization is *additive and faithful*: it refers to each business step by its **step #**
(S1, S2, …) and to each condition by its title, and **must not silently change** the actor,
intent, business steps, or any condition's situation / expected result. If design finds the
business behaviour must change, the **business sections are updated first**, through the governed
change process — design never quietly overrides business.

**Step realization** — for each step (by #), the mechanics that perform it, where applicable:

- page and interaction;
- **operation** — an **OKF reference (uri)** to the declared entity operation
  (`<entity-concept-id>#<entity.op>`), not free-text;
- object;
- **rules applied** — **OKF references (uris)** to the business-rule concepts enforced at this step;
- API operation (method + path);
- state transition / persistence effect;
- integration boundary.

**Condition realization** — design adds mechanical detail to **every** condition the business
sections defined (it invents no replacement conditions). For each (referenced by its title, under
its step or at use-case level):

- the concrete **operation** — OKF ref (uri) to the entity operation;
- the expected API status;
- for a rule-rejection condition, the **rule** — OKF ref (uri) to the rule concept — proven on
  reject;
- the expected application state and persistence effect;
- the applicable test layers (business acceptance / API / UI / focused service or rule).

The reject-path realization of a business-rule condition asserts on the **structured rule
concept-id** in the error response (per `api/business-rule-responses.md`); a human-readable
`expectedError` label may accompany it as corroborating prose but is never the primary assertion.
Referencing operations and rules by **concept uri** (not free-text) is what makes the coverage and
rule-enforcement traces machine-checkable — an operation or rule that resolves to no concept is a
dangling reference.

**Coverage denominators shift to the realization** (design-side consequence, proven downstream):
a business API operation exists because a **realized step requires it**; a rendered UI operation
exists because a **realized step needs user interaction**. An entity operation does not
automatically require a public endpoint or a UI control — it does when a realization exposes it.
Explicitly technical operations (health, runtime management) are classified separately.

**Coverage denominators shift to the realization** (design-side consequence, proven downstream):
a business API operation exists because a **realized use-case step requires it**; a rendered UI
operation exists because a **realized step needs user interaction**. An entity operation does not
automatically require a public endpoint or a UI control — it does when a realization exposes it.
Explicitly technical operations (health, runtime management) are classified separately.

## Validation checks

### Architecture design  `[feature: architecture-design]`

- Does architecture reference the declared stack and keep UI/API/service/persistence/
  integration concerns separated?
  · evidence: `specs/design/architecture.md`
  · when: static
- Is each architecture artifact traceable to business specs?
  · evidence: architecture ↔ capability/entity links
  · when: static

### Capability design  `[feature: capability-design]`

- Does each in-scope capability's overview record its **primary entity** and **module boundary**,
  and **reference** (tagged `{{kind:slug}}`) its entities, use cases, and pages?
  · evidence: `specs/design/capabilities/<slug>/overview.md`
  · when: static + AI review
- Is the overview a **thin index** — free of a restated API/operations table, a pages table,
  inline use-case realizations, or a validation/persistence narrative (all of which live in their
  own artifacts)?
  · evidence: overview body vs. the entity `## Operations` / `UI/pages/` / use-case `## Realization`
  · when: static + AI review
- Does the capability **realize every in-scope use case** it owns (a filled `## Realization`
  section in each use-case file)?
  · evidence: capability's in-scope use cases vs. their `## Realization` sections
  · when: static + AI review

### Capability-aware data-source switch (fake → real)  `[feature: data-source-switch]`

- Does the API client resolve **per capability** (real `/api/<cap>` when `Routes.ts` exists,
  else fake), and does **no page hard-code a base URL**?
  · evidence: API client source + page imports
  · when: static
- Does every page still on the fake API **genuinely lack** a real API for its capability
  (else it is drift)?
  · evidence: per-page resolved source vs. `src/server/<cap>/Routes.ts` presence
  · when: static

### Design decisions log  `[feature: design-decisions-log]`

- Does every significant choice have a design-decision entry (what/why/alternatives), and do
  source patterns trace back to one?
  · evidence: `specs/design/design-decisions.md`
  · when: static

### Integration specification  `[feature: integration-spec]`

- Does every in-scope external system have a non-placeholder integration spec recording
  ownership, mapping, auth/secrets, timeout/retry/idempotency, compatibility, recovery,
  observability, and test environment?
  · evidence: `specs/design/integrations/<slug>.md`
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

### Technology stack selection  `[feature: tech-stack-selection]`

- Does `tech-stack.md` record a selected option + one-line rationale for every axis/category?
  · evidence: `specs/design/tech-stack.md`
  · when: static
- Is the standard root operations map present (install/start/build/test, dev/migrate/seed as applicable)?
  · evidence: `tech-stack.md` operations map
  · when: static

### Traceability to business specs  `[feature: traceability-to-business-specs]`

- Is each architecture/decision/entity/page artifact traceable to business specs?
  · evidence: design ↔ business-spec links
  · when: static
- Does each `## Realization` section trace onto the business sections of its own file — realizing
  its numbered steps and conditions (by step # and condition title) — without altering the actor,
  intent, steps, or any condition's situation / expected result?
  · evidence: `## Realization` ↔ the file's business sections (steps + conditions)
  · when: static + AI review
- Do design entities match the business entities they implement, with concerns layered?
  · evidence: design vs. entity files
  · when: static
- Do all design diagrams live under `docs/diagrams/` (never `specs/design/`)?
  · evidence: diagram file locations
  · when: static

### Use-case realization  `[feature: use-case-realization]`

- Does **every in-scope use case** have a filled **`## Realization`** section in its own file
  (`specs/business/**/use-cases/{uc}.md`) — not a separate realization document?
  · evidence: `## Realization` section present per in-scope use case
  · when: static
- Does **every business step** (by #) have a realization with sufficient mechanics (page /
  interaction / operation-uri / object / rules-applied-uris / API / state / persistence) to
  implement it — with `operation` and `rules applied` as **resolvable OKF uris**, not free-text?
  · evidence: `## Realization` step entries (keyed by #) vs. the Flow; uri resolution
  · when: static + AI review

```check scope=system
# realizationCoverage (app.realizationCoverage in model.mjs): for every use case that HAS a
# ## Realization section (design pass ran), every numbered step (S1, S2, …) from ## Flow and
# every condition (step-scoped + use-case-level) must have a matching realization entry — no step
# or condition silently dropped. Structural, keyed by step # and condition title. A use case with
# no ## Realization is skipped (design not run yet — covered by the presence check above).
WHEN  $app.realizationCoverage.inScope IS "true"
THEN  $app.realizationCoverage.complete IS "true"
  ELSE "a ## Realization section drops steps/conditions the ## Flow declares — ${$app.realizationCoverage.gapCount} unrealized: ${$app.realizationCoverage.gaps}. Every numbered step and every condition must have a realization entry."
```
- Does **every condition** (step-level and use-case-level) have a realization naming the concrete
  **operation (uri)**, the expected API status, and the expected state/persistence — and, for a
  rule-rejection condition, the **rule (uri)** proven on reject?
  · evidence: `## Realization` condition entries vs. the Conditions; uri resolution
  · when: static + AI review
- Is the realization **faithful** — does it leave the actor, intent, numbered steps, and each
  condition's situation and expected result unchanged from the business sections (any needed
  behaviour change made in those sections first, through the governed change process)?
  · evidence: `## Realization` vs. the business sections of the same file
  · when: AI review
- Does every **operation/rule uri** in the realization resolve to a real concept (entity operation
  / business rule), and does every **business API operation** and **user-facing operation** trace
  to a step (no orphan endpoint/control; technical operations classified separately)?
  · evidence: uri resolution + realization API/UI mechanics ↔ steps
  · when: static + AI review
