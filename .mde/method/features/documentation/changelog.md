---
type: feature
id: changelog
title: Changelog (per-plan, accumulated at release)
origin: mde
impacts:
  - documentation
default: n/a
---

# Changelog

## Purpose

A human-readable record of what changed in the project, **the plan being the unit of change**.
When changelog tracking is on, every plan contributes one entry; `mde release` accumulates the
entries into the released version. This is the **project's** changelog (app + specs) — the MDE
method keeps its **own** separate `.mde/CHANGELOG.md` (a distinct product), not governed here.

## Defaults (soft — overridable in `specs/design/mde-policy.md`)

- `changelog.track` — **default `off`**. Opt-in; a project turns it on in `mde-policy.md`. When
  off, no changelog is written and no check applies.
- `changelog.format` — **default `keep-a-changelog`** (Added / Changed / Fixed / Removed sections
  under version headings, an `## [Unreleased]` section at the top).
- versioning scheme — **default `semver`** (`MAJOR.MINOR.PATCH`).

Set these under `capabilitySettings.changelog` in `mde-policy.md` to override.

## Impact on documentation

When `changelog.track: on`:
- **`mde evaluate` writes the plan's entry** into the root `CHANGELOG.md` under `## [Unreleased]`,
  derived from the plan's scope/intent. It is a **candidate artifact** in `output.manifest`, so the
  **user reviews and edits it** before `go` — not hidden until commit. The unit is the plan
  (whatever the plan changed is its entry — a BA plan logs a requirement change, a build plan logs
  a capability). There is no per-file or per-release unit.
- **`mde release` accumulates** — it renames the `## [Unreleased]` section to `## [<version>] —
  <date>` under the new version/tag (per the release policy's `tagScheme`), and opens a fresh empty
  `## [Unreleased]`. Release authors no new content; it only rolls up what plans already wrote.

## Checks

- When `changelog.track: on`, did `mde evaluate` write/update this plan's entry under
  `## [Unreleased]` in the root `CHANGELOG.md` (present in the manifest as a candidate artifact)?
  · evidence: `CHANGELOG.md` `[Unreleased]` section + the manifest entry for it
  · when: static
- When `changelog.track: on`, does `mde release` move `[Unreleased]` into a dated version section
  (semver per policy) and leave a fresh `[Unreleased]` — accumulating, not re-authoring?
  · evidence: released `CHANGELOG.md` version heading vs. the released plans
  · when: static
