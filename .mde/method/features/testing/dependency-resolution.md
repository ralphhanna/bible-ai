---
type: feature
id: dependency-resolution
title: Dependency resolution (static)
origin: mde
impacts:
  - testing
  - server
default: n/a
---

# Dependency resolution (static)

## Purpose

Every `import`/`require` in generated source resolves to a **declared** dependency — using a
package not in the manifest is a failure, even if the file `--check`s clean.

## Impact on testing

A static check: every `import`/`require` resolves to a dependency declared in the project
manifest (`package.json`, `pyproject.toml`, `*.csproj`, …). Any undeclared package is a
failure, not a deferral. This runs in every environment and is never deferred.

## Impact on server

Generated source must only use declared dependencies.

## Checks

- Does every import/require in generated source resolve to a declared manifest dependency?
  · evidence: dependency-resolution check output
  · when: static
