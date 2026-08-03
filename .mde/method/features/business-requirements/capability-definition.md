---
type: feature
id: capability-definition
title: Capability definition
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Capability definition

## Purpose

Capabilities are the vertical slices that organize the business/application — the unit that
later drives the API boundary, source-code module, and test scope. **"Capability" is the term;
do not relabel capabilities as "areas" or rename them** — refer to each by its defined name
(e.g. `employee-records`, `performance-management`), never an invented grouping label.

## Impact on business-requirements

Each capability defines: capability ID, name, business purpose, primary actors, business
outcomes, primary entity (when applicable), related entities/rules/use-cases/pages, related
APIs or integration boundaries when relevant, and implementation/design status. A capability
may use many entities but identifies a **primary** entity when that helps define boundaries.
One file per capability under `specs/business/capabilities/<slug>/overview.md` — never a flat
`capabilities.md`.

## Template impact

- `capability-overview` template → the capability definition fields.

## Audit

Judge whether each capability spec says something **real and specific about this business**,
not generic boilerplate that would fit any app. Unlike UI/server audits, there is no running
app to drive — read the spec against the business intent it claims to capture.

For each capability: does it define concrete, non-obvious behaviour (real operations,
constraints, and decisions a builder could implement unambiguously), or is it filler — a
template with every section present but the content vague ("manages records", "supports the
business")? Cross-check that its use cases, rules, and entities actually cohere: a capability
whose stated purpose is not reflected in any of its operations or rules is a shell. Watch for
copy-paste sameness across capabilities (the tell of generation optimising for "all sections
filled" over meaning).

Report each capability as **substantive** (specific, coherent, implementable) or **generic**
(sections present but hollow / boilerplate / internally inconsistent). A complete-looking
template is not a substantive requirement.

## Checks

- Does each capability define purpose, primary actors, outcomes, and (when applicable) a
  primary entity, with related entities/rules/use-cases/pages linked?
  · evidence: `specs/business/capabilities/<slug>/overview.md`
  · when: static
- Are capabilities specific (not missing or too generic), each with a business outcome?
  · evidence: capability overview files
  · when: static
