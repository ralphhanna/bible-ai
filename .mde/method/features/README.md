# Features

A **feature** is a first-class, coherent unit of method behaviour — a feature the
framework knows how to build and verify. Features are the *source*; targets, templates,
and artifacts are *derived* from them.

This directory is a **pilot**: it reverse-decomposes existing target profiles into
feature files, to validate that the method's behaviour can be expressed as features that
*reference* targets (rather than living inside them). See `targets/` for the current
master behaviour catalogue this is being factored out of.

## Layout

Features are filed in **one folder per category**, purely for browsing:

```text
features/
  index.md                       full list, by category
  README.md                      this format doc
  <category>/<feature-id>.md     e.g. prototyping/annotations.md
```

**The category/folder is visual only — it has no execution meaning.** It is just a
shelf to organize and find features. Execution never reads the folder; it reads each
feature's **`impacts:`** list, which is the authoritative (and typically multiple) set
of targets the feature contributes to. A feature filed under `prototyping/` may equally
impact `web-ui`, `testing`, and `design` — its folder is not one of those, and is not
"primary". When the same feature could be shelved in more than one category, the choice
is cosmetic; move it freely without changing behaviour.

## Origin

A feature comes from one of two places:

- **mde** — shipped by the framework (e.g. annotations, role-switcher, data-source-switch).
- **designer** — authored by the application designer for a specific project.

## What a feature carries

A feature owns its whole lifecycle, expressed as contributions to the **targets** it
impacts. The target stays the master catalogue of behaviour *logic*; the feature supplies
*what / which*, and declares the evidence that proves it.

```yaml
---
id: <kebab-case-id>
title: <human title>
origin: mde | designer
impacts:                     # the target(s) this feature contributes behaviour to
  - <target-id>
default: on | opt-in | n/a   # when applicable (for selectable facets)
group: <group-id>            # ONLY for mutually-exclusive alternatives (see below); omit otherwise
groupRule: exactly-one | at-most-one   # only with group; defaults to exactly-one
---
```

### Mutually-exclusive features (choice groups)

Most features are **independent** (on/off, unrelated to others) — they carry no `group`.
But some are **alternatives**: a project picks **one** stack, **one** architecture style,
one ORM-vs-raw-SQL, etc. Those — and **only** those — declare a `group`:

```yaml
# .mde/method/features/.../node-express-react-postgres.md
group: tech-stack
groupRule: exactly-one
```

The `features-list.md` then **selects one member** of the group, rather than toggling each:

```text
tech-stack: node-express-react-postgres      # picks one member; the rest are inactive
architecture-style: vertical-slice
```

- `exactly-one` — the project must pick one (e.g. a stack — can't build without it).
- `at-most-one` — optional group (e.g. an ORM: pick one, or none for raw SQL).

A static check enforces the count: an exclusive group with two active members is an
invalid list, and `mde go` refuses to build. At compile, only the **selected** member's
sections flow into the target (so the compiled target never carries two conflicting
alternatives). Keep `group` off every feature that isn't a real alternative — less noise.

Body sections:

- **Purpose** *(required)* — what the feature is and why it exists.
- **Impact on `<target>`** *(required, one per impacted target)* — the behaviour this feature
  contributes to that target (expectations, build rules).
- **Template impact** *(only when it applies)* — which templates this feature contributes
  sections/mount-points to (the compose step; e.g. annotations → app-shell mount point).
  **Omit this section** when the feature shapes no template — most features don't, and
  declaring their absence is just noise.
- **Checks** — the verification each impacted target should run for this feature, with the
  **evidence** that proves it and whether it is `static` or `requires-environment`.
A feature does not write a review summary — `mde evaluate` generates the feature's **real
candidate artifacts** and the user reviews those directly (see `plan-status` §7.1).

A feature is one of two kinds; the **presence** of a `## Template impact` section marks
which:

- **Composer** — has a `## Template impact` section; contributes template
  sections/slots/mount-points (e.g. `entity-model`, `page-spec`, `annotations`,
  `erd-diagram`). The template is the accumulation of these.
- **Constraint-only** — **no** `## Template impact` section; it constrains how generated
  artifacts are produced and supplies checks (e.g. `layering-boundaries`,
  `coverage-threshold`, `dependency-resolution`).

## Aspects — a feature owns the aspect, the compiler builds the catalogue

An **aspect** is a system/design concern attached to a *source object* (today: an entity's
`## Aspects` — surrogate-key, audit-trail, optimistic-locking, soft-deactivation…). A feature
that **implements** an aspect **owns** it: the term, the downstream implementation (this file),
and where it is declared. Declare it in frontmatter:

```yaml
aspects:
  - <aspect-name> | <declaredAt>      # e.g.  audit-trail | entity
```

- `<aspect-name>` — the canonical slug (e.g. `audit-trail`). One feature per aspect (single
  owner — two features claiming the same name is a compile warning).
- `<declaredAt>` — the source object the aspect appears on (`entity` today; extensible to
  `web-page`, etc.). This is the **upstream** twin of `impacts:` — `impacts:` names the targets
  a feature feeds *downstream*; `aspects:`/`declaredAt` names the source it is declared *on*.

`compile-targets.mjs` gathers every feature's `aspects:` into **`targets/aspects-catalogue.json`**
(`{name, declaredAt, implementedBy}` per aspect) — the single, derived vocabulary. Nothing
hand-maintains the list: the entity template references the catalogue (not a prose list), and
the validator flags any entity that declares an aspect not in it (an unknown aspect is silently
ineffective — no feature realizes it — so it is caught, not ignored). To add an aspect, add it
to the feature that implements it; that is what makes it valid everywhere.

## User assistance — prompt and pause, never guess or defer

Some features need information only the **user** can supply — a database
username/password to put in `.env`, a choice between two valid options, a
credential, a decision the specs do not settle. When a feature reaches such a
point, the correct behaviour is: **prompt the user for the specific thing needed
and pause — stop and wait for their answer.** State exactly what is needed and
where (e.g. "edit `.env` so `DATABASE_URL` points at a reachable database, then
re-run"), then wait.

Do **not**:

- **guess or invent** the missing value (a made-up credential, an assumed choice)
  to keep moving;
- **defer** the step as "requires environment" when what is actually missing is a
  user input the agent could have asked for — a blocked-on-user step is not the
  same as an incapable environment, and must not be recorded as verification debt
  to dodge the ask;
- **proceed on a broken state** as if the input had been provided.

A feature whose check depends on user-supplied input states this in its `## Checks`
(the blocker it reports and what it asks the user for), so the pause is part of the
feature's defined behaviour, not an ad hoc halt. Pausing to ask is always preferred
over producing a wrong or fake result to avoid asking.

## Trace

The point of features is a method-level audit trail:

```
feature ──impacts──▶ target ──governs──▶ artifact
  (why)               (how)               (what)
```

A generated artifact traces up to the feature that caused it and the target that shaped
it. `why = feature`, `how = target` — kept as two distinct fields, never merged.

## Verification protocol (reverse / recompose / compare)

This pilot is checkable: extract features from a target (reverse), then have an
independent agent regenerate the target *from the features alone* (recompose, with no
sight of the original), then compare semantically. Diffs bucket into
{acceptable paraphrase | current-method inconsistency the model fixed | missing feature}.
Convergence = the feature set is a sufficient source of truth for the target.
