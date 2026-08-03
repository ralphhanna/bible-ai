---
type: feature
id: actionable-controls
title: Actionable controls
origin: mde
impacts:
  - web-ui
default: n/a
---

# Actionable controls

## Purpose

Every visible control does something — a button wired to nothing is a defect. Filters,
dialogs, tabs, toasts, validation, and approve/reject flows actually respond.

Every modifying control also acts on the exact object or object set declared by its owning Page
Spec panel. A control never substitutes an implicit first/default collection record.

## Impact on web-ui

All visible buttons are actionable, disabled with explanation, or replaced with a clear
placeholder message. Filters/search visibly update rendered data; tabs/dialogs/confirmations/
toasts/inline validation respond; approval/reject flows and representative state changes work
(e.g. a status badge updating after an action). Rule-bearing UI shows warnings/errors/
confirmations where relevant.

**A persisting control (Save / Create / Submit / approve / a use-case operation) must perform a
real, data-backed operation — a local-only state update is a fake.** A lifecycle action follows
the governed presentation and terminal-scope rules in [[lifecycle-transition-control]]. When the capability's real
API exists, such a control proves an end-to-end path: a concrete **API method + route**, the
**payload** it sends, a **DB-backed route → service → repository** behind it, and **optimistic
version handling** where the entity is versioned (send the version, handle the conflict). A
button that only mutates component state, or posts to nothing, is a dead/placeholder control even
though the screen appears to change. The only local-only state permitted is **transient form
state** (the in-progress edit before Save). Until the real `/api/<cap>` exists the prototype
posts to the fake API per the Prototyping target — but it still goes through the data path, not a
hardcoded in-memory swap.

The owning panel and its relationships determine the target: inline row, visibly selected record,
route record, panel/modal draft, or checked set. When selection is required and absent, the control
is disabled. Terminal actions complete or abandon only their declared panel context. Bulk controls
surface partial successes and failures according to the Page Spec.

## Audit

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

## Checks

- Do filters, dialogs, tabs, toasts, validation, and approve/reject flows actually respond, and
  is every visible control wired to an action (no dead buttons)?
  · evidence: handlers in page source + E2E driving the controls
  · when: static (handlers present) + requires-environment (E2E proof)
- Does every persisting control (Save / Create / Submit / approve / state transition) call a real
  API method + route with a payload, backed by a route → service → repository data path (with
  optimistic version handling where the entity is versioned) — rather than a local-only state
  mutation or a post to nothing?
  · evidence: control handler → api client call → server route/service/repository; E2E showing
    the change persists across reload
  · when: static (path present) + requires-environment (persistence proof)
- Does every modifying control operate on the object bound by its owning panel and relationships,
  remain disabled when its required selection is absent, and avoid an implicit first/default
  record? Does each terminal action end only its declared panel context?
  · evidence: Page Spec panel/action/relationship vs. handler payload, selected state, and disabled state
  · when: static + requires-environment

```check scope=plan
# Dead-control smell (deterministic, HANDLER-level): a click handler that goes
# straight to a placeholder — onClick={() => onAction(…)} / setToast / alert /
# console.log — is a button "posting to nothing". (A file-level "has any api call"
# test is too coarse: a page can load data via the API yet wire its ACTION buttons
# to a toast.) A real action handler calls the API client, not just a message.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/.*\.(tsx|jsx)$"
THEN  $t.content NOT MATCHES "onClick=\{\(\)\s*=>\s*(onAction|setToast|alert|console\.log)\("
  ELSE "dead control — a button's onClick only fires a toast/message (placeholder), not a real action; the button does not operate"
```

```check scope=plan
# Unscoped-collection-Save smell: a modifying handler must use the panel's bound
# row/selection/route/draft/checked set, never a fixed first/default record.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/pages/.*\.(tsx|jsx)$"
THEN  $t.content NOT MATCHES "on(Save|Click)=\{[^}]*\b(update|save)[A-Za-z]*\((state\.)?[A-Za-z]+\[0\]"
  ELSE "unscoped modifying action — handler targets collection[0] instead of the object bound by its owning panel and relationships"
```
