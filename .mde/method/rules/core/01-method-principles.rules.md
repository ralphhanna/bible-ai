---
type: method-rule
id: RULE-CORE-001
title: Framework Architecture Principles
category: core
applies_to:
  - method
  - commands
  - plans
  - artifacts
  - targets
  - templates
  - trace
---

# Framework Architecture Principles

## Posture — read this before doing any work

**This work is serious engineering, and the scope is real. Do not reduce it, and do not trade
quality for speed.** MDE is producing durable software, not a demo.

- **Do the whole scope.** Do not quietly shrink it, skip parts, stub, or "simplify" to finish
  faster. Breadth is not a reason to narrow — a large scope is valid and is built in full.
- **"This is too much work" is not an argument.** The amount of work is not a defect and not a
  reason to reduce, defer, or push back. Do not complain that the scope is large, do not propose
  cutting it down for effort's sake, and do not treat volume as permission to skip tests or stub
  outputs. A big job is done by doing the big job. The only legitimate reason to split or defer is
  a *technical* one the user decides (dependency ordering, release phasing) — never the agent's
  sense that it is a lot. If it is a lot, that is expected; proceed and complete it.
- **Quality over speed, always.** A slower, correct, fully-tested result is the goal; a fast
  result that skips tests, fakes coverage, or asserts vaguely is a failure, not a shortcut.
- **Run the work — do not defer it away.** Executable steps (tests, coverage, migrations) are
  part of the job, not optional extras. If you have a runtime, you run them. "I'll defer this,"
  "the environment can't," or "this is good enough for now" are **not** acceptable when the work
  can be done — deferral is a last resort that must be *proven*, never a convenience.
- **No cosplay.** A file that merely exists (an empty test, a placeholder coverage report, a
  vague assertion, a stub) does not satisfy a requirement. The substance must be real and
  examined. Producing the *appearance* of done is worse than an honest "not done."
- **Honest status.** If something genuinely could not be completed, say so plainly and record it
  — never dress up an incomplete or faked result as finished.

The rest of the method (commands, targets, checks) fences the details. This posture governs how
you approach all of it.

---

Core rules define the small set of MDE concepts that every command must understand before doing work.

They do not define detailed BA, UI design, code generation, persistence, testing, documentation, or release mechanics. Those details belong in command profiles, target profiles, and templates.

## MDE framework concepts

MDE organizes work through these concepts:

- **Boot file**: the root `mde` file that resolves method, project paths, and command write boundaries.
- **Business Specs**: durable business facts such as goals, roles, capabilities, entities, rules, use cases, and open questions.
- **Design Specs**: durable application design facts such as UI catalog, page specs, architecture, APIs, persistence design, and design decisions.
- **Artifacts**: project files that express specs, plans, source, tests, docs, prototypes, outputs, or trace.
- **Plans**: governed change contexts that turn user intent into reviewed and attributable changes.
- **Plan depth**: an internal profile (`fast`, `standard`, or `full`) that controls how much plan ceremony is required.
- **Commands**: event-specific instructions such as `start`, `evaluate`, `go`, `change`, `cancel`, `show`, `review app`, `start branch`, and `release branch`.
- **Targets**: work-domain expectations loaded only when relevant, such as business requirements, UI, API, persistence, source, testing, documentation, or deployment.
- **Templates**: artifact shapes and required sections.
- **Impact**: the plan's review surface: intended changes, touched artifacts, risks, gaps, and scope drift.
- **Plan-local manifest**: `plans/<plan-id>/output.manifest`, an append-oriented record of artifacts the plan touched or produced.
- **Consolidated manifest**: derived project-level trace under root `manifest/`, built from plan-local manifests.
- **Reconciliation**: detecting drift and bringing artifacts back into confirmed alignment.
- **Branch/release**: a branch holds a release train of plans; packaging, merge, and tag lifecycle are handled by `start branch`/`release branch`, not by ordinary plans.

## Loading model

For each request, load only what is needed:

- the root `mde` boot file for project/method path resolution before an `mde ...` command,
- `specs/design/mde-policy.md` for project policy such as `autoCommit`, `branchPrefix`, and `debug`; if absent, use documented defaults and do not block,
- core rules,
- the active command profile,
- relevant target profiles,
- relevant templates,
- the current plan and directly relevant specs/artifacts.

Do not load detailed target guidance unless that target is relevant to the active command.

## Separation of responsibilities

- Core rules define framework concepts and boundaries.
- Commands define when and how an event is performed.
- Targets define what good work looks like for a specific domain.
- Templates define artifact structure.
- Plans record intent, scope, impact, changed artifacts, decisions, and outcome.
- Manifests record artifact trace.
- Branch/release commands manage branch, merge, tag, and release mechanics (a branch is the release unit).

## Commands are target-agnostic

A command **must not name or enumerate specific targets, features, or target-mandated
artifacts**. Commands operate over *whatever targets are loaded* — they iterate the loaded target
profiles and act on what those targets carry; they never hardcode "the ERD", "the navigation
diagram", a particular target name, or a fixed list of required artifacts.

- The set of applicable targets is derived at impact-analysis time by matching each target
  profile's own `applies_when` (plus AI judgment that may only *add*). A command reads that
  derived set; it does not decide membership by naming targets.
- *Which* artifacts and checks are required, and *when*, is owned by the loaded targets and their
  referenced features (each feature's `## Impact` and `## Checks`). A command says
  "expand every artifact the loaded targets mandate" and "run every check the loaded targets
  carry" — generically — never a per-artifact or per-diagram inline list.
- **Why:** an inline list in a command silently goes stale every time a feature is added,
  removed, or retriggered, and it duplicates the source of truth. A new diagram/artifact must
  become required by adding its **feature** (tagged to a target), with **no command edit at
  all**. If you find yourself editing a command to add an artifact name, that is the wrong file.

## Targets are compiled from features — never hand-edit

Target profiles are **generated** by `compile-targets.mjs` from the features: a feature
declares the target(s) it `impacts:` and supplies its `## Impact on <target>` and `## Checks`
blocks, and the compiler composes those into each target's profile (each section tagged
`[feature: <id>]`). The authored part of a target is only its skeleton (`id`, `title`,
`applies_when`, `Purpose`).

(A **feature** is an MDE method unit under `.mde/method/features/` — the internal building block
that compiles into targets. It is distinct from a **business capability**, which is a business-domain
concept under `specs/business/capabilities/`. Do not conflate them.)

- To change what a target requires, **edit the feature and recompile** — do not hand-edit the
  composed sections of a target file (they are overwritten on the next compile and the edit is
  lost).
- A feature reaches a target only through its `impacts:` frontmatter and a matching
  `## Impact on <target>` heading; a feature that is not tagged to any target is orphaned and
  will not be enforced.
- `compile-targets.mjs` is a **regenerating** step: treat it as destructive to the current target
  files. Run it only when the feature inputs and authored skeletons are known-good, and verify
  the result (targets are git-tracked — restore from the last good commit if a compile produces
  empty or wrong output).

## Plan lifecycle lives in workflow rules

The framework concepts above are stable and always-loaded. The **procedural** rules for how a
plan actually runs — the plan working model, clean-baseline requirement, evaluate/go semantics,
branch/release train, incoming-file handling, change reconciliation, and the database/runtime
apply exception — live in **`rules/workflow/`** (loaded alongside these core rules by every
command). Core defines *what MDE is*; workflow defines *how the plan lifecycle proceeds*.
