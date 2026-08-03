---
type: feature
id: page-defaulting
title: Page defaulting (derive the UI from the business design)
origin: mde
impacts:
  - ui-design
default: n/a
---

# Page defaulting (derive the UI from the business design)

## Purpose

Derive the page set automatically from the Business Specs — one clean baseline the user reviews
and overrides. **The baseline is the set of pages the design needs, derived directly from its
elements** (the rules below). The inputs are whatever the Business Specs define — entities, use
cases, and any element the model adds later — so the derivation applies the same rules to each
element the design contains.

## Impact on ui-design

**Analyze before you shape — pattern and layout come last, not first.** Before the generator
selects any interaction pattern, canvas type, or layout for a page, it must **first understand and
document** the page's:

- **purpose & expected usage** — why the page exists, how/when/by whom it is used (the `## Purpose`);
- **subject** — the one entity the page is about (the `## Subject`);
- **primary transaction & success outcome** — the main thing the user accomplishes and what "done"
  looks like (the `## Purpose`);
- **entry contexts** — how the user arrives (route params, navigation source, prior selection —
  the `## Page Context`).

These are **written down first** (across `## Purpose`, `## Subject`, and `## Page Context`). The
generator then selects the closest preferred page pattern from
[[ui-patterns]], and derives the canvas, panels, services, relationships, and layout from the
documented business need. Selecting a pattern or layout **before** that understanding is documented is the
defect this guards against: the shape *falls out of* a documented understanding of the page, it is
not chosen up front and back-filled. Everything below (coverage, shape, list-first, role scope)
operates on that understanding.

**Derive the baseline as exactly this set of pages, in `page-composition` terms:**

- **One page per primary entity** — a Search/Filter/List page that opens the entity's separate
  Profile page, or (for a simple lookup entity) a single Table panel with edit-in-place.
- **Each secondary entity** maintained **inside its parent's page** (an in-place child Panel), or
  its own Maintenance page when it has no natural parent.
- **One page per use case that needs its own** — a cross-entity/matching page, a View/aggregate
  page, or a Workflow page (single-entity use cases fold into the entity's page as a Service).

That set — entity maintenance pages + the use-case pages — **is** the baseline. Each page's canvas
type and panel services follow from its sources and the use-case operations that touch them.
(**Primary** = an entity that is the subject of many use cases, gets its own page; **secondary** =
an entity appearing only as a step, maintained in its parent or on its own page.)

**Deriving each page's shape** from the entity's children and use cases — good practice is to let
the shape *fall out* of the sources rather than pick a pattern first. It typically lands as one of:
- **List → Profile** — a primary entity with children: a List Page (navigate/open) + a Profile
  Page (Detail Maintenance Panel + one child Panel per related collection; some edited in place,
  some Reference panels that navigate to the child's own Maintenance Page).
- **Table Panel with edit-in-place** — a simple lookup entity with no children: one Page, one
  List Panel with the `Edit` service (rows edited in the table, no separate profile).
- **Master-Detail** — list + selected-record Detail Panel linked by a `Selected` relationship, when
  browse-with-detail fits better than a separate profile.

**List-first default — a page over a collection leads with a List/selection panel, never a bare
Detail.** Any page whose primary source is an entity a user *browses, picks from, or operates on
in bulk* (a list, board, matching, or workspace page) **defaults its first panel to a List of
that source** — so the user sees and selects context before any Detail. A Detail panel is
the **target of a selection**, not the entry point, unless the page is genuinely single-record by
context (a route like `/employee/:id`, or a self-scoped "my profile"). Concretely: a staffing
board defaults a List of assignable employees to pick from; a project page defaults a List of
projects; a review workspace defaults a List of the employee's existing reviews. A collection
page that opens straight into one record's Detail with no list to choose from has skipped this
default — add the leading List panel. (This is the most common defaulting miss; treat a
Detail-only collection page as a defaulting defect, not a style choice.)

**Place each use case.**
- single-entity use case → folds into that entity's Maintenance Page as a Panel **Service**.
- cross-entity / relationship use case → its own Page: a Canvas coordinating the involved
  entities' panels with **Transfer** + **Links** (the matching/staffing shape).
- view / aggregate use case → a Page whose Panel **Source is a View**, on the canvas type that
  fits the projection.
- process / stage use case → a **Workflow** canvas.

**Current + missing, for process pages.** For a page whose job is to drive a per-period process
to completion (a review per employee per cycle, approvals, onboarding), good practice is to
surface not only what exists but **what is missing and the action that creates it** — subjects
with a record and subjects without one, with the create/initiate action on the missing set.
Avoid a workflow page that only lists existing records with no way to see or act on what's
absent. (Ordinary maintenance pages are exempt.)

**Canvas type follows the use case's shape** — good practice maps maintenance → MultiPanel;
matching → MultiPanel + Transfer; scheduling → Calendar/Timeline; approvals → Workflow; KPI →
Dashboard; geographic → Map. Default to MultiPanel; reach for a specialized canvas only when the
data shape calls for it.

**Default panel services from the use-case operations** that touch each source (an `Operate`
use case adds `Operate`, a matching use case adds `Transfer`, a maintenance use case adds
`Edit`).

**Default role scope before layout — who reaches the page, and who edits vs. only reads.** Role
is a first-class defaulting input, not an afterthought. For every derived page, default three
things from the entity operations' permitted roles and the use case's primary actor:
- **Menu/navigation visibility** — which roles see the page in their menu. A self-scoped page
  (e.g. an employee's own profile) defaults to its owning role only; it is **not** a general menu
  item for everyone even when other roles *can* read the entity. (Other roles reach that record
  through their own list/search, not a menu link to "the profile page.")
- **Edit vs. read-only by role** — a page (or panel) defaults to **read-only** for roles that
  hold only read operations on its source, and to editable only for roles with the write/operate
  operations. An admin/maintenance page is editable for its admin role and **read-only for
  everyone else who can see it** — do not default a single editable view shared across roles.
- **Default query scope** — for list/workspace pages, the acting role's scope **drives the
  default query** (a manager defaults to their direct reports; an employee to their own records;
  HR/admin to all). The page does not default to "all rows for everyone."

Enforcement still lives on the entity operations (the shared access enforcer); this defaulting
decides the page's *shape and navigation* so it matches the role model rather than presenting one
all-powerful view that the enforcer then has to fight.

The above is the **coverage pass**: it ensures every entity, use case, and operation has a
*place* (a panel) somewhere. It does **not** decide the final navigation — that is the next pass.

**Shape pass — consolidate places into the fewest coherent routable pages.** Coverage produces
panels; this pass groups them into the pages a user actually navigates:

- **A page earns a route** when it is a distinct **user goal**, a **navigation entry point**, a
  **permission boundary**, or a **sustained workspace**. Panels that don't meet that test live
  **inside** a page as tabs/sections, not as their own routes (e.g. a person's goals, feedback,
  and reviews are tabs within **My Profile**, not separate pages).
- **Workbench over sprawl** — good practice is to gather a role's related tasks into one
  workspace rather than scatter them across many small task pages; group by how a manager, an
  employee, or an admin actually works. Avoid a page-per-task sprawl.
- **Reference / lookup entities** (departments, job roles, skills, statuses) are **panels inside
  an Admin or domain page**, not pages of their own — unless one carries a real workflow.
- **Page-budget sense check:** if the page list reads like a sitemap generated from the entity
  tables (one page per table), it has skipped this pass — consolidate.

**Suggestions are a short, separate list — not part of the baseline.** Beyond the derived pages,
offer **a few** cross-cutting pages a designer would typically add — usually one app **home/
overview**, one **search**, one **reports** landing. List them under a `## Suggestions` heading,
one line each with a reason, **for the user to accept.** A suggestion becomes a page only when the
user accepts it; until then the baseline stands as derived.

## Checks

- **Analyze-before-shape:** does each page spec document its understanding first (`## Purpose`,
  `## Subject`, `## Page Context`) — purpose,
  expected usage, primary transaction, primary + supporting business objects, entry contexts, and
  success outcome — with its composition (pattern/canvas/layout) reading as **derived from** that
  analysis rather than a pattern picked first and back-filled?
  · evidence: `## Purpose` / `## Subject` / `## Page Context` present and coherent with `## Composition`
  · when: static + AI review at go / review app
- **Coverage:** does every entity, use case, and operation have an **accessible place** (a panel)
  somewhere in the UI — not necessarily its own page?
  · evidence: panels across the page set vs. entities + use cases + operations
  · when: static
- **Shape:** does each routable page meet the routable-page test (distinct user goal, navigation
  entry, permission boundary, or sustained workspace), with reference/lookup entities and related
  tasks consolidated into workbenches/admin pages rather than a page per table?
  · evidence: the page set vs. the routable-page test
  · when: static
- Are any **suggested** pages a short, separate `## Suggestions` list (each with a reason), kept
  out of the baseline until the user accepts them?
  · evidence: the summary's Suggestions section
  · when: static
- **List-first:** does every collection page (browse / board / matching / workspace over an
  entity) lead with a List or selection panel of its source, rather than opening into a bare
  Detail with no way to pick context? (Single-record-by-context pages — `/x/:id`, self-scoped —
  are exempt.)
  · evidence: each collection page's first panel vs. its source
  · when: static
- **Role scope:** does each page default its menu visibility, edit-vs-read-only, and default
  query from the entity operations' permitted roles and the use case's actor — rather than one
  editable, all-rows view shared across roles?
  · evidence: page spec role/visibility/scope vs. entity operation roles
  · when: static
- **Current + missing:** does each operational/workflow page surface what is missing and the
  action that creates it (not only existing records), where the use case expects records to be
  created to completion?
  · evidence: workflow page panels vs. the lifecycle/use case
  · when: static
