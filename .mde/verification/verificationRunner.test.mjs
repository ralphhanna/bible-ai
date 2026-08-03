// Self-test for the verification model. node --test runner.test.mjs
// Builds throwaway fixtures and asserts each gate fires / stays silent correctly.

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from './model.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const methodDir = path.join(__dirname, '..', 'method');

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mde-verify-'));
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return root;
}

// --- model: derivation + lazy spec ----------------------------------------

test('$item.entity is derived from manifest source.refs (no explicit field)', () => {
  const root = fixture({
    'plans/active/output.manifest':
      '{"artifact":"db/m.sql","outputType":"migration","action":"create",'
      + '"features":["audit-history"],"sourceRef":{"kind":"entity","refs":["specs/business/entities/employee.md"]},"status":"created"}\n',
    'db/m.sql': 'CREATE TABLE employee (id text);',
    'specs/business/entities/employee.md': '## Aspects\n\n- Audit Trail\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  assert.equal(m.manifest[0].entity, 'employee');
  assert.ok(m.spec.entity['employee'].hasAspect('audit'));
});

// --- #1 inclusion: requires closure ∩ tech-stack − loaded − excused --------

test('#1 inclusion: required target not loaded/excused becomes a gap', () => {
  const root = fixture({
    'plans/active/impact.md': '## Loaded Targets\n\n- web-ui\n',
    'plans/active/scope.md': '## Excluded targets\n- target: documentation · reason: x · ref: D1\n',
    'plans/active/output.manifest': '',
    'specs/design/tech-stack.md': '  targets:\n    - type: web-ui\n    - type: testing\n    - type: documentation\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  // web-ui requires [testing, documentation]; documentation excused → only testing missing.
  assert.deepEqual(m.plan.missing, ['testing']);
});

test('#1 inclusion: loading the required target closes the gap', () => {
  const root = fixture({
    'plans/active/impact.md': '## Loaded Targets\n\n- web-ui\n- testing\n- documentation\n',
    'plans/active/output.manifest': '',
    'specs/design/tech-stack.md': '  targets:\n    - type: web-ui\n    - type: testing\n    - type: documentation\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  assert.deepEqual(m.plan.missing, []);
});

test('#1 inclusion: a required target outside the tech-stack universe is NOT demanded', () => {
  const root = fixture({
    'plans/active/impact.md': '## Loaded Targets\n\n- web-ui\n',
    'plans/active/output.manifest': '',
    // universe has web-ui only → testing/documentation not applicable to this app
    'specs/design/tech-stack.md': '  targets:\n    - type: web-ui\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  assert.deepEqual(m.plan.missing, []);
});

// --- capability-vertical-slices: serviceMarked/repositoryMarked -----------

test('expectedOperations.serviceMarked/repositoryMarked reflect the // MDE: marker at each layer', () => {
  const root = fixture({
    'plans/active/output.manifest':
      '{"artifact":"src/server/employee-records/EmployeeRecordsRoutes.ts","outputType":"source","action":"create",'
      + '"features":["capability-api-boundary"],"sourceRef":{"kind":"entity","refs":["specs/business/entities/employee.md"]},"status":"created"}\n'
      + '{"artifact":"src/server/employee-records/EmployeeRecordsService.ts","outputType":"source","action":"create",'
      + '"features":["capability-vertical-slices"],"sourceRef":{"kind":"entity","refs":["specs/business/entities/employee.md"]},"status":"created"}\n'
      + '{"artifact":"src/server/employee-records/EmployeeRecordsRepository.ts","outputType":"source","action":"create",'
      + '"features":["capability-vertical-slices"],"sourceRef":{"kind":"entity","refs":["specs/business/entities/employee.md"]},"status":"created"}\n',
    'src/server/employee-records/EmployeeRecordsRoutes.ts': '// MDE: employee.create\nrouter.post("/employees", create);',
    // Service is marked; Repository is NOT — the two fields must read independently.
    'src/server/employee-records/EmployeeRecordsService.ts': '// MDE: employee.create\nexport function create() {}',
    'src/server/employee-records/EmployeeRecordsRepository.ts': 'export function insertEmployee() {}',
    'specs/business/entities/employee.md': '## Operations\n\n| Operation id |\n|---|\n| `employee.create` |\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  const op = m.plan.expectedOperations.find((o) => o.op === 'employee.create');
  assert.ok(op, 'expected employee.create to be derived from the entity spec');
  assert.equal(op.routeMarked, 'true');
  assert.equal(op.serviceMarked, 'true');
  assert.equal(op.repositoryMarked, 'false');
});

// --- {n}/{name} numbered-path resolution (migrations/seeds) ---------------

// migration is one-per-SCHEMA (perEach: —), NOT per-table/entity — see commit "drop
// per-entity migration mandate": one up/down pair per version bump; entity-table coverage
// is enforced by schema-from-entities, not by a per-entity file count. So the {n} path has
// no {name} to fill; these tests exercise resolveNumberedPath's {n} handling on the per-app row.
test('a migration output resolves {n} against the REAL produced filename, not a guessed default', () => {
  const root = fixture({
    'plans/active/impact.md': '## Loaded Targets\n\n- persistence\n',
    'plans/active/output.manifest':
      '{"artifact":"db/migrations/007_schema.up.sql","outputType":"migration","action":"create",'
      + '"features":["schema-from-entities"],"sourceRef":{"kind":"entity","refs":["specs/business/entities/employee.md"]},"status":"created"}\n',
    'db/migrations/007_schema.up.sql': 'CREATE TABLE employees (id text);',
    'specs/business/entities/employee.md': '## Storage View\n\nTable: `employees`\n\n| Column |\n|---|\n| id |\n',
    'specs/design/tech-stack.md': '  targets:\n    - type: persistence\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  const out = m.plan.expectedOutputs.find((o) => o.output === 'migration');
  assert.ok(out, 'expected a per-app migration output row');
  // Must resolve to the file that actually exists (007_...), never a hardcoded 001 guess.
  assert.equal(out.path, 'db/migrations/007_schema.up.sql');
});

test('a migration output with no matching file on disk stays a genuine, visible gap', () => {
  const root = fixture({
    'plans/active/impact.md': '## Loaded Targets\n\n- persistence\n',
    'plans/active/output.manifest':
      '{"artifact":"specs/business/entities/employee.md","outputType":"specs-update","action":"modified",'
      + '"features":["storage-view-model"],"sourceRef":{"kind":"entity","refs":["specs/business/entities/employee.md"]},"status":"modified"}\n',
    'specs/business/entities/employee.md': '## Storage View\n\nTable: `employees`\n\n| Column |\n|---|\n| id |\n',
    'specs/design/tech-stack.md': '  targets:\n    - type: persistence\n',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  const out = m.plan.expectedOutputs.find((o) => o.output === 'migration');
  assert.ok(out, 'expected a per-app migration output row');
  // No migration file on disk → {n} stays templated, i.e. a visible gap the mandated-output
  // check will correctly flag (never silently defaulted to 001).
  assert.match(out.path, /\{n\}/);
});

// --- designOpCoverage: coverage denominator is the use-case ## Realization ----

test('designOpCoverage: an entity op is covered when a use-case ## Realization references it (uri); an unrealized op is missing', () => {
  const root = fixture({
    // entity declares TWO operations
    'specs/business/entities/project-assignment.md':
      '## Operations\n\n| Operation id | Roles permitted |\n|---|---|\n'
      + '| `project-assignment.create` | staffing-manager |\n'
      + '| `project-assignment.archive` | staffing-manager |\n',
    // a use case whose ## Realization references ONLY .create (by operation uri) — .archive is unrealized
    'specs/business/capabilities/project-staffing/use-cases/assign.md':
      '# Use Case: Assign\n\n## Trigger\n\nA role needs staffing.\n\n## Flow\n\n- **S1** — Propose the assignment.\n\n'
      + '## Realization\n\n### S1\n- operation: specs/business/entities/project-assignment#project-assignment.create\n',
    'plans/active/output.manifest': '',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  const cov = m.app.designOpCoverage;
  assert.equal(cov.inScope, 'true', 'in scope: entity ops + a realization both exist');
  // .create is realized → not missing; .archive is realized nowhere → missing
  assert.match(cov.missing, /project-assignment\.archive/);
  assert.doesNotMatch(cov.missing, /project-assignment\.create/);
  assert.equal(cov.complete, 'false');
});

test('designOpCoverage: complete when every declared op is realized by a use case', () => {
  const root = fixture({
    'specs/business/entities/project-assignment.md':
      '## Operations\n\n| Operation id | Roles permitted |\n|---|---|\n'
      + '| `project-assignment.create` | staffing-manager |\n',
    'specs/business/capabilities/project-staffing/use-cases/assign.md':
      '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — Propose.\n\n'
      + '## Realization\n\n### S1\n- operation: specs/business/entities/project-assignment#project-assignment.create\n',
    'plans/active/output.manifest': '',
  });
  const m = buildModel(root, 'plans/active', methodDir);
  assert.equal(m.app.designOpCoverage.complete, 'true');
  assert.equal(m.app.designOpCoverage.missing, '');
});

// --- precededBy: journey graph resolves + is acyclic --------------------------

const ucFile = (title, precededBy) =>
  `# Use Case: ${title}\n\n## Trigger\n\nX.\n\n## Preceded By\n\n${precededBy}\n\n## Flow\n\n- **S1** — do.\n`;

test('precededBy: a valid chain resolves and is acyclic (ok)', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    [`${cap}/request.md`]: ucFile('Request', 'None'),
    [`${cap}/match.md`]: ucFile('Match', '- {{use-case:request}}'),
    [`${cap}/approve.md`]: ucFile('Approve', '- {{use-case:match}}'),
    'plans/active/output.manifest': '',
  });
  const pb = buildModel(root, 'plans/active', methodDir).app.precededBy;
  assert.equal(pb.inScope, 'true');
  assert.equal(pb.ok, 'true');
});

test('precededBy: a ref to a non-existent / cross-capability use case is dangling', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    [`${cap}/match.md`]: ucFile('Match', '- {{use-case:request}}'),   // no request.md in this cap
    'plans/active/output.manifest': '',
  });
  const pb = buildModel(root, 'plans/active', methodDir).app.precededBy;
  assert.equal(pb.ok, 'false');
  assert.match(pb.dangling, /staffing\/match -> request/);
});

test('precededBy: a cycle in the journey graph is flagged', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    [`${cap}/a.md`]: ucFile('A', '- {{use-case:b}}'),
    [`${cap}/b.md`]: ucFile('B', '- {{use-case:a}}'),   // a<->b cycle
    'plans/active/output.manifest': '',
  });
  const pb = buildModel(root, 'plans/active', methodDir).app.precededBy;
  assert.equal(pb.ok, 'false');
  assert.match(pb.cycles, /staffing/);
});

// --- realizationCoverage: every step # + condition has a realization entry ----

test('realizationCoverage: a Realization that drops a step and a condition is flagged', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    [`${cap}/assign.md`]:
      '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n'
      + '- **S1** — Propose.\n'
      + '- **S2** — Validate.\n'
      + '  - conditions:\n'
      + '    - **Exceeds Capacity Is Rejected** — situation: over → expectedResult: rejected.\n\n'
      + '## Realization\n\n'
      + '### S1\n- operation: specs/business/entities/x#x.create\n',   // S2 + the condition NOT realized
    'plans/active/output.manifest': '',
  });
  const rc = buildModel(root, 'plans/active', methodDir).app.realizationCoverage;
  assert.equal(rc.inScope, 'true');
  assert.equal(rc.complete, 'false');
  assert.match(rc.gaps, /S2/);
  assert.match(rc.gaps, /exceeds capacity is rejected/i);
});

test('realizationCoverage: complete when every step + condition is realized', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    [`${cap}/assign.md`]:
      '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n'
      + '- **S1** — Propose.\n'
      + '- **S2** — Validate.\n'
      + '  - conditions:\n'
      + '    - **Exceeds Capacity Is Rejected** — situation: over → expectedResult: rejected.\n\n'
      + '## Realization\n\n'
      + '### S1\n- operation: specs/business/entities/x#x.create\n\n'
      + '### S2\n- operation: specs/business/entities/x#x.update\n'
      + '- conditions:\n  - condition: Exceeds Capacity Is Rejected\n    expectedApiStatus: 422\n',
    'plans/active/output.manifest': '',
  });
  const rc = buildModel(root, 'plans/active', methodDir).app.realizationCoverage;
  assert.equal(rc.complete, 'true');
  assert.equal(rc.gaps, '');
});

test('realizationCoverage: a use case with no ## Realization is skipped (not in scope)', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    [`${cap}/assign.md`]: '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — Propose.\n',
    'plans/active/output.manifest': '',
  });
  const rc = buildModel(root, 'plans/active', methodDir).app.realizationCoverage;
  assert.equal(rc.inScope, 'false');   // no realization anywhere → this gate is vacuous
});

// --- untaggedConcepts: distinctive concept named in prose without a tag -------

test('untaggedConcepts: a multi-word concept named in prose without a tag is flagged', () => {
  const root = fixture({
    'specs/business/entities/performance-goal.md': '# Entity\n\n## Properties\n\n- title\n',
    'specs/business/capabilities/perf/use-cases/review.md':
      '# Use Case: Review\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — The manager reviews the performance goal.\n',
    'plans/active/output.manifest': '',
  });
  const uc = buildModel(root, 'plans/active', methodDir).app.untaggedConcepts;
  assert.equal(uc.inScope, 'true');
  assert.equal(uc.clean, 'false');
  assert.match(uc.hits, /performance goal/);
});

test('untaggedConcepts: the same concept tagged {{…}} is clean', () => {
  const root = fixture({
    'specs/business/entities/performance-goal.md': '# Entity\n\n## Properties\n\n- title\n',
    'specs/business/capabilities/perf/use-cases/review.md':
      '# Use Case: Review\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — The manager reviews the {{entity:performance-goal}}.\n',
    'plans/active/output.manifest': '',
  });
  const uc = buildModel(root, 'plans/active', methodDir).app.untaggedConcepts;
  assert.equal(uc.clean, 'true');
});

test('untaggedConcepts: a single common-word concept is NOT flagged (precision — left to AI review)', () => {
  const root = fixture({
    // entity named "feedback" — a common word; appears untagged in prose but must NOT be flagged
    'specs/business/entities/feedback.md': '# Entity\n\n## Properties\n\n- text\n',
    'specs/business/capabilities/perf/use-cases/review.md':
      '# Use Case: Review\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — The reviewer provides feedback on the work.\n',
    'plans/active/output.manifest': '',
  });
  const uc = buildModel(root, 'plans/active', methodDir).app.untaggedConcepts;
  assert.equal(uc.clean, 'true');   // single-word "feedback" is too ambiguous for the mechanical gate
});

// --- testing-layer coverage: condition denominator + op/rule guarantees -------

// A use case whose Realization has an op under a STEP but the other op only under a CONDITION.
const ucRealize = (steps, condOps) =>
  '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — do.\n  - conditions:\n'
  + '    - **C1** — situation: s → expectedResult: r.\n\n## Realization\n\n'
  + steps + '\n### S1\n- conditions:\n' + condOps;

test('opConditionCoverage: an op named only under a step (not a condition) is uncovered; one under a condition is covered', () => {
  const cap = 'specs/business/capabilities/staffing/use-cases';
  const root = fixture({
    'specs/business/entities/x.md':
      '## Operations\n\n| Operation id | Roles permitted |\n|---|---|\n'
      + '| `x.create` | m |\n| `x.archive` | m |\n',
    // x.create is under a CONDITION (covered); x.archive is only under a plain step (NOT a condition)
    [`${cap}/assign.md`]:
      '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — do.\n'
      + '  - conditions:\n    - **C1** — situation: s → expectedResult: r.\n\n'
      + '## Realization\n\n### S1\n- operation: specs/business/entities/x#x.archive\n'
      + '- conditions:\n  - condition: C1\n    operation: specs/business/entities/x#x.create\n',
    'plans/active/output.manifest': '',
  });
  const oc = buildModel(root, 'plans/active', methodDir).app.opConditionCoverage;
  assert.equal(oc.inScope, 'true');
  assert.match(oc.missing, /x\.archive/);
  assert.doesNotMatch(oc.missing, /x\.create/);
});

test('ruleConditionCoverage: a rule not named in any condition realization is forgotten (B1)', () => {
  const cap = 'specs/business/capabilities/staffing';
  const root = fixture({
    [`${cap}/business-rules/allocation-limit.md`]: '# Rule\n\n## Statement\n\nno overallocation.\n',
    [`${cap}/use-cases/assign.md`]:
      '# Use Case: Assign\n\n## Trigger\n\nX.\n\n## Flow\n\n- **S1** — do.\n'
      + '  - conditions:\n    - **C1** — situation: s → expectedResult: r.\n\n'
      + '## Realization\n\n### S1\n- conditions:\n  - condition: C1\n    operation: specs/business/entities/x#x.create\n',
    'plans/active/output.manifest': '',
  });
  const rc = buildModel(root, 'plans/active', methodDir).app.ruleConditionCoverage;
  assert.equal(rc.inScope, 'true');
  assert.match(rc.missing, /allocation-limit/);
});

test('ruleEvidence: a rule with no rejection in the run log has no runtime evidence (B2); one with a 422 line is proven', () => {
  const cap = 'specs/business/capabilities/staffing';
  const root = fixture({
    [`${cap}/business-rules/allocation-limit.md`]: '# Rule\n\n## Statement\n\nno overallocation.\n',
    [`${cap}/business-rules/date-overlap.md`]: '# Rule\n\n## Statement\n\nno overlap.\n',
    // run log: allocation-limit fired (422); date-overlap never appears → no evidence
    'reports/evidence/tests-business-rules/run.log':
      'POST /assignments 422 rule=specs/business/capabilities/staffing/business-rules/allocation-limit rejected\n'
      + 'GET /assignments 200 ok\n',
    'plans/active/output.manifest': '',
  });
  const ev = buildModel(root, 'plans/active', methodDir).app.ruleEvidence;
  assert.equal(ev.inScope, 'true');
  assert.equal(ev.logPresent, 'true');
  assert.match(ev.noEvidence, /date-overlap/);
  assert.doesNotMatch(ev.noEvidence, /allocation-limit/);
});
