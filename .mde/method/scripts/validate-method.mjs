import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the method root from this script's location (scripts/ -> method/),
// so the validator works regardless of the current working directory.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const methodRoot = path.resolve(__dirname, '..');

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, predicate, out);
    else if (!predicate || predicate(p)) out.push(p);
  }
  return out;
}

function frontMatter(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error(`Missing front matter: ${file}`);
  return m[1];
}

function getField(fm, field) {
  const m = fm.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

const ruleFiles = walk(path.join(methodRoot, 'rules'), p => p.endsWith('.rules.md'));
if (ruleFiles.length === 0) throw new Error('No rule files found.');

const ruleIds = new Map();
for (const file of ruleFiles) {
  const fm = frontMatter(file);
  const id = getField(fm, 'id');
  if (!id) throw new Error(`Rule missing id: ${file}`);
  if (ruleIds.has(id)) throw new Error(`Duplicate rule id ${id}: ${file} and ${ruleIds.get(id)}`);
  ruleIds.set(id, file);
}

// Skip compiled PHASE VIEWS (targets/audit/*, and any future targets/<phase>/*): these
// are per-phase instruction views composed from features' ## Audit/## Verification, not
// target profiles — they carry no id/frontmatter and must not be validated as targets.
const PHASE_VIEW_DIR = /[/\\](audit|verification|generation|testing)[/\\]/;
const targetFiles = walk(path.join(methodRoot, 'targets'), p => p.endsWith('.md')
  && !p.endsWith('README.md') && !p.endsWith('catalog.md') && !p.endsWith('index.md')
  && !PHASE_VIEW_DIR.test(p));
const targetIds = new Map();
for (const file of targetFiles) {
  const fm = frontMatter(file);
  const id = getField(fm, 'id');
  if (!id) throw new Error(`Target missing id: ${file}`);
  if (targetIds.has(id)) throw new Error(`Duplicate target id ${id}: ${file} and ${targetIds.get(id)}`);
  targetIds.set(id, file);
}

const commandsDir = path.join(methodRoot, 'commands');
const requiredCommands = ['start.md','evaluate.md','go.md','show.md','change.md','cancel.md','start.branch.md','version.status.md','release.branch.md','review.app.md','review.method.md','macro.md','ready.md'];
for (const cmd of requiredCommands) {
  const file = path.join(commandsDir, cmd);
  if (!fs.existsSync(file)) throw new Error(`Missing command file: ${cmd}`);
  frontMatter(file);
}

// Every command file must declare a unique frontmatter `command:` name (the
// canonical, user-facing name. This guard keeps two files from silently
// claiming the same `mde ...` command.
const commandNames = new Map();
for (const cmdFile of fs.readdirSync(commandsDir)) {
  if (!cmdFile.endsWith('.md') || cmdFile === 'README.md') continue;
  const file = path.join(commandsDir, cmdFile);
  const fm = frontMatter(file);
  const name = getField(fm, 'command');
  if (!name) throw new Error(`Command file missing 'command:' in frontmatter: ${cmdFile}`);
  if (commandNames.has(name)) {
    throw new Error(`Duplicate command name "${name}": ${cmdFile} and ${commandNames.get(name)}`);
  }
  commandNames.set(name, cmdFile);
}

const methodFollowedValidator = path.join(methodRoot, 'scripts', 'verify-method-followed.mjs');
if (!fs.existsSync(methodFollowedValidator)) {
  throw new Error('Missing executable method-followed validator (verify-method-followed.mjs).');
}

// assets/ is a top-level sibling of method/ (AI-only guidance vs literal files a
// target app copies), so it lives at <.mde>/assets, not under method/.
const annotationAssets = path.join(methodRoot, '..', 'assets', 'annotations');
for (const asset of [
  'annotations-core.mjs',
  'annotations-core.d.mts',
  'annotations.tsx',
  'annotations-router.mjs',
  'README.md',
]) {
  if (!fs.existsSync(path.join(annotationAssets, asset))) {
    throw new Error(`Missing annotation asset: ${asset}`);
  }
}
const annotationAdapter = fs.readFileSync(path.join(annotationAssets, 'annotations.tsx'), 'utf8');
if (!annotationAdapter.includes("from './annotations-core.mjs'")) {
  throw new Error('React annotation adapter must consume annotations-core.mjs.');
}
for (const commandName of ['go.md', 'review.app.md']) {
  const commandText = fs.readFileSync(path.join(commandsDir, commandName), 'utf8');
  if (!commandText.includes('verify-method-followed.mjs')) {
    throw new Error(`${commandName} must run verify-method-followed.mjs.`);
  }
}

const methodFiles = walk(methodRoot, p => p.endsWith('.md') || p.endsWith('.json') || p.endsWith('.mjs'));
const deprecatedTracePath = '.mde' + '/trace';
for (const file of methodFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(deprecatedTracePath) || text.includes('manifest' + '.jsonl')) {
    throw new Error(`Deprecated one-file manifest reference found: ${file}`);
  }
}

const traceSchema = path.join(methodRoot, 'templates', 'trace', 'manifest-entry.schema.json');
if (!fs.existsSync(traceSchema)) throw new Error('Missing plan output manifest entry schema.');
const schemaText = fs.readFileSync(traceSchema, 'utf8');
const schema = JSON.parse(schemaText);
for (const field of ['artifact', 'implementor', 'sourceRef', 'rules', 'status']) {
  if (!schemaText.includes(`"${field}"`)) {
    throw new Error(`Manifest schema missing required manifest field: ${field}`);
  }
}
if (schema.properties?.path) {
  throw new Error('Manifest schema must use "artifact" for the artifact file path; do not define a top-level "path" field.');
}
// The manifest is a pure artifact trace: it must NOT carry verification verdicts.
// Verification lives in evidence.md (which references manifest entries).
if (schemaText.includes('"verified"')) {
  throw new Error('Manifest schema must not include a "verified" field — verification belongs in evidence.md.');
}
if (/"enum"\s*:\s*\[[^\]]*"verified"/.test(schemaText) || /"enum"\s*:\s*\[[^\]]*"deferred"/.test(schemaText)) {
  throw new Error('Manifest status enum must be touch-state only (created/modified/deleted/blocked) — no verified/deferred verdicts.');
}

const requiredPlanTemplates = [
  'scope.template.md',
  'discussion.template.md',
  'impact.template.md',
  'acceptance.template.md',
  'tasks.template.md',
  'evidence.template.md',
  'log.template.md',
  'status.template.md',
  'release.template.md',
  path.join('plan', 'plan.template.md')
];
for (const template of requiredPlanTemplates) {
  const file = path.join(methodRoot, 'templates', template);
  if (!fs.existsSync(file)) throw new Error(`Missing plan template: ${template}`);
}

// The status template must carry the derived pending-actions flag, so leftovers
// (open discussion items + deferred scope) are surfaced at completion.
const statusTemplate = fs.readFileSync(path.join(methodRoot, 'templates', 'status.template.md'), 'utf8');
if (!statusTemplate.includes('pending-actions')) {
  throw new Error('Status template must include the pending-actions flag (open discussion items + deferred scope).');
}

const planContract = fs.readFileSync(path.join(methodRoot, 'templates', 'plan', 'plan.template.md'), 'utf8');
for (const required of ['plans/<NNN-slug>/', 'scope.md', 'discussion.md', 'impact.md', 'acceptance.md', 'output.manifest', 'tasks.md', 'evidence.md', 'log.md', 'status.md']) {
  if (!planContract.includes(required)) {
    throw new Error(`Plan folder contract missing required item: ${required}`);
  }
}
if (!planContract.includes('Do not create `plan.md`') || !planContract.includes('Do not create `impact-summary.md`')) {
  throw new Error('Plan folder contract must explicitly forbid plan.md and impact-summary.md.');
}
if (!planContract.includes('Do not create `questions.md` or `decisions.md`')) {
  throw new Error('Plan folder contract must explicitly forbid questions.md and decisions.md (use discussion.md).');
}

console.log(`Method validation passed: ${ruleIds.size} rules, ${targetIds.size} target profiles, ${requiredCommands.length} command profiles.`);
