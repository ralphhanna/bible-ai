---
id: TEMPLATE-CHANGELOG
type: template
title: Changelog
status: active
source_path: method/templates/changelog.template.md
artifact: changelog
used_by_commands:
- mde evaluate
- mde release
---

# Changelog

Shape for the project's root `CHANGELOG.md`. Follows **Keep a Changelog** (the standard) with
**semver** versions, written **for humans**, newest first. The **plan is the unit of change**:
`mde evaluate` writes the active plan's entry under `## [Unreleased]`; `mde release` renames
`[Unreleased]` to the new version and opens a fresh one. See the `changelog` capability for policy
(it is opt-in via `changelog.track` in `mde-policy.md`).

> The MDE method keeps its **own** separate `.mde/CHANGELOG.md` — a distinct product, same shape.

```markdown
# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/); versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- <new capability / command / page / feature> — one human line; what the reader gains. (plan <id>)

### Changed
- <changed behaviour / rule / vocabulary> — what is now different, and what to relearn. (plan <id>)

### Deprecated
- <still works but going away> — and the replacement. (plan <id>)

### Removed
- <gone> — and what to use instead. (plan <id>)

### Fixed
- <bug fixed> — the symptom a user would have seen. (plan <id>)

### Security
- <vulnerability addressed>. (plan <id>)

## [0.1.0] — 2026-01-31

### Added
- Initial release.
```

## How entries are written

- **Change type is the primary axis** — one of the six standard sections (Added / Changed /
  Deprecated / Removed / Fixed / Security). Derive it from the plan's manifest `action`
  (create → Added, modify → Changed, delete → Removed) refined by the plan's intent (a fix → Fixed,
  a deprecation → Deprecated, a security change → Security).
- **One line per change, for humans** — say what the *reader/user* gains or must relearn, not which
  file moved. Replace jargon with plain language. (e.g. *"Start a branch with `mde start branch`
  (replaces `mde start version`)"* — not *"added start.branch.md, deleted version.start.md"*.)
- **Trace to the plan** — end each line with the plan id, so the entry links back to its scope,
  discussion, and manifest evidence.
- **Empty sections are omitted** — only include the change-type sections that have entries.
- **Group by area when long** — within a section, optionally sub-group by area/audience (commands,
  docs, UI, API, schema…) using the manifest `outputType`, for releases with many entries.

## Rules

- Newest version first; `## [Unreleased]` always at the top.
- Every version heading is `## [<version>] — <YYYY-MM-DD>` and is linkable.
- The unit is the **plan** — whatever a plan changed is its entry (a BA plan logs a requirement
  change; a method-change plan logs an added command or a changed rule). No per-file entries.
- `mde release` only **accumulates** (rename `[Unreleased]` → version, open a fresh one); it authors
  no new content.
