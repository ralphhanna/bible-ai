---
type: target
id: TARGET-BUSINESS-REQUIREMENTS
title: Business Requirements Target Profile
applies_when:
  - a plan performs business analysis
  - a plan defines or refines requirements
  - a plan defines capabilities, business rules, actors, entities, or use cases
  - a plan imports or reconciles upstream/Business Specs
---

# Business Requirements Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Business requirements describe what the business needs and how the application should support those needs at a business level.

They should be clear enough to drive design, page specs, use cases, business rules, prototypes, implementation plans, and tests.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| capability-overview | specs/business/capabilities/{cap}/overview.md | business-capability | always |
| entity-spec | specs/business/entities/{entity}.md | entity | always |
| use-case-spec | specs/business/capabilities/{cap}/use-cases/{uc}.md | use-case | always |
| business-rule-spec | specs/business/capabilities/{cap}/business-rules/{rule}.md | business-rule | always |
| role-spec | specs/business/roles/{role}.md | role | always |
| business-overview | specs/business/business-overview.md | — | always |
| glossary | specs/business/glossary.md | — | always |

`discussion.md` is not listed here — business questions live in the plan's own `plans/<plan-id>/discussion.md`, the core plan artifact every plan already keeps (`rules/core/02-artifact-model.rules.md`), not a separate business-requirements output.

## Composed behavior

### Actor and role model  `[feature: actor-and-role-model]`

Each actor/role defines:

- name and stable role id;
- business responsibility;
- business goals and outcomes owned;
- capabilities and use cases used;
- decisions, approvals, confirmations, or information supplied;
- key permissions and constraints at the business level;
- scope of responsibility where relevant.

Roles stay **shared** at the top level (`specs/business/roles/<role-slug>.md`), one file per role,
never duplicated inside a capability. Role ids are the join key entity operations and use cases
reference.

### Business rule catalogue  `[feature: business-rule-catalogue]`

Each rule defines:

- rule ID;
- statement;
- owning/primary capability;
- affected entities;
- trigger or context;
- constraint, decision, calculation, eligibility, or lifecycle guard;
- inputs and governed values where relevant;
- exceptions and who may authorize them;
- resulting effect;
- testability note.

Cross-capability rules live at `specs/business/rules/<slug>.md`; capability-owned rules under
`capabilities/<slug>/business-rules/<slug>.md`. One file per rule. Access control is **not** a
business rule — it is an attribute of the entity operation (see
`entity-operations-and-access`).

### Business scope  `[feature: business-scope]`

Business analysis identifies: business problem/opportunity, business goals, in-scope and
out-of-scope areas, assumptions, constraints, stakeholders/actors, and open questions.
Written to `specs/business/business-overview.md` (scope/goals/assumptions/constraints) with
open + resolved questions in the plan's `discussion.md` (see `open-questions-tracking`).

### Business transaction analysis  `[feature: business-transaction-analysis]`

For every non-trivial use case, analyze and reconcile:

- **Business condition / need** — the real situation that causes the transaction.
- **Driving object** — the request, demand, case, order, application, review, work item, or other
  business object that represents and carries that need through the flow.
- **Result object** — the record created or changed to achieve the goal.
- **Supporting objects** — records selected, consulted, or validated.
- **Impacted objects** — records, balances, totals, availability, or lifecycle states materially
  changed by the transaction.
- **Business state change** — the before/change/after effect for the driving, result, and impacted
  objects.
- **Outcome reconciliation** — how the original business condition is resolved, partially
  resolved, deferred, rejected, or remains open.

The use case's trigger, preconditions, main flow, alternate flows, rules, objects, data changes,
and outcome must tell one causally connected story. A trigger naming one business need followed by
an unconstrained flow over unrelated records is a defect.

### Capability definition  `[feature: capability-definition]`

Each capability defines: capability ID, name, business purpose, primary actors, business
outcomes, primary entity (when applicable), related entities/rules/use-cases/pages, related
APIs or integration boundaries when relevant, and implementation/design status. A capability
may use many entities but identifies a **primary** entity when that helps define boundaries.
One file per capability under `specs/business/capabilities/<slug>/overview.md` — never a flat
`capabilities.md`.

### Entity model  `[feature: entity-model]`

Each entity defines:

- purpose,
- capabilities that use it,
- properties,
- aspects,
- lifecycle/status values where relevant,
- operations and access scope,
- business rules,
- open questions.

Entities stay independent and shared. A capability may identify a primary entity, but that does not mean the capability owns the entity exclusively.

### Entity operations and access control  `[feature: entity-operations-and-access]`

Each operation carries: an **id** `<entity>.<op>` (the join key), a **kind**
(`crud | lifecycle | use-case`), the **roles permitted** (ids from `specs/business/roles/`),
and a **scope** — an inline prose row-predicate ("the acting user", "employees who report to
the acting user", "any") that the AI resolves to a filter. There is **no `access-policy.md`**
and no `kind: access` rule; a role's cross-capability permissions are a derived rollup, never
hand-authored.

### ERD diagram (logical)  `[feature: erd-diagram]`

When business analysis defines or refines the entity model, produce the logical ERD as
**Graphviz DOT** in `docs/diagrams/erd.dot` and render it to `docs/diagrams/erd.svg`; the
`docs/diagrams/erd.md` page embeds the SVG. Nodes are bare entities (no columns); every
relationship carries explicit cardinality + a short verb label.

**Use these exact layout settings so crossings are actually minimized** (do not substitute —
`splines=true` curves edges freely and tangles them):

```text
graph [rankdir=LR, splines=ortho, concentrate=true, nodesep=0.6, ranksep=1.0, overlap=false];
```

- **`splines=ortho`** — right-angle edge routing that avoids nodes (the crossing-reducer). Never
  `splines=true`.
- **`concentrate=true`** — merges duplicate/parallel edges between the same two nodes into one
  (e.g. an entity that both *authors* and *receives* another — draw **one** edge, label it once,
  not two parallel edges that overlap).
- **Cluster by capability** (`subgraph cluster_<cap>`).
- **A hub entity forces a split.** When one entity (typically the central actor, e.g.
  `Employee`) connects to entities in **two or more other capabilities**, a single combined ERD
  cannot avoid long crossing edges — clustering alone will not fix it. In that case **do not
  emit one combined diagram**: produce **one ERD per capability** (`erd-<capability>.dot/.svg`),
  each showing that capability's entities and their relationships, with the hub repeated in each
  as a boundary node. A combined overview ERD is acceptable only when no entity bridges 3+
  clusters. Splitting is the rule, not a fallback — a tangled all-in-one ERD is a defect.
- **`concentrate=true` merges parallel edges but can orphan the second label** — when two
  relationships connect the same pair (e.g. *authors* / *receives*), prefer a **single edge with
  a combined label** ("authors / receives") over two edges, so no label floats without a line.

Graphviz lays out the graph from these settings; do **not** hand-place or rely on a text
renderer's auto-layout. `erd.dot` is the authored source of truth; `erd.svg` is generated from
it with:

```text
node .mde/method/scripts/render-diagram.mjs docs/diagrams/erd.dot docs/diagrams/erd.svg
```

Every entity and relationship traces to a `specs/business/entities/<slug>.md`. This is the same
diagram design later refines — BA produces it; design does not start a new one. Lives under
`docs/diagrams/`, never `specs/`.

**ERD reading — the diagram in plain English, as SEPARATE statements.** Below the embedded SVG,
`docs/diagrams/erd.md` carries a **`## Reading` section**: a **bulleted list of standalone
natural-language sentences**, one per relationship — NOT text mingled inside the diagram (the DOT
edges keep only their short verb label; the full sentences live in this separate list). A business
reader who does not read crow's-foot notation verifies the model by reading the sentences. Each
sentence is the relationship's **verb label + cardinality quantifier**, in both directions where
useful:

- "Every **Employee** fills exactly one **Position**."
- "A **Position** is filled by zero or more **Employees**."
- "An **Employee** holds zero or more **Skills**; each **Skill** is held by zero or more **Employees**."

The quantifier words come from the relationship's cardinality (`exactly one`, `zero or more`,
`at least one`, `one or more`), the verb from its label — **the same relationship data the
diagram is drawn from**, so the reading and the diagram cannot drift. It is a *derived view*,
generated from the entities' relationships, never hand-authored independently. The reading is a
readable companion, not a new source of truth: if a sentence reads wrong ("a Position fills many
Employees"), the model — not the sentence — is wrong.

**Every relationship must carry a real ROLE NAME (a meaningful verb phrase), in the diagram and
the reading.** The role name is the labeled end of the relationship — the word that makes the
sentence say something: *fills*, *reports to*, *is assigned to*, *belongs to*, *manages*,
*holds*. A generic, contentless label — **`has`, `relates to`, `associated with`, `links to`,
or a bare foreign-key name** — is a defect: "Employee **has** Position" states nothing a reader
can check. Both directions should read naturally where the inverse is meaningful (forward: "fills";
inverse: "is filled by"). A relationship without a real role name is an under-specified model, not
just a cosmetic label gap — the ERD's edges and the reading's sentences both require it.

### Business glossary  `[feature: glossary]`

Business analysis writes a glossary at `specs/business/glossary.md` — an alphabetical list of
**domain terms**, each with:

- **term** — the canonical name (the one the specs and semantic tags use);
- **definition** — plain-language business meaning, not a technical/implementation description;
- **synonyms / also-known-as** — other names the business uses for the same thing;
- **not to be confused with** — near-terms that are genuinely different (where ambiguity exists);
- optionally, a **link to the MDE object** it corresponds to when the term *is* a modelled object
  (an entity, role, capability, use case) — so the glossary and the model agree.

Scope and discipline:

- Cover the terms that carry **business meaning** — domain nouns, roles, statuses, key processes —
  not generic English and not implementation jargon.
- A term that is a modelled object (entity/role/capability) is defined **once** as business
  meaning; the glossary entry references the object rather than restating its full spec (no
  duplication — the entity spec remains the source of truth for that entity's detail).
- Definitions are business-first: if a term needs a system/technical note, that is secondary to
  its business meaning.
- New terms discovered later (in design, use cases, prototypes) are added back to the glossary so
  it stays the single vocabulary source.

### Governed values from specs  `[feature: governed-values-from-specs]`

The governed vocabularies are defined upstream in business specs (entities, roles, rules); this
capability consumes them.

### Open questions tracking  `[feature: open-questions-tracking]`

Open and resolved business questions are tracked explicitly in the originating plan's
**`plans/<plan-id>/discussion.md`** (the same curated, two-way reasoning trail every plan already
keeps — see `rules/core/02-artifact-model.rules.md`), and surfaced rather than silently assumed.
Missing or deferred sections are marked explicitly instead of pretended complete.

There is no separate durable, cross-plan discussion log. A business question belongs to the plan
that raised it; if it is still open when that plan closes, a later plan that touches the same
ground re-raises it in its own `discussion.md` — it is not carried forward automatically.

### Semantic references in generated text  `[feature: semantic-references]`

When generating business specs, **tag every concept** it names with `{{kind:slug}}` **at every
mention**. This is strongest inside a use case's **`## Flow` steps and `## Conditions`**, where the
concepts acted on, the actor, and the rule proven appear in narrative prose — a step "the manager
reviews goals, feedback, and assignment context" must be "the {{role:people-manager}} reviews
{{entity:performance-goal}}, {{entity:feedback}}, and {{entity:project-assignment}} context". A
named concept left as bare prose is drift — it is where the AI drifts the name or invents an
unmodeled one. Do not fabricate a tag for a concept that does not exist; a needed-but-uncatalogued
name is a missing concept to raise, not an untagged word.

### State-transition diagram  `[feature: state-transition-diagram]`

When business analysis defines or refines the entity model and an **in-scope entity declares a
status/lifecycle with transitions** (e.g. a review moving `draft → submitted → acknowledged`, an
assignment `proposed → approved → cancelled`), produce a state-transition diagram as a Mermaid
`stateDiagram-v2` in `docs/diagrams/state-<entity-slug>.md` (under `## <Entity> Lifecycle`), one
diagram per such entity. Each **state** is a value from that entity's status set; each
**transition edge** is a lifecycle-transition operation the entity declares (labelled with the
operation, e.g. `submit`, `approve`, `cancel`), and where the operation is guarded or
role-restricted the edge notes that. This is triggered by the **entity's lifecycle**, not by
whether UI is in scope. Entities with no lifecycle (no status set / no transition operations) get
**no** diagram — this artifact is required only where the lifecycle exists. Every state and
transition traces to `specs/business/entities/<slug>.md`. Lives under `docs/diagrams/`, never
`specs/`.

### Use case catalogue  `[feature: use-case-catalogue]`

Each use case is **capability-scoped** and defines, in business language:

- use case ID / short name;
- capability;
- business goal;
- primary actor and participating supporting actors;
- one primary trigger;
- **preceded-by** — the use case(s) that must precede this one in the capability journey (see
  below), or none if it is a journey start;
- high-level main business flow (business steps, not UI/API mechanics);
- business rules used;
- business objects classified as driving, result, supporting, and impacted;
- resulting business state and outcome;
- **test conditions** — the outcomes that must be proven (see below);
- open questions.

Business analysis defines the **behaviour**; design (the use-case realization) adds the
**mechanics**. Application mechanics — pages, API paths, HTTP statuses, classes, tables,
source functions, per-step state-change tables, and design-handoff notes — do **not** belong
in the business use case. Important situations and outcomes are captured as **test conditions**;
their mechanical realization is added in design, not here.

One file per use case under
`specs/business/capabilities/<slug>/use-cases/<slug>.md`.

### Use Case / Actor diagram  `[feature: usecase-actor-diagram]`

When business analysis defines or refines actors, roles, or use cases, produce a Use Case /
Actor diagram as a Mermaid diagram in `docs/diagrams/use-cases.md` (under `## Use Cases &
Actors`): every primary **actor/role** appears as a node, every **use case** from the catalogue
appears as a node, and each actor is linked to the use cases it performs. Where the catalogue
records `include`/`extend` relationships between use cases, show them with a labelled edge.
Group by capability and lay out to avoid crossing lines (split per-capability if large). Every
actor traces to the actor/role model (`actor-and-role-model`) and every use case traces to a
`specs/business/capabilities/<slug>/use-cases/<slug>.md`. Lives under `docs/diagrams/`, never
`specs/`.

## Validation checks

### Actor and role model  `[feature: actor-and-role-model]`

- Does each role define responsibility, goals, capabilities used, business-level
  permissions/constraints, and material approvals/decisions?
  · evidence: `specs/business/roles/<role-slug>.md`
  · when: static
- Are roles shared at the top level and not duplicated inside capabilities?
  · evidence: roles directory layout
  · when: static
- Does every actor named in a use case participate explicitly in the flow, approval,
  confirmation, notification, or decision?
  · evidence: use-case actor list vs. main/alternate flows
  · when: static + AI review
- Does the primary actor have authority to achieve the stated outcome, or is the required handoff
  and intermediate state explicit?
  · evidence: role responsibility + use-case flow/outcome
  · when: AI review

### Business rule catalogue  `[feature: business-rule-catalogue]`

- Does each rule have a statement, owning capability, affected entities, trigger, the
  constraint/decision/calculation/guard, exceptions and authority, resulting effect, and a
  testability note?
  · evidence: rule files under `specs/business/rules/` or
    `capabilities/<slug>/business-rules/`
  · when: static

```check scope=plan
# Every cataloged business rule must be a REAL, filled-in spec — a real id: (not a
# <placeholder>) and every required section present and non-placeholder. $rule.specComplete
# is decided model-side (ruleSpecGaps); $rule.missingSections names what's absent so the
# finding is specific. (Replaces the hardcoded validateBusinessRules id/sections check.)
EVERY $rule IN $plan.expectedBusinessRules
THEN  $rule.specComplete IS "true"
  ELSE "business rule '${$rule.rule}' is an unfilled catalogue entry — missing/placeholder: ${$rule.missingSections}; fill its id and required sections"
```
- Are rules associated with a capability/entity rather than orphaned?
  · evidence: rule frontmatter / links
  · when: static
- Does every material validation, decision, eligibility test, calculation, exception, approval,
  and lifecycle guard in use-case flows resolve to a rule or entity lifecycle guard?
  · evidence: use cases vs. rule catalogue / entity lifecycle
  · when: static + AI review
- Is every business rule **governed by a use case** (invoked by a use-case step) and **proven by
  a use-case test condition** — no orphan rule (no use-case step) and no unproven rule (no
  related test condition)?
  · evidence: rule ↔ use-case step references + the use case's Test Conditions
  · when: static + AI review
- Where fulfilment is quantified, are requested, fulfilled, remaining, partial, overage, and
  reversal semantics defined and testable?
  · evidence: use case + rule files + entity properties
  · when: AI review

### Business scope  `[feature: business-scope]`

- Are business problem, goals, in/out-of-scope, assumptions, constraints, stakeholders, and
  open questions all identified (missing/deferred marked explicitly, not pretended complete)?
  · evidence: `specs/business/business-overview.md` + `plans/<plan-id>/discussion.md`
  · when: static

### Business transaction analysis  `[feature: business-transaction-analysis]`

- Does the main flow preserve the business condition named by the trigger and explicitly resolve,
  reduce, defer, reject, or record it in the outcome?
  · evidence: trigger + main flow + outcome
  · when: AI review
- Is the driving business object identified and carried through the transaction, or is its absence
  explicitly justified because the trigger is an immediate event with no durable business object?
  · evidence: use-case object roles + entity model
  · when: AI review
- Is the business goal expressed as a business outcome rather than only a record create/update or
  status-change operation?
  · evidence: Business Goal vs. Data Created / Changed / Viewed
  · when: AI review
- Are result, supporting, and materially impacted objects identified, with their resulting states
  reconciled?
  · evidence: object roles + state-change table + outcome
  · when: AI review
- Do durable concepts implied by needs, quantities, history, and lifecycle resolve to entities, or
  have a documented reason not to?
  · evidence: use-case wording vs. entity model + open questions
  · when: AI review
- Where fulfilment is quantified, are requested, fulfilled, remaining, multiplicity, and reversal
  semantics defined?
  · evidence: use case + rules + entity properties
  · when: AI review
- Does each complex or quantified transaction surface its important situations as **test
  conditions** (situation + one expected business result) that agree with the use case, entity
  cardinalities, lifecycle, and business rules — rather than forcing executable examples or
  per-step state tables into the business use case?
  · evidence: use-case Test Conditions section
  · when: static + AI review

### Capability definition  `[feature: capability-definition]`

- Does each capability define purpose, primary actors, outcomes, and (when applicable) a
  primary entity, with related entities/rules/use-cases/pages linked?
  · evidence: `specs/business/capabilities/<slug>/overview.md`
  · when: static
- Are capabilities specific (not missing or too generic), each with a business outcome?
  · evidence: capability overview files
  · when: static

### Entity model  `[feature: entity-model]`

- Does each entity define purpose, properties, aspects, lifecycle/status where relevant, operations, and open questions?
  · evidence: `specs/business/entities/<entity-slug>.md`
  · when: static

- Are attributes and relationships expressed as properties with `kind = attribute | relationship`?
  · evidence: `## Properties`
  · when: static

- Is the display label expressed as a property role rather than a duplicated section?
  · evidence: `## Properties` role column
  · when: static

- Are all code/number properties (e.g. `*Code`, `*No`, `*Number`, `*Id`-style codes) ones the
  **business actually uses** — quoted by people, keyed on by an external system/import, or named
  by a business rule — with that basis recorded in notes/source? No fabricated code/number
  attribute is present just to manufacture a key or look "enterprisey." The business layer models
  no "key"; where the business has no natural code, the entity has **none** — identity is the
  surrogate-key aspect + display-label.
  · evidence: `## Properties` code/number rows vs. notes/source basis, business rules, open questions
  · when: static

- Are system IDs, UUIDs, version fields, and audit metadata kept out of Properties and represented as Aspects / Storage View details?
  · evidence: `## Properties`, `## Aspects`, `## Storage View`
  · when: static

- Does each entity have a display label for user presentation, distinct from raw technical id?
  · evidence: property role `display-label`
  · when: static

- Is the entity single-sourced in `specs/business/entities/` and not duplicated inside capability folders or `specs/design/entities/`?
  · evidence: repository layout
  · when: static

- Do relationship properties define business cardinality, participation, and role names where material, and are relationship entities used when the relationship has its own lifecycle, quantities, identity, or history?
  · evidence: entity relationship properties vs. use cases and rules
  · when: static + AI review

- Do durable concepts implied by use-case triggers, quantities, state changes, and outcomes resolve to entities or have an explicit reason not to?
  · evidence: use-case object roles and state-change tables vs. entity catalogue
  · when: AI review

- Does every aspect an entity declares in `## Aspects` resolve to a **known aspect** — one
  a feature owns (in `aspects-catalogue.json`)? An unrecognized aspect (a typo, or a concept
  no feature implements) is silently ineffective, so it is a defect.
  · evidence: entity `## Aspects` vs. `targets/aspects-catalogue.json`
  · when: static

```check scope=item target=business-requirements
# Aspect validity: an entity may only declare aspects that a FEATURE OWNS. The known set
# is aspects-catalogue.json (compiled from features' `aspects:` declarations); $item.aspectsValid
# / $item.unknownAspects are decided model-side against it. An unknown aspect does nothing
# downstream (no feature realizes it) — catching it here stops silent no-ops (a typo like
# "audit-traill", or a concept the app expects but no feature implements).
WHEN  $item.path MATCHES "specs/business/entities/[^/]+\.md$"
THEN  $item.aspectsValid IS "true"
  ELSE "entity declares unknown aspect(s): ${$item.unknownAspects} — not owned by any feature (see aspects-catalogue.json). Use a known aspect, fix the typo, or add a feature that owns this aspect."
```

### Entity operations and access control  `[feature: entity-operations-and-access]`

- Does each owned entity declare `## Operations` (Create/Update, Read as List + Read-one,
  Search/Delete present-or-reasoned, plus lifecycle + use-case actions), each with permitted
  roles + a resolvable scope predicate?
  · evidence: entity `## Operations` sections
  · when: static
- Is access modeled only on operations (no `access-policy.md`, no `kind: access` rule)?
  · evidence: absence of access-policy artifacts
  · when: static

```check scope=plan subject="Entity Operations" whenFailed="designed entities declare no operations" whenPassed="designed entities declare their operations"
# designEntities = every entity spec this plan produced.
# hasOperations = the spec's ## Operations lists at least one operation.
# This check (design stage): a designed entity must enumerate its operations — the
#   authoritative set every downstream coverage check (API, tests, ACL) depends on.
EVERY $ent IN $plan.designEntities
THEN  $ent.hasOperations IS "true"
  ELSE "entity spec declares no ## Operations — the operation set is undefined; API/test/ACL coverage cannot be verified against it; see ref"
```

```check scope=plan subject="Access Design" whenFailed="entities have operations with no permitted roles defined" whenPassed="entities define permitted roles for all operations"
# allOperationsHaveRoles = every operation in the spec lists ≥1 permitted role
#   (operationsMissingRoles names any that don't).
# This check (design stage): access is defined AT DESIGN TIME — every operation states
#   who may perform it. Without this the implementation ACL check has no roles to
#   enforce; "no permission check" at code gen is really an undefined design here.
EVERY $ent IN $plan.designEntities WHERE $ent.hasOperations IS "true"
THEN  $ent.allOperationsHaveRoles IS "true"
  ELSE "entity has operations with no permitted roles defined — access is undefined in the design (see operationsMissingRoles); the implementation cannot enforce what the design didn't specify; see ref"
```

<!-- designOpCoverage (app.designOpCoverage in model.mjs): every operation an ENTITY declares
     (specs/business/entities/*.md ## Operations) must be REALIZED by a use case — referenced by
     an `operation:` uri in some use case's ## Realization section. The coverage denominator is the
     use-case realization, NOT a restated API table in the capability overview (code-first: the
     HTTP contract is the generated openapi.yaml, access lives on the entity operation). An op no
     realization names is orphaned; an op a realization names that no entity declares has drifted
     from the BA. scope=system: entity operations are a whole-app set, so this runs at
     `mde review app`, not per-plan. Vacuous until realizations exist (inScope guards it). -->
```check scope=system
WHEN  $app.designOpCoverage.inScope IS "true"
THEN  $app.designOpCoverage.complete IS "true"
  ELSE "design does not realize every declared entity operation — ${$app.designOpCoverage.missingCount} of ${$app.designOpCoverage.entityOpCount} entity operations are referenced by no use-case ## Realization (missing: ${$app.designOpCoverage.missing}). Every operation an entity declares must be realized by a use case (or removed if the domain never uses it); a design that realizes a subset has silently narrowed the BA."
```

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

### Business glossary  `[feature: glossary]`

- Does `specs/business/glossary.md` exist with the domain terms defined in **plain business
  language** (term + definition, synonyms/disambiguation where useful) — covering the meaningful
  domain vocabulary, not generic words or implementation jargon?
  · evidence: `specs/business/glossary.md`
  · when: static
- Are modelled-object terms (entities, roles, capabilities, use cases) present in the glossary and
  consistent with their specs — defined once, referencing the object rather than duplicating its
  full spec?
  · evidence: glossary terms vs. `specs/business/` entities/roles/capabilities
  · when: static

### Governed values from specs  `[feature: governed-values-from-specs]`

- Do the page's governed values (roles/statuses/enums/departments) all resolve to values
  defined in business specs (not invented)?
  · evidence: page/dataset values vs. business-spec vocabularies
  · when: static

### Open questions tracking  `[feature: open-questions-tracking]`

- Are important assumptions and open questions recorded in the plan's `discussion.md` rather than
  hidden?
  · evidence: `plans/<plan-id>/discussion.md`
  · when: static
- Are missing/deferred sections marked explicitly rather than pretended complete?
  · evidence: spec files' deferred markers
  · when: static
- Does every artifact `## Open Questions` row have a matching discussion entry with the same
  status and a back-reference, and vice versa?
  · evidence: artifact open-question rows vs. discussion entries
  · when: static
- Before accepting `Open Questions: None`, was the artifact challenged for material ambiguity in
  actors, object boundaries, cardinality, quantities, lifecycle, exceptions, reconciliation, and
  scope?
  · evidence: artifact content + review evidence / resolved discussion entries
  · when: AI review

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

### State-transition diagram  `[feature: state-transition-diagram]`

- For each in-scope entity that declares a status/lifecycle with transitions, is there a
  state-transition diagram in `docs/diagrams/state-<entity-slug>.md` whose states trace to that
  entity's status set and whose transitions trace to its lifecycle-transition operations?
  · evidence: `docs/diagrams/state-<entity-slug>.md` vs. the entity's `## Operations` / status set
  · when: static
- Are entities **without** a lifecycle correctly given no state diagram (the artifact is
  required only where a lifecycle exists, not one per entity), and is it produced regardless of
  whether UI is in scope?
  · evidence: the set of state diagrams vs. the set of entities with status/transition operations
  · when: static

### Use case catalogue  `[feature: use-case-catalogue]`

- Is each use case capability-scoped, with business goal, actor(s), one primary trigger, a
  **numbered `## Flow`**, rules, object roles, outcome, **conditions**, and open questions —
  expressed in business language, without pages/API/HTTP/table mechanics (those belong in
  `## Realization`)?
  · evidence: use-case files under `capabilities/<slug>/use-cases/`
  · when: static + AI review
- Does every use case define **conditions**, each with a semantic title, a situation, and exactly
  **one** precise expected result — and does every important outcome (success, key alternates,
  business-rule rejection, invalid input, authorization, state transitions) have a condition,
  without combining opposite outcomes in one condition?
  · evidence: step-scoped conditions inline in `## Flow` + use-case-level `## Conditions`
  · when: static + AI review
- Is each condition attached to exactly one node — a numbered step (inline in `## Flow`) or the
  use case (`## Conditions`) — within one use case (no floating or duplicated conditions)?
  · evidence: condition placement under a step # or the use-case Conditions section
  · when: static
- Does each use case declare **`## Preceded By`** — the use case(s) that precede it (or `None` for
  a journey start) — with every reference resolving to a real use case **in the same capability**,
  the edges **acyclic**, and no restated predecessor trigger/outcome (reference only)?
  · evidence: `## Preceded By` refs resolve within the capability; the preceded-by graph is a DAG
  · when: static + AI review

```check scope=system
# precededBy (app.precededBy in model.mjs): the capability journey is the graph of `## Preceded
# By` edges across use cases. Mechanical gate: every predecessor ref RESOLVES to a real use case
# in the SAME capability, and the graph is ACYCLIC. A dangling ref (predecessor missing / in
# another capability) or a cycle (a journey that loops) is a modeling error the AI shouldn't have
# to catch. Vacuous until use cases exist (inScope guards it).
WHEN  $app.precededBy.inScope IS "true"
THEN  $app.precededBy.ok IS "true"
  ELSE "the preceded-by journey graph is broken — ${$app.precededBy.danglingCount} dangling predecessor ref(s) (${$app.precededBy.dangling}) and ${$app.precededBy.cycleCount} cycle(s) (${$app.precededBy.cycles}); every ## Preceded By ref must resolve to a use case in the same capability and the edges must be acyclic."
```
- Is every use case associated with a capability rather than left unscoped?
  · evidence: use-case location / frontmatter
  · when: static
- Does the main flow begin from the business condition and driving object established by the
  trigger/preconditions, and does the outcome reconcile that condition?
  · evidence: Trigger + Preconditions + Main Business Flow + Outcome
  · when: AI review
- Is the Business Goal a business result rather than merely `create/update/delete/change status`
  on a record?
  · evidence: Business Goal vs. Data Created / Changed / Viewed
  · when: AI review
- Does every supporting actor have an explicit participation in a flow, approval, confirmation,
  notification, or decision?
  · evidence: actor list vs. flows
  · when: static + AI review
- Does each alternate flow branch from the same transaction rather than introduce an unrelated
  or later lifecycle goal?
  · evidence: alternate-flow branch references + outcomes
  · when: AI review
- Do lifecycle actions and business decisions resolve to declared entity operations and business
  rules?
  · evidence: use case vs. entity Operations / Lifecycle and rule files
  · when: static + AI review
- Are application mechanics (pages, API paths, HTTP statuses, tables, per-step state-change
  tables, design-handoff notes) **absent** from the business use case — deferred to the design
  realization rather than stated here?
  · evidence: use-case body vs. the mechanics that belong in design
  · when: AI review

### Use Case / Actor diagram  `[feature: usecase-actor-diagram]`

- When actors/roles or use cases are in scope, is there a Use Case / Actor diagram in
  `docs/diagrams/use-cases.md` showing each primary actor, each catalogued use case, the
  actor→use-case links (and include/extend where recorded), each node tracing to its
  actor/role model or use-case file, laid out to avoid crossing lines?
  · evidence: `docs/diagrams/use-cases.md`
  · when: static
- Does the diagram cover **every** in-scope use case and actor (none dropped) and introduce no
  use case or actor absent from the BA text?
  · evidence: diagram nodes vs. use-case files + actor/role model
  · when: static
