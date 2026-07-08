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

test('F83 F156 F168 CR3-4/CR3-11/CR4-M6: repo ships a real examples/tasks.json artifact, a schema authority for task-list steps, and the shipped example itself authors audited_terminal_step correctly', () => {
  // Requirement ID: F83, F156, F168 (challenge round 3 BLOCKER-4, MAJOR-5; challenge round 4 MAJOR-6 —
  // F105's denylist gets an existsSync assertion pinning a real shipped path; F83's example tasks file
  // had no pinned path anywhere, and N8's own test self-documented substituting test/fixtures/tasks.json
  // as a "stand-in" for the real packaged artifact, so a builder could satisfy every frozen test while
  // shipping no discoverable example tasks file at all. F115/F126/F62/F128/F145 per-step booleans also
  // had no schema authority — schemas/tasks.schema.json closes both gaps at once. CR4-M6 closes a
  // deeper defect: even once examples/tasks.json exists, nothing verified its CONTENT — the shipped
  // example is the one real artifact a founder's first run actually uses, and a version with plain
  // string steps (no audited_terminal_step flag on the terminal submission) would silently dry-run-
  // block its own signup submission despite every prior frozen test passing.)
  assert.ok(existsSync('examples/tasks.json'), 'examples/tasks.json missing (F83 shipped default — real packaged artifact, not the test/fixtures/tasks.json stand-in)');
  assert.ok(existsSync('schemas/tasks.schema.json'), 'schemas/tasks.schema.json missing (F156 — task-list step shape, including the 5 D15 per-step booleans, has zero schema authority without it)');
  assert.ok(existsSync('SKILL.md'), 'SKILL.md missing');
  const s = read('SKILL.md').toLowerCase();
  assert.ok(s.includes('examples/tasks.json'), 'SKILL.md must reference examples/tasks.json by name (F83)');
  // F168 (CR4-M6): the shipped example's own content is verified, not merely its existence — its
  // terminal non-idempotent submission step MUST carry audited_terminal_step: true.
  const tasksSchema = json('schemas/tasks.schema.json');
  assert.ok(tasksSchema, 'schemas/tasks.schema.json must parse as valid JSON Schema (F156)');
  const tasks = json('examples/tasks.json');
  const steps = Array.isArray(tasks) ? tasks : tasks.steps;
  assert.ok(Array.isArray(steps) && steps.length > 0, 'examples/tasks.json must define a non-empty ordered step list');
  const terminalStep = steps[steps.length - 1];
  assert.ok(typeof terminalStep === 'object' && terminalStep.audited_terminal_step === true, 'examples/tasks.json\'s terminal non-idempotent submission step must carry audited_terminal_step: true (F168, CR4-M6) — not a bare plain string, and not left unaudited');
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

test('F108a/F172 CR4-MIN3: a violated precondition with a shipped-default remedy names that remedy\'s file path in stderr', () => {
  // Requirement ID: F172 (challenge round 4 MINOR-3 — F108 only required naming each violated rule,
  // not pointing to its shipped remedy; a first-time operator running the raw script blind got a
  // technically-correct but actionably-useless refusal, despite SKILL.md already naming both remedies
  // as the designed entry point.)
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--i-own-this-target', '--env', 'local', '--headless']);
  assert.equal(r.code, 1, 'refusal for missing --tasks and --denylist only is exit 1');
  assert.match(r.stderr, /examples\/tasks\.json/i, 'stderr names the tasks-precondition\'s shipped-default remedy path (F172)');
  assert.match(r.stderr, /denylist\/default-destructive-labels\.json/i, 'stderr names the denylist-precondition\'s shipped-default remedy path (F172)');
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
  // F155/CR3-10 (challenge round 3 MAJOR-4): "localhost" was a bare, undefined term — a literal
  // hostname-string implementation would classify 127.0.0.1 (Docker/Vite/uvicorn defaults) as
  // "non-localhost," silently reintroducing a 6th required flag the same way CR2-2/CR2-19 already
  // fixed once for --env. 127.0.0.1 must get the identical treatment as the literal string "localhost".
  const loopbackIp = run(['scripts/run-gauntlet.mjs', '--url', 'http://127.0.0.1:9', '--tasks', 'test/fixtures/tasks.json', '--i-own-this-target', '--env', 'local', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  assert.doesNotMatch(loopbackIp.stderr, /third.?party/i, '127.0.0.1 must be classified as localhost per F155/N6a and never require --confirm-third-party-data (negative control, CR3-10)');
});

test('N8 CR2-2: the exact first-time-operator invocation (shipped tasks, shipped denylist, --i-own-this-target, --env local) is never refused as a flag-validation failure', () => {
  // Requirement ID: N8 (challenge round 2 BLOCKER-2 — N8's original minimal flag list omitted --env,
  // which F61 hard-stops on with no default; the literal N8 command used to exit 1 on attempt #1).
  assert.ok(existsSync('scripts/run-gauntlet.mjs'), 'scripts/run-gauntlet.mjs missing');
  assert.ok(existsSync('test/fixtures/tasks.json'), 'the shipped example tasks file (stood in for by F83 in the real package) must exist');
  assert.ok(existsSync('denylist/default-destructive-labels.json'), 'the shipped default denylist (F105) must exist');
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--i-own-this-target', '--env', 'local', '--denylist', 'denylist/default-destructive-labels.json', '--headless']);
  // No live fixture server exists in this repo (named residual risk, CR1-8) — "reaches a started crawl"
  // is therefore verified as "never refused by the static aggregate gate," leaving only a
  // target-availability outcome (F80, exit 3) as the acceptable non-zero result in a sandbox with no
  // reachable target. Exit 1 (validation refusal) or exit 2 (usage error) would mean N8 is still false.
  assert.ok([0, 3].includes(r.code), `the literal N8 invocation must reach a started crawl (exit 0) or a target-availability outcome (exit 3, F80) — never a flag-validation refusal (exit 1, got ${r.code}) or a usage error (exit 2), since every ADR-0001 required flag is present including --env`);
  assert.doesNotMatch(r.stderr, /task list|i-own-this-target|--env\b|denylist/i, 'stderr must not name any missing/invalid required-flag rule — this is exactly the pre-fix N8/F61 defect (CR2-2)');
});

test('F9 F33: a walkthrough "No" with no matching friction instance fails the gate', () => {
  // Requirement ID: F9, F33 — behavior, not SKILL.md prose (review finding #12)
  const r = gate('walkthrough-no-without-friction.json');
  assert.notEqual(r.code, 0, 'a logged "No" answer with no friction instance is a gate violation (F33)');
  assert.match(r.stderr + r.stdout, /walkthrough/i, 'gate output must name the walkthrough consistency rule');
  // CR2-3 (challenge round 2 BLOCKER-3): a rule-specific "ok" companion proves this test isn't
  // satisfiable by a filename-keyed shortcut — the SAME "No" answer with a matching friction instance
  // must PASS, not just fail-shut on any fixture.
  const ok = gate('walkthrough-no-with-matching-friction-ok.json');
  assert.equal(ok.code, 0, 'the same "No" answers correctly matched by a friction instance must pass the gate (negative control, CR2-3)');
  // The 4-question protocol itself must also be spelled out for the persona subagents:
  assert.ok(existsSync('SKILL.md'), 'SKILL.md missing');
  const s = read('SKILL.md').toLowerCase();
  for (const q of ['right result', 'notice', 'associate', 'progress']) {
    assert.ok(s.includes(q), `SKILL.md must carry walkthrough question keyword "${q}" (F9)`);
  }
});

test('F9 CR4-M11: every step\'s walkthrough answer set is behaviorally verified as complete (all 4 keys), not just SKILL.md prose', () => {
  // Requirement ID: F9 (challenge round 4 MAJOR-11 — the test's own prior comment claimed this was
  // "behavior, not SKILL.md prose," but only F33 (a lone unmatched "No") got a real gate()-fixture
  // behavioral proof; F9's own core mandate that every step records all 4 answers was checked
  // exclusively by a string search against SKILL.md. A builder could ship a persona that silently
  // skips 2 of 4 questions every step, never producing an unmatched "No", and pass the full suite.)
  const incomplete = gate('walkthrough-step-incomplete-answers-bad.json');
  assert.notEqual(incomplete.code, 0, 'a step\'s answers object missing 1-3 of the 4 required keys must fail the gate (F9, CR4-M11)');
  const complete = gate('walkthrough-step-complete-answers-ok.json');
  assert.equal(complete.code, 0, 'the same step shape with all 4 required keys populated for every persona must pass the gate (negative control, CR4-M11)');
});

test('F163 CR4-M1: a step skipped under F63 is exempt from F9\'s walkthrough obligation; fabricated answers for a skipped step fail the gate', () => {
  // Requirement ID: F163 (challenge round 4 MAJOR-1 — F9 unconditionally mandated walkthrough answers
  // "at each task step," while F63/F64 independently mandate an external_side_effect-flagged step be
  // skipped, never executed. A builder had to either skip walkthrough recording (violating F9's
  // literal text) or fabricate answers about an interaction the persona never performed, corrupting
  // the ledger; F62-F64 had zero test coverage anywhere in the frozen suite.)
  const ok = gate('walkthrough-skipped-step-no-answers-ok.json');
  assert.equal(ok.code, 0, 'a step correctly skipped under F63 (external_side_effect) carries no walkthrough answers, and this must pass the gate (F163, negative control)');
  const bad = gate('walkthrough-skipped-step-with-answers-bad.json');
  assert.notEqual(bad.code, 0, 'a step flagged external_side_effect (skipped, never executed) that nonetheless carries fabricated walkthrough answers must fail the gate — the persona MUST NOT record answers for a step it never performed (F163 violation)');
});

test('F164 CR4-M2 D15: a task-list step carrying more than one of the 5 D15 per-step flags is rejected, not silently executed under either interpretation', () => {
  // Requirement ID: F164 (challenge round 4 MAJOR-2 — D15's stated precedence order covered only
  // (1) per-step flag vs run-global default, (2) run-global safety vs task completion, (3) localhost
  // relaxation — never flag-vs-flag on the SAME step. A step schema-legally authored with both
  // audited_terminal_step:true (F146 requires submission) and external_side_effect:true (F63 requires
  // skip) triggers two contradictory MUSTs, and D15's "CLOSED" framing masked that this combination
  // was never adjudicated.)
  const conflicting = gate('task-step-conflicting-flags-bad.json');
  assert.notEqual(conflicting.code, 0, 'a step object carrying both audited_terminal_step:true and external_side_effect:true must be rejected by the schema validator, not silently executed under either interpretation (F164, D15 mutual exclusivity)');
  // Negative control: a step carrying exactly ONE of the 5 D15 flags is unaffected by this rule —
  // reuses the existing audited-terminal-step-ok.json fixture (already proven single-flag-valid
  // elsewhere in this suite) rather than duplicating a near-identical fixture.
  const singleFlag = gate('audited-terminal-step-ok.json');
  assert.equal(singleFlag.code, 0, 'a step carrying exactly one D15 flag (audited_terminal_step alone) is unaffected by the mutual-exclusivity rule and still passes the gate (negative control, F164)');
});

test('F10 F11 F12 F28 F34: findings schema enforces friction shape; heuristic set is pluggable data (default: Nielsen 10)', () => {
  // Requirement ID: F10, F11, F12, F28, F34
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  assert.ok(existsSync('config/heuristics.default.json'), 'config/heuristics.default.json missing (F28: taxonomy-as-data)');
  const hs = json('config/heuristics.default.json');
  const ids = (hs.criteria ?? []).map((c) => c.id ?? c);
  for (const h of NIELSEN_10) assert.ok(ids.includes(h), `default set must contain Nielsen heuristic "${h}" (review finding #16)`);
  assert.equal(ids.length, 10, 'default heuristic set is exactly the Nielsen 10');
  // F169 (challenge round 4 MAJOR-7/MINOR-1): F150 presupposes the heuristic-set config file has a
  // slot designating one special tag as "the" patience-abandonment tag, but F28 never established
  // such a field, and no gate ever cross-checked the config file against fixture-hardcoded tag values
  // — a builder could satisfy the full suite without ever adding the designation mechanism at all.
  assert.ok(hs.patience_abandonment_tag, 'config/heuristics.default.json must carry a top-level patience_abandonment_tag field (F169, CR4-M7/CR4-MIN1)');
  assert.ok(ids.includes(hs.patience_abandonment_tag), 'patience_abandonment_tag\'s value must be one of the tag identifiers present in the same file\'s heuristic list (F169)');
  assert.equal(hs.patience_abandonment_tag, 'flexibility-efficiency-of-use', 'patience_abandonment_tag must match the heuristic_tag value already used by the F149/F150 patience-identity fixtures (F169)');
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

test('F136 CR2-11: the frequency factor is a within-run persona re-encounter count, never a cross-persona/population estimate', () => {
  // Requirement ID: F136 (challenge round 2 MAJOR-7 — frequency was undefined at the isolated-persona
  // scoring unit that must compute it)
  const populationEstimate = gate('findings-frequency-population-estimate-bad.json');
  assert.notEqual(populationEstimate.code, 0, 'a frequency value annotated as a cross-persona population/percentage estimate ("38% of users") must fail the gate — the isolated persona subagent cannot observe population-wide commonality (F12/F136)');
  const ok = gate('findings-frequency-recount-ok.json');
  assert.equal(ok.code, 0, 'a frequency value correctly scoped to this persona\'s own within-run re-encounter count must pass the gate (negative control)');
});

test('F159 CR3-17: the numeric-branch frequency factor maps from the raw re-encounter count via a fixed bucket function', () => {
  // Requirement ID: F159 (challenge round 3 MINOR-1 — F12's bounded 0-4 severity-factor requirement
  // had no bucket mapping for the numeric branch when raw frequency counts exceed 4; the dominant
  // free-text escape hatch already resolves the failure story in practice, so this closes only the
  // numeric branch's gap.)
  const ok = gate('findings-frequency-numeric-bucket-ok.json');
  assert.equal(ok.code, 0, 'a raw within-run re-encounter count of 13 (11-or-more bucket) correctly maps to numeric frequency=4, passing the F12 severity(=round(mean(4,4,4))=4) arithmetic gate (F159)');
});

test('F161 F162 CR4-B3: impact and persistence, F12\'s other two severity factors, are operationalized via fixed mappings too, not left as free judgment', () => {
  // Requirement ID: F161, F162 (challenge round 4 BLOCKER-3 — F159/CR3-17 fixed frequency's
  // reproducibility gap, but impact and persistence appeared nowhere else in the spec beyond F12's
  // formula sentence: the "gate-verified" round(mean(...)) check only proved internal arithmetic
  // consistency, not that the inputs meant anything or were reproducible across runs.)
  const unscoped = gate('findings-severity-impact-persistence-unscoped-bad.json');
  assert.notEqual(unscoped.code, 0, 'an impact value not traceable to the F161 fixed mapping (terminal_recovery_outcome says "recovered-with-minor-detour"=1, but severity_factors.impact is an unscoped 4) must fail the gate');
  const mapped = gate('findings-severity-impact-persistence-mapped-ok.json');
  assert.equal(mapped.code, 0, 'frequency, impact, and persistence each traceable to their own fixed mapping (F159/F161/F162), with severity=round(mean(0,4,1))=2 correctly matching, must pass the gate (negative control, CR4-B3)');
});

test('F110 CR1-9: ambiguity_resolution friction requires >=2 concurrently visible candidates, not self-narrated hesitation', () => {
  // Requirement ID: F34, F110 (challenge round 1 BLOCKER-9)
  const narrated = gate('ambiguity-self-narrated-no-artifact.json');
  assert.notEqual(narrated.code, 0, 'self-narrated hesitation with concurrent_candidates < 2 must fail the gate (F110)');
  assert.match(narrated.stderr + narrated.stdout, /candidate/i, 'gate output names the multi-candidate rule');
  const ok = gate('ambiguity-multi-candidate-ok.json');
  assert.equal(ok.code, 0, 'an ambiguity_resolution finding with concurrent_candidates=2 must pass the gate (negative control)');
});

test('F14 F15 CR4-B4: report gate drops zero-evidence findings and retains evidenced ones, with exit-code and negative-control proof', () => {
  // Requirement ID: F14, F15 (challenge round 4 BLOCKER-4 — the entire prior proof for this
  // [CRITICAL][BLOCKS:high] rule was an unconditional substring match on stdout+stderr with no
  // `.code` assertion and no '-ok' companion fixture, breaking the CR2-3 pattern every sibling rule
  // received; a builder could pass by printing a static "DROPPED" legend line on every invocation
  // while never actually filtering zero-evidence findings.)
  const r = gate('finding-no-evidence.json');
  assert.equal(r.code, 0, 'a run containing one dropped zero-evidence finding (fr-001) alongside one valid finding (fr-002) is still a clean gate pass — dropping is filtering, not a gate failure (CR4-B4)');
  assert.match(r.stdout + r.stderr, /DROPPED/, 'a finding with zero evidence artifacts must be reported as DROPPED');
  assert.match(r.stdout + r.stderr, /fr-002/, 'gate output still references the retained fr-002 finding, proving selective dropping — not merely printing the word DROPPED regardless of input (CR4-B4)');
  // CR4-B4: rule-specific '-ok' companion (CR2-3 pattern) — a finding WITH evidence must survive,
  // not merely be reported as dropped by a builder gaming a static "DROPPED" legend line.
  const ok = gate('finding-evidence-present-ok.json');
  assert.equal(ok.code, 0, 'a findings file where every finding references at least one evidence artifact must pass the gate cleanly, with neither finding dropped (negative control, CR4-B4)');
  assert.doesNotMatch(ok.stdout + ok.stderr, /DROPPED/, 'no finding is dropped when every finding carries evidence (negative control, CR4-B4)');
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

test('F24 D7 CR4-M5: the gate enforces the CONFIGURED heuristic set, not a hardcoded Nielsen list', () => {
  // Requirement ID: F24 (challenge round 4 MAJOR-5 — F24, the CRITICAL gate-enforcement rule, named
  // "a Nielsen-heuristic tag" literally, contradicting D7's CRITICAL pluggable-heuristic-taxonomy
  // promise; D7 states alternative heuristic sets are loadable without logic edits and the invariant
  // is "no untagged finding," not "Nielsen." Zero fixture in the frozen suite exercised a real
  // non-Nielsen heuristic set, so a builder who hardcoded gate validation against the fixed 10-item
  // Nielsen list passed every test while silently breaking D7's pluggability.)
  const custom = gate('findings-custom-heuristic-set-ok.json');
  assert.equal(custom.code, 0, 'a finding tagged from an operator-configured non-Nielsen heuristic set (ISO 9241-110 style, test/fixtures/heuristics-iso9241-110.json) must PASS the gate — F24 enforces "configured set" membership, not a hardcoded Nielsen list (D7 pluggability, CR4-M5)');
});

test('F16 F17: >=3 personas enforced; convergence tier is the verified integer count', () => {
  // Requirement ID: F16, F17. CR2-4 (challenge round 2 BLOCKER-4): F30/F31/F32/F88 tags dropped from
  // this test's name — it does not cover the parallel-execution/isolation architecture claim; that
  // gap is now explicitly disclosed in spec.md's "Known verification gaps" section, and a dedicated
  // fixture-level mechanical proxy (persona start_ts/end_ts overlap, F132/F133/F134) is exercised in
  // the "F132 F133 F134 CR2-8" test below — itself named as fixture-only, not live-behavior, coverage.
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

test('F92 F45 F165 CR2-6/CR4-M3: finding_id equals a deterministic hash of exactly (heuristic_tag, step, target_element_identifier), the same JSON field names as the F45 dedup tuple', () => {
  // Requirement ID: F92, F45, F165 (challenge round 2 MAJOR-2 — F92 previously named its second tuple
  // field "normalized_step_id", a name F45 never used; the only fixture matched neither literal name.
  // Challenge round 4 MAJOR-3: F92 named no algorithm at all, yet these 3 fixtures hard-code one exact
  // formula as ground truth — F165 now states it as a normative line, binding on every builder.)
  // Normative formula (F165): fid- + sha256(tag|step|id).hex.slice(0,16) — not "any deterministic hash".
  const a = gate('findings-finding-id-formula-a.json');
  assert.equal(a.code, 0, 'a finding_id correctly computed from (heuristic_tag, step, target_element_identifier) for a data-testid-tier merge must pass the gate (F92)');
  const b = gate('findings-finding-id-formula-b.json');
  assert.equal(b.code, 0, 'the identical formula applied to a differently-shaped merge (accessible-name-plus-role tier, no data-testid) must independently pass the gate too, proving the identity function is tier-agnostic, not one hand-matched literal (F92/F103)');
  const mismatched = gate('findings-finding-id-mismatched-bad.json');
  assert.notEqual(mismatched.code, 0, 'a finding_id that does not equal the deterministic hash of its own (heuristic_tag, step, target_element_identifier) tuple must fail the gate (F92 formula violation)');
});

test('F147 CR3-2: an off-path friction\'s step field equals the next-pending happy-path step, never the last-completed one', () => {
  // Requirement ID: F147 (challenge round 3 BLOCKER-2 — F10/F34 mandate friction records for actions
  // that by definition aren't happy-path steps, but F45/F92's identity tuple never resolved whether an
  // off-path friction's `step` is the next-pending or last-completed happy-path step; two builders
  // picking differently silently reintroduces the cross-persona-merge defect CR1-1/CR2-6 already fixed).
  const merged = gate('findings-offpath-step-divergent-detour-ok.json');
  assert.equal(merged.code, 0, 'two personas taking structurally different detours to the identical off-path friction, both correctly computing step=2 (the next not-yet-completed happy-path step), merge into one finding at convergence_tier=2 (F147, negative control)');
  const divergent = gate('findings-offpath-step-divergent-detour-bad.json');
  assert.notEqual(divergent.code, 0, 'the identical underlying detour recorded with step=2 by one persona and step=1 (the WRONG, last-completed-step convention) by the other must fail the gate — the divergent step field silently collapses convergence_tier=2 to two convergence_tier=1 entries (F147 violation)');
});

test('F118 F119 CR1-17: a merged finding\'s severity equals the max of its component severities, not the mean', () => {
  // Requirement ID: F118, F119 (challenge round 1 MAJOR-7)
  const bad = gate('findings-merged-severity-bad.json');
  assert.notEqual(bad.code, 0, 'merged severity=3 when component_severities=[2,4] (mean, not max) must fail the gate (F119)');
  const ok = gate('findings-merged-severity-ok.json');
  assert.equal(ok.code, 0, 'merged severity=4 (the max of [2,4]) must pass the gate (negative control)');
});

test('F17 F45 CR2-21: a single persona\'s own intra-persona F45 duplicate must not double-count its convergence_tier contribution', () => {
  // Requirement ID: F17, F45 (challenge round 2 MINOR-5 — no fixture exercised the case where two of
  // a single persona's own pre-merge records collide on the same F45 tuple).
  const ok = gate('findings-intra-persona-duplicate-ok.json');
  assert.equal(ok.code, 0, 'two pre-merge records from the SAME persona sharing an identical F45 tuple collapse to convergence_tier=1, not 2 (negative control)');
  const bad = gate('findings-intra-persona-duplicate-bad.json');
  assert.notEqual(bad.code, 0, 'convergence_tier=2 from a single persona\'s own intra-persona F45 duplicate must fail the gate — corroboration weight must not be double-counted from one persona\'s repeated instance of the same friction (F17/F45)');
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

test('F137 CR2-12: a merged finding\'s component_severities array renders adjacent to severity only when it holds more than one distinct value', () => {
  // Requirement ID: F137 (challenge round 2 MAJOR-8 — component_severities was stored in findings.json
  // but nothing required the rendered report to surface it, so a MAX-driven severity-4 flagged by
  // 1-of-3 personas looked identical in the report to one all three agreed on).
  const mixed = run(['scripts/render-report.mjs', 'test/fixtures/findings-merged-severity-ok.json']).stdout;
  assert.match(mixed, /2.{0,4}4|\[2,\s*4\]/, 'component_severities [2, 4] (2 distinct values) must render adjacent to the severity value (F137)');
  const uniform = run(['scripts/render-report.mjs', 'test/fixtures/findings-component-severities-uniform-ok.json']).stdout;
  assert.doesNotMatch(uniform, /\[3,\s*3\]/, 'component_severities [3, 3] (1 distinct value, full agreement) need not render the array — F137 only mandates rendering when more than one distinct value exists');
});

test('F20 F21 F22 F35: validity envelope carries at least the 6 enumerated disclosures; forbidden claims blocked separately', () => {
  // Requirement ID: F20, F21, F22, F35 (review findings #5, #17; CR1-20 "at least" reword)
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  assert.match(md, /validity envelope/i, 'validity-envelope disclosure section is mandatory (F20)');
  assert.match(md, /not a replacement for real user research/i, 'disclosure (a) enumerated (F35)');
  assert.match(md, /willingness.to.pay/i, 'disclosure (b) enumerated (F35)');
  assert.match(md, /population|% of users/i, 'disclosure (c) enumerated (F35)');
  assert.match(md, /ISO 9241-11/, 'disclosure (d) enumerated (F35)');
  assert.match(md, /severity.*(not guaranteed|not comparable).*reproducible/i, 'disclosure (e) enumerated: severity is not guaranteed comparable/reproducible across runs (F157, CR3-12)');
  // CR4-B3/CR4-M9 (challenge round 4): F157 previously scoped this caveat to the free-text severity
  // path only, implicitly (and falsely) certifying the numeric branch as fully reproducible even
  // though 2 of its 3 inputs (impact, persistence) had no fixed formula. F157 is now widened to fire
  // unconditionally — prove it renders on a NUMERIC-severity_factors fixture too, not only free-text.
  const mdNumeric = run(['scripts/render-report.mjs', 'test/fixtures/findings-severity-impact-persistence-mapped-ok.json']).stdout;
  assert.match(mdNumeric, /severity.*(not guaranteed|not comparable).*reproducible/i, 'disclosure (e) also renders when severity_factors is numeric, not only free-text (F157 widened, CR4-B3)');
  // CR4-M10: disclosure (f) — the F27 walkthrough-weakness rationale is now unconditional, not gated
  // on any finding carrying the lower-confidence label; findings-valid.json carries no such label.
  assert.match(md, /weaker on (standard|standardized|well-learned)/i, 'disclosure (f) enumerated: cognitive walkthroughs are weaker on standardized patterns, stated unconditionally on every report (F171, CR4-M10)');
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

test('F138 F139 CR2-13: the rerun-instability caveat explicitly extends to a new severity-4 finding that trips the F26 CI gate', () => {
  // Requirement ID: F138, F139 (challenge round 2 MAJOR-9 — F26's hard CI block had no reconciliation
  // with F70's admitted rerun-instability; a single red CI run from pure LLM/persona stochasticity
  // could read as a confirmed regression with no confirmation step at the top severity tier).
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-new-sev4.json']).stdout;
  assert.match(md, /rerun/i, 'F138: the validity envelope states a new severity-4 finding carries the same rerun-instability caveat as F70');
  assert.match(md, /manually re-run/i, 'F139: the validity envelope instructs the operator to manually re-run before treating a single red CI run as a confirmed regression');
});

test('F27 F121 CR1-19: an allowlisted lower-confidence label still triggers the F26 CI gate at severity 4', () => {
  // Requirement ID: F27, F121 (challenge round 1 MAJOR-8 — previously zero coverage, undefined gate interaction)
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-allowlisted-lower-confidence.json']).stdout;
  assert.match(md, /lower.confidence/i, 'an allowlisted standardized-flow finding renders with the lower-confidence label (F27)');
  // F160/CR3-19 (challenge round 3 MINOR-3): F27 implemented only the LABEL half of the twin
  // standardized-flow disclosure mandate (DECISION-BRIEF §2.2) — the report must also state WHY the
  // finding is lower-confidence, not just tag it.
  assert.match(md, /weaker on (standard|standardized|well-learned)/i, 'the report states the walkthrough-weakness rationale whenever a lower-confidence-labeled finding is present, not just the label itself (F160)');
  const baseline = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-valid.json']);
  assert.equal(baseline.code, 0, 'sanity: identical baseline vs current is a clean CI run');
  const worse = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-allowlisted-lower-confidence.json']);
  assert.notEqual(worse.code, 0, 'a NEW severity-4 finding must still block CI even though it carries the lower-confidence label (F121 — the label is cosmetic, not a CI suppression channel), isolated to that single variable now that run_status is aligned with the baseline (CR3-16 fixes the CR1-19 confounded-fixture defect)');
});

test('F140 F141 F142 CR2-14: the standardized-flow-allowlist supply channel is gate-enforced, not just renderable from a pre-labeled fixture', () => {
  // Requirement ID: F140, F141, F142 (challenge round 2 MAJOR-10 — D4/F27 required an
  // operator-maintained allowlist, but ADR-0001's CLI contract had no flag and the task-list schema
  // had no field to receive it; the prior test only proved render-report.mjs COULD render a
  // pre-labeled fixture, never that the allowlist reaches it end-to-end).
  const applied = gate('findings-allowlist-supplied-applied-ok.json');
  assert.equal(applied.code, 0, 'a lower-confidence-labeled finding whose step matches a flow-name entry recorded in the run configuration\'s standardized_flow_allowlist must pass the gate (F140/F141/F142)');
  const notApplied = gate('findings-allowlist-supplied-not-applied-bad.json');
  assert.notEqual(notApplied.code, 0, 'a lower-confidence-labeled finding whose step matches no allowlist entry recorded in the run configuration must fail the gate — the label has no supply channel to justify it (F142)');
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

test('F66 CR2-16: persona validator rejects a live-credential-shaped field value', () => {
  // Requirement ID: F66 (challenge round 2 MAJOR-12 — F66 was the exact sibling of the tested
  // F43/F44/F102 redaction rules but had zero test coverage; UNKNOWNS-DELTA ranks credential leakage
  // among the 5 most dangerous MVP gaps).
  assert.ok(existsSync('scripts/validate-persona.mjs'), 'scripts/validate-persona.mjs missing');
  const r = run(['scripts/validate-persona.mjs', 'test/fixtures/persona-live-credential.yaml']);
  assert.notEqual(r.code, 0, 'a persona file carrying a live-credential-shaped field value must be rejected (F66)');
  assert.match(r.stderr, /credential|login_password|login_email/i, 'validator names the offending field or the live-credential rule');
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

test('F151 CR3-6/CR3-14: CI mode also blocks when an ALREADY-KNOWN finding_id escalates from severity <4 to severity 4', () => {
  // Requirement ID: F151 (challenge round 3 BLOCKER-6, reinforced MAJOR-8 — finding_id excludes
  // severity from its identity tuple (F92), and the spec's own worked scenario says a matched
  // finding_id is "already-known, not new"; a baseline finding at severity 2 that reproduces
  // identically but now at severity 4 is literally "already-known" per F92/F73, so CI would stay
  // green through exactly the regression F26/N4 exist to catch, absent this gate.)
  const escalated = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-escalated-to-sev4.json']);
  assert.notEqual(escalated.code, 0, 'a finding whose finding_id matches a baseline entry, but whose severity escalated from 2 (baseline) to 4 (current), must exit nonzero — an already-known finding_id match must never suppress a genuine catastrophic regression (F151)');
  assert.match(escalated.stderr + escalated.stdout, /severity.?4|catastrophe|escalat/i, 'CI output names the severity-escalation blocking reason');
  const stderrCaveat = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-new-sev4.json']);
  assert.match(stderrCaveat.stderr, /rerun/i, 'F158: ci-diff.mjs prints the rerun-instability caveat directly to its OWN stderr, not only via render-report.mjs\'s markdown output — a headless CI consumer (N4) typically only surfaces the failing command\'s own stderr (CR3-13)');
  assert.match(stderrCaveat.stderr, /manually re-run/i, 'F158: ci-diff.mjs\'s own stderr also carries the manual-re-run instruction (CR3-13)');
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
  // CR2-5 (challenge round 2 MAJOR-1): denylist_override is a per-step, logged exemption — never a
  // run-global bypass. A flagged step may click; every OTHER step in the same run stays protected.
  const overrideOk = gate('denylist-override-used-ok.json');
  assert.equal(overrideOk.code, 0, 'a step the operator explicitly flagged denylist_override may click the denylisted element, logging a denylist_override_used event, and still passes the gate (F128/F129)');
  const overrideScoped = gate('denylist-override-scoped-not-global-bad.json');
  assert.notEqual(overrideScoped.code, 0, 'a denylist_override flag on one step must not exempt a DIFFERENT, non-overridden step in the same run from F38\'s abort rule — the run-global denylist default is never reopened by a per-step override (F130)');
});

test('F126 F127 CR2-1: precondition_step exempts only its own step from F40, not the whole run', () => {
  // Requirement ID: F126, F127 (challenge round 2 BLOCKER-1 — F89/F90 sanction operator-authored
  // login-precondition steps, but F40's global dry-run boundary made them unreachable by default,
  // with the only escape hatch (--full-submission) also defeating F40 for the audited task itself).
  const ok = gate('precondition-step-login-ok.json');
  assert.equal(ok.code, 0, 'a precondition_step-flagged login POST passes the gate under full_submission_mode=false (F127)');
  const scoped = gate('precondition-step-scoped-not-global-bad.json');
  assert.notEqual(scoped.code, 0, 'a non-precondition non-idempotent step in the SAME run still fails the gate under the same mode — the exemption is step-scoped, not a global bypass (F40/F126/F127)');
});

test('F145 F146 CR3-1 D15: audited_terminal_step exempts only its own step from F40, not the whole run', () => {
  // Requirement ID: F145, F146 (challenge round 3 BLOCKER-1 — F40's default dry-run boundary made the
  // spec's own flagship signup scenario, F10-F14, unbuildable: literally every task's own terminal
  // submission halted under F40's default, since D14's original 4-flag family covered preconditions,
  // payments, side effects, and denylist overrides, but never "the task's own final submission". D15
  // closes the family with a 5th flag, distinct from precondition_step, which exempts a LEADING setup
  // step, never the task's own terminal outcome.)
  const ok = gate('audited-terminal-step-ok.json');
  assert.equal(ok.code, 0, 'an audited_terminal_step-flagged submission passes the gate under full_submission_mode=false, with no --full-submission needed for the whole run (F146)');
  const scoped = gate('audited-terminal-step-scoped-not-global-bad.json');
  assert.notEqual(scoped.code, 0, 'a non-audited non-idempotent step in the SAME run still fails the gate under the same mode — the exemption is step-scoped, not a global bypass (F40/F145/F146, D15)');
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
  // CR2-3 (challenge round 2 BLOCKER-3): rule-specific "ok" companion.
  const ok = gate('robots-nav-allowed-ok.json');
  assert.equal(ok.code, 0, 'a navigation to a robots-allowed path must pass the gate (negative control, CR2-3)');
});

test('F148 CR3-3: a missing-or-erroring robots.txt on an otherwise-reachable target is treated as allow-all, never a refusal', () => {
  // Requirement ID: F148 (challenge round 3 BLOCKER-3 — no requirement stated what happens when
  // robots.txt returns 404 on an otherwise-reachable target, the default for most local dev servers;
  // N8's own acceptance test always points at a fully unreachable port, so the ambiguity was
  // structurally invisible to the frozen suite and would only detonate on a founder's real machine).
  const allowAll = gate('robots-404-allow-all-ok.json');
  assert.equal(allowAll.code, 0, 'a target whose robots.txt fetch 404\'d (absent) must be treated as allow-all and crawled, never refused (F148)');
});

test('F152 CR3-7 D15: --override-robots is documented as the resolution for a local/staging robots.txt disallow-all', () => {
  // Requirement ID: F152 (challenge round 3 MAJOR-1 — F67/F68 explicitly scope their gate to
  // "non-localhost target"; F41/F42 apply unconditionally and correctly so, but the existing escape
  // hatch --override-robots was absent from all first-run guidance, so a blanket Disallow: / on a
  // dev/staging deployment silently aborted every persona's navigation with no discoverable fix).
  assert.ok(existsSync('SKILL.md'), 'SKILL.md missing');
  const s = read('SKILL.md').toLowerCase();
  assert.ok(s.includes('override-robots'), 'SKILL.md must name --override-robots as the resolution for a local/staging robots.txt disallow-all (F152)');
  // CR4-MIN4 (challenge round 4 MINOR-4): F152's text requires TWO independent surfaces (CLI --help
  // text AND shipped documentation), but the only test exercising it checked SKILL.md content alone —
  // never spawning --help to check CLI stdout/stderr, silently letting half the requirement go unmet.
  const help = run(['scripts/run-gauntlet.mjs', '--help']);
  assert.match(help.stdout + help.stderr, /override-robots/i, '--help output must also reference --override-robots (F152, CR4-MIN4)');
});

test('F44: an unredacted credential-shaped string in a DOM evidence snippet fails the gate', () => {
  // Requirement ID: F44
  const leak = gate('evidence-secret-leak.json');
  assert.notEqual(leak.code, 0, 'a bearer-token-shaped string surviving in a DOM snippet\'s captured_text must fail the gate');
  assert.match(leak.stderr + leak.stdout, /redact|secret|credential/i, 'gate output names the redaction rule');
  // CR2-3 (challenge round 2 BLOCKER-3): rule-specific "ok" companion.
  const ok = gate('evidence-redacted-ok.json');
  assert.equal(ok.code, 0, 'the same DOM snippet with the token correctly redacted must pass the gate (negative control, CR2-3)');
  // CR2-9 (challenge round 2 MAJOR-5): the redaction pattern is an enumerated minimum, not a single
  // Bearer-shaped regex — a bare sk- prefixed key with no Bearer wrapper must also be caught.
  const apikey = gate('evidence-secret-leak-apikey.json');
  assert.notEqual(apikey.code, 0, 'a bare sk- prefixed API key (no Bearer wrapper) surviving in a DOM snippet must fail the gate (F44 enumerated pattern, CR2-9)');
  // CR3-8 (challenge round 3 MAJOR-2): the shipped pattern set was a bare 3-char prefix match with no
  // minimum-length/character-class qualifier — a literal includes('sk-') implementation would mangle
  // ordinary UI text ("Task-42", "Risk-level", "Desk-booking") before it's ever written to disk.
  const ordinary = gate('evidence-not-secret-ordinary-text-ok.json');
  assert.equal(ordinary.code, 0, 'ordinary UI text merely containing the bare substring "sk-" ("risk-assessment", "desk-booking") without a qualifying trailing character run must survive to disk unmodified — the redaction pattern is shape-qualified, not a bare-prefix match (F153, negative control)');
  // CR4-S3 (pattern-3 sweep): F44's apikey RED fixture had zero '-ok' companion proving a correctly
  // redacted sk- key survives disk write — closing the same control-pair-evenness gap CR2-3 fixed
  // elsewhere in this suite.
  const apikeyOk = gate('evidence-secret-redacted-apikey-ok.json');
  assert.equal(apikeyOk.code, 0, 'the same bare sk- prefixed API key correctly redacted must pass the gate (negative control, CR4-S3)');
  // CR4-M4 (challenge round 4 MAJOR-4): "a cookie header value" had zero regex, zero format
  // definition, zero fixture anywhere in the repo, unlike every sibling redaction pattern.
  const cookieLeak = gate('evidence-cookie-leak.json');
  assert.notEqual(cookieLeak.code, 0, 'a live "Cookie: session=abc123; theme=dark" substring surviving in a DOM snippet must fail the gate (F44/F167, CR4-M4)');
  assert.match(cookieLeak.stderr + cookieLeak.stdout, /redact|secret|credential|cookie/i, 'gate output names the redaction rule');
  const cookieOrdinary = gate('evidence-not-secret-ordinary-cookie-text-ok.json');
  assert.equal(cookieOrdinary.code, 0, 'ordinary UI text merely mentioning the word "cookie" (a cookie-consent banner, no literal Cookie:/Set-Cookie: HTTP-header-shaped prefix) must survive to disk unmodified (negative control, CR4-M4)');
});

test('F43 F102 CR1-3: an unredacted credential-shaped string in a screenshot evidence captured_text sidecar fails the gate (own RED test, distinct from F44)', () => {
  // Requirement ID: F43, F102 (challenge round 1 BLOCKER-3 — F43's redaction was untestable-as-specified before this pass)
  const leak = gate('evidence-secret-leak-screenshot.json');
  assert.notEqual(leak.code, 0, 'a bearer-token-shaped string surviving in a screenshot-type evidence entry\'s captured_text sidecar field must fail the gate (F43)');
  assert.match(leak.stderr + leak.stdout, /redact|secret|credential/i, 'gate output names the redaction rule');
  // CR2-3 (challenge round 2 BLOCKER-3): rule-specific "ok" companion.
  const ok = gate('evidence-redacted-screenshot-ok.json');
  assert.equal(ok.code, 0, 'the same screenshot captured_text with the token correctly redacted must pass the gate (negative control, CR2-3)');
  // CR2-9 (challenge round 2 MAJOR-5): a 13-19 digit Luhn-valid card number, with no Bearer/JWT shape
  // at all, must also be caught by the enumerated redaction pattern set.
  const cardnumber = gate('evidence-secret-leak-cardnumber.json');
  assert.notEqual(cardnumber.code, 0, 'a 16-digit Luhn-valid card number surviving in a screenshot captured_text sidecar field must fail the gate (F43 enumerated pattern, CR2-9)');
  // CR4-S3 (pattern-3 sweep): F43's cardnumber RED fixture had zero '-ok' companion.
  const cardnumberOk = gate('evidence-secret-redacted-cardnumber-ok.json');
  assert.equal(cardnumberOk.code, 0, 'the same 16-digit Luhn-valid card number correctly redacted must pass the gate (negative control, CR4-S3)');
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
  // CR4-S3 (pattern-3 sweep): this whole test block previously had ZERO '-ok' companions — all 3
  // assertions were `notEqual(code, 0)`, meaning a builder could pass by failing shut on every retry
  // shape without ever correctly classifying a CORRECT transient-exclusion or friction-inclusion case.
  const transientOk = gate('retry-transient-correctly-excluded-ok.json');
  assert.equal(transientOk.code, 0, 'a retry that auto-recovered within the wait timeout, correctly EXCLUDED from the friction ledger, must pass the gate (F111 negative control, CR4-S3)');
  const frictionOk = gate('retry-friction-correctly-included-ok.json');
  assert.equal(frictionOk.code, 0, 'a persona-initiated retry with no 5xx response, correctly recorded as friction (not excluded, not filed as app-error), must pass the gate (F112 negative control, CR4-S3)');
  const appErrorOk = gate('app-error-correctly-filed-ok.json');
  assert.equal(appErrorOk.code, 0, 'a persona-initiated retry with a captured 5xx response, correctly filed as app-error (not friction), must pass the gate (F113 negative control, CR4-S3, shared fixture with the F47/F48 test)');
});

test('F47 F48: a target-app 5xx/network event recorded as a heuristic-tagged friction fails the gate', () => {
  // Requirement ID: F47, F48
  const misfiled = gate('app-error-as-friction.json');
  assert.notEqual(misfiled.code, 0, 'an HTTP-503-caused event tagged as a Nielsen-heuristic friction, and absent from app_errors, must fail the gate');
  assert.match(misfiled.stderr + misfiled.stdout, /app.?error/i, 'gate output names the app-error separation rule');
  // CR2-3 (challenge round 2 BLOCKER-3): rule-specific "ok" companion.
  const ok = gate('app-error-correctly-filed-ok.json');
  assert.equal(ok.code, 0, 'the same HTTP-503 event correctly filed in app_errors, absent from the heuristic-tagged friction list, must pass the gate (negative control, CR2-3)');
});

test('F49 F53 F54: a run with a crashed persona must expose run_status BLOCKED and disclose the non-completed count', () => {
  // Requirement ID: F49, F53, F54
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  const s = json('schemas/findings.schema.json');
  const findingOrRun = s.$defs ?? s.definitions ?? {};
  assert.ok(JSON.stringify(findingOrRun).includes('run_status'), 'schema must define a run_status concept (F49/F53)');
  const blocked = gate('run-status-blocked-missing-disclosure.json');
  assert.notEqual(blocked.code, 0, 'a BLOCKED run whose validity envelope omits the non-completed-persona count must fail the gate (F54)');
  // CR2-3 (challenge round 2 BLOCKER-3): rule-specific "ok" companion.
  const ok = gate('run-status-blocked-with-disclosure-ok.json');
  assert.equal(ok.code, 0, 'the same BLOCKED run with the non-completed-persona count correctly disclosed must pass the gate (negative control, CR2-3)');
});

test('F49 CR4-B2: patience-exhausted personas alone never trigger the BLOCKED run-status, distinguishing designed abandonment from execution failure', () => {
  // Requirement ID: F49 (challenge round 4 BLOCKER-2 — F49's original wording set run_status=BLOCKED
  // when fewer than 3 personas "complete their crawl due to a persona-execution failure," but F53's
  // flat enum gave no failure/non-failure axis and F50-F52 define patience-exhaustion as a designed,
  // successful methodology outcome, not a failure. 2 of 3 personas legitimately abandoning via
  // patience exhaustion, with 0 crashed/timed-out, must never read as indistinguishable from a
  // near-total infra crash — that would make CI exit nonzero on the tool's most valuable output.)
  const patienceOnly = gate('run-status-not-blocked-patience-only.json');
  assert.equal(patienceOnly.code, 0, 'a run with 2 patience-exhausted personas and 1 completed persona (0 crashed, 0 timed-out) must exit CI clean — patience-exhaustion alone never triggers BLOCKED (F49 rescoped, CR4-B2)');
});

test('F124 CR1-24: a finding from a non-completed run must carry a degraded-below-persona-floor confidence field', () => {
  // Requirement ID: F124 (challenge round 1 MINOR-2)
  const missing = gate('findings-blocked-missing-confidence.json');
  assert.notEqual(missing.code, 0, 'a finding from a BLOCKED run with no confidence field must fail the gate (F124)');
  assert.match(missing.stderr + missing.stdout, /confidence/i, 'gate output names the missing confidence field');
  const ok = gate('findings-blocked-confidence-ok.json');
  assert.equal(ok.code, 0, 'the same finding carrying confidence=degraded-below-persona-floor must pass the gate (negative control)');
});

test('F143 F144 CR2-17: confidence_label and confidence coexist on the same finding as independent fields, without CI-gate collision', () => {
  // Requirement ID: F143, F144 (challenge round 2 MINOR-1 — F27's lower-confidence label and F124's
  // degraded confidence can attach to the same finding under realistic conditions; requirements.txt
  // never named the two field names explicitly, only the fixture convention did).
  const combo = gate('findings-confidence-label-and-degraded-combo-ok.json');
  assert.equal(combo.code, 0, 'a finding carrying BOTH confidence_label (F27) and confidence (F124) as two independent fields must pass the gate — neither field alters the other, neither alters the F121 CI-gate outcome (F143/F144)');
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-confidence-label-and-degraded-combo-ok.json']).stdout;
  assert.match(md, /lower.confidence/i, 'confidence_label renders independently (F27)');
  assert.match(md, /degraded-below-persona-floor/i, 'confidence renders independently (F124), without colliding with confidence_label');
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

test('F149 F150 CR3-5: patience-abandonment identity is fixed (sentinel + designated tag), not narrative/DOM-derived, so it corroborates across personas', () => {
  // Requirement ID: F149, F150 (challenge round 3 BLOCKER-5 — F51/F125 required only "some"
  // heuristic_tag from the configured set, and F103's target_element_identifier fallback was defined
  // only for a rendered DOM interaction, not a step-count threshold crossing; two personas abandoning
  // the identical task at the identical step for the identical reason could hash to two different
  // finding_ids, defeating the exact reliability signal the 3-persona architecture exists to produce
  // for the friction class that most needs corroboration.)
  const merged = gate('patience-identity-divergent-personas-merged-ok.json');
  assert.equal(merged.code, 0, 'two personas independently abandoning the identical task at the identical step, via different simulated DOM/path state, merge into one finding at convergence_tier=2 because target_element_identifier is a fixed per-step sentinel (F149) and heuristic_tag is the one designated patience-abandonment tag (F150) — negative control');
  const divergent = gate('patience-identity-divergent-values-bad.json');
  assert.notEqual(divergent.code, 0, 'the identical step-11 abandonment recorded with a DOM-derived target_element_identifier for one persona, instead of the fixed sentinel F149 mandates, must fail the gate — the divergence silently collapses convergence_tier=2 to two convergence_tier=1 entries');
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

test('F57 F58 F53 F176 CR4-B1: a persona past the runner-level 50-action cap must be force-aborted with its partial ledger emitted, run_status runner-capped', () => {
  // Requirement ID: F57, F58, F53, F176
  const overCap = gate('persona-exceeds-action-cap.json');
  assert.notEqual(overCap.code, 0, 'a persona with action_count > 50 still marked run_status completed (not force-aborted) must fail the gate');
  assert.match(overCap.stderr + overCap.stdout, /action|cap/i, 'gate output names the action-cap rule');
  // CR4-B1 (challenge round 4 BLOCKER-1): the pre-CR4 4-value run_status enum had no legal value for a
  // runner-level forced abort — every sibling terminal-state rule (F75/F76, F55/F56) carries a matching
  // '-ok' positive control proving the CORRECT value; F57/F58 never did until now.
  const ok = gate('persona-action-cap-correctly-capped-ok.json');
  assert.equal(ok.code, 0, 'a persona with action_count > 50 correctly marked run_status "runner-capped" (the F53 5th enum member) with reason_code "runner-capped" must pass the gate (negative control, CR4-B1)');
});

test('F154 CR3-9 F53 F176 CR4-B1: a persona past the configured per-run LLM tool-call maximum (default 250) must be force-terminated, run_status runner-capped', () => {
  // Requirement ID: F154, F53, F176 (challenge round 3 MAJOR-3 — F99/F100's "configured" per-run tool-call
  // maximum had no CLI flag, no stated default, and zero test coverage anywhere in the frozen suite,
  // the identical defect class already fixed once for F75/F76 -> F131 in round 2.)
  const overCap = gate('persona-exceeds-tool-call-cap.json');
  assert.notEqual(overCap.code, 0, 'a persona with tool_call_count > 250 (the F154 default) still marked run_status completed (not force-terminated) must fail the gate');
  assert.match(overCap.stderr + overCap.stdout, /tool.?call|cap/i, 'gate output names the tool-call-cap rule');
  // CR4-B1: matching positive control for the tool-call-cap sibling of the action-cap force-abort.
  const ok = gate('persona-tool-call-cap-correctly-capped-ok.json');
  assert.equal(ok.code, 0, 'a persona with tool_call_count > 250 correctly marked run_status "runner-capped" must pass the gate (negative control, CR4-B1)');
});

// --- Challenge round 2 pass 2026-07-08 (.swe-spec/CHALLENGE-ROUND-2.md, 23 confirmed defects) ---
// Remaining CR2 test additions not co-located with an existing test block above.

test('F75 F76 CR2-7: a persona terminated by the run-level wallclock timeout has its partial ledger merged into findings.json', () => {
  // Requirement ID: F75, F76 (challenge round 2 MAJOR-3 — the timeout's numeric default was never
  // specified anywhere, and no test exercised F75/F76 against a real hang; a builder could hardcode
  // an absurd value, e.g. 24h, that never fires, and still pass the frozen suite).
  const missing = gate('run-timeout-partial-ledger-missing-bad.json');
  assert.notEqual(missing.code, 0, 'a timed-out persona that progressed to step 3 before the timeout fired, with zero merged findings/ledger entries, must fail the gate — the partial ledger was dropped instead of merged as-is (F76)');
  const ok = gate('run-timeout-partial-ledger-ok.json');
  assert.equal(ok.code, 0, 'the same timed-out persona correctly contributing its partial ledger to findings.json (run_status timed-out is a valid F53 enum member) must pass the gate (negative control)');
});

test('F132 F133 F134 CR2-8: persona start_ts/end_ts intervals must show real wall-clock overlap, ruling out a sequential loop', () => {
  // Requirement ID: F132, F133, F134 (challenge round 2 MAJOR-4 — F30/F31 mandatory parallel
  // execution had zero acceptance-test coverage, and N5's own budget derivation assumed SERIAL
  // execution, contradicting the CRITICAL execution-model requirement it's meant to bound).
  const overlap = gate('persona-concurrency-overlap-ok.json');
  assert.equal(overlap.code, 0, 'persona subagents whose recorded start_ts/end_ts intervals overlap pass the gate — real parallel execution, not one shared sequential loop (F30/F31 mechanical proxy)');
  const sequential = gate('persona-concurrency-sequential-bad.json');
  assert.notEqual(sequential.code, 0, 'persona subagents whose intervals never overlap (each starts strictly after the previous ends) must fail the gate — this is exactly the "single sequential loop reusing one shared browser context" shape the F30/F31 headline architecture claim forbids (F134)');
});

test('F173 F174 F175 CR4-S1: the findings schema run_status enum admits every terminal state the orchestrator can set', () => {
  // Requirement ID: F173, F174, F175 (challenge round 4 — these run_status values were tagged
  // CRITICAL when the total abort->status mapping was closed, but no test referenced them, so a
  // builder could ship a run_status enum missing crashed/timed-out/patience-exhausted and a
  // crashed persona would be unrepresentable — silently mislabeled or schema-invalid).
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  const persona = s.$defs?.persona_entry ?? s.definitions?.persona_entry ?? finding;
  const runStatus = (persona?.properties?.run_status?.enum) ?? (s.$defs?.run_status?.enum) ?? [];
  assert.ok(runStatus.includes('crashed'), 'run_status enum must admit "crashed" for an unrecoverable subagent failure (F173)');
  assert.ok(runStatus.includes('timed-out'), 'run_status enum must admit "timed-out" for a wallclock-terminated subagent (F174)');
  assert.ok(runStatus.includes('patience-exhausted'), 'run_status enum must admit "patience-exhausted" for a patience-threshold abandonment (F175)');
});

test('F166 CR4-M4: the evidence gate redacts an HTTP cookie header captured in a screenshot sidecar, without redacting ordinary cookie-word prose', () => {
  // Requirement ID: F166 (challenge round 4 — cookie-header redaction for screenshot captured_text
  // was CRITICAL but untested; a builder could ship no cookie redaction and leak Set-Cookie session
  // tokens into committed evidence, or over-redact any text containing the word "cookie").
  const leak = gate('evidence-cookie-leak.json');
  assert.notEqual(leak.code, 0, 'a screenshot captured_text sidecar containing a raw "Set-Cookie: sid=..." header must fail the gate as an un-redacted leak (F166)');
  const ordinary = gate('evidence-not-secret-ordinary-cookie-text-ok.json');
  assert.equal(ordinary.code, 0, 'ordinary prose mentioning the word "cookie" (no header pattern) must pass — the redaction is shape-qualified, not keyword-blunt (negative control)');
});

test('F170 CR4-M8: personas_flagging is the sole input to convergence_tier, gate-enforced', () => {
  // Requirement ID: F170 (challenge round 4 — convergence_tier's derivation was asserted in D12
  // prose but nothing forced tier == count(personas_flagging), so a builder could compute the tier
  // any inconsistent way and still pass; findings-bad-tier.json has tier=3 with 2 flagging personas).
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding.required.includes('personas_flagging'), 'every finding must carry personas_flagging (F170)');
  const bad = gate('findings-bad-tier.json');
  assert.notEqual(bad.code, 0, 'convergence_tier that does not equal the length of personas_flagging must fail the gate (F170/F17)');
  const ok = gate('findings-valid.json');
  assert.equal(ok.code, 0, 'the valid fixture whose tier equals |personas_flagging| passes (negative control)');
});
