#!/usr/bin/env node
// report-gate.mjs [--check-fixture <file> | <findings.json>]
// Validates a UX Gauntlet run bundle and exits nonzero on ANY violation.
// The two documented invocation forms (--check-fixture and a bare positional) are one code path.
// ALL judgment logic lives in scripts/core/* pure modules (ADR-0002): this shell only reads the
// file, feeds plain data to the core, and translates verdicts into exit codes / stdout / stderr.
import { readFileSync, existsSync } from 'node:fs';
import { FLOOR_STATES, deriveBlocked } from './core/run-status.mjs';
import { findingId, tupleKey, teiOf, HEX_FINDING_ID } from './core/identity.mjs';
import { hasCredentialLeak } from './core/redaction.mjs';
import { NIELSEN_10, DEFAULT_RUBRIC, bucketNumeric, numericFactors, convergenceCounts } from './core/severity.mjs';
import { forbiddenClaims } from './core/claims.mjs';
import { isValidDenylist } from './core/denylist.mjs';
import { assertLane } from './core/lane.mjs';

const LEDGER_REASON_CODES = new Set([
  'task-completed', 'denylist-abort', 'patience-exhausted', 'runner-capped',
  'robots-disallowed', 'timed-out', 'crashed', 'external-side-effect',
  'payment-refused', 'third-party-data-refused', 'max-tool-calls', 'max-actions',
]);

const D15_FLAGS = ['audited_terminal_step', 'external_side_effect', 'precondition_step', 'payment_step', 'denylist_override'];

const ACTION_CAP = 50;   // F57: "once it has executed 50" — the cap is reached AT 50 (m2, >=).
const TOOL_CALL_CAP = 250; // F154 default per-run LLM tool-call maximum (m2, >=).

function loadHeuristicSet(bundle) {
  const file = bundle.run && bundle.run.heuristic_set_file;
  if (file && existsSync(file)) {
    try {
      const cfg = JSON.parse(readFileSync(file, 'utf8'));
      const ids = (cfg.criteria || []).map((c) => (typeof c === 'string' ? c : c.id));
      const rubric = cfg.severity_rubric
        ? {
            frequency_buckets: cfg.severity_rubric.frequency_buckets || DEFAULT_RUBRIC.frequency_buckets,
            impact_buckets: cfg.severity_rubric.impact_buckets || DEFAULT_RUBRIC.impact_buckets,
            persistence_buckets: cfg.severity_rubric.persistence_buckets || DEFAULT_RUBRIC.persistence_buckets,
          }
        : DEFAULT_RUBRIC;
      return { ids, rubric };
    } catch { /* fall through to default */ }
  }
  return { ids: NIELSEN_10, rubric: DEFAULT_RUBRIC };
}

function main() {
  const argv = process.argv.slice(2);
  let file = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check-fixture') { file = argv[++i]; } else if (!file && !argv[i].startsWith('--')) { file = argv[i]; }
  }
  if (!file) { process.stderr.write('usage: report-gate.mjs [--check-fixture <file>|<findings.json>]\n'); process.exit(2); }
  if (!existsSync(file)) { process.stderr.write(`file not found: ${file}\n`); process.exit(2); }

  let bundle;
  try { bundle = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { process.stderr.write(`schema-invalid: not parseable JSON: ${e.message}\n`); process.exit(1); }

  const violations = [];
  const dropLog = [];
  const add = (m) => violations.push(m);

  // Lane discriminator trust boundary (B9 + R2 item 6): this is the PERSONA-lane gate. A structural
  // bundle must never be silently processed here — its critical a11y findings would otherwise be
  // dropped as a coincidental "zero evidence" (F14/F15) side effect rather than caught. The shared
  // core/lane.mjs assertLane rejects an explicit lane:"structural" AND a bundle whose SHAPE is
  // structural even when `lane` is omitted (omission is not a safe default for a structural-shaped
  // bundle). A genuine persona bundle that omits `lane` and has no structural markers still passes
  // (frozen 0001-safe default). One helper, all four gates fail-closed identically.
  {
    const laneErr = assertLane(bundle, 'persona');
    if (laneErr) add(laneErr);
  }

  const run = bundle.run || {};
  const allFindings = Array.isArray(bundle.findings) ? bundle.findings : [];
  const walkthrough = Array.isArray(bundle.walkthrough) ? bundle.walkthrough : null;
  const actions = Array.isArray(bundle.actions) ? bundle.actions : [];
  const taskSteps = Array.isArray(bundle.task_list_steps) ? bundle.task_list_steps : [];
  const ledger = Array.isArray(bundle.tasks_ledger) ? bundle.tasks_ledger : [];
  const appErrors = Array.isArray(bundle.app_errors) ? bundle.app_errors : [];
  const personaEntries = Array.isArray(bundle.personas) ? bundle.personas : null;
  const { ids: heuristicIds, rubric } = loadHeuristicSet(bundle);
  const rawDenylist = run.denylist;
  const denylist = Array.isArray(rawDenylist) ? rawDenylist.map((d) => String(d).toLowerCase()) : null;
  const storedRunStatus = bundle.run_status;

  // --- Zero-evidence drop (F14/F15) ---
  const kept = [];
  for (const f of allFindings) {
    const hasEvidence = Array.isArray(f.evidence) && f.evidence.length > 0;
    if (!hasEvidence) { dropLog.push(`DROPPED ${f.id || f.finding_id || '(unnamed)'} — zero evidence artifacts (F14/F15)`); }
    else kept.push(f);
  }

  // --- D15 mutual exclusivity (F164) ---
  for (const s of taskSteps) {
    const active = D15_FLAGS.filter((flag) => s[flag] === true);
    if (active.length > 1) add(`schema-invalid: task step ${s.step} carries more than one D15 per-step flag (${active.join(', ')}) — mutually exclusive (F164)`);
  }

  // --- Walkthrough completeness (F9) + skipped-step (F163) + No-matching (F33) ---
  if (walkthrough) {
    const externalSteps = new Set(taskSteps.filter((s) => s.external_side_effect === true).map((s) => s.step));
    for (const w of walkthrough) {
      const ans = w.answers || {};
      if (externalSteps.has(w.step)) {
        add(`walkthrough answers recorded for step ${w.step} which was skipped as external_side_effect (F163)`);
        continue;
      }
      for (const key of ['right_result', 'notice', 'associate', 'progress']) {
        if (!(key in ans)) add(`walkthrough answer set for persona ${w.persona} step ${w.step} is missing required key "${key}" (F9)`);
      }
      const hasNo = Object.values(ans).some((v) => v === 'no');
      if (hasNo) {
        const matched = allFindings.some((f) => f.step === w.step && Array.isArray(f.personas_flagging) && f.personas_flagging.includes(w.persona))
          || appErrors.some((e) => e.step === w.step && e.persona === w.persona);
        if (!matched) add(`walkthrough "No" answer by ${w.persona} at step ${w.step} has no matching friction instance (F33)`);
      }
    }
  }

  // --- Denylist config validity (F37/F106) — one core validator, no presence-only bypass (M3/M4) ---
  if (rawDenylist !== undefined) {
    // Present but not a non-empty array of strings is an F106 violation.
    if (!isValidDenylist(rawDenylist)) add('denylist is present but is not a non-empty JSON array of strings (F106)');
  } else {
    // Absent denylist: F37 fires whenever the bundle is a bare run config OR carries any click action
    // (a click cannot be safety-checked against a denylist that was never supplied) — not only when the
    // whole bundle is empty (M4). Non-click execution surfaces (navigate/submit/background) don't require it.
    const bareEmpty = allFindings.length === 0 && !walkthrough && actions.length === 0 && ledger.length === 0
      && appErrors.length === 0 && !personaEntries && !bundle.summary && !bundle.walkthrough_progress
      && !bundle.denylist_override_events && taskSteps.length === 0;
    const hasClickAction = actions.some((a) => a && a.type === 'click');
    if (bareEmpty || hasClickAction) add('run configuration supplies no operator denylist (F37)');
  }

  // --- Denylist click enforcement (F38/F128/F130) ---
  for (const a of actions) {
    if (a.type === 'click' && denylist && a.element_label && denylist.includes(String(a.element_label).toLowerCase()) && a.outcome === 'executed') {
      if (a.denylist_override !== true) add(`denylisted element "${a.element_label}" was clicked (executed) at step ${a.step} without a per-step denylist_override (F38)`);
    }
  }

  // --- Payment mode (F39/F115/F196) ---
  for (const a of actions) {
    if (a.payment_step === true && a.outcome === 'executed' && run.test_mode !== true) {
      add(`payment_step submitted at step ${a.step} without run.test_mode=true (F39, payment/test-mode rule)`);
    }
  }

  // --- Non-idempotent dry-run boundary (F40/F117/F127/F146/F179/F180) ---
  const fullSubmission = run.full_submission_mode === true || run.full_submission === true;
  for (const a of actions) {
    if (a.type === 'submit') {
      if (a.detected_via === 'static-dom-form-attribute-sniffing') {
        add(`non-idempotent submit at step ${a.step} was detected via static DOM form-attribute sniffing instead of network-request interception (F117)`);
        continue;
      }
      const isNonIdem = a.http_method && /^(POST|PUT|PATCH|DELETE)$/i.test(a.http_method);
      if (isNonIdem && a.outcome === 'executed') {
        const exempt = fullSubmission || a.precondition_step === true || a.audited_terminal_step === true
          || (a.payment_step === true && run.test_mode === true);
        if (!exempt) add(`non-idempotent submit at step ${a.step} executed outside its dry-run exemption (no full_submission_mode / precondition_step / audited_terminal_step) (F40)`);
      }
    } else if (a.type === 'background-request') {
      if (a.outcome === 'executed' && a.correlated_to_step_interaction === false) {
        add(`uncorrelated background non-idempotent request at step ${a.step} executed instead of being dry-run-blocked (F179/F180)`);
      }
    }
  }

  // --- Robots (F41/F42/F197/F198) ---
  const navs = actions.filter((a) => a.type === 'navigate');
  for (const a of navs) {
    if (a.robots_disallowed === true && a.outcome === 'executed' && run.robots_override !== true) {
      add(`navigation to a robots.txt-disallowed path at step ${a.step} executed without --override-robots (F41/F42)`);
    }
  }
  if (navs.length > 0 && navs.every((a) => a.robots_disallowed === true)) {
    const flag = bundle.summary && bundle.summary.robots_blocked_all_navigation;
    if (flag !== true) add('every persona-task navigation was robots-disallowed but summary.robots_blocked_all_navigation is not set to true (F197/F198)');
  }

  // --- BLOCKED derivation (F49/F191) + disclosure (F54) + degraded confidence (F124) ---
  // Derived by the pure core (D-DET): the same input yields the same verdict in gate and ci-diff.
  // B8 (quality-phase fix 2026-07-10): compute derivedBlocked whenever run_status is present OR the
  // bundle carries a real (>=3) persona set. Previously the derivation only ran when run_status was
  // present, so OMITTING the field entirely bypassed F191/F49 — a [completed,crashed,crashed] run
  // (floorCount=1<3 => BLOCKED) shipped a clean PASS just by dropping run_status. A missing run_status
  // is treated as NOT-BLOCKED (storedBlocked=false), so a real run that derives BLOCKED now mismatches
  // and fails. The >=3-persona guard keeps isolated 1-2 persona single-check fixtures (which are not
  // full runs and would false-derive BLOCKED under the fixed CONVERGENCE_FLOOR=3) from being flagged.
  let derivedBlocked = false;
  if (personaEntries && (storedRunStatus !== undefined || personaEntries.length >= 3)) {
    derivedBlocked = deriveBlocked(personaEntries);
    const storedBlocked = storedRunStatus === 'BLOCKED';
    if (derivedBlocked !== storedBlocked) {
      add(`run_status derivation mismatch: per-persona terminal states derive ${derivedBlocked ? 'BLOCKED' : 'NOT-BLOCKED'} but stored run_status is "${storedRunStatus === undefined ? '(absent)' : storedRunStatus}" (F191)`);
    }
  }
  // F54/F124 disclosure gates fire on the DERIVED blocked value, not solely the stored field (B8).
  if (storedRunStatus === 'BLOCKED' || derivedBlocked) {
    if (typeof bundle.validity_envelope_text === 'string' && !/did not complete/i.test(bundle.validity_envelope_text)) {
      add('BLOCKED run validity envelope omits the non-completed-persona count/disclosure (F54)');
    }
    for (const f of kept) {
      if ((f.convergence_tier || 0) < 2 && f.confidence !== 'degraded-below-persona-floor') {
        add(`finding ${f.id || f.finding_id} from a BLOCKED run lacks confidence "degraded-below-persona-floor" (F124)`);
      }
    }
  }

  // --- Persona caps (F57/F58/F154) + concurrency (F132-134) + timeout partial ledger (F75/F76) ---
  if (personaEntries) {
    for (const p of personaEntries) {
      if (typeof p.action_count === 'number' && p.action_count >= ACTION_CAP && p.run_status !== 'runner-capped') {
        add(`persona ${p.name} reached the ${ACTION_CAP}-action cap (action_count=${p.action_count}) but is not run_status runner-capped (F57/F58)`);
      }
      if (typeof p.tool_call_count === 'number' && p.tool_call_count >= TOOL_CALL_CAP && p.run_status !== 'runner-capped') {
        add(`persona ${p.name} reached the ${TOOL_CALL_CAP} tool-call cap (tool_call_count=${p.tool_call_count}) but is not run_status runner-capped (F154)`);
      }
    }
    const timed = personaEntries.filter((p) => p.start_ts && p.end_ts);
    if (timed.length >= 2 && timed.length === personaEntries.length) {
      const iv = timed.map((p) => [Date.parse(p.start_ts), Date.parse(p.end_ts)]);
      let overlap = false;
      for (let i = 0; i < iv.length; i++) for (let j = i + 1; j < iv.length; j++) {
        if (iv[i][0] < iv[j][1] && iv[j][0] < iv[i][1]) overlap = true;
      }
      if (!overlap) add('persona start_ts/end_ts intervals never overlap — sequential execution, not the required parallel model (F132/F133/F134)');
    }
    for (const p of personaEntries) {
      if (p.run_status === 'timed-out' && typeof p.last_completed_step === 'number' && p.last_completed_step > 0) {
        const merged = kept.some((f) => Array.isArray(f.personas_flagging) && f.personas_flagging.includes(p.name))
          || ledger.some((l) => l.persona === p.name);
        if (!merged) add(`timed-out persona ${p.name} progressed to step ${p.last_completed_step} but its partial ledger was not merged into findings.json (F75/F76)`);
      }
    }
  }

  // --- Ledger (F55/F56/F123) ---
  for (const l of ledger) {
    if (typeof l.task_completed !== 'boolean') add(`tasks_ledger entry for ${l.persona} lacks a task_completed boolean (F55/F56)`);
    if (l.reason_code !== undefined && !LEDGER_REASON_CODES.has(l.reason_code)) add(`tasks_ledger reason_code "${l.reason_code}" is outside the enumerated set (F123)`);
  }

  // --- Patience abandonment (F50/F51/F52) ---
  if (Array.isArray(bundle.walkthrough_progress)) {
    for (const wp of bundle.walkthrough_progress) {
      const p = personaEntries && personaEntries.find((x) => x.name === wp.persona);
      const threshold = p && typeof p.patience_threshold_steps === 'number' ? p.patience_threshold_steps : null;
      if (threshold !== null && wp.step_count > threshold) {
        const abandoned = ledger.some((l) => l.persona === wp.persona && l.task === wp.task && l.outcome === 'failed_by_patience');
        if (!abandoned) add(`persona ${wp.persona} crossed its patience threshold (step_count=${wp.step_count} > ${threshold}) but the task was not abandoned with outcome failed_by_patience (F50/F51/F52)`);
      }
    }
  }

  // --- Allowlist supply channel (F140/F141/F142) ---
  const allowlist = Array.isArray(run.standardized_flow_allowlist) ? run.standardized_flow_allowlist : [];
  for (const f of kept) {
    if (f.confidence_label === 'lower-confidence' && f.standardized_flow) {
      if (!allowlist.includes(f.standardized_flow)) add(`finding ${f.id || f.finding_id} carries the lower-confidence label for standardized_flow "${f.standardized_flow}" with no matching run allowlist entry (F142)`);
    }
  }

  // --- Per-finding structural checks (kept only) ---
  const completedSet = personaEntries ? new Set(personaEntries.filter((p) => p.run_status === 'completed').map((p) => p.name)) : null;
  for (const f of kept) {
    // Heuristic tag membership (F11/F24)
    if (!f.heuristic_tag) add(`finding ${f.id || f.finding_id} is untagged (no heuristic_tag) (F24)`);
    else if (!heuristicIds.includes(f.heuristic_tag)) add(`finding ${f.id || f.finding_id} heuristic_tag "${f.heuristic_tag}" is outside the configured heuristic set (F11/F23)`);

    // Convergence tier presence (F17): every kept finding MUST carry a convergence_tier (m3).
    if (f.convergence_tier === undefined || f.convergence_tier === null) {
      add(`finding ${f.id || f.finding_id} is missing the required convergence_tier field (F17)`);
    }

    // Evidence credential redaction (F43/F44/F102/F153/F166/F167) — core scanner set.
    if (Array.isArray(f.evidence)) {
      for (const ev of f.evidence) {
        const leak = hasCredentialLeak(ev && ev.captured_text);
        if (leak) add(`finding ${f.id || f.finding_id} evidence (${ev.type || 'artifact'}) leaks an unredacted ${leak} in captured_text — must be redacted/secret-scrubbed before disk write (F43/F44)`);
      }
    }

    // Forbidden claims in finding narrative (F21 WTP / F22 population) — core detector.
    for (const reason of forbiddenClaims(f.narrative)) {
      add(`finding ${f.id || f.finding_id} narrative makes a ${reason}`);
    }

    // App-error misfiling (F47/F48/F113)
    if (f.caused_by_app_error === true || (typeof f.http_status === 'number' && f.http_status >= 500)) {
      add(`finding ${f.id || f.finding_id} is a target-app app-error (5xx) filed as a heuristic-tagged friction (F47/F48)`);
    }

    // Ambiguity resolution needs >=2 concurrent candidates (F110)
    if (f.friction_type === 'ambiguity_resolution' && 'concurrent_candidates' in f && f.concurrent_candidates < 2) {
      add(`ambiguity_resolution finding ${f.id || f.finding_id} has fewer than 2 concurrent candidates (self-narrated hesitation) (F110)`);
    }

    // Severity range + formula (F12/F118/F119/F159/F161/F162)
    if (typeof f.severity !== 'number' || f.severity < 0 || f.severity > 4) {
      add(`finding ${f.id || f.finding_id} severity ${f.severity} is outside 0-4 (F12)`);
    }
    if (Array.isArray(f.component_severities) && f.component_severities.length > 0) {
      const mx = Math.max(...f.component_severities);
      if (f.severity !== mx) add(`merged finding ${f.id || f.finding_id} severity ${f.severity} != max(component_severities)=${mx} (F118/F119)`);
    }
    const sf = f.severity_factors;
    if (numericFactors(sf)) {
      const mean = (sf.frequency + sf.impact + sf.persistence) / 3;
      if (f.severity !== Math.round(mean)) add(`finding ${f.id || f.finding_id} severity ${f.severity} != round(mean(${sf.frequency},${sf.impact},${sf.persistence}))=${Math.round(mean)} (F12)`);
      if (typeof f.raw_within_run_reencounter_count === 'number') {
        const exp = bucketNumeric(f.raw_within_run_reencounter_count, rubric.frequency_buckets);
        if (exp !== undefined && sf.frequency !== exp) add(`finding ${f.id || f.finding_id} frequency ${sf.frequency} != bucket(${f.raw_within_run_reencounter_count})=${exp} (F159)`);
      }
      if (typeof f.terminal_recovery_outcome === 'string') {
        const exp = rubric.impact_buckets[f.terminal_recovery_outcome];
        if (exp !== undefined && sf.impact !== exp) add(`finding ${f.id || f.finding_id} impact ${sf.impact} != mapping(${f.terminal_recovery_outcome})=${exp} (F161)`);
      }
      if (typeof f.same_run_recurrence_count === 'number') {
        const exp = bucketNumeric(f.same_run_recurrence_count, rubric.persistence_buckets);
        if (exp !== undefined && sf.persistence !== exp) add(`finding ${f.id || f.finding_id} persistence ${sf.persistence} != bucket(${f.same_run_recurrence_count})=${exp} (F162)`);
      }
    } else if (sf && typeof sf.frequency === 'string') {
      if (/\d\s*%|percent|population|of (all )?users/i.test(sf.frequency)) {
        add(`finding ${f.id || f.finding_id} frequency factor is a cross-persona population/percentage estimate, not a within-run re-encounter count (F136)`);
      }
    }

    // finding_id hash (F92/F165/F203): a hex-shaped id MUST carry the tuple fields and match the
    // recomputed hash unconditionally — never skipped just because target_element_identifier is
    // absent (m1). Numeric-factor findings are also recomputed when a tei is present.
    if (f.finding_id) {
      const hexShaped = HEX_FINDING_ID.test(f.finding_id);
      const tei = teiOf(f);
      if (hexShaped) {
        if (tei === undefined || tei === null || tei === '') {
          add(`finding ${f.id || f.finding_id} finding_id is hex-shaped (fid-+16hex) but carries no target_element_identifier/target_selector to recompute the F165 hash from (F165/F203)`);
        } else {
          const expected = findingId(f.heuristic_tag, f.step, tei);
          if (f.finding_id !== expected) add(`finding ${f.id} finding_id "${f.finding_id}" != deterministic hash ${expected} of (heuristic_tag, step, target_element_identifier) (F92/F165)`);
        }
      } else if (numericFactors(sf) && tei) {
        const expected = findingId(f.heuristic_tag, f.step, tei);
        if (f.finding_id !== expected) add(`finding ${f.id} finding_id "${f.finding_id}" != deterministic hash ${expected} of (heuristic_tag, step, target_element_identifier) (F92/F165)`);
      }
    }

    // Convergence arithmetic (F17/F120/F170)
    const { completed: completedInPf, partial: nonCompleted } = convergenceCounts(f.personas_flagging, completedSet);
    if (typeof f.convergence_tier === 'number' && f.convergence_tier !== completedInPf) {
      add(`finding ${f.id || f.finding_id} convergence_tier ${f.convergence_tier} != count of completed flagging personas ${completedInPf} (F17/F170)`);
    }
    if ('partial_tier' in f && f.partial_tier !== nonCompleted) {
      add(`finding ${f.id || f.finding_id} partial_tier ${f.partial_tier} != count of non-completed flagging personas ${nonCompleted} (F120)`);
    }

    // Provenance (F189): flagging personas of a walkthrough_failure must have a "No" at that step.
    if (f.friction_type === 'walkthrough_failure' && walkthrough) {
      for (const p of (Array.isArray(f.personas_flagging) ? f.personas_flagging : [])) {
        const flagged = walkthrough.some((w) => w.persona === p && w.step === f.step && Object.values(w.answers || {}).some((v) => v === 'no'));
        if (!flagged) add(`finding ${f.id || f.finding_id} lists ${p} in personas_flagging but that persona produced no "No" walkthrough answer at step ${f.step} (F189 provenance)`);
      }
    }
  }

  // --- Dedup / merge divergence (F45/F46/F92/F147/F183/F193) ---
  const byTuple = new Map();
  for (const f of kept) {
    const key = tupleKey(f);
    byTuple.set(key, (byTuple.get(key) || 0) + 1);
  }
  for (const [key, count] of byTuple) {
    if (count > 1) add(`two findings share identity tuple (${key}) but were left unmerged (F45/F46)`);
  }
  const byName = new Map();
  for (const f of kept) {
    if (!byName.has(f.friction_name)) byName.set(f.friction_name, []);
    byName.get(f.friction_name).push(f);
  }
  for (const [name, group] of byName) {
    if (group.length > 1) {
      const keys = new Set(group.map(tupleKey));
      if (keys.size > 1) add(`findings named "${name}" produced divergent identity tuples across personas and failed to merge (F147/F183/F193)`);
    }
  }

  // --- Retry classification (F111/F112/F113) ---
  for (const a of actions) {
    if (a.type !== 'retry') continue;
    const transient = a.auto_recovered === true && a.within_wait_timeout === true;
    if (transient) {
      const asFriction = allFindings.some((f) => f.step === a.step && Array.isArray(f.personas_flagging) && f.personas_flagging.includes(a.persona));
      if (asFriction) add(`transient auto-recovered retry at step ${a.step} was recorded as friction (F111)`);
    }
    if (a.persona_initiated === true && (a.http_status === null || a.http_status === undefined)) {
      const asFriction = allFindings.some((f) => f.step === a.step && Array.isArray(f.personas_flagging) && f.personas_flagging.includes(a.persona));
      if (!asFriction) add(`persona-initiated retry with no 5xx at step ${a.step} was neither recorded as friction nor filed as app-error (F112)`);
    }
  }

  // --- Output ---
  for (const line of dropLog) process.stdout.write(line + '\n');
  for (const f of kept) process.stdout.write(`kept ${f.id || f.finding_id}\n`);
  if (violations.length > 0) {
    for (const v of violations) process.stderr.write('VIOLATION: ' + v + '\n');
    process.exit(1);
  }
  process.stdout.write('gate: PASS\n');
  process.exit(0);
}

main();
