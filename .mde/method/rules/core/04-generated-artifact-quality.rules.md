---
type: method-rule
id: RULE-CORE-004
title: Generated Artifact Quality
category: core
applies_to:
  - generated-artifacts
  - pages
  - prototypes
  - docs
  - tests
  - source
---

# Generated Artifact Quality

Generated artifacts must be specific to their declared intent.

MDE must not generate near-identical placeholder artifacts that differ only by:

- title,
- heading,
- filename,
- route,
- menu label,
- generic sections,
- generic card labels.

## Specificity

Generated artifacts must reflect their source specification, user-confirmed discovery, or plan intent — never a near-identical placeholder that differs only by the trivia listed above.

*What* a generated artifact must contain to be specific, and *which* upstream artifact it must trace to, are owned by the **loaded targets** (their features' `## Impact`/`## Checks`), not by this core rule. A generated artifact that cannot be traced to the source artifact its loaded targets mandate is invalid.

## Thin specs

If the source spec is too thin to generate meaningful content, MDE must either:

- ask a focused clarification question, or
- create an explicitly marked placeholder and explain what is missing.

## No fake completeness

MDE must not claim a generated artifact is complete when major required behavior, tests, data, or traceability is missing.

A plan may be fast and lightweight, but it must still be honest about gaps.

## Honest status — missing or un-generatable artifacts block "executed"

The lifecycle must reflect reality, not the agent's optimism. Two rules:

- **Missing target-required artifact ⇒ not complete.** If any artifact the loaded targets *require*
  is missing (a manifest-mandated entry with no real file, or an empty/stub stand-in), `tasks.md`
  **cannot mark the validation stage (6) complete** and `status.md` lifecycle **cannot be
  `executed`**. The plan is `partially-executed` or `blocked`, with the gap recorded.

- **Can't generate it ⇒ block, don't fake it.** If a target-required artifact (architecture, schema,
  API, page, doc, …) cannot be genuinely generated, mark the plan **`blocked`** or
  **`partially-executed`** and record why. **Do not substitute a demo, skeleton, stub, or fake**
  architecture/artifact to make the plan look done — a fake that passes for the real thing is the
  worst failure (see "No fake completeness" above; faking a persistence layer's own database
  — governed by the persistence/testing targets — is a specific case).

Enforced at `mde evaluate` (the validation stage / stamping `evaluated`) and `mde go` (the
`executed` stamp): a plan with a missing or faked target-required artifact is never stamped
`executed`.

## Production logic — no fake data, no mock fallback

Generated **code is production logic**. What it computes must come from the real system — the
database, the service layer, the live API — never from data baked into the source. This is stated
**before generation**, not only caught after: a generator that reaches for a shortcut is producing a
defect, and the shortcut is what makes an app "look right" while doing nothing.

Specifically, generated source MUST NOT contain:

- **Hardcoded sample data standing in for real records** — an inline array of employees, a canned
  JSON blob, seeded objects returned as if fetched. Data reaches the UI/API from the store, not a
  literal in the file.
- **Mock / stub returns in production paths** — a handler, service, or repository that returns a
  fixed value, an empty success, or `TODO`-shaped output instead of executing the real query/logic.
  Mocks belong in tests, never in shipped code.
- **Silent fallback to fake data when the real call fails** — `try { fetch(api) } catch { return
  sampleData }`, a default that hides an unreachable backend, a component that renders placeholder
  rows when the request errors. A failed real call must **surface** (error state, thrown error,
  logged failure), never be papered over with fabricated data that makes a broken system look
  healthy.
- **No-op controls** — a button/action wired to nothing, or to a handler that returns without
  performing the mutation it claims.

If the real dependency genuinely cannot be reached at generation time, that is a **`blocked` /
`partially-executed`** condition (see "Can't generate it ⇒ block, don't fake it") — record the gap;
do not substitute fake data or a fallback to make the path appear to work. Coverage/reports are
subject to the same standard: a hand-written coverage number or a report measuring nothing is fake
data by another name (governed by the testing target).

**This is always on — there is no "prototype mode" that relaxes it.** Every plan's generated app
code is production code. Prototypes, spikes, and throwaway explorations are legitimate, but they are
**contained inside the plan**: a prototype lives within the plan's own boundary (`plans/<id>/`, its
own scratch area) and its artifacts belong to that plan — it **never** leaks into the application's
real source tree (`src/`, `db/`, production config) as if it were production, and nothing downstream
builds on it. A prototype that must survive is **promoted** through a real plan that produces genuine
production artifacts, not adopted in place. Placeholder/mock code that has escaped a plan's boundary
into the app is not a prototype; it is fake data in production — an Integrity Violation.

## Real artifacts, not duplicate summaries

Summaries are not required plan outputs. Impact is the review surface. Real artifacts are the working output.

Do not generate duplicate summary artifacts when impact plus direct artifact review is enough.
