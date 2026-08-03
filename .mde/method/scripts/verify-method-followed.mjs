import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const root = path.resolve(positional[0] || process.cwd());
const planDir = positional[1];
const failures = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function fail(message) {
  failures.push(message);
}

// This script now holds ONLY the plan-scoped verifier-ran gate (§0 below). The four
// former whole-app completeness validators (UI design realization, operation coverage,
// page composition, business-rule coverage) all moved to feature checks
// (scope=plan/system, target-scoped) so the method carries no hardcoded, target-specific
// completeness logic here. See design-system-styling.md, page-composition.md,
// ui-shared/operation-coverage.md, and business-rule-catalogue.md.

// §0 verifier-ran gate: `go` must not accept an evaluate that claimed to run
// verificationRunner.mjs (tasks.md stages 4/6 ticked) but left no evidence/logs/verify.log
// behind — a ticked checkbox with no backing run is exactly the rubber-stamp this closes.
// Only runs when a planDir is supplied (go's normal invocation); skipped for callers
// that don't pass one (e.g. mde review app's whole-app run, ad-hoc/test invocations).
function validateVerifierRan() {
  if (!planDir) return;
  const planPath = path.join(root, planDir);
  if (!fs.existsSync(planPath)) return; // plan dir not found is a different failure, not ours to report
  const tasksText = read(path.join(planDir, 'tasks.md'));
  if (!tasksText) return; // no tasks.md yet (e.g. very early draft) — nothing to confirm
  const claimsGate1 = /-\s*\[x\]\s*4\./i.test(tasksText);
  const claimsFull = /-\s*\[x\]\s*6\./i.test(tasksText);
  if (!claimsGate1 && !claimsFull) return; // evaluate hasn't reached verification stages yet
  const verifyLog = read(path.join(planDir, 'evidence', 'logs', 'verify.log'));
  if (!verifyLog.trim()) {
    fail(`verifier: ${planDir}/tasks.md claims Gate 1/full verification ran, but `
      + `${planDir}/evidence/logs/verify.log is missing or empty — the verifier did not actually run`);
    return;
  }
  if (!/\bverify:\s/.test(verifyLog)) {
    fail(`verifier: ${planDir}/evidence/logs/verify.log exists but has no verificationRunner.mjs `
      + `summary line ("verify: N check-evaluation(s)..." or "verify: N distinct issue(s)...") — `
      + `not a real run of the verifier`);
  }
}

// §6 operation coverage MOVED to features: the up-drift direction (a page renders an
// entity.op no entity declares) is a UI defect, now page-composition.md ($t.opsResolve,
// scope=plan target=ui-design). The down-gap direction (declared op / use case with no
// covering page) is ui-shared/operation-coverage.md ($app, scope=system, run under
// mde review app). Removed from here — the script holds no hardcoded UI/operation logic.

// §8 business-rule coverage MOVED to features: the "spec filled in" check is now
// business-rule-catalogue.md ($rule.specComplete, scope=plan); the "referenced by a
// test" check is gherkin-traceability.md ($rule.covered, scope=plan) — both mechanical,
// both target-scoped. Removed from here so the script holds no hardcoded, target-specific
// completeness logic.

// §7 page composition MOVED to features: canvas-type / panel kind-purpose-service
// vocab validity is now page-composition.md ($t.compositionValid, scope=plan
// target=ui-design). The whole-app Maintenance-panel join stays there as scope=system.
// The four whole-app completeness validators (UI design, operation coverage, page
// composition, business rules) all MOVED to feature checks (scope=plan/system,
// target-scoped) — this script now holds only the plan-scoped verifier-ran gate, which
// is target-agnostic and legitimately mechanical. `appWide` is no longer consulted.
validateVerifierRan();

if (failures.length) {
  console.error('Method-followed check failed:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Method-followed check passed (verifier evidence present).');
