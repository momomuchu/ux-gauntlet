# CHALLENGE-ROUND-3

## 1) Verdict

**CHANGES_REQUIRED**

CONFIRMED: 27 (8 BLOCKER / 15 MAJOR / 4 MINOR)
REJECTED: 2

Freeze does not proceed. 8 BLOCKERs include unresolved self-contradictions between `requirements.txt` and `spec.md` (S4, S1/S14/S39/S44), a fixture/requirement set that is mutually unsatisfiable by any single implementation (S14 ambiguous-main vs. the enumerated CI-block predicate list), and an escape path through 0001's frozen `report-gate.mjs`/`ci-diff.mjs` that D6 claims is "structurally impossible" but is reproducibly not.

---

## 2) CONFIRMED defects

### BLOCKER

**B1. Ambiguous-main (severity 3, advisory) outranks main-content-missing (severity 4, blocking) — inverts the spec's own fail-closed philosophy**
IDs: S14, S35, S38, S7, S30, Mn11
A route with zero/multiple `<main>` landmarks triggers S14's fail-closed suppression of the entire S12 evaluation, emitting only `cannot-evaluate-ambiguous-main` (severity 3 per S35) — which satisfies none of the enumerated CI-block predicates (S30/S37/S38/S46/S48/S53/S54) and merges clean. A narrower single-main defect (`main-content-missing`, severity 4) blocks the same merge. The Mn11 acceptance fixture asserts this exact scenario must block (test/acceptance-0002.test.mjs:454-455), so the requirements and their own acceptance test are mutually unsatisfiable by any single correct implementation.
Fix: In requirements.txt, add a standalone requirement (e.g. S38a, tag `# CR2-Mn11`): "The structural CI gate MUST block a merge whenever any non-axe DOM-check finding carries the code cannot-evaluate-ambiguous-main." Do not fold into S38 (pinned to severity 4 by cross-reference from S35).

**B2. spec.md's own frozen CRITICAL S4 bullet omits aria-command-name, contradicting spec.md's own S49 bullet and requirements.txt's S4**
IDs: S4, S49
requirements.txt S4 lists seven axe rules including `aria-command-name` (CR2-B9); spec.md's CRITICAL S4 bullet (line 200) lists only six, omitting it — while spec.md's own S49 bullet (line 244) asserts S4's list "now includes aria-command-name." A builder freezing against spec.md's literal S4 bullet ships no rule for role-based controls and fails the dedicated S49 test (fixture `structural-role-button-no-name-bad.json`, test lines 469-475).
Fix: Edit spec.md line 200 to append `, aria-command-name` to the CRITICAL S4 rule list, matching requirements.txt line 10 exactly.

**B3. S12's ancestor-exclusion rule can eliminate the anchor itself from the comparison pool, making "is-largest" unsatisfiable for the common (container-anchor) case**
IDs: requirements.txt S12, spec.md S12 acceptance-criteria (CR2-M6 clause), scripts/structural-scan.mjs
S12's global pairwise "excluding any candidate that is an ancestor of another candidate element" removes the anchor from its own comparison pool whenever the anchor is itself a container (the spec's own running example, `#audiobook-text`, wrapping `<p>`/`<h1>` children) — the anchor can then never be "largest," contradicting spec.md's own Gherkin and the CR2-M6 gloss's stated intent (protect the anchor from its OWN ancestor, not disqualify it as an ancestor of ITS descendants). Two spec-compliant builders read this two different ways and produce different pass/fail verdicts on identical DOM; no fixture (hand-authored JSON only) exercises the live algorithm to catch it.
Fix: Replace the exclusion clause in both requirements.txt S12 and spec.md's S12 bullet with: "excluding, from the comparison pool, only those candidates that are ancestors of the declared anchor element itself; the anchor and all other candidates, including the anchor's own descendants and unrelated siblings, remain in the pool." Delete the CR2-M6 gloss sentence and replace with the same wording in both documents.

**B4. spec.md's acceptance-criteria table reverts CR2's own "edited in place" fixes for 5 of 7 requirements**
IDs: S1, S4, S14, S39, S44
spec.md's Traceability section claims CR2 "edited S1/S4/S12/S14/S15/S39/S44 in place" in requirements.txt, but spec.md's per-ID Acceptance-criteria bullets were never re-synced: S4 omits aria-command-name (see B2); S14 drops the S12-suppression clause (fails the Mn11 test, test lines 446-458); S39 drops the exact-match-no-normalization clause (fails the Mn8 test, test lines 438-444); S44 omits browser_version/ruleset_tags widening; S1 omits the settle precondition and `tabindex:{enabled:false}` config. Under "spec is SSOT," a builder implementing from spec.md's bullets alone fails four dedicated RED tests.
Fix: Replace spec.md's Acceptance-criteria bullet text for S1 (line 197), S4 (200), S14 (206), S39 (236), S44 (256) with the current verbatim requirements.txt text for each, then diff every CR2-tagged line against its spec.md restatement before freeze.

**B5. A clean/passing route bundle carries the `lane="structural"` discriminator nowhere in the file**
IDs: S22, S23, D6, SN6, S46 (Gherkin "zero violations still passes"), test "M9 (S22 D6)", test "S22 S23"
Test "M9 (S22 D6)" locks the structural bundle's top-level `required` array to deep-equal 0001's `findings.schema.json` `required` (`["run","findings"]`) — so `lane` cannot live at the top level. Test "S22 S23" locks `lane` only inside `finding.required`. For the S45/S46-mandated "genuinely clean, zero violations" case, `findings:[]`, so the emitted bundle contains the string "structural" (or any lane marker) nowhere — S22's own claim ("so no downstream tool can conflate the two axes") is false exactly when it matters most.
Fix: Add `lane` as a required top-level bundle property (const "structural") in schemas/structural-findings.schema.json, alongside the existing per-finding `lane`. Change the M9 test to assert `[...st.required].sort()` deep-equals `[...pe.required, 'lane'].sort()` instead of raw equality.

**B6. 0001's actual report-gate.mjs / ci-diff.mjs silently give a false-clean verdict on a misrouted structural bundle — D6's "structurally impossible" claim is empirically false**
IDs: D6, S22, S23, S30, S37, S38, S45, S46, S47, S48, S53, S54, scripts/report-gate.mjs, scripts/ci-diff.mjs
No requirement instructs 0001's existing report-gate.mjs/ci-diff.mjs to inspect or reject a `lane` field (grep: zero references). Feeding a structural-shaped bundle (findings without an `evidence` array, per the real spike's shape) into report-gate.mjs reproducibly prints `gate: PASS`, exit 0, even carrying a severity-4 axe-critical finding — the zero-evidence drop empties `kept` before any per-finding check runs. ci-diff.mjs similarly cannot catch S53's raw-impact carve-out since `deriveBlocked` on a structural bundle's absent `personas` array returns false. D6 claims two differently-named scripts make misrouting "structurally impossible" — this is a naming convention, not a runtime check, and is contradicted by direct reproduction.
Fix: Add S56/S57 to requirements.txt requiring report-gate.mjs and ci-diff.mjs to exit non-zero with a distinct error message, before any other check, whenever any finding in the input carries a `lane` field — mirroring the CR1-B4 additive-optional-field precedent for `run.route`. Add RED tests invoking the OLD (non-structural-prefixed) 0001 scripts against a structural-shaped fixture, asserting non-zero exit.

**B7. S1's settle precondition doesn't cover CSS-only animation/transition timing, so S21's byte-identical promise breaks at the render layer, and S50's finding_id (excluding result type) hides the breakage even when finding-id sets stay identical**
IDs: S1, S21, S50, S18, S36, S17, S53
MutationObserver never fires again once a CSS class triggering a `transition`/`animation` is applied (compositor-driven style changes aren't DOM mutations), so S1's 500ms quiescence window elapses mid-transition. Two identical-DOM runs can sample different rendered colors, producing genuinely different finding sets (falsifying S21) or, in the milder case, identical finding_ids (S50 excludes result-type from the ID) while severity silently flips 0↔4 between `incomplete` and `violation` — undetected by the spec's only determinism check.
Fix: Amend S1 to also wait for `document.getAnimations({subtree:true})` to return empty before injecting axe (same 10s cap, settle-timeout fallback unchanged). Amend S50 to compute finding_id from route + rule-ID + selector + result-type. Amend S21 to require byte-identical finding RECORDS (id, severity, result-type), not just the finding_id set.

**B8. S1's axe tabindex-rule disablement makes half of S55's cross-namespace equivalence table permanently unreachable in production, and the ONLY S55 test fixture covers exactly that unreachable half**
IDs: S1, S55, S11, S35
S1 disables axe's built-in `tabindex` rule specifically to prevent collision with S11/S35's positive-tabindex check (scrub-log CR2-B13). S55's suppression table names two pairings; the ONLY fixture testing S55 (`structural-cross-namespace-dup-bad.json`) hand-crafts exactly the now-impossible tabindex/positive-tabindex pairing. No fixture anywhere exercises the actually-reachable pairing (landmark-one-main ↔ cannot-evaluate-ambiguous-main) — confirmed by grep across all fixtures. A builder can hardcode suppression logic that never fires against real output and still pass 100% green while the real-world collision case ships unverified.
Fix: Add fixture `structural-cross-namespace-landmark-bad.json` (axe `landmark-one-main` finding + non-axe `cannot-evaluate-ambiguous-main` finding sharing one target_selector) and a corresponding test in acceptance-0002.test.mjs asserting suppression of the axe finding and retention of the non-axe one.

### MAJOR

**M1. S55's tabindex-suppression branch is unreachable dead code — S1 already disables the exact axe rule S55 claims to suppress**
IDs: S1, S55
S1 configures `rules:{tabindex:{enabled:false}}` (CR2-B13, explicitly to avoid this collision), so axe can never emit a `tabindex` finding for S55's suppression logic to act on; the S55 test (lines 460-467) can only pass by hand-authoring an impossible axe finding. Two requirements offer overlapping, unreconciled fixes for the same collision with no statement of which governs.
Fix: Drop the tabindex entry from S55's equivalence table; keep only the landmark-one-main ↔ cannot-evaluate-ambiguous-main pairing. Update the S55 fixture/test to exercise only that surviving pair.

**M2. S49's pinned accname API (axe.commons.text.accessibleText) throws on a raw Element unless an undocumented axe.setup()/teardown() lifecycle is added — verified empirically**
IDs: requirements.txt S49, S15, spec.md HIGH item S49
Loaded the real pinned axe-core 4.12.1 build in Playwright and called `axe.commons.text.accessibleText(el)` both before and after `axe.run()`: both throw `TypeError`. It only succeeds after `axe.setup(document)`, a lifecycle call named nowhere in S49/S15/the brief/scrub-log. The current RED test only regex-matches gate output text, never invoking the real API, so this crash ships undetected.
Fix: Split S49 into S49 (unchanged) and new S49a requiring `axe.setup(document)`/`axe.teardown()` bracket the `accessibleText` call as its own pass, separate from S4's `axe.run()`. Add a fixture/unit test invoking `accessibleText` against a live DOM element.

**M3. S12's bounding-box area method has no specified "visible" filter — hidden elements can silently win or lose the comparison depending on implementation choice**
IDs: requirements.txt S12, scripts/structural-scan.mjs
S12 pins the metric to `getBoundingClientRect` area but `getBoundingClientRect` does not itself filter `visibility:hidden`/`opacity:0` elements (unlike the spike's prior innerText-based metric, which implicitly filtered for free). Two spec-compliant builds can diverge on identical DOM+CSS depending on whether/how they add a visibility check, threatening S21/S42's byte-identical promise independently of B3/B3-style ancestor issues.
Fix: In requirements.txt S12, insert: "excluding any candidate whose computed style resolves display:none or visibility:hidden, or whose getBoundingClientRect reports zero width or zero height," before "by rendered bounding-box area." Apply identically to spec.md line 205.

**M4. S44's CI comparability guard omits render_environment_id even though SN8/D5b explicitly scope S42's determinism guarantee to it**
IDs: requirements.txt S44, SN8, spec.md D5b, test lines 342-355
SN8/D5b state verbatim that "S42's determinism guarantee is scoped to apply only when render_environment_id matches across runs" — font-rendering/glyph-shaping variance can flip a borderline contrast finding or S12's tie-break on byte-identical DOM/CSS. S44's guarded field list (axe_version, browser_version, ruleset_tags) omits render_environment_id, and its test only exercises the three listed fields. A literal S44 implementation treats cross-environment reports as comparable.
Fix: Add `render_environment_id` to S44's guarded field list. Add a fourth fixture/test (`structural-ci-incomparable-render-environment-bad.json`) mirroring the existing three.

**M5. Bypass-mechanism / skip-link check (WCAG 2.4.1) is a named brief §5 MVP-scope MUST-check that never made it into requirements.txt, spec.md, or the scrub-log's cut table**
IDs: S9
DECISION-BRIEF §2b/§5 names bypass-block presence as an in-scope MVP MUST-check (WCAG 2.4.1); requirements.txt has zero occurrence of "skip"/"bypass"/"2.4.1"; spec.md's Non-goals lists 9 cuts, none matching this; scrub-log's cut table (whose stated purpose is to log every cut) has no entry either. This item silently vanished with no decision trail, unlike every other cut item.
Fix: Either add S56 (HIGH/BLOCKS:medium) implementing the brief's bypass-mechanism check, or add an explicit Non-goals bullet to spec.md plus a scrub-log cut-table row naming the deferral reason.

**M6. S26's validity-envelope RED test only asserts "focus order" is present, silently permitting a build that omits the other 2 of 3 mandated non-automatable classes**
IDs: S26
S26 mandates naming at minimum focus order, focus visible, keyboard operability. The only test assertion (line 231) checks `/focus order/i`; "focus visible" and "keyboard operability" appear nowhere else in the test file. A builder can ship an envelope naming only one of three and pass green.
Fix: Add `assert.match(md, /focus visible/i, ...)` and `assert.match(md, /keyboard operability/i, ...)` to the S25/S26/S27/S29 test block.

**M7. S24's cross-lane join key (route) has no shared normalization/format contract between the two independently-invoked lanes**
IDs: S24, S39, D3, test "B4 (S24 D6)"
S39 bans normalization for the structural lane's own selector-map lookup; the two lanes are separate CLI processes with no shared route-derivation code. A trailing-slash/query-string mismatch between two independently-run lane invocations silently zeroes the S24 join with no disclosure — degrading an advisory cross-reference feature with zero test coverage of the mismatch case.
Fix: Require both lane CLIs to derive `run.route` via one shared exported `resolveRoute(pathArg)` module (zero transformation of the underlying value, just guaranteed identical serialization). Add a MUST that the report layer disclose "no cross-lane match found for route X" rather than a silent no-op join.

**M8. S55's cross-namespace suppression is unimplementable/untested for the only pairing that can occur live (landmark-one-main ↔ cannot-evaluate-ambiguous-main)**
IDs: S55, S1, S7, S14, S35, test "S55 (M10)"
S14/S35 never define what target-element selector a `cannot-evaluate-ambiguous-main` finding carries, and axe's `landmark-one-main` is a whole-document check not tied to a specific element. With no pinned selector source on either side, S55's "share one target-element selector" predicate for the live pairing has no defined way to ever evaluate true — so a 0-or-2-main page can legitimately surface both findings at two different severities in one report, the exact double-count S55 exists to prevent.
Fix: Pin `cannot-evaluate-ambiguous-main`'s target_selector to `:root` in both requirements.txt S55 and spec.md; pin the same `:root` selector to a whole-document `landmark-one-main` axe finding. Add a fixture/test pairing the two on `:root` and asserting suppression.

**M9. S46/S48/S54's "any route" CI-block guarantee has no aggregation contract — the gate CLI only ever sees one file**
IDs: S33, S39, S45, S46, S47, S48, S54, structural-scan.mjs, test `sci()` helper
S33/S39 describe a route LIST as input; S45-S48/S54 phrase CI-block conditions as "whenever ANY route's run_status is X" — presupposing simultaneous cross-route visibility. But the actual test-locked invocation contract (`sci()`) and the shipped spike are single-file/single-route only; no requirement or test names a multi-route orchestration entrypoint. A compliant builder can pass every literal test while shipping an unspecified, untested CI wrapper whose off-by-one bug silently checks only the first route.
Fix: Add S56 requiring one documented entrypoint (`structural-ci-gate-all-routes.mjs`) that accepts the full route-list bundle set for one run, exits non-zero if any bundle fails or if fewer bundles were supplied than S39's route-count. Add a matching multi-fixture acceptance test.

**M10. S44's two-report comparability guard has no defined invocation contract anywhere in the spec's CI model, unlike SPEC 0001's explicit baseline/current pattern**
IDs: S44, S30, S37, S38, S46, S48, S52, S53, S54
Every structural CI Gherkin scenario is single-report/absolute; the only S44 "test" fakes a two-report comparison by nesting a `baseline` sub-object inside one JSON file — a shape with no schema field and no real committed-prior-run correspondence. A founder manually diffing two genuinely separate reports after an axe-version bump gets no refusal from the built system, exactly the failure S44 exists to prevent.
Fix: Change structural-ci-diff.mjs's contract to `--baseline <path> --current <path>`, add a matching Gherkin scenario, and rewire the S44 tests/fixtures to pass two separate files instead of one file with a nested fake baseline.

**M11. No requirement bounds axe.run()'s own execution time — S1's 10s cap only bounds the settle precondition BEFORE axe is injected**
IDs: S1, S45, S46, S47, S48
A promise that never settles neither completes nor fails in the JS sense, so S45's "fails to complete" language has no defined trigger point for a hang. No wall-clock bound exists on axe.run() itself; a pathological route could hang the CI gate until an unrelated external CI-runner timeout intervenes, undiagnosed. (Downgraded from BLOCKER: true non-resolving axe.run() promises are rare and CI infra timeouts eventually bound total systemic hang, but the structural lane itself provides zero diagnostic.)
Fix: Add S56 bounding axe.run() itself to a fixed 60s wall-clock max, distinct from S1's settle cap, recording run_status `axe-execution-timeout` on expiry. Add S57 requiring CI to block on that status.

**M12. SN8's render_environment_id is a human-assigned governance label, not a requirement-mandated computed fingerprint — S42/S44's determinism-scoping can be falsely satisfied by unnoticed image drift**
IDs: SN8, S42, S44, S43
SN8 never mandates the container-image label be mechanically derived (e.g. hashed from installed font/OS package versions) rather than hand-typed once. A routine base-image rebuild can silently change font-rendering behavior without anyone filing SN8's decision record, since the label was never wired to actually track that dependency — and separately, S44 (M4) doesn't even check render_environment_id at all, compounding the gap.
Fix: Amend SN8 to require render_environment_id be computed at container-build/lane-startup time as a hash of actually-installed OS + font-rendering-library package versions, not a hand-typed label.

**M13. Behavior lock only covers the JSON-validator half of the lane; the DOM-computation half is completely untested, and the existing spike already violates S12 the way a lazy builder would ship it**
IDs: S1, S4, S5, S6, S7, S12, S14, S15, S16, S17, S18, S19, S21, S30, S35, S42, S49, S50, spec.md:281
All 36 tests drive the gate/diff/render scripts against hand-authored JSON fixtures; none invoke Playwright/axe-core/structural-scan.mjs. structural-scan.mjs currently computes "largest block" via character count (`.trim().length`), the exact method S12 explicitly bans. (Downgraded from BLOCKER: spec.md's own "Known verification gaps" section explicitly discloses this as a deliberate, precedented v2 residual matching SPEC 0001's own accepted gap — not a silent violation. The live repo inconsistency in the spike script itself remains real and unflagged.)
Fix: Before freeze, add at least one live-execution test against structural-scan.mjs (minimal local fixture server + real Playwright/axe run) asserting output against S12/S4/S49's literal algorithms. Rewrite structural-scan.mjs's largest-block computation to use `getBoundingClientRect()` area, not character count.

**M14. S12's literal ancestor-exclusion rule filters the whole candidate set pairwise, not just ancestors of the anchor — self-contradicts CR2-M6's own stated purpose, with no disambiguating fixture**
IDs: S12
Under the literal general pairwise rule, a container anchor (the spec's own `#audiobook-text` example) is an ancestor of its own nested `<p>`/`<div>` candidates and is therefore EXCLUDED from the pool by the very rule meant to protect it, directly contradicting spec.md's gloss ("a compliant anchor is not auto-outranked by its own container"). No fixture encodes a real nested-DOM candidate tree; every S12 fixture carries the verdict as a pre-set flat boolean. (Same root defect family as B3; retained as a separate confirmed finding per the input set, distinguishing the self-contradiction mechanism from B3's unsatisfiability framing.)
Fix: Replace the exclusion clause in requirements.txt S12 and spec.md's S12 criterion with "...except that the declared anchor itself is never excluded by this rule regardless of any candidate it contains." Add fixture `structural-main-content-nested-candidates-ok.json` encoding an anchor container with nested candidate children plus an unrelated sibling, asserting the anchor still wins.

**M15. SN8 (render_environment_id) is explicitly load-bearing for S42's determinism guarantee but carries zero test coverage anywhere in the acceptance suite**
IDs: SN8, S42
Unlike sibling pins SN7/S32/S43, which all have dedicated negative-control/ADR-content tests, grep for "SN8" or "render_environment_id" across acceptance-0002.test.mjs returns nothing. A builder can ship a lane that never emits render_environment_id at all and still pass 36/36, silently voiding the scoping condition S42's cross-machine promise depends on.
Fix: Add fixture `structural-render-environment-id-missing-bad.json` and a negative-control test asserting non-zero gate exit. Extend the existing ADR content-check test to require container/OS/font-rendering-stack language per SN8's own text.

### MINOR

**Mn1. S1 disables axe's tabindex rule specifically to prevent a collision that S55 still mandates suppression logic for — half the equivalence table is dead code**
IDs: S1 (rules{tabindex:{enabled:false}}), S55, scrub-log CR2 (B13 rationale)
Same root cause as M1/B8, restated: scrub-log's own CR2 rationale states the tabindex-rule disable exists "so the built-in tabindex rule cannot collide with S11/S35's positive-tabindex check" — yet S55 (M10) still writes suppression logic for the now-impossible collision, tested only via a fixture that fakes an axe output a real pinned run could never produce. Severity kept MINOR here (distinct from B8/M1's BLOCKER/MAJOR framing) because this instance is scoped purely to spec hygiene/clarity debt: the dead branch is harmless and cheap, and the landmark-one-main pairing in the same table is live and correct.
Fix: Delete the tabindex/positive-tabindex pair from S55's equivalence table, leaving only landmark-one-main/cannot-evaluate-ambiguous-main. Add one clause stating the omission is intentional per S1's rule-disable. Remove the synthetic `axe:tabindex` branch from the fixture and rewrite the S55 test to exercise only the landmark pairing.

**Mn2. The Gherkin scenario tagged S25/S26/S29 under-specifies S25's own "not usable / not good UI" clause, which only the acceptance-criteria table and RED test actually enforce**
IDs: S25
The Gherkin scenario tagged "# S25 S26 S29" (spec.md lines 141-146) asserts the 32%-criteria-count figure, the three non-automatable classes, and the WCAG-conformance disclaimer, but never asserts the "not usable"/"not good UI" sentence that spec.md's own acceptance-criteria bullet (line 216) and the RED test (line 230) both independently require. A builder trusting the Gherkin as complete SSOT ships an envelope missing that clause and only discovers the gap via test failure.
Fix: Add a Then-line to the Gherkin scenario: "And it states that a structural pass is not usable and is not good UI," immediately after the existing WCAG-conformance line.

**Mn3. S55's tabindex/positive-tabindex suppression pairing is unreachable dead code given S1's own axe config — but the gate script is a standalone validator, so this is a documentation gap, not a functional defect**
IDs: S55, S1, S11, S35
Same collision as M1/B8/Mn1, examined from the gate-script's perspective: `sgate()` invokes `structural-report-gate.mjs --check-fixture` directly on arbitrary JSON, confirming the script validates any findings.json input (not solely live-scanner output), so S55's tabindex pairing IS a legitimate defense-in-depth requirement for that standalone script — a builder following S1 and S55 literally hits no actual contradiction in what to build. (Downgraded from MAJOR to MINOR: the scope distinction — scanner-reachable vs. gate-script-standalone-input — is simply never stated anywhere, which is a traceability gap, not a functional or determinism defect.)
Fix: Append to S55's trailing comment in requirements.txt: "NOTE: tabindex pairing is unreachable from an S1-compliant scanner run (S1 disables the axe tabindex rule); it exists for structural-report-gate.mjs's standalone validation of arbitrary findings.json input, not for suppressing scanner-produced output."

**Mn4. Route-level behavior on axe-execution-failed is unspecified for the non-axe DOM checks running on that same route**
IDs: S45, S46, S12, S15
Neither the spec nor requirements.txt states whether non-axe DOM-check findings (S9 landmark, S11 tabindex, S12 main-content containment) are still emitted for a route whose axe run failed but whose DOM was otherwise fully evaluable. Two compliant builders (suppress-everything vs. emit-non-axe-findings-normally) both satisfy S45/S46's literal text since CI blocks either way — a reporting-consistency gap, not a merge-safety one.
Fix: Add S45a to requirements.txt: non-axe DOM checks (S9, S11, S12) that completed before the axe failure MUST still be emitted; only axe-derived findings are omitted for that route. Add a fixture/test proving the "suppress everything" interpretation is non-compliant.

---

## 3) REJECTED

- SN1 vs. S21 "determinism scope" fork: not confirmed — S50 defines finding_id as a pure function over route + rule-id + selector only, explicitly excluding timestamp/random/DOM-node-reference; SN1's "DOM-node-reference instability" is one named instance inside that broader exclusion, not a narrower competing scope, and S51's test mechanically closes any claimed divergence.
- S12 fixed-tag candidate set vs. S39 unrestricted anchor selector "no membership rule": not confirmed — spec.md line 205 ("the anchor is compared only against non-ancestor candidates") frames S12 as a comparison (anchor bbox vs. candidate-set max), not a set-membership/identity check, so a non-whitelisted-tag anchor is fully well-defined to evaluate; the two-reading claim requires ignoring spec.md's canonical elaboration in favor of requirements.txt's terser line alone.

---

## 4) Systemic observations

- **S1/S55 tabindex collision is a five-times-independently-rediscovered defect** (B8, M1, M8, Mn1, Mn3) at four different severities across three rounds — the same root cause (S1's `rules:{tabindex:{enabled:false}}` config makes half of S55's equivalence table unreachable) keeps resurfacing because no single requirement states the scope boundary between "scanner-reachable" and "gate-script-standalone-input." This is a spec-authoring pattern, not a one-off miss: fix once, at the requirement level, not per-finding.
- **S12's ancestor-exclusion clause independently failed twice** (B3, M14) under different attack framings (unsatisfiability vs. self-contradiction) — both converge on the same missing word: "of the anchor" is absent from "ancestor of another candidate element." A single-line fix resolves both.
- **spec.md/requirements.txt desync is systemic, not isolated**: B2 (S4) and B4 (S1/S14/S39/S44) are the same failure mode at different scope — CR2 edited requirements.txt "in place" per its own traceability claim but never re-synced spec.md's per-ID restatement bullets. Any future CR pass MUST diff both documents line-by-line before claiming "edited in place," not just requirements.txt.
- **Two claims were deliberately downgraded from their filed severity_claim after evidence check** (M11: BLOCKER→MAJOR for axe.run() timeout, bounded by external CI infra timeouts in practice; M13: BLOCKER→MAJOR for DOM-computation test gap, because spec.md's own "Known verification gaps" section already discloses it as a precedented, accepted v2 residual matching SPEC 0001). One claim was downgraded MAJOR→MINOR (Mn3, once the gate script's standalone-validator scope was verified). This shows the round's teeth cut both directions — findings are load-bearing on reproduction, not on the severity the attacker asked for.
- **render_environment_id is under-wired end to end**: M4 (S44 doesn't check it), M12 (SN8 doesn't mandate it be computed, not hand-typed), M15 (zero test coverage of SN8 at all) are three independent gaps on the same field. The field was added late (CR2) to close a real font-rendering variance bug and has never received the same test rigor as its sibling pins (S32/S43/SN7).
- **The 0001/0002 boundary is not actually gated at runtime** (B6): D6's "structurally impossible" misrouting claim was falsified by direct reproduction against the real, unmodified 0001 scripts. This is the highest-leverage BLOCKER in the round because it silently defeats the entire CI-gate value proposition of both specs simultaneously, not just 0002's own gate.
