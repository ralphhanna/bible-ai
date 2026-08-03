// dsl-evaluator.mjs — parse a ```check block's WHEN/EVERY/THEN/ELSE/ASK lines into
// rules, resolve $-paths against the model, and evaluate a rule to emit fail/ask
// complaints. This is the check DSL's own interpreter — no target/feature-specific
// logic, just the language.

import { OPERATORS } from './operators.mjs';

// Parse a check block into rules. A rule = { when[], then, negate, else }.
// Lines: WHEN <expr> [AND <expr>] / THEN [NOT] <expr> / ELSE "<msg>".
// Comments (#) and blanks ignored.
export function parseBlock(block) {
  const rules = [];
  let cur = null;
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^EVERY\b/.test(line)) {
      // EVERY $x IN $set [WHERE <cond>] — scope=plan set iteration. The WHERE
      // becomes a `when` filter evaluated with the loop var bound.
      if (cur) rules.push(cur);
      const m = line.match(/^EVERY\s+(\$\w+)\s+IN\s+(\S+)(?:\s+WHERE\s+(.+))?$/);
      cur = { every: m ? { var: m[1], set: m[2] } : null,
        when: m && m[3] ? splitAnd(m[3]).map(parseExpr) : [], then: null, msg: '' };
    } else if (/^WHEN\b/.test(line)) {
      if (cur) rules.push(cur);
      // WHEN may carry multiple conditions joined by inline ` AND `.
      cur = { when: splitAnd(line.replace(/^WHEN\b/, '')).map(parseExpr), then: null, msg: '' };
    } else if (/^AND\b/.test(line) && cur && !cur.then) {
      cur.when.push(...splitAnd(line.replace(/^AND\b/, '')).map(parseExpr));
    } else if (/^THEN\b/.test(line) && cur) {
      // THEN may also carry inline AND-ed assertions; store as a list.
      cur.then = splitAnd(line.replace(/^THEN\b/, '')).map(parseExpr);
    } else if (/^ASK\b/.test(line)) {
      // ASK poses a question the AI must answer in the loop (script does the
      // mechanics — fills $-data into the prompt — the AI does the judgment). Usually
      // follows a WHEN/EVERY already open as `cur` (per-item/per-set judgment) — just
      // set .ask on it. A scope=system check with no set to iterate (a single
      // whole-app question) may open directly on ASK with no prior WHEN/EVERY — start
      // a bare rule with no `when`, so it always fires.
      if (!cur) cur = { when: [], then: null, msg: '' };
      const m = line.match(/"([\s\S]*)"/);
      cur.ask = m ? m[1] : '';
    } else if (/^ELSE\b/.test(line) && cur) {
      const m = line.match(/"([^"]*)"/);
      cur.msg = m ? m[1] : '';
    }
  }
  if (cur) rules.push(cur);
  return rules;
}

// Split a clause on inline ` AND ` (top-level only — not inside "quotes").
function splitAnd(s) {
  const parts = [];
  let buf = '', q = false;
  const toks = s.trim();
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === '"') q = !q;
    if (!q && toks.slice(i, i + 5) === ' AND ') { parts.push(buf); buf = ''; i += 4; continue; }
    buf += toks[i];
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// Parse "<lhs> [NOT] <OP> <rhs>" → {lhs, op, rhs, negate}. NOT sits with the
// operator (reads as English: "$x NOT MATCHES y"). rhs may be "quoted" or a $path.
function parseExpr(s) {
  const m = s.trim().match(/^(\S+)\s+(NOT\s+)?(IS|IN|CONTAINS-ANY|CONTAINS|MATCHES|EXISTS|INTERSECT)\s*(.*)$/);
  if (!m) return null;
  const [, lhs, notKw, op, rhsRaw] = m;
  let rhs = rhsRaw.trim();
  const q = rhs.match(/^"([\s\S]*)"$/);
  rhs = q ? q[1] : rhs;                       // string literal or a $path (resolved later)
  return { lhs, op, rhs, rhsIsPath: !q && rhs.startsWith('$'), negate: Boolean(notKw) };
}

// Resolve a $path against the model + current item. Supports dot access and
// bracket keys whose key may itself be a $ref or literal:
//   $item.content.scripts
//   $spec.entity[$item.entity].aspects
//   $spec.entity["employee"].hasAspect     (functions resolved; called by evalExpr)
export function resolve(pathExpr, model, item, self) {
  if (typeof pathExpr !== 'string' || pathExpr[0] !== '$') return pathExpr;   // literal
  const roots = { item, this: self, manifest: model.manifest, plan: model.plan, techStack: model.techStack, app: model.app, spec: model.spec };
  // EVERY loop vars are stashed on `self` under their $name (e.g. $e) — expose
  // them as roots so `$e` and `$spec.entity[$e]` resolve to the bound value.
  if (self) for (const k of Object.keys(self)) if (k.startsWith('$')) roots[k.slice(1)] = self[k];
  // Tokenize into segments: .name  or  [key]
  const tokens = [...pathExpr.slice(1).matchAll(/([A-Za-z0-9_]+)|\[([^\]]+)\]/g)];
  let base = roots[tokens[0][1]];
  for (let i = 1; i < tokens.length && base != null; i++) {
    const [, dotName, brKey] = tokens[i];
    let key = dotName;
    if (brKey !== undefined) {
      const k = brKey.trim();
      key = k.startsWith('$') ? resolve(k, model, item, self)
          : k.replace(/^"|"$/g, '');
    }
    base = base[key];
  }
  return base;
}

// Fill ${$path} placeholders in an ASK prompt with resolved model data, so the
// question hands the AI exactly what it needs to judge (the script does the
// legwork). e.g. "...design declares ${$item.dataFields}..."
export function interpolate(text, model, item, self) {
  return text.replace(/\$\{(\$[^}]+)\}/g, (_, pathExpr) => {
    const v = resolve(pathExpr.trim(), model, item, self);
    return Array.isArray(v) ? `[${v.join(', ')}]` : String(v ?? '');
  });
}

function label(v) { return typeof v === 'object' ? (v.name || JSON.stringify(v)) : String(v); }

export function evalExpr(expr, model, item, self) {
  if (!expr) return true;
  const l = resolve(expr.lhs, model, item, self);
  const r = expr.rhsIsPath ? resolve(expr.rhs, model, item, self) : expr.rhs;
  const result = expr.op === 'EXISTS' ? OPERATORS.EXISTS(l) : OPERATORS[expr.op](l, r);
  return expr.negate ? !result : result;
}

// Resolve an EVERY set expression to an array (a $path to a list, optionally with
// a trailing WHERE <cond> filter handled by the caller via rule.when).
export function resolveSet(setPath, model, item, self) {
  const v = resolve(setPath, model, item, self);
  return Array.isArray(v) ? v : (v == null ? [] : [v]);
}

// Evaluate one rule against a binding (item may be null for scope=plan; self may
// carry EVERY loop vars). Pushes a fail/ask complaint when it fires.
export function emit(rule, model, item, self, capability, complaints, ref) {
  const applies = (rule.when || []).every((w) => evalExpr(w, model, item, self));
  if (!applies) return;
  // A rule may carry a deterministic THEN/ELSE (a mechanical layer) AND an ASK (a
  // judgment layer). They are different layers of the same check, so emit BOTH: the
  // FAIL if the THEN fails, and the ASK for what a regex can't decide. (A rule with
  // only an ASK and no THEN emits just the ASK.)
  if (rule.then && rule.then.length) {
    const pass = rule.then.every((t) => evalExpr(t, model, item, self));
    if (!pass) complaints.push({ kind: 'fail', capability,
      message: rule.msg ? interpolate(rule.msg, model, item, self) : `check failed`, ref });
  }
  if (rule.ask) {
    complaints.push({ kind: 'ask', capability,
      message: interpolate(rule.ask, model, item, self), ref });
  }
}

export { label };
