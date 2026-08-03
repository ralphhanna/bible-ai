---
type: feature
id: meaningful-seed-data
title: Meaningful seed data
origin: mde
impacts:
  - persistence
default: n/a
---

# Meaningful seed data

## Purpose

Seed data is the **single dataset** the application is demonstrated and tested against — the one
source other capabilities consume (projected into fake-API JSON, rendered on listing pages). This
capability **owns** what that dataset is and how much of it there is; other capabilities only say
how to *use* it.

## Impact on persistence

Seed data (`db/seeds/*`) is **meaningful** and **conforms to the physical model** (Storage Views,
enums); governed values come from the model, only free-text is fabricated. It carries a
**realistic volume**: at least the configured `minRecords` floor (**default 30**) per primary
entity, so listing/filter/sort/paging are meaningful downstream. Set
`capabilitySettings.meaningful-seed-data.minRecords` in `specs/design/mde-policy.md` to override
for this application. Generated from the model — never hand-authored row by row.

## Checks

- Is seed data meaningful, conforming to the physical model, with at least the configured
  `minRecords` floor (default 30) per primary entity?
  · evidence: `db/seeds/*` vs. Storage Views + per-entity row counts
  · when: static
