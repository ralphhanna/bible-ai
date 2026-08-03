---
type: feature
id: actor-and-role-model
title: Actor and role model
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Actor and role model

## Purpose

Define who participates in the business system, what outcomes they are responsible for, and what
they may do at the business level — the role ids later referenced by entity operations, use cases,
access control, and role-shaped UI.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-02 (Identify architecture stakeholders)


## Impact on business-requirements

Each actor/role defines:

- name and stable role id;
- business responsibility;
- business goals and outcomes owned;
- capabilities and use cases used;
- decisions, approvals, confirmations, or information supplied;
- key permissions and constraints at the business level;
- scope of responsibility where relevant.

Roles stay **shared** at the top level (`specs/business/roles/<role-slug>.md`), one file per role,
never duplicated inside a capability. Role ids are the join key entity operations and use cases
reference.

## Use-case participation

Every actor named by a use case must have a concrete participation:

- the primary actor initiates and has authority to pursue the business goal;
- a supporting actor supplies information, decides, approves, confirms, receives, or is notified;
- an actor with no participation is removed or the missing interaction is specified.

Where the primary actor cannot complete the outcome without another actor's approval or
confirmation, the use case states the handoff and resulting intermediate state. Do not describe an
outcome as complete when a required actor has not acted.

## Template impact

- `role` template → actor/role definition fields, including decisions/approvals and scope.
- `use-case` template → primary and supporting actors with explicit participation.

## Checks

- Does each role define responsibility, goals, capabilities used, business-level
  permissions/constraints, and material approvals/decisions?
  · evidence: `specs/business/roles/<role-slug>.md`
  · when: static
- Are roles shared at the top level and not duplicated inside capabilities?
  · evidence: roles directory layout
  · when: static
- Does every actor named in a use case participate explicitly in the flow, approval,
  confirmation, notification, or decision?
  · evidence: use-case actor list vs. main/alternate flows
  · when: static + AI review
- Does the primary actor have authority to achieve the stated outcome, or is the required handoff
  and intermediate state explicit?
  · evidence: role responsibility + use-case flow/outcome
  · when: AI review
