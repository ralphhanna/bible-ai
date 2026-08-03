---
type: audit-view
title: Audit — server
---

# Audit — server — COMPILED from features' `## Audit`

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

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

Judge whether the server slice **does real work end to end** — route → service → repository →
database — not whether the files merely exist. Drive the running app and inspect its own log.

For each capability's operations: call the endpoint, then verify the effect **independently** —
a mutation (POST/PUT/PATCH/DELETE) must be visible via a separate read (GET or the db-report),
and the run's server log must show the request reaching route → service → repository / a real DB
query. A route that returns canned data, mutates nothing, or handles the request without touching
the database is a hollow slice that passes shape checks while doing nothing. Also check the layers
are real: a "service"/"repository" that is a pass-through with the logic inlined in the route, or a
repository that returns hardcoded rows instead of querying, is a slice in name only. Try an invalid
call — a bad payload should be rejected with a sane status, not swallowed.

Report each slice as **live** (persists + shows a real DB-backed route→service→repository path in
the log) or **hollow** (responds but nothing persists / no DB activity / layers are nominal). "The
route responds 200" and "the files are present" are not passes.
