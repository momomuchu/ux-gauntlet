// core/claims.mjs — PURE forbidden-claim detection (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic.
// The validity envelope forbids WTP estimates (F21) and population-rate extrapolations (F22).
// A simulated persona cannot observe either; a finding narrative asserting them is a gate violation.
//
// m4 (quality-phase fix 2026-07-09): widened beyond the prior `$`-only / `users`-only shapes to
// cover non-$ currencies and customers|visitors|users|... nouns and the word "percent". The
// patterns stay SHAPE-anchored (a number adjacent to a currency/period, or "N% of <population>")
// so hyphenated persona names like "willing-to-pay-user" / "free-tier-user" never match.

// F21 — willingness-to-pay. Anchored on an explicit WTP phrase OR a price magnitude
// (number adjacent to a currency token or a billing period).
export const WTP_RE = new RegExp(
  [
    'willing(?:ness)?\\s+to\\s+pay',                 // "willing to pay" (space-separated, not hyphenated)
    'would\\s+pay',                                  // "would pay"
    'pay(?:s|ing)?\\s+(?:\\$|€|£)?\\d',              // "pay 29", "pays $29"
    '(?:\\$|€|£)\\s?\\d',                            // "$29", "€ 29"
    '\\d+\\s*(?:usd|dollars?|eur|euros?|gbp|pounds?)\\b', // "29 dollars", "20 euros"
    '\\bper\\s+(?:month|year|seat|user)\\b',         // "per month", "per seat"
    '\\/(?:mo|month|yr|year)\\b',                    // "/month", "/yr"
    '\\ba\\s+month\\b',                              // "a month"
  ].join('|'),
  'i',
);

// F22 — population-rate extrapolation. Anchored on "N% of <population noun>" or
// "N percent of <population noun>"; the population noun is required so a bare "23%" or a persona
// name is not falsely flagged.
export const POPULATION_RE = new RegExp(
  '\\b\\d+(?:\\.\\d+)?\\s*(?:%|percent(?:age)?)\\s+of\\s+' +
  '(?:all\\s+|the\\s+|our\\s+|their\\s+)?' +
  '(?:users?|customers?|visitors?|people|shoppers?|buyers?|accounts?|respondents?|sessions?|audience)\\b',
  'i',
);

// Returns an array of violation reason strings for a narrative (empty if clean).
export function forbiddenClaims(narrative) {
  const out = [];
  if (typeof narrative !== 'string') return out;
  if (WTP_RE.test(narrative)) out.push('willingness-to-pay claim (F21 forbidden claim)');
  if (POPULATION_RE.test(narrative)) out.push('population-rate/percentage claim (F22 forbidden claim)');
  return out;
}

// Residual (m4, noted): a WTP or population assertion phrased with NO number, currency, or period
// (e.g. "most users would happily pay", "a large share of visitors abandon") is not caught by a
// shape-anchored regex; catching it reliably needs semantics beyond a lexical pattern. Deferred as
// a v2 residual rather than risk false positives on ordinary narrative prose.
