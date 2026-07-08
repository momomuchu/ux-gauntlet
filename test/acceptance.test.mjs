// RED acceptance test — ux-gauntlet MVP (spec: docs/specs/0001-ux-gauntlet-mvp.spec.md)
// ATDD lock: references every [CRITICAL] requirement ID. MUST fail until the skill is built.
// CLI contract exercised here is fixed by docs/adr/0001-runner-cli-contract.md (D9) — tests may
// only invoke that interface. Hardened per disjoint review 2026-07-08 (findings 9-17).
// Run: node --test test/acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

// Runs a script, returns {code, stderr, stdout}. Never throws.
function run(args) {
  try {
    const stdout = execFileSync('node', args, { stdio: 'pipe' }).toString();
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}
const gate = (fixture) => run(['scripts/report-gate.mjs', '--check-fixture', `test/fixtures/${fixture}`]);

const NIELSEN_10 = [
  'visibility-of-system-status', 'match-system-real-world', 'user-control-freedom',
  'consistency-standards', 'error-prevention', 'recognition-rather-than-recall',
  'flexibility-efficiency-of-use', 'aesthetic-minimalist-design',
  'help-users-recognize-recover-errors', 'help-and-documentation',
];

test('F1 F5: persona schema exists and requires the 5 persona fields', () => {
  // Requirement ID: F1, F5
  assert.ok(existsSync('schemas/persona.schema.json'), 'schemas/persona.schema.json missing');
  const s = json('schemas/persona.schema.json');
  for (const f of ['goal', 'success_criteria', 'budget_authority', 'patience_threshold_steps', 'forbidden_claims']) {
    assert.ok(s.required.includes(f), `persona schema must require "${f}"`);
  }
});

test('F109 F105 CR1-8/CR1-6: repo ships a run-bundle schema and a denylist schema plus shipped default', () => {
  // Requirement ID: F109, F105 (challenge round 1 BLOCKER-8, BLOCKER-6)
  assert.ok(existsSync('schemas/run-bundle.schema.json'), 'schemas/run-bundle.schema.json missing (F109 — the shape report-gate.mjs --check-fixture consumes has zero schema authority without it)');
  assert.ok(existsSync('schemas/denylist.schema.json'), 'schemas/denylist.schema.json missing (F105)');
  assert.ok(existsSync('denylist/default-destructive-labels.json'), 'denylist/default-destructive-labels.json missing (F105 shipped default)');
  const denylistSchema = json('schemas/denylist.schema.json');
  assert.equal(denylistSchema.type, 'array', 'denylist schema requires a JSON array shape (F106)');
  assert.ok(denylistSchema.minItems >= 1, 'denylist schema requires a non-empty array (F106)');
});

test('F6 F7 F8 F36: runner refuses to crawl without a happy-path task list, with a named reason', () => {
  // Requirement ID: F6, F7, F8, F36 (CLI per ADR-0001)
  // CR1-7/CR1-10: every other static precondition is satisfied so the "task list" refusal is
  // isolated deterministically, not a coin-flip against whichever rule a builder checks first.
  assert.ok(existsSync('scripts/run-gauntlet.mjs'), 'scripts/run-gauntlet.mjs missing');
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--i-own-this-target', '--env', 'local', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  assert.equal(r.code, 1, 'refusal is exit 1 per ADR-0001 (not a crash, not usage error)');
  assert.match(r.stderr, /task list/i, 'stderr must name the violated rule: missing task list (review finding #15)');
});

test('F107 F108: three simultaneous missing static preconditions all get named in one invocation', () => {
  // Requirement ID: F107, F108 (challenge round 1 BLOCKER-7/MAJOR-4/BLOCKER-10, CR1-7/CR1-14)
  assert.ok(existsSync('scripts/run-gauntlet.mjs'), 'scripts/run-gauntlet.mjs missing');
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--headless']);
  assert.equal(r.code, 1, 'aggregate refusal is still exit 1');
  assert.match(r.stderr, /i-own-this-target/i, 'missing --i-own-this-target is named even though other flags are also missing (F107 aggregation)');
  assert.match(r.stderr, /env/i, 'missing --env is named in the same invocation (F108 one-line-per-violation)');
  assert.match(r.stderr, /denylist/i, 'missing --denylist is named in the same invocation (F108 one-line-per-violation)');
});

test('F61: runner hard-stops on missing --env even when every other required flag is present', () => {
  // Requirement ID: F61
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--i-own-this-target', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  assert.equal(r.code, 1, 'missing --env is a refusal, not a crash');
  assert.match(r.stderr, /env/i, 'stderr names the missing --env rule (F61)');
});

test('F65: runner refuses without --i-own-this-target even when every other required flag is present', () => {
  // Requirement ID: F65
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--env', 'local', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  assert.equal(r.code, 1, 'missing --i-own-this-target is a refusal, not a crash');
  assert.match(r.stderr, /i-own-this-target/i, 'stderr names the missing --i-own-this-target rule (F65)');
});

test('F67 F68: a non-localhost target requires third-party-data confirmation; localhost does not', () => {
  // Requirement ID: F67, F68
  const nonLocalhost = run(['scripts/run-gauntlet.mjs', '--url', 'https://staging.example.com', '--tasks', 'test/fixtures/tasks.json', '--i-own-this-target', '--env', 'staging', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  assert.equal(nonLocalhost.code, 1, 'non-localhost target without --confirm-third-party-data is refused');
  assert.match(nonLocalhost.stderr, /third.?party/i, 'stderr names the third-party-data confirmation rule (F67/F68)');
  // Negative control: localhost never requires this confirmation (F67 is explicitly scoped to non-localhost).
  const localhost = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--i-own-this-target', '--env', 'local', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  assert.doesNotMatch(localhost.stderr, /third.?party/i, 'localhost target must never be refused for missing third-party-data confirmation (negative control)');
});

test('F9 F33: a walkthrough "No" with no matching friction instance fails the gate', () => {
  // Requirement ID: F9, F33 — behavior, not SKILL.md prose (review finding #12)
  const r = gate('walkthrough-no-without-friction.json');
  assert.notEqual(r.code, 0, 'a logged "No" answer with no friction instance is a gate violation (F33)');
  assert.match(r.stderr + r.stdout, /walkthrough/i, 'gate output must name the walkthrough consistency rule');
  // The 4-question protocol itself must also be spelled out for the persona subagents:
  assert.ok(existsSync('SKILL.md'), 'SKILL.md missing');
  const s = read('SKILL.md').toLowerCase();
  for (const q of ['right result', 'notice', 'associate', 'progress']) {
    assert.ok(s.includes(q), `SKILL.md must carry walkthrough question keyword "${q}" (F9)`);
  }
});

test('F10 F11 F12 F28 F34: findings schema enforces friction shape; heuristic set is pluggable data (default: Nielsen 10)', () => {
  // Requirement ID: F10, F11, F12, F28, F34
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  assert.ok(existsSync('config/heuristics.default.json'), 'config/heuristics.default.json missing (F28: taxonomy-as-data)');
  const hs = json('config/heuristics.default.json');
  const ids = (hs.criteria ?? []).map((c) => c.id ?? c);
  for (const h of NIELSEN_10) assert.ok(ids.includes(h), `default set must contain Nielsen heuristic "${h}" (review finding #16)`);
  assert.equal(ids.length, 10, 'default heuristic set is exactly the Nielsen 10');
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding, 'findings schema must define a finding object');
  assert.ok(finding.required.includes('heuristic_tag'), 'every finding carries exactly one criterion tag (F11)');
  assert.ok(finding.required.includes('friction_name'), 'each friction instance is NAMED (F10)');
  assert.ok(finding.properties.friction_type?.enum?.includes('ambiguity_resolution'), 'ambiguity resolutions are first-class frictions (F34)');
  assert.deepEqual([finding.properties.severity.minimum, finding.properties.severity.maximum], [0, 4], 'severity must be 0-4 (F12)');
  for (const f of ['frequency', 'impact', 'persistence']) {
    assert.ok(JSON.stringify(finding.properties.severity_factors).includes(f), `severity_factors must carry "${f}" (F12)`);
  }
  assert.ok(finding.properties.finding_id, 'finding_id is a schema-defined property distinct from narrative/timestamp (F92/F122)');
  assert.ok(finding.properties.concurrent_candidates, 'concurrent_candidates is a schema-defined property (F110)');
});

test('F12 CR1-16: severity is a formula, round(mean(frequency, impact, persistence)), gate-verified', () => {
  // Requirement ID: F12 (challenge round 1 MAJOR-6)
  const bad = gate('findings-bad-severity.json');
  assert.notEqual(bad.code, 0, 'severity=4 when round(mean(4,4,0))=3 must fail the gate (F12 formula)');
  const ok = gate('findings-severity-ok.json');
  assert.equal(ok.code, 0, 'severity correctly equal to round(mean(4,4,0))=3 must pass the gate (negative control)');
});

test('F110 CR1-9: ambiguity_resolution friction requires >=2 concurrently visible candidates, not self-narrated hesitation', () => {
  // Requirement ID: F34, F110 (challenge round 1 BLOCKER-9)
  const narrated = gate('ambiguity-self-narrated-no-artifact.json');
  assert.notEqual(narrated.code, 0, 'self-narrated hesitation with concurrent_candidates < 2 must fail the gate (F110)');
  assert.match(narrated.stderr + narrated.stdout, /candidate/i, 'gate output names the multi-candidate rule');
  const ok = gate('ambiguity-multi-candidate-ok.json');
  assert.equal(ok.code, 0, 'an ambiguity_resolution finding with concurrent_candidates=2 must pass the gate (negative control)');
});

test('F14 F15: report gate drops zero-evidence findings', () => {
  // Requirement ID: F14, F15
  const r = gate('finding-no-evidence.json');
  assert.match(r.stdout + r.stderr, /DROPPED/, 'a finding with zero evidence artifacts must be reported as DROPPED');
});

test('F23 F24: gate exits nonzero on schema violation and on an untagged finding', () => {
  // Requirement ID: F23, F24 (review finding #9)
  const untagged = gate('finding-untagged.json');
  assert.notEqual(untagged.code, 0, 'untagged finding must fail the gate (F24)');
  const unknown = gate('finding-unknown-tag.json');
  assert.notEqual(unknown.code, 0, 'tag outside the configured heuristic set must fail the gate (F11/F23)');
  const valid = gate('findings-valid.json');
  assert.equal(valid.code, 0, 'the valid fixture must PASS the gate (negative control)');
});

test('F16 F17 F30 F31 F32: >=3 personas enforced; convergence tier is the verified integer count', () => {
  // Requirement ID: F16, F17 (F30, F31, F32 exercised empirically at build: parallel subagent lanes)
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding.required.includes('convergence_tier'), 'convergence_tier is required per finding (F17)');
  // CR1-7/CR1-10: every other static precondition is satisfied so the persona-count refusal is
  // isolated deterministically, not entangled with the missing-flags refusals covered elsewhere.
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--i-own-this-target', '--env', 'local', '--denylist', 'denylist/default-destructive-labels.json', '--personas', 'personas/free-tier-user.yaml', '--headless']);
  assert.equal(r.code, 1, 'a run with fewer than 3 personas must be refused with exit 1 (F16)');
  assert.match(r.stderr, /3 personas|persona/i, 'refusal names the persona-minimum rule');
  // Arithmetic check (review finding #14): tier must equal |personas_flagging|, gate-verified.
  const bad = gate('findings-bad-tier.json');
  assert.notEqual(bad.code, 0, 'convergence_tier != count(personas_flagging) must fail the gate (F17)');
});

test('F17 F120 CR1-18: convergence_tier counts only run_status-completed personas; partial_tier counts the rest', () => {
  // Requirement ID: F17, F120 (challenge round 1 MAJOR-7)
  const inflated = gate('findings-tier-inflated-by-crashed-persona.json');
  assert.notEqual(inflated.code, 0, 'a crashed persona counted into convergence_tier (3 instead of 2) must fail the gate (F17)');
  const ok = gate('findings-tier-with-partial-ok.json');
  assert.equal(ok.code, 0, 'convergence_tier=2 (completed only) with partial_tier=1 (the crashed contribution) must pass the gate (negative control)');
});

test('F45 F46 F103 CR1-4: target_element_identifier fallback merges structurally different DOM for the same control', () => {
  // Requirement ID: F45, F46, F103 (challenge round 1 BLOCKER-4)
  const notMerged = gate('findings-duplicate-different-dom-not-merged.json');
  assert.notEqual(notMerged.code, 0, 'two records sharing target_element_identifier via the F103 fallback but left as separate entries must fail the gate (F46)');
  const merged = gate('findings-cross-persona-merged.json');
  assert.equal(merged.code, 0, 'a correctly merged cross-persona entry (convergence_tier=2, one finding_id) must pass the gate (F45/F46/F92 identity unification, CR1-1)');
});

test('F118 F119 CR1-17: a merged finding\'s severity equals the max of its component severities, not the mean', () => {
  // Requirement ID: F118, F119 (challenge round 1 MAJOR-7)
  const bad = gate('findings-merged-severity-bad.json');
  assert.notEqual(bad.code, 0, 'merged severity=3 when component_severities=[2,4] (mean, not max) must fail the gate (F119)');
  const ok = gate('findings-merged-severity-ok.json');
  assert.equal(ok.code, 0, 'merged severity=4 (the max of [2,4]) must pass the gate (negative control)');
});

test('F18 F19: markdown report is generated FROM the findings data, not a static template', () => {
  // Requirement ID: F18, F19 (review finding #13)
  assert.ok(existsSync('scripts/render-report.mjs'), 'scripts/render-report.mjs missing');
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  assert.match(md, /## Findings/, 'renderer emits a findings section');
  assert.match(md, /signup CTA hidden below the fold/, 'fixture friction_name must appear in the rendered report');
  assert.match(md, /vp-team-buyer/, 'fixture persona must appear in the rendered report');
  assert.match(md, /flagged by 2/i, 'convergence bucket derived from integer tier at render time (D10)');
});

test('F18 F19 CR1-21: renderer output tracks its own input, proven by a differential fixture pair', () => {
  // Requirement ID: F18, F19 (challenge round 1 MAJOR-10 — a hardcoded template passes the single-fixture test above)
  const mdA = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  const mdB = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid-2.json']).stdout;
  assert.match(mdA, /signup CTA hidden below the fold/, 'fixture A\'s own friction_name appears in fixture A\'s render');
  assert.doesNotMatch(mdA, /invite-teammate email link points to a 404 page/, 'fixture B\'s friction_name must NOT leak into fixture A\'s render (proves output tracks input, not a static template)');
  assert.match(mdB, /invite-teammate email link points to a 404 page/, 'fixture B\'s own friction_name appears in fixture B\'s render');
  assert.doesNotMatch(mdB, /signup CTA hidden below the fold/, 'fixture A\'s friction_name must NOT leak into fixture B\'s render (reverse direction)');
});

test('F20 F21 F22 F35: validity envelope carries at least the 4 enumerated disclosures; forbidden claims blocked separately', () => {
  // Requirement ID: F20, F21, F22, F35 (review findings #5, #17; CR1-20 "at least" reword)
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  assert.match(md, /validity envelope/i, 'validity-envelope disclosure section is mandatory (F20)');
  assert.match(md, /not a replacement for real user research/i, 'disclosure (a) enumerated (F35)');
  assert.match(md, /willingness.to.pay/i, 'disclosure (b) enumerated (F35)');
  assert.match(md, /population|% of users/i, 'disclosure (c) enumerated (F35)');
  assert.match(md, /ISO 9241-11/, 'disclosure (d) enumerated (F35)');
  const wtp = gate('finding-wtp-claim.json');
  assert.notEqual(wtp.code, 0, 'gate rejects WTP estimates (F21)');
  const pop = gate('finding-population-claim.json');
  assert.notEqual(pop.code, 0, 'gate rejects population-percentage claims with no WTP vocabulary (F22, independent fixture)');
});

test('F70 F71 F104 CR1-19/CR1-4: validity envelope also carries the rerun-variance and undercount disclosures', () => {
  // Requirement ID: F70, F71, F104 (challenge round 1 MAJOR-9 — previously zero test coverage)
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  assert.match(md, /differing|non-superset|non-subset/i, 'F70: rerun-variance disclosure (differing, non-superset/non-subset finding set) is rendered');
  assert.match(md, /not.{0,20}complete/i, 'F71: the report never claims single-run completeness');
  assert.match(md, /undercount/i, 'F104: convergence tiers can undercount on apps lacking stable selectors');
});

test('F27 F121 CR1-19: an allowlisted lower-confidence label still triggers the F26 CI gate at severity 4', () => {
  // Requirement ID: F27, F121 (challenge round 1 MAJOR-8 — previously zero coverage, undefined gate interaction)
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-allowlisted-lower-confidence.json']).stdout;
  assert.match(md, /lower.confidence/i, 'an allowlisted standardized-flow finding renders with the lower-confidence label (F27)');
  const baseline = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-valid.json']);
  assert.equal(baseline.code, 0, 'sanity: identical baseline vs current is a clean CI run');
  const worse = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-allowlisted-lower-confidence.json']);
  assert.notEqual(worse.code, 0, 'a NEW severity-4 finding must still block CI even though it carries the lower-confidence label (F121 — the label is cosmetic, not a CI suppression channel)');
});

test('F25 F29: persona validator rejects a malformed persona and names the missing field', () => {
  // Requirement ID: F25, F29 (review finding #10)
  assert.ok(existsSync('scripts/validate-persona.mjs'), 'scripts/validate-persona.mjs missing');
  const r = run(['scripts/validate-persona.mjs', 'test/fixtures/persona-missing-patience.yaml']);
  assert.notEqual(r.code, 0, 'persona missing patience_threshold_steps must be rejected (F25)');
  assert.match(r.stderr, /patience_threshold_steps/, 'validator names the missing field');
  for (const p of ['free-tier-user', 'willing-to-pay-user', 'vp-team-buyer']) {
    const ok = run(['scripts/validate-persona.mjs', `personas/${p}.yaml`]);
    assert.equal(ok.code, 0, `shipped default persona ${p} must validate (F2-F4, negative control)`);
  }
});

test('F26: CI mode blocks on a NEW severity-4 finding vs baseline', () => {
  // Requirement ID: F26 (review finding #11)
  assert.ok(existsSync('scripts/ci-diff.mjs'), 'scripts/ci-diff.mjs missing');
  const same = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-valid.json']);
  assert.equal(same.code, 0, 'identical findings vs baseline must pass (no new catastrophe)');
  const worse = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-new-sev4.json']);
  assert.notEqual(worse.code, 0, 'a NEW severity-4 finding must exit nonzero');
  assert.match(worse.stderr + worse.stdout, /severity.?4|catastrophe/i, 'CI output names the blocking finding class');
});

test('F101 CR1-2: CI mode also exits nonzero when run_status is BLOCKED, independent of severity-4 content', () => {
  // Requirement ID: F101 (challenge round 1 BLOCKER-2 — F26's literal "only" wording let CI pass green on a near-zero-coverage BLOCKED run)
  const blockedMatching = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-blocked-matching-baseline.json']);
  assert.notEqual(blockedMatching.code, 0, 'a BLOCKED current run whose findings exactly match the baseline must still exit nonzero (F101)');
  assert.match(blockedMatching.stderr + blockedMatching.stdout, /blocked/i, 'CI output names the BLOCKED run_status as the blocking reason');
  // Negative control: a completed run with matching findings stays a clean CI pass (already exercised
  // above by the F26 "same" case, which uses findings-valid.json with run_status "completed").
});

test('F72 F73 F92 F122 CR1-22: CI diff matches by stable finding_id, ignoring reworded narrative and timestamp', () => {
  // Requirement ID: F72, F73, F92, F122 (challenge round 1 MAJOR-11 — the spec's own documented
  // Gherkin scenario for this had zero test coverage before this pass)
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding.required.includes('finding_id'), 'finding_id is a required, schema-defined field distinct from narrative/timestamp (F122)');
  const reworded = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-reworded-narrative-same-id.json']);
  assert.equal(reworded.code, 0, 'identical finding_id with reworded narrative and a different timestamp must be treated as already-known, not as a new finding (F72/F73/F74)');
});

// --- Unknowns pass 2026-07-08 (docs/research/UNKNOWNS-DELTA.md §2, DR-01..DR-39) ---
// The refusal/safety layer (D11): the tool must refuse, not only discover. Fixtures below encode
// each violation as a run bundle the gate is expected to reject once built; a matching negative
// control proves the gate isn't just failing shut on any input (F45/D12 group additionally proves
// the dedup rule is content-aware, not a blanket rejection).

test('F37 F38 F105 F106: a run configuration with no or invalid denylist is rejected; a persona that clicks a denylisted action fails the gate', () => {
  // Requirement ID: F37, F38, F105, F106 (challenge round 1 BLOCKER-6)
  const noDenylist = gate('run-config-no-denylist.json');
  assert.notEqual(noDenylist.code, 0, 'a run config lacking an operator-supplied denylist must be rejected (F37)');
  assert.match(noDenylist.stderr + noDenylist.stdout, /denylist/i, 'gate output names the missing denylist');
  const invalidDenylist = gate('run-config-invalid-denylist.json');
  assert.notEqual(invalidDenylist.code, 0, 'an empty denylist array fails the non-empty-JSON-array-of-strings validation (F106)');
  assert.match(invalidDenylist.stderr + invalidDenylist.stdout, /denylist/i, 'gate output names the denylist-validation rule');
  const clicked = gate('denylist-click-violation.json');
  assert.notEqual(clicked.code, 0, 'a denylisted element that was clicked (not aborted) must fail the gate (F38)');
  const aborted = gate('denylist-abort-ok.json');
  assert.equal(aborted.code, 0, 'the same denylisted step correctly aborted must pass the gate (negative control)');
  const shippedDefault = gate('denylist-default-ok.json');
  assert.equal(shippedDefault.code, 0, 'a run config using a valid, non-empty denylist array passes the gate (negative control, F105 shipped-default shape)');
});

test('F39 F40 F115 F116 F117: payment and non-idempotent submit steps executed outside their explicit modes fail the gate', () => {
  // Requirement ID: F39, F40, F115, F116, F117 (challenge round 1 MAJOR-3, CR1-13)
  const payment = gate('payment-no-testmode.json');
  assert.notEqual(payment.code, 0, 'a payment_step-flagged step executed without run.test_mode=true must fail the gate (F39/F115/F116)');
  assert.match(payment.stderr + payment.stdout, /payment|test.?mode/i, 'gate output names the payment/test-mode rule');
  const submit = gate('nonidempotent-no-fullmode.json');
  assert.notEqual(submit.code, 0, 'a non-idempotent (POST) submit detected via network-request interception, executed without run.full_submission_mode=true, must fail the gate (F40/F117)');
  const wrongDetection = gate('nonidempotent-detected-via-dom-sniffing.json');
  assert.notEqual(wrongDetection.code, 0, 'detection via static DOM form-attribute sniffing instead of network-request interception must fail the gate (F117)');
  assert.match(wrongDetection.stderr + wrongDetection.stdout, /network|interception/i, 'gate output names the detection-mechanism rule');
});

test('F41 F42: navigation to a robots.txt-disallowed path without an override flag fails the gate', () => {
  // Requirement ID: F41, F42
  const nav = gate('robots-disallowed-nav.json');
  assert.notEqual(nav.code, 0, 'an executed navigation to a robots-disallowed path with no override must fail the gate');
  assert.match(nav.stderr + nav.stdout, /robots/i, 'gate output names the robots.txt rule');
});

test('F44: an unredacted credential-shaped string in a DOM evidence snippet fails the gate', () => {
  // Requirement ID: F44
  const leak = gate('evidence-secret-leak.json');
  assert.notEqual(leak.code, 0, 'a bearer-token-shaped string surviving in a DOM snippet\'s captured_text must fail the gate');
  assert.match(leak.stderr + leak.stdout, /redact|secret|credential/i, 'gate output names the redaction rule');
});

test('F43 F102 CR1-3: an unredacted credential-shaped string in a screenshot evidence captured_text sidecar fails the gate (own RED test, distinct from F44)', () => {
  // Requirement ID: F43, F102 (challenge round 1 BLOCKER-3 — F43's redaction was untestable-as-specified before this pass)
  const leak = gate('evidence-secret-leak-screenshot.json');
  assert.notEqual(leak.code, 0, 'a bearer-token-shaped string surviving in a screenshot-type evidence entry\'s captured_text sidecar field must fail the gate (F43)');
  assert.match(leak.stderr + leak.stdout, /redact|secret|credential/i, 'gate output names the redaction rule');
});

test('F45 F46: two findings sharing the (heuristic tag, step, target) identity but left unmerged fail the gate', () => {
  // Requirement ID: F45, F46
  const dup = gate('findings-duplicate-not-merged.json');
  assert.notEqual(dup.code, 0, 'two findings with an identical (heuristic_tag, step, target_selector) tuple that were not merged into one entry must fail the gate');
  const valid = gate('findings-valid.json');
  assert.equal(valid.code, 0, 'a findings file with no duplicate identity tuples still passes the gate (negative control)');
});

test('F111 F112 F113 CR1-11: a retry event is classified as transient, friction, or app-error by outcome, not just event type', () => {
  // Requirement ID: F111, F112, F113 (challenge round 1 MAJOR-1, cross-ref DR-24)
  const transient = gate('retry-transient-wrongly-friction.json');
  assert.notEqual(transient.code, 0, 'a retry that auto-recovered within the wait timeout, recorded as friction anyway, must fail the gate (F111)');
  assert.match(transient.stderr + transient.stdout, /transient|retry/i, 'gate output names the transient-retry rule (F111)');
  const droppedFriction = gate('retry-friction-wrongly-excluded.json');
  assert.notEqual(droppedFriction.code, 0, 'a persona-initiated retry with no 5xx response, recorded as neither friction nor app-error, must fail the gate (F112)');
  assert.match(droppedFriction.stderr + droppedFriction.stdout, /retry|friction/i, 'gate output names the retry-friction rule (F112)');
  const misfiledAppError = gate('app-error-as-friction.json');
  assert.notEqual(misfiledAppError.code, 0, 'a persona-initiated retry with a captured 5xx response, recorded as friction instead of app-error, must fail the gate (F113, shared fixture with the F47/F48 test)');
});

test('F47 F48: a target-app 5xx/network event recorded as a heuristic-tagged friction fails the gate', () => {
  // Requirement ID: F47, F48
  const misfiled = gate('app-error-as-friction.json');
  assert.notEqual(misfiled.code, 0, 'an HTTP-503-caused event tagged as a Nielsen-heuristic friction, and absent from app_errors, must fail the gate');
  assert.match(misfiled.stderr + misfiled.stdout, /app.?error/i, 'gate output names the app-error separation rule');
});

test('F49 F53 F54: a run with a crashed persona must expose run_status BLOCKED and disclose the non-completed count', () => {
  // Requirement ID: F49, F53, F54
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  const s = json('schemas/findings.schema.json');
  const findingOrRun = s.$defs ?? s.definitions ?? {};
  assert.ok(JSON.stringify(findingOrRun).includes('run_status'), 'schema must define a run_status concept (F49/F53)');
  const blocked = gate('run-status-blocked-missing-disclosure.json');
  assert.notEqual(blocked.code, 0, 'a BLOCKED run whose validity envelope omits the non-completed-persona count must fail the gate (F54)');
});

test('F124 CR1-24: a finding from a non-completed run must carry a degraded-below-persona-floor confidence field', () => {
  // Requirement ID: F124 (challenge round 1 MINOR-2)
  const missing = gate('findings-blocked-missing-confidence.json');
  assert.notEqual(missing.code, 0, 'a finding from a BLOCKED run with no confidence field must fail the gate (F124)');
  assert.match(missing.stderr + missing.stdout, /confidence/i, 'gate output names the missing confidence field');
  const ok = gate('findings-blocked-confidence-ok.json');
  assert.equal(ok.code, 0, 'the same finding carrying confidence=degraded-below-persona-floor must pass the gate (negative control)');
});

test('F50 F51 F52: crossing patience_threshold_steps must abandon the task, log a terminal friction, and set failed-by-patience', () => {
  // Requirement ID: F50, F51, F52
  assert.ok(existsSync('scripts/report-gate.mjs'), 'scripts/report-gate.mjs missing');
  const incomplete = gate('patience-abandon-incomplete.json');
  assert.notEqual(incomplete.code, 0, 'a persona past its patience threshold left in_progress (no abandon, no terminal friction, no failed-by-patience outcome) must fail the gate');
  assert.match(incomplete.stderr + incomplete.stdout, /patience/i, 'gate output names the patience-abandonment rule');
});

test('F114 F125 CR1-12/CR1-26: a correctly abandoned task carries a heuristic-tagged terminal friction with captured evidence, and survives the gate', () => {
  // Requirement ID: F114, F125 (challenge round 1 MAJOR-2, MINOR-4 — F51 had no guaranteed evidence artifact, and no defined heuristic tag)
  const ok = gate('patience-abandon-with-evidence.json');
  assert.equal(ok.code, 0, 'a terminal friction instance carrying both a heuristic_tag and a captured screenshot evidence artifact survives the F14/F15 zero-evidence gate (positive control, no exemption from F11/F14/F15)');
});

test('F55 F56 F123: the ledger must record task_completed and an enumerated reason code independent of the friction list', () => {
  // Requirement ID: F55, F56, F123 (challenge round 1 MINOR-1)
  assert.ok(existsSync('scripts/report-gate.mjs'), 'scripts/report-gate.mjs missing');
  const missing = gate('ledger-missing-task-completed.json');
  assert.notEqual(missing.code, 0, 'a task-ledger entry with no task_completed boolean must fail the gate');
  assert.match(missing.stderr + missing.stdout, /task_completed/i, 'gate output names the missing field');
  const badReason = gate('ledger-bad-reason-code.json');
  assert.notEqual(badReason.code, 0, 'a reason code outside the fixed enumerated set must fail the gate (F123)');
  const okReason = gate('ledger-reason-code-ok.json');
  assert.equal(okReason.code, 0, 'a reason code drawn from the enumerated set (denylist-abort) must pass the gate (negative control)');
});

test('F57 F58: a persona past the runner-level 50-action cap must be force-aborted with its partial ledger emitted', () => {
  // Requirement ID: F57, F58
  const overCap = gate('persona-exceeds-action-cap.json');
  assert.notEqual(overCap.code, 0, 'a persona with action_count > 50 still marked run_status completed (not force-aborted) must fail the gate');
  assert.match(overCap.stderr + overCap.stdout, /action|cap/i, 'gate output names the action-cap rule');
});
