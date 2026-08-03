#!/usr/bin/env node
// plan-ready.mjs — the "am I good to go?" roll-up. After `mde evaluate`, this reads
// the evidence a plan already produced and prints ONE canonical verdict + table:
// GO / GO-WITH-NOTES / NO-GO. Deterministic — same evidence, same verdict, for any
// agent (Claude, Codex, …). It does NOT re-run anything; it reads what the gates
// already decided (verify.log, audit.md, runtime.json, coverage, manifest, status).
//
// This is the "Trust" half of Trust-but-Verify: a stable baseline. The `mde ready?`
// command profile then has the AI independently re-read the same evidence and
// co-sign or DISPUTE this verdict — so a bug here shows up as a disagreement, not a
// silent wrong answer.
//
//   node .mde/method/scripts/plan-ready.mjs <project-root> <plan-dir> [--json]
//
// Exit: 0 GO · 0 GO-WITH-NOTES · 1 NO-GO · 2 usage/inputs.
// (Non-zero ONLY for NO-GO so a caller can gate on it; notes do not fail.)

import fs from 'node:fs';
import path from 'node:path';

const [, , rootArg, planArg, ...rest] = process.argv;
const asJson = rest.includes('--json');
if (!rootArg || !planArg) {
  console.error('usage: node plan-ready.mjs <project-root> <plan-dir> [--json]');
  process.exit(2);
}
const root = path.resolve(rootArg);
const planDir = path.isAbsolute(planArg) ? planArg : path.join(root, planArg);
if (!fs.existsSync(planDir)) { console.error(`plan dir not found: ${planDir}`); process.exit(2); }

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const readJson = (p) => { try { return JSON.parse(read(p)); } catch { return null; } };
const has = (p) => fs.existsSync(p);
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

// ---- a gate row: {gate, status: pass|note|fail|n/a, witness} ---------------
const rows = [];
const add = (gate, status, witness) => rows.push({ gate, status, witness });

// ---- 1. Verification (mechanical verifier) ---------------------------------
// verify.log's last run ends "verify: N check-evaluation(s), clean." on success,
// or lists [FAIL] lines. status.md's `validate:` line corroborates.
{
  const log = read(path.join(planDir, 'evidence', 'logs', 'verify.log'));
  const status = read(path.join(planDir, 'status.md'));
  if (!log && !/validate:/i.test(status)) add('Verification', 'n/a', 'no verify.log or status validate line found');
  else {
    const fails = (log.match(/\[FAIL\]/g) || []).length;
    const cleanM = [...log.matchAll(/verify:\s*(\d+)\s*check-evaluation\(s\),\s*clean/gi)].pop();
    const validateSaysPassed = /validate:\s*passed/i.test(status);
    if (fails > 0) add('Verification', 'fail', `${fails} [FAIL] in verify.log`);
    else if (cleanM) add('Verification', 'pass', `${cleanM[1]} checks clean`);
    else if (validateSaysPassed) add('Verification', 'pass', 'status: validate passed (no verify.log clean line)');
    else add('Verification', 'note', 'no clean/FAIL signal in verify.log — inconclusive');
  }
}

// ---- 2. Substance audit ----------------------------------------------------
// Parse the CONCERN table's verdict column (| concern | verdict | witness | …).
// A fake is an Integrity Violation → blocking (NO-GO), non-compensable. Also read
// the ## Audit Targets table for targets loaded but NOT audited (a coverage note).
{
  const auditPath = path.join(planDir, 'audit.md');
  if (!has(auditPath)) add('Substance audit', 'fail', 'no audit.md — the plan-scoped audit did not run');
  else {
    const md = read(auditPath);
    const tally = { genuine: 0, fake: 0, 'not-exercised': 0 };
    // Only rows whose 2nd cell is exactly a verdict token — the concern table.
    for (const line of md.split('\n')) {
      const m = line.match(/^\|[^|]*\|\s*(genuine|fake|not-exercised)\s*\|/i);
      if (m) tally[m[1].toLowerCase()]++;
    }
    // Not-audited targets (## Audit Targets table, 2nd cell "not audited").
    const notAudited = [];
    for (const line of md.split('\n')) {
      const m = line.match(/^\|\s*([^|]+?)\s*\|\s*not audited\s*\|/i);
      if (m) notAudited.push(m[1].trim());
    }
    if (tally.fake > 0) add('Substance audit', 'fail', `${tally.fake} FAKE (Integrity Violation — blocking); ${tally.genuine} genuine`);
    else {
      const parts = [`${tally.genuine} genuine`];
      if (tally['not-exercised']) parts.push(`${tally['not-exercised']} not-exercised`);
      const isNote = tally['not-exercised'] > 0 || notAudited.length > 0;
      let w = parts.join(', ');
      if (notAudited.length) w += `; not audited: ${notAudited.join(', ')}`;
      add('Substance audit', isNote ? 'note' : 'pass', w);
    }
  }
}

// ---- 3. Coverage (measured, not fabricated) --------------------------------
// Read the merged report; a real report has src/** keys resolving on disk. A report
// present but with NO real source key is cosplay → treated as a fail (fake).
{
  const covPath = path.join(root, 'reports', 'evidence', 'coverage', 'coverage-summary.json');
  const j = readJson(covPath);
  if (!j) add('Coverage', 'n/a', 'no reports/evidence/coverage/coverage-summary.json (may be out of scope for this plan)');
  else {
    const pct = j.total?.lines?.pct;
    const keys = Object.keys(j).filter((k) => k !== 'total');
    const realKeys = keys.filter((k) => {
      const n = String(k).replace(/\\/g, '/');
      const r = n.includes('/src/') ? n.slice(n.indexOf('/src/') + 1) : n;
      return /^src\//.test(r) && has(path.join(root, r));
    });
    const floorM = read(path.join(root, 'specs', 'design', 'mde-policy.md')).match(/minCoverage:\s*(\d+(?:\.\d+)?)/);
    const floor = floorM ? Number(floorM[1]) : 75;
    if (keys.length && realKeys.length === 0) add('Coverage', 'fail', `report has no real src/** entries — coverage cosplay (${keys.length} synthetic keys)`);
    else if (typeof pct === 'number' && pct < floor) add('Coverage', 'fail', `${pct}% < ${floor}% floor (${realKeys.length} real src files)`);
    else if (typeof pct === 'number') add('Coverage', 'pass', `${pct}% measured (${realKeys.length} real src files, floor ${floor}%)`);
    else add('Coverage', 'note', 'coverage report present but no total line pct');
  }
}

// ---- 4. Runtime gate -------------------------------------------------------
// runtime.json: passed:true and per-check ok. A `warn`-severity check that is not ok
// is a NOTE (e.g. "playwright not installed"); a `fail`-severity not-ok is a fail.
{
  const rt = readJson(path.join(planDir, 'evidence', 'runtime.json'));
  if (!rt) add('Runtime', 'n/a', 'no runtime.json (not an application plan, or gate not run)');
  else {
    const bad = (rt.checks || []).filter((c) => !c.ok);
    const hardFails = bad.filter((c) => (c.severity || 'fail') !== 'warn');
    const warns = bad.filter((c) => c.severity === 'warn');
    if (hardFails.length) add('Runtime', 'fail', `${hardFails.length} failed: ${hardFails.map((c) => c.name).join('; ')}`);
    else if (!rt.passed) add('Runtime', 'fail', 'runtime.json passed:false');
    else if (warns.length) add('Runtime', 'note', `passed with warning(s): ${warns.map((c) => c.detail || c.name).join('; ')}`);
    else add('Runtime', 'pass', 'all runtime checks passed');
  }
}

// ---- 5. Manifest completeness ----------------------------------------------
// Every planned entry must have a real touch state; a leftover `planned` (not blocked)
// means work did not finish. `blocked` is a fail (the plan is incomplete).
{
  const mf = read(path.join(planDir, 'output.manifest'));
  if (!mf.trim()) add('Manifest', 'n/a', 'no output.manifest');
  else {
    let planned = 0, blocked = 0, done = 0, total = 0;
    for (const line of mf.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let e; try { e = JSON.parse(line); } catch { continue; }
      total++;
      const s = (e.status || '').toLowerCase();
      if (s === 'planned') planned++;
      else if (s === 'blocked') blocked++;
      else if (s === 'created' || s === 'modified' || s === 'deleted') done++;
    }
    if (blocked) add('Manifest', 'fail', `${blocked} blocked entr${blocked === 1 ? 'y' : 'ies'} (work did not complete)`);
    else if (planned) add('Manifest', 'fail', `${planned} entr${planned === 1 ? 'y' : 'ies'} still \`planned\` (never generated)`);
    else add('Manifest', 'pass', `${done}/${total} artifacts produced`);
  }
}

// ---- 6. Debt & lifecycle (from status.md) ----------------------------------
{
  const status = read(path.join(planDir, 'status.md'));
  if (!status) add('Status', 'note', 'no status.md');
  else {
    const lc = (status.match(/lifecycle:\s*([a-z-]+)/i)?.[1] || '').toLowerCase();
    const debt = status.match(/verification-debt:\s*(.+)/i)?.[1]?.trim();
    const pending = status.match(/pending-actions:\s*(.+)/i)?.[1]?.trim();
    const hasDebt = debt && !/^none$/i.test(debt);
    const hasPending = pending && !/^none$/i.test(pending) && !/^\d+\s+deferred/i.test(pending);
    if (['partially-executed', 'blocked'].includes(lc)) add('Status', 'fail', `lifecycle: ${lc}`);
    else if (hasDebt) add('Status', 'fail', `verification debt: ${debt}`);
    else if (hasPending) add('Status', 'note', `pending: ${pending}`);
    else add('Status', 'pass', `lifecycle: ${lc || 'unknown'}, no debt`);
  }
}

// ---- 7. Uncommitted / dirty non-manifest files (Codex caught this) ---------
// A dirty file NOT listed in the plan's manifest is a note the user should see —
// it will not be committed by `go`, and it may be drift left behind.
{
  const status = read(path.join(planDir, 'status.md'));
  const m = status.match(/(?:external dirty|uncommitted|not manifest-listed)[^\n]*?(specs\/[^\s`]+|src\/[^\s`]+)/i);
  if (m) add('Uncommitted', 'note', `dirty non-manifest file noted: ${m[1]}`);
}

// ---- verdict ---------------------------------------------------------------
const anyFail = rows.some((r) => r.status === 'fail');
const anyNote = rows.some((r) => r.status === 'note');
const verdict = anyFail ? 'NO-GO' : anyNote ? 'GO-WITH-NOTES' : 'GO';
const mark = { pass: '✓', note: '~', fail: '✗', 'n/a': '·' };

if (asJson) {
  console.log(JSON.stringify({ plan: path.basename(planDir), verdict, rows }, null, 2));
  process.exit(verdict === 'NO-GO' ? 1 : 0);
}

// ---- table render ----------------------------------------------------------
const glyph = { 'GO': '✓', 'GO-WITH-NOTES': '~', 'NO-GO': '✗' }[verdict];
console.log(`\n${glyph} ${verdict}  ·  ${path.basename(planDir)}`);
const gw = Math.max(...rows.map((r) => r.gate.length), 12);
console.log('─'.repeat(gw + 60));
for (const r of rows) {
  console.log(`${mark[r.status]} ${r.gate.padEnd(gw)}  ${r.witness}`);
}
console.log('─'.repeat(gw + 60));
if (verdict === 'NO-GO') console.log('NO-GO: resolve the ✗ rows (a FAKE audit finding is a blocking Integrity Violation) before `mde go`.');
else if (verdict === 'GO-WITH-NOTES') console.log('GO with notes: the ~ rows are non-blocking; review them, then `mde go` if acceptable.');
else console.log('GO: all gates clean. Proceed to `mde go`.');
console.log(`\n(Trust: this is the deterministic roll-up. Verify: have the AI re-read the evidence and confirm or dispute — \`mde ready?\`.)`);

process.exit(verdict === 'NO-GO' ? 1 : 0);
