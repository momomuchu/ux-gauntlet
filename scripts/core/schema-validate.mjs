// core/schema-validate.mjs — PURE minimal persona-bundle shape validator (ADR-0002, R3 M11).
// Pure module: no file/network/browser access, no process.exit, deterministic. A dependency-free,
// schema-derived structural check mirroring schemas/findings.schema.json's REQUIRED sets so a
// hand-typed/garbage bundle cannot be formatted into an official-looking report without meeting the
// contract. This is NOT the full report-gate (which enforces the run-level semantic invariants) — it is
// the ingestion shape gate the founder-facing renderer applies before rendering (render-report.mjs).

// The findings.schema.json top-level + per-finding REQUIRED sets (kept in sync with the JSON schema).
// NOTE the finding IDENTIFIER is `finding_id` OR `id` — report-gate.mjs reads `f.id || f.finding_id`
// throughout and frozen 0001 persona fixtures use `id`; the identifier presence is checked separately
// (a finding must carry at least one) rather than requiring the `finding_id` spelling specifically.
const TOP_REQUIRED = ['run', 'findings'];
const FINDING_REQUIRED = [
  'friction_name', 'friction_type', 'step', 'heuristic_tag',
  'personas_flagging', 'convergence_tier', 'severity', 'severity_factors',
];
const FRICTION_TYPES = new Set(['walkthrough_failure', 'ambiguity_resolution', 'extra_action', 'terminal_friction']);

// Returns an array of human-readable error strings (empty === shape-valid).
export function validatePersonaBundle(bundle) {
  const errors = [];
  if (bundle == null || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return ['bundle is not a JSON object'];
  }
  for (const k of TOP_REQUIRED) {
    if (!(k in bundle)) errors.push(`missing required top-level field "${k}"`);
  }
  if ('run' in bundle && (bundle.run == null || typeof bundle.run !== 'object')) {
    errors.push('top-level "run" must be an object');
  }
  if ('findings' in bundle && !Array.isArray(bundle.findings)) {
    errors.push('top-level "findings" must be an array');
  }
  const findings = Array.isArray(bundle.findings) ? bundle.findings : [];
  findings.forEach((f, i) => {
    if (f == null || typeof f !== 'object' || Array.isArray(f)) {
      errors.push(`findings[${i}] is not an object`);
      return;
    }
    for (const k of FINDING_REQUIRED) {
      if (!(k in f)) errors.push(`findings[${i}] ("${f.friction_name ?? f.finding_id ?? f.id ?? 'unnamed'}") missing required field "${k}"`);
    }
    if (!('finding_id' in f) && !('id' in f)) {
      errors.push(`findings[${i}] ("${f.friction_name ?? 'unnamed'}") carries no finding identifier (needs finding_id or id)`);
    }
    if ('friction_type' in f && !FRICTION_TYPES.has(f.friction_type)) {
      errors.push(`findings[${i}] friction_type "${f.friction_type}" is outside {${[...FRICTION_TYPES].join(', ')}}`);
    }
    if ('severity' in f && (typeof f.severity !== 'number' || f.severity < 0 || f.severity > 4)) {
      errors.push(`findings[${i}] severity ${JSON.stringify(f.severity)} is not an integer in 0..4`);
    }
    if ('personas_flagging' in f && !Array.isArray(f.personas_flagging)) {
      errors.push(`findings[${i}] personas_flagging must be an array`);
    }
  });
  return errors;
}
