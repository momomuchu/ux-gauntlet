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
//   * A persona bundle carries lane:"persona" (assemble-run.mjs emits it on every bundle). R4 ROOT 3:
//     the lane discriminator is now EXPLICIT AND REQUIRED on the persona side too — an OMITTED lane is
//     REJECTED, not silently defaulted to persona. The prior "omitted == persona safe default" is exactly
//     the R4 BLOCKER: a real structural bundle with its `lane` field dropped sailed through the persona
//     gate as a coincidental default and had its WCAG-critical findings mis-processed. Both lanes now
//     fail-closed on an absent discriminator; every persona emitter writes lane:"persona" (assemble-run)
//     and the frozen 0001 fixtures carry it explicitly.
// Net: no field-presence heuristic, no false-positive on a persona `impact` field, no de-labelled
// structural bundle slipping through as a default. Exact match on an explicit, required discriminator.

// Returns a violation string if `bundle` does not belong to `expected` lane, else null. Fail-closed on
// BOTH sides: the structural side requires the discriminator to be exactly "structural"; the persona side
// requires it to be exactly "persona" and REJECTS an absent/unknown discriminator (R4 ROOT 3). NO
// shape/field sniffing on either side.
export function assertLane(bundle, expected) {
  const lane = bundle && bundle.lane;
  if (expected === 'structural') {
    if (lane !== 'structural') {
      return `top-level lane is ${lane === undefined ? '(absent)' : `"${lane}"`}, not the required "structural" discriminator — a non-structural/misrouted bundle is not evaluable by the structural lane (S22, fail-closed)`;
    }
    return null;
  }
  // expected === 'persona' — exact-match on the explicit, REQUIRED discriminator (R4 ROOT 3).
  if (lane === 'structural') {
    return 'bundle top-level lane is "structural" — the persona-lane gate refuses to evaluate a structural-lane bundle; route it to scripts/structural-report-gate.mjs (S22 lane trust boundary, B9)';
  }
  if (lane !== 'persona') {
    return `bundle top-level lane is ${lane === undefined || lane === null ? '(absent)' : `"${lane}"`}, not the required "persona" discriminator — the persona-lane gate refuses an absent/unrecognized lane so a de-labelled structural bundle can never default through (S22 lane trust boundary, R4 ROOT 3, fail-closed)`;
  }
  // lane === "persona" — accepted.
  return null;
}
