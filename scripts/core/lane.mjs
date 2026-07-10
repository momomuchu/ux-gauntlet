// core/lane.mjs — PURE lane trust-boundary helper (ADR-0002, R2 items 6/18, R3 M15/MI3).
// Pure module: no file/network/browser access, deterministic. ONE definition of "which lane owns this
// bundle" so all four gates (report-gate, ci-diff, structural-report-gate, structural-ci-diff) enforce
// the S22 lane trust boundary identically instead of drifting apart.
//
// R3 M15/MI3 — the lane check is now an EXPLICIT discriminator, NOT a shape heuristic. The prior build
// SNIFFED the bundle for "structural shape" (an `impact` string, axe metadata, violation_ids, axe: codes)
// to decide whether a lane-omitted bundle was really structural. That heuristic false-positived BOTH
// ways: it REJECTED a legitimate persona finding that merely carried a top-level field named `impact`
// (M15), while a hand-shaped structural bundle stripped of its markers could still DODGE it (MI3). It is
// replaced with a pure discriminator read:
//   * A REAL structural bundle ALWAYS carries lane:"structural" — structural-scan.mjs emits it, the
//     structural schema makes `lane` a REQUIRED const "structural" (S22), and both structural gates
//     REQUIRE it exactly. So every real structural bundle is caught by the persona gate's exact
//     lane==="structural" rejection below, with no shape inference needed.
//   * A persona bundle carries lane:"persona" (assemble-run.mjs emits it; schemas/findings.schema.json
//     documents "persona" as the default) OR omits `lane` entirely — the frozen 0001-safe default. An
//     omitted lane is treated as persona; the true enforcement of "this is really a structural payload"
//     is schema validation at ingestion (the structural schema requires lane:"structural"), not a
//     fragile content sniff in this helper.
// Net: no field-presence heuristic, no false-positive on a persona `impact` field, no pretense of
// catching a de-labelled structural bundle by shape. Exact match on the discriminator, documented default.

// Returns a violation string if `bundle` does not belong to `expected` lane, else null. Fail-closed on
// the structural side (the discriminator MUST be exactly "structural"); the persona side accepts the
// explicit "persona" discriminator or an omitted lane (0001-safe default) and rejects any other explicit
// discriminator. NO shape/field sniffing on either side.
export function assertLane(bundle, expected) {
  const lane = bundle && bundle.lane;
  if (expected === 'structural') {
    if (lane !== 'structural') {
      return `top-level lane is ${lane === undefined ? '(absent)' : `"${lane}"`}, not the required "structural" discriminator — a non-structural/misrouted bundle is not evaluable by the structural lane (S22, fail-closed)`;
    }
    return null;
  }
  // expected === 'persona' — exact-match discriminator, no shape heuristic (R3 M15/MI3).
  if (lane === 'structural') {
    return 'bundle top-level lane is "structural" — the persona-lane gate refuses to evaluate a structural-lane bundle; route it to scripts/structural-report-gate.mjs (S22 lane trust boundary, B9)';
  }
  if (lane !== undefined && lane !== null && lane !== 'persona') {
    return `bundle top-level lane is "${lane}", which is neither "persona" nor absent — the persona-lane gate refuses an unrecognized lane discriminator (S22, fail-closed)`;
  }
  // lane === "persona" or absent (0001-safe default) — accepted.
  return null;
}
