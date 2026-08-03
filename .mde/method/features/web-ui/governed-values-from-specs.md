---
type: feature
id: governed-values-from-specs
title: Governed values from specs
origin: mde
impacts:
  - web-ui
  - business-requirements
default: n/a
---

# Governed values from specs

## Purpose

Any categorical/governed value a page shows or seeds — roles, statuses, enums, departments —
uses the vocabularies defined in business specs, not invented alternatives.

## Impact on web-ui

Governed values come from entity `## Storage View` enums/CHECK values,
`specs/business/roles/`, and business rules — not fabricated. Free-text (names, descriptions,
dates) may be fabricated. A page/dataset listing a status or role the business specs don't
define is drift, even if it looks realistic. Holds by construction because prototype data is
model-derived (see `model-derived-data-pipeline`).

## Impact on business-requirements

The governed vocabularies are defined upstream in business specs (entities, roles, rules); this
capability consumes them.

## Checks

- Do the page's governed values (roles/statuses/enums/departments) all resolve to values
  defined in business specs (not invented)?
  · evidence: page/dataset values vs. business-spec vocabularies
  · when: static
