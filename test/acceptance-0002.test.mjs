// RED acceptance test — ux-gauntlet SPEC 0002 (spec: docs/specs/0002-structural-ui-lane.spec.md)
// ATDD lock for the DETERMINISTIC structural UI-quality lane. References every [CRITICAL]
// requirement ID (S1..S30) with non-constant behavioral assertions. MUST fail until the lane, its
// schema (schemas/structural-findings.schema.json), gate (scripts/structural-report-gate.mjs),
// renderer (scripts/structural-render-report.mjs), and CI diff (scripts/structural-ci-diff.mjs) are
// built. Composes with — never fuses into — the SPEC 0001 persona lane (test/acceptance.test.mjs).
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
  assert.match(unnamed.stderr + unnamed.stdout, /button-name|name.?role|accessible name/i, 'the gate names the missing-accessible-name rule for an unnamed control (S4)');
  const badAria = sgate('structural-widget-invalid-aria-state-bad.json');
  assert.match(badAria.stderr + badAria.stdout, /aria-|expanded|widget state/i, 'the gate names the invalid custom-widget ARIA-state rule (S16)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report where every interactive component exposes name+role passes the gate (negative control, S4/S16)');
});

test('S5: contrast is checked at 4.5:1 / 3:1 with no rounding (4.499:1 fails)', () => {
  // Requirement ID: S5
  const failing = sgate('structural-contrast-4499-bad.json');
  assert.match(failing.stderr + failing.stdout, /contrast|4\.5:1|ratio/i, 'the gate names the color-contrast rule for a 4.499:1 body-text ratio (S5)');
  const ok = sgate('structural-contrast-pass-ok.json');
  assert.equal(ok.code, 0, 'a report whose text clears the 4.5:1 / 3:1 thresholds passes the gate (negative control, S5)');
});

test('S6: form inputs are checked for a programmatic label', () => {
  // Requirement ID: S6
  const unlabeled = sgate('structural-input-no-label-bad.json');
  assert.match(unlabeled.stderr + unlabeled.stdout, /label|input.?name/i, 'the gate names the form-label rule for an unlabeled input (S6)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report whose inputs all carry a programmatic label passes the gate (negative control, S6)');
});

test('S7 S14: exactly-one-main is enforced; a main count != 1 makes the containment check fail closed', () => {
  // Requirement ID: S7, S14
  const twoMain = sgate('structural-two-main-landmarks-bad.json');
  assert.match(twoMain.stderr + twoMain.stdout, /cannot-evaluate-ambiguous-main|ambiguous|one main|landmark-one-main/i, 'a page with 2 main landmarks makes containment fail closed as cannot-evaluate-ambiguous-main, never a false pass (S7/S14)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a page exposing exactly one main landmark passes the gate (negative control, S7/S14)');
});

test('S12: the operator-declared expected-main-content anchor is verified found + inside main + prominent', () => {
  // Requirement ID: S12
  const notInMain = sgate('structural-main-content-not-in-main-bad.json');
  assert.match(notInMain.stderr + notInMain.stdout, /main.?content|inside main|prominent|largest/i, 'the gate names the expected-main-content containment rule (found, inside main, largest visible block) (S12)');
  const ok = sgate('structural-main-content-contained-ok.json');
  assert.equal(ok.code, 0, 'a declared main content found inside the single main landmark and the largest visible block passes the gate (negative control, S12)');
});

test('S13: the lane refuses a gated result when no expected-main-content selector is supplied', () => {
  // Requirement ID: S13 — mirrors SPEC 0001 happy-path refusal-to-start (D2)
  const missing = sgate('structural-no-expected-main-content-bad.json');
  assert.match(missing.stderr + missing.stdout, /expected[- ]main[- ]content|declared.*selector|operator-declared/i, 'the gate refuses and names the missing operator-declared expected-main-content selector (S13)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report that declares an expected-main-content selector passes the gate (negative control, S13)');
});

test('S17 S18 S19: severity is a pure function of axe impact; incomplete surfaces at 0; zero LLM judgment', () => {
  // Requirement ID: S17, S18, S19
  assert.ok(existsSync('schemas/structural-findings.schema.json'), 'schemas/structural-findings.schema.json missing (S22)');
  const s = json('schemas/structural-findings.schema.json'); // RED: not built
  const finding = s.$defs?.finding ?? s.definitions?.finding ?? s.properties?.findings?.items;
  assert.ok(finding, 'schema must define a finding object with a bounded severity (S17)');
  assert.deepEqual([finding.properties.severity.minimum, finding.properties.severity.maximum], [0, 4], 'severity is bounded 0-4, mapped purely from axe impact (S17)');
  // impact->severity must be a pure mapping: a finding whose severity contradicts axe impact fails.
  const wrongMap = sgate('structural-severity-not-impact-mapped-bad.json');
  assert.match(wrongMap.stderr + wrongMap.stdout, /impact|severity/i, 'a severity that is not the pure critical=4/serious=3/moderate=2/minor=1 mapping of axe impact fails the gate (S17/S19)');
  const incompleteDropped = sgate('structural-incomplete-dropped-bad.json');
  assert.match(incompleteDropped.stderr + incompleteDropped.stdout, /incomplete|manual.?review|severity 0/i, 'an axe incomplete result reported as a pass or dropped fails the gate — it must surface at severity 0 (S18)');
  const ok = sgate('structural-incomplete-surfaced-ok.json');
  assert.equal(ok.code, 0, 'a report surfacing every incomplete result as a severity-0 needs-manual-review entry passes the gate (negative control, S18)');
});

test('S21: identical DOM + pinned axe-core 4.12.1 + identical config yields a byte-identical violation-id set', () => {
  // Requirement ID: S21 — the lane's core reproducibility promise (brief §4)
  const drift = sgate('structural-determinism-drift-bad.json');
  assert.match(drift.stderr + drift.stdout, /determinism|violation-id|identical/i, 'the gate names the determinism invariant when two same-input runs report divergent violation-id sets (S21)');
  const ok = sgate('structural-determinism-stable-ok.json');
  assert.equal(ok.code, 0, 'two same-input runs recording an identical violation-id set pass the gate (negative control, S21)');
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
  assert.match(blended.stderr + blended.stdout, /separate|blend|lane|persona/i, 'the gate rejects a file that fuses structural + persona findings into one blended score (S23)');
});

test('S25: every report prints the validity envelope with the automation-ceiling figures', () => {
  // Requirement ID: S25 (also S26, S27, S29)
  const md = srender('structural-valid.json').stdout; // RED: renderer not built -> ''
  assert.match(md, /16 of 50|32\s*percent|32%/i, 'the envelope states the ~32% / 16-of-50 criteria-count automation ceiling (S25)');
  assert.match(md, /issue-volume|57/i, 'the envelope states the ~57% issue-volume vendor-reported figure (S25)');
  assert.match(md, /not usable|not good ui/i, 'the envelope states a structural pass is not usable and not good UI (S25)');
  assert.match(md, /focus order/i, 'the envelope names focus order among the non-automatable classes (S26)');
  assert.match(md, /best-practice/i, 'the envelope labels heading-order/DOM-order as best-practice, not WCAG failures (S27)');
  assert.match(md, /not a wcag conformance certification/i, 'the report disclaims WCAG conformance certification (S29)');
});

test('S30: any axe critical-impact violation blocks the CI gate regardless of the 0-4 mapping (D1)', () => {
  // Requirement ID: S30
  const critical = sci('structural-critical-impact-violation.json');
  assert.match(critical.stderr + critical.stdout, /critical.?impact|blocked|merge/i, 'the CI gate names the critical-impact block rule (S30)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a report with zero critical-impact violations passes the CI gate (negative control, S30)');
});

// ---- HIGH / MEDIUM coverage (not required by the ATDD critical-id audit, but locks the wider contract) ----

test('S9 S11 S15: landmark validity (8 ARIA types), positive-tabindex anti-pattern, interactive affordance', () => {
  // Requirement ID: S9, S11, S15
  const badLandmark = sgate('structural-unlabeled-section-bad.json');
  assert.match(badLandmark.stderr + badLandmark.stdout, /landmark|section|coverage gap/i, 'an unlabeled section is flagged as a coverage gap, not skipped (S9)');
  const posTab = sgate('structural-positive-tabindex-bad.json');
  assert.match(posTab.stderr + posTab.stdout, /tabindex/i, 'a positive tabindex is flagged as an anti-pattern (S11)');
  const badControl = sgate('structural-continue-not-semantic-bad.json');
  assert.match(badControl.stderr + badControl.stdout, /semantic|affordance|focusable|accessible name/i, 'a non-semantic continue control is flagged (S15)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a valid landmark/tabindex/affordance report passes (negative control, S9/S11/S15)');
});

test('S31 S32 SN2: WCAG target level is configurable (default AA); axe version bump needs a decision record', () => {
  // Requirement ID: S31, S32, SN2
  assert.ok(existsSync('config/wcag-target.default.json'), 'config/wcag-target.default.json missing — the WCAG target must be pluggable data defaulting to AA (S31)');
  const cfg = json('config/wcag-target.default.json'); // RED: not built
  assert.equal(String(cfg.target ?? cfg.level).toUpperCase(), 'AA', 'the default WCAG target level is AA (S31)');
  const s = json('schemas/structural-findings.schema.json');
  assert.match(JSON.stringify(s), /schema_version/i, 'the versioned schema carries a schema_version field the gate checks (SN2)');
  assert.ok(existsSync('docs/adr/0005-axe-core-version-pin.md'), 'a decision record governing axe-core version bumps must exist (S32)');
});
