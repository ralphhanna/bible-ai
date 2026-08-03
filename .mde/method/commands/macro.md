---
type: command
command: mde run
loads:
  - rules/core/*
  - rules/workflow/*
  - the macro YAML file
  - per-step plan command context (delegated to mde start/evaluate/go)
---

# run

## Purpose

Run an executable MDE macro.

A macro is a YAML orchestration definition that sequences normal MDE plan commands and macro-runner commands to produce an executable, resumable, auditable workflow while preserving MDE plan governance.

## Command

```text
mde run <macro-file>
```

`mde run` is executed by the runner **`node .mde/method/scripts/run-macro.mjs <macro-file>`**
— an mjs step-executor (not an interpreted prose flow). It drives a real agent per MDE step,
sharing the goal loop's executor layer (`.mde/goal-loop/agent-runner.mjs`) and its session
model: an **Agent 0** preloads the method's common context once, then **each plan block runs
in one forked session** (its `mde start → evaluate → go` steps share context), while an
**audit/review step forks the baseline as a fresh judge** (never the plan's build session).
Runner commands (`prompt`, `pause`, `show`, `git`) are handled by the runner; `mde` commands
are delegated to the agent. Flags: `--dry-run`, `--from <stepId>`, `--cwd <dir>`,
`--agent claude|codex`, `--no-preload`.

`mde run` is **idempotent / resumable**: re-running a partly-done macro continues from the
first incomplete step (macro status derives from plan status — re-running *is* resuming; use
`--from <stepId>` to force a start point).

A macro file is generated from a built repo's plans by
`node .mde/method/scripts/generate-macro.mjs` (see that script), then replayed with
`mde run <macro-file>`.

## Macro Runner Commands

```text
prompt <name> <title> <default>
pause
show <target>
git <operation>
```

## MDE Commands Allowed in Macro Steps

```text
mde start
mde evaluate
mde go
```

## `prompt` Command

The `prompt` command asks the user for a value and stores it as a macro variable.

Grammar:

```text
prompt <name> <title> <default>
```

Example:

```yaml
- id: prompt-title
  command: prompt title "Application title" "HR Management System"
```

Later steps may reference the value using `$title`:

```yaml
- id: start-ba
  command: mde start
  input: >
    Conduct business analysis for $title.
```

If the user accepts the default, `$title` resolves to `HR Management System`.

## Macro YAML Shape

```yaml
id: string
title: string
version: number

run:
  mode: fasttrack | standard | expert
  stop_on_error: boolean
  auto_approve: boolean

plans:
  - id: string
    title: string
    steps:
      - id: string
        command: string
        input: string
        levels: string[]
```

## Example

```yaml
id: hr-demo-fullstack
title: HR Demo Full Stack Macro
version: 1

run:
  mode: standard
  stop_on_error: true
  auto_approve: false

plans:
  - id: macro-inputs
    title: Macro Inputs
    steps:
      - id: prompt-title
        command: prompt title "Application title" "HR Management System"

      - id: prompt-stack
        command: prompt stack "Technology stack" "node-express-react-postgres, plain SQL no ORM"

  - id: ba-hr-system
    title: Business Analysis for $title
    steps:
      - id: start-ba
        command: mde start
        input: >
          Conduct business analysis for $title for a consulting organization.
          Capture the domain, capabilities, business rules, roles, workflows,
          entities, and use cases.

      - id: evaluate-ba
        command: mde evaluate

      - id: approve-ba
        command: pause
        input: Review the business analysis impact and approve execution.

      - id: execute-ba
        command: mde go

      - id: show-ba-impact
        command: show impact
        levels: [standard, expert]

      - id: commit-ba
        command: git commit
        input: Complete business analysis for $title
```

## Rules

- Macro orchestrates plans; it does not replace plans.
- Plans own execution status, outputs, evidence, and goal validation.
- Macro status is derived from plan status.
- Macro steps use commands. There is no separate step `type`.
- MDE commands are delegated to MDE.
- `prompt`, `pause`, `show`, and `git` are macro-runner commands, not MDE lifecycle commands.
- `prompt` creates macro variables such as `$title`.
- A variable must be created by `prompt` or otherwise supplied before `$name` can be substituted.
- `show` is read-only.
- `pause` is interaction/control only.
- `git` is repository control only and must be bounded.
- No macro-level requirements input is allowed; work input belongs to plan/step level.
- No separate verify command is introduced. Goal validation belongs to plan execution.
