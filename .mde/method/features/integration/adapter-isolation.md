---
type: feature
id: adapter-isolation
title: Adapter isolation
origin: mde
impacts:
  - integration
  - architecture
default: n/a
---

# Adapter isolation

## Purpose

Capability code depends on an application-owned interface; a dedicated adapter owns the vendor
contract — so vendor types never leak into domain code.

## Impact on integration

Capability domain/services depend on an application-owned interface, while a **dedicated
adapter** owns vendor/transport types, mapping, authentication, retries, and external error
translation. Direct vendor coupling in domain code is a failure.

## Impact on architecture

The adapter is the integration boundary in the architecture + interaction diagrams (see
`architecture-diagram`, `interaction-diagrams`).

## Checks

- Does capability code depend on an app-owned interface (not vendor types), with a dedicated
  adapter owning transport/mapping/auth/retries/error-translation?
  · evidence: source boundaries (domain vs. adapter)
  · when: static
