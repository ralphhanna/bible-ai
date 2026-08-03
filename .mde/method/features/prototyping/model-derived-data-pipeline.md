---
type: feature
id: model-derived-data-pipeline
title: Model-derived data pipeline (derive everything, author nothing)
origin: mde
impacts:
  - web-ui
default: n/a
---

# Model-derived data pipeline

## Purpose

When a capability's real `/api/<cap>` does not yet exist, the UI is served by a **fake JSON API**
as a fallback (see `data-source-switch`). That fallback data must **not** be hand-authored — that
would reintroduce the exact model-drift this approach exists to kill. One source, mechanically
projected:

```text
business model (entities + Storage Views, enums)
        │  generated
        ▼
   sample seed data            db/seeds/*  (conforms to the physical model)
        │  ONE generated transform script (tools/fake-api/), not per-page JSON
        ▼
   JSON in API-response shape  (what the real API returns)
        │  served by the fake JSON API
        ▼
   live frontend               src/web/src/pages/  (identical in prototype + production)
```

## Impact on web-ui

Applies whenever UI is in scope and a capability is served by the fake JSON API fallback (its
real `/api/<cap>` not yet built). It is not tied to a "prototype" request — it is how the UI gets
real-shaped data before the real API exists.

- The **model is the only source of truth**; seed data is its first projection, the JSON is a
  second projection of the *same* seed data.
- **One transform script**, never per-page hand-written JSON — N hand-authored files would be
  N drift points.
- **Make-or-break rule:** if seed, transform, or JSON is hand-crafted, the strategy backfires
  (a third drift source: model ↔ seed ↔ fake-JSON). **Generate; do not author.**
- Governed values (statuses, roles, enums) come from the model by construction; only free-text
  (names, descriptions) may be fabricated.

## Template impact

- **fake-API transform** under `tools/fake-api/` (one generated transform script).
- **seed data** under `db/seeds/`.

## Checks

- Is the fake-API fallback data **generated** from the model (`db/seeds/` → one transform), with
  no hand-authored JSON and no invented governed values?
  · evidence: presence of the transform script; absence of hand-edited per-page JSON
  · when: static
- Is the fake-API pipeline **runnable** — a script regenerates the JSON from `db/seeds/`?
  · evidence: the regenerate script + its output
  · when: static
