#!/usr/bin/env node
// Runtime smoke test for a generated MDE app.
//
// Answers the question file-based tests cannot: does the running app actually
// work? Starts the API and web tiers, exercises every path declared in
// openapi.yaml, drives the real UI in a browser, and fails when the frontend
// silently falls back to hardcoded data instead of reaching the API.
//
// Usage:
//   node .mde/method/scripts/verify-app-runtime.mjs [<project-root>] [--json <file>]
//   node .mde/method/scripts/verify-app-runtime.mjs . --skip-ui     (API tier only)
//   node .mde/method/scripts/verify-app-runtime.mjs . --keep-running
//
// Exit 0 = all checks passed. Exit 1 = at least one failed. Exit 2 = could not run.

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const getOpt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const positional = args.filter((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--json');
const root = path.resolve(positional[0] || process.cwd());
const skipUi = args.includes('--skip-ui');
const keepRunning = args.includes('--keep-running');
const jsonOut = getOpt('--json');

const checks = [];
const children = [];
let webPort = null;

function record(name, ok, detail, severity = 'fail') {
  checks.push({ name, ok, detail, severity });
  const icon = ok ? 'PASS' : severity === 'warn' ? 'WARN' : 'FAIL';
  console.log(`  [${icon}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n${title}`);
}

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function env() {
  // Mirror `node --env-file .env` without requiring the flag, so the checks see
  // the same configuration the app does.
  const merged = { ...process.env };
  const text = read('.env');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (value && !merged[m[1]]) merged[m[1]] = value;
  }
  return merged;
}

const appEnv = env();
const apiPort = Number(appEnv.API_PORT || appEnv.PORT || 3001);
const apiBase = `http://localhost:${apiPort}`;

async function waitForHttp(url, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (label) console.log(`    (timed out waiting for ${label})`);
  return false;
}

function startProcess(command, cmdArgs, label) {
  // npx/vite need the shell on Windows (.cmd shims); node does not. Keeping the
  // shell off where possible avoids arg-escaping pitfalls.
  const needsShell = process.platform === 'win32' && !/\.exe$/i.test(command) && command !== process.execPath;
  const proc = spawn(command, cmdArgs, {
    cwd: root,
    env: appEnv,
    shell: needsShell,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const logs = [];
  proc.stdout.on('data', (d) => logs.push(d.toString()));
  proc.stderr.on('data', (d) => logs.push(d.toString()));
  children.push({ proc, label, logs });
  return { proc, logs };
}

function stopAll() {
  if (keepRunning) {
    console.log('\n(--keep-running: leaving API and web servers up)');
    return;
  }
  for (const { proc } of children) {
    try {
      if (process.platform === 'win32' && proc.pid) {
        spawnSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' });
      } else {
        proc.kill('SIGTERM');
      }
    } catch {}
  }
}

// --- 1. Declared vs. real: entry points -------------------------------------

function checkDeclaredEntryPoints() {
  section('Declared entry points');
  const pkgRaw = read('package.json');
  if (!pkgRaw) {
    record('package.json present', false, 'not found');
    return;
  }
  const scripts = (JSON.parse(pkgRaw).scripts) || {};
  // A script that points at a file which does not exist is a broken promise:
  // `npm run` it and you get a module-not-found, not a test result.
  const referenced = new Set();
  for (const body of Object.values(scripts)) {
    for (const m of String(body).matchAll(/(?:^|[\s"'])((?:tests|scripts|src)\/[\w./-]+\.(?:mjs|js|ts|cjs))/g)) {
      referenced.add(m[1]);
    }
  }
  const missing = [...referenced].filter((rel) => !fs.existsSync(path.join(root, rel)));
  record(
    'npm scripts reference existing files',
    missing.length === 0,
    missing.length ? `${missing.length} missing: ${missing.join(', ')}` : `${referenced.size} checked`
  );
}

// --- 2. Tests that cannot fail ----------------------------------------------

function checkTestsAreBehavioral() {
  section('Test substance');
  const testDir = path.join(root, 'tests');
  if (!fs.existsSync(testDir)) {
    record('tests/ exists', false, 'no tests directory');
    return;
  }
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|js|ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(testDir);

  // Behavioural tests reach the running system: HTTP, a browser, or the app's
  // own modules. Tests that only readFileSync + regex pass even when the app is
  // gutted, which is exactly the failure this script exists to surface.
  const behavioural = files.filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return /\b(fetch|supertest|playwright|@playwright|request\(|axios|chromium|firefox|webkit)\b/.test(src);
  });
  const fileGrepOnly = files.filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    const reads = (src.match(/readFileSync|fs\.read/g) || []).length;
    const behaves = /\b(fetch|supertest|playwright|chromium|request\()\b/.test(src);
    return reads > 0 && !behaves;
  });

  record(
    'tests exercise the running system',
    behavioural.length > 0,
    behavioural.length
      ? `${behavioural.length}/${files.length} file(s) make real calls`
      : `0/${files.length} — all tests only read source files`
  );
  if (fileGrepOnly.length) {
    record(
      'no source-grep-only test files',
      false,
      `${fileGrepOnly.length}: ${fileGrepOnly.map((f) => path.relative(root, f).replace(/\\/g, '/')).join(', ')}`,
      'warn'
    );
  }

  // Feature files with no step definitions never run, but cucumber exits 0.
  const features = [];
  const walkFeat = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkFeat(full);
      else if (entry.name.endsWith('.feature')) features.push(full);
    }
  };
  walkFeat(testDir);
  if (features.length) {
    const stepFiles = files.filter((f) => /steps?/i.test(path.basename(f)) || /\b(Given|When|Then)\s*\(/.test(fs.readFileSync(f, 'utf8')));
    const orphaned = features.filter((f) => {
      const dir = path.dirname(f);
      return !stepFiles.some((s) => s.startsWith(dir) || path.dirname(s).startsWith(dir));
    });
    record(
      'every .feature has step definitions',
      orphaned.length === 0,
      orphaned.length
        ? `${orphaned.length} orphaned: ${orphaned.map((f) => path.relative(root, f).replace(/\\/g, '/')).join(', ')}`
        : `${features.length} feature file(s)`
    );
  }
}

// --- 3. Coverage actually moved ---------------------------------------------

function checkCoverage() {
  section('Coverage');
  const summaryPath = ['reports/evidence/coverage/coverage-summary.json', 'coverage/coverage-summary.json']
    .map((rel) => path.join(root, rel))
    .find((p) => fs.existsSync(p));
  if (!summaryPath) {
    record('coverage summary present', false, 'not found (run the test suite first)', 'warn');
    return;
  }
  const total = JSON.parse(fs.readFileSync(summaryPath, 'utf8')).total || {};
  const lines = total.lines?.pct ?? 0;
  // 0% lines with a passing suite is the signature of tests that never load the app.
  record(
    'line coverage above zero',
    lines > 0,
    `${lines}% lines (${total.lines?.covered ?? 0}/${total.lines?.total ?? 0})`
  );
}

// --- 4. API tier ------------------------------------------------------------

function parseOpenApiPaths() {
  const text = read('openapi.yaml');
  if (!text) return [];
  const out = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const p = line.match(/^ {2}(\/\S*):\s*$/);
    if (p) { current = p[1]; continue; }
    const v = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (v && current) out.push({ method: v[1].toUpperCase(), path: current });
  }
  return out;
}

async function checkApiTier() {
  section('API tier');
  const entry = ['dist/server/index.js', 'dist/index.js'].find((rel) => fs.existsSync(path.join(root, rel)));
  if (!entry) {
    record('server build present', false, 'run the build first (no dist/server/index.js)');
    return false;
  }
  startProcess(process.execPath, [entry], 'api');
  const healthUp = await waitForHttp(`${apiBase}/__mde/health`, 30000, 'API health');
  record('API starts and answers /__mde/health', healthUp, healthUp ? apiBase : `no response on ${apiBase}`);
  if (!healthUp) return false;

  const declared = parseOpenApiPaths();
  if (!declared.length) {
    record('openapi.yaml declares paths', false, 'none parsed', 'warn');
    return true;
  }

  // Every declared path must be routed. A 404 here means the contract and the
  // implementation disagree; auth/validation codes still prove the route exists.
  const unrouted = [];
  for (const { method, path: p } of declared) {
    if (p.includes('{')) continue; // needs a real id; covered by the smoke flow below
    let status = 0;
    try {
      const res = await fetch(apiBase + p, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
        signal: AbortSignal.timeout(10000),
      });
      status = res.status;
    } catch (e) {
      status = -1;
    }
    if (status === 404 || status === -1) unrouted.push(`${method} ${p} -> ${status === -1 ? 'no response' : 404}`);
  }
  record(
    'every declared OpenAPI path is routed',
    unrouted.length === 0,
    unrouted.length ? unrouted.join('; ') : `${declared.length} operation(s) declared`
  );
  return true;
}

// --- 5. Web tier: the fallback-data trap ------------------------------------

async function checkWebTier() {
  section('Web tier');
  // Resolve from the app's own node_modules: this script lives in .mde/method,
  // outside the app tree, so a bare import would miss the app's dependency.
  let chromium;
  const appRequire = createRequire(path.join(root, 'package.json'));
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      // CommonJS interop: playwright's named exports arrive under .default.
      const mod = await import(pathToFileURL(appRequire.resolve(pkg)).href);
      chromium = mod.chromium || mod.default?.chromium;
      if (chromium) break;
    } catch {}
  }
  if (!chromium) {
    record('browser automation available', false, 'playwright not installed; skipping UI checks', 'warn');
    return;
  }

  webPort = Number(appEnv.WEB_PORT || 5173);
  const viteConfig = ['src/web/vite.config.ts', 'vite.config.ts'].find((rel) => fs.existsSync(path.join(root, rel)));
  if (!viteConfig) {
    record('web build config present', false, 'no vite config found', 'warn');
    return;
  }
  // Call vite's bin directly with node: avoids the npx shim (and its Windows
  // shell-escaping deprecation) entirely.
  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const [webCmd, webArgs] = fs.existsSync(viteBin)
    ? [process.execPath, [viteBin]]
    : ['npx', ['vite']];
  startProcess(webCmd, [...webArgs, '--config', viteConfig, '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], 'web');
  const webUrl = `http://127.0.0.1:${webPort}/`;
  const webUp = await waitForHttp(webUrl, 45000, 'web server');
  record('web server serves the app', webUp, webUp ? webUrl : `no response on ${webUrl}`);
  if (!webUp) return;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    const apiCalls = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('response', (r) => {
      const u = r.url();
      if (/\/api\//.test(u)) apiCalls.push({ status: r.status(), url: u });
    });

    await page.goto(webUrl, { waitUntil: 'networkidle', timeout: 45000 });
    // Generated apps commonly gate on an identity picker; advance past it so the
    // data-bound screen is what gets inspected.
    for (const label of [/continue/i, /sign in/i, /log in/i]) {
      const button = page.getByRole('button', { name: label });
      if (await button.count().catch(() => 0)) {
        await button.first().click().catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(2500);

    record('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || 'clean');

    // The core check. A frontend that swallows failures and renders hardcoded
    // fallback data looks perfect in a screenshot while being entirely
    // disconnected — so assert the calls happened AND succeeded.
    record('frontend calls the API', apiCalls.length > 0, apiCalls.length ? `${apiCalls.length} call(s)` : 'no /api/ requests observed');

    if (apiCalls.length) {
      const failedCalls = apiCalls.filter((c) => c.status >= 400 || c.status === 0);
      record(
        'frontend API calls succeed',
        failedCalls.length === 0,
        failedCalls.length
          ? failedCalls.slice(0, 4).map((c) => `${c.status} ${c.url.replace(/^https?:\/\/[^/]+/, '')}`).join('; ')
          : `${apiCalls.length} call(s) all < 400`
      );

      const wrongOrigin = apiCalls.filter((c) => c.url.includes(`:${webPort}/api/`));
      record(
        'frontend targets the API origin, not its own',
        wrongOrigin.length === 0,
        wrongOrigin.length
          ? `${wrongOrigin.length} call(s) hit the web origin :${webPort} (missing proxy or API base URL)`
          : `API base resolves off :${webPort}`
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

// --- run --------------------------------------------------------------------

console.log(`Runtime verification: ${root}`);
if (!fs.existsSync(path.join(root, 'package.json'))) {
  console.error(`Not an app root (no package.json): ${root}`);
  process.exit(2);
}

let apiOk = false;
try {
  checkDeclaredEntryPoints();
  checkTestsAreBehavioral();
  checkCoverage();
  apiOk = await checkApiTier();
  if (!skipUi && apiOk) await checkWebTier();
  else if (!skipUi) record('web tier checked', false, 'skipped: API tier did not start', 'warn');
} catch (error) {
  console.error(`\nverification aborted: ${error.stack || error.message}`);
  stopAll();
  process.exit(2);
}

stopAll();

const failures = checks.filter((c) => !c.ok && c.severity === 'fail');
const warnings = checks.filter((c) => !c.ok && c.severity === 'warn');
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`
  + (warnings.length ? `, ${warnings.length} warning(s)` : '')
  + (failures.length ? `, ${failures.length} FAILED` : ''));

if (jsonOut) {
  const target = path.resolve(root, jsonOut);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify({
    root,
    ranAt: new Date().toISOString(),
    passed: failures.length === 0,
    checks,
  }, null, 2) + '\n', 'utf8');
  console.log(`JSON: ${path.relative(root, target).replace(/\\/g, '/')}`);
}

if (failures.length) {
  console.log('\nFailed:');
  for (const f of failures) console.log(`  - ${f.name}: ${f.detail}`);
}
process.exit(failures.length ? 1 : 0);
