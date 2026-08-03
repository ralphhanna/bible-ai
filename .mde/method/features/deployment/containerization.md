---
type: feature
id: containerization
title: Containerization (Docker)
origin: mde
impacts:
  - deployment
default: n/a
---

# Containerization (Docker)

## Purpose

The application builds into a **container image** by a committed, reproducible recipe — so it
runs the same way on any host, with no "works on my machine" drift.

## Impact on deployment

A committed container recipe (e.g. `Dockerfile` + `.dockerignore`, or the stack equivalent)
builds the app into an image using the project's **standard root operations** (install → build),
runs it via the standard `start`, exposes the documented port(s), and externalizes
configuration/secrets as environment (never baked into the image). A multi-service local bring-up
(app + database) is provided where the app needs one (e.g. `docker-compose.yml`) and matches the
one-command DB bring-up the persistence docs describe. Images are reproducible (pinned base, no
undeclared dependencies).

## Checks

- Is there a committed container recipe that builds the app via the standard root operations,
  runs via `start`, exposes the documented ports, and externalizes config/secrets (not baked in)?
  · evidence: Dockerfile / compose vs. the operations map
  · when: static
- Where the app needs a database, is a multi-service local bring-up provided and consistent with
  the documented install → migrate → seed → start path?
  · evidence: compose file vs. persistence run docs
  · when: static
