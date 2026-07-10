// core/lane.mjs — PURE lane trust-boundary helper (ADR-0002, R2 items 6/18).
// Pure module: no file/network/browser access, deterministic. ONE definition of "which lane owns this
// bundle" so all four gates (report-gate, ci-diff, structural-report-gate, structural-ci-diff) enforce
// the S22 lane trust boundary identically instead of drifting apart (the R2 defect: the persona-side
// gates failed OPEN on an absent/omitted lane while the structural-side gates failed CLOSED).
//
// The core insight (R2 item 6): a lane discriminator that is merely OMITTED is NOT a safe default for a
// STRUCTURAL bundle — a real WCAG/axe bundle with `lane` deleted would otherwise be silently accepted by
// the persona gate and have its critical a11y findings dropped as coincidental "zero evidence". So the
// persona gate rejects on structural SHAPE (axe/DOM markers) independent of the literal lane string,
// while still honoring the frozen "0001-safe" contract that a genuine persona bundle MAY omit `lane`.

// Structural-SHAPE markers only a structural-lane bundle carries. A persona findings bundle never has
// axe metadata, top-level violation/incomplete id sets, a structural schema_version, or findings that
// carry a raw axe impact / axe: code / dom-check source / lane:"structural".
export function isStructuralShaped(bundle) {
  if (!bundle || typeof bundle !== 'object') return false;
  if (bundle.lane === 'structural') return true;
  if (Array.isArray(bundle.violation_ids) || Array.isArray(bundle.incomplete_ids)) return true;
  const meta = bundle.metadata;
  if (meta && typeof meta === 'object' &&
      (meta.axe_version != null || meta.ruleset_tags != null || meta.render_environment_id != null ||
       meta.wcag_target != null || meta.expected_main_content != null)) return true;
  const findings = Array.isArray(bundle.findings) ? bundle.findings : [];
  return findings.some((f) => f && typeof f === 'object' && (
    f.lane === 'structural' ||
    f.source === 'axe' || f.source === 'axe-incomplete' || f.source === 'dom-check' ||
    typeof f.impact === 'string' ||
    (typeof f.code === 'string' && (f.code.startsWith('axe:') || f.code.startsWith('axe-incomplete:')))
  ));
}

// Returns a violation string if `bundle` does not belong to `expected` lane, else null. Fail-closed on
// both sides:
//   expected === 'structural': the discriminator MUST be exactly "structural" (absent/other = reject).
//   expected === 'persona':    reject an explicit non-persona discriminator AND reject any bundle whose
//                              SHAPE is structural even when `lane` is absent (the R2 item-6 bypass).
//                              A genuine persona bundle that omits `lane` and has no structural markers
//                              is accepted (frozen 0001-safe default preserved).
export function assertLane(bundle, expected) {
  const lane = bundle && bundle.lane;
  if (expected === 'structural') {
    if (lane !== 'structural') {
      return `top-level lane is ${lane === undefined ? '(absent)' : `"${lane}"`}, not the required "structural" discriminator — a non-structural/misrouted bundle is not evaluable by the structural lane (S22, fail-closed)`;
    }
    return null;
  }
  // expected === 'persona'
  if (lane === 'structural') {
    return 'bundle top-level lane is "structural" — the persona-lane gate refuses to evaluate a structural-lane bundle; route it to scripts/structural-report-gate.mjs (S22 lane trust boundary, B9)';
  }
  if (lane !== undefined && lane !== null && lane !== 'persona') {
    return `bundle top-level lane is "${lane}", which is neither "persona" nor absent — the persona-lane gate refuses an unrecognized lane discriminator (S22, fail-closed)`;
  }
  if (isStructuralShaped(bundle)) {
    return 'bundle has a STRUCTURAL shape (axe metadata / violation_ids / axe: finding codes / structural findings) but its lane does not confirm the persona lane — omission is not a safe default for a structural-shaped bundle; route it to scripts/structural-report-gate.mjs (S22 lane trust boundary, R2 item 6)';
  }
  return null;
}
