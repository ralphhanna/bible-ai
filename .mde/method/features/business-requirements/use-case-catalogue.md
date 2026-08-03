---
type: feature
id: use-case-catalogue
title: Use case catalogue
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Use case catalogue

## Purpose

Capture capability-scoped use cases that drive business design, page specs, prototype behaviour,
interaction diagrams, implementation, and tests. A use case describes a coherent business
transaction, not merely an entity operation or a list of UI steps.

## Impact on business-requirements

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

## Preceded By — the capability journey, derived not stored

A capability is usually a **journey** of several use cases in sequence (request → match → approve →
activate → complete). That journey is **not** a separate `workflow.md` artifact — storing the
sequence separately would duplicate what the use cases already imply and drift from them. Instead,
each use case declares its **predecessor(s)** in a `## Preceded By` section:

- **`## Preceded By`** lists the use case(s) that must have happened before this one, each a
  reference (`{{use-case:<slug>}}`) to a use case **in the same capability**. A journey **start**
  has none (state `None`).
- The ordering fact lives with the use case that owns it — "matching comes after a request exists"
  is a precondition *of matching*, so it sits on the matching use case, not a distant file.
- It may list **several** predecessors (a use case reachable from more than one path); the journey
  is a **graph** (DAG), not only a straight line. The edges **must be acyclic** and every reference
  must **resolve** to a real use case in the capability.
- **Do not restate** the predecessor's trigger or outcome here — just reference it. The journey is
  a **derived view** (the graph of `preceded-by` edges), rendered by a viewer that walks the edges
  and shows each use case's own `## Trigger` / `## Outcome`.

## Steps and conditions

The `## Flow` lists the use case's business steps, **numbered** (S1, S2, …). The step # is the
join key the design `## Realization` section uses to attach mechanics back to each step.

A use case's important outcomes are captured as **conditions** — the behavioural spine that
design realizes and testing proves. A condition states, in business language:

- a **semantic title** — e.g. *Assignment Exceeding Capacity Is Rejected*;
- a **situation** — the relevant starting condition;
- **one precise expected result** — the required ending condition.

```text
When this situation exists, this result must happen.
```

**A condition is attached to what it is about.** Most conditions hang **inline under the step**
they exercise (in `## Flow`); conditions that are not about a single step — the **final**
transaction outcome, **authorization** at entry, **traceability** — go in a use-case-level
`## Conditions` section. A condition has **one** expected result: do not combine a valid case and
its rejection in one condition; they are separate conditions. A use case normally needs conditions
for: successful completion; important alternate outcomes; business-rule rejection; invalid or
missing information; authorization; and applicable state transitions — driven by **business
importance and risk**, not a fixed count.

These are the **business half** (situation + expected result, in business language). **Business
analysis does not create a `## Realization` section at all** — it neither fills nor scaffolds it
(no empty per-step or `(unrealized)` stubs). The **design pass** later *adds* that section to the
same file and fills it (operation uri, API status, rule uri on reject, state/persistence, test
layers) — see `use-case-realization`, the same way the Persistence Design target adds an entity's
`## Storage View`. A condition replaces separately tracked preconditions/postconditions; the use
case no longer carries standalone precondition, alternate-flow, exception, state-change-table,
design-handoff, or representative-scenario sections.

## Business transaction coherence

The trigger, flow, and outcome must be causally connected:

```text
business condition or need
→ driving business object
→ actor action or decision
→ business state change
→ need resolved, reduced, deferred, rejected, or recorded
```

The driving business object introduced by the trigger remains visible through the main flow and
outcome. When the trigger is an immediate event with no durable object, the use case states that
explicitly.

The Business Goal states the business result. Creating or updating a record is normally the
mechanism or result, not the goal itself.

## Trigger discipline

A use case has one primary triggering business condition. A trigger joined with `or` is reviewed
for accidental combination of different transactions. If the alternatives require different
starting objects, actors, decisions, flows, or outcomes, split them into separate use cases.

## Actor participation

Every supporting actor must participate in the flow by supplying information, deciding,
approving, confirming, receiving, or being notified. A named actor with no interaction is removed
or the missing interaction is added.

The primary actor must have the business authority needed to achieve the declared outcome. If
another actor must approve or confirm it, the flow and resulting status say so.

## Preconditions and entry consistency

Every object or condition required by the first substantive flow step is established by:

- the trigger;
- a precondition; or
- an explicit early retrieval or creation step.

Do not silently rely on an unstated request, demand, approval, availability view, or prior state.

## Main-flow discipline

The main flow:

- follows the primary actor's business goal;
- carries the driving object through the transaction;
- names material system decisions and validations;
- identifies when supporting actors participate;
- states the commit or business decision;
- reconciles the result and materially impacted objects.

UI control details belong in Page Spec panels/actions unless they are necessary to explain the
business transaction.

## Alternate outcomes as test conditions

An important alternate outcome (a branch that pursues the same business goal but ends
differently) is captured as its **own test condition** — situation + expected result — rather
than a separately-tracked alternate-flow section. Subsequent lifecycle operations such as
cancel, complete, reopen, or revise normally become their **own use cases** unless they are
truly branches before the original transaction completes. The per-object before/change/after
state-change *table* is design-realization mechanics, not business analysis — the business use
case states the outcome; the realization tables the mechanics.

## Rules and lifecycle consistency

Every validation, decision, eligibility test, calculation, exception, approval requirement, and
state guard in the flow resolves to:

- a business rule; or
- an entity lifecycle operation/guard.

Every lifecycle action named in the use case resolves to a valid source state, operation, permitted
actor, guard, and resulting state. Important lifecycle operations should be exercised by at least
one use case or explicitly declared administrative/system-only.

## Open-question challenge

`Open Questions: None` is accepted only after checking unresolved decisions about:

- driving and result object boundaries;
- actor authority and approval;
- quantities and fulfilment;
- relationship cardinality;
- lifecycle ownership;
- exceptions and override authority;
- cancellation/reversal impact;
- concurrency and stale information where material.

Questions discovered in the use case are mirrored into the plan's `discussion.md` through
`open-questions-tracking`.

## Template impact

- `use-case` template → the use-case business fields, object-role classification, a
  **`## Preceded By`** section (predecessor use-case refs, or `None`), a **numbered `## Flow`**
  (steps S1, S2, … with step-scoped conditions inline), and a use-case-level **`## Conditions`**
  section. The template carries **no `## Realization` section** — business analysis does not create
  or scaffold it; the design pass adds it (see `use-case-realization`).
  The template no longer carries standalone preconditions, alternate-flows, exceptions, a
  state-change table, or design-handoff notes — those become conditions or move to `## Realization`.

## Audit

Judge whether each use-case describes **the real business behaviour**, or is generic
"transaction" scaffolding that would fit any entity. There is no running app — read each
use-case's main flow against the domain it claims to capture.

The tell of a fake flow is **abstract placeholder language**: steps like "the actor starts
the transaction", "selects or supplies the driving object", "the result object is created or
updated", "impacted objects are reconciled" — filler that names no concrete field, state, or
decision. A real flow names *what actually happens*: which fields change, which status
transitions (e.g. active → inactive), what the referenced rule actually checks *at that step*
(not just a list of rule ids), what the actor sees and confirms, what is recorded. Compare
use-cases across the app: if every flow reads as the same six generic sentences with only the
entity name swapped, they are template shells.

Report each use-case as **concrete** (a builder could implement it without inventing the
behaviour) or **generic** (transaction boilerplate — sections filled, behaviour unspecified).
A use-case with all sections present but a placeholder flow is not a real requirement.

## Checks

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
