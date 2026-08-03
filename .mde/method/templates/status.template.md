---
id: TEMPLATE-STATUS
type: template
title: Plan Status
artifact: plan
used_by_commands:
  - mde show
  - mde start
  - mde evaluate
  - mde go
  - mde release
---

# Status

```text
generated-at:   {{iso_timestamp}}
source-events:  {{log_event_count}}

lifecycle:      {{draft|evaluated|executing|executed|partially-executed|blocked|cancelled|released}}
scope:          {{scope_summary}}
tasks:          {{task_summary}}

last-event:     {{last_event_summary}}

manifest:       {{manifest_summary}}
review:         {{review_summary}}
validate:       {{validation_summary}}
unresolved-validation: {{none|open}} - {{when open: in-scope validation findings that prevented clean completion}}
verification-debt: {{none|open}} - {{when open: K owed checks blocked by environment, e.g. "3 UI screenshots (requires browser environment)"}}
pending-actions: {{none|open}} - {{when open: N open discussion items + M deferred scope items; Non-goals excluded}}

recommended:      {{next_command}} - {{reason}}
recommended-next: {{next plan's work and why, from what this plan revealed — set by go}}
```

## Outcome

<!-- The plain-English summary the user reads FIRST — so they never have to piece the result
     together from verify.log / evidence.md / audit.md. Write it every evaluate/go. Keep it short:
     the verdict, what (if anything) is wrong, how to fix it, and the single next step. -->

- **Result:** {{GO — ready for `mde go` | GO-WITH-NOTES — ready, non-blocking notes | NOT READY — must fix below}}
- **What happened:** {{one line: what this plan produced and whether it is complete/verified}}
- **What's wrong:** {{when NOT READY: name each blocking gate in plain words (e.g. "3 verifier FAILs on API coverage"; "audit found a fake"; "12 artifacts never generated") — else "nothing blocking"}}
- **How to fix:** {{when NOT READY: the concrete remedy per issue (fix the FAILs / replace the fake with real logic / generate the missing files), then re-run `mde evaluate` — else "n/a"}}
- **How to proceed:** {{NOT READY → fix the above, re-run `mde evaluate`, repeat until READY, then `mde go`. READY → run `mde go` to accept + commit. GO-WITH-NOTES → review the notes, then `mde go`.}}

These two flags are **distinct and must not be merged** (plan-status reference §9–§12):

- `verification-debt` (**Outcome B — owed**) is derived from `evidence.md`: `open` if any
  check is recorded `deferred — requires execution environment` (tests, coverage,
  screenshots, migrations…); otherwise `none`. It is owed work blocked only by the
  environment, cleared by re-running `mde go` in a capable agent. `mde release` refuses
  a plan with open debt unless the user accepts it.
- `pending-actions` (**Outcome C — parked**) is derived from the plan definition: `open`
  if `discussion.md` has any entry with `status: open` **or** `scope.md` has any Deferred
  scope item that is **not yet resolved**; otherwise `none`. Non-goals never count. It is
  informational — it does **not** block `executed` or release.
  **A deferral can be closed.** A Deferred scope item marked **resolved** — the deferred
  work was later done (in this or a subsequent plan), or became moot because scope changed —
  no longer counts toward `pending-actions`. Record the resolution on the item (e.g.
  `resolved: done in plan <id>` / `resolved: moot — scope changed`) so the parked backlog
  reflects **real** outstanding work, not stale items already delivered elsewhere. A later
  plan's `mde evaluate` reconciles prior open deferrals and closes the satisfied ones (see
  `mde evaluate` step 4c). A deferral that lingers `open` after its work is done is a stale
  backlog defect, not a real pending action.

Never fold a verification debt (B) into `pending-actions` (C), or a Deferred scope item
into `verification-debt` — they live on their own lines. A plan can have both `open`.

## Validation Completion

`unresolved-validation` is distinct from both debt and pending actions. It is `open`
when any in-scope finding from planning, implementation, template-shape, AI semantic
review, method-followed check, annotations, or evidence remains unrepaired. A
plan with `unresolved-validation: open` cannot be truthfully marked
`evaluated`/`executed`; use `partially-executed` or `blocked` and record the concrete
finding.

Never fold unresolved validation into `verification-debt` or `pending-actions`. Only
environment-only owed checks qualify as verification debt; only open discussions and
explicit deferred scope qualify as pending actions.
