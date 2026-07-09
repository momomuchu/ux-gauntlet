// core/structural-severity.mjs — PURE structural severity maps + CI-block classification (ADR-0002).
// Pure module: no file/network/browser access, deterministic. Encodes the frozen SPEC 0002 tables so
// gate, ci-diff and scan share one source of truth (no LLM judgment — S19).

// S17: axe VIOLATION severity is a pure function of axe impact.
export const AXE_IMPACT_SEVERITY = { critical: 4, serious: 3, moderate: 2, minor: 1 };

// S35: the 9 non-axe DOM-check finding codes, each pinned to a fixed severity.
export const NONAXE_SEVERITY = {
  'main-content-missing': 4,
  'continue-control-missing': 4,
  'main-content-not-in-main': 3,
  'cannot-evaluate-ambiguous-main': 3,
  'continue-not-semantic': 3,
  'continue-not-focusable': 3,
  'main-content-not-prominent': 2,
  'unlabeled-landmark-section': 2,
  'positive-tabindex': 1,
};

// run_status values that are fail-closed: the lane could not produce a trustworthy verdict (BLOCK).
export const FAIL_CLOSED_STATUS = new Set([
  'refused', 'axe-execution-failed', 'axe-execution-degraded', 'settle-timeout',
]);

// Non-axe finding codes that BLOCK CI (read by CODE, never derived severity — S38/S56/CR5-B6).
export const NONAXE_BLOCK_CODES = new Set([
  'main-content-missing', 'continue-control-missing', 'cannot-evaluate-ambiguous-main',
]);

// S36: an axe incomplete-derived finding is ALWAYS severity 0 regardless of its impact.
export function isIncomplete(f) {
  return f.result_type === 'incomplete' || f.source === 'axe-incomplete' ||
    (typeof f.code === 'string' && f.code.startsWith('axe-incomplete:'));
}

// The correct display severity for a finding under the frozen tables (0 for incomplete via S36).
export function expectedSeverity(f) {
  if (isIncomplete(f)) return 0;
  if (f.source === 'axe' || (typeof f.code === 'string' && f.code.startsWith('axe:'))) {
    return AXE_IMPACT_SEVERITY[f.impact];
  }
  return NONAXE_SEVERITY[f.code];
}

// S30/S52/S53/S38/S56: does this finding BLOCK a CI merge? Reads raw impact / code, never severity.
export function findingBlocksCi(f) {
  if (f.source === 'axe' || (typeof f.code === 'string' && f.code.startsWith('axe:'))) {
    return f.impact === 'critical'; // S30 via raw impact (S52)
  }
  if (isIncomplete(f)) {
    return f.impact === 'critical'; // S53/D7: incomplete whose underlying impact is critical
  }
  return NONAXE_BLOCK_CODES.has(f.code); // S38/S56 by code
}
