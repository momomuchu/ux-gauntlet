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
  // CR5-M9: S1's "collect ... passes as structured data" clause was never locked by any schema field.
  // The schema must declare an axe_passes_count field so a builder cannot ship a scanner that silently
  // never records the axe pass count. (The tabindex-rule-disable half of M9 is locked by the S1/S47 settle test.)
  assert.match(schemaStr, /axe_passes_count/i, 'the schema declares an axe_passes_count field so S1\'s pass-collection clause is persisted, not silently dropped (S1/CR5-M9)');
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
  // CR4-B1/B2: the anchor's comparison pool excludes BOTH its ancestors AND its descendants, so a
  // larger-bounding-box descendant (e.g. an absolutely-positioned full-bleed overlay div nested inside
  // the anchor) does NOT disqualify the anchor — it still passes as prominent. Ancestor-only exclusion
  // (the pre-CR4 rule) left this descendant in-pool where it out-measured and wrongly disqualified the anchor.
  const descendantOverflow = sgate('structural-dom-sev-main-content-descendant-overflow-ok.json');
  assert.equal(descendantOverflow.code, 0, 'an anchor containing a larger-bounding-box descendant (full-bleed overlay div) still passes S12 as prominent — descendants are excluded from the comparison pool (negative control, S12/CR4-B1/CR4-B2)');
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
  // impact->severity must be a pure mapping for axe violations. CR4-M12: exercise ALL 4 impact levels
  // (mirroring the S35 9-code loop) — one undifferentiated minor fixture let a builder key the mapping to
  // one impact/rule pair and ship 3 of 4 levels broken. Each fixture pins severity one BELOW its correct value.
  const S17_IMPACTS = [['critical', 4], ['serious', 3], ['moderate', 2], ['minor', 1]];
  for (const [impact, pinned] of S17_IMPACTS) {
    const r = sgate(`structural-axe-severity-${impact}-bad.json`);
    assert.match(out(r), /impact|severity/i, `an axe ${impact}-impact violation carrying severity ${pinned - 1} instead of the pure-mapping ${pinned} fails the gate (S17/S19)`);
    assert.notEqual(r.code, 0, `an axe ${impact}-impact violation whose severity is ${pinned - 1} instead of ${pinned} must fail the gate with a non-zero exit (S17/S19/M12)`);
  }
  const allCorrect = sgate('structural-axe-severity-all-correct-ok.json');
  assert.equal(allCorrect.code, 0, 'a report with all 4 axe impact levels each at their correctly pinned severity passes the gate (negative control, S17/M12)');
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
  // CR5-B5: impact is now in S21's covered record set. Two same-input runs with byte-identical
  // {finding_id, severity, result-type} but a DRIFTING impact (moderate -> critical on the same
  // incomplete finding_id — severity is pinned 0 by S36, so impact carries the only cross-run signal)
  // flip the S53/D7 CI-block outcome while satisfying the pre-CR5 covered set. This must now be caught.
  const impactDrift = sgate('structural-determinism-impact-drift-bad.json');
  assert.match(out(impactDrift), /determinism|impact|finding-id|identical/i, 'the gate names the determinism invariant when impact drifts on a stable finding_id whose severity + result-type match (S21/CR5-B5)');
  assert.notEqual(impactDrift.code, 0, 'two same-input runs whose impact drifts on a stable finding_id (flipping the S53 CI-block outcome) must fail the gate with a non-zero exit — impact is in S21 covered set (S21/CR5-B5)');
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
  // CR4-M9 (S60): a raw `impact` string must be a persisted, REQUIRED property on axe-sourced finding
  // records, distinct from the derived `severity` integer — otherwise a builder emitting
  // {code:'incomplete', severity:0} with no impact field makes the S53 critical-impact CI predicate
  // (which reads impact, not severity) permanently unreachable. Locked here so the schema cannot be built without it.
  assert.ok(stF.properties.impact, 'structural finding schema must define a raw impact property for axe-sourced records (S60)');
  // impact must be REQUIRED (top-level required array, or a required in any allOf/anyOf/oneOf branch that
  // covers axe-sourced records) so the schema cannot be built without persisting it.
  const requiredSets = [stF.required, ...(stF.allOf ?? []).map((s) => s.required), ...(stF.anyOf ?? []).map((s) => s.required), ...(stF.oneOf ?? []).map((s) => s.required)];
  const impactRequired = requiredSets.some((r) => Array.isArray(r) && r.includes('impact'));
  assert.ok(impactRequired, 'a raw impact string is listed in the structural finding schema required array for axe-sourced entries, distinct from the derived severity integer (S60/M9)');
  assert.deepEqual(
    [stF.properties.severity.minimum, stF.properties.severity.maximum],
    [peF.properties.severity.minimum, peF.properties.severity.maximum],
    'severity bounds must match across the two schemas (D6)',
  );
});

test('B4 (S24 D6, CR4-M11): the cross-lane join is computed by the real structural-cross-ref.mjs script, not reimplemented in-test', () => {
  // Requirement ID: S24 — the join key is the field that ACTUALLY exists in the 0001 schema (CR1-B4).
  // CR4-M11: the old test defined its own key()/filter and ran it against two pre-matched fixtures — no
  // production code was invoked, so a builder shipping target_element_identifier:null everywhere still
  // passed at 100%. Now the ACTUAL script is invoked (like sci/srender invoke their scripts) and its own
  // stdout/exit is asserted. RED until scripts/structural-cross-ref.mjs is built.
  const scref = (structuralFx, personaFx) => run(['scripts/structural-cross-ref.mjs', `test/fixtures/${structuralFx}`, `test/fixtures/${personaFx}`]);
  const match = scref('structural-join-0002.json', 'join-persona-0001.json');
  assert.equal(match.code, 0, 'the cross-ref script exits 0 when a match exists (S24) — RED until scripts/structural-cross-ref.mjs is built');
  assert.match(out(match), /button#buy/, "the script's own output reports the button#buy match on the real target_element_identifier + route, not the non-existent target_element (S24/B4/M11)");
  // S24 second clause: disclose "no cross-lane match found" rather than a silent empty join — previously
  // uncovered. Disjoint target_element_identifier values on both sides must surface the disclosure.
  const noMatch = scref('structural-join-no-match-0002.json', 'join-persona-no-match-0001.json');
  assert.match(out(noMatch), /no cross-lane match found/i, "the script discloses 'no cross-lane match found' for disjoint identifiers rather than emitting an empty join array (S24/M11)");
  // CR5-M11: the verbatim `route` key must be load-bearing. Identical target_element_identifier (button#buy)
  // on both sides but a DIFFERENT route (/pricing vs /checkout) must NOT join — a cross-ref keying solely on
  // target_element_identifier (ignoring route) would wrongly match. NOTE: the S24 join is otherwise
  // v2-inert against real 0001 output (no 0001 script populates run.route — see spec.md Known gaps); this
  // locks the route key for the day a future 0001 change writes it. Both fixture pairs hold route identical
  // before CR5; this pair varies ONLY route.
  const routeMismatch = scref('structural-join-route-mismatch-0002.json', 'join-persona-route-mismatch-0001.json');
  assert.match(out(routeMismatch), /no cross-lane match found/i, "identical target_element_identifier but different route surfaces 'no cross-lane match found' — the verbatim route key is load-bearing, not ignored (S24/CR5-M11)");
});

test('S25 S26 S26b S26c S27 S29: every report prints the validity envelope with vendor-reported caveats on BOTH figures', () => {
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
  // CR5-M12 (S26b): the contrast-exemption taxonomy was written at CR4 but had ZERO test coverage — a
  // builder could freeze-ship a validity envelope omitting it entirely. Lock all three categories here.
  assert.match(md, /logotype/i, 'the envelope names the logotype contrast-exemption category (S26b/CR5-M12)');
  assert.match(md, /incidental/i, 'the envelope names the incidental-text contrast-exemption category (S26b/CR5-M12)');
  assert.match(md, /inactive/i, 'the envelope names the inactive-UI-component contrast-exemption category (S26b/CR5-M12)');
  // CR5-mandate (S26c): the determinism validity disclosure — byte-identical determinism (S21/S42) holds
  // ONLY within a matching render_environment_id; cross-render-environment reproduction is a disclosed
  // residual the lane does not guarantee, which is why S44 refuses cross-environment CI comparison.
  assert.match(md, /render[_ -]?environment/i, 'the envelope discloses that determinism is scoped to a matching render_environment_id — cross-environment reproduction is not guaranteed (S26c/CR5)');
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
  // CR5-B6: S38 reads the finding CODE directly, never the derived severity integer. A genuine
  // main-content-missing defect whose S35 code->severity lookup was corrupted (severity 3, not 4) must
  // STILL block CI — a gate keying on "severity 4" would miss it, silently merging a missing-main-content page.
  const mismapped = sci('structural-nonaxe-severity4-mismapped-bad.json');
  assert.match(out(mismapped), /main-content-missing|code|blocked|merge/i, 'the CI gate names the code-based non-axe block rule for a main-content-missing finding whose severity was mis-mapped to 3 (S38/CR5-B6)');
  assert.notEqual(mismapped.code, 0, 'the CI gate blocks a main-content-missing finding read from its CODE even when its severity integer was mis-mapped to 3 — S38 reads code, not the derived severity, matching S52/S56 (S38/CR5-B6)');
  // CR5-B7: advisory negative controls — the gate must NOT over-block. A report whose only finding is an
  // axe serious/moderate/minor violation, or one of the six advisory non-axe codes, passes CI clean.
  // Without these, a "block if findings.length > 0" gate silently inverts D1's reversible-advisory model
  // yet passes every BLOCK-only assertion in the suite.
  const advisoryAxe = sci('structural-axe-severity-serious-bad.json');
  assert.equal(advisoryAxe.code, 0, 'the CI gate exits 0 on a report whose only violation is an axe serious-impact (advisory, not critical) finding — the gate does not over-block (S30/S52/CR5-B7)');
  const advisoryNonAxe = sci('structural-main-content-not-in-main-bad.json');
  assert.equal(advisoryNonAxe.code, 0, 'the CI gate exits 0 on a report whose only finding is an advisory non-axe code (main-content-not-in-main, severity 3, advisory) — the gate does not over-block (S38/CR5-B7)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a genuinely clean, completed run with zero violations passes the CI gate (negative control, S30/S46/S56)');
});

test('S45: the lane records run_status axe-execution-failed rather than a silent clean pass for an untested route', () => {
  // Requirement ID: S45 (CR1-B5) — fail-closed when axe.run() itself throws.
  const failed = sgate('structural-axe-execution-failed-bad.json');
  assert.match(out(failed), /axe-execution-failed|execution.?failed|never tested|not.*complete/i, 'the gate names the axe-execution-failed run_status (S45)');
  assert.notEqual(failed.code, 0, 'a route whose axe run failed to complete must fail the gate with a non-zero exit, never advisory-pass as zero-violations clean (S45)');
  // CR5-M10: S45's RETENTION clause — non-axe DOM checks that completed before the axe failure are STILL
  // emitted; only axe-derived findings are omitted for the route. The pre-CR5 fixture had findings:[] and
  // proved only the "omit axe findings" half. Inspect the fixture content to lock the retention half too.
  const s45fx = json('test/fixtures/structural-axe-execution-failed-bad.json');
  assert.ok(s45fx.findings.some((f) => f.source !== 'axe'), 'an axe-execution-failed route still emits its completed non-axe DOM-check findings — S45 retention clause (CR5-M10)');
  assert.ok(!s45fx.findings.some((f) => f.source === 'axe'), 'no axe-sourced finding is emitted for an axe-execution-failed route — only the axe-derived findings are omitted (S45/CR5-M10)');
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
  // CR4-Mi1: uniqueness — the same route + rule/code but a DIFFERENT selector must yield a DIFFERENT
  // finding_id (selector is a real input to S50's derivation, not a self-consistency-only artifact).
  const baseId = mod.computeFindingId({ route: '/signup', rule_id: 'button-name', selector: 'button.cta' });
  const differentSelectorId = mod.computeFindingId({ route: '/signup', rule_id: 'button-name', selector: 'button.other' });
  assert.notEqual(differentSelectorId, baseId, 'two records identical but for their selector produce DIFFERENT finding_ids — selector is load-bearing in the S50 derivation, not ignored (S51/S50/Mi1)');
  assert.ok(!a.has(differentSelectorId), 'the differing-selector id is not a member of the original synthetic id set (real uniqueness check, not self-consistency, S51/Mi1)');
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
  // CR4-M10: a page that emits BOTH cannot-evaluate-ambiguous-main AND main-content-missing for the same
  // route violates S14's fail-closed suppression (the ambiguous-main result must SUPPRESS every S12-derived
  // finding). The gate must reject that double-emission with a message naming the S14 suppression violation,
  // distinct from the generic S56 block. The pre-CR4 suite had no fixture pairing the two codes on one route.
  const doubleEmit = sgate('structural-s14-violation-double-emission-bad.json');
  assert.match(out(doubleEmit), /S14|suppress|ambiguous|main-content-missing/i, 'the gate names the S14 fail-closed suppression violation when both cannot-evaluate-ambiguous-main and main-content-missing are emitted for one route (S14/M10)');
  assert.notEqual(doubleEmit.code, 0, 'a route double-emitting cannot-evaluate-ambiguous-main and a main-content-missing (S12-derived) finding must fail the gate — S14 suppression forbids it (S14/M10)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a page exposing exactly one main landmark passes the gate (negative control, S14/Mn11)');
});

test('S55 (M10/B8): the one live cross-namespace pair (landmark-one-main <-> cannot-evaluate-ambiguous-main) is not double-counted', () => {
  // Requirement ID: S55 (CR2-M10, CR3-2/B8, CR4-M1) — the tabindex/positive-tabindex pair is DEAD CODE:
  // S1 disables the axe tabindex rule (CR2-B13), so axe can never emit a tabindex finding for it to act
  // on. The sole live pair is the axe landmark-one-main rule vs the non-axe cannot-evaluate-ambiguous-
  // main check: when both appear for the same route, the non-axe finding is emitted and the axe finding
  // is suppressed (else one 0-or-2-main defect ships as two entries at two severities). CR4-M1: the
  // suppression is keyed on the paired rule-code identity alone — the CR3 :root selector-equality
  // condition (never verified against live axe output; axe may target `html`, not `:root`) is dropped.
  const dup = sgate('structural-cross-namespace-landmark-bad.json');
  assert.match(out(dup), /cross-namespace|landmark-one-main|cannot-evaluate-ambiguous-main|suppress|equivalence|dedup/i, 'the gate names the cross-namespace equivalence rule when the axe landmark-one-main finding + its paired non-axe cannot-evaluate-ambiguous-main finding appear for the same route (S55/CR4-M1)');
  assert.notEqual(dup.code, 0, 'a report emitting BOTH the axe landmark-one-main finding and the non-axe cannot-evaluate-ambiguous-main finding for the same route must fail the gate — the axe finding must be suppressed on paired rule-code identity, no selector-equality condition (S55/M10/B8/CR4-M1)');
});

test('S49 S4 S15 (B9/B5): a role=button control sources its accessible name via aria-command-name / the accname engine', () => {
  // Requirement ID: S49 (CR2-B5/B9) — S4's closed list now includes aria-command-name so role-based
  // controls have a name source; S15/S49 pin axe.commons.text.accessibleText as the accname engine.
  const roleBtn = sgate('structural-role-button-no-name-bad.json');
  assert.match(out(roleBtn), /aria-command-name|accessible name|accname|button/i, 'the gate names the aria-command-name / accname rule for an unnamed role=button control (S49/B9)');
  assert.notEqual(roleBtn.code, 0, 'a role=button control exposing no accessible name must fail the gate with a non-zero exit (S49/S4/S15)');
});

// ==== CHALLENGE-ROUND-4 additions ====

test('S1 S47 (CR4-B3/B4): an infinite CSS animation does not deadlock the settle precondition', () => {
  // Requirement ID: S1, S47 — document.getAnimations subtree includes animation-iteration-count:infinite
  // elements (spinners, pulse dots, animated gradients) that NEVER empty; the pre-CR4 "empty list" clause
  // hit the 10s cap every run and recorded settle-timeout permanently. S1 now excludes infinite-iteration
  // animations from the precondition (treated as settled), so such a route reaches completed within the cap.
  const fx = json('test/fixtures/structural-infinite-animation-settles-ok.json');
  assert.notEqual(fx.run.run_status, 'settle-timeout', 'a route with an infinite CSS animation settles to a real run_status, never settle-timeout (S1/S47/CR4-B3/B4)');
  assert.equal(fx.metadata.settle_precondition_met, true, 'the settle precondition is met on a route whose only outstanding animation is infinite-iteration (S1/CR4-B4)');
  const settled = sgate('structural-infinite-animation-settles-ok.json');
  assert.equal(settled.code, 0, 'a completed run whose only unfinished animation is infinite-iteration passes the gate — the infinite animation is treated as settled, not a settle-timeout (negative control, S1/S47/CR4-B3/B4)');
});

test('S57 (CR4-B5): structural-ci-diff.mjs validates its own trust boundary (axe_version, schema_version, lane) before route predicates', () => {
  // Requirement ID: S57 — the CI diff gate must independently refuse an unpinned/misrouted bundle, not
  // rely on structural-report-gate.mjs having already caught it (D5's "entire value proposition"). Mirrors
  // the M14/Mi4 sgate assertions but invoked against sci, since a CI pipeline may wire ONLY the diff gate.
  const wrongVer = sci('structural-wrong-axe-version-bad.json');
  assert.match(out(wrongVer), /axe.?version|4\.12\.1|version/i, 'the CI diff gate names the pinned-axe-version rule for a wrong metadata.axe_version (S57/S2)');
  assert.notEqual(wrongVer.code, 0, 'structural-ci-diff.mjs refuses a bundle whose metadata.axe_version is not the pinned 4.12.1, with a non-zero exit, before any route predicate (S57/S2)');
  const wrongSchema = sci('structural-schema-version-wrong-bad.json');
  assert.match(out(wrongSchema), /schema.?version|version|unsupported/i, 'the CI diff gate names the schema_version rule for an unsupported schema_version (S57/SN2)');
  assert.notEqual(wrongSchema.code, 0, 'structural-ci-diff.mjs refuses a bundle whose schema_version is unsupported, with a non-zero exit (S57/SN2)');
  const wrongLane = sci('structural-wrong-lane-value-bad.json');
  assert.match(out(wrongLane), /lane|structural|persona/i, 'the CI diff gate names the lane discriminator rule for a wrong top-level lane (S57/S22)');
  assert.notEqual(wrongLane.code, 0, 'structural-ci-diff.mjs refuses a bundle whose top-level lane is not "structural", with a non-zero exit (S57/S22)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a correctly-pinned, correctly-lane-tagged clean bundle passes the CI diff gate (negative control, S57)');
});

test('S58 S59 (CR4-M8): axe-execution-degraded is recorded and blocks CI — a silent zero-results resolve is fail-closed', () => {
  // Requirement ID: S58, S59 — axe-core can degrade silently (CSP-blocked internal checks, closed shadow
  // roots) resolving with zero violation+incomplete+pass results on a non-trivial DOM; indistinguishable
  // from a genuinely clean pass. S45's fail-closed only covers the throw path; S58/S59 cover the resolve path.
  const degradedGate = sgate('structural-axe-execution-degraded-bad.json');
  assert.match(out(degradedGate), /axe-execution-degraded|degraded|zero.*result|silently/i, 'the gate names the axe-execution-degraded run_status for a resolve-with-zero-results route on a non-trivial DOM (S58)');
  assert.notEqual(degradedGate.code, 0, 'a route recording run_status axe-execution-degraded must fail the gate with a non-zero exit, never a silent clean pass (S58)');
  const degradedCi = sci('structural-axe-execution-degraded-bad.json');
  assert.notEqual(degradedCi.code, 0, 'the CI gate exits non-zero on a route whose run_status is axe-execution-degraded, to block the merge (S59/M8)');
  const clean = sci('structural-no-violations-ok.json');
  assert.equal(clean.code, 0, 'a genuinely clean completed run still passes the CI gate (negative control, S58/S59)');
});

test('S60 (CR4-M9): a raw impact string is a required persisted property on axe-sourced findings', () => {
  // Requirement ID: S60 — locked at the schema level in the M9 test (impact in the required array); here
  // the gate must reject an axe-sourced finding record that omits the raw impact field, so the S53
  // critical-impact CI predicate (which reads impact, not the derived severity) can never be made unreachable.
  const noImpact = sgate('structural-axe-finding-no-impact-bad.json');
  assert.match(out(noImpact), /impact|required|axe/i, 'the gate names the persisted-impact rule for an axe-sourced finding record missing its raw impact string (S60)');
  assert.notEqual(noImpact.code, 0, 'an axe-sourced finding record with no raw impact property must fail the gate with a non-zero exit (S60/M9)');
  const ok = sgate('structural-valid.json');
  assert.equal(ok.code, 0, 'a report whose axe-sourced findings all persist a raw impact string passes the gate (negative control, S60)');
});

test('CR4-M7 (S20 S41 S24 S50): dedup, join, and finding_id all key off target_element_identifier, never target_selector', () => {
  // Requirement ID: S20, S41, S24 — the schema defines target_element_identifier AND target_selector as
  // two distinct properties; a builder keying dedup off one and join off the other silently breaks the
  // cross-lane join on any page where the values diverge. This fixture sets them to DIFFERENT strings, so a
  // gate that dedups two same-identifier/different-selector findings into one (keying on identifier) passes,
  // while one keying on target_selector leaves the duplicate and fails.
  const divergent = sgate('structural-identifier-vs-selector-divergent-bad.json');
  assert.match(out(divergent), /dedup|duplicate|target_element_identifier|identifier|selector/i, 'the gate names the identifier-keyed dedup rule when two findings share target_element_identifier but differ in target_selector (S20/S41/M7)');
  assert.notEqual(divergent.code, 0, 'two findings sharing target_element_identifier but differing in target_selector must be deduplicated on the identifier — an undeduplicated file fails the gate (S20/S41/M7)');
  const ok = sgate('structural-identifier-vs-selector-collapsed-ok.json');
  assert.equal(ok.code, 0, 'the same defect correctly collapsed on target_element_identifier passes the gate (negative control, S20/S41/M7)');
});

test('Mi4 (S20): two axe findings sharing rule_id + target_element_identifier are deduplicated', () => {
  // Requirement ID: S20 (CR4-Mi4) — S20 (axe dedup) had zero suite coverage, unlike its non-axe twin S41.
  const dupe = sgate('structural-axe-dup-rule-bad.json');
  assert.match(out(dupe), /dedup|duplicate|rule.?id|identifier|selector/i, 'the gate names the axe dedup rule when two findings share rule_id + target_element_identifier (S20)');
  assert.notEqual(dupe.code, 0, 'two undeduplicated axe findings sharing rule_id + target_element_identifier must fail the gate with a non-zero exit (S20/Mi4)');
  const ok = sgate('structural-axe-dup-collapsed-ok.json');
  assert.equal(ok.code, 0, 'the same axe defect correctly collapsed to a single finding passes the gate (negative control, S20/Mi4)');
});

test('S10a (CR4-Mi2): a heading-order skip (level jump > 1) is detected in the findings, not only asserted on envelope text', () => {
  // Requirement ID: S10a — the pre-CR4 suite only regex-matched "best-practice" on validity-envelope text;
  // no fixture drove actual heading-order detection, so a no-op detector passed. S10a pins the algorithm:
  // a heading whose level exceeds the immediately preceding heading's level by more than 1 (e.g. h1->h3).
  const skip = json('test/fixtures/structural-heading-order-skip-bad.json');
  const skipCodes = skip.findings.map((f) => f.code);
  assert.ok(skipCodes.includes('heading-order'), 'a page whose headings skip h1->h3 emits a heading-order finding (S10a)');
  const skipFinding = skip.findings.find((f) => f.code === 'heading-order');
  assert.match(JSON.stringify(skipFinding), /best-practice/i, 'the heading-order finding carries the best-practice label, never a WCAG 1.3.1 failure (S10a/S27)');
  const okFx = json('test/fixtures/structural-heading-order-ok.json');
  assert.ok(!okFx.findings.map((f) => f.code).includes('heading-order'), 'a page with monotonic heading levels emits no heading-order finding (S10a)');
  const okGate = sgate('structural-heading-order-ok.json');
  assert.equal(okGate.code, 0, 'a page with correct heading order passes the gate (negative control, S10a)');
});
