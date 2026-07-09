# CHALLENGE ROUND 4 — Verdict

## 1. Verdict

**CHANGES_REQUIRED**

- CONFIRMED: 21 (BLOCKER 5, MAJOR 12, MINOR 4)
- REJECTED: 6

Spec does not survive as-is. Freeze blocked until the 5 BLOCKERs are resolved; MAJOR/MINOR carry into the fix pass or an explicit accepted-risk note.

---

## 2. CONFIRMED defects

### BLOCKER

**B1 — S12 ancestor-exclusion mechanism cannot deliver S12's own "never disqualified by a descendant" guarantee**
IDs: S12
S12 excludes only ancestors of the anchor from the comparison pool, yet claims the anchor is "never disqualified by a candidate it contains" (a descendant). A larger-bounding-box descendant (e.g. an absolutely-positioned full-bleed div inside `<main>`) stays in-pool, out-measures the anchor, and disqualifies it — the exact outcome the guarantee forbids. Traced to scrub-log CR3-B3, which restated the contradiction instead of resolving it, and no fixture exercises a nested-larger-descendant case.
Fix directive: *In requirements.txt S12 and spec.md line 206, change the candidate-set exclusion from "ancestors of the anchor only" to "ancestors of the anchor and descendants of the anchor", and delete the now-unneeded separate "anchor is never disqualified by a candidate it contains" guarantee clause since exclusion alone now delivers it; add one JSDOM-fixture test to acceptance-0002.test.mjs asserting that an anchor containing a larger-bounding-box descendant div still passes S12 as prominent.*

**B2 — S12 ancestor/descendant exclusion vs. guarantee: same contradiction reproduced independently via requirements.txt + spec.md + scrub-log cross-read, with a third undocumented algorithm found live in the spike**
IDs: requirements.txt S12; spec.md line 206; scrub-log.md CR3-B3
Spec prose describes "exclude ancestors only, compare by area"; the same bullet's guarantee clause implies the opposite; the actual spike (`structural-scan.mjs`) implements a third, undocumented containment-override algorithm that never appears in requirements.txt or spec.md. Three independently-compliant readings diverge on the identical fixture, and nothing in the RED suite forces convergence.
Fix directive: *In requirements.txt S12 and spec.md's S12 bullet, change the comparison-pool exclusion from "ancestors of the declared anchor only" to "ancestors and descendants of the declared anchor," so the "anchor is never disqualified by a candidate it contains" clause becomes literally true by construction; then add a fixture (e.g. structural-dom-sev-main-content-descendant-overflow-ok.json) where a CSS-overflow or position:absolute descendant of the anchor measures a larger bounding-box area than the anchor, asserting the anchor still passes as prominent, to lock the resolved rule and force convergence between independently-compliant builders.*

**B3 — S1's `getAnimations()`-empty settle precondition is permanently unsatisfiable on any page with a legitimate infinite CSS animation, and S47/S48 hard-block the merge forever with no override**
IDs: S1, S47, S48
`document.getAnimations({subtree:true})` never empties for an `animation-iteration-count: infinite` element (spinners, pulsing status dots, animated gradients — common, intentional patterns). Such a route hits the 10s cap every run, records `settle-timeout` every run, and S48 blocks the merge every run, permanently, by design, with zero exemption mechanism anywhere in the spec.
Fix directive: *In requirements.txt S1, replace the clause "then document.getAnimations({ subtree: true }) returning an empty list" with "then the set of document.getAnimations({ subtree: true }) entries whose effect.getComputedTiming().iterations is not Infinity becoming empty (i.e., only finite/transient animations must finish; animations with an infinite iteration count are excluded from this precondition and never block settle)."*

**B4 — Same infinite-animation settle deadlock, confirmed independently against D5b/S44/SN8's own physics rationale**
IDs: S1, S47, S48
Independent trace confirms the deterministic, permanent CI block for any route with `animate-spin`/`animate-pulse`/marquee-style elements; none of the KILLED claims, scrub-log, or spec residuals address it, and the CI-block predicate table (spec.md line 285) has no override branch for `settle-timeout`.
Fix directive: *In requirements.txt S1, replace the settle clause "then document.getAnimations({ subtree: true }) returning an empty list" with: "then document.getAnimations({ subtree: true }) containing no animation whose effect.getComputedTiming().iterations is finite and whose playState is 'running'". Apply the identical wording change to spec.md L198's parenthetical animation clause. Add one new acceptance test in test/acceptance-0002.test.mjs asserting a fixture route containing an animation-iteration-count: infinite element (e.g. animate-spin) reaches run_status settled/completed within the 10s cap, never settle-timeout.*

**B5 — `structural-ci-diff.mjs` never independently validates axe-version pin (S2), schema_version (SN2), or lane discriminator (S22) — only `structural-report-gate.mjs` does, and nothing forces the two to run together**
IDs: S2, SN2, S22, S30, S37, S38, S44, S52, D5, D6
D5's own rationale calls the axe-version pin "this lane's entire value proposition," yet the CI-block predicate table (spec.md lines 269-309) has no row for axe_version/schema_version/lane, and every negative-control test for those three checks (M14, Mi4) calls `sgate()`, never `sci()`. A CI pipeline invoking only `structural-ci-diff.mjs` for merge-blocking evaluates critical-impact predicates against an unverified, possibly-unpinned axe build — the exact reproducibility break D5 exists to prevent.
Fix directive: *Add requirement S57 to .swe-spec-0002/requirements.txt: "The structural-ci-diff.mjs CI gate MUST refuse with a non-zero exit any input findings file whose metadata.axe_version is not the pinned 4.12.1 (S2), whose schema_version is not the supported value (SN2), or whose top-level lane is not the string structural (S22), independent of and before evaluating any CI-block predicate." Add S57 as a row to the spec.md exhaustive CI-block predicate table under a new "input validity (bundle-level, evaluated before route-level predicates)" section. Add one acceptance test in test/acceptance-0002.test.mjs calling sci('structural-wrong-axe-version-bad.json'), sci('structural-schema-version-wrong-bad.json'), and sci('structural-wrong-lane-value-bad.json'), each asserting non-zero exit code and an output message naming the violated rule, mirroring the existing M14/Mi4 sgate assertions but invoked against sci.*

### MAJOR

**M1 — S55's cross-namespace suppression is keyed on an unverified assumption that axe reports `:root` as the landmark-one-main target selector**
IDs: S55, S7
The `:root` pin was invented during CR3 to close a different gap (missing-selector), never observed against real axe-core output. If axe's actual target differs (axe convention targets `html`, not `:root`), the equality match never fires and both the axe and non-axe findings ship duplicated for the same defect — exactly what S55 exists to prevent.
Fix directive: *Rewrite S55 (requirements.txt line 61) to key the landmark-one-main/cannot-evaluate-ambiguous-main suppression match on paired rule-code identity alone, dropping the selector-equality condition; update spec.md line 253 and the structural-cross-namespace-landmark-bad.json fixture to match.*

**M2 — S21's unconditional byte-identical determinism MUST is not scoped to matching render_environment_id, while sibling S42 explicitly is, despite D5b's own font-rendering rationale targeting axe color-contrast (S21's payload)**
IDs: S21, S42, SN8, S49
S42 was scoped to render_environment_id in CR3; S21 (axe violations/incomplete) never received the equivalent qualifier, even though D5b's cited failure mode ("a font/rendering change can flip a borderline 4.499:1 finding") is a color-contrast example — S21's domain, not S42's.
Fix directive: *In requirements.txt, edit S21 (line 27) to append the same scope qualifier S42 already carries: after "an identical ruleset configuration" insert "the same pinned browser version" and "a matching render_environment_id" as additional required-identical inputs, mirroring S42's condition list exactly.*

**M3 — Anchor prominence metric (S12) admits candidates with zero text content, so a decorative full-bleed div/image container systematically outranks the real text-content anchor**
IDs: S12
The candidate pool has no text-presence filter; only the display/hidden/zero-area and ancestor exclusions exist. A hero banner or carousel wrapper sibling with a larger bounding-box area than the true `<h1>`/`<main>` content wins the comparison, firing `main-content-not-prominent` on a structurally correct page. The original spike's `b.len > 0` text filter was dropped when CR1-M4 swapped the metric from char-count to area.
Fix directive: *In requirements.txt S12 and spec section (0002-structural-ui-lane.spec.md line 206 and Scenario at line ~98-103), add a third exclusion to the candidate pool alongside the existing two: exclude any candidate whose own rendered text content (element.innerText, trimmed) has zero length, before the bounding-box-area comparison. Do not restate this as "text OR image" or any compound condition — state it as a single additional exclusion clause parallel to the existing display:none/visibility:hidden/zero-bounding-box-area exclusion.*

**M4 — S21's unconditional axe-finding determinism claim contradicts S44's own comparability guard and D5b's rationale (duplicate confirmation of M2, independently traced)**
IDs: S21, S42, S44, SN8
S44 refuses to compare two reports with differing render_environment_id — implying legitimate divergence is expected — while S21 demands byte-identical axe finding sets "on every run" with no escape clause, even after a spec-legal SN8 render_environment_id bump.
Fix directive: *In .swe-spec-0002/requirements.txt, edit S21 to append the same render_environment_id scope clause S42 already has: after "...on every run" add ", scoped to apply only when render_environment_id matches across runs" — and mirror the identical edit into docs/specs/0002-structural-ui-lane.spec.md line 214 (S21 acceptance criterion).*

**M5 — WCAG 1.4.1 use-of-color (G183) is a brief-mandated MUST-check that silently vanished from MVP scope with no scrub-log entry, reproducing the exact undisclosed-drop pattern CR3-M5 already fixed for a sibling item**
IDs: DECISION-BRIEF §2a, §5; scrub-log.md cut table
Brief §2a lists the check as MUST; §5's MVP scope list and requirements.txt contain no matching requirement; scrub-log's cut table, which explicitly logs every other deliberate drop (including the sibling bypass-mechanism item), has no row for this one.
Fix directive: *Add one row to .swe-spec-0002/scrub-log.md's cut table for "Use-of-color / G183 check (WCAG 1.4.1)" stating it was named an MVP MUST-check in brief §2a but is deferred, mirroring the existing bypass-mechanism row's wording and format. Add one matching bullet to docs/specs/0002-structural-ui-lane.spec.md's Non-goals (MVP) section titled "No use-of-color / G183 check (WCAG 1.4.1)" citing the scrub-log cut-table row, mirroring the existing bypass-mechanism non-goals bullet's format exactly.*

**M6 — The brief's promised §3 disclosure of contrast-exemption categories (logotype/incidental/decorative text) requiring human judgment was never actually written into §3, S25, or S26**
IDs: DECISION-BRIEF front matter (KILLED-claims), §3; requirements.txt S5, S25, S26
The brief's KILLED-claims accounting says the "no human judgment" framing was killed and replaced by a §3 disclosure — but §3's actual six-item disclaim list never mentions contrast exemptions, and S5 asserts "4.499:1 fails" with no caveat. The promised replacement disclosure never shipped.
Fix directive: *In requirements.txt, add a new requirement S26b immediately after S26: "S26b: The validity envelope MUST name contrast-exemption categories including logotype text, incidental text, and text that is part of an inactive user interface component as a class automated contrast testing cannot reliably distinguish from a real violation." Mirror this bullet verbatim into 0002-structural-ui-lane.spec.md's S26 requirement list and into the DECISION-BRIEF-0002-STRUCTURAL.md §3 "MUST disclaim, every run" bullet list.*

**M7 — S20's dedup key and S24's cross-lane join key are never stated to be the same schema field, and the schema literally defines them as two distinct properties**
IDs: S20, S24, S41, S55
`findings.schema.json` has both `target_element_identifier` and `target_selector` as separate properties. S20/S41/S50/S55 use the unbound prose phrase "target-element selector"; only S24 is pinned to the literal field `target_element_identifier`. A spec-compliant builder could key dedup off `target_selector` and join off `target_element_identifier`, silently and permanently breaking the cross-lane join on any page where the two values diverge — undetected, since all current fixtures happen to set both fields to the same string.
Fix directive: *In requirements.txt, replace every occurrence of the prose phrase "target-element selector" in S20, S41, S50, and S55 with the literal schema field name "target_element_identifier" (matching S24's phrasing), removing the ambiguous prose phrase entirely from all four requirements. Then add one new acceptance test in test/acceptance-0002.test.mjs that loads a structural finding fixture with target_element_identifier and target_selector set to two different string values, and asserts the S41 dedup output and the S24 join output both key off target_element_identifier, not target_selector.*

**M8 — `axe.run()` resolving without throwing but silently evaluating nothing meaningful (CSP-blocked internal checks, closed shadow roots) is indistinguishable from a genuinely clean pass — S45's fail-closed protection only covers the throw/reject path**
IDs: S45, S46, S1
axe-core is documented to degrade silently rather than throw when it can't fully traverse the DOM. Such a route is recorded `completed` with zero violations and CI advisory-passes it clean — the exact "silent zero-violations clean pass" failure mode S45 exists to prevent, reached via the resolve path instead of reject.
Fix directive: *Add requirement S57 (functional): "The structural lane MUST record the run_status value axe-execution-degraded for any route where axe.run() resolves but the combined count of violation, incomplete, and pass results is zero on a route whose pre-injection DOM snapshot contains at least one interactive element or landmark node." Add requirement S58: "The structural CI gate MUST block a merge whenever any route's run_status value is axe-execution-degraded." Add both to the run_status table in 0002-structural-ui-lane.spec.md (lines 277-284) alongside axe-execution-failed, and add one acceptance scenario to acceptance-0002.test.mjs asserting CI blocks on a fixture findings file with run_status axe-execution-degraded.*

**M9 — S53's critical-impact CI predicate reads `impact` from the findings JSON, but no requirement makes `impact` a required persisted property on incomplete finding records**
IDs: S18, S36, S52, S53, SN2
`structural-ci-diff.mjs` is file-based with no live axe access. S18/S36's text hedges with "any impact value PRESENT," never mandating persistence, and the M9 cross-schema test only locks `severity`/`finding_id` as shared required properties. A builder can emit `{code:'incomplete', severity:0}` with no `impact` field, passing every literal MUST while making S53's CRITICAL CI block permanently unreachable.
Fix directive: *In .swe-spec-0002/requirements.txt add a new requirement (e.g. S57 or fold into SN2's schema family) stating exactly: "Every axe-sourced finding record, violation and incomplete alike, MUST persist a raw impact string property in the findings schema's per-finding required array, distinct from the derived severity integer." Then extend the M9 test (test/acceptance-0002.test.mjs, the for (const prop of ['severity', 'finding_id']) loop at line 198) to also assert impact is present in stF.properties and listed in the structural finding schema's required array for axe-sourced entries, so schemas/structural-findings.schema.json cannot be built without persisting impact.*

**M10 — S14's fail-closed suppression is verified only by reading the test author's own hand-authored fixture back at itself, and the current spike violates S14 today**
IDs: S14, Mn11, S12
`structural-scan.mjs` independently emits `no-main-landmark`/`multiple-main` (wrong codes) via one unconditional `if`, then evaluates `mainContent` in a second unconditional `if` with no gating on landmark count — on a 2-main-landmark page with a supplied selector it would double-emit, the exact violation S14 forbids. No fixture pairs `cannot-evaluate-ambiguous-main` with `main-content-missing` on the same route to prove the gate rejects that double-emission.
Fix directive: *Add fixture test/fixtures/structural-s14-violation-double-emission-bad.json containing both a cannot-evaluate-ambiguous-main finding and a main-content-missing finding for the same route, and add one assertion in the Mn11 test calling sgate on that fixture asserting non-zero exit with a message naming the S14 suppression violation distinct from the generic S56 block.*

**M11 — The S24 cross-lane join acceptance test computes the join in the test file itself and never calls a single line of production code**
IDs: S24, B4
The test defines its own `key()`/filter logic and runs it against two hand-authored fixtures pre-matched by the test author — no script is invoked. A builder shipping `target_element_identifier: null` for every finding (breaking the real join universally) still passes at 100%. S24's second clause ("disclose no-match rather than silent empty join") has zero fixture or assertion coverage anywhere in the suite.
Fix directive: *In test/acceptance-0002.test.mjs, replace the B4 (S24 D6) test body (lines 209-219) with a call to the actual structural cross-reference script (e.g. structural-cross-ref.mjs, invoked the same way srender/sci invoke other scripts) passing structural-join-0002.json and join-persona-0001.json as arguments, and assert the script's own stdout/exit code shows the button#buy match, deleting the inline key/filter reimplementation. Add a second fixture pair (e.g. structural-join-no-match-0002.json + join-persona-no-match-0001.json) with disjoint target_element_identifier values, and assert the script's output contains the literal "no cross-lane match found" disclosure rather than an empty join array.*

**M12 — S17's axe-impact-to-severity pure-function mapping is tested with exactly one undifferentiated fixture, unlike sibling S35's full 9-code loop**
IDs: S17
Only one impact/severity mismatch (minor) is exercised through `sgate()`; critical/serious/moderate are untested there. A builder could narrowly key the mapping to the one exercised rule_id/impact pair and ship 3 of 4 impact levels broken. Since S30/S52 read raw axe impact directly, a moderate/minor severity-display inversion would ship silently and permanently with no downstream CI catch.
Fix directive: *In test/acceptance-0002.test.mjs, replace the single wrongMap assertion block inside the S17 test (lines 119-122) with a loop over the 4 axe impact levels mirroring the S35 pattern at lines 134-146: define const S17_IMPACTS = [['critical', 4], ['serious', 3], ['moderate', 2], ['minor', 1]]; for each [impact, pinned] call sgate(`structural-axe-severity-${impact}-bad.json`) where that fixture has impact: impact and severity: pinned - 1, assert the output matches /impact|severity/i and assert.notEqual(r.code, 0, ...); add one negative-control fixture structural-axe-severity-all-correct-ok.json containing 4 axe findings, one per impact level, each at its correctly pinned severity, and assert sgate(...).code === 0. Create the 5 new fixture files under test/fixtures/ (4 bad + 1 ok) following the existing structural-severity-not-impact-mapped-bad.json shape.*

### MINOR

**Mi1 — S50's finding_id formula is self-consistency-tested but never uniqueness-tested against differing selectors**
IDs: S50, S20, S41, S21, S51
S50 does require selector as an input (attack's "omission" framing overreads the text), but S51's only test (acceptance-0002.test.mjs:415-427) checks self-consistency across two invocations of the same input, never that two records differing only by selector produce different ids.
Fix directive: *In test/acceptance-0002.test.mjs S51 test, add one assertion: build a second synthetic array reusing the same route and rule_id/code as an existing entry but a different selector value, call computeFindingId on it, and assert the returned id is NOT a member of the original id set (a real inequality/uniqueness check, not just the existing set-equal self-consistency check).*

**Mi2 — S10 pins only the LABEL of a heading-order finding, never the detection algorithm, and no RED fixture drives actual detection**
IDs: S10, S27
The only heading-order-adjacent assertion is a static regex against validity-envelope Markdown text ("best-practice"). No fixture places a heading-order entry inside a `findings` array, so a no-op detector passes every acceptance test.
Fix directive: *Add requirement S10a to requirements.txt: "The lane MUST flag a heading-order finding when, walking headings in DOM order, a heading's level exceeds the immediately preceding heading's level by more than 1." Add fixture pair test/fixtures/structural-heading-order-skip-bad.json and test/fixtures/structural-heading-order-ok.json, and add a test in test/acceptance-0002.test.mjs that asserts the skip fixture's findings contain the heading-order code with its best-practice label and the ok fixture's findings do not.*

**Mi3 — S45's still-emitted non-axe findings enumeration is illustrative, not exhaustive, and omits continue-control from its parenthetical list**
IDs: S45, S35, S49, S38
S35 and spec.md's finding-source table already classify continue-control findings as non-axe (resolving the classification question), but S45's example list doesn't name them and no test asserts report content for the axe-execution-failed run_status.
Fix directive: *In S45, replace "the non-axe DOM-check findings (landmark, tabindex, main-content)" with "the non-axe DOM-check findings (landmark, tabindex, main-content, continue-control)."*

**Mi4 — S20 (axe finding dedup) has zero test coverage anywhere in the suite, unlike its fully-locked non-axe twin S41**
IDs: S20
No fixture, comment, or test references S20 by name. A builder can ship a structural lane that double-counts axe findings sharing rule_id + selector with zero suite signal, despite S20's BLOCKS:high tag.
Fix directive: *In test/acceptance-0002.test.mjs, add a test block for S20 immediately before or after the S41 block (line 293), structurally identical to it: create fixtures test/fixtures/structural-axe-dup-rule-bad.json and test/fixtures/structural-axe-dup-collapsed-ok.json, then assert sgate('structural-axe-dup-rule-bad.json') returns a non-zero exit code and matches /dedup|duplicate|rule.id|selector/i in its output, and assert sgate('structural-axe-dup-collapsed-ok.json') returns exit code 0.*

---

## 3. REJECTED

- **S49 accessible-name via `axe.commons.text.accessibleText`** — attack's technical premises are factually wrong against the live axe-core 4.12.1 source (function takes a raw Element, resolves its own VirtualNode internally, is typed in the shipped `.d.ts`); S49's `axe.setup`/`teardown` bracket is the correct invocation. Real residual is only a MINOR citation gap, already subsumed by M... none — not re-listed, folded as non-material.
- **0001's `report-gate.mjs` silently passing a misrouted structural bundle** — verbatim third re-raise of CR1/CR2/CR3-rejected objection; D6 already discloses this exact residual as a deliberate, reversible naming-convention guard, and a spec-compliant builder never wires the frozen 0001 gate to a structural bundle.
- **0001's `ci-diff.mjs` being diff-only lets a persisting critical finding slide through** — S52 explicitly names `structural-ci-diff.mjs` as a separate, absolute single-bundle checker (not a diff tool); the diff-evasion scenario cannot occur in an architecture with no baseline/current step, and the same misrouting objection was already rejected 3x in scrub-log.
- **D6's "one schema family" trains reuse of 0001's `run_status` $ref, breaking S45/S47** — D6's text never mentions `run_status`; M9 only locks `severity`/`finding_id`; and no ajv/JSON-Schema validator exists anywhere in the repo, so a stray `$ref` would be inert against the CLI-subprocess-based gate tests regardless.
- **S24's verbatim route join has no format contract, causing silent join failure** — S24's own text already mandates disclosure of "no cross-lane match found" rather than a silent empty join, and scrub-log M7 shows this exact tension was raised and deliberately resolved via disclosure-not-normalization at design time.
- **S13 refusal verified only against a hand-authored fixture, spike does the opposite** — the live-execution gap is explicitly disclosed as a deferred v2 residual (CR3-M13, spec.md line 330) matching the already-frozen 0001 sibling's identical posture, and the spike's substring fallback is independently pre-empted by an explicit scrub-log kill entry a literal-reading builder would follow.

---

## 4. Systemic observations

- **S12 is the single most defect-dense requirement in the spec**: 3 of 5 BLOCKERs (B1/B2 both trace to the same ancestor/descendant contradiction, plus M3's text-content gap) concentrate on one 15-line requirement. Treat S12 as needing a full rewrite + dedicated fixture set, not a patch — the ancestor/descendant fix and the text-content fix are independent and both required before freeze.
- **Duplicate confirmed defects from independent lenses**: B1/B2 (S12 contradiction) and B3/B4 (S1 infinite-animation deadlock) and M2/M4 (S21 render-env scoping) were each surfaced twice by different attack lenses landing on identical root causes. This is a *good* signal (convergent, reproducible defects, not lens noise) but the fix pass should merge each pair into one requirement edit, not apply two redundant patches.
- **Recurring meta-defect: tests validate fixtures against themselves, not production code.** M10 (S14), M11 (S24 join), M12 (S17), and Mi4 (S20) are all instances of the same failure shape — an acceptance test that proves a hand-authored fixture is internally consistent, or reimplements the logic under test inline, rather than exercising a script. This pattern should be swept for across the *entire* suite before freeze, not fixed findng-by-finding.
- **CI-gate self-validation gap (B5) is structural, not incidental**: the spec repeatedly trusts `structural-report-gate.mjs` to have already caught conditions that `structural-ci-diff.mjs` alone is expected to block on (S30/S37/S38/S44/S52/S53/S56). Any two-script gate architecture needs each script to independently validate its own trust boundary (version pin, schema, lane) — this is a pattern worth codifying as a standing rule for future lane specs, not a one-off fix.
- **Rejected-attack quality is high**: all 6 REJECTED items were killed by direct file verification (grep, source read, cross-reference to scrub-log/CR1-3 history), not by assertion — evidence the review process has real teeth in both directions.
