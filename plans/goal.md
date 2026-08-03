---
type: template
mergePolicy: user-owned
---

# Goal

<!--
  OPTIONAL. Seeded by `mde init-app` for greenfield apps. If this file is
  absent, MDE behaves exactly as it always has — a goal is never required.

  This file is runner-facing state for the goal loop (see .mde/goal-loop/).
  The one place the method reads it is `mde go`: when a goal is present, go
  records a `recommended next` for it. Delete this file and every plan still
  works.
-->

objective:   (unset — set your goal in the Workbench Guide, or edit here)
state:       open
opened:
criteria:    (unset — approve at goal start)

## Targets

Selected when the goal starts; the criteria are their impacts. Left blank until
then.

## Plans

Ids of the plans that belong to this goal — membership only, not a copy of their
state. A plan's intent, lifecycle, and recommendation live in the plan itself.

## Accepted

Deferrals a reviewer has explicitly accepted (the one debt fact nothing else
holds). Empty until a review accepts one.

## Recommended next

The most recent plan's recommendation for what should come after it — written by
`mde go`. Advice, not a queue: the next plan is decided from the goal, criteria,
findings, and guide, weighing this.
