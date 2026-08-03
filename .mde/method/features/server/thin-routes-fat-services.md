---
type: feature
id: thin-routes-fat-services
title: Thin routes, fat services
origin: mde
impacts:
  - server
  - api
default: n/a
---

# Thin routes, fat services

## Purpose

Keep business behavior in services/use-cases and data access in repositories — routes and UI
handlers stay thin.

## Impact on server

Routes/controllers remain thin. Business logic belongs in service/use-case/domain logic, not
UI handlers or route bodies. Data access belongs in repositories/adapters, not pages or route
bodies.

## Impact on api

API routes delegate to services/use-cases; they do not embed business logic or direct
persistence.

## Checks

- Are routes/controllers thin, with business logic in services and data access in repositories
  (not in route bodies or UI handlers)?
  · evidence: source layering
  · when: static
