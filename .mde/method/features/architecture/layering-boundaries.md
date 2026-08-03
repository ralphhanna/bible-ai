---
type: feature
id: layering-boundaries
title: Layering and boundaries
origin: mde
impacts:
  - architecture
  - server
default: n/a
---

# Layering and boundaries

## Purpose

Keep capability internals private and concerns layered, so cross-capability coupling only
happens through APIs/interfaces.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-05 (Building-block view)


## Impact on architecture

- Capabilities communicate through APIs or defined interfaces; one capability must not reach
  into another's internals.
- UI calls APIs/adapters, not persistence directly; routes/controllers delegate to
  services/use-cases; services/use-cases own business behavior; repositories/adapters own
  persistence.
- External-system boundaries follow the Integration target (app-owned interface + adapter).

## Impact on server

Generated source obeys the layering: thin routes, business logic in services, data access in
repositories, validation at boundaries (see `thin-routes-fat-services`, `boundary-validation`).

## Checks

- Do capabilities communicate only through APIs/interfaces, with no capability reaching into
  another's internals?
  · evidence: source import graph / boundaries
  · when: static
- Are layers respected (UI→API/adapter, routes→services, services own logic, repos own
  persistence)?
  · evidence: source layering
  · when: static

```check scope=plan target=server
# Boundary smell (deterministic): a capability slice must not import another slice's
# internals — capabilities talk through APIs/interfaces, not by reaching into a
# sibling's files. `$plan.crossSliceImports` is the (model-computed) set of server
# files that import a KNOWN sibling slice's dir; every member is a violation, so the
# THEN is unsatisfiable and each is reported (ref = the offending file).
EVERY $f IN $plan.crossSliceImports
THEN  $f.slice IS ""
  ELSE "server file imports another capability slice's internals — cross-slice coupling; communicate through an API/interface instead; see ref"
```
