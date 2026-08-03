# MDE Project Bootstrap

This project uses MDE.

## How MDE commands run

`mde …` commands (`mde start`, `mde evaluate`, `mde go`, `mde change`,
`mde cancel`, `mde show`, `mde start branch`, `mde release branch`, `mde review app`,
`mde review method`) are **instructions you — the AI agent — carry out**. They
are **not a CLI, program, or runtime**: there is **no `mde` executable** to
install or invoke. Do not look for one, and do not report it as missing or
broken — none is expected.

You perform a command by reading its profile under `<METHOD_SOURCE>/commands/`
and doing its steps yourself with ordinary tools:

- create/edit files directly;
- run **git** directly for branch, commit, merge, and tag — e.g. `mde start branch`, `mde go`, and `mde release branch` are git operations you carry out per the command profile (there is nothing else to call);
- the only things spawned are the method's own `<METHOD_SOURCE>/scripts/*.mjs`, run via `node`.

This `mde` file is documentation you read to resolve paths and rules — it is not
executable.

## MDE Placeholders

Two placeholders are used by rules, commands, and templates:

```text
<MDE_ROOT>        = .mde/
<METHOD_SOURCE>   = <MDE_ROOT>/method/   = .mde/method/
```

- **`<METHOD_SOURCE>`** holds the method assets the agent loads at command time: commands, rules, templates, and the scripts the agent spawns. Everything under `<METHOD_SOURCE>/` is what is available to the AI.
- **`<MDE_ROOT>`** is minimal: README + CHANGELOG + `method/`. No internal design docs live here — long-form documentation is online only.

Examples for other configurations:

```text
<MDE_ROOT> = ./           and <METHOD_SOURCE> = ./method
<MDE_ROOT> = github:AI-MDE/mde@v0.1.0/   and <METHOD_SOURCE> = github:AI-MDE/mde@v0.1.0/method
```

## Project Paths

Project-local MDE state is stored in:

```text
specs/
plans/                 the plan CONTAINER — do not read the whole tree
plans/active-plan.md   points at the one active plan
plans/<active-plan>/   the active plan — this is the plan context to read
```

Read only the **active** plan, never the whole `plans/` tree. Past plans are
history; a command loads the active plan (via `active-plan.md`) plus whatever
specific past-plan files it explicitly needs. `mde review app` is the one
exception — it deliberately spans all plans.

## Runtime Sources

Before executing any `mde ...` command, read the applicable runtime method files from:

```text
<METHOD_SOURCE>/rules/
<METHOD_SOURCE>/templates/
<METHOD_SOURCE>/commands/
<METHOD_SOURCE>/scripts/    invoked, not loaded — spawned via node
```

Read project state from:

```text
specs/application/
specs/business/
plans/active-plan.md
plans/<active-plan>/
```

## Runtime Write Boundaries

**The plan's manifest is the write boundary — there is no separately-protected zone.** A plan may
write whatever its approved scope covers, and **everything it writes is recorded in its
`output.manifest`** (the ownership boundary, planned-first). This includes `.mde/method/` files:
a plan can change the method (rules, templates, commands, features) **and** project artifacts
(`specs/`, `src/`, tests, docs) in the **same** plan — no special operation type, no read-only
method gate, no separate method-change plan. When a plan touches the method, recompiling targets
(`node .mde/method/scripts/compile-targets.mjs`) is part of that plan's build, and the changed
method files are manifest-listed and committed at `go` like any other artifact.

Writes that are **not** in the active plan's manifest are external/user-owned — the plan does not
commit, revert, or delete them. So the rule is simply: *write only what your scope covers, and
record it in the manifest.* Typical targets:

```text
specs/business/
specs/design/
.mde/method/          (when the plan's scope includes method changes)
plans/
source files
tests
documentation
```

— and, **only for a `method-change` plan**, `.mde/method/`.
## Command Rule

Before acting on an `mde ...` command:

1. Read this root `mde` boot file.
2. Resolve `<METHOD_SOURCE>`.
3. Load applicable rules from `<METHOD_SOURCE>/rules/`.
4. Load applicable templates from `<METHOD_SOURCE>/templates/` when creating or updating artifacts.
5. **Re-read the command's own profile — `<METHOD_SOURCE>/commands/<command>.md` — in full,
   before taking any action.** Do this every time the command runs, even if you read this file
   earlier in the same conversation or believe you already know its steps. Do not rely on prior
   context, a summary, or memory of an earlier read — the file may have changed, and a remembered
   paraphrase silently drops steps (this is how a required step, e.g. an executed verification
   gate, gets skipped without anyone noticing). Treat "I already know this file" as a reason to
   re-read it, not skip it.
6. Load project specs and plan files only as needed for the command.
7. Do not execute if `<METHOD_SOURCE>` is missing, unclear, or unavailable.
