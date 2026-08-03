---
type: audit-view
title: Audit — web-ui
---

# Audit — web-ui — COMPILED from features' `## Audit`

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

### Actionable controls  `[feature: actionable-controls]`

You did not build this UI. Do not trust that a control *exists* — judge whether it
*acts*. Drive the real running app in a browser and, for each mutating control (Save,
Create, Submit, approve, a status/lifecycle change):

- **Click it, then read the result back after a reload / fresh fetch.** Did the change
  actually persist, or did it vanish on reload? A change that survives only in React
  state is a fake — the classic "Save profile / change status / propose assignment
  updates local state, never calls the API" (observed: `EmployeeDirectory.tsx` save,
  `PerformanceWorkspace.tsx` acknowledge, `ProjectStaffing.tsx` propose).
- **Corroborate against the server's own log for the run** — a mutating click must
  leave a matching request/write in the app log. A control that changes the screen with
  no corresponding server activity did not operate; it repainted.
- **A control that always affects the same record** regardless of what you selected
  (e.g. "propose" always targets the same person) is mis-wired — try it against
  different rows and see whether it follows your selection.

Report each control as **operating** (change persisted across reload + a matching entry
in the server log), **placeholder** (screen changed but nothing persisted / no server
activity), or **mis-wired** (ignores your selection). "The button is there and the screen
changed" is not a pass.

### Login page (login UI)  `[feature: dev-login-page]`

Judge whether the selected identity is **actually propagated to the API** and **exercises
role-scoped behaviour** — not just displayed in the shell. The common gap: login stores a local
selected user used only for greeting/routing, while API calls never send that identity, so
role-scoped access is never truly tested.

Drive the running app: pick a user, then perform an action and inspect the request the app
sends — does it carry the selected identity/roles (a header/token), and does the server log show
the request attributed to that principal? Then pick a **different-role** user and confirm the app
**behaves differently** where roles matter (an action allowed for one role is blocked for
another). If every role can do everything, or the identity never leaves the browser, role scoping
is not exercised.

Report identity as **propagated** (requests carry it, server attributes them, roles change
behaviour) or **cosmetic** (selected user only shown, API calls anonymous / role-agnostic).

### Operations against data (not canned swaps)  `[feature: operations-against-data]`

Judge whether each page realises **every operation it is meant to** — not just the easy
subset. A page that renders a list and detail but silently omits create, edit, transfer,
skill-management, the assignment summary, etc. looks coherent while being half-built.

Drive the running app and exercise the page's full set of operations: type in the filter and
watch the count change; sort and confirm order changes; open create/edit and complete it;
run each declared action. For each: does it operate on the **real data** (a filter that
actually narrows, not a canned result), and is the operation **present at all**? A control or
whole operation that is simply absent — no button, no path — is an incompleteness the presence
checks miss.

Report the page as **complete** (every intended operation is present and operates on real
data) or **partial** (name the missing/decorative operations). "The main list works" is not a
pass if half the page's operations are absent.

### Real dataset (from the data source)  `[feature: real-dataset]`

You did not build this. Judge whether the data on screen is **really from the API** — or a
hardcoded fallback that makes a broken backend look fine. Drive the running app and:

- **Break the API path and watch the page.** Stop the API (or point it at a dead URL) and
  reload. A real data-backed page shows an error / empty state; a **silently-falling-back**
  page shows the *same convincing data* — proving it never needed the API. This is the
  observed cheat: `apiClient.ts` carries demo fallback data and returns it when a call fails,
  so pages look functional even when the backend is broken.
- **Compare the on-screen records to the seed data via a real fetch**, and check the run's
  server log shows the list request actually happened. Data on screen with no corresponding
  server read is fallback data, not the dataset.

Report the page as **live** (data traces to a real API read this run) or **fallback**
(renders convincing data with the API broken/absent). Silent fallback outside an explicit,
labelled demo/offline mode is a failure — it is the single thing that most makes a dead app
look alive.
