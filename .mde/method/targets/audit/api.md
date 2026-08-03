---
type: audit-view
title: Audit — api
---

# Audit — api — COMPILED from features' `## Audit`

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

### Business-rule responses  `[feature: business-rule-responses]`

Judge whether business rules are **enforced**, not merely **displayed**. A rule shown as
helpful UI text or a doc paragraph, but that the app never actually applies, is the common
fake ("the UI says checks are ready" but proposes anyway; guidance text with no rejection).

For each business rule, drive the running app to **violate it deliberately** — submit the
disallowed input (a transfer that breaks the constraint, a review out of its window, a
duplicate, an out-of-order lifecycle step). The app must **reject** it: an error response /
blocked action / validation message, *and* the bad state must **not** persist (read back
after — it should not be there). Corroborate against the server log that the request
reached the server and was refused.

Report each rule as **enforced** (violation rejected + not persisted, server-corroborated)
or **decorative** (stated in text/spec but the violating input goes through). A rule you can
break is not enforced, however prominently it is described.

### Capability API boundary  `[feature: capability-api-boundary]`

Judge whether each endpoint **does real work end to end**, not whether a route merely exists.
A route that returns hardcoded/canned data, or handles the request without ever touching the
database, is a shell that passes shape checks while doing nothing.

For each declared operation, call the endpoint against the running app and:

- **Mutate, then verify persistence independently.** POST/PUT/DELETE, then read the record
  back via a *separate* GET (or the DB report) — the change must be there. A write the next
  read can't see never reached the data store.
- **Confirm the data path in the log.** A real request should leave route → service →
  repository / a DB query in the server log. A response with no corresponding DB activity is
  serving canned data.
- **Try an invalid call.** A bad payload / missing field should be rejected with a sane
  status, not swallowed — a route that accepts anything isn't validating.

Report each endpoint as **live** (persists + shows a DB-backed path in the log) or **hollow**
(responds but nothing persists / no DB activity). "The route responds 200" is not a pass.
