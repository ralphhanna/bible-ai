#!/usr/bin/env node
// run-macro.mjs — execute an MDE macro YAML, step by step, driving a real agent.
//
// This is the mjs runner behind `mde run <macro-file>` (formerly a prose command
// in commands/macro.md). It works like the goal loop (run-loop.mjs) and SHARES its
// executor layer (agent-runner.mjs) — resolve the CLI, build the invocation, stream
// it live, read the result. The ONE difference from the goal loop: a macro's steps
// are PREDETERMINED (read from the yaml, in order) instead of chosen dynamically.
//
// Session model (claude only), same as the goal loop — load common context once,
// fork per plan:
//   - Agent 0 preloads method/boot/rules ONCE (a resumable baseline session).
//   - ONE session PER PLAN block: the plan's mde steps (start → evaluate → go) share
//     it, so context carries forward across the plan's steps. Each plan block forks
//     a fresh session from the baseline.
//   - The AUDIT step (a fresh judge) forks the baseline into its OWN session, never
//     the plan's — it must not inherit the build (verification model §3).
// --no-preload restores cold-start-each-step. Only claude forks; codex cold-starts.
//
// Runner commands (prompt/pause/show/git) are handled BY THE RUNNER, not the agent:
//   prompt <name> <title> <default>  → ask the user, store $name (default on non-TTY)
//   pause  [message]                 → stop for the user (Enter to go, q to quit)
//   show   <target>                  → read-only; delegated to the agent as `mde show`
//   git    <operation>               → bounded repo control, run directly
// MDE commands (mde start|evaluate|go) are delegated to the agent.
//
// Usage:
//   node .mde/method/scripts/run-macro.mjs <macro.yaml> [--cwd <dir>] [--dry-run]
//        [--from <stepId>] [--agent claude|codex] [--no-preload] [--show-prompt]
//
//   --cwd         folder to run each command in (default: the macro file's dir)
//   --dry-run     print the steps + prompts, do not launch an agent
//   --from <id>   skip steps until this step id, then run from there (resume)
//   --no-preload  disable the Agent-0 baseline (cold-start each step)
//   --show-prompt print the full prompt before each agent step (TTY: confirm first)
//
// Exit: 0 all steps ok / paused cleanly · 1 a step failed (stop_on_error) · 2 usage
//       · 3 no agent · 4 usage-limit.

import { existsSync, readFileSync, statSync, readSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  LIMIT_RE, resolveBinary, buildInvocation as buildInv,
  streamAgent as streamAgentShared, parseVerdict as parseVerdictShared, agentEnv,
} from '../../goal-loop/agent-runner.mjs';

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const getOpt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
// The macro path is the first positional arg — one not itself the value of an
// option flag that takes a value.
const VALUE_OPTS = ['--cwd', '--from', '--agent'];
const macroPath = args.find((a, i) => !a.startsWith('--') && !VALUE_OPTS.includes(args[i - 1]));
if (!macroPath) {
  console.error('usage: node run-macro.mjs <macro.yaml> [--cwd <dir>] [--dry-run] [--from <stepId>] [--agent claude|codex] [--no-preload]');
  process.exit(2);
}
const dryRun = args.includes('--dry-run');
const fromStep = getOpt('--from');
const showPrompt = args.includes('--show-prompt');
const agent = (getOpt('--agent') || 'claude').toLowerCase();
const macroAbs = path.resolve(macroPath);
if (!existsSync(macroAbs)) { console.error(`macro not found: ${macroAbs}`); process.exit(2); }
const workingDir = getOpt('--cwd') ? path.resolve(getOpt('--cwd')) : path.dirname(macroAbs);

// ---- colour + logging (matches run-loop) -----------------------------------
const C = process.stdout.isTTY && !args.includes('--no-color')
  ? { loop: '\x1b[1;35m', dim: '\x1b[2m', reset: '\x1b[0m' }
  : { loop: '', dim: '', reset: '' };
const loop = (msg) => console.log(`${C.loop}MACRO${C.reset} ▸ ${msg}`);

// ---- Agent-0 preload + session state (mirrors run-loop) --------------------
const usePreload = agent === 'claude' && !dryRun && !args.includes('--no-preload');
let baseId = null;            // Agent 0 baseline (read-only common context)
let planSessionId = null;     // the current plan block's working session
const agentBin = dryRun ? null : resolveBinary(agent);
if (!dryRun && !agentBin) { console.error(`[macro] ${agent} CLI not found on PATH`); process.exit(3); }

// ---- macro yaml ------------------------------------------------------------
// The generated shape is nested: plans: [ { id, title, steps: [ {id,command,input,levels} ] } ].
// We parse it minimally (no yaml dep — the generated file is regular). A plan block
// is the session boundary; its steps run in order.
function parseMacro(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let stopOnError = true;
  const plans = [];
  let curPlan = null, curStep = null;
  let inInput = false, inputIndent = 0; const inputBuf = [];
  const flushInput = () => { if (curStep && inputBuf.length) curStep.input = inputBuf.join('\n').trim(); inputBuf.length = 0; inInput = false; };
  const pushStep = () => { if (curStep && curStep.command) curPlan.steps.push(curStep); curStep = null; };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    if (/^\s*stop_on_error:\s*false\b/.test(line)) stopOnError = false;
    if (inInput) {
      const indent = line.match(/^(\s*)/)[1].length;
      if (line.trim() === '' || indent > inputIndent) { inputBuf.push(line.trim()); continue; }
      flushInput();
    }
    // top-level `plans:` entries: `  - id: <planId>`
    const planM = line.match(/^\s{2,4}-\s*id:\s*(.+?)\s*$/);
    const stepM = line.match(/^\s{6,}-\s*id:\s*(.+?)\s*$/);
    if (stepM && curPlan) { flushInput(); pushStep(); curStep = { id: stepM[1], command: '', input: '', levels: [] }; continue; }
    if (planM) { flushInput(); pushStep(); if (curPlan) plans.push(curPlan); curPlan = { id: planM[1], title: '', steps: [] }; continue; }
    const titleM = line.match(/^\s+title:\s*(.+?)\s*$/);
    if (titleM && curPlan && !curStep) { curPlan.title = titleM[1].trim(); continue; }
    const cmdM = line.match(/^\s*command:\s*(.+?)\s*$/);
    if (cmdM && curStep) { curStep.command = cmdM[1].trim(); continue; }
    const inM = line.match(/^(\s*)input:\s*(.*)$/);
    if (inM && curStep) {
      const inline = inM[2].replace(/^[|>]\s*/, '').trim();
      if (inline && inline !== '>' && inline !== '|') curStep.input = inline;
      else { inInput = true; inputIndent = inM[1].length; }
      continue;
    }
  }
  flushInput(); pushStep(); if (curPlan) plans.push(curPlan);
  return { stopOnError, plans };
}

// ---- variables ($name from prompt) -----------------------------------------
const vars = {};
const substitute = (s) => (s || '').replace(/\$([A-Za-z_]\w*)/g, (m, n) => (n in vars ? vars[n] : m));

// ---- runner-command handlers (NOT delegated to the agent) ------------------
// prompt: ask the user, store $name. Non-TTY → the default (scriptable).
function runPrompt(argstr) {
  const m = argstr.match(/^(\S+)\s+"([^"]*)"\s+"([^"]*)"\s*$/) || argstr.match(/^(\S+)\s+(\S+)\s+(.*)$/);
  if (!m) { console.error(`[macro] malformed prompt: ${argstr}`); return true; }
  const [, name, title, def] = m;
  if (!process.stdin.isTTY) { vars[name] = def; loop(`prompt ${name} → "${def}" (default, non-interactive)`); return true; }
  process.stdout.write(`  ${title} [${def}]: `);
  const buf = Buffer.alloc(1024); let n = 0;
  try { n = readSync(0, buf, 0, 1024, null); } catch { n = 0; }
  const answer = buf.slice(0, n).toString().trim();
  vars[name] = answer || def;
  loop(`prompt ${name} → "${vars[name]}"`);
  return true;
}
// pause: stop for the user. Enter = continue, q = quit. Non-TTY → stop (scriptable).
function runPause(message) {
  if (message) loop(`pause: ${substitute(message)}`);
  if (!process.stdin.isTTY) { loop('pause: non-interactive — stopping. Re-run with --from to continue.'); process.exit(0); }
  process.stdout.write('  paused. Enter = continue, q = quit: ');
  const buf = Buffer.alloc(8); let n = 0;
  try { n = readSync(0, buf, 0, 8, null); } catch { return true; }
  const a = buf.slice(0, n).toString().trim().toLowerCase();
  if (a === 'q' || a === 'n') { loop('stopped by user.'); process.exit(0); }
  return true;
}
// git: bounded repo control, run directly (not via the agent).
function runGit(argstr) {
  const sub = substitute(argstr);
  if (dryRun) { loop(`(dry-run) git ${sub}`); return true; }
  // Support `git commit <message>` and passthrough of simple ops. Keep it bounded:
  // only run inside workingDir; never force/push destructive ops implicitly.
  let gitArgs;
  if (/^commit\b/.test(sub)) { const msg = sub.replace(/^commit\s*/, '').trim() || 'macro step'; gitArgs = ['commit', '-am', msg]; }
  else gitArgs = sub.split(/\s+/);
  const r = spawnSync('git', gitArgs, { cwd: workingDir, stdio: 'inherit' });
  if (r.status !== 0) { console.error(`[macro] git ${sub} exited ${r.status}`); return false; }
  return true;
}

// ---- agent step (mde start|evaluate|go|show) — delegated -------------------
const KNOWN_VERDICTS = ['ok', 'blocked', 'passed', 'failed', 'done'];
// A step is an AUDIT judge when its command asks for a review/audit — it must run
// as a fresh judge (own baseline fork), never in the plan's build session.
const isAuditStep = (cmd) => /\breview\b|\baudit\b/i.test(cmd);

async function runAgentStep(step) {
  const command = substitute(step.command);
  const input = substitute(step.input);
  const prompt = [
    `----- MACRO STEP: ${step.id} -----`,
    `Run exactly this MDE command, following its profile under .mde/method/commands/:`,
    `  ${command}`,
    input ? `\nStep input:\n${input}` : '',
    `\nDo the work for THIS command only, then stop. End your reply with exactly one line:`,
    `VERDICT: <token>   (one of: ok | blocked | passed | failed | done)`,
  ].filter(Boolean).join('\n');

  if (dryRun) {
    console.log(`\n=== [${step.id}] ${command} (DRY-RUN) ===`);
    if (input) console.log(`    input: ${input.replace(/\n/g, ' ').slice(0, 100)}${input.length > 100 ? '…' : ''}`);
    return 'ok';
  }

  // Session routing (see header): audit → own baseline fork; other mde steps →
  // the plan's shared session (resume if open, else fork the baseline to open it).
  let opts = {}, role = 'cold';
  if (isAuditStep(command) && baseId)      { opts = { resumeId: baseId }; role = 'fresh judge (fork baseline)'; }
  else if (planSessionId)                  { opts = { resumeId: planSessionId }; role = 'plan (resume)'; }
  else if (baseId)                         { opts = { resumeId: baseId }; role = 'plan (fork baseline)'; }
  const env = agentEnv();
  const inv = buildInv(agent, agentBin, prompt, opts);

  loop(`[${step.id}] ${command} → ${agent}${role !== 'cold' ? ` [${role}]` : ''}`);
  if (showPrompt) console.log(`${C.dim}` + prompt.split('\n').map((l) => '  prompt │ ' + l).join('\n') + `${C.reset}`);
  const started = Date.now();
  const { out, code, sessionId } = await streamAgentShared(inv, { cwd: workingDir, env, C, prefix: 'agent' });
  loop(`[${step.id}] done (${((Date.now() - started) / 1000).toFixed(0)}s)`);

  // Remember the plan's working session so this plan's LATER mde steps resume it.
  // Audit steps never write here — their session stays their own.
  if (!isAuditStep(command) && sessionId) planSessionId = sessionId;

  if (LIMIT_RE.test(out)) { console.error('\n[limit] agent hit a usage limit — pausing.'); process.exit(4); }
  const v = parseVerdictShared(out, KNOWN_VERDICTS);
  // No clear verdict → treat as failure of this step (a gate must not pass unclear).
  if (!v) { console.error(`[warn] no clear VERDICT for [${step.id}] — treating as failed`); return 'failed'; }
  return v;
}

// ---- Agent 0: preload the common context once (mirrors run-loop) -----------
async function preloadBaseline() {
  if (!usePreload) return;
  const id = randomUUID();
  const prompt = [
    '----- AGENT 0: PRELOAD BASELINE -----',
    'You are the baseline session for an MDE macro run. Do NOT do any work, run any',
    'command, or edit any file. Just LOAD the common context every step shares, so',
    'later steps can fork you instead of reloading it:',
    '  1. Read .mde/method/boot.md and the method rules it points to.',
    '  2. Note the project layout (top-level dirs, plans/, specs/, src/).',
    'Then reply with exactly one line: VERDICT: ok',
  ].join('\n');
  const inv = buildInv(agent, agentBin, prompt, { sessionId: id });
  loop('preload → Agent 0 loading common context (once)');
  const started = Date.now();
  const { out, code } = await streamAgentShared(inv, { cwd: workingDir, env: agentEnv(), C, prefix: 'agent0' });
  loop(`preload done (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  if (LIMIT_RE.test(out)) { console.error('\n[limit] agent hit a usage limit — pausing.'); process.exit(4); }
  if (code === 0 || code == null) { baseId = id; loop(`baseline ready — steps fork ${id.slice(0, 8)}…`); }
  else console.error(`[warn] preload exited ${code}; steps will cold-start`);
}

// ---- dispatch one step -----------------------------------------------------
// Returns { ok }. Runner commands are handled here; mde commands go to the agent.
async function runStep(step) {
  const cmd = substitute(step.command);
  const verb = cmd.split(/\s+/)[0];
  const rest = cmd.slice(verb.length).trim();

  if (verb === 'prompt') return { ok: runPrompt(rest) };
  if (verb === 'pause')  return { ok: runPause(step.input || rest) };
  if (verb === 'git')    return { ok: runGit(rest) };
  // 'show' and all `mde ...` verbs are agent-delegated (show is read-only mde show).
  const v = await runAgentStep(step);
  return { ok: v !== 'blocked' && v !== 'failed', verdict: v };
}

// ---- main ------------------------------------------------------------------
const { stopOnError, plans } = parseMacro(readFileSync(macroAbs, 'utf8'));
// Flatten to an ordered list but remember each step's plan id (session boundary).
const steps = [];
for (const p of plans) for (const s of p.steps) steps.push({ ...s, planId: p.id });
let list = steps;
if (fromStep) {
  const i = steps.findIndex((s) => s.id === fromStep);
  if (i < 0) { console.error(`--from: step id '${fromStep}' not found`); process.exit(2); }
  list = steps.slice(i);
}

console.log(`macro   : ${macroAbs}`);
console.log(`cwd     : ${workingDir}`);
console.log(`agent   : ${dryRun ? 'DRY-RUN' : agent}${usePreload ? ' (Agent-0 preload, session-per-plan)' : ''}`);
console.log(`plans   : ${plans.length} · steps: ${list.length}${fromStep ? ` (from ${fromStep})` : ''}`);
console.log(`stop_on_error: ${stopOnError}`);

await preloadBaseline();

let failed = 0, lastPlan = null;
for (const step of list) {
  // Plan boundary → drop the previous plan's working session; the new plan forks
  // a fresh session from the baseline on its first agent step.
  if (step.planId !== lastPlan) { planSessionId = null; lastPlan = step.planId; loop(`══ plan: ${step.planId} ══`); }
  const r = await runStep(step);
  if (!r.ok) {
    failed++;
    if (stopOnError) { console.error(`\nStopping: step [${step.id}] failed${r.verdict ? ` (${r.verdict})` : ''}, stop_on_error is on.`); break; }
  }
}
console.log(`\nDone. ${list.length - failed}/${list.length} steps ok.`);
process.exit(failed && stopOnError ? 1 : 0);
