// verificationRunner.mjs — evaluate capability $-model check blocks against a project+plan.
//
// Discovers ```check blocks in method/features/**, parses the WHEN/THEN/ELSE
// lines, and evaluates them against the model. Per-entry checks ($item.*) run once
// per manifest entry owned by the check's capability ($this-scoped by default).
// Emits structured complaints; exits non-zero on any fail.
//
// Split into focused modules:
//   capability-parser.mjs — read a capability .md's id/impacts/Checks bullets/```check fences
//   dsl-evaluator.mjs     — parse a check block into rules, resolve $-paths, evaluate
//   report-writer.mjs     — the full Markdown verification report
//   format-helpers.mjs    — stdout summary printer, path matching, report text helpers
// This file is purely the orchestrator: discover capabilities, run their checks
// against the model, apply the plan-level gates, print/write the result.
//
// DRAFT — dev prototyping. Usage: node verificationRunner.mjs <projectRoot> <planDir>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildModel } from './model.mjs';
import { walk, capId, capImpacts, checksBullets, checkBlocks, assignQuestions, leadingComment } from './capability-parser.mjs';
import { parseBlock, evalExpr, resolveSet, emit, label } from './dsl-evaluator.mjs';
import { writeReport, writeSystemReport } from './report-writer.mjs';
import { finish, pathMatches } from './format-helpers.mjs';
import { normalizeTargetId } from './target-catalogue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdeRoot = path.resolve(__dirname, '..');           // .mde/
const capsDir = path.join(mdeRoot, 'method', 'features');

// Debug trace — writes to STDERR so it never mixes with the [FAIL]/[ASK] findings on
// stdout (which evaluate parses). The point: while evaluate runs this, an empty
// finding list is ambiguous — did a check PASS, or did it never run because its set
// was empty (e.g. entities didn't parse)? Debug shows every check block, its set
// size, and each instance verdict, so "0 findings" can be told apart from "0 checks
// ran".
//
// Opt-in now the verifier is wired into evaluate: the trace clogged every captured
// log (evaluate folds stderr into verify.log) with no remaining value. Enable it only
// when actively debugging, via `--debug` or MDE_VERIFY_DEBUG=1.
const DEBUG = process.argv.includes('--debug') || process.env.MDE_VERIFY_DEBUG === '1';
function dbg(...a) { if (DEBUG) console.error('[verify:debug]', ...a); }

function run(projectRoot, planDir, opts = {}) {
  // Build the model against the SAME method the checks come from (this install's
  // method), not the project's own possibly-stale .mde/method copy — so outputs/
  // requires are read from the current method the verifier ships.
  const model = buildModel(projectRoot, planDir, path.join(mdeRoot, 'method'));
  const complaints = [];
  let ran = 0;
  // Full-report accumulator: one record per evaluated check block (capability, scope,
  // the check text, how many subjects it ran over, and its findings). Written to a
  // Markdown report when opts.report is set — the auditable "here's everything we
  // checked and what each covered" artifact (passes included, not just failures).
  const report = [];
  // Capabilities relevant to a loaded target but PROSE-ONLY (no check block) — shown
  // in the report as unchecked so the blind spot is visible, not hidden behind green.
  const unchecked = [];

  // Gate 1 (inclusion) is standalone: it needs ONLY impact.md's loaded targets, so it
  // runs at evaluate step 4 — BEFORE the manifest is planned or anything is generated.
  // In gate=1 mode we run just the inclusion gate and skip everything that needs a
  // manifest/artifacts (per-capability checks, mandated-output, coverage, artifact).
  const gate = opts.gate;

  dbg(`project=${projectRoot} plan=${planDir}${gate ? ` gate=${gate}` : ''}`);
  dbg(`loaded targets: ${model.plan.loaded.join(', ') || '(none)'}`);
  dbg(`invalid loaded targets (not real target ids): ${model.plan.invalidLoaded.join(', ') || '(none)'}`);
  dbg(`required (closure ∩ stack): ${model.plan.required.join(', ') || '(none)'}`);
  dbg(`missing (required, not loaded/excused): ${model.plan.missing.join(', ') || '(none)'}`);

  // Manifest-conformance guard: a corrupt/non-JSONL manifest parses to 0 (or partial)
  // entries, which would make every content check run over an empty trace and
  // BLIND-PASS. Fail loudly and stop — an unreadable manifest is a hard defect, not a
  // clean plan. (gate=1 doesn't touch the manifest, so it's exempt.)
  if (gate !== 1 && model.manifestMalformed) {
    dbg(`manifest MALFORMED: ${model.manifestParsed}/${model.manifestLines} lines parsed as JSONL`);
    return finish([{
      capability: 'manifest',
      message: `output.manifest is not valid JSONL — ${model.manifestParsed} of ${model.manifestLines} `
        + `lines parsed (expected one JSON object per line per manifest-entry.schema.json). `
        + `Verification cannot read the plan's artifacts; every content check would blind-pass. `
        + `Rewrite the manifest as JSONL.`,
      ref: `${planDir}/output.manifest`,
    }], 1);
  }
  // Invalid-target guard: a fabricated/misspelled name in ## Loaded Targets is a
  // VALIDATION error, not a scoping input. Left to run, it corrupts capability
  // relevance — the target that should have been loaded never matches, so its
  // checks silently skip while the plan looks covered. Stop here, like a
  // malformed manifest, rather than reporting the cause after a run made
  // meaningless by it. (Reported at any gate: it is the inclusion gate's own input.)
  if (model.plan.invalidLoaded.length) {
    dbg(`invalid loaded targets: ${model.plan.invalidLoaded.join(', ')} — stopping`);
    return finish(model.plan.invalidLoaded.map((t) => ({
      capability: 'inclusion',
      message: `impact.md ## Loaded Targets names '${t}', which is not a real target id `
        + `(absent from targets/catalogue.json) — a fabricated or misspelled name `
        + `silently occupies a loaded-target slot while triggering no real target's checks, `
        + `so target scoping cannot be trusted and verification stops here. `
        + `Replace it with the correct target id (see .mde/method/targets/catalogue.json), `
        + `or leave the section empty if this plan genuinely loads no target.`,
      ref: `${planDir}/impact.md ## Loaded Targets`,
    })), 1);
  }
  if (gate !== 1) {
  dbg(`entities: ${model.plan.entities.join(', ') || '(none)'}`);
  dbg(`manifest items: ${model.manifest.length}, expectedOutputs: ${model.plan.expectedOutputs.length}`
    + `, expectedOperations: ${model.plan.expectedOperations.length}, featuresExist: ${model.plan.featuresExist}`);

  for (const file of walk(capsDir, (p) => p.endsWith('.md'))) {
    const base = path.basename(file).toLowerCase();
    if (base === 'readme.md' || base === 'index.md') continue;   // not capabilities
    const text = fs.readFileSync(file, 'utf8');
    if (!/^id:\s*\S/m.test(text)) continue;                       // no real capability id
    // Target scoping: a capability is relevant to this plan only if one of its
    // `impacts` targets is loaded. Irrelevant capabilities (e.g. web-ui on a backend
    // plan) are skipped entirely.
    const impacts = capImpacts(text);
    // Relevant if the capability impacts a loaded target.
    //
    // A plan that records an EMPTY ## Loaded Targets is declaring it loads no
    // target — a review/report plan owning nothing but its own output. It is not
    // missing data, so it must NOT fall back to running every capability: the
    // old fallback assumed "a check over an empty set does nothing", which is
    // false for any check whose set is app-wide rather than plan-derived
    // ($plan.expectedBusinessRules is every rule file in the project, not the
    // plan's). Under that fallback the narrower the plan, the MORE it inherited —
    // a one-artifact review plan was checked against the whole app's testing
    // debt, which it does not own and cannot fix. Only capabilities with no
    // `impacts` at all (genuinely universal) run for such a plan.
    //
    // A plan with NO ## Loaded Targets section is a different fact: legacy shape
    // (older design plans used ## Target Areas). There we still cannot scope, so
    // the fallback stands.
    const relevant = !impacts.length || !model.plan.loadedDeclared
      || impacts.some((t) => model.plan.loaded.includes(t));
    const name = capId(text, path.basename(file, '.md'));
    if (!relevant) {
      dbg(`skip ${name}: impacts=[${impacts.join(',')}] — none loaded`);
      continue;
    }
    const blocks = checkBlocks(text);
    if (!blocks.length) {
      // Relevant to a loaded target but PROSE-ONLY (no deterministic check). Record it
      // so the report SHOWS it as unchecked instead of silently omitting it — a
      // green report must not hide capabilities that rest only on the AI/review pass.
      unchecked.push({ capability: name, impacts });
      dbg(`unchecked ${name}: relevant (impacts=[${impacts.join(',')}]) but no check block`);
      continue;
    }
    const self = { name };
    // Human-readable "what this checks" per block (Option A): reuse the capability's
    // `## Checks` question bullets, paired to the check blocks by order. A block's own
    // leading `#` comment takes precedence when present (it's the most specific).
    const questions = checksBullets(text);
    // Assign each block its best-matching `## Checks` question, but a bullet is used at
    // most ONCE per capability — so two sibling checks (e.g. ACL coverage vs fidelity)
    // can't both grab the same generic bullet; the second takes its next-best distinct
    // one. Greedy by descending match score.
    const whatByBlock = assignQuestions(blocks, questions);
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      // Per-check target gate: a check block may name the ONE target it belongs
      // to (```check ... target=api). Honor it — skip the check when its target
      // is not loaded, even though the owning feature is relevant via some OTHER
      // loaded target. This stops an implementation check (target=api) from
      // firing on a design plan that loaded only the feature's design target
      // (e.g. architecture). A block with no target= runs whenever its feature
      // is relevant (unchanged). Only gate when the plan actually recorded
      // loaded targets — with none recorded we can't scope, so run as before.
      if (block.target && model.plan.loaded.length) {
        const bt = normalizeTargetId(block.target);
        if (bt && !model.plan.loaded.includes(bt)) {
          dbg(`skip block ${self.name}#${bi}: target=${bt} not loaded`);
          continue;
        }
      }
      const what = whatByBlock[bi] || leadingComment(block.body) || '';
      // Report record for this block: capture before/after complaint counts + subject
      // count so the report shows what each check covered and found.
      const before = complaints.length;
      let subjects = 0;
      for (const rule of parseBlock(block.body)) {
        if (block.scope === 'plan') {
          // Run ONCE. If the rule is an EVERY-form, iterate that set (binding the
          // loop var); otherwise evaluate the rule a single time (no $item).
          ran++;
          if (rule.every) {
            const set = resolveSet(rule.every.set, model, null, self);
            subjects += set.length;
            dbg(`${self.name}: EVERY ${rule.every.var} IN ${rule.every.set} → ${set.length} item(s)`);
            for (const val of set) {
              const bind = { ...self, [rule.every.var]: val };
              // ref: the file this finding is ABOUT. Prefer val.path — for a set
              // like $plan.trace the item IS an artifact and its own path is what's
              // being validated, so the finding must blame that file (not its
              // upstream sourceRef, which is often a {kind,refs} trace object that
              // would print as the wrong file / an object). Fall back to sourceRef
              // (as a string) only when there is no path, then a readable id, then
              // its scalar label. Never a raw JSON dump.
              const sourceRefStr = val && typeof val.sourceRef === 'string' ? val.sourceRef : '';
              const ref = (val && (val.path || sourceRefStr || val.op || val.id || val.name || val.table || val.slice)) || label(val);
              emit(rule, model, null, bind, self.name, complaints, ref);
            }
          } else {
            subjects += 1;
            dbg(`${self.name}: scope=plan single rule`);
            // A whole-plan check has no single offending file; point at the area to
            // inspect (server source for backend concerns) so the finding is still
            // navigable, not an opaque "plan".
            emit(rule, model, null, self, self.name, complaints, 'src/server/');
          }
        } else {
          // scope=item: run once per this-feature manifest entry.
          for (const item of model.manifest.filter((it) => it.feature === self.name)) {
            ran++;
            subjects += 1;
            emit(rule, model, item, self, self.name, complaints, item.path);
          }
        }
      }
      const found = complaints.slice(before);
      report.push({
        capability: self.name,
        capabilityFile: path.relative(mdeRoot, file).replace(/\\/g, '/'),   // .mde-relative
        what,                                                                // human "what this checks"
        subject: block.subject,                                              // "API End-Points"
        whenFailed: block.whenFailed,                                        // "are missing"
        whenPassed: block.whenPassed,                                        // "present" (optional)
        scope: block.scope,
        text: block.body.trim(),
        subjects,
        findings: found,
      });
    }
  }
  } // end if (gate !== 1)

  // --- plan-level gates (structural — not authored per capability) -----------
  // #1 inclusion: every required target (∩ tech-stack) must be loaded or excused.
  // ALWAYS runs (including gate=1) — it is the standalone target-inclusion gate.
  //
  // (Invalid target names are handled as a hard precondition above — the run stops
  // before any capability check, since corrupt scoping makes the rest meaningless.)
  // Same defect, one level up: tech-stack.md's applicationStack targets: type: block
  // is the applicability UNIVERSE (gates whether a required target can even be
  // demanded, and — via app.review.md — the base of the app-wide target union). A
  // fabricated/misspelled type: silently narrows that universe with no error.
  for (const t of model.plan.invalidTechStackTargets) {
    ran++;
    complaints.push({
      capability: 'inclusion',
      message: `specs/design/tech-stack.md's applicationStack targets: names type '${t}', `
        + `which is not a real target id (absent from targets/catalogue.json) — a `
        + `fabricated or misspelled type silently narrows the app's applicability universe, `
        + `which can mask a genuinely-required target as "not part of this app's stack". `
        + `Replace it with the correct target id (see .mde/method/targets/catalogue.json).`,
      ref: 'specs/design/tech-stack.md',
    });
  }
  for (const t of model.plan.missing) {
    ran++;
    complaints.push({
      capability: 'inclusion',
      message: `target '${t}' is required (dependency of a loaded target) but is not in the `
        + `plan and not excused. Add it, or add "- target: ${t} · reason: … · ref: …" `
        + `to scope.md ## Excluded targets.`,
      ref: 'impact.md ## Loaded Targets',
    });
  }
  if (gate === 1) return finish(complaints, ran);
  // Mandated-output gate: for each output a LOADED target declares in its ## Outputs
  // (perEach expanded from specs), the plan's manifest must produce it. Attributed
  // to the OWNING TARGET (not whatever capability a check-block lives in).
  for (const o of model.plan.expectedOutputs) {
    ran++;
    if (!model.plan.paths.some((p) => pathMatches(p, o.path))) {
      complaints.push({
        capability: o.target,
        // Generic message (path in ref) so same-kind gaps GROUP into one finding
        // with a count, instead of one line per instance. Section (e.g. "## Storage
        // View") appended when the target's Outputs row named one — the artifact-level
        // path match found no such file at all, so it can't have the section either.
        message: `mandated output '${o.output}' not produced`
          + (o.section ? ` (${o.section})` : ''),
        ref: o.path + (o.section ? ` (${o.section})` : ''),
      });
    }
  }
  // #2 coverage: every feature that produced an artifact should trace to a loaded
  // target — a feature with no manifest entry is caught at evaluate; here we flag
  // manifest entries whose feature is empty (untraceable artifact).
  for (const it of model.manifest) {
    if (!it.feature) {
      ran++;
      complaints.push({
        capability: 'coverage',
        message: `manifest artifact has no feature trace (no 'features' id — untraceable output).`,
        ref: it.path,
      });
    }
    // #3 artifact exists: created/modified entries must resolve to a real file.
    // This runs in the FULL pass only (gate=1 returns above), i.e. at evaluate
    // stage 7 — after stage 6 has generated the artifacts and flipped each entry
    // planned -> created/modified. So a `planned` entry reaching here means
    // generation never happened, which is precisely the gap this check exists to
    // catch: exempting it would make skipped work silent.
    if ((it.action === 'create' || it.action === 'modify') && it.content == null) {
      ran++;
      complaints.push({
        capability: 'artifact',
        message: `manifest entry is '${it.action}' but the file is missing on disk.`,
        ref: it.path,
      });
    }
  }

  if (opts.report) {
    writeReport(opts.report, { projectRoot, planDir, model, report, unchecked, complaints, ran, showUnchecked: opts.showUnchecked });
    dbg(`report written: ${opts.report}`);
  }
  // --mechanical (used by `go`'s re-run of an already-verified plan): drop ASK
  // complaints before scoring. ASKs are AI-judgment items evaluate already answered/
  // routed; a mechanical re-run repeats only the deterministic THEN/ELSE checks and
  // must not re-surface them for fresh judgment or fail the gate on them.
  const scored = opts.mechanical ? complaints.filter((c) => c.kind !== 'ask') : complaints;
  return finish(scored, ran);
}

// runAppWide — scope=system checks: whole-app completeness questions with no owning
// plan (e.g. "does every entity have a Maintenance panel somewhere"). Runs ONCE,
// independent of any plan (no planDir, no target-loaded relevance gate — a capability
// is relevant here simply by having a scope=system block). Only invoked under
// `mde review app` (--app-wide); never at evaluate/go. Body is normally an ASK — the
// AI reads the relevant spec trees itself (no $app join primitive; see
// .mde/mde.specs/design/verification.md). A WHEN guard, if present, is each check's
// OWN maturity gate (independent of the blanket --app-wide gate) — e.g. don't ask
// about operation coverage until the design is declared complete.
function runAppWide(projectRoot) {
  // No real plan — pass a sentinel dir that resolves to nothing on disk, so every
  // $plan.* field degrades to its empty shape (see model.mjs; a missing manifest/
  // impact.md/scope.md is a clean "nothing claimed", not an error). scope=system
  // checks must only address $app/$techStack, never $plan.
  const model = buildModel(projectRoot, 'plans/__system__', path.join(mdeRoot, 'method'));
  const complaints = [];
  let ran = 0;
  const report = [];

  for (const file of walk(capsDir, (p) => p.endsWith('.md'))) {
    const base = path.basename(file).toLowerCase();
    if (base === 'readme.md' || base === 'index.md') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!/^id:\s*\S/m.test(text)) continue;
    const blocks = checkBlocks(text).filter((b) => b.scope === 'system');
    if (!blocks.length) continue;
    const name = capId(text, path.basename(file, '.md'));
    const self = { name };
    for (const block of blocks) {
      for (const rule of parseBlock(block.body)) {
        ran++;
        const guardOk = (rule.when || []).every((w) => evalExpr(w, model, null, self));
        dbg(`${name}: scope=system rule — guard ${guardOk ? 'holds' : 'does not hold, skipped'}`);
        const before = complaints.length;
        // No ref: a scope=system finding is a whole-app question (the AI reads many
        // spec files itself), not one offending file — unlike scope=item/plan findings,
        // which always point at a concrete artifact.
        if (guardOk) emit(rule, model, null, self, name, complaints, '');
        report.push({ capability: name,
          capabilityFile: path.relative(mdeRoot, file).replace(/\\/g, '/'),
          guardOk, text: block.body.trim(), findings: complaints.slice(before) });
      }
    }
  }
  return { complaints, ran, report };
}

// Args: <projectRoot> [<planDir>] [--gate=1] [--report[=<file.md>]] [--out=<file>] [--unchecked]
//   --out=<file>   write the stdout summary to <file> as UTF-8 (the verify.log) — use this
//                  instead of a shell `> verify.log` redirect (Windows redirects write UTF-16).
//       [--mechanical] [--app-wide].
//   --gate=1       runs ONLY the target-inclusion gate (evaluate step 4).
//   --report       writes the full Markdown report; default path <projectRoot>/reports/
//                  verification-report.md, or --report=<path> for a custom location.
//   --unchecked    also list the prose-only (no automated check) capabilities in the
//                  report; off by default to keep the main report focused.
//   --mechanical   drop ASK (AI-judgment) findings from the exit-code/summary — only
//                  deterministic FAIL findings count. Used by `mde go` re-confirming a
//                  plan evaluate already verified: the ASKs were already judged then,
//                  so a mechanical re-run must not re-ask or fail on them.
//   --app-wide     run ONLY scope=system checks, once, independent of any plan (no
//                  planDir needed/read). Only `mde review app` passes this.
const args = process.argv.slice(2);
const gateArg = args.find((a) => a.startsWith('--gate='));
const reportArg = args.find((a) => a === '--report' || a.startsWith('--report='));
// --out=<file>: write this run's stdout summary to <file> as UTF-8 (the verify.log),
// so callers do NOT shell-redirect (`> verify.log` / Out-File on Windows write UTF-16,
// which corrupts the log). The engine owns the encoding; the caller just passes the path.
const outArg = args.find((a) => a.startsWith('--out='));
if (outArg) {
  const outFile = outArg.split('=').slice(1).join('=');
  const chunks = [];
  const orig = console.log;
  console.log = (...a) => { chunks.push(a.join(' ')); orig(...a); };
  const flush = () => {
    try { fs.writeFileSync(outFile, chunks.join('\n').replace(/\r\n/g, '\n') + '\n', { encoding: 'utf8' }); }
    catch { /* best-effort */ }
  };
  process.on('exit', flush);
}
const showUnchecked = args.includes('--unchecked');
const mechanical = args.includes('--mechanical');
const appWide = args.includes('--app-wide');
const positional = args.filter((a) => !a.startsWith('--'));
const [projectRoot, planDir] = positional;
const root = path.resolve(projectRoot || '.');
const gate = gateArg ? Number(gateArg.split('=')[1]) : undefined;
const report = reportArg
  ? (reportArg.includes('=') ? reportArg.split('=')[1] : path.join(root, 'reports', 'review', 'verification-report.md'))
  : undefined;

// Run header — one line per invocation, so a captured verify.log shows WHERE each run
// starts, WHEN, and in what MODE (a stale/earlier section can't be mistaken for the
// current result). Printed to stdout, so every caller (prose evaluate, the engine,
// review app) captures it with the findings.
const mode = appWide ? 'app-wide (scope=system)'
  : gate === 1 ? 'gate-1 (target inclusion)'
  : mechanical ? 'mechanical (FAIL-only)'
  : 'full';
console.log(`=== verify: ${mode} · ${new Date().toISOString()} · ${path.basename(root)}${appWide ? '' : ` · ${planDir || 'plans/active'}`} ===`);

if (appWide) {
  const { complaints, ran, report: sysReport } = runAppWide(root);
  if (report) {
    writeSystemReport(report, { projectRoot: root, report: sysReport, complaints, ran });
    dbg(`system report written: ${report}`);
  }
  process.exit(finish(complaints, ran));
} else {
  process.exit(run(root, planDir || 'plans/active', { gate, report, showUnchecked, mechanical }));
}
