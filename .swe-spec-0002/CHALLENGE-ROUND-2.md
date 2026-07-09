# CHALLENGE ROUND 2 — 0002-structural-ui-lane

## 1. Verdict

**CHANGES_REQUIRED**

- CONFIRMED: 25 (BLOCKER 9, MAJOR 14, MINOR 2)
- REJECTED: 5

Spec does not survive as frozen. 9 BLOCKER-severity defects remain implementable/testable inconsistencies that a literal-spec builder cannot resolve without guessing; freeze must not proceed until the BLOCKER set is fixed and the MAJOR set is triaged.

---

## 2. CONFIRMED defects

### BLOCKER

**B1 — D6 "one CI gate handles both" contradicts the frozen test suite's two-script architecture**
IDs: D6, S22, S23, S30/S37/S38/S46, scrub-log CR1 REJECTED #3/#4, acceptance-0002.test.mjs
D6's decision text says "one CI gate handles both" / "one gate script," but the RED acceptance suite hardcodes three new, separate scripts (structural-report-gate.mjs, structural-render-report.mjs, structural-ci-diff.mjs) distinct from 0001's report-gate.mjs/ci-diff.mjs — and scrub-log's own CR1 REJECTED attacks #3/#4 confirm no literal-spec builder wires the 0001 gate. D6's own prose is therefore permanently false against the artifact that actually governs the build.
Fix: Rewrite D6's decision text to say "one schema FAMILY (shared shape via the lane discriminator), enforced by two separate, disambiguated gate scripts (structural-report-gate.mjs/structural-ci-diff.mjs for structural, report-gate.mjs/ci-diff.mjs for persona) so misrouting is structurally impossible" — replacing every "one CI gate" / "one gate script" phrase with the actual two-script architecture the test suite locks in.

**B4 — S1's "network-idle" settle precondition can hang forever on the exact pages this lane targets**
IDs: S1, S45, S46
"network-idle" never fires on pages with analytics beacons, chat widgets, or polling — exactly the SaaS signup/checkout routes this lane audits. No timeout, fallback wait, or run_status value exists for a settle precondition that never resolves; S45/S46 only cover axe.run() itself failing, not a pre-axe hang. A realistic class of routes never produces a report at all.
Fix: In requirements.txt S1, replace "MUST wait for network-idle, document.fonts.ready to settle" with "MUST wait for the page load event, document.fonts.ready, and a 500ms DOM-mutation quiescence window, capped at a fixed maximum wait of 10 seconds." Add S47: "The structural lane MUST record the run_status value settle-timeout for any route where the S1 settle precondition does not complete within its maximum wait." Add S48: "The structural CI gate MUST block a merge whenever any route's run_status value is settle-timeout."

**B5 — S15 requires an accessible-name string sourced from S4, but S4's six rules never produce that string**
IDs: S15, S4
S4's six named axe rules (button-name, link-name, input-button-name, select-name, aria-required-attr, aria-valid-attr-value) are pass/fail existence checks, verified directly against axe-core 4.12.1 — none returns a resolved accessible-name text value. A builder implementing S15 literally must either silently build a second accname engine (which S15 forbids) or reach into axe's undocumented internals.
Fix: Replace S15's "accessible name taken from the S4 axe accessible-name result rather than an independent, cruder name computation" with "accessible name computed via axe-core's exposed accname engine, axe.commons.text.accessibleText(node), on the same pinned axe-core 4.12.1 build used for S4's rule checks — no separate/independent accname implementation." Add this as an explicit S4a sub-clause naming axe.commons.text.accessibleText as the required accessible-name source.

**B9 — S4's closed rule list has no accessible-name source for role=button controls that S15 explicitly permits**
IDs: S4, S15
Verified live against the pinned axe-core 4.12.1: button-name's selector is literally "button" (native elements only); the rule that actually matches role="button"/"link"/"menuitem" is aria-command-name, which is absent from S4's six-item list. S15 explicitly permits "an element exposing role button" as a valid continue control, but for that case none of S4's rules produce a name to source from.
Fix: In S4, append aria-command-name to the closed rule list (after aria-valid-attr-value). In S15, replace "carries an accessible name taken from the S4 axe accessible-name result rather than an independent name computation" with "carries an accessible name taken from the S4 axe accessible-name result, sourced from button-name/link-name/input-button-name/select-name for native controls or aria-command-name for role-based controls, rather than an independent name computation."

**B13 — Positive-tabindex fires twice with contradictory severities (axe built-in rule vs S11/S35 custom check)**
IDs: S3, S11, S17, S35, S20, S41, S30, S38
Live-verified against pinned axe-core 4.12.1: axe's own built-in "tabindex" rule (tag best-practice, always in-scope per S3) fires on `<button tabindex="3">` with impact:serious → severity 3 per S17. S11/S35 independently mandate a custom check for the same defect, pinned to severity 1. S20 (dedup by axe rule ID) and S41 (dedup by finding code) are disjoint namespaces that cannot merge them — one physical defect persists as two findings with contradictory severities, falsifying S17's "pure function" claim.
Fix: In requirements.txt, edit S1 to add: "The axe-core run MUST be invoked with rules: { tabindex: { enabled: false } } to disable axe's built-in 'tabindex' rule, making S11's deterministic DOM check the sole source of positive-tabindex findings."

**B16 — finding_id has no required deterministic-derivation rule; the "byte-identical" promise is satisfiable by luck only**
IDs: S21, S42, SN1, S20, S41
Nothing constrains how finding_id is computed. A builder wiring `crypto.randomUUID()` per finding satisfies every stated dedup rule while violating S21/S42/SN1's byte-identical-set promise — and the S21/S42 acceptance tests only compare two hand-authored fixture files, never re-invoke the actual ID-generation code path, so this can ship undetected (spec.md itself admits the determinism invariant is "not proven end-to-end").
Fix: Add S44: "finding_id MUST be computed as a pure deterministic function of the route, the axe rule ID or non-axe finding code, and the target-element selector only, excluding any run-timestamp, random value, or DOM-node-reference component." Add S45: "The S21/S42/SN1 acceptance tests MUST invoke the actual finding_id generation function twice against the same synthetic DOM fixture input and assert the two returned finding-id sets are set-equal, in addition to the existing gate-fixture comparator tests."

**B17 — S30's "independent of the severity mapping" block predicate collapses to severity==4 for the real merge-blocking gate**
IDs: S30, S17, S22, SN2
Every fixture in the repo pairing impact:"critical" also pairs severity:4 — no negative control exists where impact is correctly critical but severity is wrongly mapped. S30's actual merge-blocking implementation (structural-ci-diff.mjs) can be built as literally `severity === 4`, which passes every current test while making a latent bug in the S17 severity-mapping function invisible to the one check meant to catch it.
Fix: Add requirement — "The structural-ci-diff.mjs CI gate MUST evaluate the S30 critical-impact block predicate against each axe-sourced finding's raw impact field, never against its derived severity integer." Add fixture structural-critical-impact-severity-mismapped-bad.json carrying source:"axe", impact:"critical", severity:3, and an acceptance-test assertion that the CI gate still blocks.

**B18 — S1's settle precondition doesn't cover hydration/ARIA-write completion; a critical-impact finding can flip violation↔incomplete run-to-run on identical code**
IDs: S1, S16, S17, S21, SN1, S30, S36
A framework-mounted widget's ARIA state (S16's own target) can still be writing tens-to-hundreds of ms after network-idle fires — pure CPU/microtask timing, not covered by S1's fonts/network-only settle definition. Run A catches it pre-write (critical violation, S30 blocks); Run B on identical code catches it post-write (clean or incomplete/severity-0, non-blocking). spec.md's own "Known verification gaps" concedes this exact class is unclosed and deferred, while S30 consumes live per-run output directly — CI merge-block status can flip on zero code change.
Fix: Amend S1 to append a third settle precondition: after network-idle and document.fonts.ready settle, the lane MUST wait for a DOM-mutation-quiescence window of at least 200ms observed via MutationObserver with zero mutations recorded before injecting axe-core.

**B25 — S35's 9-entry fixed severity table is behaviorally locked for only 1 of 9 finding codes**
IDs: S35, S38, acceptance-0002.test.mjs:128-135
The only S35 test exercises main-content-missing (severity 4); the other 8 codes (continue-control-missing, main-content-not-in-main, cannot-evaluate-ambiguous-main, continue-not-semantic, continue-not-focusable, main-content-not-prominent, unlabeled-landmark-section, positive-tabindex) have zero wrong-severity fixtures. A builder can invert any of the other 8 mappings — including silently letting continue-control-missing (severity 4) escape S38's CI block — and pass the entire suite.
Fix: Replace the single-fixture S35 test with a loop over all 9 finding codes: one fixture per code with severity set one below its pinned value, asserting sgate() exits non-zero and names that specific code. Keep one negative-control fixture carrying all 9 codes at correct severities.

### MAJOR

**M2 — A critical-impact axe finding that lands in `incomplete` can never CI-block, and this is undisclosed**
IDs: S18, S30, S36, S45/S46, D1 rationale
S18/S36 force every axe `incomplete` entry to severity 0 regardless of original impact; S30's block predicate is scoped to `violations` only, and axe's own taxonomy makes `violations`/`incomplete` mutually exclusive. A reproducible critical-impact `incomplete` result (confirmed as intended by the test suite's own negative control) sits forever as a severity-0 line CI can never escalate on — silently contradicting D1's own "reproducible fact worth blocking on" rationale, with no D7-style disclosure naming the carve-out.
Fix: Add S47: "The CI gate MUST block a merge whenever any axe incomplete finding's underlying impact field is critical, independent of the S18/S36 severity-0 display value." Flip the existing negative-control fixture accordingly, or — if intentional — add a named D7 decision disclosing the carve-out and its rationale.

**M3 — S40's per-route selector-map refusal has no CI-blocking wiring and zero test coverage**
IDs: S13, S37, S39, S40, acceptance-0002.test.mjs
S37's block predicate is textually scoped to S13's run-level refusal only; S40's per-route refusal (map exists but missing one route's entry) is never named as producing a blockable status, and grep confirms zero fixtures/assertions exercise S39/S40 beyond a bare comment. A route can silently go unaudited while CI passes clean.
Fix: Add S47: "The structural CI gate MUST block a merge whenever any audited route's findings carry the S40 route-level refused status." Add fixture structural-partial-route-map-bad.json (one of several routes unmapped) and an sci()-driven test asserting non-zero exit.

**M6 — S12's bounding-box "largest visible block" test is structurally biased by ancestor/descendant nesting**
IDs: S12
The natural candidate set (main, article, section, div, p, h1) is full of ancestor/descendant pairs whose bounding-box areas are near-inevitably ordered by nesting. Read strictly, a compliant anchor nested in `<main>` almost always loses to its own container (false-positive avalanche); read with the spike's containment collapse, the check becomes nearly vacuous. Spec never states which reading is intended, so two compliant builds diverge on the same DOM.
Fix: In S12, replace the candidate set with "all elements matching main,article,section,div,p,h1 EXCLUDING any element that is an ancestor of another candidate element," measured by bounding-box area, ties by DOM order. Add a spec.md sentence stating containment does not imply equal-or-greater prominence.

**M7 — S44's cross-report comparability guard checks axe_version only, ignoring browser_version drift the spec's own D5b rationale names as comparability-breaking**
IDs: S44, SN7, S43
D5b justifies pinning the browser binary because "a font/rendering change in an unpinned browser can flip a borderline finding" — a comparability failure. S44's guard inspects only axe_version, so two reports with identical axe_version but different Chromium builds pass as comparable, defeating the exact mechanism S44 exists to guard against.
Fix: Replace S44 with: "A structural CI comparison MUST refuse to treat two reports as comparable whenever their axe_version metadata values differ or their browser_version metadata values differ." Add a test asserting non-zero exit when axe_version matches but browser_version differs.

**M10 — The axe/non-axe dedup boundary cannot merge one physical defect flagged by both an axe rule and a custom check (two verified instances)**
IDs: S11, S35, S20, S41, S3, S7, S14, S17
S20 dedups by axe rule ID + selector; S41 dedups by finding code + selector — disjoint identity spaces. Verified against pinned axe-core: the "tabindex" rule (serious→3) duplicates S11/S35's positive-tabindex (severity 1); "landmark-one-main" (moderate→2) duplicates S14's cannot-evaluate-ambiguous-main (severity 3). Each physical defect emits two undeduplicated, contradictory-severity entries, double-counting the exact currency (S25) the report is mandated to treat skeptically.
Fix: Add S43: "For each defect-class pair listed in a fixed cross-namespace equivalence table (tabindex axe rule ID paired with positive-tabindex finding code; landmark-one-main axe rule ID paired with cannot-evaluate-ambiguous-main finding code), when both an axe finding and a non-axe finding share the same target-element selector, the non-axe finding MUST be emitted and the axe finding MUST be suppressed from the report."

**M12 — SN4's viewport pin is stated two different ways across the two frozen-together artifacts**
IDs: SN4
requirements.txt SN4 pins "1280x800 pixels" (both dimensions, tagged CR1-Mi1 — deliberately fixed to close a determinism gap); spec.md's own SN4 acceptance-criteria bullet restates it as "1280px width" only, silently dropping height. Height feeds directly into S12's bounding-box prominence computation and axe's visibility-dependent checks — exactly the variance CR1-Mi1 was written to eliminate.
Fix: In spec.md's SN4 acceptance-criteria bullet, change "a single pinned desktop viewport of 1280px width" to "a single pinned desktop viewport of 1280x800 pixels" to match requirements.txt verbatim.

**M14 — D6 "one CI gate handles both" is contradicted by the spec's own architecture diagram and by the actual two-script names in the requirements**
IDs: S22, S23, S34
The spec's mermaid diagram routes only the structural artifact through RG/CI diamonds; the persona artifact bypasses them entirely and already has its own independent 0001 gate. Grepping the frozen 0001 scripts for "lane" returns zero matches — no code implements a shared gate. D6's rationale clause is unsupported editorializing contradicting the spec's own diagram.
Fix: In the D6 row of the Decisions table, delete "one CI gate handles both" from the Decision cell and delete "one schema family + one gate script keeps the two lanes reportable side by side" from the Rationale cell, replacing it with "one schema family keeps the two lanes reportable side by side" (schema-family sharing only).

**M15 — The canonical S24/B4 cross-lane join fixture is itself an S40 violation**
IDs: S24, S39, S40
structural-join-0002.json — the sole fixture proving the S24 cross-lane join — declares route "/pricing" as a live "completed" gated result, but its expected_main_content map only covers "/signup." Per S40 this exact combination must be refused, not gated. No other fixture exercises the partial-map-missing-this-route case at all; the one artifact meant to prove S22-S24 works is a live counterexample to S40.
Fix: Add "/pricing" to structural-join-0002.json's expected_main_content map (or change run.route to "/signup"). Add a new dedicated S39/S40 test using a non-empty-but-incomplete map distinct from the existing fully-empty-map S13 test.

**M19 — S44's comparability guard omits browser_version and ruleset_tags/wcag_target, both of which change findings independent of axe_version**
IDs: S44, S43, SN7, S3, S31
D5b's own rationale for pinning the browser binary names exactly this failure class; S43/SN7 gate browser bumps with a decision record but S44 never checks browser_version equality before declaring reports comparable. S31 makes wcag_target swappable via config with no decision-record gate at all, and S44 doesn't check that dimension either — a silent config edit changes which rules ran without tripping the comparability guard.
Fix: Replace S44 with: "A structural CI comparison MUST refuse to treat two reports as comparable whenever their axe_version, browser_version, or ruleset_tags metadata values differ between the two reports." Add three negative-control fixtures/tests (axe_version, browser_version, ruleset_tags mismatches), each asserting non-zero exit and a message naming the mismatched field.

**M20 — SN4 pins viewport pixels only; nothing pins the OS/font-rendering stack, so cross-machine font substitution can flip S12's layout-dependent winner**
IDs: SN4, S12, S21, S42, SN7
Headless Chromium delegates glyph shaping to the host's OS text stack; SN7 pins the browser binary but nothing pins font-rendering. Sub-pixel line-wrap differences across machines can flip S12's "largest block by area" tie-break on byte-identical DOM/CSS — exactly the run-to-run variance SN1/S42 promise against. (Note: the color-contrast/pixel-sampling half of the original claim was verified false against actual axe-core source and is not part of this finding.)
Fix: Add SN8: "The structural lane MUST run inside a single documented container image pinning the OS and font-rendering-library versions, recorded in report metadata as render_environment_id, with a decision record required to change it." Update D5b's closure claim to reference SN7 + SN8 together, and scope S42's determinism guarantee to apply only when render_environment_id matches across runs.

**M21 — The S25/S26/S27/S29 validity-envelope test never checks exit code and has zero negative control**
IDs: S25, S26, S27, S29, acceptance-0002.test.mjs:209-221
The sole test for these CRITICAL disclosure requirements only regex-matches stdout text against one always-identical fixture — never asserts `.code`, never exercises a second differential fixture. A renderer that ignores argv and emits a hardcoded constant banner (copying the disclaimer strings verbatim) passes every run regardless of input, directly contradicting the test file's own header claim that every fixture drives asserted exit-code behavior. Downgraded from BLOCKER because the S25/S26/S27/S29 disclosure text is legitimately static boilerplate — no per-report scoring/gating computation is put at risk.
Fix: Add `assert.equal(srender('structural-valid.json').code, 0, ...)` for the positive case. Add a second differential fixture (e.g. wrong axe_version/wcag_target or stripped validity_envelope) rendered and asserted to produce different/refused output, proving the renderer reads its input.

**M22 — S41's dedup test assertion is a tautology (`typeof code === 'number'`), reintroducing the exact vocabulary-not-behavior defect CR1 claims to have eliminated**
IDs: S41, acceptance-0002.test.mjs:267-272
This assertion is true whether the gate correctly dedups, silently emits duplicates, or throws — run() always returns a numeric code. A builder implementing zero non-axe dedup logic passes trivially, on S41 — the very requirement CR1 itself added (M3) to close the S20 gap.
Fix: Replace the assertion with `assert.notEqual(dupe.code, 0, ...)` against a fixture with two non-axe findings sharing code + target_element_identifier, plus a negative control where they're correctly collapsed and the gate passes.

**M23 — S39/S40 have zero dedicated behavioral test; the canonical join fixture is a live counterexample**
IDs: S39, S40, S24, structural-join-0002.json, acceptance-0002.test.mjs:102, :197-207
The only S39/S40 reference is a comment on the S13 test, whose fixture encodes total map emptiness — S13's scenario, not S40's ("map exists, this route missing"). A builder satisfies the whole suite with a single global-emptiness check and never implements per-route lookup. The frozen "golden" join fixture itself has no entry for its own audited route, which a correct S40 implementation must reject.
Fix: Add a dedicated "S39 S40" test using a fixture with entries for other routes but not the audited one, asserting refusal, plus a negative control. Add the missing "/pricing" entry to structural-join-0002.json's map. Correct the misleading "per S39/S40" comment on the S13 test.

**M24 — S1 is the only CRITICAL requirement with zero gate/fixture exercise of any kind**
IDs: S1, acceptance-0002.test.mjs:40-51
S1's only test regex-checks schema file text for field names — it never runs a fixture through sgate()/srender()/sci() to proxy-verify the settle precondition or injection behavior. Every other CRITICAL id (25 of them) has at least one behavioral fixture pair. The current spike still hardcodes `waitUntil:'domcontentloaded'` — the exact gap CR1-M2 said to close — and nothing in the suite would catch it.
Fix: Add a required boolean field `metadata.settle_precondition_met` to the schema; add fixture structural-settle-precondition-not-met-bad.json with it set false; add a test asserting sgate() on it exits non-zero.

### MINOR

**Mn8 — S39/S40's route-to-selector map has no defined route-key equality rule**
IDs: S39, S40
Neither requirement defines route-key normalization (trailing slash, case, query string). A map key "/signup" vs invocation "--path /signup/" produces a spurious, CI-gating S40 refusal for what is obviously the same route, purely from implementation-specific string handling never pinned by the spec.
Fix: Replace S39's text with an exact-match rule: "keyed by exact case-sensitive match against the operator-supplied --path argument verbatim, with no trailing-slash or query-string normalization applied." Add a fixture proving a trailing-slash mismatch triggers S40 refusal under the stated rule.

**Mn11 — No stated precedence when a declared selector is absent AND main-landmark count is ambiguous at the same time**
IDs: S12, S14, S35, S38
requirements.txt read alone leaves ambiguous whether S14's fail-closed suppresses S12's entire found/inside/prominent act or runs alongside it, and no fixture exercises the joint case. Substantially defused by spec.md's own Gherkin scenarios and the shipped fixture's single-finding shape, which already point to the intended precedence — downgraded from a build-dependent-CI-divergence claim to a documentation-completeness gap.
Fix: Append to S14: "...never a false pass, and this suppresses the entire S12 found/inside/prominent evaluation for that page (no main-content-missing or other S12-derived finding is emitted when main-landmark count != 1)." Add one joint fixture and an assertion that its findings array excludes main-content-missing.

---

## 3. REJECTED (proves teeth)

- **S14/S35 zero-main "main-content-missing" collision** — REJECTED: spec.md's S12 Gherkin scenario explicitly preconditions on "exactly one main landmark," so S14's count-gate short-circuits before S12 can run; only test coverage of count=0 is missing (minor gap), not a spec contradiction.
- **S7 (axe landmark-one-main, sev 2) vs S14/S35 (cannot-evaluate-ambiguous-main, sev 3) "duplicate" severities** — REJECTED: these are deliberately distinct artifacts per the decision brief's no-merged-severity design principle, already re-litigated and closed in CR1, and the acceptance test already groups them into one pass/fail scenario requiring no reconciliation.
- **S21/S42 "no pinned finding_id hash formula" as an independent feasibility gap** — REJECTED as separately framed: this exact "S21 unachievable" attack is already disposed of in scrub-log CR1 item #2 and disclosed as an accepted MVP scope boundary in spec.md's "Known verification gaps"; resurfacing without new evidence is re-litigation.
- **0001's report-gate.mjs silently misrouting a structural bundle** — REJECTED: verbatim re-raise of scrub-log CR1 REJECTED #3; the suite names disambiguated scripts, no literal-spec builder wires the 0001 gate.
- **0001's ci-diff.mjs misreading structural findings via stray convergence_tier** — REJECTED: verbatim re-raise of scrub-log CR1 REJECTED #4; a spec-compliant builder must build the separate structural-ci-diff.mjs, so the scenario never occurs under compliant behavior.

---

## 4. Systemic observations

- **Recurring pattern: decision-table prose lags the binding test artifact.** Three separate attacks (B1, M14, and the general D6 framing) converge on the same root cause — D6's headline "one CI gate handles both" was never updated after the acceptance suite committed to two disambiguated scripts. Fix once at the source (D6 row) rather than patching each symptom.
- **Recurring pattern: CRITICAL requirements with thin or zero behavioral exercise.** S1 (M24), S25/S26/S27/S29 (M21), and S41 (M22) all show the same shape — a test that "runs" but structurally cannot fail on the behavior it claims to lock. Given S35 (B25) shows the same shape at 8/9 codes unexercised, a suite-wide audit for `assert.ok(typeof code === 'number')`-style tautologies and text-only fixture checks is warranted before freeze, not just per-finding patches.
- **Recurring pattern: axe-core's actual rule surface was under-modeled.** B9 (aria-command-name missing from S4), B13 (tabindex dedup collision), and M10 (landmark-one-main dedup collision) all stem from the spec's S3 "best-practice" tag inclusion pulling in axe rules that were never cross-checked against the custom-check set. A single reconciliation pass against axe-core's actual rule registry (as done ad hoc in B9/B13/M10) would have caught all three at once.
- **Determinism claims (S21/S42/SN1) are asserted at the fixture-comparator level but consumed live at the CI-gate level (S30).** B16, B18, M12, and M20 each independently locate a live-timing or environment-pinning gap that the fixture-based determinism tests cannot see because they never invoke the real generation/render path. This is the single largest concentration of BLOCKER/MAJOR findings in this round and suggests determinism needs a live double-run proof, not just a fixture contract, before the "reproducibility is the lane's entire value proposition" claim is trustworthy.
- **The REJECTED set shows genuine review discipline, not rubber-stamping.** 2 of 5 rejections are exact re-raises of claims scrub-log already closed in CHALLENGE-ROUND-1 (report-gate.mjs/ci-diff.mjs misrouting); the other 3 required actually reading spec.md's Gherkin scenarios (not just requirements.txt) or the decision brief to find the resolving text — confirming the spec's redundant artifacts (requirements.txt + spec.md + scrub-log + brief) are doing real disambiguation work when read together, even though several CONFIRMED findings show requirements.txt alone remains under-specified.
