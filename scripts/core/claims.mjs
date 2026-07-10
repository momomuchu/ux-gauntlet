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
// m5 (quality-phase fix 2026-07-10, M1/M3): widened to WORD-FORM currency the symbol-only shape missed
// — "twenty dollars", "20 bucks", "USD 20"/"EUR 20" (currency-PREFIX order), and multiplier phrasing
// "2x the price". Still SHAPE-anchored (a magnitude adjacent to a currency token / period, or a
// spelled number immediately before a currency noun) so hyphenated persona names like
// "willing-to-pay-user" / "free-tier-user" and ordinary prose never match.
const SPELLED_NUM = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|' +
  'thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|' +
  'sixty|seventy|eighty|ninety|hundred|thousand)';
// R2 item 10 (2026-07-10): add a CLOSED set of non-numeric WTP IDIOMS the shape-anchored patterns
// missed — a persona can assert willingness-to-pay with zero number/currency ("worth every penny",
// "take my money"). These are exact idioms, not a general semantic model, so ordinary prose and
// hyphenated persona names still never match. This is a HEURISTIC widening, NOT exhaustive coverage
// (see the residual note at the foot of this file + SKILL.md) — a paraphrase outside this idiom list
// is still uncaught by a lexical regex.
export const WTP_RE = new RegExp(
  [
    'willing(?:ness)?\\s+to\\s+pay',                 // "willing to pay" (space-separated, not hyphenated)
    'happy\\s+to\\s+pay',                            // "happy to pay"
    'glad(?:ly)?\\s+to?\\s*pay',                     // "gladly pay", "glad to pay"
    'would\\s+(?:gladly\\s+|happily\\s+)?pay',       // "would pay", "would gladly pay", "would happily pay"
    "\\w+['\\u2019]d\\s+(?:gladly\\s+|happily\\s+)?pay", // R4 MAJOR #7: "I'd pay", "they'd happily pay", "we'd gladly pay" (the contraction of "would" the literal-"would" pattern missed)
    'worth\\s+(?:every\\s+penny|paying\\s+for|the\\s+(?:money|price|cost))', // "worth every penny", "worth paying for"
    '(?:shut\\s+up\\s+and\\s+)?take\\s+my\\s+money', // "take my money", "shut up and take my money"
    'pay(?:s|ing)?\\s+(?:\\$|€|£)?\\d',              // "pay 29", "pays $29"
    '(?:\\$|€|£)\\s?\\d',                            // "$29", "€ 29"
    '\\d+\\s*(?:usd|dollars?|bucks?|eur|euros?|gbp|pounds?|quid)\\b', // "29 dollars", "20 bucks"
    '\\b(?:usd|eur|gbp)\\s?\\d',                     // "USD 20", "EUR 20" (currency-prefix order)
    SPELLED_NUM + '\\s+(?:dollars?|bucks?|euros?|pounds?|quid)\\b', // "twenty dollars", "fifty bucks"
    '\\d+\\s*x\\s+(?:the\\s+)?(?:price|cost|pricing)\\b', // "2x the price", "3x the cost"
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

// Residual (HONEST, do not over-claim — R2 item 10): the WTP detector now catches a CLOSED set of
// common non-numeric idioms ("worth every penny", "take my money", "happy/gladly/would pay") IN
// ADDITION to the shape-anchored numeric/currency patterns. It remains a lexical HEURISTIC, not a
// semantic classifier: a WTP or population assertion phrased outside both the numeric shapes AND this
// idiom list (e.g. "customers would not hesitate to open their wallets", "a large share of visitors
// abandon") is still NOT caught — reliable coverage needs semantics beyond a regex. This is a
// deliberately incomplete v2 residual, disclosed here and in SKILL.md, kept lexical to avoid false
// positives on ordinary narrative prose.
