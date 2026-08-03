---
id: TEMPLATE-IMPACT
type: template
title: Plan Impact
status: active
source_path: method/templates/impact.template.md
artifact: plan
used_by_commands:
- mde evaluate
- mde go
---
# Plan Impact

AI-written at `mde evaluate` from the contract (`scope.md` + resolved `discussion.md`) + prototype/ + Specs. Records the commitments this plan will fulfill and any explicit deferrals, and holds the **doc plan** (Perspectives below). Drives manifest derivation; verified at evaluate and during go self-verification. The acceptance criteria and test plan live in `acceptance.md`, not here.

This file is AI-owned. User intent and scope live in `scope.md`; settled decisions are resolved `discussion.md` entries. Do not hand-edit; request changes via `mde change`.

## Impact Analysis

**Identify the full impact of the change FIRST — then disposition each item.** This precedes and
feeds the `## Artifacts` and `## Deferrals` tables below. The `## Artifacts` list is *what this
plan will produce*; **this** section is *everything the change touches*, so nothing downstream is
silently missed. Two phases:

**Phase 1 — Identify (complete).** List every downstream artifact this change affects. You cannot
disposition what you never found, so this must be exhaustive:
- **modify / delete** — reverse-traverse the manifest: every existing artifact whose `sourceRef`
  points at a spec this plan changes (or removes) is impacted. A changed entity impacts its page,
  repository, migration, DTOs, tests, docs.
- **add** — judgment: does this change *imply an artifact that does not exist yet*? A new entity
  implies a maintenance page; a new use-case may imply its own page; a new capability implies its
  server slice. There is nothing to reverse-traverse to — reason it out.

**Phase 2 — Disposition (per item).** Each identified item is either **this-plan** (it appears in
`## Artifacts` below) or **deferred** (it appears in `## Deferrals` with a reason + follow-up).
Deferral is legitimate; **silent omission is the defect.** An impacted artifact that is neither
produced nor deferred means the impact was missed — an evaluate defect.

| Impacted artifact | Change | How identified | Disposition |
|---|---|---|---|
| {{path}} | add / modify / delete | reverse-traverse sourceRef · judgment | this-plan / deferred |

## Artifacts

Files or directories the plan commits to produce or update. Each row pairs a path with the outputType the manifest will use, the mergePolicy stamped on the resulting artifact, and its **sourceRef** — the concrete upstream spec instance the artifact serves (a REFERENCE, not a label), which becomes the manifest entry's `sourceRef.refs`. The **scope** is the Scope Type of that reference (entity | use-case | web-page | business-rule | role | business-capability | entity-operation | integration), matching the producing target's `## Outputs` `perEach`.

| Path | outputType | mergePolicy | scope | sourceRef (upstream spec it serves) |
|---|---|---|---|---|
| specs/business/entities/employee.md | specs-update | user-owned | entity | specs/business/entities/employee.md |
| specs/design/UI/pages/employee-directory.md | specs-update | generated-guarded | web-page | specs/design/UI/pages/employee-directory.md |
| src/server/employees/EmployeeRepository.ts | server-source | user-owned | entity | specs/business/entities/employee.md |
| src/server/employees/EmployeeRoutes.ts | server-source | user-owned | business-capability | specs/business/capabilities/employee-records/overview.md |

## Perspectives (Doc Plan)

The **doc plan**: documentation perspectives the plan commits to produce, derived
during evaluate from scope + the Documentation target. One row per perspective;
status is `required`, `deferred`, or `not-applicable`. Required perspectives MUST
produce at least one manifest entry under that path during go. Deferrals MUST include
a reason.

| Path | Status | Reason |
|---|---|---|
| docs/business/ | required | derived from in-scope business content |
| docs/requirements/ | required | derived from in-scope requirements |
| docs/design/ | required | implementation introduces design decisions |
| docs/users/ | required | UI flows need user-facing guidance |
| docs/api/ | required | server endpoints need API reference |
| docs/operate/ | deferred | runtime concerns not introduced in this plan |

## Loaded Targets

The target set selected at `mde evaluate` (union of applicable + explicitly requested, per
`mde evaluate` step 2) — the **canonical record** verification reads to know which targets'
checks apply to this plan (e.g. a design-stage plan loading `TARGET-PERSISTENCE-DESIGN` is what
makes the Storage-View-completeness check run at all). One bullet per target, its frontmatter
`id:` **exactly as written there** (`TARGET-` prefix, upper-kebab) — not the lowercase short form
used in `requires:`/tech-stack, not a target's file/folder name:

- TARGET-APPLICATION-DESIGN
- TARGET-API-DESIGN
- TARGET-PERSISTENCE-DESIGN
- TARGET-UI-DESIGN
- TARGET-DOCUMENTATION

A target this plan's scope requires but that is missing from this list is a coverage gap
verification cannot see — omitting the section entirely (rather than leaving it empty) makes
every target-gated design-completeness check silently not run.

## Target Areas

Top-level directories the plan touches. Lifted from scope.md when present; otherwise derived from the artifacts table.

- plans/<plan-id>/
- specs/business/
- specs/design/
- src/server/
- src/web/
- db/
- tests/
- docs/

## Deferrals

Anything the plan deliberately does not deliver. A deferral is a **commitment to do the work
later**, not a place to hide skipped work — so each row states three things, all concrete:

- **Source** — the `scope.md` Deferred item or derived perspective it comes from.
- **Reason** — *why* it is deferred, specifically. "User asked to skip it this pass",
  "depends on capability X not yet built", "release-phased to v2" are concrete. **"Hygiene item",
  "good enough for now", "follow-up recorded in evidence.md", "see the other file" are NOT** —
  a reason that points at another file instead of stating the cause is circular and invalid.
- **Follow-up** — the **concrete next action** that will resolve it: the artifact/section to
  produce, and *where* it will be done (a named later plan, "the Interaction Model pass", "when
  capability X lands"). "open if …" / "recorded elsewhere" is not a follow-up — name the action.
  A deferral with no concrete follow-up is not a deferral; it is skipped work. This is the same
  posture as RULE-CORE-001: do not dress up dropped work as deferred.

| Source | Reason | Follow-up |
|---|---|---|
| scope.md 1.6 (`## Interaction Model`) | user asked to skip Interaction Model this pass (Save-fix only) | add `## Interaction Model` to the touched page specs in a dedicated Interaction-Model plan |

## Self-Verification Anchor

At `mde evaluate`, the AI verifies this file covers every in-scope spec item (doc-plan perspectives, Target Areas) or records an explicit deferral. The result of that check appears in `evidence.md` as the `impact_covers_spec` row of the per-clause checklist.
