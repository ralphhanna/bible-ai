# MDE — AI-Orchestrated Model-Driven Engineering

> **A lightweight, AI-orchestrated application engineering framework for building, evolving, and governing business applications.**

<p align="center">
  <img src="docs/assets/logo.png" width="150"/>
</p>

![Status](https://img.shields.io/badge/status-active-2ea44f)
![Lifecycle](https://img.shields.io/badge/lifecycle-end--to--end-blue)
![Approach](https://img.shields.io/badge/approach-lightweight-0a66c2)
![AI](https://img.shields.io/badge/AI-orchestrated-orange)
![Artifacts](https://img.shields.io/badge/artifacts-docs%2Bcode-brightgreen)
![License](https://img.shields.io/badge/license-MIT-black)


MDE helps teams turn business intent into specifications, plans, generated application artifacts, validation evidence, and controlled releases.

It is not a prompt collection and not a code-generation shortcut. MDE gives AI a disciplined engineering process so generated work can be reviewed, changed, and trusted.

## Why MDE?

MDE is designed around five release-level goals:

- **Methodical engineering** — work follows a governed process instead of ad hoc prompting.
- **Captured intent and specifications** — business and design knowledge are preserved as durable assets.
- **Highly functional applications** — MDE aims to generate complete application capability, not skeletons.
- **Validated and verified output** — generated work is checked against rules, targets, specs, and evidence.
- **Managed change** — plans, branches, manifests, evidence, and releases make change controlled and reviewable.

## Main Flow

```text
mde init-app
mde start branch <branch-name>
mde start <intent>
mde evaluate
mde go
mde review app
mde release branch
```

The user describes intent. MDE clarifies the scope, evaluates impact, produces a plan, generates or updates artifacts, validates the result, records evidence, and releases completed branch work.

## Install and Start

Install the MDE CLI from the method repository:

```bash
git clone https://github.com/AI-MDE/mde.git mde
npm install -g ./mde/.mde/cli
mde --version
```

Initialize an application repository:

```bash
mkdir my-app
cd my-app
mde init-app
```

Then open the repository in your AI coding agent. If the agent does not automatically load the method, ask it to read:

```text
read .mde/method/boot.md
```

## Repository Areas

```text
specs/        durable business and application specifications
plans/        governed work items, evidence, and status
manifest/     artifact ownership and traceability
.mde/method/  rules, targets, templates, validation, and boot files
```

## Documentation

### Getting Started

- [Quick Start](quickstart.md) — a simple user story and minimal first workflow.

### Learn MDE

- [Overview](overview.md) — vision, principles, long-term direction, and core concepts.
- [Method](method.md) — one-page explanation of rules, targets, templates, and validation.
- [Architecture](architecture.md) — one-page high-level architecture.

### Reference

- [Commands](reference/commands.md) — command reference.
- [Plans](reference/plans.md) — plan lifecycle, state transitions, tasks, evidence, and release.
- [Glossary](reference/glossary.md) — authoritative terminology.
- [Specifications](reference/specifications.md) — specs as durable project knowledge.

### Deferred / Later Documentation

Walkthroughs, screenshots, live Workbench links, live demo links, and detailed capability references are deferred to later documentation passes.
