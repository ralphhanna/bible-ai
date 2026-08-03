---
type: template
mergePolicy: user-owned
---

# MDE Policy

Project-wide settings every `mde` command consults. **Edit the values in the block
below — it is the only place settings live.** Seeded at init to
`specs/design/mde-policy.md`; if absent, commands use these same defaults. Release
settings live separately in `release-policy.md`.

```yaml
policy:
  # also commit after `mde start` / `mde evaluate` (go always commits regardless)
  autoCommit: off          # on | off

  # version-branch name prefix; "" = branch is exactly <name>, "mde/" = old style
  branchPrefix: ""

  # trace load/token cost to plans/<plan>/debug.log every command
  debug: off               # on | off

# Changelog: the plan is the unit of change. When on, `mde evaluate` writes this plan's entry
# under `## [Unreleased]` in root CHANGELOG.md (a reviewable candidate artifact); `mde release`
# accumulates [Unreleased] into a dated version section. MDE's own `.mde/CHANGELOG.md` is separate.
changelog:
  track: off               # on | off  (opt-in; default off)
  format: keep-a-changelog # keep-a-changelog | simple

# Optional per-capability overrides. Capabilities state their own defaults in prose;
# set a value here to override one for this application. This is soft guidance the AI
# applies by judgment (capability default -> this override -> any artifact/entity
# override) — not an enforced schema. Omit the block entirely to use every default.
# Keys are capability ids; values are that capability's named parameter(s).
capabilitySettings:
  coverage-threshold:
    minCoverage: 75         # minimum line-coverage % an implementation plan must meet
  meaningful-seed-data:
    minRecords: 30          # minimum seeded records per primary entity
  entity-modeling:
    surrogate_key_strategy: short-unique-id
```

## Notes

<!-- User-guarded zone. -->
