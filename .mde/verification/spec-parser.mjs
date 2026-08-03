// spec-parser.mjs — $spec: LAZY, keyed reads of business specs (entities, business
// rules, page specs). Never scans the whole specs/ tree; a check touching one entity
// reads one file.

import { readText, slugNorm } from './manifest-item.mjs';

export function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export function lazyKeyed(loader) {
  const cache = new Map();
  return new Proxy({}, {
    get(_t, key) {
      if (typeof key !== 'string') return undefined;
      if (!cache.has(key)) cache.set(key, loader(key));
      return cache.get(key);
    },
  });
}

export function sectionList(body, heading) {
  const m = body.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |$)`));
  if (!m) return [];
  return m[1].split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}

export function tableFirstColumn(body, heading) {
  const m = body.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |$)`));
  if (!m) return [];
  return m[1].split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*-+/.test(l))     // rows, not separator
    .map((l) => l.split('|')[1]?.trim())
    .filter((c) => c && !/^(name|property|attribute|field)$/i.test(c)); // drop header
}

// First-column value of the row in a table (## <heading>) whose Nth column matches
// re. e.g. the Property whose Role (col 3, 0-based) is "display-label".
export function rowWhereColumn(body, heading, colIdx, re) {
  const m = body.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |$)`));
  if (!m) return undefined;
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|') || /^\|\s*-+/.test(t)) continue;
    const cols = t.split('|').map((c) => c.trim());
    // cols[0] is '' (leading |); property is cols[1], role is cols[colIdx+1].
    if (cols[colIdx + 1] && re.test(cols[colIdx + 1]) && !/^role$/i.test(cols[colIdx + 1])) {
      return cols[1];
    }
  }
  return undefined;
}

// Code identifier forms of a spec property name: "Preferred Name" ->
// ["preferredName", "preferred_name", "preferred name"] — so a check can match
// however the generator named the field.
export function codeForms(label) {
  const words = String(label).trim().split(/\s+/);
  const camel = words.map((w, i) => i === 0 ? w.toLowerCase()
    : w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
  const snake = words.map((w) => w.toLowerCase()).join('_');
  return [...new Set([camel, snake, String(label).toLowerCase()])];
}

// Field names a page spec's "## Data Covered" table declares (the Field column).
export function dataCoveredFields(text) {
  if (!text) return [];
  const body = String(text).replace(/\r\n/g, '\n');
  const m = body.match(/## Data Covered\n([\s\S]*?)(?:\n## |$)/);
  if (!m) return [];
  return m[1].split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*-+/.test(l))
    .map((l) => (l.split('|')[2] || '').trim())     // 2nd column = Field
    .filter((c) => c && !/^field$/i.test(c));
}

// Parse an entity's ## Storage View: the target table name (from a "Table: `x`" line)
// and the column names (first column of the Storage View table). This is the
// authoritative schema the migration must realize (schema-from-entities).
function parseStorageView(body, entityName) {
  const m = body.match(/## Storage View\n([\s\S]*?)(?:\n## |$)/);
  if (!m) return null;
  const sec = m[1];
  // Table name: an explicit `Table: `x`` line if present; otherwise DERIVE it from the
  // entity name (snake_case + naive plural), so a spec that omits the line — like a
  // `### Schema` subsection with no `Table:` — still yields a table to check against.
  let table = (sec.match(/Table:\s*`([^`]+)`/) || [])[1];
  if (!table && entityName) {
    const snake = String(entityName).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    table = snake.endsWith('s') ? snake : snake + 's';
  }
  // Columns: the first column of the FIRST table block under Storage View (the schema
  // table). Storage View may contain several tables (Schema, Indexes, Migration
  // History) — take only the first contiguous run of table rows so we read column
  // names, not index names or migration versions. Header label varies
  // ("Column"/"Field"/…) — drop it by name; position is what matters.
  const lines = sec.split('\n');
  const firstTable = [];
  let inTable = false;
  for (const raw of lines) {
    const l = raw.trim();
    const isRow = l.startsWith('|');
    if (isRow) { inTable = true; if (!/^\|\s*-+/.test(l)) firstTable.push(l); }
    else if (inTable && !l) continue;         // blank line inside/after a table — tolerate one
    else if (inTable) break;                  // first non-table, non-blank line ends the block
  }
  const columns = firstTable
    .map((l) => (l.split('|')[1] || '').trim())
    .filter((c) => c && !/^(column|field|name)$/i.test(c));
  return { table, columns };
}

// Operation ids from an entity's ## Operations table: the first-column `entity.op`
// values, both crud and lifecycle kinds (kind is column 2 — we take every row).
// An operation id is `<entity>.<op>` where each part is lowercase alphanumeric and MAY
// contain hyphens (kebab-case entities like `performance-review.list`) or be camelCase
// (`performanceReview.submit`). Accepts both.
const OP_ID_RE = /^[a-z][A-Za-z0-9-]*\.[a-z][A-Za-z0-9-]*$/;

export function operationIds(body) {
  const m = body.match(/## Operations\n([\s\S]*?)(?:\n## |$)/);
  if (!m) return [];
  return [...new Set(m[1].split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*-+/.test(l))
    .map((l) => (l.split('|')[1] || '').replace(/`/g, '').trim())
    .filter((c) => OP_ID_RE.test(c)))];   // entity.op, drop header
}

// Permitted-role slugs per operation, from the ## Operations table's roles column.
// The roles column position VARIES across spec formats ("Permitted roles" at col 3, or
// "Roles permitted" at col 4), so find it by HEADER rather than hardcoding an index.
// Returns { "entity.op": ["hr-administrator", …] }, role labels slugged.
export function operationRolesFromSpec(body) {
  const m = body.match(/## Operations\n([\s\S]*?)(?:\n## |$)/);
  if (!m) return {};
  const rows = m[1].split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*-+/.test(l));
  if (!rows.length) return {};
  // locate the roles column from the header row (the first row).
  const header = rows[0].split('|').map((x) => x.trim().toLowerCase());
  let roleCol = header.findIndex((h) => /role/.test(h));
  if (roleCol < 0) roleCol = 3;   // fallback to the common position
  const out = {};
  for (const line of rows) {
    const c = line.split('|').map((x) => x.trim());
    const id = (c[1] || '').replace(/`/g, '').trim();
    if (!OP_ID_RE.test(id)) continue;   // skips the header row too
    out[id] = (c[roleCol] || '').split(',').map((r) => slug(r)).filter(Boolean);
  }
  return out;
}

export function parseEntitySpec(root, name) {
  const text = readText(root, `specs/business/entities/${slug(name)}.md`);
  if (text == null) return null;
  const body = text.replace(/\r\n/g, '\n');
  const aspects = sectionList(body, 'Aspects');            // ["Surrogate Key","Audit Trail",...]
  const properties = tableFirstColumn(body, 'Properties'); // ["Preferred Name","Email",...]
  // The property whose Role column is "display-label" — the human-readable field
  // an artifact should show/return for this entity (not its id). + code-name forms.
  const displayLabel = rowWhereColumn(body, 'Properties', 3, /display-label/i);
  // Every operation the entity declares — ALL kinds (crud AND lifecycle), from the
  // ## Operations table's first column (`entity.op` ids). This is the authoritative
  // operation set the API/tests must cover — not just CRUD.
  const operations = operationIds(body);
  const operationRoles = operationRolesFromSpec(body);   // { "entity.op": [role-slugs] }
  const storage = parseStorageView(body, name);   // { table, columns } | null
  return {
    name,
    aspects,
    properties,                                   // all declared field names
    displayLabel,                                 // e.g. "Preferred Name"
    displayLabelForms: displayLabel ? codeForms(displayLabel) : [],  // ["preferredName","preferred_name"]
    operations,                                   // ["performanceReview.create",…,"performanceReview.submit"]
    operationRoles,                               // permitted-role slugs per op (spec ACL)
    table: storage && storage.table,             // the Storage View table name, e.g. "employees"
    columns: (storage && storage.columns) || [],  // declared column names, e.g. ["id","employee_number",…]
    hasAspect: (a) => aspects.some((x) => x.toLowerCase().includes(String(a).toLowerCase())),
    // True when the entity declares an audit-trail or surrogate-key aspect — i.e. it has
    // system metadata the object-info affordance must surface. Drives the info-affordance
    // check by what the entity DECLARES (not by whether the page already names createdAt).
    hasAuditOrSurrogateAspect: String(aspects.some((a) => /audit|surrogate/i.test(a))),
    hasOperation: (op) => operations.includes(op),
    raw: text,
  };
}

// Parse a business-rule spec file. A rule is its own thing — scoped to its file
// existing app-wide (via specInstances('business-rule')), NOT to which entity a plan
// happened to touch (unlike expectedOperations, which is entity-scoped). Its slug is
// the authoritative id a .feature scenario must reference to prove the rule's
// violation path is under test.
export function parseBusinessRuleSpec(root, cap, ruleSlug) {
  const p = `specs/business/capabilities/${cap}/business-rules/${ruleSlug}.md`;
  const text = readText(root, p);
  if (text == null) return null;
  const body = text.replace(/\r\n/g, '\n');
  const statementM = body.match(/## Statement\n([\s\S]*?)(?:\n## |$)/);
  return {
    slug: ruleSlug,
    path: p,
    statement: statementM ? statementM[1].trim() : '',
    raw: body,
  };
}

// Rejection-oriented language a scenario must show to prove it exercises a rule's
// VIOLATION path, not just its happy path. Mirrors the CRUD_PHRASES convention:
// naming the rule slug is not enough (a happy-path scenario can legitimately mention
// a rule in passing) — the scenario must also show the constraint stopping something.
const RULE_VIOLATION_PHRASES = [
  'reject', 'rejected', 'block', 'blocked', 'denied', 'deny', 'invalid',
  'error', 'cannot', "can't", 'not allowed', 'forbidden', 'already exists',
  'duplicate', 'conflict', 'not active', 'inactive',
];

// Acceptance-oriented language a scenario must show to prove the VALID case — the rule
// admitting satisfying input, with an observable effect. Without this half, a lone
// reject case can pass because the endpoint refuses everything; the proof of a rule is
// the CONTRAST (invalid rejected / valid accepted). (The semantic AI check is the real
// arbiter that the reject carries the rule's structured concept id — that needs reading
// the assertion, not a lexicon — but valid+invalid PRESENCE is mechanically checkable.)
const RULE_ACCEPTANCE_PHRASES = [
  'accept', 'accepted', 'succeed', 'succeeds', 'succeeded', 'success',
  'allowed', 'created', 'created successfully', 'persisted', 'saved', 'stored',
  'returns 2', 'status 2', 'shows', 'appears', 'is active', 'transition',
  'valid', 'passes', 'admitted',
];

// Is this business rule exercised by a .feature scenario PAIR — an invalid (violation)
// case AND a valid (compliance) case? Slug presence alone is not enough (mirrors
// operationCovered's slug+phrase pattern); the same scenario blob must carry BOTH
// rejection-oriented language (the rule stopping disallowed input) AND acceptance-
// oriented language (the rule admitting allowed input with an observable effect). A lone
// reject, a lone accept, or a bare mention does not count — the proof is the contrast.
export function businessRuleCovered(rule, featureBlob) {
  if (!featureBlob) return false;
  const slugHit = featureBlob.replace(/[^a-z0-9]/g, '').includes(slugNorm(rule.slug));
  if (!slugHit) return false;
  const hasInvalid = RULE_VIOLATION_PHRASES.some((w) => featureBlob.includes(w));
  const hasValid = RULE_ACCEPTANCE_PHRASES.some((w) => featureBlob.includes(w));
  return hasInvalid && hasValid;
}

// Parse a UI page spec: the design requirements the generated page must implement.
export function parsePageSpec(root, name) {
  const text = readText(root, `specs/design/UI/pages/${slug(name)}.md`);
  if (text == null) return null;
  const body = text.replace(/\r\n/g, '\n');
  // Operation ids the spec names (e.g. employee.create) — lowercase, dotted, and
  // NOT a filename (exclude .tsx/.md/etc.). The spec's semantic intent.
  const operations = [...new Set((body.match(/`([a-z][a-z-]*\.[a-z][a-z-]*)`/g) || [])
    .map((s) => s.replace(/`/g, '')))]
    .filter((s) => !/\.(tsx?|jsx?|mjs|md|css|json)$/i.test(s));
  // Actions the spec's ## Actions table lists (first column, minus the header row).
  const actions = tableFirstColumn(body, 'Actions').filter((a) => a.toLowerCase() !== 'action');
  return {
    name,
    operations,     // ["employee.list","employee.create","employee.search","employee.read"]
    actions,        // ["View employee","Add employee","Search"]
    hasOperation: (op) => operations.includes(op),
    raw: text,
  };
}
