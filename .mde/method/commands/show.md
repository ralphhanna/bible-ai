---
type: command
command: mde show
loads:
  - rules/core/*
  - rules/workflow/*
  - active plan
---

# mde show

Purpose: summarize the current plan state and refresh the derived `plans/<plan-id>/status.md` snapshot when writes are allowed.

Report:

- plan ID and status,
- confirmed scope,
- executed artifacts,
- open findings,
- verification status,
- related reconciliation commits if available.

**Separate dirty files into three buckets** (compare the git dirty set against the manifest):

- **plan-owned dirty** — dirty files listed in `output.manifest` (what `go`/`change`/`cancel` act on),
- **external dirty** — dirty files **not** in the manifest (user-owned; commands warn but never touch),
- **clean manifest-listed** — manifest files with no pending change.

Read from:

- `plans/active-plan.md`
- `plans/<plan-id>/scope.md`
- `plans/<plan-id>/tasks.md`
- `plans/<plan-id>/evidence.md`
- `plans/<plan-id>/output.manifest`
- `plans/<plan-id>/log.md`

`status.md` is derived. It is not the source of truth and should be regenerated from the files above.
