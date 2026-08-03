---
type: audit-view
title: Audit — ui-design
---

# Audit — ui-design — COMPILED from features' `## Audit`

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

### Page spec  `[feature: page-spec]`

Judge whether each page spec designs a **real, specific screen for its capability**, or is a
generic composition shell that would fit any entity. There is no running app — read the page spec
against the capability and entity it serves.

For each page spec: does `## Composition` name **concrete panels** bound to real entities/operations
(a maintenance panel for *this* entity with *its* actions — edit, transfer, deactivate — scoped to a
selected record), or generic "detail panel / list panel" with no real operations? Do its actions
map to the entity's actual operations (and does every role-permitted operation the capability needs
have a home on some page), or is the operation set a placeholder? Is `## Data Covered` the entity's
real fields (with honest declared exclusions), or a vague "shows the record"? Does the page realise
the capability's use-cases — a use-case with no page that serves it is an uncovered surface.

Report each page as **substantive** (concrete panels, real operation bindings, covers its use-cases)
or **generic** (composition present but panels/operations are placeholder / entity-agnostic). A page
spec with every section filled but no real screen behind it is not a design.
