---
type: command
command: mde start
loads:
  - rules/core/*
  - rules/workflow/*
  - relevant targets (advisory)
  - templates/plan/*
  - templates/scope.template.md
  - templates/discussion.template.md
---

# mde start

Purpose: create a draft plan from user intent or detected drift.

## Load

- Core rules.
- Relevant business/Design Specs.
- Relevant templates for the plan type.

## Target Loading During Plan Start

Plan start may load relevant target profiles for discovery, questioning, scope analysis, and impact analysis.

Plan start must not write durable artifacts.

Target profiles loaded during plan start are advisory until `mde evaluate` records the final set.
Match relevant targets by their own `applies_when` against the work at hand — do not hardcode a
target list here.

`mde evaluate` records the final target set; `mde go` builds against it.

## Behavior

0. **Require a clean working tree (clean baseline rule) — present a decision-point, do not silently block.** A plan owns its change set and must be able to detect, attribute, and roll back its own changes — which is only possible from a clean baseline. If the tree has uncommitted changes, **do not start blindly**: stop and **present the situation and the choices**, then act on the user's pick. Show:
   - **Current** — if a plan is already active, its id, lifecycle, and the files it owns (manifest-listed); and the uncommitted set, split into plan-owned vs external/user-owned.
   - **Impact** — starting a new plan needs a clean baseline; state what happens to the current work-in-progress under each option.
   - **Options** — (a) **absorb** the uncommitted changes into the new plan (they become its owned changes); (b) **add** the new work to the active plan instead of starting a separate one; (c) **commit** the current plan's work to its branch and start the new plan (switch branches with plain git — `mde start branch` for a fresh branch off `main`); (d) **stash**; (e) **discard**.

   Plan-local files from a prior plan that are already committed are fine; it is *uncommitted durable changes* that block. A plan is created **in the current branch, never on `main`** (start a branch off `main` with `mde start branch`). Switching between branches is plain git (commit current, `git checkout`). External/user-owned dirty files are never absorbed without the user saying so, and are never reverted. (This replaces the old "draft can start dirty" behavior — the manifest/ownership model needs the clean baseline.)
1. Interpret the user request.
2. Identify intented work and target.
3. Identify relevant business-capabilities, entities, pages, rules, use cases, and artifacts.
4. **Drift check only (case 3 — out-of-band changes).** `start` does **very little** here: detect durable artifacts (specs/design/source) that changed **outside a plan** since the last reconciliation commit — hand edits, an external commit, a method upgrade. That is the *only* check `start` runs; it does **not** compute app-wide completeness or operation coverage (that is the dashboard's continuous view, `mde review app`'s audit, and a design plan's own contract — not `start`'s job). When out-of-band drift is found, funnel it into a governed plan (step 5) so it becomes a normal plan-authored change. (The clean-tree gate is step 0; the branch check happens at `mde go`.)
   - **Branch advisory:** a plan is created **in the current branch, never on `main`.** If a repository is available and the current branch is `main` (or the base branch), **advise** the user up front — "you're on `main`; run `mde start branch <name>` first." This is a non-blocking nudge (drafting on `main` is fine), surfaced now so the user isn't forced onto a branch late at build time. `go` will still auto-fixup if they skip it.
5. If unreconciled drift exists, either:
   - include it in the plan impact,
   - recommend a separate reconciliation plan,
   - or mark it unrelated with explanation.
6. Derive the plan ID as `NNN-slug`, where `NNN` is the highest numeric prefix directly under `plans/` plus one and `slug` is derived from the user request.
7. Create `plans/<NNN-slug>/` and update `plans/active-plan.md`.
8. Create or update `scope.md`, `discussion.md`, `log.md`, and `status.md`. The user
   talks in natural language; the AI curates plan-shaping points into `discussion.md`
   entries and distills the settled frame into `scope.md` (intents with nested scope).
9. Create `imports/` or `preview/` only when relevant imported source files or draft previews exist.
10. Do not create `plan.md`, `impact-summary.md`, `questions.md`, or `decisions.md`.
11. **If policy `autoCommit: on`** (`specs/design/mde-policy.md`), commit the new/updated plan-local files (`plans/<id>/…`) so the tree stays clean — e.g. `start: <plan-id>`. When `autoCommit: off` (default), leave them uncommitted. Never commit durable artifacts here (start writes only plan-local files).

## Draft is interactive

The plan stays in `draft` while the user shapes it through conversation. In draft
the user may request **modification or clarification of any artifact** — upstream
(Specs: business/Design Specs, requirements, specs) or downstream (app source,
live pages, tests) — and may ask for a **preview** ("show me" a page, data
shape, use case, or rule) or **import** an external file. Draft is open
conversation, not a fixed command menu; surface these options when the user seems
unsure.

Draft does not mutate real artifacts. It writes only plan-local files (`scope`,
`discussion`, and draft previews such as a doc/ERD under `preview/`). Real
artifacts — Specs, app source, live pages, **and `.mde/method/` files when the plan's scope
is a method change** — are materialized at **`mde evaluate`** (which generates the candidate
artifacts), then accepted/committed at `mde go`. A user request during draft to change any such
durable artifact is captured as a `discussion.md` decision; **`evaluate` materializes it** —
draft never writes a durable or method file directly.

**What to DO with a reported bug or change in draft (the positive rule).** Exploring is
encouraged — read the code/specs, reproduce, root-cause. Then record the result — the
**diagnosis, the proposed fix, and its impact** (which files/behaviour it affects) — as a
`discussion.md` decision **then, in draft**. That is the draft deliverable for a change request.
You do **not** edit the durable/method file to "just fix it" — capture the fix as a decision and
stop. `mde evaluate` reads the settled decisions, **writes the durable fix**, and derives the
formal `impact.md`. So: draft = explore + record (diagnosis/fix/impact) in `discussion.md`;
evaluate = write the file + derive `impact.md`. Investigation is always allowed in draft; the
boundary is on *writing the durable file*, not on thinking.

Present each proposal as something **viewable** — chat text for wording, or a
plan-local file for a doc/diagram — and state where it is and how to open
it. Form and surface are the agent's choice.

**Assess on commitment, not deliberation:** do not run impact analysis on
speculation. Record a decision only when the user commits — as a resolved
`discussion.md` entry (`kind: decision`); the heavy assessment happens at
`mde evaluate` / `mde go`, on demand — not per chat turn.

## Plan size is the user's call — large scope is valid

A single plan may legitimately carry **large scope** — a whole capability, several
capabilities, or an end-to-end app build in one plan. MDE is built for this: `mde go`
materializes and verifies the entire scope in one pass (e.g. a full end-to-end app build is a
normal single plan). **Do not tell the user a plan's scope is "too big," and do not make splitting a
precondition for proceeding.** Whether to split work into multiple plans is the **user's
choice**, not a limit the agent imposes on size alone.

- Do **not** repeatedly ask the user to narrow scope, and do **not** recommend breaking the
  plan into smaller plans just because it covers a lot. Take the scope as given and move toward
  `mde evaluate`/`mde go`.
- Splitting is appropriate only for a **real** reason the user agrees to — e.g. independent
  release timing, a genuine dependency ordering, or the user explicitly asking to phase the
  work — never as a reflexive reaction to size or perceived effort.
- Ask a clarifying question only when scope is genuinely **ambiguous** (you cannot tell what is
  in or out), not when it is simply **large**. "This is a lot of work" is not a reason to ask
  the user to cut it down.

## Boundaries

Plan start may analyze and propose.

Plan start may create or update plan intake files such as `scope.md`, `discussion.md`, `log.md`, and derived `status.md` when the command environment supports that.

Plan start must not write Specs, source, tests, docs, generated output, or manifest entries.
