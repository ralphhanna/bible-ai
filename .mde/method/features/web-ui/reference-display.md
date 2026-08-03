---
type: feature
id: reference-display
title: Related-entity display (Display Label)
origin: mde
impacts:
  - web-ui
  - api
  - server
default: n/a
---

# Related-entity display (Display Label)

## Purpose

When a page shows **or captures** a **related entity** — the employee on an assignment, the
customer on an order, the reviewer on a performance review — it uses that entity's **Display
Label**, the human-readable label, not the raw technical `id` and not (by default) the Business
Key. This holds on **both** sides: **displaying** an existing reference, and **entering/choosing**
one in a create/edit form.

## Impact on web-ui

**Displaying a reference.** A reference to another entity is rendered using the target entity
property marked with role **`display-label`** (a single property or a derived label such as
`firstName + " " + lastName`). Never surface the technical `id`/UUID as the way a user recognizes
the related record. A **unique property** (e.g. `email`, `orderNumber`, defined as a unique
constraint in the Storage View) is for lookup and disambiguation — show it only when it *is* the
display-label property, or alongside the label to disambiguate when the business asks for it. A list, picker, or detail field that displays a
foreign `id` (or a meaningless code) where a related entity should appear is drift — use the
display-label property.

**Entering/choosing a reference (create/edit forms).** A reference field a user *sets* is a
**selection control over the related entity's display-label options** — a dropdown / picker /
searchable combobox listing `Employee` by name, `Reviewer` by name — **not** a free-text field
where the user types a raw id or code. A form field labelled `Employee ID` / `Reviewer ID`, or a
text input expecting a value like `mgr-001`, is drift: label it by the entity (`Employee`,
`Reviewer`), present the choices by display-label, and submit the underlying `id` behind the
scenes. The user picks a **name**; the raw key is never typed or shown as the entry surface.

## Impact on api

**The API response carries the display-label, not just the foreign id.** If the UI must render
a related entity's name (impact on web-ui, above), the API response for that resource must
already include it — a UI that has to make a second lookup to resolve a foreign id into a name
is drift; the display-label is a property of the response shape, not something the client
derives. This holds for **every** endpoint that returns the referencing resource, not only
`list`/`read`: a `create`/`update` response is a defect if it omits the display-label of an
entity it just validated and referenced, forcing the caller to fall back to the raw id (e.g.
`row.employeeName ?? row.employeeId` in the UI) until the next refetch.

## Impact on server

**The repository SQL-joins the referenced table to produce the display-label column, rather
than the service/route papering over a missing one.** A repository method that selects a row
with a foreign key (`employee_id`, `project_id`, `manager_id`, …) joins the referenced table
(`LEFT JOIN employees e ON e.id = x.employee_id`) and aliases its display-label column into the
result (`e.full_name AS employee_name`) — the same query shape for `list`, `read`, `create`, and
`update`. A `create`/`update` that already fetched the related entity for validation (to confirm
it exists / is active) has the display-label in hand and must include it in the returned shape,
not `RETURNING *` the bare row and leave the name null.

## Checks

- When a page shows a related entity (a reference/foreign field, picker, or join column), is it
  rendered by the related entity's **display-label** property rather than a raw `id`/UUID (a unique
  property shown only when it is the display-label property or explicitly for disambiguation)?
  · evidence: page rendering of reference fields vs. the entity property role `display-label`
  · when: static

- When a create/edit form **captures** a reference, is it a selection control (dropdown / picker /
  combobox) listing the related entity by **display-label** — labelled by the entity (`Employee`,
  `Reviewer`), not `Employee ID` / `Reviewer ID` — rather than a free-text field where the user
  types a raw id/code (`mgr-001`)?
  · evidence: form field for each reference vs. a display-label-populated select
  · when: static

- Does the repository's read query (`list`/`findById`) **`JOIN`** each referenced entity's table
  and alias its display-label column into the result, rather than selecting only the bare foreign
  id column?
  · evidence: repository SQL — a `JOIN` per foreign-key column, with an aliased display-label
    column in the `SELECT` list
  · when: static

- Does a `create`/`update` repository method or its calling service — when it already fetched the
  related entity for validation — **include that entity's display-label** in the returned/response
  shape, rather than returning the bare row (`RETURNING *`) with the display-label field left
  null/absent?
  · evidence: create/update method body — the fetched related entity's display-label flows into
    the returned object
  · when: static

```check scope=item
# Fields-vs-spec: an artifact for an entity that has a display-label must reference
# that label field, not just the id. Catches the classic "page shows employee id /
# department_id instead of the name" generation bug. $item.entity comes from the
# artifact's source.ref; the entity spec declares the display-label field.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $spec.entity[$item.entity].displayLabel EXISTS
THEN  $item.content CONTAINS-ANY $spec.entity[$item.entity].displayLabelForms
  ELSE "page for this entity does not reference its display-label field — likely showing the id, not the name"
```

```check scope=item
# Reference INPUT smell: a form that labels a reference field "<X> ID" (Employee ID,
# Reviewer ID) or renders a raw-id text input is entering references by id, not by a
# name picker. A create/edit page should choose the related entity by display-label
# in a <select>/combobox — the raw key is submitted, never typed. Flags the exact
# defect (a visible "... ID" form label on a page that has form inputs).
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $item.content MATCHES "<(input|form)"
THEN  $item.content NOT MATCHES ">\s*[A-Z][A-Za-z ]* ID\s*(\*?)\s*<"
  ELSE "form labels a reference as '<X> ID' — capture references with a name dropdown of the related entity's display-label, not a raw-id text field"
```

```check scope=item
# Repository join smell: a Repository file whose SELECT targets a foreign-key-shaped
# column (something_id) but contains NO "JOIN" anywhere in the file is very likely
# returning the bare foreign id with no way for the caller to show a name — the
# repository never fetched the referenced row at all. A file with NO foreign-key
# column in its SELECT (a leaf entity with no references) correctly never matches the
# WHEN and is not flagged. This is a smell, not a proof (a service-layer join, or a
# genuinely reference-free entity using an _id-shaped OWN column, can false-positive
# rarely) — the AI semantic pass judges borderline cases.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*Repository\.(t|j)s$"
  AND $item.content MATCHES "SELECT[\s\S]*?\w+_id\b[\s\S]*?FROM"
THEN  $item.content MATCHES "\bJOIN\b"
  ELSE "repository selects a foreign-key column (…_id) but has no JOIN anywhere in the file — the referenced entity's display-label is never fetched, so callers can only show the raw id; add a JOIN and alias the referenced table's display-label column into the SELECT"
```

```check scope=plan
# Semantic (AI judgment) — the deterministic join-smell check above can only see
# "does this file contain the word JOIN anywhere," which cannot confirm the join is
# actually WIRED to the SELECTed foreign-key column, or that a create/update method
# that already fetched the related entity (for validation) actually carries that
# entity's display-label into what it returns rather than discarding it. The AI reads
# each Repository/Service file the smell check flagged (or any create/update method
# with FK validation) and judges: does every response shape genuinely include the
# related entity's display-label, end to end, not just the word JOIN being present
# somewhere unrelated?
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES "src/server/.*(Repository|Service)\.(t|j)s$"
ASK   "In ${$t.path}: for every method that returns a row/object carrying a foreign-key reference (employee_id, project_id, manager_id, …), does the returned shape also carry that related entity's display-label (e.g. employeeName, projectName) — via a real SQL JOIN for list/read, or by threading through an already-fetched related entity for create/update — rather than leaving the caller with only the raw id? List any method whose response has a foreign-key field but no corresponding display-label field."
```
