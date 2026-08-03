---
type: template
id: TARGET-{{TARGET_ID}}
title: {{Target Name}} Target Profile
applies_when:
  - a plan {{trigger condition}}
  - a plan creates or modifies {{artifact or behavior}}
---

# {{Target Name}} Target Profile

## Purpose

{{Explain the outcome this target protects and why the target exists.}}

## Scope

This target covers:

- {{in-scope concern}};
- {{in-scope artifact or behavior}};
- {{in-scope quality dimension}}.

This target does not cover:

- {{explicitly excluded concern — name the target that owns it when applicable}}.

## Required artifacts

When applicable, the plan must create or update:

```text
{{required/artifact/path}}
```

- {{Describe when each artifact is mandatory.}}
- {{State which template creates it, if one exists.}}
- {{Distinguish durable Specs, source, tests, docs, and plan-local evidence.}}

## Expectations

- {{Normative expectation written as a testable outcome.}}
- {{Normative expectation with a clear ownership or boundary rule.}}
- {{Normative expectation covering failure or edge behavior.}}

## Design and implementation boundaries

- {{State which layer/component owns the behavior.}}
- {{State prohibited coupling, duplication, or bypasses.}}
- {{State how this target interacts with capabilities and shared components.}}

## Security and data handling

- {{Authentication, authorization, secrets, privacy, or data-classification expectation.}}
- {{Validation, retention, redaction, or audit expectation.}}

Remove this section when security or data handling is genuinely irrelevant.

## Testing expectations

- Unit tests cover {{logic or transformation}}.
- Integration or contract tests cover {{real boundary or dependency}}.
- Behavioral tests cover {{user-visible or API-visible outcome}}.
- Failure-path tests cover {{important failure modes}}.
- Evidence identifies {{environment, fixture, emulator, sandbox, or production-like system}}.

## Documentation and diagrams

- {{Required documentation or operating guidance.}}
- {{Required architecture, interaction, ERD, or navigation diagram and when it applies.}}

Remove this section when the target mandates no documentation or diagrams.

## Verification

During `mde go`:

- perform static checks for {{structure, declarations, traceability, or prohibited patterns}};
- run executable checks for {{tests, builds, contracts, or runtime behavior}};
- capture evidence under `plans/<plan-id>/evidence/`;
- treat {{specific missing or invalid condition}} as a verification failure;
- record an executable check as deferred only when the environment is genuinely incapable.

## Review checks

- Does {{required artifact or behavior}} exist and contain non-placeholder content?
- Is {{ownership, boundary, or source of truth}} explicit?
- Does the implementation satisfy {{primary quality expectation}}?
- Are important success and failure paths tested?
- Is verification evidence accurate and reproducible?
- Are all target-required artifacts represented in the plan impact, tasks, and manifest?

## Related targets

- `{{related-target}}.md` — {{relationship or division of responsibility}}.

## Authoring notes

<!--
Target files define scope-specific quality expectations.

- Keep stable cross-cutting principles in rules/core/, not here.
- Keep artifact shape in templates/, not here.
- Write applies_when entries so `mde evaluate` and `mde go` can select the target reliably.
- Make mandatory artifacts and failure conditions explicit.
- Phrase Review checks as questions that can become acceptance criteria.
- Add the target to targets/catalog.md and targets/README.md.
- Wire target loading and verification into commands when generic target loading is
  insufficient.
-->
