---
type: audit-view
title: Audit — business-requirements
---

# Audit — business-requirements — COMPILED from features' `## Audit`

<!-- COMPILED by compile-targets.mjs. Do not hand-edit — edit each feature's ## Audit
     section and recompile. Each ## Audit speaks in GENERAL terms (what quality looks like
     for this concern). SCOPE is applied by the CALLER at run time, not authored here: an
     audit run for a plan adds "perform these checks for this plan's scope only"; an
     app-wide run (review app) adds none. The auditor is a FRESH session — it did not build this. -->

You did not build this. Do not trust that an artifact or control *exists* — judge whether
it *behaves*, by driving the real running app (or reading the specs, for BA/design targets)
and corroborating against a witness the author does not control (the app's own request/write
log, a read-back after a mutation, the spec's own content).

## How to report — every finding must be actionable

Do not write a vague narrative. For **each concern** you audit, produce one row:

| field | what it must contain |
|---|---|
| **concern** | the specific artifact/control/operation judged (name it: `client.create`, "Employee Directory save button", "review-period-constraint") — never "the API" or "the UI" in general |
| **verdict** | **genuine** · **fake** · **not-exercised** (you could not drive it — say why) |
| **witness** | the concrete evidence you observed: a server-log line, a read-back result after a mutation, the missing route/operation, the placeholder text quoted. A verdict with no witness is not a finding |
| **severity** | **high** (core substance is fake — a mutating action that never persists, a rule not enforced) · **medium** · **low** |
| **fix** | the concrete next action to make it genuine (name the file + what to change) — so the finding is directly actionable in a repair plan |

End with a **summary**: counts (**N genuine · M fake · K not-exercised**), and the **fakes ranked
most-severe first** with their fix. A `fake` on an in-scope artifact is a real defect — state it
plainly; do not soften it to "could be improved". "It exists / it responded 200 / the section is
filled" is never a genuine verdict on its own.

### Business rule catalogue  `[feature: business-rule-catalogue]`

Judge whether each rule states a **real, enforceable constraint**, or is a named shell with an
empty or vague statement. Read each rule's `## Statement` and `## Constraint / Decision /
Calculation`.

A real rule specifies a testable condition: *what* is constrained, *when*, and *what makes it
pass or fail* — "a staff member may not have overlapping active assignments to the same project
in the same period", "exactly one of employee/contractor". A fake rule is a plausible title over
an empty statement, a restatement of the title, or an abstract "the constraint applies" with no
condition a builder could implement or a test could violate. Check the rule is **grounded**: it
names the entities/fields it governs, a use-case actually invokes it at a concrete step, and at
least one **use-case test condition proves it** (a rule no flow applies is an **orphan**; a rule
no condition proves is **unproven**).

Report each rule as **enforceable** (a specific, testable constraint, invoked by a use-case step
and proven by a use-case test condition) or **nominal** (named but its statement is
empty/vague/circular, or an orphan/unproven rule with no governing use case or condition). A rule
whose rejection no use-case test condition could prove is not a real, governed rule.

### Capability definition  `[feature: capability-definition]`

Judge whether each capability spec says something **real and specific about this business**,
not generic boilerplate that would fit any app. Unlike UI/server audits, there is no running
app to drive — read the spec against the business intent it claims to capture.

For each capability: does it define concrete, non-obvious behaviour (real operations,
constraints, and decisions a builder could implement unambiguously), or is it filler — a
template with every section present but the content vague ("manages records", "supports the
business")? Cross-check that its use cases, rules, and entities actually cohere: a capability
whose stated purpose is not reflected in any of its operations or rules is a shell. Watch for
copy-paste sameness across capabilities (the tell of generation optimising for "all sections
filled" over meaning).

Report each capability as **substantive** (specific, coherent, implementable) or **generic**
(sections present but hollow / boilerplate / internally inconsistent). A complete-looking
template is not a substantive requirement.

### Entity model  `[feature: entity-model]`

Judge whether each entity models a **real business thing with real attributes**, or is a
hollow record with vague, generic properties. Read the entity spec against the domain.

For each entity: are its `## Properties` concrete business attributes (named fields with a
clear type and meaning — `employmentStatus`, `startDate`, `allocationPercentage`), or filler
(`name`, `description`, `status` with no domain specificity that would fit any entity)? Do its
`## Lifecycle / Status Values` list real states with real meaning (proposed/approved/active/
completed), or a generic active/inactive stub? Do its `## Operations` name real, entity-specific
actions with roles and scope — or a boilerplate CRUD list? And does the entity **cohere** — do
its properties, states, operations, and the rules that govern it actually fit one business
concept, or is it a bag of generic fields?

Report each entity as **substantive** (concrete attributes, real states, coherent) or **hollow**
(generic properties / stub lifecycle / boilerplate operations). A complete-looking entity
template with vague fields is not a real domain model.

### Entity operations and access control  `[feature: entity-operations-and-access]`

Judge whether each entity's operations are **real, entity-specific actions with meaningful
access**, or a generic CRUD list with placeholder roles. Read the entity's `## Operations` table.

Real operations name domain actions beyond bare CRUD where the business has them
(`employee.transfer`, `assignment.approve`, `review.acknowledge`), each with a *specific* role
set and scope that reflect who may really do it and over which records — not "any role, any
scope" on every row. A fake operations table is create/read/update/delete with no lifecycle
actions the domain clearly needs, or every operation permitting the same roles with an
undifferentiated "any" scope. Cross-check against the entity's lifecycle and rules: a status the
entity declares but no operation transitions is a gap; an operation the use-cases never invoke is
an orphan.

Report the operations as **modelled** (domain-specific actions, differentiated roles/scope,
consistent with lifecycle and use-cases) or **boilerplate** (generic CRUD, undifferentiated
access). A full CRUD table is not a substantive operation model if the domain's real actions and
access rules are absent.

### Use case catalogue  `[feature: use-case-catalogue]`

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
