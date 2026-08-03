// format-helpers.mjs — pure formatting/matching helpers for verifier output: the
// stdout summary printer, path matching for the mandated-output gate, and the
// markdown-report text helpers (status lines, anchors, ref links, grouping).

// Print grouped findings + summary; exit code 0 clean, 1 on any fail/ask. Shared by
// gate=1 (inclusion-only) and the full run so both report identically.
export function finish(complaints, ran) {
  if (!complaints.length) {
    console.log(`verify: ${ran} check-evaluation(s), clean.`);
    return 0;
  }
  const fails = complaints.filter((c) => c.kind !== 'ask');
  const asks = complaints.filter((c) => c.kind === 'ask');
  // Group by (capability + message) so a SYSTEMIC issue (same failure across many
  // files) is ONE finding with a count + its instances — not N lines burying the
  // distinct problems. Signal over spam.
  printGrouped('[FAIL]', fails);
  printGrouped('[ASK] ', asks);
  const distinctFails = groupKey(fails).size;
  console.log(`\nverify: ${distinctFails} distinct issue(s) across ${fails.length} instance(s)`
    + `${asks.length ? `, ${groupKey(asks).size} to confirm (ASK)` : ''}.`);
  return fails.length || asks.length ? 1 : 0;
}

// Does a produced manifest path satisfy an expected output path? Tolerant so a
// per-page file matches regardless of naming case/separators:
//   expected src/web/src/pages/employee-directory.tsx  ~  EmployeeDirectory.tsx
// A directory-style expected path (ends with / or no extension) matches any path
// under that directory.
export function pathMatches(produced, expected) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9/.]/g, '');
  const p = norm(produced), e = norm(expected);
  if (expected.endsWith('/') || !/\.[a-z0-9]+$/i.test(expected)) {
    return p.includes(e.replace(/\/$/, '') + '/') || p.includes(e);
  }
  // file: compare the dir (loosely) + the basename slug-insensitively.
  const eBase = e.split('/').pop();          // employeedirectory.tsx
  const pBase = p.split('/').pop();
  return p.includes(e) || pBase === eBase
    || pBase.replace(/[^a-z0-9.]/g, '') === eBase.replace(/[^a-z0-9.]/g, '');
}

function lc(s) { return String(s).toLowerCase(); }
function pluralUnit(subject) {
  // a rough noun for the "nothing to check" phrase, from the subject.
  return /s$/i.test(subject) ? subject : subject + 's';
}

// A check's status line: explicit failed/passed/total so the reader doesn't subtract.
// subjects = operations/items evaluated; findings = how many failed.
// Common report syntax: "<Subject>: N out of T <whenFailed>" — a plain sentence that
// says what is lacking. Falls back to the capability name + generic count when a check
// hasn't declared subject/whenFailed yet.
export function capStatus(r) {
  const failed = r.findings.length;
  const total = Math.max(r.subjects, failed);
  const subj = r.subject || r.capability;
  if (r.subjects === 0) {
    return `➖ ${subj}: nothing to check (no ${lc(pluralUnit(subj))} in this plan)`;
  }
  if (failed === 0) {
    const ok = r.whenPassed ? r.whenPassed : 'OK';
    return `✅ ${subj}: all ${total} ${ok}`;
  }
  const cond = r.whenFailed || 'failed';
  return `❌ ${subj}: ${failed} out of ${total} ${cond}`;
}

// A stable anchor slug for a capability id (lowercase, non-alphanumerics → hyphen).
export function anchorSlug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Render a finding's ref. If it looks like a file path (optionally `path:line` or
// `path#Lline`), make it a CLICKABLE relative link to the source — so the report jumps
// to where the problem is. Non-path refs (an op id, a table name) stay as code.
// The report is written to <project>/reports/, so project-relative paths must be
// prefixed with `../` to resolve from the report's own folder.
const REL_UP = '../';
export function refLink(ref) {
  if (!ref) return '';
  const r = String(ref);
  // directory-style ref (ends with /) → link the folder
  if (/\/$/.test(r)) return `  — [${r}](${REL_UP}${r.replace(/\\/g, '/')})`;
  const m = r.match(/^(.+?\.[a-z0-9]+)(?::(\d+)|#L(\d+))?$/i);   // file(.ext)[:line|#Lline]
  if (m && /[\/].|\.(ts|tsx|js|jsx|mjs|sql|json|md|feature|py)$/i.test(m[1])) {
    const line = m[2] || m[3];
    const rel = m[1].replace(/\\/g, '/');
    return `  — [${r}](${REL_UP}${rel}${line ? `#L${line}` : ''})`;
  }
  return `  — \`${r}\``;
}

export function groupKey(list) {
  const g = new Map();
  for (const c of list) {
    const k = `${c.capability}|${c.message}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(c);
  }
  return g;
}

// A ref should be a string path/id, but a check can accidentally pass the raw
// item object. Reduce it to the most useful string rather than "[object Object]".
function refToString(ref) {
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  if (Array.isArray(ref)) return ref.map(refToString).filter(Boolean).join(', ');
  if (typeof ref === 'object') {
    // A finding item that carries a refs[] (e.g. {kind, refs:[path]}) — surface
    // the first real source path rather than the wrapper object.
    if (Array.isArray(ref.refs) && ref.refs.length) return refToString(ref.refs[0]);
    return ref.path || ref.sourceRef || ref.artifact || ref.op || ref.id
      || ref.name || ref.table || ref.slice || JSON.stringify(ref);
  }
  return String(ref);
}

function printGrouped(tag, list) {
  for (const [, items] of groupKey(list)) {
    const c = items[0];
    const n = items.length;
    console.log(`${tag} (${c.capability}) ${c.message}${n > 1 ? `  [${n} files]` : ''}`);
    // list refs indented; cap at 8 to keep it readable, note the remainder.
    // Coerce each ref to a readable string — a ref that arrived as an object
    // (a trace/manifest item that wasn't reduced to its path upstream) must
    // never print as "[object Object]".
    const refs = items.map((x) => refToString(x.ref)).filter(Boolean);
    for (const r of refs.slice(0, 8)) console.log(`         — ${r}`);
    if (refs.length > 8) console.log(`         … and ${refs.length - 8} more`);
  }
}
