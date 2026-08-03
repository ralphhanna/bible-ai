#!/usr/bin/env node
// evaluate.mjs — the phase-orchestration engine.
//
// Walks the E1–E8 pipeline of a single plan (see mde.specs/design/evaluate-engine.md),
// running each phase with the RIGHT executor and ticking tasks.md ONLY on evidence:
//
//   E1 plan   → AI session   (frame + plan the manifest)
//   E2 gate   → script        (inclusion: verificationRunner --gate=1)
//   E3 build  → AI session   (generate + build; its own test runs are a fix TOOL)
//   E4 test   → script        (npm run mde:test — the evidence of record)
//   E5 gate   → script        (full verifier + runtime proof)
//   E6 judge  → AI session   (fresh: semantic review + test-honesty, on E4 evidence)
//   E7 repair → route a failure to its OWNING phase, re-run, bounded
//   E8 settle → classify what remains, checkpoint status.md
//
// The anti-cheat is structural: the AI proposes work inside a phase, but the
// FRAMEWORK decides whether the evidence lets a stage tick. An agent that ignores
// the method and invents its own plan cannot tick its own ledger — a gate with no
// backing evidence never flips green. That is the whole point of a framework
// walking the ledger instead of one AI session ticking its own boxes.
//
// Usage:
//   node .mde/method/scripts/evaluate.mjs <plan-dir> [--cwd <project>]
//        [--agent claude|codex] [--dry-run [--script tok,tok,…]]
//        [--max-repairs N] [--from E3] [--no-color]
//
// Exit: 0 clean · 2 misconfig · 3 no agent · 4 usage-limit · 5 repair budget · 6 gate STOP.

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  LIMIT_RE, resolveBinary, buildInvocation, streamAgent, parseVerdict, agentEnv,
} from '../../goal-loop/agent-runner.mjs';

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const getOpt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const has = (name) => args.includes(name);

const C = process.stdout.isTTY && !has('--no-color')
  ? { eng: '\x1b[1;35m', ok: '\x1b[32m', bad: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' }
  : { eng: '', ok: '', bad: '', dim: '', reset: '' };
// Output speaks plain English. The engine narrates what it is doing ("▸ …"),
// then reports the result ("✓ passed" / "✗ failed"). The E-code is a small tag,
// never the message — a reader should follow along without knowing the pipeline.
const eng = (msg) => console.log(`\n${C.eng}▸${C.reset} ${msg}`);
const ok  = (msg) => console.log(`  ${C.ok}✓${C.reset} ${msg}`);
const bad = (msg) => console.log(`  ${C.bad}✗${C.reset} ${msg}`);
const note = (msg) => console.log(`  ${C.dim}${msg}${C.reset}`);

const dryRun = has('--dry-run');
const agent = (getOpt('--agent') || 'claude').toLowerCase();
const maxRepairs = Number(getOpt('--max-repairs') || 3);
const fromStage = (getOpt('--from') || '').toUpperCase();   // resume at E3, etc.
// Generation grain — how manifest bands are grouped into AI sessions. Each session
// is a cold start (re-reads boot/specs/manifest), so per-band (most isolated,
// resumable) is also most EXPENSIVE. Coarser grain = fewer sessions = cheaper, less
// granular resume. Measured via the run-log's per-session timing/tokens so the cost is
// visible. Default `band-group`: one session per artifact-KIND run (specs, source,
// tests…) — the sweet spot between per-band cost and whole-plan opacity.
//   plan       — one session for the whole manifest (cheapest, coarsest resume)
//   band-group — merge adjacent bands that share a coarse phase (default)
//   band       — one session per manifest band (most isolated, most expensive)
const grain = (getOpt('--grain') || 'band-group').toLowerCase();

const projectRoot = path.resolve(getOpt('--cwd') || process.cwd());
const planArg = args.filter((a) => !a.startsWith('--')
  && args[args.indexOf(a) - 1] !== '--cwd' && args[args.indexOf(a) - 1] !== '--agent'
  && args[args.indexOf(a) - 1] !== '--script' && args[args.indexOf(a) - 1] !== '--from'
  && args[args.indexOf(a) - 1] !== '--max-repairs')[0];
if (!planArg) fail('missing <plan-dir> (e.g. plans/003-persistence)', 2);
const planDir = planArg.replace(/\\/g, '/').replace(/\/+$/, '');
const planPath = path.join(projectRoot, planDir);
if (!existsSync(planPath) || !statSync(planPath).isDirectory()) {
  fail(`plan dir not found: ${planDir}`, 2);
}
const tasksPath = path.join(planPath, 'tasks.md');
const evidenceDir = path.join(planPath, 'evidence', 'logs');
const verifyLog = path.join(evidenceDir, 'verify.log');
// The evaluate run-log: one line per AGENT invocation (phase, band, agent, duration,
// verdict), appended across the whole run. For a big plan (many bands + tests + docs)
// this is the durable "who was invoked, in what order, and what happened" record —
// the terminal stream is transient, this survives. UTF-8, human-readable.
const runLog = path.join(evidenceDir, 'evaluate-run.log');

// ---- verification & test scripts -------------------------------------------
// Absolute paths so the engine works regardless of the caller's cwd. The
// verifier lives under .mde/verification/; the runtime proof under method/scripts/.
const mdeRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..', '..');
const verifierScript = path.join(mdeRoot, 'verification', 'verificationRunner.mjs');
const runtimeScript = path.join(mdeRoot, 'method', 'scripts', 'verify-app-runtime.mjs');

// ---- the pipeline ----------------------------------------------------------
// Each phase: its executor kind, the tasks.md line-number prefixes it ticks on
// success, and a `when` predicate (skip phases whose inputs don't exist — a
// docs/design plan has no app to test or run). ticks map E-phases onto the
// authored 1–11 ledger (evaluate-engine.md "the old structure maps on").
// `task` is the tasks.md number(s) the user sees for this phase — the engine
// speaks the user-facing ledger's terms, not the internal E-code. `ticks` is the
// exact set of tasks.md checkbox prefixes the phase flips on success.
const PHASES = [
  { id: 'E1', kind: 'plan',  task: '5',      say: 'Plan the manifest',                ticks: ['5'] },
  { id: 'E2', kind: 'gate',  task: '4',      say: 'Gate 1 — target inclusion',        ticks: ['4'], stopOnFail: true },
  { id: 'E3', kind: 'build', task: '6',      say: 'Generate the artifacts',           ticks: ['6'] },
  { id: 'E4', kind: 'test',  task: '6a',     say: 'Run the test suite (evidence)',     ticks: ['6a'], when: planHasTests },
  { id: 'E5', kind: 'gate',  task: '7.1–7.3, 7.5', say: 'Validate (mechanical)',       ticks: ['7.1', '7.2', '7.3', '7.5'] },
  { id: 'E6', kind: 'judge', task: '7.4',    say: 'Validate — AI semantic review',    ticks: ['7.4'] },
  { id: 'E8', kind: 'settle', task: '9, 10', say: 'Classify + record',                ticks: ['9', '10'] },
];
// E7 is not a walked phase; it is the repair loop wrapped around E2/E5/E6.
// A2/A1 (go) is a SEPARATE command and out of scope here.

// Whether the RUNTIME proof (E5) applies: is there an app to run at all? A cheap
// project-level check — a design/BA plan in a bare repo has none.
function isApp() {
  return existsSync(path.join(projectRoot, 'package.json'))
    || existsSync(path.join(projectRoot, 'src'));
}

// Whether E4 (run the suite) applies — decided from THIS PLAN's manifest, not the
// project. `mde:test` runs the whole suite, so firing it for a plan that produced
// no tests (a BA/design/docs plan) is wasted work and, worse, fails the plan for a
// prior plan's red tests. Reason from the manifest: run E4 only if this plan
// declares a `test` artifact (or generated runnable source that its own tests
// would cover). Reason from output.manifest — never glob the tree.
function planHasTests() {
  const bands = readManifestBands();
  return bands.some((b) => b.type === 'test');
}

// ---- ledger (tasks.md) -----------------------------------------------------
// The engine ticks lines ONLY on evidence. It never lets a session write its own
// tick — the whole compliance guarantee is that the framework holds the pen.
function readTasks() {
  return readText(tasksPath);
}
function tickLines(prefixes, mark = 'x') {
  if (!prefixes.length || !existsSync(tasksPath)) return;
  let text = readTasks();
  for (const p of prefixes) {
    // Match "- [ ] 7.1" / "- [ ] 4." — the number prefix at a checkbox line start.
    const re = new RegExp(`^(\\s*-\\s*\\[)[ x](\\]\\s*${p.replace('.', '\\.')}(?:[.\\s]))`, 'm');
    text = text.replace(re, `$1${mark}$2`);
  }
  writeText(tasksPath, text);
}
// Which tasks are already ticked → where a resume picks up.
function firstUntickedPhase() {
  const text = readTasks();
  for (const ph of PHASES) {
    if (!ph.ticks.length) continue;                     // phase with no ledger line — never skip on this basis
    const allTicked = ph.ticks.every((p) =>
      new RegExp(`^\\s*-\\s*\\[x\\]\\s*${p.replace('.', '\\.')}(?:[.\\s])`, 'm').test(text));
    if (!allTicked) return ph.id;
  }
  return null;                                           // all ledger lines ticked
}

// ---- status.md checkpoint --------------------------------------------------
// A light touch: stamp the last phase reached and its verdict so `mde show` and a
// resume can see where evaluate is. The full status render stays the AI's job at
// E8/go; this is a breadcrumb, not a rewrite.
function checkpoint(phaseId, verdict) {
  const statusPath = path.join(planPath, 'status.md');
  if (!existsSync(statusPath)) return;
  let text = readText(statusPath);
  const line = `evaluate-phase:  ${phaseId} (${verdict}) @ ${new Date().toISOString()}`;
  if (/^evaluate-phase:.*$/m.test(text)) text = text.replace(/^evaluate-phase:.*$/m, line);
  else text = text.replace(/(```text\n)/, `$1${line}\n`);   // into the first fenced status block
  writeText(statusPath, text);
}

// ---- executors -------------------------------------------------------------
const agentBin = dryRun ? null : resolveBinary(agent);
if (!dryRun && !agentBin) fail(`${agent} CLI not found on PATH`, 3);
let stubCursor = 0;
const stubScript = (getOpt('--script') || '').split(',').map((s) => s.trim()).filter(Boolean);

// A mechanical phase (E2/E4/E5): run scripts, gate on exit code. Returns
// { pass, detail }. Never spawns an agent — the evidence is the framework's.
function runScript(phase) {
  ensureEvidenceDir();
  if (phase.id === 'E2') {
    const r = spawnSync('node', [verifierScript, projectRoot, planDir, '--gate=1'], scriptOpts());
    writeLog(path.join(evidenceDir, 'verify-gate1.log'), `=== E2 inclusion gate ===\n`, r);
    return { pass: r.status === 0, detail: `verifier --gate=1 exit ${r.status}` };
  }
  if (phase.id === 'E4') {
    // The evidence of record: a script — NOT the AI — runs the suite. Its exit
    // code and log are what E6 judges. If the app declares no mde:test, that is a
    // gap the judge should see, not a silent pass.
    const testLog = path.join(evidenceDir, 'test.log');
    const r = spawnSync('npm', ['run', 'mde:test'], { ...scriptOpts(), cwd: projectRoot });
    writeLog(testLog, `=== E4 mde:test ===\n`, r);
    const missing = /missing script|Missing script/.test((r.stderr || '') + (r.stdout || ''));
    if (missing) return { pass: false, detail: 'no `mde:test` script declared — no test evidence produced' };
    return { pass: r.status === 0, detail: `mde:test exit ${r.status}` };
  }
  if (phase.id === 'E5') {
    const v = spawnSync('node', [verifierScript, projectRoot, planDir], scriptOpts());
    writeLog(verifyLog, `=== E5 full verifier ===\n`, v);
    let pass = v.status === 0, detail = `verifier exit ${v.status}`;
    if (pass && isApp()) {
      const rt = spawnSync('node', [runtimeScript, projectRoot,
        '--json', path.join(planPath, 'evidence', 'runtime.json')], scriptOpts());
      writeLog(path.join(evidenceDir, 'runtime.log'), `=== E5 runtime proof ===\n`, rt);
      pass = rt.status === 0; detail += ` · runtime exit ${rt.status}`;
    }
    return { pass, detail };
  }
  return { pass: true, detail: 'no-op' };
}
function scriptOpts() { return { encoding: 'utf8', cwd: projectRoot, env: process.env }; }

// Read any text file as clean UTF-8 — decode a UTF-16 LE/BE or UTF-8 BOM if one
// is present, and strip it. Windows tools (PowerShell `>`, Out-File) write logs
// as UTF-16-with-BOM, which a naive utf8 read turns into garbage; this makes the
// engine tolerant of logs a prior step wrote that way. It never PRODUCES such a
// file — everything the engine writes goes out as plain UTF-8 below.
function readText(file) {
  if (!existsSync(file)) return '';
  const buf = readFileSync(file);                       // Buffer, no encoding assumed
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le').replace(/^﻿/, '');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {   // UTF-16 BE: swap byte order, then decode
    const swapped = Buffer.from(buf); for (let i = 0; i + 1 < swapped.length; i += 2) { const t = swapped[i]; swapped[i] = swapped[i + 1]; swapped[i + 1] = t; }
    return swapped.toString('utf16le').replace(/^﻿/, '');
  }
  // Guard: a log double-mangled by an earlier step (a UTF-16 BOM re-encoded through
  // UTF-8 into the bytes EF BF BD EF BF BD, then a null-interleaved body) is
  // unrecoverable. Detect that byte signature and surface the corruption instead of
  // emitting garbage downstream, so a human fixes the capturing step.
  if (buf.length >= 6 && buf[0] === 0xef && buf[1] === 0xbf && buf[2] === 0xbd
      && buf[3] === 0xef && buf[4] === 0xbf && buf[5] === 0xbd) {
    return `[unreadable: ${path.basename(file)} is a corrupted (mangled UTF-16) log — the capturing `
      + `step wrote it wrong. Re-run the check and capture output as UTF-8. Original content unrecoverable.]`;
  }
  return buf.toString("utf8").replace(/^﻿/, "");   // plain UTF-8, drop a BOM if any
}

// Write text as plain UTF-8, no BOM, LF line endings — always readable in an
// editor and by line-based tooling. All engine writes go through here so the
// engine can never itself produce a UTF-16/BOM log.
function writeText(file, text) {
  writeFileSync(file, text.replace(/\r\n/g, '\n'), { encoding: 'utf8' });
}

// Write a captured run to its log — OVERWRITE, not append. Each log holds only the
// LATEST run, so opening verify.log always shows the current result, never a pile of
// stale runs (an old crash, a since-fixed finding) that misleads the reader. History
// lives elsewhere (findings.md, evaluate-run.log). stderr is included only when
// non-empty — real diagnostics, now that [verify:debug] is off.
function writeLog(file, header, r) {
  ensureEvidenceDir();
  const err = (r.stderr || '').trim();
  const body = header + (r.stdout || '') + (err ? `\n[stderr]\n${err}\n` : '') + `[exit ${r.status}]\n`;
  try { writeText(file, body); } catch {}
}
function ensureEvidenceDir() { try { mkdirSync(evidenceDir, { recursive: true }); } catch {} }

// The evidence log a failing check wrote — the source for the findings file.
function failLogFor(phaseId) {
  if (phaseId === 'E4') return path.join(evidenceDir, 'test.log');
  return verifyLog;                        // E2/E5 both append to verify.log
}

// ---- manifest bands (E3 grain) ---------------------------------------------
// E3 does NOT generate everything in one session. It walks the planned manifest
// by BAND — each contiguous run of same-purpose (same outputType) entries is one
// generation session, fed the prior bands already on disk (evaluate-engine.md E3).
// The AI laid the manifest out in dependency order at E1, so grouping contiguous
// runs preserves that order (specs → source → data → tests → docs) without the
// engine hardcoding it.
function readManifestBands() {
  const file = path.join(planPath, 'output.manifest');
  if (!existsSync(file)) return [];
  const bands = [];
  for (const line of readText(file).split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let e; try { e = JSON.parse(s); } catch { continue; }
    const type = e.outputType || 'other';
    // The manifest records WHICH target(s)/feature(s) mandate each artifact — the
    // contract the AI must build to. Carry them into the band so a generation session
    // knows the target, instead of re-deriving "why does this file exist" from specs.
    const feats = e.features || (e.implementor && e.implementor.feature ? [e.implementor.feature] : []);
    const last = bands[bands.length - 1];
    // Contiguous same-type entries fold into one band; a type change starts a new one.
    if (last && last.type === type) {
      last.artifacts.push(e.artifact);
      for (const f of feats) if (!last.targets.includes(f)) last.targets.push(f);
    } else {
      bands.push({ type, artifacts: [e.artifact], targets: [...feats] });
    }
  }
  return bands;
}

// The coarse PHASE an outputType belongs to — for `band-group` grain. Same-phase
// adjacent bands merge into one session. Kept in dependency order so the merge never
// reorders across the specs → source → data → tests → docs progression.
function phaseOf(type) {
  if (/spec|design|capability|use-case|business|entity|page|specs-update/.test(type)) return 'specs';
  if (/source|config|api-contract/.test(type)) return 'source';
  if (/migration|seed|db-report|data/.test(type)) return 'data';
  if (/test/.test(type)) return 'tests';
  if (/doc|diagram|report/.test(type)) return 'docs';
  return 'other';
}

// Group the raw bands into SESSION units per the grain knob. Returns the same band
// shape (type/artifacts/targets) so buildByBand walks it unchanged — only the count
// and coarseness of sessions changes. Fewer units = fewer cold-start sessions = cheaper.
function groupBands(bands) {
  if (grain === 'band' || bands.length <= 1) return bands;
  const keyOf = grain === 'plan' ? () => 'all' : (b) => phaseOf(b.type);
  const units = [];
  for (const b of bands) {
    const key = keyOf(b);
    const last = units[units.length - 1];
    if (last && last.key === key) {                       // merge into the current unit
      last.members.push(b.type);
      last.artifacts.push(...b.artifacts);
      for (const t of b.targets) if (!last.targets.includes(t)) last.targets.push(t);
    } else {
      units.push({ key, members: [b.type], artifacts: [...b.artifacts], targets: [...b.targets] });
    }
  }
  // Name each unit for display: whole-plan, a single kind, or "phase (kind1, kind2…)".
  for (const u of units) {
    u.type = grain === 'plan' ? 'whole plan'
      : u.members.length === 1 ? u.members[0]
      : `${u.key} (${u.members.join(', ')})`;
  }
  return units;
}
// Write the findings to a file the repair session reads itself — the phase-to-phase
// handoff is a file, never the prompt. Distil the raw log to the real findings:
// drop [verify:debug] noise and keep only the LAST run's section (after the final
// "=== " header), so the owner sees this failure's findings, not the whole history.
function writeFindings(failedPhase, what, logFile) {
  ensureEvidenceDir();
  let body = '';
  if (logFile) {
    const text = readText(logFile);                     // tolerant of a UTF-16 log a prior step wrote
    const lastSection = text.lastIndexOf('\n=== ');
    const section = lastSection >= 0 ? text.slice(lastSection + 1) : text;
    body = section.split('\n')
      .filter((l) => !l.startsWith('[verify:debug]') && l.trim() !== '[stderr]')
      .join('\n').trim();
  }
  // Name the SOURCE of each finding: the verifier tags every [FAIL]/[ASK] with the
  // feature check that produced it — "[FAIL] (gherkin-traceability) …". Surface those
  // check names so the reader knows where each finding came from and can judge whether
  // it is even in this plan's scope (a check firing app-wide on artifacts the plan
  // never touched is a scope problem, not a defect to fix here).
  const sources = [...new Set(
    (body.match(/^\[(?:FAIL|ASK)\]\s*\(([^)]+)\)/gm) || [])
      .map((m) => m.replace(/^\[(?:FAIL|ASK)\]\s*\(/, '').replace(/\)$/, ''))
  )];
  const sourceBlock = sources.length
    ? `**Source (feature checks that fired):** ${sources.map((s) => `\`${s}\``).join(', ')}\n\n`
      + `Each finding below is tagged with its feature check in parentheses. If a check `
      + `fired on artifacts this plan does not own, it is out of scope — classify it, do not "fix" it.\n\n`
    : '';
  const out = path.join(planPath, 'evidence', 'findings.md');
  const doc = `# Findings — to repair\n\n`
    + `**What failed:** ${what}\n\n`
    + sourceBlock
    + `Fix only the in-scope findings below, then the check re-runs.\n\n`
    + '```text\n' + (body || '(no evidence captured)') + '\n```\n';
  try { writeText(out, doc); } catch {}
  return path.relative(projectRoot, out).replace(/\\/g, '/');
}

// E3 (build) walks the manifest by band — one session per contiguous same-purpose
// run, in the order E1 planned. Each band's session is told what it builds and that
// the prior bands are already on disk. Stops on the first band that can't complete.
// A repair re-runs the bands with the findings pointer, so the AI fixes only what
// the failed check flagged. With no manifest yet, falls back to one whole-plan build.
async function buildByBand(phase, repair) {
  // Incremental regeneration: before walking, mark stale any already-generated artifact
  // whose SOURCE changed since it was generated — so band-skip regenerates ONLY the
  // impacted set, not the whole plan. A plan edit (a changed spec) no longer forces a
  // full rebuild; only artifacts that trace to the change are redone. (Skipped on a
  // repair — repair scope is the findings, not source-change staleness.)
  if (!repair) {
    const stale = markStaleFromChanges();
    if (stale.length) {
      eng(`incremental: ${stale.length} artifact(s) stale (their source changed) — only these regenerate`);
      stale.slice(0, 8).forEach((s) => note(`  stale: ${s}`));
      if (stale.length > 8) note(`  …and ${stale.length - 8} more`);
    }
  }
  const bands = groupBands(readManifestBands());
  if (!bands.length) {
    note('no planned manifest to walk — building the whole plan in one pass');
    return aiSession(phase, repair);
  }
  note(`grain=${grain}: generating in ${bands.length} session(s): ${bands.map((b) => b.type).join(' → ')}`);
  for (let bi = 0; bi < bands.length; bi++) {
    const band = bands[bi];
    const done = bands.slice(0, bi).map((b) => b.type).join(', ') || '(none)';
    // Band-level resume: skip a band whose every artifact is already created/modified
    // on disk (the manifest, kept current by reconcileManifest, is the record). So a
    // stop-and-rerun — OR a repair — picks up at the first UNFINISHED band, never
    // redoing completed work. A repair exists to fix what FAILED; regenerating the 10
    // bands that already succeeded is pure waste (and burns quota). The findings file
    // tells the AI what to fix; completed bands stay. Skip applies during repair too.
    if (bandComplete(band.artifacts)) {
      eng(`  band ${bi + 1}/${bands.length}: ${band.type} — already generated, skipping`);
      continue;
    }
    eng(`  band ${bi + 1}/${bands.length}: ${band.type} — ${band.artifacts.length} artifact(s)`
      + (band.targets && band.targets.length ? ` ${C.dim}[target: ${band.targets.join(', ')}]${C.reset}` : ''));
    const r = await aiSession(phase, repair, { ...band, index: bi + 1, total: bands.length, done });
    if (!r.pass) {
      // A band the AI could not complete (VERDICT: blocked) is a GENERATION blocker,
      // not a validation finding — validation hasn't run. Do NOT route it through the
      // validation-repair loop (which would fabricate a "validation failed" findings
      // file and re-drive generation). Stop here, keep the completed bands, and report
      // the blocker for the user. `blocked:true` tells the walk to halt, not repair.
      return { pass: false, blocked: true,
        detail: `band ${bi + 1} (${band.type}) is blocked — ${r.detail}. `
          + `${bi} band(s) completed; generation cannot continue past this without resolving it.` };
    }
    // After each band, the FRAMEWORK reconciles the manifest against disk — flip this
    // band's entries planned → created/modified based on whether the file now exists.
    // Guaranteed and evidence-based (not the AI's goodwill), so you watch the manifest
    // fill in band by band as durable progress.
    const flipped = reconcileManifest(band.artifacts);
    note(`  manifest updated: ${flipped} of ${band.artifacts.length} entries now on disk`);
  }
  return { pass: true, detail: `all ${bands.length} band(s) generated` };
}

// A band is complete when every one of its artifacts is recorded created/modified in
// the manifest — the durable record reconcileManifest maintains. Used for band-level
// resume: a re-run skips bands already finished, restarting at the first unfinished one.
function bandComplete(artifacts) {
  const file = path.join(planPath, 'output.manifest');
  if (!existsSync(file)) return false;
  const status = {};
  for (const line of readText(file).split('\n')) {
    const s = line.trim(); if (!s) continue;
    let e; try { e = JSON.parse(s); } catch { continue; }
    status[e.artifact] = e.status;
  }
  return artifacts.every((a) => status[a] === 'created' || status[a] === 'modified');
}

// Flip the given artifacts' manifest entries planned → created/modified, from disk
// truth: exists → created (or modified if the action said so); absent → stays planned
// (a visible gap, not a false green). Writes the manifest back as clean UTF-8 JSONL.
function reconcileManifest(artifacts) {
  const file = path.join(planPath, 'output.manifest');
  if (!existsSync(file)) return 0;
  const want = new Set(artifacts);
  let flipped = 0;
  const lines = readText(file).split('\n').map((line) => {
    const s = line.trim();
    if (!s) return line;
    let e; try { e = JSON.parse(s); } catch { return line; }
    if (!want.has(e.artifact) || e.status === 'created' || e.status === 'modified') return line;
    // Directory entries (trailing /) count as present if the dir exists; else file.
    const onDisk = existsSync(path.join(projectRoot, e.artifact));
    if (onDisk) { e.status = e.action === 'modify' ? 'modified' : 'created'; flipped++; return JSON.stringify(e); }
    return line;                                          // absent → stays planned (honest gap)
  });
  writeText(file, lines.join('\n'));
  return flipped;
}

// Incremental staleness: an already-generated artifact (created/modified) is STALE when
// one of the sources it traces to (its sourceRef.refs) changed AFTER it was generated —
// compared by file mtime. Flip those back to `planned` so band-skip regenerates only
// them. Deterministic reverse-traversal (the manifest's sourceRef IS the trace) — no AI
// call, no full rebuild. Returns the list of artifacts marked stale.
function markStaleFromChanges() {
  const file = path.join(planPath, 'output.manifest');
  if (!existsSync(file)) return [];
  const mtime = (rel) => { try { return statSync(path.join(projectRoot, rel)).mtimeMs; } catch { return 0; } };
  const stale = [];
  const lines = readText(file).split('\n').map((line) => {
    const s = line.trim();
    if (!s) return line;
    let e; try { e = JSON.parse(s); } catch { return line; }
    if (e.status !== 'created' && e.status !== 'modified') return line;
    const artMtime = mtime(e.artifact);
    if (!artMtime) return line;                            // artifact gone — reconcile/next run handles it
    const refs = (e.sourceRef && e.sourceRef.refs) || [];
    // A source newer than the artifact means the input changed after generation.
    const changed = refs.some((r) => typeof r === 'string' && mtime(r) > artMtime);
    if (changed) { e.status = 'planned'; stale.push(e.artifact); return JSON.stringify(e); }
    return line;
  });
  if (stale.length) writeText(file, lines.join('\n'));
  return stale;
}

// An AI phase (E1/E3/E6): spawn a fresh session, watch it work, read its VERDICT.
// E6 is deliberately a SEPARATE session from E1/E3 so the judge did not write what
// it judges. --dry-run stubs the outcome for state-machine testing.
async function aiSession(phase, repair, band) {
  const prompt = composePrompt(phase, repair, band);
  if (dryRun) {
    console.log(`${C.dim}  [dry-run ${stepName(phase)}] prompt:\n` + indent(prompt) + C.reset);
    const scripted = stubScript[stubCursor++] || 'ok';
    return { pass: scripted === 'ok' || scripted === 'passed', detail: `stub: ${scripted}` };
  }
  const inv = buildInvocation(agent, agentBin,
    `${prompt}\n\n----- HOW TO REPLY -----\nDo the work above using ordinary tools `
    + `(read the command profile under .mde/method/commands/, edit files, run git and .mde scripts). `
    + `Then end with EXACTLY one line:\nVERDICT: <token>\nwhere <token> is one of: ${verdictTokens(phase.kind)}.`);
  const label = stepName(phase) + (band ? ` · band ${band.index}/${band.total} (${band.type})` : '')
    + (repair ? ` [repair ${repair.attempt}/${repair.max}]` : '');
  note(`asking ${agent} to do this — watch it work below:`);
  // Log the invocation START immediately (not only on finish) so the run-log shows
  // what is IN FLIGHT during a long band — otherwise the log is silent for minutes
  // while a big band (10 artifacts) runs, and a stop leaves no trace it was reached.
  logInvocation(label, agent, '·', 'started', band);
  const started = Date.now();
  const { out, code } = await streamAgent(inv, { cwd: projectRoot, env: agentEnv(), C, prefix: `task ${phase.task}` });
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  note(`${agent} finished after ${secs}s`);
  if (LIMIT_RE.test(out)) { logInvocation(label, agent, secs, 'usage-limit'); console.error('\n[limit] agent hit a usage limit — pausing.'); process.exit(4); }
  if (code !== 0 && code != null) console.error(`[warn] ${agent} exited ${code}`);
  const v = parseVerdict(out, ['ok', 'blocked', 'passed', 'failed']);
  logInvocation(label, agent, secs, v || 'no-verdict', band);
  if (!v) { return { pass: false, detail: `${agent} did not give a clear yes/no — treating as failed` }; }
  return { pass: v === 'ok' || v === 'passed', detail: `${agent} reported: ${v}` };
}

// Append one line per agent invocation to the run-log — the durable record of who
// was invoked, in order, and the verdict. Timestamped, UTF-8, human-readable.
function logInvocation(label, who, secs, verdict, band) {
  ensureEvidenceDir();
  const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  const arts = band && band.artifacts ? ` — ${band.artifacts.length} artifact(s)` : '';
  const line = `${ts}  ${label.padEnd(34)} ${who.padEnd(7)} ${String(secs).padStart(4)}s  ${verdict}${arts}\n`;
  try { writeText(runLog, readText(runLog) + line); } catch {}
}
// Record a repair round's REASON in the run-log — so "[repair N]" below it is
// explained: what failed and where the full findings are.
function logRepair(attempt, max, what, findingsFile) {
  ensureEvidenceDir();
  const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  const line = `${ts}  ↻ REPAIR ${attempt}/${max}: ${what}  (findings: ${findingsFile})\n`;
  try { writeText(runLog, readText(runLog) + line); } catch {}
}
function verdictTokens(kind) {
  return kind === 'judge' ? 'passed | failed' : 'ok | blocked';
}

// The prompt = the phase's job + the plan's state. Kept terse; the command prose
// the session reads (evaluate.md) carries the detail. Per-phase compiled
// instructions are a later refinement (evaluate-engine.md §16 Phase 2).
function composePrompt(phase, repair, band) {
  // E3's job is scoped to ONE band — build only these artifacts, treating prior
  // bands as already on disk. This is the per-band grain, not "generate everything".
  // Per-item recovery: the AI flips each manifest entry planned → created/modified the
  // MOMENT it writes that file — one item at a time, inside the session. So a crash mid-band
  // leaves an accurate manifest (done items = created, undone = planned), and a re-run
  // regenerates only the planned ones. This is finer than any framework post-band reconcile
  // (the framework can't see between items) and is carried in the PROSE, so the standalone
  // `mde evaluate` and this engine both get it. The framework's reconcile after the band is
  // then just a safety re-check against disk, not the primary mechanism.
  const perItem = 'As you write EACH file, immediately flip its `output.manifest` entry '
    + '`status` from `planned` to `created` (or `modified`) — one item at a time, right after '
    + 'that file exists — never in a batch at the end. If you stop or fail partway, the manifest '
    + 'must already show exactly which items are done; a re-run regenerates only the `planned` ones. '
    + 'Skip any entry already `created`/`modified` on disk — do not redo it.';
  // Stated BEFORE generation (RULE-CORE-004 "Production logic"): the code you write is
  // production logic, not a demo. No hardcoded sample data, no mock/stub returns in
  // production paths, no silent fallback to fake data when a real call fails, no no-op
  // controls, no hand-written coverage numbers. Data comes from the real store/service/API;
  // a real call that fails must SURFACE, never be papered over. If a real dependency
  // genuinely can't be reached, that is a `blocked`/`partially-executed` condition — record
  // it, do not fake it.
  const productionLogic = 'PRODUCTION LOGIC, not a demo (RULE-CORE-004): the code you write '
    + 'must get its data from the real database/service/API — NO hardcoded sample records, NO '
    + 'mock/stub returns in production paths, NO silent fallback to fake data when a real call '
    + 'fails (a failure must surface, never be hidden behind placeholder data), NO no-op '
    + 'controls, NO hand-written coverage/report numbers. If a real dependency genuinely '
    + 'cannot be reached, mark the item `blocked` and record why — do not fake it to look done.';
  const e3 = band
    ? `GENERATE only this band of the manifest — the "${band.type}" artifacts `
      + `(${band.index} of ${band.total}). Prior bands are already generated and on disk `
      + `(${band.done}); build ON them, do not redo them. `
      + (band.targets && band.targets.length
        ? `These artifacts are mandated by the target(s): ${band.targets.join(', ')} — `
          + `read those target profiles under .mde/method/targets/ and build to their contract, `
          + `not just a file of the right shape. `
        : '')
      + `Write the real files for THIS band, install/build, and run tests as you go to FIX your `
      + `own bugs. ${productionLogic} ${perItem}\nArtifacts in this band:\n`
      + band.artifacts.map((a) => `  - ${a}`).join('\n')
    : 'GENERATE the artifacts (mde evaluate stage 6): walk the planned manifest, write real files, '
      + `install/build, and run tests as you go to FIX your own bugs. ${productionLogic} ${perItem}`;
  const jobs = {
    E1: 'This is `mde evaluate` stages 1–5. READ the frame `mde start` produced — '
      + `${planDir}/scope.md and ${planDir}/discussion.md — for your context; do NOT re-decide `
      + 'the scope. Then AUTHOR what evaluate owns:\n'
      + `  1. SELECT the applicable targets and write ${planDir}/impact.md (the derived `
      + 'target set + impact analysis — this is evaluate\'s job, not start\'s; impact.md does '
      + 'not exist yet).\n'
      + `  2. PLAN the manifest — write ${planDir}/output.manifest, one \`planned\` entry per `
      + 'target-mandated artifact, dependency-ordered (specs → source → data → tests → docs).\n'
      + 'Follow the mde evaluate command profile under .mde/method/commands/evaluate.md. '
      + 'Do NOT generate the artifacts yet.',
    E3: e3,
    E6: 'JUDGE this plan (fresh review — you did not build it). Read each artifact against its specs '
      + '(semantic review), and judge the test EVIDENCE in evidence/logs/test.log for honesty: are the '
      + 'tests real (call the app, not readFileSync) and is the evidence credible? See '
      + '.mde/method/testing/audit-prompt.md. VERDICT: passed only if both hold.',
  };
  const lines = [
    `----- PLAN: ${planDir} -----`,
    `----- STEP: ${stepName(phase)}${band ? ` — band ${band.index}/${band.total}: ${band.type}` : ''} -----`,
  ];
  // A repair re-run must tell the AI WHY it is here and WHERE the findings are —
  // otherwise it rebuilds blind and reproduces the same defect. Handoff is via a
  // FILE, per the method (phases communicate through files, never conversation):
  // the prompt carries a POINTER to the findings file, which the session reads
  // itself with its own tools. It never carries the findings inline.
  if (repair) {
    lines.push(
      `----- THIS IS A REPAIR (attempt ${repair.attempt} of ${repair.max}) -----`,
      `A later check FAILED and you are being run again to fix it. Do not start over.`,
      `What failed: ${repair.what}`,
      `Read the findings here, fix ONLY their cause, then re-run: ${repair.findingsFile}`,
    );
  }
  lines.push(
    jobs[phase.id] || phase.say,
    `----- LEDGER -----`,
    'The framework ticks tasks.md from evidence — do NOT tick your own boxes. Just do the work.',
  );
  return lines.filter((l) => l !== '').join('\n') + '\n';
}
function indent(s) { return s.split('\n').map((l) => '    ' + l).join('\n'); }

// ---- the walk --------------------------------------------------------------
// A phase announces itself in plain words ("Step 3 of 7 · Generating the files"),
// then reports pass/fail. The E-code rides along as a quiet tag for anyone who
// wants it, never as the message.
function stepOf(phase) { return PHASES.findIndex((p) => p.id === phase.id) + 1; }
// The user-facing name of a phase — the tasks.md task + plain words. The internal
// E-code (phase.id) is NEVER shown; it exists only for routing/lookup in code.
function stepName(phase) { return `task ${phase.task} · ${phase.say}`; }
async function runPhase(phase, repair) {
  eng(`Task ${phase.task} · ${phase.say} ${C.dim}(step ${stepOf(phase)}/${PHASES.length})${C.reset}`);
  if (repair) note(`(re-run to fix: ${repair.what})`);
  if (phase.when && !phase.when()) {
    const why = phase.id === 'E4'
      ? 'this plan produced no tests (nothing in its manifest to run) — skipping'
      : 'no app to run for this plan — skipping';
    note(why);
    return { pass: true, detail: 'skipped', skipped: true };
  }
  const r = phase.kind === 'build' ? await buildByBand(phase, repair)
    : phase.kind === 'plan' || phase.kind === 'judge' ? await aiSession(phase, repair)
    : runScript(phase);
  (r.pass ? ok : bad)(`${r.pass ? 'passed' : 'FAILED'} — ${r.detail}`);
  checkpoint(phase.id, r.pass ? 'pass' : 'fail');
  if (r.pass && !r.skipped) tickLines(phase.ticks);
  return r;
}

// Repair (E7): route a gate/judge failure to its OWNING phase and re-run, then
// re-run the gate. Generation defects (E5/E6 fail) route to E3; a scope/manifest
// defect routes to E1. Bounded — on exhaustion, settle rather than loop forever.
function ownerOf(phaseId) {
  if (phaseId === 'E2') return 'E1';   // inclusion failed → the target selection (E1) is wrong
  return 'E3';                          // E5/E6 failed → generation is the owner (verifier never repairs)
}

async function run() {
  banner();
  const start = fromStage || firstUntickedPhase() || PHASES[0].id;
  const startPhase = PHASES.find((p) => p.id === start);
  let i = PHASES.findIndex((p) => p.id === start);
  if (i < 0) i = 0;
  // On a re-run some steps are already done. Name them explicitly so the output
  // never has an unexplained gap — the user must see which steps were NOT executed.
  if (i > 0) {
    const skipped = PHASES.slice(0, i).map((p) => p.task).join(', ');
    console.log('');
    eng(`This is a re-run. Tasks ${skipped} were already done — NOT executed this time.`);
    note(`Starting at task ${startPhase.task} (${startPhase.say.toLowerCase()}).`);
  }

  let repairs = 0;
  while (i < PHASES.length) {
    const phase = PHASES[i];
    const r = await runPhase(phase);

    if (r.pass) { i++; continue; }

    // A blocked GENERATION band is not a validation finding — validation never ran.
    // Halt honestly (completed bands are kept and resumable), rather than fabricate a
    // validation-repair. The user resolves the blocker (e.g. a missing DB) and re-runs;
    // the band-skip fast-forwards past the completed bands to the blocked one.
    if (r.blocked) {
      bad(r.detail);
      note('Resolve the blocker, then re-run — completed bands are kept and will be skipped.');
      return 7;
    }

    // A stop-gate (E2 inclusion) halts the whole plan — the target set is wrong,
    // nothing downstream is meaningful. Fix the plan and re-run.
    if (phase.stopOnFail) {
      bad('this is a blocking check — a required target was skipped, so nothing after it is meaningful.');
      note('Fix the plan\'s targets, then run evaluate again.');
      return 6;
    }

    // Otherwise route to the owner, re-run it, and retry this gate. Budgeted.
    if (++repairs > maxRepairs) {
      bad(`tried to fix this ${maxRepairs} time(s) without success — stopping here.`);
      note('Recording what still fails so you can look at it.');
      await runPhase(PHASES.find((p) => p.id === 'E8'));
      return 5;
    }
    const owner = ownerOf(phase.id);
    const ownerPhase = PHASES.find((p) => p.id === owner);
    eng(`Fixing: that check failed, so re-doing task ${ownerPhase.task} (${ownerPhase.say.toLowerCase()}) — attempt ${repairs} of ${maxRepairs}`);
    // Hand the owner the failure via a FILE, not the prompt. Write the findings
    // to evidence/findings.md and pass its path; the owner reads it with its own
    // tools (phases communicate through files, never conversation).
    const what = `Task ${phase.task} (${phase.say.toLowerCase()}) failed — ${r.detail}`;
    const findingsFile = writeFindings(phase, what, failLogFor(phase.id));
    const repair = { attempt: repairs, max: maxRepairs, what, findingsFile };
    // Record WHY this repair round is happening in the run-log — so a reader later
    // knows what "[repair N]" was about, not just that a repair occurred. The full
    // findings are in findingsFile; this is the one-line reason + pointer.
    logRepair(repairs, maxRepairs, what, findingsFile);
    const oi = PHASES.findIndex((p) => p.id === owner);
    await runPhase(PHASES[oi], repair);
    i = oi + 1;                          // resume just after the owner; re-reaches this gate
  }
  console.log('');
  eng(`${C.ok}All steps passed.${C.reset} The plan is proven — run \`mde go\` to accept and commit it.`);
  return 0;
}

// ---- output ----------------------------------------------------------------
// Print the whole route up front, so the reader always knows where they are and
// what is still ahead. Steps that won't run for this plan are marked.
function banner() {
  console.log(`Evaluating plan : ${planDir}`);
  console.log(`In project      : ${projectRoot}`);
  console.log(`Mode            : ${dryRun ? 'dry-run (AI steps faked)' : `live (AI agent: ${agent})`}`);
  if (!dryRun) {
    // Mark the start of this run in the run-log so successive runs are separable.
    ensureEvidenceDir();
    const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    try { writeText(runLog, readText(runLog) + `\n=== evaluate run ${ts} · ${planDir} · agent=${agent} ===\n`); } catch {}
    console.log(`Run log         : ${path.relative(projectRoot, runLog).replace(/\\/g, '/')}`);
  }
  console.log('');
  console.log('The route (tasks.md tasks) — each must pass before the next runs:');
  for (const p of PHASES) {
    const skip = p.when && !p.when();
    const t = `task ${p.task}`.padEnd(16, ' ');
    const who = { plan: 'AI', build: 'AI', judge: 'AI (fresh reviewer)' }[p.kind] || 'automatic check';
    const skipWhy = p.id === 'E4' ? 'skipped — no tests' : 'skipped — no app';
    console.log(`  ${t}${p.say}${skip ? `  ${C.dim}(${skipWhy})${C.reset}` : ''}  ${C.dim}— ${who}${C.reset}`);
  }
  console.log(`  ${C.dim}If a check fails, the matching build step is redone (up to ${maxRepairs}×) and the check re-run.${C.reset}`);
}
function fail(msg, code) { console.error(`[evaluate] ${msg}`); process.exit(code); }

run().then((c) => process.exit(c ?? 0)).catch((e) => { console.error(e); process.exit(1); });
