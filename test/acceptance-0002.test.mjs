// RED acceptance test — ux-gauntlet SPEC 0002 (spec: docs/specs/0002-structural-ui-lane.spec.md)
// ATDD lock for the DETERMINISTIC structural UI-quality lane. References every [CRITICAL]
// requirement ID with non-constant behavioral assertions. MUST fail until the lane, its schema
// (schemas/structural-findings.schema.json), gate (scripts/structural-report-gate.mjs), renderer
// (scripts/structural-render-report.mjs), and CI gate (scripts/structural-ci-diff.mjs) are built.
// Composes with — never fuses into — the SPEC 0001 persona lane (test/acceptance.test.mjs).
//
// CHALLENGE-ROUND-1 hardening: every "-bad.json" fixture is now asserted to drive a NON-ZERO exit
// code (B6/B7/M13) — not merely a stdout keyword match — so a no-op gate that prints a static banner
// and always exit(0) can no longer pass the suite. The S17 severity fault-line is split (axe impact
// vs the S35 fixed DOM-check table vs the S36 incomplete-precedence rule), the CI gate is composed
// AFTER the report gate (S37 refusal / S38 non-axe sev-4 / S46 axe-execution-failed), and the
// cross-lane join is exercised on the real field name target_element_identifier (B4).
// Run: node --test test/acceptance-0002.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

// Runs a script, returns {code, stderr, stdout}. Never throws (a missing script yields code 1).
function run(args) {
  try {
    const stdout = execFileSync('node', args, { stdio: 'pipe' }).toString();
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}
const sgate = (fixture) => run(['scripts/structural-report-gate.mjs', '--check-fixture', `test/fixtures/${fixture}`]);
const srender = (fixture) => run(['scripts/structural-render-report.mjs', `test/fixtures/${fixture}`]);
const sci = (fixture) => run(['scripts/structural-ci-diff.mjs', '--check', `test/fixtures/${fixture}`]);
const out = (r) => r.stderr + r.stdout;

const RULESET_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'];
const AXE_PIN = '4.12.1';

test('S1 S2 S3 S28: structural findings schema exists and its metadata pins axe-core 4.12.1 + the 5 ruleset tags', () => {
  // Requirement ID: S1, S2, S3, S28
  assert.ok(existsSync('schemas/structural-findings.schema.json'), 'schemas/structural-findings.schema.json missing — the structural lane (S1) has no output contract without it');
  const s = json('schemas/structural-findings.schema.json'); // RED: file not built yet
  const schemaStr = JSON.stringify(s);
  assert.match(schemaStr, /metadata/i, 'schema must define a report metadata object (S28)');
  assert.match(schemaStr, /axe[_-]?version/i, 'metadata must carry an axe-core version field (S2)');
  assert.match(schemaStr, new RegExp(AXE_PIN.replace(/\./g, '\\.')), 'metadata must pin axe-core exactly 4.12.1 (S2)');
  for (const tag of RULESET_TAGS) {
    assert.match(schemaStr, new RegExp(tag), `ruleset tag "${tag}" must be declared in the schema metadata (S3)`);
  }
});

test('S4 S16: name-role-value is checked for every interactive component, incl. custom-widget ARIA state', () => {
  // Requirement ID: S4, S16 — name+role always, value only where user-settable (brief §2a caveat)
  const unnamed = sgate('structural-button-no-name-bad.json');
  assert.match(out(unnamed), /button-name|name.?role|accessible name/i, 'the gate names the missing-accessible-name rule for an unnamed control (S4)');
  assert.notEqual(unnamed.code, 0, 'an unnamed interactive control must fail the gate with a non-zero exit, not just print a keyword (S4)');
  const badAria = sgate('structural-widget-invalid-aria-state-bad.json');
  assert.match(out(badAria), /aria-|expanded|widget state/i, 'the gate names the invalid custom-widget ARIA-state rule (S16)');
  assert.notEqual(badAria.code, 0, 'an invalid custom-widget ARIA state must fail the gate with a non-zero exit (S16)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report where every interactive component exposes name+role passes the gate (negative control, S4/S16)');
});

test('S5: contrast is checked at 4.5:1 / 3:1 with no rounding (4.499:1 fails)', () => {
  // Requirement ID: S5
  const failing = sgate('structural-contrast-4499-bad.json');
  assert.match(out(failing), /contrast|4\.5:1|ratio/i, 'the gate names the color-contrast rule for a 4.499:1 body-text ratio (S5)');
  assert.notEqual(failing.code, 0, 'a 4.499:1 body-text ratio must fail the gate with a non-zero exit — no rounding leniency (S5)');
  const ok = sgate('structural-contrast-pass-ok.json');
  assert.equal(ok.code, 0, 'a report whose text clears the 4.5:1 / 3:1 thresholds passes the gate (negative control, S5)');
});

test('S6: form inputs are checked for a programmatic label', () => {
  // Requirement ID: S6
  const unlabeled = sgate('structural-input-no-label-bad.json');
  assert.match(out(unlabeled), /label|input.?name/i, 'the gate names the form-label rule for an unlabeled input (S6)');
  assert.notEqual(unlabeled.code, 0, 'an unlabeled form input must fail the gate with a non-zero exit (S6)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report whose inputs all carry a programmatic label passes the gate (negative control, S6)');
});

test('S7 S14: exactly-one-main is enforced; a main count != 1 makes the containment check fail closed', () => {
  // Requirement ID: S7, S14
  const twoMain = sgate('structural-two-main-landmarks-bad.json');
  assert.match(out(twoMain), /cannot-evaluate-ambiguous-main|ambiguous|one main|landmark-one-main/i, 'a page with 2 main landmarks makes containment fail closed as cannot-evaluate-ambiguous-main, never a false pass (S7/S14)');
  assert.notEqual(twoMain.code, 0, 'an ambiguous-main page must fail the gate closed with a non-zero exit, never a silent false pass (S7/S14)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a page exposing exactly one main landmark passes the gate (negative control, S7/S14)');
});

test('S12: the operator-declared expected-main-content anchor is verified found + inside main + prominent by bounding-box area', () => {
  // Requirement ID: S12 — prominence is rendered bounding-box area (width*height), not character count (CR1-M4)
  const notInMain = sgate('structural-main-content-not-in-main-bad.json');
  assert.match(out(notInMain), /main.?content|inside main|prominent|largest|bounding/i, 'the gate names the expected-main-content containment rule (found, inside main, largest visible block by area) (S12)');
  assert.notEqual(notInMain.code, 0, 'a declared main content sitting outside the single main landmark must fail the gate with a non-zero exit (S12)');
  const ok = sgate('structural-main-content-contained-ok.json');
  assert.equal(ok.code, 0, 'a declared main content found inside the single main landmark and the largest visible block by area passes the gate (negative control, S12)');
});

test('S13: the lane refuses a gated result when no expected-main-content selector is supplied', () => {
  // Requirement ID: S13 — mirrors SPEC 0001 happy-path refusal-to-start (D2). This fixture encodes a
  // TOTALLY absent selector (S13's run-level refusal), NOT the S39/S40 per-route "map exists, this
  // route missing" case — that case has its own dedicated test below (CR2-M23).
  const missing = sgate('structural-no-expected-main-content-bad.json');
  assert.match(out(missing), /expected[- ]main[- ]content|declared.*selector|operator-declared|refus/i, 'the gate refuses and names the missing operator-declared expected-main-content selector (S13)');
  assert.notEqual(missing.code, 0, 'a missing expected-main-content selector must produce a distinguishable refusal — a non-zero exit, not a silent gated pass (S13/M13)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report that declares an expected-main-content selector passes the gate (negative control, S13)');
});

test('S17 S18 S19: axe-violation severity is a pure function of axe impact; incomplete surfaces at 0; zero LLM judgment', () => {
  // Requirement ID: S17, S18, S19 — S17 is scoped to axe VIOLATION results only (CR1-B1/B3/M10)
  assert.ok(existsSync('schemas/structural-findings.schema.json'), 'schemas/structural-findings.schema.json missing (S22)');
  const s = json('schemas/structural-findings.schema.json'); // RED: not built
  const finding = s.$defs?.finding ?? s.definitions?.finding ?? s.properties?.findings?.items;
  assert.ok(finding, 'schema must define a finding object with a bounded severity (S17)');
  assert.deepEqual([finding.properties.severity.minimum, finding.properties.severity.maximum], [0, 4], 'severity is bounded 0-4 (S17)');
  // impact->severity must be a pure mapping for axe violations: a severity contradicting axe impact fails.
  const wrongMap = sgate('structural-severity-not-impact-mapped-bad.json');
  assert.match(out(wrongMap), /impact|severity/i, 'an axe-violation severity that is not the pure critical=4/serious=3/moderate=2/minor=1 mapping of axe impact fails the gate (S17/S19)');
  assert.notEqual(wrongMap.code, 0, 'a severity contradicting axe impact must fail the gate with a non-zero exit (S17/S19)');
  const incompleteDropped = sgate('structural-incomplete-dropped-bad.json');
  assert.match(out(incompleteDropped), /incomplete|manual.?review|severity 0/i, 'an axe incomplete result reported as a pass or dropped fails the gate — it must surface at severity 0 (S18)');
  assert.notEqual(incompleteDropped.code, 0, 'an incomplete result reported as a pass or dropped must fail the gate with a non-zero exit (S18)');
  const ok = sgate('structural-incomplete-surfaced-ok.json');
  assert.equal(ok.code, 0, 'a report surfacing every incomplete result as a severity-0 needs-manual-review entry passes the gate (negative control, S18)');
});

test('S35 (B25): every one of the 9 non-axe finding codes is behaviorally locked to its pinned severity', () => {
  // Requirement ID: S35 (CR1-B1/B3, CR2-B25) — a fixture per code with severity one BELOW its pinned
  // value; each must fail the gate and name that specific code, so no code can be silently inverted
  // (esp. continue-control-missing escaping the S38 sev-4 CI block). Plus one all-correct neg control.
  const S35 = [
    ['main-content-missing', 4], ['continue-control-missing', 4], ['main-content-not-in-main', 3],
    ['cannot-evaluate-ambiguous-main', 3], ['continue-not-semantic', 3], ['continue-not-focusable', 3],
    ['main-content-not-prominent', 2], ['unlabeled-landmark-section', 2], ['positive-tabindex', 1],
  ];
  for (const [code, pinned] of S35) {
    const r = sgate(`structural-dom-sev-${code}-bad.json`);
    assert.match(out(r), new RegExp(code.replace(/[-]/g, '[-]') + '|severity|pinned|table', 'i'),
      `the gate names ${code} (pinned severity ${pinned}) when it carries the wrong severity ${pinned - 1} (S35)`);
    assert.notEqual(r.code, 0, `${code} at severity ${pinned - 1} instead of its pinned ${pinned} must fail the gate with a non-zero exit (S35/B25)`);
  }
  const ok = sgate('structural-dom-check-all-severities-ok.json');
  assert.equal(ok.code, 0, 'a report carrying all 9 codes at their correct pinned severities passes the gate (negative control, S35/B25)');
});

test('S36: an axe incomplete-derived finding is always severity 0, taking precedence over any impact on the entry', () => {
  // Requirement ID: S36 (CR1-M10) — incomplete precedence over a critical impact value.
  const mapped4 = sgate('structural-incomplete-impact-critical-mapped4-bad.json');
  assert.match(out(mapped4), /incomplete|severity 0|precedence|manual.?review/i, 'the gate names the incomplete-precedence rule when an incomplete entry is scored from its critical impact instead of 0 (S36)');
  assert.notEqual(mapped4.code, 0, 'an incomplete entry mapped to severity 4 from its impact (instead of the pinned 0) must fail the gate with a non-zero exit (S36)');
  const ok = sgate('structural-incomplete-impact-critical-severity0-ok.json');
  assert.equal(ok.code, 0, 'an incomplete entry carrying impact critical but severity 0 passes the gate — severity 0 takes precedence (negative control, S36)');
});

test('S21: identical DOM + pinned axe-core 4.12.1 + identical config yields a byte-identical finding-id set', () => {
  // Requirement ID: S21 — spans axe violations + axe incomplete results, post-settle (CR1-M2/M11)
  const drift = sgate('structural-determinism-drift-bad.json');
  assert.match(out(drift), /determinism|finding-id|violation-id|identical/i, 'the gate names the determinism invariant when two same-input runs report divergent finding-id sets (S21)');
  assert.notEqual(drift.code, 0, 'two same-input runs recording divergent finding-id sets must fail the gate with a non-zero exit (S21)');
  const ok = sgate('structural-determinism-stable-ok.json');
  assert.equal(ok.code, 0, 'two same-input runs recording an identical finding-id set pass the gate (negative control, S21)');
});

test('S42: the non-axe custom-check finding-id set is byte-identical across same-input runs', () => {
  // Requirement ID: S42 (CR1-M7) — the non-axe axis of the determinism invariant.
  const drift = sgate('structural-nonaxe-determinism-drift-bad.json');
  assert.match(out(drift), /determinism|finding-id|non-axe|identical/i, 'the gate names the non-axe determinism invariant when the custom-check finding-id set drifts between runs (S42)');
  assert.notEqual(drift.code, 0, 'a drifting non-axe custom-check finding-id set must fail the gate with a non-zero exit (S42)');
  const ok = sgate('structural-determinism-stable-ok.json');
  assert.equal(ok.code, 0, 'a stable non-axe finding-id set passes the gate (negative control, S42)');
});

test('S22 S23: findings carry a mandatory lane="structural" discriminator and never merge into a blended score', () => {
  // Requirement ID: S22, S23 (D6)
  assert.ok(existsSync('schemas/structural-findings.schema.json'), 'schemas/structural-findings.schema.json missing (S22)');
  const s = json('schemas/structural-findings.schema.json'); // RED: not built
  const finding = s.$defs?.finding ?? s.definitions?.finding ?? s.properties?.findings?.items;
  assert.ok(finding, 'schema must define a finding object (S22)');
  assert.ok(Array.isArray(finding.required) && finding.required.includes('lane'), 'every finding requires a lane field (S22)');
  assert.match(JSON.stringify(finding), /"structural"/, 'the lane field is constrained to the const string "structural" (S22)');
  const blended = sgate('structural-blended-with-persona-score-bad.json');
  assert.match(out(blended), /separate|blend|lane|persona/i, 'the gate rejects a file that fuses structural + persona findings into one blended score (S23)');
  assert.notEqual(blended.code, 0, 'a file fusing structural + persona findings into one blended score must fail the gate with a non-zero exit (S23)');
});

test('M9 (S22 D6): structural + persona schemas are one family — identical top-level required + shared min finding props', () => {
  // Requirement ID: S22 — locks D6 "one CI gate handles both" as a real cross-schema correspondence.
  assert.ok(existsSync('schemas/structural-findings.schema.json'), 'schemas/structural-findings.schema.json missing (S22/D6)');
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json (SPEC 0001) missing');
  const st = json('schemas/structural-findings.schema.json'); // RED: not built
  const pe = json('schemas/findings.schema.json');
  assert.deepEqual([...st.required].sort(), [...pe.required, 'lane'].sort(), 'structural adds a mandatory top-level lane discriminator to the shared 0001 family required set (D6/B5 — a clean zero-findings bundle still carries lane where per-finding markers are absent)');
  const stF = st.$defs?.finding ?? st.definitions?.finding ?? st.properties?.findings?.items;
  const peF = pe.$defs?.finding ?? pe.definitions?.finding ?? pe.properties?.findings?.items;
  for (const prop of ['severity', 'finding_id']) {
    assert.ok(stF.properties[prop], `structural finding must carry the shared property ${prop} (D6)`);
    assert.ok(peF.properties[prop], `persona finding must carry the shared property ${prop} (D6)`);
  }
  assert.deepEqual(
    [stF.properties.severity.minimum, stF.properties.severity.maximum],
    [peF.properties.severity.minimum, peF.properties.severity.maximum],
    'severity bounds must match across the two schemas (D6)',
  );
});

test('B4 (S24 D6): a structural finding cross-references a persona finding by target_element_identifier + run.route', () => {
  // Requirement ID: S24 — the join key is the field that ACTUALLY exists in the 0001 schema (CR1-B4).
  assert.ok(existsSync('schemas/structural-findings.schema.json'), 'schemas/structural-findings.schema.json missing (S24) — gate the join behind the built contract so this stays RED');
  const structural = json('test/fixtures/structural-join-0002.json');
  const persona = json('test/fixtures/join-persona-0001.json');
  const key = (f, route) => `${route}::${f.target_element_identifier}`;
  const personaKeys = new Set(persona.findings.map((f) => key(f, persona.run.route)));
  const matches = structural.findings.filter((f) => personaKeys.has(key(f, structural.run.route)));
  assert.equal(matches.length, 1, 'exactly one structural finding joins a persona finding on shared target_element_identifier + run.route (S24)');
  assert.equal(matches[0].target_element_identifier, 'button#buy', 'the join is on the real target_element_identifier field, never the non-existent target_element (B4)');
});

test('S25 S26 S27 S29: every report prints the validity envelope with vendor-reported caveats on BOTH figures', () => {
  // Requirement ID: S25 (also S26, S27, S29) — both figures vendor-reported + not independently audited (CR1-M6)
  const valid = srender('structural-valid.json'); // RED: renderer not built -> code 1, stdout ''
  const md = valid.stdout;
  assert.equal(valid.code, 0, 'the renderer exits 0 on a valid report — proving the positive case actually rendered, not a no-op (S25/M21)');
  assert.match(md, /16 of 50|32\s*percent|32%/i, 'the envelope states the ~32% / 16-of-50 criteria-count automation ceiling (S25)');
  assert.match(md, /issue-volume|57/i, 'the envelope states the ~57% issue-volume figure (S25)');
  assert.match(md, /vendor-reported/i, 'the envelope labels the figures vendor-reported by Deque (S25/M6)');
  assert.match(md, /not independently audited/i, 'the envelope states the figures are not independently audited (S25/M6)');
  assert.match(md, /not usable|not good ui/i, 'the envelope states a structural pass is not usable and not good UI (S25)');
  assert.match(md, /focus order/i, 'the envelope names focus order among the non-automatable classes (S26)');
  assert.match(md, /focus visible/i, 'the envelope names focus visible among the non-automatable classes (S26/M6)');
  assert.match(md, /keyboard operability/i, 'the envelope names keyboard operability among the non-automatable classes (S26/M6)');
  assert.match(md, /best-practice/i, 'the envelope labels heading-order as best-practice, not a WCAG failure (S27)');
  assert.doesNotMatch(md, /DOM-order finding/i, 'the envelope no longer references DOM-order findings — that check is a cut MVP non-goal (S27/Mi2)');
  assert.match(md, /not a wcag conformance certification/i, 'the report disclaims WCAG conformance certification (S29)');
  // M21: a SECOND differential fixture (stripped envelope + wrong axe version) must produce a
  // different/refused output — a renderer that ignores argv and prints a constant banner cannot pass both.
  const diff = srender('structural-envelope-stripped-bad.json');
  assert.notEqual(diff.stdout.trim() + String(diff.code), md.trim() + '0',
    'a stripped-envelope / wrong-axe-version report renders differently or is refused — the renderer reads its input, it does not emit a constant banner (S25/M21)');
});

test('S30 S37 S38 S46: the CI gate blocks on critical impact, on a refused run, on non-axe sev-4, and on axe-execution-failed', () => {
  // Requirement ID: S30 (D1), S37 (refusal composition, CR1-B2), S38 (non-axe sev-4, CR1-B3), S46 (axe failed, CR1-B5)
  const critical = sci('structural-critical-impact-violation.json');
  assert.match(out(critical), /critical.?impact|blocked|merge/i, 'the CI gate names the critical-impact block rule (S30)');
  assert.notEqual(critical.code, 0, 'the CI gate exits non-zero on a critical-impact violation to actually block the merge (S30/B7)');
  // S37: a run-level refused status must block CI even though the file has zero axe critical-impact violations.
  const refused = sci('structural-refused-run-status-bad.json');
  assert.notEqual(refused.code, 0, 'the CI gate exits non-zero on a run-level refused status, independent of the critical-impact predicate (S37/B2)');
  // S38: the only severity-4 finding is a non-axe DOM check; CI must still block.
  const nonAxeSev4 = sci('structural-nonaxe-severity4-only.json');
  assert.notEqual(nonAxeSev4.code, 0, 'the CI gate exits non-zero on a non-axe severity-4 finding, independent of the axe critical-impact predicate (S38/B3)');
  // S46: a route where axe failed to complete must block CI (never a silent zero-violations pass, S45).
  const axeFailed = sci('structural-axe-execution-failed-bad.json');
  assert.notEqual(axeFailed.code, 0, 'the CI gate exits non-zero when a route recorded run_status axe-execution-failed (S45/S46/B5)');
  // S56 (CR3-1): cannot-evaluate-ambiguous-main is a fail-closed severity-3 code that MUST block CI
  // even though it is not severity 4 and not a run_status — closing the CR3-B1 inversion where an
  // advisory sev-3 ambiguous-main merged clean while a narrower sev-4 defect blocked.
  const ambiguousMain = sci('structural-ambiguous-main-suppresses-s12-bad.json');
  assert.notEqual(ambiguousMain.code, 0, 'the CI gate exits non-zero on a cannot-evaluate-ambiguous-main finding — the fail-closed containment result blocks the merge despite its pinned severity 3 (S56/CR3-1)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a genuinely clean, completed run with zero violations passes the CI gate (negative control, S30/S46/S56)');
});

test('S45: the lane records run_status axe-execution-failed rather than a silent clean pass for an untested route', () => {
  // Requirement ID: S45 (CR1-B5) — fail-closed when axe.run() itself throws.
  const failed = sgate('structural-axe-execution-failed-bad.json');
  assert.match(out(failed), /axe-execution-failed|execution.?failed|never tested|not.*complete/i, 'the gate names the axe-execution-failed run_status (S45)');
  assert.notEqual(failed.code, 0, 'a route whose axe run failed to complete must fail the gate with a non-zero exit, never advisory-pass as zero-violations clean (S45)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a completed run passes the gate (negative control, S45)');
});

// ---- HIGH / MEDIUM coverage (not required by the ATDD critical-id audit, but locks the wider contract) ----

test('S9 S11 S15: landmark validity (8 ARIA types), positive-tabindex anti-pattern, interactive affordance', () => {
  // Requirement ID: S9, S11, S15
  const badLandmark = sgate('structural-unlabeled-section-bad.json');
  assert.match(out(badLandmark), /landmark|section|coverage gap/i, 'an unlabeled section is flagged as a coverage gap, not skipped (S9)');
  assert.notEqual(badLandmark.code, 0, 'an unlabeled landmark section must fail the gate with a non-zero exit (S9)');
  const posTab = sgate('structural-positive-tabindex-bad.json');
  assert.match(out(posTab), /tabindex/i, 'a positive tabindex is flagged as an anti-pattern (S11)');
  assert.notEqual(posTab.code, 0, 'a positive tabindex must fail the gate with a non-zero exit (S11)');
  const badControl = sgate('structural-continue-not-semantic-bad.json');
  assert.match(out(badControl), /semantic|affordance|focusable|accessible name/i, 'a non-semantic continue control is flagged (S15)');
  assert.notEqual(badControl.code, 0, 'a non-semantic continue control must fail the gate with a non-zero exit (S15)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a valid landmark/tabindex/affordance report passes (negative control, S9/S11/S15)');
});

test('S41 (M3, CR2-M22): two non-axe findings sharing a finding code + selector are deduplicated', () => {
  // Requirement ID: S41 (CR1-M3, CR2-M22) — the old assertion was `typeof code === 'number'`, a
  // tautology true whether the gate dedups, emits duplicates, or throws. Replaced with a real
  // behavioral pair: an undeduplicated file fails; a correctly collapsed file passes.
  const dupe = sgate('structural-nonaxe-dup-code-bad.json');
  assert.match(out(dupe), /dedup|duplicate|positive-tabindex|finding code|selector/i, 'the gate names the non-axe dedup rule when two findings share code + selector (S41)');
  assert.notEqual(dupe.code, 0, 'two undeduplicated non-axe findings sharing code + target-element selector must fail the gate with a non-zero exit (S41/M22)');
  const ok = sgate('structural-nonaxe-dup-collapsed-ok.json');
  assert.equal(ok.code, 0, 'the same defect correctly collapsed to a single non-axe finding passes the gate (negative control, S41/M22)');
});

test('M14 (S2 S3 S22): schema-lock is enforced at runtime — wrong axe version / wrong lane value are rejected by the gate', () => {
  // Requirement ID: S2, S3, S22 — behavioral negative controls, not schema-text regex (CR1-M14).
  const wrongVer = sgate('structural-wrong-axe-version-bad.json');
  assert.match(out(wrongVer), /axe.?version|4\.12\.1|9\.9\.9|version/i, 'the gate names the pinned-axe-version rule for a wrong axe_version (S2)');
  assert.notEqual(wrongVer.code, 0, 'a report whose metadata axe_version is not the pinned 4.12.1 must fail the gate with a non-zero exit (S2)');
  const wrongLane = sgate('structural-wrong-lane-value-bad.json');
  assert.match(out(wrongLane), /lane|structural|persona/i, 'the gate names the lane discriminator rule for a wrong lane value (S22)');
  assert.notEqual(wrongLane.code, 0, 'a report whose lane discriminator is not "structural" must fail the gate with a non-zero exit (S22)');
});

test('M8 (S3): the ruleset tag set is derived from the configurable WCAG target, not hardcoded', () => {
  // Requirement ID: S3, S31 — a non-default target must change the reported tags (CR1-M8).
  const badTags = sgate('structural-nondefault-target-tags-bad.json');
  assert.match(out(badTags), /target|tag|wcag/i, 'the gate names the target-derived ruleset rule when tags do not match the declared non-default target (S3/S31)');
  assert.notEqual(badTags.code, 0, 'a report whose ruleset_tags are inconsistent with its declared wcag_target must fail the gate with a non-zero exit (S3/S31)');
});

test('S31 S32 S43 SN2 SN7: WCAG target is pluggable (default AA); axe + browser version bumps need a decision record; schema_version + browser version are enforced', () => {
  // Requirement ID: S31, S32, SN2, S43, SN7
  assert.ok(existsSync('config/wcag-target.default.json'), 'config/wcag-target.default.json missing — the WCAG target must be pluggable data defaulting to AA (S31)');
  const cfg = json('config/wcag-target.default.json'); // RED: not built
  assert.equal(String(cfg.target ?? cfg.level).toUpperCase(), 'AA', 'the default WCAG target level is AA (S31)');
  const s = json('schemas/structural-findings.schema.json');
  assert.match(JSON.stringify(s), /schema_version/i, 'the versioned schema carries a schema_version field the gate checks (SN2)');
  // Mi6: the ADR must have real governing content, not a one-line placeholder.
  assert.ok(existsSync('docs/adr/0005-axe-core-version-pin.md'), 'a decision record governing axe-core version bumps must exist (S32)');
  const adr = read('docs/adr/0005-axe-core-version-pin.md');
  assert.match(adr, /Status:\s*(proposed|accepted)/i, 'the axe-core version-pin ADR carries a Status: proposed|accepted line (S32/Mi6)');
  assert.match(adr, new RegExp(AXE_PIN.replace(/\./g, '\\.')), 'the ADR names the exact pinned axe-core version 4.12.1, cross-checked against the scan dependency (S32/Mi6)');
  assert.match(adr, /playwright|browser|chromium/i, 'the version-pin governance also covers the pinned Playwright browser binary (S43/SN7)');
  // SN7: report metadata must carry the pinned browser binary version.
  const noBrowser = sgate('structural-browser-version-missing-bad.json');
  assert.notEqual(noBrowser.code, 0, 'a report whose metadata omits the pinned Playwright browser binary version must fail the gate with a non-zero exit (SN7)');
});

test('Mi4 (SN2): the gate rejects a missing / wrong schema_version at runtime, not just in the schema document', () => {
  // Requirement ID: SN2 — behavioral pair, not a schema-text assertion (CR1-Mi4).
  const noVer = sgate('structural-schema-version-missing-bad.json');
  assert.match(out(noVer), /schema.?version|version/i, 'the gate names the schema_version rule for a file missing schema_version (SN2)');
  assert.notEqual(noVer.code, 0, 'a findings file with no schema_version must be rejected by the gate with a non-zero exit (SN2)');
  const wrongVer = sgate('structural-schema-version-wrong-bad.json');
  assert.match(out(wrongVer), /schema.?version|version|unsupported/i, 'the gate names the schema_version rule for an unsupported schema_version (SN2)');
  assert.notEqual(wrongVer.code, 0, 'a findings file with an unsupported schema_version must be rejected by the gate with a non-zero exit (SN2)');
});

test('S44 (Mi5, CR2-M7/M19): CI comparison refuses on axe_version, browser_version, OR ruleset_tags drift', () => {
  // Requirement ID: S44 (CR1-Mi5, CR2-M7/M19) — the guard now covers all three comparability-breaking
  // dimensions, not just axe_version: browser_version (glyph shaping / contrast) and ruleset_tags
  // (which rules ran) each change findings independent of axe_version.
  const badAxe = sci('structural-ci-incomparable-axe-version-bad.json');
  assert.match(out(badAxe), /axe.?version|comparab|refus|incomparable|version/i, 'the CI gate names the axe_version comparability rule when two reports differ (S44)');
  assert.notEqual(badAxe.code, 0, 'a CI comparison across two differing axe_version reports must refuse with a non-zero exit (S44)');
  const badBrowser = sci('structural-ci-incomparable-browser-version-bad.json');
  assert.match(out(badBrowser), /browser.?version|comparab|refus|incomparable/i, 'the CI gate names the browser_version comparability rule when axe_version matches but browser_version differs (S44/M7/M19)');
  assert.notEqual(badBrowser.code, 0, 'a CI comparison whose reports share axe_version but differ in browser_version must refuse with a non-zero exit (S44/M19)');
  const badTags = sci('structural-ci-incomparable-ruleset-tags-bad.json');
  assert.match(out(badTags), /ruleset.?tags|tag|comparab|refus|incomparable/i, 'the CI gate names the ruleset_tags comparability rule when axe_version matches but ruleset_tags differ (S44/M19)');
  assert.notEqual(badTags.code, 0, 'a CI comparison whose reports share axe_version but differ in ruleset_tags must refuse with a non-zero exit (S44/M19)');
  // CR3-M4: render_environment_id (OS/font-rendering stack) is the fourth comparability-breaking
  // dimension — SN8/D5b scope S42's determinism guarantee to matching render_environment_id.
  const badEnv = sci('structural-ci-incomparable-render-environment-bad.json');
  assert.match(out(badEnv), /render.?environment|environment.?id|comparab|refus|incomparable/i, 'the CI gate names the render_environment_id comparability rule when axe_version matches but render_environment_id differs (S44/CR3-M4)');
  assert.notEqual(badEnv.code, 0, 'a CI comparison whose reports share axe_version but differ in render_environment_id must refuse with a non-zero exit (S44/CR3-M4)');
});

test('CR3-M15 (SN8): render_environment_id is load-bearing for S42 — a report omitting it is rejected by the gate', () => {
  // Requirement ID: SN8 — SN8/D5b scope S42's cross-machine determinism guarantee to a matching
  // render_environment_id; a lane that never emits it silently voids that scoping condition, so the
  // gate must reject a findings file whose metadata omits render_environment_id.
  const missing = sgate('structural-render-environment-id-missing-bad.json');
  assert.match(out(missing), /render.?environment|environment.?id|SN8/i, 'the gate names the render_environment_id metadata rule when the field is absent (SN8/M15)');
  assert.notEqual(missing.code, 0, 'a report whose metadata omits render_environment_id must fail the gate with a non-zero exit (SN8/M15)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report carrying render_environment_id in metadata passes the gate (negative control, SN8/M15)');
});

// ==== CHALLENGE-ROUND-2 additions ====

test('S1 S47 (B4/B18/M24): the settle precondition is enforced — settle-timeout is recorded, never a silent clean pass', () => {
  // Requirement ID: S1, S47 (CR2-B4/B18/M24). S1's settle is now page-load + fonts.ready + a 500ms
  // MutationObserver quiescence window capped at 10s; a route whose settle never resolves records
  // run_status settle-timeout and metadata.settle_precondition_met=false, and must fail the gate.
  const notMet = sgate('structural-settle-precondition-not-met-bad.json');
  assert.match(out(notMet), /settle|precondition|timeout|quiescence|mutation/i, 'the gate names the settle-precondition rule when metadata.settle_precondition_met is false (S1/M24)');
  assert.notEqual(notMet.code, 0, 'a report whose settle precondition was not met (settle_precondition_met=false) must fail the gate with a non-zero exit (S1/M24)');
  const timedOut = sgate('structural-settle-timeout-bad.json');
  assert.match(out(timedOut), /settle-timeout|settle|timeout|never.*complete|not.*complete/i, 'the gate names the settle-timeout run_status (S47)');
  assert.notEqual(timedOut.code, 0, 'a route recording run_status settle-timeout must fail the gate with a non-zero exit, never a silent zero-violations clean pass (S47/B4)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report whose settle precondition completed passes the gate (negative control, S1/S47)');
});

test('S48 (B4): the CI gate blocks a merge whenever a route recorded run_status settle-timeout', () => {
  // Requirement ID: S48 (CR2-B4) — the CI-gate half of the never-resolving-settle fix.
  const timedOut = sci('structural-settle-timeout-bad.json');
  assert.match(out(timedOut), /settle-timeout|settle|timeout|blocked|merge/i, 'the CI gate names the settle-timeout block rule (S48)');
  assert.notEqual(timedOut.code, 0, 'the CI gate exits non-zero on a route whose run_status is settle-timeout, to actually block the merge (S48/B4)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a genuinely clean completed run still passes the CI gate (negative control, S48)');
});

test('S50 (B16): finding_id is a pure deterministic function — a timestamp/random-derived id is rejected', () => {
  // Requirement ID: S50 (CR2-B16) — finding_id excludes any timestamp/random/DOM-node-reference
  // component, so the byte-identical-set promise (S21/S42/SN1) cannot be satisfied by crypto.randomUUID luck.
  const nondet = sgate('structural-finding-id-nondeterministic-bad.json');
  assert.match(out(nondet), /finding.?id|determinist|timestamp|random|pure function/i, 'the gate names the deterministic finding_id derivation rule when an id embeds a timestamp/random component (S50)');
  assert.notEqual(nondet.code, 0, 'a finding_id embedding a run-timestamp or random value must fail the gate with a non-zero exit (S50/B16)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report whose finding_ids are pure route+rule+selector derivations passes the gate (negative control, S50)');
});

test('S51 (B16): the finding_id generator is invoked twice on one synthetic input and the two id-sets are set-equal', async () => {
  // Requirement ID: S51 (CR2-B16) — a LIVE double-invoke of the actual generation function, not just
  // a fixture comparator. RED until scripts/core/structural-identity.mjs exports computeFindingId.
  const mod = await import('../scripts/core/structural-identity.mjs'); // RED: module not built -> rejects
  const synthetic = [
    { route: '/signup', rule_id: 'button-name', selector: 'button.cta' },
    { route: '/signup', code: 'positive-tabindex', selector: 'button#next' },
  ];
  const gen = () => new Set(synthetic.map((f) => mod.computeFindingId(f)));
  const a = gen();
  const b = gen();
  assert.deepEqual([...a].sort(), [...b].sort(), 'two invocations of computeFindingId on the same synthetic input produce a set-equal finding-id set (S51)');
});

test('S52 (B17): the CI critical-impact predicate reads raw impact, never the derived severity integer', () => {
  // Requirement ID: S52 (CR2-B17) — impact:critical + severity:3 (mis-mapped) must still block CI.
  const mismapped = sci('structural-critical-impact-severity-mismapped-bad.json');
  assert.match(out(mismapped), /impact|critical|blocked|merge/i, 'the CI gate names the raw-impact critical-block rule when severity is mis-mapped below 4 (S52)');
  assert.notEqual(mismapped.code, 0, 'an axe finding with raw impact critical but a mis-mapped severity 3 must still block the CI merge — the predicate reads impact, not severity (S52/B17)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a clean report with no critical-impact finding passes the CI gate (negative control, S52)');
});

test('S53 (M2/D7): the CI gate blocks a critical-impact result that axe classified as incomplete', () => {
  // Requirement ID: S53 (CR2-M2, D7) — closes the incomplete-critical hole: severity is pinned to 0
  // for display (S18/S36) but CI reads the raw impact field, so a reproducible critical a11y gap that
  // lands in `incomplete` cannot pass CI clean forever.
  const incCrit = sci('structural-incomplete-critical-impact-bad.json');
  assert.match(out(incCrit), /incomplete|critical|impact|blocked|merge/i, 'the CI gate names the incomplete-critical-impact block rule (S53/D7)');
  assert.notEqual(incCrit.code, 0, 'an axe incomplete finding whose underlying impact is critical must block the CI merge, independent of its severity-0 display value (S53/M2)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a clean report with no critical incomplete finding passes the CI gate (negative control, S53)');
});

test('S54 S39 S40 (M3/M15/M23): a route missing from the expected-main-content map is refused, and CI blocks on it', () => {
  // Requirement ID: S54 (CR2-M3), S39/S40 (CR2-M15/M23) — the per-route "map exists, THIS route
  // missing" case, distinct from S13's total-emptiness. The gate refuses; the CI gate blocks.
  const partial = sgate('structural-partial-route-map-bad.json');
  assert.match(out(partial), /route|map|refus|expected[- ]main[- ]content|unmapped/i, 'the gate names the per-route S40 refusal when an audited route has no map entry (S39/S40)');
  assert.notEqual(partial.code, 0, 'an audited route with no expected-main-content map entry must produce a route-level refused result — a non-zero gate exit (S40/M23)');
  const partialCi = sci('structural-partial-route-map-bad.json');
  assert.notEqual(partialCi.code, 0, 'the CI gate exits non-zero on a route carrying the S40 route-level refused status, so a route can never go silently unaudited (S54/M3)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report whose every audited route has a map entry passes the gate (negative control, S39/S40/S54)');
});

test('Mn8 (S39): the route-to-selector map key is matched exactly — a trailing-slash mismatch is refused', () => {
  // Requirement ID: S39 (CR2-Mn8) — exact case-sensitive match vs the --path argument, no trailing-slash
  // or query-string normalization, so a spurious mismatch surfaces as a real S40 refusal (documented).
  const slash = sgate('structural-route-key-trailing-slash-bad.json');
  assert.match(out(slash), /route|map|refus|exact|trailing|slash/i, 'the gate names the exact route-key match rule when "/signup" does not match invocation "/signup/" (S39/Mn8)');
  assert.notEqual(slash.code, 0, 'a route whose map key does not exact-match the --path argument (trailing slash) must be refused with a non-zero exit under the pinned exact-match rule (S39/Mn8)');
});

test('Mn11 (S14 S12): ambiguous main (count != 1) suppresses the entire S12 evaluation — no main-content-missing emitted', () => {
  // Requirement ID: S14 (CR2-Mn11) — S14's fail-closed short-circuits S12; the joint fixture must
  // carry cannot-evaluate-ambiguous-main and MUST NOT also carry a main-content-missing finding.
  const joint = json('test/fixtures/structural-ambiguous-main-suppresses-s12-bad.json');
  const codes = joint.findings.map((f) => f.code);
  assert.ok(codes.includes('cannot-evaluate-ambiguous-main'), 'the ambiguous-main page emits cannot-evaluate-ambiguous-main (S14)');
  assert.ok(!codes.includes('main-content-missing'), 'S14 fail-closed suppresses the entire S12 evaluation — no main-content-missing (or other S12-derived) finding is emitted on an ambiguous-main page (S14/Mn11)');
  const gate = sgate('structural-ambiguous-main-suppresses-s12-bad.json');
  assert.match(out(gate), /ambiguous|cannot-evaluate-ambiguous-main|fail.?closed|suppress/i, 'the gate names the ambiguous-main fail-closed rule (S14)');
  assert.notEqual(gate.code, 0, 'an ambiguous-main page must fail the gate closed with a non-zero exit (S14/Mn11)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a page exposing exactly one main landmark passes the gate (negative control, S14/Mn11)');
});

test('S55 (M10/B8): the one live cross-namespace pair (landmark-one-main <-> cannot-evaluate-ambiguous-main) is not double-counted', () => {
  // Requirement ID: S55 (CR2-M10, CR3-2/B8) — the tabindex/positive-tabindex pair is DEAD CODE: S1
  // disables the axe tabindex rule (CR2-B13), so axe can never emit a tabindex finding for it to act
  // on. The sole live pair is the axe landmark-one-main rule vs the non-axe cannot-evaluate-ambiguous-
  // main check, both pinned to the :root selector: when both appear for :root, the non-axe finding is
  // emitted and the axe finding is suppressed (else one 0-or-2-main defect ships as two entries at two
  // severities). The fixture exercises the ACTUALLY-REACHABLE pairing, not the impossible tabindex one.
  const dup = sgate('structural-cross-namespace-landmark-bad.json');
  assert.match(out(dup), /cross-namespace|landmark-one-main|cannot-evaluate-ambiguous-main|suppress|equivalence|dedup/i, 'the gate names the cross-namespace equivalence rule when the axe landmark-one-main finding + its paired non-axe cannot-evaluate-ambiguous-main finding share the :root selector (S55)');
  assert.notEqual(dup.code, 0, 'a report emitting BOTH the axe landmark-one-main finding and the non-axe cannot-evaluate-ambiguous-main finding for the :root selector must fail the gate — the axe finding must be suppressed (S55/M10/B8)');
});

test('S49 S4 S15 (B9/B5): a role=button control sources its accessible name via aria-command-name / the accname engine', () => {
  // Requirement ID: S49 (CR2-B5/B9) — S4's closed list now includes aria-command-name so role-based
  // controls have a name source; S15/S49 pin axe.commons.text.accessibleText as the accname engine.
  const roleBtn = sgate('structural-role-button-no-name-bad.json');
  assert.match(out(roleBtn), /aria-command-name|accessible name|accname|button/i, 'the gate names the aria-command-name / accname rule for an unnamed role=button control (S49/B9)');
  assert.notEqual(roleBtn.code, 0, 'a role=button control exposing no accessible name must fail the gate with a non-zero exit (S49/S4/S15)');
});
