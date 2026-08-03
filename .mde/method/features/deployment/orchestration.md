---
type: feature
id: orchestration
title: Orchestration (Kubernetes)
origin: mde
impacts:
  - deployment
default: n/a
---

# Orchestration (Kubernetes)

## Purpose

When the application is deployed to an orchestrator, its runtime shape — replicas, config,
secrets, health, resources — is declared **as committed manifests**, not configured by hand in a
cluster.

## Impact on deployment

Orchestration manifests (Kubernetes YAML / Helm chart, or the stack equivalent) are committed and
declare: the deployment/replicas, the **service** exposing it, **config and secrets** sourced from
config maps / secret refs (never inlined), **health/readiness probes** wired to the app's health
endpoint, and **resource requests/limits**. The image referenced is the one from the
containerization recipe. Manifests are environment-parameterized (no hardcoded per-environment
values); nothing requires manual `kubectl edit` to run.

## Checks

- Are orchestration manifests committed and declarative — deployment + service + config/secret
  refs + health/readiness probes + resource requests/limits — referencing the built image, with no
  inlined secrets?
  · evidence: k8s/Helm manifests
  · when: static
- Are per-environment values parameterized (not hardcoded), so deploying to another environment
  needs no manual manifest edits?
  · evidence: manifests / values files
  · when: static
