---
type: feature
id: cloud-deployment
title: Cloud deployment
origin: mde
impacts:
  - deployment
default: n/a
---

# Cloud deployment

## Purpose

Getting the application into its cloud target is a **documented, repeatable pipeline**, not a
sequence of console clicks — so a deploy is reproducible and a rollback is possible.

## Impact on deployment

The path from a built image/artifact to a running cloud environment is committed and documented:
the **deploy pipeline** (CI/CD workflow or committed deploy scripts), the **provisioning** of the
required cloud resources (as infrastructure-as-code where practical, not hand-clicked), the
**environment configuration/secrets** sourced from the cloud's secret store (never committed), and
a documented **rollback**. Environments (dev/stage/prod) are parameterized from one definition.
The deploy uses the same image/build the standard root operations produce — no separate,
divergent build path.

## Checks

- Is the cloud deploy a committed, documented pipeline (CI/CD or scripts) from the built artifact
  to a running environment, with provisioning as IaC where practical and a documented rollback?
  · evidence: pipeline/IaC/deploy docs
  · when: static
- Are environment config and secrets sourced from the cloud secret store (not committed), and are
  environments parameterized from one definition?
  · evidence: deploy config / secret references
  · when: static
