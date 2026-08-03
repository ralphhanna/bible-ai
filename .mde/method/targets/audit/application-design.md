---
type: audit-view
title: Audit — application-design
---

# Audit — application-design — COMPILED from features' `## Audit`

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

### Traceability to business specs  `[feature: traceability-to-business-specs]`

Judge whether the design **actually derives from the business specs** — not just that a
"traceable to X" line was written. Read the design artifacts against the BA they claim to
implement, looking for real correspondence, drift, and gaps.

For a sample of design artifacts (entities, pages, decisions): does each reflect a *specific*
business entity/use-case/rule, with matching names, fields, and behaviour — or is the trace a
nominal citation to a spec the design doesn't actually mirror (a design entity missing fields
the business entity declares; a page whose operations don't match the capability's; a decision
citing a requirement it doesn't address)? Conversely, is any in-scope business concept **absent**
from the design (a use case with no page, an entity with no design counterpart)? And is business
logic correctly *placed* — not smuggled into the UI or persistence layer.

Report the design as **grounded** (each artifact genuinely mirrors its business source, no
in-scope concept missing) or **drifted** (name the artifacts whose trace is nominal, the missing
concepts, or the mislayered logic). A "traces to …" annotation is not traceability if the design
doesn't match what it cites.

### Use-case realization  `[feature: use-case-realization]`

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
