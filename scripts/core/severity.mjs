// core/severity.mjs — PURE severity buckets + convergence arithmetic (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic.

export const NIELSEN_10 = [
  'visibility-of-system-status', 'match-system-real-world', 'user-control-freedom',
  'consistency-standards', 'error-prevention', 'recognition-rather-than-recall',
  'flexibility-efficiency-of-use', 'aesthetic-minimalist-design',
  'help-users-recognize-recover-errors', 'help-and-documentation',
];

export const DEFAULT_RUBRIC = {
  frequency_buckets: { '1': 0, '2-3': 1, '4-6': 2, '7-10': 3, '11-plus': 4 },
  impact_buckets: {
    'self-recovered-no-detour': 0,
    'recovered-with-minor-detour': 1,
    'recovered-with-major-detour': 2,
    'recovered-only-via-support-or-workaround': 3,
    'task-abandoned-or-never-resumed': 4,
  },
  persistence_buckets: { '0': 0, '1-2': 1, '3-5': 2, '6-9': 3, '10-plus': 4 },
};

export function bucketNumeric(n, buckets) {
  for (const [key, val] of Object.entries(buckets)) {
    if (/-plus$/.test(key) || /\+$/.test(key)) {
      const lo = parseInt(key, 10);
      if (n >= lo) return val;
    } else if (key.includes('-')) {
      const [a, b] = key.split('-').map((x) => parseInt(x, 10));
      if (n >= a && n <= b) return val;
    } else if (n === parseInt(key, 10)) {
      return val;
    }
  }
  return undefined;
}

export function numericFactors(sf) {
  return sf && ['frequency', 'impact', 'persistence'].every((k) => typeof sf[k] === 'number');
}

// F17/F120/F170 convergence arithmetic: only run_status-completed flaggers count toward
// convergence_tier; the rest count toward partial_tier. completedSet may be null (no persona list),
// in which case every flagger is treated as completed.
export function convergenceCounts(personasFlagging, completedSet) {
  const pf = Array.isArray(personasFlagging) ? personasFlagging : [];
  const completed = completedSet ? pf.filter((p) => completedSet.has(p)).length : pf.length;
  return { completed, partial: pf.length - completed };
}
