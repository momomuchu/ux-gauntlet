// core/denylist.mjs — PURE destructive-action denylist validation (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic.
// The denylist safety guard (F37/F106) requires a NON-EMPTY JSON array of strings — a presence-only
// check is a bypassable guard (M3, quality-phase fix 2026-07-09). Both the run-gauntlet CLI (the
// --denylist file) and report-gate (a run bundle's run.denylist) validate against this one function.

// True only for a non-empty array whose every element is a non-empty string.
export function isValidDenylist(arr) {
  return Array.isArray(arr)
    && arr.length > 0
    && arr.every((x) => typeof x === 'string' && x.trim().length > 0);
}

// Explains why a parsed denylist value is invalid, or null if it is valid.
export function denylistViolation(arr) {
  if (!Array.isArray(arr)) return 'denylist must be a JSON array of strings';
  if (arr.length === 0) return 'denylist is empty — a non-empty JSON array of destructive-action labels is required (F106)';
  if (!arr.every((x) => typeof x === 'string' && x.trim().length > 0)) {
    return 'denylist must contain only non-empty strings (F106)';
  }
  return null;
}
