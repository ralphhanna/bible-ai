# Feature-Composed Targets

This experimental target tree is generated from `method/features/**` using each feature
file's YAML `impacts:` list. Active runtime targets remain under `method/targets/`.

For each target:

1. Listed features contribute their `## Impact on <target>` sections.
2. Applicable feature `## Checks` become target review checks.
3. Feature `## Template slots` identify required templates or mount points.
4. The stricter compatible requirement wins when features overlap.
5. Conflicts must be resolved in the feature files, not hidden in the target.

The target files reference feature sources instead of duplicating their full prose, keeping
feature behavior authoritative and recomposition auditable.

## Targets

- [API](api.md)
- [Architecture](architecture.md)
- [Business Requirements](business-requirements.md)
- [Design](design.md)
- [Documentation](documentation.md)
- [Integration](integration.md)
- [Persistence](persistence.md)
- [Prototyping](prototyping.md)
- [Source Generation](server.md)
- [Testing](testing.md)
- [Web UI](web-ui.md)
