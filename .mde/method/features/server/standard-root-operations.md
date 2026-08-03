---
type: feature
id: standard-root-operations
title: Standard root operations
origin: mde
impacts:
  - server
  - api-design
default: n/a
---

# Standard root operations

## Purpose

Every generated app exposes a stable set of root-level operations so tools, reviewers, CI, and
automation can start and verify it **without knowing the stack** — a stack-neutral automation
contract.

## Impact on server

Required operation keys (when applicable): `install`, `start`, `dev`, `build`, `test`,
`test:unit`/`test:api`/`test:ui`, `migrate`, `seed`, `db:reset`, `db:schema-dump` (when
persistence is in scope). Node stacks use `package.json` scripts; non-Node stacks commit
root-discoverable scripts/targets. The names are a contract — not buried in prose; placeholder
`echo`/`exit 0` no-ops do not satisfy it.

**`db:schema-dump` is intentionally stack-specific, not a hardcoded command.** It maps to
whatever the chosen database's own tooling produces a real, structural schema dump, or the
ORM's own introspection command where one exists. The method does not assume a database
engine anywhere; the tech-stack selection at design time records the correct command for
`db:schema-dump` in `tech-stack.md`'s Operations Map, the same way it already records
`migrate`/`seed`/`db:reset`.

## Impact on api-design

The exact command mapping is recorded in `specs/design/tech-stack.md` (the operations map,
written at stack selection).

## Checks

- Does `tech-stack.md` record an operations map, and do the referenced root commands actually
  exist and perform the operation (install/start/build/test required when applicable; dev when
  a watch mode exists; migrate/seed/db:reset when a DB is used)?
  · evidence: `$techStack.operations` (below)
  · when: static

```check scope=plan
EVERY $o IN $techStack.operations
THEN  $o.ok IS "true"
ELSE  "operation '${$o.name}' is missing from tech-stack.md's Operations Map, references a package.json script that doesn't exist, or is a placeholder no-op (echo/exit 0)."
```
