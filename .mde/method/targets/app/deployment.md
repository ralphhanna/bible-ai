---
type: target
id: TARGET-DEPLOYMENT
title: Deployment Target Profile
applies_when:
  - a plan creates or changes how the application is containerized, orchestrated, or deployed to an environment
  - a plan adds or changes container images, orchestration manifests, or cloud/deploy configuration
---

# Deployment Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

The application must be **runnable in a target environment by a repeatable, documented path** —
not by undocumented manual steps. Deployment concerns (containerization, orchestration, cloud
provisioning) are explicit, reproducible, and consistent with the project's stack and standard
root operations.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| deploy-config | deploy/ | — | always |
| operator-guide | docs/operator-guide.md | — | always |

## Composed behavior

### Apache folder deployment (reverse-proxy, not ports)  `[feature: apache-folder-deploy]`

A plan that deploys to a Linux host produces an **Apache reverse-proxy configuration** that maps each
public folder to the surface's internal port, e.g.:

```apache
# https://host/<app>/        -> app web (internal :WEB_PORT)
ProxyPass        /<app>/api/  http://127.0.0.1:API_PORT/<app>/api/
ProxyPassReverse /<app>/api/  http://127.0.0.1:API_PORT/<app>/api/
ProxyPass        /<app>/      http://127.0.0.1:WEB_PORT/<app>/
ProxyPassReverse /<app>/      http://127.0.0.1:WEB_PORT/<app>/
# https://host/workbench/    -> workbench (web + its /api)
ProxyPass        /workbench/  http://127.0.0.1:8081/workbench/
ProxyPassReverse /workbench/  http://127.0.0.1:8081/workbench/
```

Ports come from the app's `.env` (the source of truth — same values the dev proxy uses). The deploy
is documented as a one-host, multi-app folder layout. No raw app/api/workbench port is exposed
publicly — only Apache's 80/443.

### Cloud deployment  `[feature: cloud-deployment]`

The path from a built image/artifact to a running cloud environment is committed and documented:
the **deploy pipeline** (CI/CD workflow or committed deploy scripts), the **provisioning** of the
required cloud resources (as infrastructure-as-code where practical, not hand-clicked), the
**environment configuration/secrets** sourced from the cloud's secret store (never committed), and
a documented **rollback**. Environments (dev/stage/prod) are parameterized from one definition.
The deploy uses the same image/build the standard root operations produce — no separate,
divergent build path.

### Containerization (Docker)  `[feature: containerization]`

A committed container recipe (e.g. `Dockerfile` + `.dockerignore`, or the stack equivalent)
builds the app into an image using the project's **standard root operations** (install → build),
runs it via the standard `start`, exposes the documented port(s), and externalizes
configuration/secrets as environment (never baked into the image). A multi-service local bring-up
(app + database) is provided where the app needs one (e.g. `docker-compose.yml`) and matches the
one-command DB bring-up the persistence docs describe. Images are reproducible (pinned base, no
undeclared dependencies).

### Orchestration (Kubernetes)  `[feature: orchestration]`

Orchestration manifests (Kubernetes YAML / Helm chart, or the stack equivalent) are committed and
declare: the deployment/replicas, the **service** exposing it, **config and secrets** sourced from
config maps / secret refs (never inlined), **health/readiness probes** wired to the app's health
endpoint, and **resource requests/limits**. The image referenced is the one from the
containerization recipe. Manifests are environment-parameterized (no hardcoded per-environment
values); nothing requires manual `kubectl edit` to run.

## Validation checks

### Apache folder deployment (reverse-proxy, not ports)  `[feature: apache-folder-deploy]`

- Does the deployment produce an **Apache reverse-proxy config** mapping public folders
  (`/<app>/`, `/<app>/api/`, `/workbench/`) to internal ports — serving by folder, not by exposed
  port?
  · evidence: the Apache vhost/proxy config in the deploy artifacts
  · when: static
- Do the proxied folders match the base paths the app/workbench are built for (the
  `base-path-routing` capability), and do the ports come from `.env` (same as dev)?
  · evidence: base path ↔ ProxyPass folder consistency; ports sourced from `.env`
  · when: static
- Is the routing the **same model as dev** (workbench-as-proxy) — no separate dev-only vs deploy-only
  scheme?
  · evidence: one base-path model documented for both dev and Apache
  · when: static

### Cloud deployment  `[feature: cloud-deployment]`

- Is the cloud deploy a committed, documented pipeline (CI/CD or scripts) from the built artifact
  to a running environment, with provisioning as IaC where practical and a documented rollback?
  · evidence: pipeline/IaC/deploy docs
  · when: static
- Are environment config and secrets sourced from the cloud secret store (not committed), and are
  environments parameterized from one definition?
  · evidence: deploy config / secret references
  · when: static

### Containerization (Docker)  `[feature: containerization]`

- Is there a committed container recipe that builds the app via the standard root operations,
  runs via `start`, exposes the documented ports, and externalizes config/secrets (not baked in)?
  · evidence: Dockerfile / compose vs. the operations map
  · when: static
- Where the app needs a database, is a multi-service local bring-up provided and consistent with
  the documented install → migrate → seed → start path?
  · evidence: compose file vs. persistence run docs
  · when: static

### Orchestration (Kubernetes)  `[feature: orchestration]`

- Are orchestration manifests committed and declarative — deployment + service + config/secret
  refs + health/readiness probes + resource requests/limits — referencing the built image, with no
  inlined secrets?
  · evidence: k8s/Helm manifests
  · when: static
- Are per-environment values parameterized (not hardcoded), so deploying to another environment
  needs no manual manifest edits?
  · evidence: manifests / values files
  · when: static
