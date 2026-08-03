// operators.mjs — the fixed operator vocabulary for the $-model check language.
// This is the entire "step library": a small, closed set of operators. Checks
// compose these; capabilities never write JS. Each operator is (left, right) -> bool.

export const OPERATORS = {
  // scalar equality (string/number). $x IS "test"
  IS: (l, r) => String(l) === String(r),

  // membership: scalar in a list. $item.capability IN $techStack.targets
  IN: (l, r) => asArray(r).map(String).includes(String(l)),

  // containment. For a list: does any element contain r (substring, case-insens)
  // — so `aspects CONTAINS "Audit"` matches "Audit Trail". For a string: substring.
  CONTAINS: (l, r) =>
    Array.isArray(l)
      ? l.some((x) => String(x).toLowerCase().includes(String(r).toLowerCase()))
      : String(l ?? '').includes(String(r)),

  // $string CONTAINS-ANY $list → true if the string contains ANY list element.
  // For matching a value against several accepted forms (e.g. display-label as
  // preferredName / preferred_name).
  'CONTAINS-ANY': (l, r) => {
    const hay = String(l ?? '');
    return (Array.isArray(r) ? r : [r]).some((x) => hay.includes(String(x)));
  },

  // regex test. $content MATCHES "(mock|fake).*db"
  MATCHES: (l, r) => new RegExp(r, 'i').test(String(l ?? '')),

  // existence: value present / file exists (the model resolves EXISTS specially,
  // but as a value test: non-null, non-empty).
  EXISTS: (l) => l != null && l !== '' && !(Array.isArray(l) && l.length === 0),

  // set intersection (returns the array). used in EVERY … IN (A INTERSECT B)
  INTERSECT: (l, r) => {
    const set = new Set(asArray(r).map(String));
    return asArray(l).filter((x) => set.has(String(x)));
  },
};

// NOT / AND / OR are combinators handled by the evaluator, not binary operators.

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}
