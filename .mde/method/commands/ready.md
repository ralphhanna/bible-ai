---
type: command
command: mde ready?
loads:
  - rules/core/*
  - the plan's evidence (verify.log, audit.md, runtime.json, coverage, manifest, status.md)
  - .mde/method/scripts/plan-ready.mjs
---

# ready?

## Purpose

Answer one question after `mde evaluate`, before `mde go`: **am I good to go?**

A plan produces a lot of evidence — the verifier log, the substance audit, coverage,
the runtime gate, the manifest, status. Reading it all to decide "proceed or not" is
the firehose this command removes. `mde ready?` renders **one canonical verdict** —
**GO · GO-WITH-NOTES · NO-GO** — with a one-line witness per gate, the same for every
agent, and then has you (the AI) **independently confirm or dispute** that verdict.

This is **Trust, but Verify**:

- **Trust** — `plan-ready.mjs` is a deterministic roll-up. It reads the evidence the
  gates already produced (it does **not** re-run them) and computes the verdict + table.
  Same evidence → same verdict, for Claude, Codex, anyone. A stable baseline.
- **Verify** — you re-read the **same raw evidence yourself** and judge whether the
  script's verdict is *justified*. A script can have a bug; a status/audit file can
  overstate. Your job is the skeptical second opinion that keeps the script honest —
  and the script keeps you consistent. When you agree, GO with confidence; when you
  **disagree**, that disagreement is the signal.

## Command

```text
mde ready? [plan-dir]
```

Defaults to the active plan (`plans/active-plan.md`) when no plan is named.

## Behavior

1. **Run the roll-up (Trust).** Run
   `node .mde/method/scripts/plan-ready.mjs <project-root> <plan-dir>` and show its
   table verbatim — the verdict and per-gate rows. This is the canonical readout;
   do not paraphrase or re-format it.

2. **Verify it independently.** Now re-read the **raw evidence yourself** — do not
   trust the script's parse or the plan's own summary:
   - `evidence/logs/verify.log` — is it really 0 `[FAIL]`, and is the run current
     (its timestamp/plan match this plan)?
   - `audit.md` — read the **witnesses**, not just the verdicts. Is a `genuine`
     actually corroborated by a real witness, or is the witness thin/circular? Is any
     `fake` present (a fake is a **blocking Integrity Violation** — non-compensable by
     anything else)? Were loaded targets left un-audited (no view) that *should* have
     been examined?
   - `reports/evidence/coverage/coverage-summary.json` — measured (real `src/**` keys), or a
     hardcoded number / cosplay? Cross-check the script that produced it.
   - `evidence/runtime.json` — `passed`, and are the not-ok checks genuinely warnings
     (e.g. UI skipped on a backend plan) or real failures dressed as warnings?
   - `output.manifest` — every entry a real touch state, nothing left `planned`/`blocked`?
   - `status.md` — no debt/pending it glosses over; dirty non-manifest files noted.

3. **Confirm or dispute.** State your independent conclusion:
   - **Confirmed** — you agree with the script's verdict; say so and why (the evidence
     backs it). GO / GO-WITH-NOTES proceeds; NO-GO stands.
   - **Disputed** — you disagree. Say which row and why: "script says GO, but the
     `Coverage substance` witness is circular — it cites the report existing, not a
     tool measuring real code," or "script says NO-GO on a runtime warning that is a
     legitimate backend-only skip." A dispute **downgrades to the safer verdict** (a
     disputed GO becomes NO-GO/notes; a disputed NO-GO is surfaced for the user to
     override) — never silently overrule the script.

4. **Report.** One block: the script's table, then your line — **`Verify: confirmed`**
   or **`Verify: disputed — <row>: <why>`** — and the final verdict the user acts on.

## Rules

- `ready?` is **read-only** — it reads evidence and reports; it never edits artifacts,
  re-runs gates, or changes lifecycle. It informs the `mde go` decision; it is not `go`.
- A **fake** audit finding is a blocking **Integrity Violation**: NO-GO regardless of
  how clean everything else is. It cannot be compensated (see the audit spec).
- The script's verdict and your verdict are **two independent paths to the same
  conclusion**. Agreement is confidence; disagreement is the finding — never hide it.
- Notes (`~`) are non-blocking by design (un-audited targets, backend-only UI skip,
  coverage just above floor). Surface them; do not treat them as failures.
