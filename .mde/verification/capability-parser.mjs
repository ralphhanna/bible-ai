// capability-parser.mjs — read capability (feature) .md files: their id, impacts:
// target scoping, ## Checks question bullets, and the ```check fenced blocks
// themselves (extraction only — parsing the DSL rules inside a block is
// dsl-evaluator.mjs's job).

import fs from 'fs';
import path from 'path';

export function walk(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, pred, out);
    else if (!pred || pred(p)) out.push(p);
  }
  return out;
}

export function capId(text, fallback) {
  const m = text.match(/^id:\s*(.+)$/m);
  return m ? m[1].trim() : fallback;
}

// The `impacts:` target list from a capability's frontmatter (YAML list of target
// ids). Used to scope which capabilities' checks run for a plan (only those whose
// impacts include a loaded target). Empty ⇒ unscoped (always runs).
export function capImpacts(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^impacts:\s*\n((?:\s*-\s*.+\n?)+)/m);
  if (!m) return [];
  return m[1].split('\n')
    .map((l) => (l.match(/^\s*-\s*(.+?)\s*$/) || [])[1])
    .filter(Boolean);
}

// The human-readable check questions from a capability's `## Checks` section — the
// `- <question>?` bullets (joined multi-line, dropping the `· evidence/when` sub-items).
// Report Option A: these are the plain-language "what this checks" text.
export function checksBullets(text) {
  const body = text.replace(/\r\n/g, '\n');
  // Only the prose BEFORE the first check fence — never let bullet continuation eat
  // into a ```check block (that was leaking DSL/# comments into the questions).
  let section = (body.split(/\n## Checks\n/)[1] || '');
  section = section.split('\n```')[0];        // stop at the first fenced block
  section = section.split('\n## ')[0];        // or the next heading
  const out = [];
  let cur = null;
  for (const raw of section.split('\n')) {
    const line = raw;
    if (/^\s*[-*]\s+/.test(line)) {                     // new bullet
      if (cur) out.push(cur.trim());
      cur = line.replace(/^\s*[-*]\s+/, '');
    } else if (cur && /^\s+·/.test(line)) {             // evidence/when sub-item → end this bullet
      out.push(cur.trim()); cur = null;
    } else if (cur && line.trim() && !/^(#|WHEN|EVERY|THEN|ELSE|ASK|AND)\b/.test(line.trim())) {
      cur += ' ' + line.trim();                         // genuine continuation only
    } else if (cur && !line.trim()) {                   // blank line ends the bullet
      out.push(cur.trim()); cur = null;
    }
  }
  if (cur) out.push(cur.trim());
  return out;
}

// Pick the `## Checks` question whose significant words most overlap the check block
// (its `#` comment + rule). Order-independent, so a block is labeled by its ACTUAL
// intent, not its position. Returns '' when no bullet shares enough (≥2 words) — the
// caller then falls back to the block's own comment.
const STOP = new Set(('the a an is are does do of to in on and or not per each every with '
  + 'for its it this that be by must has have no any as at from where when then else ask').split(' '));
const _words = (s) => new Set(String(s).toLowerCase().match(/[a-z][a-z-]{2,}/g) || []);
function _overlap(q, blockBody) {
  const bw = _words(blockBody);
  let score = 0;
  for (const w of _words(q)) if (!STOP.has(w) && bw.has(w)) score++;
  return score;
}

// Assign each block its best `## Checks` question, each bullet used at most once.
// Greedy: compute all (block,question) scores, take the highest, lock both, repeat.
// Returns an array parallel to blocks (question text or '' if none scored ≥2).
export function assignQuestions(blocks, questions) {
  const result = new Array(blocks.length).fill('');
  if (!questions.length) return result;
  const pairs = [];
  blocks.forEach((b, bi) => questions.forEach((q, qi) => {
    const s = _overlap(q, b.body);
    if (s >= 2) pairs.push({ bi, qi, s });
  }));
  pairs.sort((a, b) => b.s - a.s);
  const usedB = new Set(), usedQ = new Set();
  for (const p of pairs) {
    if (usedB.has(p.bi) || usedQ.has(p.qi)) continue;
    result[p.bi] = questions[p.qi];
    usedB.add(p.bi); usedQ.add(p.qi);
  }
  return result;
}

// A check block's leading `#` comment, cleaned to one line — the most specific "what".
export function leadingComment(body) {
  const lines = body.split('\n').map((l) => l.trim());
  const comments = [];
  for (const l of lines) {
    if (l.startsWith('#')) comments.push(l.replace(/^#+\s?/, ''));
    else if (comments.length) break;   // stop at first non-comment after comments begin
    else if (l) break;                 // rule started before any comment
  }
  const joined = comments.join(' ').trim();
  return joined && joined.length > 8 ? joined : '';
}

// Extract every ```check scope=<item|plan|system> … ``` block from a capability file.
// scope = how OFTEN the check runs (its only meaning):
//   scope=item   → runs once per manifest item that this capability produced;
//                  `$item` is bound each iteration (the #4 quality common case).
//   scope=plan   → runs ONCE for the whole plan; the check iterates whatever set it
//                  needs as DATA — $plan.trace (all manifest items), $plan.entities,
//                  $manifest — e.g. a cross-cutting trace-header scan.
//   scope=system → runs ONCE per verifier invocation, independent of any plan — for
//                  whole-app completeness questions with no owning plan (e.g. "does
//                  every entity have a Maintenance panel somewhere"). Only evaluated
//                  under `mde review app` (--app-wide); never at evaluate/go, since
//                  there is no current plan for it to belong to. Body is normally an
//                  ASK (the AI reads the relevant spec trees itself) — see README.
// A missing tag defaults to `item`.
export function checkBlocks(text) {
  const out = [];
  const re = /```check\s*([^\n]*)\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(text.replace(/\r\n/g, '\n')))) {
    const tags = m[1];
    const tag = (tags.match(/\bscope\s*=\s*(item|plan|system)\b/) || [])[1] || 'item';
    const attr = (k) => (tags.match(new RegExp(`\\b${k}\\s*=\\s*"([^"]*)"`)) || [])[1] || '';
    // target= is written unquoted (target=api), unlike the quoted attrs. It names
    // the ONE target this check belongs to — the runner uses it to skip a check
    // whose target isn't loaded, even when the owning feature is otherwise
    // relevant (its impacts include some other loaded target). Empty ⇒ no
    // per-check target; the check runs whenever its feature is relevant (today's
    // behavior, unchanged).
    const target = (tags.match(/\btarget\s*=\s*([^\s"]+)/) || [])[1] || '';
    out.push({
      scope: tag, target, body: m[2],
      // Common report syntax: subject = what's counted ("API End-Points"); whenFailed =
      // the problem phrase ("are missing"); whenPassed = the clean phrase (optional).
      subject: attr('subject'),
      whenFailed: attr('whenFailed'),
      whenPassed: attr('whenPassed'),
    });
  }
  return out;
}
