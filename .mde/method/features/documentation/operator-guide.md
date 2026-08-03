---
type: feature
id: operator-guide
title: Operator guide (install / deploy / run)
origin: mde
impacts:
  - documentation
default: n/a
---

# Operator guide (install / deploy / run)

## Purpose

A deployable app ships a runbook for whoever installs, deploys, and operates it — covering
setup, deployment for the in-scope target, and troubleshooting of common operational issues.

## Impact on documentation

When a deployment target is in scope, the app ships an **operator guide** at
`docs/operator-guide.md` — the runbook for someone installing, deploying, and operating the
app (not developing it). It covers: prerequisites and environment/config (env vars, database
connection, ports), **install** and build steps, **deployment** (per the loaded deployment
target — e.g. folder-proxy/Apache, container, cloud), starting/stopping and health checks,
and **common operational issues / troubleshooting** (failed DB connection, migration/seed,
port conflicts, proxy/base-path). It traces to the deployment target and the app's actual
config (`.env`/config source, start scripts), not invented values. An operator guide missing
the install or deployment steps for the in-scope deployment target is incomplete; flag it.

## Checks

- When a deployment target is in scope, does `docs/operator-guide.md` exist covering
  prerequisites/config (env, database, ports), install/build, deployment for the in-scope
  deployment target, start/stop/health, and troubleshooting of common operational issues,
  traced to the app's real config and start scripts (not invented)? A guide missing the
  install or deployment steps for the in-scope target fails.
  · evidence: `docs/operator-guide.md`
  · when: static
