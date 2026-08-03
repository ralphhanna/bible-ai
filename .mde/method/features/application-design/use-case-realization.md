---
type: feature
id: use-case-realization
title: Use-case realization
origin: mde
impacts:
  - application-design
default: n/a
---

# Use-case realization

## Purpose

Progressively elaborate each business use case into its concrete application realization —
without replacing or rewriting its business definition. Business analysis defined the behaviour
(numbered steps, conditions); design adds the mechanics (pages, operations, APIs, rules, state,
persistence) that realize it. The use case is **one file** developed across two layers — exactly
like an entity carries its business fields and its design `## Storage View` in one file — not two
competing sources of truth.

## Impact on application-design

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

## Template impact

- `use-case` template → a **`## Realization`** section (design facet, filled by the design pass):
  per-step mechanics keyed by step # (page / interaction / operation-uri / object / rules-applied-uris /
  API / state / persistence), and per-condition realization (operation-uri / expected API status /
  rule-uri on reject / expected state / persistence / test layers). No separate realization template
  — the section lives in the one use-case file.

## Audit

Judge whether the `## Realization` section **genuinely realizes the use case**, or is a nominal
design shell that repeats the steps without detailing how their behaviour is achieved.

For a sample of use cases: does **every business step** (by #) have mechanics a builder could
implement — a named page/operation/rule/state effect, with `operation` and `rules applied` as
**resolvable OKF uris**, not "the step is realized by the system"? Does **every condition** have a
realization naming the concrete operation (uri), the expected API status, and the expected
state/persistence — such that a test could be generated from it, with a rule-rejection condition
carrying the **rule's concept uri**? And is the realization **faithful** — the actor, intent,
steps, and each condition's situation/expected-result unchanged from the business sections (a
realization that silently alters the business behaviour, rather than updating those sections
first, is drift)? Flag any `operation`/`rule` uri that resolves to no concept (dangling reference).

Report each use case's realization as **grounded** (every step and condition mechanically
realized with resolvable uris, faithful to the business sections) or **nominal/drifted** (steps or
conditions with no mechanics, dangling uris, or mechanics that contradict the business
definition). A repeated step # with no mechanics is not realization.

## Checks

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
