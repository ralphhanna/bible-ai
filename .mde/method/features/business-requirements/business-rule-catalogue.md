---
type: feature
id: business-rule-catalogue
title: Business rule catalogue
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Business rule catalogue

## Purpose

Capture business rules specifically enough to become validation logic, decision logic,
calculations, lifecycle guards, test cases, or user-facing warnings.

## Impact on business-requirements

Each rule defines:

- rule ID;
- statement;
- owning/primary capability;
- affected entities;
- trigger or context;
- constraint, decision, calculation, eligibility, or lifecycle guard;
- inputs and governed values where relevant;
- exceptions and who may authorize them;
- resulting effect;
- testability note.

Cross-capability rules live at `specs/business/rules/<slug>.md`; capability-owned rules under
`capabilities/<slug>/business-rules/<slug>.md`. One file per rule. Access control is **not** a
business rule — it is an attribute of the entity operation (see
`entity-operations-and-access`).

## Rule discovery from transactions

Review each use-case flow for rules implied by:

- validation or blocking conditions;
- eligibility or candidate selection;
- calculations and rankings;
- quantities, fulfilment, balances, and remaining amounts;
- approvals and confirmations;
- lifecycle guards;
- exceptions and override authority;
- cancellation, reversal, or completion reconciliation;
- post-change invariants across impacted objects.

A use case that says “the system validates,” “the system determines,” “unless an exception,” or
“the system recalculates” must resolve that behavior to a rule or lifecycle guard rather than
leaving it as unexplained prose.

## Rules are governed and proven by use cases

A business rule does **not** create a separate testing island. Every rule must **govern one or
more use cases** — it is *applied* by a use-case step and *proven* by one or more **test
conditions** belonging to those use cases:

- A rule with **no use-case step that invokes it** is an **orphan** — it governs no declared
  business behaviour and should be flagged (remove it, or find/add the use case it belongs to).
- A rule with a use-case step but **no related test condition** is **unproven** — add a condition
  (typically the *rejection* outcome: violating input produces the required rejection) to the use
  case that invokes it.

When a rule applies across several use cases, **each** applicable use case carries a condition
proving the rule is enforced *in that interaction*. Across those conditions, the rule must be
shown to **discriminate** — satisfying input produces the permitted result **and** violating
input produces the required rejection. Business acceptance scenarios originate from these
use-case test conditions, not directly from the rule catalogue. (Focused rule-boundary tests may
still be generated, but they trace back to an applicable use-case test condition — the method does
not maintain a rule-testing island disconnected from the use case.)

## Quantified fulfilment rules

Where a transaction fulfils a demand, order, payment, allocation, quota, capacity, or other
quantified need, rules define:

- unit of measure;
- requested, fulfilled, and remaining calculations;
- partial fulfilment;
- over-fulfilment;
- rounding where material;
- multiple-result aggregation;
- reversal/reopening after cancellation or completion.

## Template impact

- `business-rule` template → statement, capability, entities, trigger, rule type, inputs,
  constraint/calculation, exceptions/authority, effect, and testability.

## Audit

Judge whether each rule states a **real, enforceable constraint**, or is a named shell with an
empty or vague statement. Read each rule's `## Statement` and `## Constraint / Decision /
Calculation`.

A real rule specifies a testable condition: *what* is constrained, *when*, and *what makes it
pass or fail* — "a staff member may not have overlapping active assignments to the same project
in the same period", "exactly one of employee/contractor". A fake rule is a plausible title over
an empty statement, a restatement of the title, or an abstract "the constraint applies" with no
condition a builder could implement or a test could violate. Check the rule is **grounded**: it
names the entities/fields it governs, a use-case actually invokes it at a concrete step, and at
least one **use-case test condition proves it** (a rule no flow applies is an **orphan**; a rule
no condition proves is **unproven**).

Report each rule as **enforceable** (a specific, testable constraint, invoked by a use-case step
and proven by a use-case test condition) or **nominal** (named but its statement is
empty/vague/circular, or an orphan/unproven rule with no governing use case or condition). A rule
whose rejection no use-case test condition could prove is not a real, governed rule.

## Checks

- Does each rule have a statement, owning capability, affected entities, trigger, the
  constraint/decision/calculation/guard, exceptions and authority, resulting effect, and a
  testability note?
  · evidence: rule files under `specs/business/rules/` or
    `capabilities/<slug>/business-rules/`
  · when: static

```check scope=plan
# Every cataloged business rule must be a REAL, filled-in spec — a real id: (not a
# <placeholder>) and every required section present and non-placeholder. $rule.specComplete
# is decided model-side (ruleSpecGaps); $rule.missingSections names what's absent so the
# finding is specific. (Replaces the hardcoded validateBusinessRules id/sections check.)
EVERY $rule IN $plan.expectedBusinessRules
THEN  $rule.specComplete IS "true"
  ELSE "business rule '${$rule.rule}' is an unfilled catalogue entry — missing/placeholder: ${$rule.missingSections}; fill its id and required sections"
```
- Are rules associated with a capability/entity rather than orphaned?
  · evidence: rule frontmatter / links
  · when: static
- Does every material validation, decision, eligibility test, calculation, exception, approval,
  and lifecycle guard in use-case flows resolve to a rule or entity lifecycle guard?
  · evidence: use cases vs. rule catalogue / entity lifecycle
  · when: static + AI review
- Is every business rule **governed by a use case** (invoked by a use-case step) and **proven by
  a use-case test condition** — no orphan rule (no use-case step) and no unproven rule (no
  related test condition)?
  · evidence: rule ↔ use-case step references + the use case's Test Conditions
  · when: static + AI review
- Where fulfilment is quantified, are requested, fulfilled, remaining, partial, overage, and
  reversal semantics defined and testable?
  · evidence: use case + rule files + entity properties
  · when: AI review
