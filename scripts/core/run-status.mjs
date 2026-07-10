// core/run-status.mjs — PURE run-status / BLOCKED derivation (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic.
//
// F49 (inverted counted set, CR6-B1): the NOT-BLOCKED floor set is the designed/successful
// terminal outcomes {completed, patience-exhausted, runner-capped}. `crashed` and `timed-out`
// are infrastructure-failure signals that push a run toward BLOCKED; they are NOT floor states.
// (B1, quality-phase fix 2026-07-09: `timed-out` removed from the floor — a wallclock-terminated
// subagent is an execution failure, not a designed abandonment.)
export const FLOOR_STATES = new Set(['completed', 'patience-exhausted', 'runner-capped']);

// F49 convergence floor: a run needs at least this many personas in a designed/floor terminal
// state, else it is BLOCKED ("fewer than 3"). This is a fixed constant, NOT the persona count
// (M2, quality-phase fix): an N=5 run with 3 floor-state personas is NOT blocked.
export const CONVERGENCE_FLOOR = 3;

// R3 M3: match run_status against FLOOR_STATES case-insensitively + trimmed, the SAME canonicalization
// class canonicalImpact()/isValidImpact() already apply to axe impact strings. axe/persona emitters emit
// the bare lowercase token, but a bundle can carry a padded/case variant ("Completed", " completed ",
// "COMPLETED") that a raw FLOOR_STATES.has() silently treats as a NON-floor state — tripping a false
// F191 derivation-mismatch (a healthy run derives BLOCKED). Normalize before membership so a case/space
// variant folds to its canonical floor token; a genuinely-different status is unchanged and still counts
// as non-floor.
function canonicalStatus(s) {
  return typeof s === 'string' ? s.trim().toLowerCase() : s;
}

export function floorCount(personaEntries) {
  if (!Array.isArray(personaEntries)) return 0;
  return personaEntries.filter((p) => p && FLOOR_STATES.has(canonicalStatus(p.run_status))).length;
}

// Derives whether a run is BLOCKED from its per-persona terminal states alone.
// Returns false for an empty/absent persona list (no run to judge).
export function deriveBlocked(personaEntries) {
  if (!Array.isArray(personaEntries) || personaEntries.length === 0) return false;
  return floorCount(personaEntries) < CONVERGENCE_FLOOR;
}
