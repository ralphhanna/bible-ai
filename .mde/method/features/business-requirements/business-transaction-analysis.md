---
type: feature
id: business-transaction-analysis
title: Business transaction analysis
origin: mde
impacts:
  - business-requirements
  - ui-design
  - api-design
default: n/a
---

# Business transaction analysis

## Purpose

Confirm that a use case expresses a real business objective and a coherent business interaction
rather than a generic record operation. Identify the business condition that starts the work, the
business object that carries that condition, the actor's goal, the intended business outcome, the
high-level steps, and the **important situations and results that become test conditions**.

Detailed application mechanics — per-step state-change tables, API/UI behaviour, executable
examples — belong to the **use-case realization in design**, not the business use case.

A structurally complete use case is still defective when its trigger disappears from the main
flow or its outcome only says that a record was created without explaining the business result.

## Impact on business-requirements

For every non-trivial use case, analyze and reconcile:

- **Business condition / need** — the real situation that causes the transaction.
- **Driving object** — the request, demand, case, order, application, review, work item, or other
  business object that represents and carries that need through the flow.
- **Result object** — the record created or changed to achieve the goal.
- **Supporting objects** — records selected, consulted, or validated.
- **Impacted objects** — records, balances, totals, availability, or lifecycle states materially
  changed by the transaction.
- **Business state change** — the before/change/after effect for the driving, result, and impacted
  objects.
- **Outcome reconciliation** — how the original business condition is resolved, partially
  resolved, deferred, rejected, or remains open.

The use case's trigger, preconditions, main flow, alternate flows, rules, objects, data changes,
and outcome must tell one causally connected story. A trigger naming one business need followed by
an unconstrained flow over unrelated records is a defect.

## Driving-object discovery

`Business Objects Involved` is not a flat noun list. Each object is classified as one or more of:

| Role | Meaning |
|---|---|
| Driving | Carries the business need and anchors the transaction |
| Result | Created or changed to achieve the goal |
| Supporting | Selected, consulted, or validated |
| Impacted | Materially changed as a consequence |

When a trigger, rule, flow step, quantity, or outcome refers to a durable concept with identity,
state, history, independent quantities, or lifecycle, determine whether the entity model is
missing a business object. Examples include demand, request, application, approval, case, order,
claim, reservation, or allocation need. Do not force such concepts into an existing result entity
merely because that entity is convenient to persist.

## Business-goal test

A use-case goal states the business result, not merely the storage or lifecycle operation.

Weak:

- Create a project assignment.
- Update a client.
- Change the review status.

Stronger:

- Fulfil all or part of an approved project staffing demand.
- Correct the client's current commercial profile.
- Complete and acknowledge the employee's performance review.

Record creation or status change belongs in the transaction result and state-change analysis.

## Trigger and use-case separation

A use case has one primary triggering business condition. Different triggers that require a
different driving object, starting decision, actor goal, or outcome normally become separate use
cases. Alternate flows vary the same transaction; they do not introduce a later lifecycle goal or
a materially different business transaction.

## Quantified fulfilment

Where a need is measured, define:

- requested amount and unit;
- fulfilled amount;
- remaining amount;
- whether fulfilment is partial or additive;
- whether several result records may fulfil one need;
- whether one result may fulfil several needs;
- over-fulfilment policy;
- reconciliation after cancellation, reversal, or completion.

This applies to staffing demand, orders, payments, capacity, inventory, budget, claims, quotas,
and similar transactions.

## Situations become test conditions

Complex or quantified transactions surface their important situations as **test conditions** on
the use case (situation + one expected result) — successful completion, partial fulfilment,
exception handling, cancellation, insufficient capacity, unauthorized participation. These
capture the business meaning in a form testing can prove; concrete before/change/after values and
executable examples are added in the design realization, not here.

For example, *"the candidate has only 40% available against a 60% demand"* becomes a test
condition whose expected result is *"a 40% assignment is created and the demand remains open for
20%"* — a business outcome, stated without API/table mechanics.

## Template impact

- `use-case` template → driving/result/supporting/impacted object roles and the **Test Conditions**
  section (important situations and their expected results). Per-step state-change tables and
  representative scenarios move to the design realization.
- `entity` template → no new section; missing-object findings update the existing entity model.

## Checks

- Does the main flow preserve the business condition named by the trigger and explicitly resolve,
  reduce, defer, reject, or record it in the outcome?
  · evidence: trigger + main flow + outcome
  · when: AI review
- Is the driving business object identified and carried through the transaction, or is its absence
  explicitly justified because the trigger is an immediate event with no durable business object?
  · evidence: use-case object roles + entity model
  · when: AI review
- Is the business goal expressed as a business outcome rather than only a record create/update or
  status-change operation?
  · evidence: Business Goal vs. Data Created / Changed / Viewed
  · when: AI review
- Are result, supporting, and materially impacted objects identified, with their resulting states
  reconciled?
  · evidence: object roles + state-change table + outcome
  · when: AI review
- Do durable concepts implied by needs, quantities, history, and lifecycle resolve to entities, or
  have a documented reason not to?
  · evidence: use-case wording vs. entity model + open questions
  · when: AI review
- Where fulfilment is quantified, are requested, fulfilled, remaining, multiplicity, and reversal
  semantics defined?
  · evidence: use case + rules + entity properties
  · when: AI review
- Does each complex or quantified transaction surface its important situations as **test
  conditions** (situation + one expected business result) that agree with the use case, entity
  cardinalities, lifecycle, and business rules — rather than forcing executable examples or
  per-step state tables into the business use case?
  · evidence: use-case Test Conditions section
  · when: static + AI review
