# CHALLENGE ROUND 1 — .swe-spec-0002

## 1. Verdict

**CHANGES_REQUIRED**

- CONFIRMED: 28 (BLOCKER 7 · MAJOR 15 · MINOR 6)
- REJECTED: 4

Spec does not survive as frozen. 7 BLOCKER-level defects — including two spec-internal contradictions on severity assignment (S17 vs S9/S11/S12/S14/S15), an undefined CI-gate/refusal-path composition (S13/S30), an unbuildable cross-lane join (S24's `target_element` field does not exist verbatim in either schema), an unspecified fail-open/fail-closed behavior for a crashing axe run, and two ATDD-lock gaps where the RED suite never asserts gate exit codes (making every "bad" fixture check satisfiable by a no-op stub that always exits 0) — must be fixed before this spec is buildable or freezable.

---

## 2. CONFIRMED defects

### BLOCKER

**B1 — S17's "pure function of axe impact" cannot cover the non-axe deterministic checks S9/S11/S12/S14/S15 mandate**
IDs: S17, S9, S11, S12, S14, S15, S22
S17 requires severity be a pure function of axe's `impact` field, but S9/S11/S12/S14/S15 are deterministic DOM checks with no axe rule ID or impact value, while S22 mandates every finding carry a bounded 0-4 severity — the spike resolves this today by hardcoding severities (a lane-author constant table), directly violating S17's literal, unqualified text, and no test locks a DOM-check severity table into place.
Fix directive: Split S17 into (a) axe-sourced findings map impact→severity as stated, and (b) new S17a giving each DOM check (S9/S11/S12/S14/S15) a fixed, spec-enumerated severity table. Add a RED test asserting each DOM-check code maps to its spec-pinned severity value.

**B2 — CI-gate composition with the refusal path (S13) is undefined; the diagram wires CI straight off the findings file, bypassing the refusal gate**
IDs: S13, S30, S22
The mermaid diagram routes `SJ --> CI{CI gate}` with no dependency on report-gate PASS (unlike SPEC 0001's diagram). S13's refusal (missing expected-main-content selector) produces zero axe critical-impact violations, so `structural-ci-diff.mjs` run standalone (as the test harness invokes it) reports PASS while `structural-report-gate.mjs` separately refuses — a real, reproducible contradiction for that run.
Fix directive: Add S30a — `structural-ci-diff.mjs` MUST block whenever the findings file carries a run-level refused/ungated status (S13), independent of the critical-impact predicate. Update the mermaid diagram to route SJ through the report gate before the CI-gate diamond. Add a RED test calling `sci()` on the S13 refusal fixture and asserting nonzero exit.

**B3 — S17 contradicts the CRITICAL/HIGH non-axe checks (S9/S11/S12/S13/S15) and silently exempts the lane's headline check from the CI gate**
IDs: S17, S9, S11, S12, S13, S15, S30
S17's "pure function of axe impact" leaves S9/S11/S12/S15 (tagged CRITICAL/HIGH, no axe rule ID) with no way to receive severity without inventing an ad hoc value; the spike already violates S17 to satisfy them. Consequently S30's CI gate ("any axe critical-impact violation") can never block on S12's own findings, so `main-content-missing` — the spec's own "headline differentiator" — can never gate CI no matter how severe.
Fix directive: Scope S17 to axe-sourced findings only. Add S17a-S17d giving each non-axe check (S9, S11, S12, S15) a literal fixed severity constant. Amend S30 to also block on "any non-axe finding at severity 4." Mirror in spec.md's Given/When/Then scenarios and acceptance table.

**B4 — S24's join key "target_element" names a field that does not exist, verbatim, in either schema**
IDs: S24, D6, schemas/findings.schema.json
0001's frozen schema has `target_element_identifier` and `target_selector`, never `target_element`; `run` is a bare untyped object with no `route`/`url` field. S24, the spec prose, and the mermaid diagram all mandate joining on `target_element` + `route`. No test in either suite exercises the join, so a builder naming the field per S24's prose produces a cross-reference that can never match a single 0001 finding.
Fix directive: Replace every literal `target_element` in requirements.txt S24 and spec.md (prose + mermaid) with `target_element_identifier`. Add a required `route` string property to 0001's `run` object. Add a test loading a 0001 fixture and a 0002 fixture sharing the same `target_element_identifier`/`run.route` and asserting exactly 1 join match.

**B5 — No fail-open/fail-closed rule when axe.run() itself throws — S30's absolute gate can silently PASS a crashed scan**
IDs: S1, S30, D1
Zero mentions of throw/crash/error/fail-open/fail-closed anywhere in requirements.txt, spec, or brief. The spike's `axe.run()` call has no surrounding try/catch. A builder can catch the throw, emit `axe_violations: 0, findings: []`, and S30 (a pure existence check) reads that as a clean pass — a page where accessibility was never tested ships as advisory-pass.
Fix directive: Add S35 — record `run_status: axe-execution-failed` when axe fails to complete on a route. Add S36 — CI gate MUST block when any route's run_status is axe-execution-failed. Add a Gherkin scenario, a RED fixture (`structural-axe-execution-failed-bad.json`), and a negative-control fixture proving a genuinely clean completed run still passes.

**B6 — Every "bad" fixture assertion in the ATDD lock never checks exit code — a no-op gate that always exits 0 passes the whole suite**
IDs: S4, S5, S6, S7, S9, S11, S12, S13, S14, S15, S16, S17, S18, S19, S21, S22, S23
`.code` is asserted exactly 10 times in the test file, always on the ok/negative-control fixture, never on a `-bad.json` fixture. A gate that ignores its input, prints a static banner containing every keyword the tests regex for, and always `process.exit(0)` passes all 9 gate-based tests plus S30's CI-diff test with zero real axe injection, zero DOM parsing, zero severity computation, and zero refusal logic implemented.
Fix directive: Add `assert.notEqual(x.code, 0, '<reason> (S-ID)')` immediately after the existing regex-match assertion for each of the 15 bad-fixture result variables (unnamed, badAria, failing, unlabeled, twoMain, notInMain, missing, wrongMap, incompleteDropped, drift, blended, critical, badLandmark, posTab, badControl).

**B7 — S30's CI-blocking mechanism (the exit code CI actually reads) is never asserted for the blocking case**
IDs: S30
The blocking-case test at lines 142-148 regexes stdout/stderr for the word "merge"/"blocked" but never asserts `critical.code !== 0`. Real CI decides "block the merge" by exit code, not by grepping text — a `structural-ci-diff.mjs` that always exits 0 while printing static boilerplate satisfies this test and would never actually block a real merge.
Fix directive: Add `assert.notEqual(critical.code, 0, 'the CI gate exits non-zero on a critical-impact violation to actually block the merge (S30)');` immediately after line 145.

### MAJOR

**M1 — S12/S13's singular expected-main-content selector is unreconciled with S33's multi-route audit**
IDs: S12, S13, S33
S33 mandates auditing a route list per run; S12/S13 and the diagram's operator-input node describe one singular selector, and the spike's CLI takes exactly one `--path`/`--main-content` pair per invocation, with no stated route→selector mapping.
Fix directive: Add S33a — the expected-main-content config MUST be a route-to-selector map, one entry per S33 route. Add S13a — the lane MUST refuse per-route when a route has no matching map entry. Update the diagram's operator-input node to say "selector PER ROUTE."

**M2 — S21's byte-identical determinism promise ignores render/paint-timing variance from axe's color-contrast rule**
IDs: S21, S18, SN1, S1
S1 specifies no wait-for-fonts/network-idle precondition before `axe.run()` (spike uses only `domcontentloaded`). Color-contrast can legitimately resolve as violation on one run and incomplete on another purely from paint timing, falsifying S21's "identical DOM snapshot ⇒ byte-identical" guarantee under the exact conditions S21 claims are sufficient.
Fix directive: Replace S1 with a version requiring network-idle + `document.fonts.ready` before axe injection. Scope S21 to apply only once that settle precondition has completed.

**M3 — S20's dedup key is undefined for the non-axe findings S9/S11/S12/S15 require**
IDs: S20, S9, S11, S12, S15
S20 dedups on "axe rule ID + target-element selector," but ~a third of the MVP's CRITICAL/HIGH checks (S9/S11/S12/S15) carry no axe rule ID — only ad hoc `code` strings — leaving their dedup behavior fully unspecified.
Fix directive: Add a new requirement immediately after S20: two non-axe findings sharing the same finding code plus the same target-element selector MUST be deduplicated into one entry.

**M4 — S12's "largest visible text block" has no defined prominence metric**
IDs: S12
The spike computes "largest" by `innerText.length` (character count), ignoring bounding-box area — meaning a short, visually-dominant hero headline can lose to a verbose footer disclaimer, producing an opposite verdict from an area-based implementation on the same common page.
Fix directive: In S12, replace "largest visible text block" with an explicit metric: rendered bounding-box area (`getBoundingClientRect().width * height`), not character count.

**M5 — S15's "carries an accessible name" cites no computation algorithm, unlike every sibling name/role check**
IDs: S15, S4
S4 already runs axe's button-name/link-name rule (real accname algorithm) over every interactive component, including the continue control. S15 defines a second, independent, cruder check (`innerText || value || aria-label`, ignoring `aria-labelledby`/`title`/implicit `<label for>`), risking two contradictory verdicts on the same element in the same report.
Fix directive: Rewrite S15 to reuse S4's axe-based accessible-name result for the continue control rather than computing a second, independent check.

**M6 — 32% coverage figure loses its "vendor-reported, not independently audited" caveat; no test locks it back on**
IDs: S25, spec L27-28, L163, L209, test L131-140
S25's wording attaches "(vendor-reported)" only to the 57% figure; the 32% figure reads as independently authoritative. The RED test only regexes for the numbers, never for "vendor"/"self-report"/"not independently audited" — a report can state both numbers with zero disclosure and pass.
Fix directive: Rewrite S25 to state both figures are vendor-reported by Deque and not independently audited. Apply identical wording to spec.md L27-28/L163. Add RED assertions requiring "vendor-reported" and "not independently audited" literal text in the rendered report.

**M7 — S21's tested determinism scope (axe violation-ids) is narrower than SN1's promised scope (whole finding set); S12's algorithm is undefined**
IDs: S21, SN1, S12, test L111-117
SN1 is never referenced by any test. A builder can hash only the `violations` array (satisfying S21) while the incomplete/severity-0 portion of the finding set silently drifts run-to-run (violating SN1), undetected by the suite. S12's "largest visible text block" remains algorithmically undefined.
Fix directive: Qualify spec L21-22/L126-127's reproducibility claim to "for axe-derived violation-ids." Add a CRITICAL requirement (S35) for non-axe custom-check finding stability plus a RED test. Pin S12's algorithm to bounding-box area post-load with a DOM-order tie-break.

**M8 — S3's hardcoded ruleset-tag list contradicts S31's "configurable WCAG target level without editing lane logic"**
IDs: S3, S31, D4, test L32-43, L164-168
S3 mandates a fixed 5-tag array unconditionally; S31/D4 promise the target level is swappable via config without a logic edit. Nothing specifies how a non-default config value changes which tags axe runs with, and the only RED test checks the default value exists, never that changing it does anything — a builder can hardcode the array forever and ship S31 as dead config.
Fix directive: Define the ruleset tag set as a function of `config/wcag-target.default.json`'s target field. Add a RED fixture that sets a non-default target and asserts the run's reported tags change accordingly.

**M9 — S22's "same findings-schema family" is unfalsifiable as tested — no test diffs the two schema files**
IDs: S22, D6, test L119-129
The only S22 test checks for a `lane` required field and the string "structural" in the schema JSON — nothing checks any structural correspondence with `schemas/findings.schema.json`. A builder can ship a completely unrelated schema shape with a bolted-on `lane:"structural"` const and pass, making D6's "one CI diff handles both" structurally impossible to honor.
Fix directive: Add a test loading both schema files and asserting identical top-level `required` arrays and a shared minimum finding-property set (severity, finding_id, with matching bounds).

**M10 — S17/S18 collision on incomplete results whose axe rule impact is critical is untested**
IDs: S17, S18, S19
requirements.txt's flat S17 text is unscoped enough to plausibly apply to incomplete-derived findings, colliding with S18's severity-0 mandate for the same entry. spec.md's Gherkin scenarios scope S17 to violations only, resolving the collision for a spec.md-literal builder, but no fixture exercises an incomplete result with `impact:critical` to lock the precedence.
Fix directive: Reword S17 to explicitly scope to axe violation results. Add S17a stating incomplete-derived findings are always severity 0 per S18, taking precedence. Add a RED fixture with an incomplete result carrying `impact:critical` asserting severity 0.

**M11 — S21 ("violation-id set") and SN1 ("finding set") cover different scopes — incomplete-item drift is untested**
IDs: S21, SN1, S18, S22
Axe's incomplete classification is genuinely timing-sensitive (documented behavior, e.g. color-contrast). A builder satisfying S21 literally (hash only `violations`) can ship incomplete-result drift between runs on the identical DOM snapshot, violating SN1, with no fixture catching it.
Fix directive: Reword S21 to cover a byte-identical finding-id set across both violations and incomplete results. Add a fixture pair testing incomplete-result stability across two same-input runs.

**M12 — Only axe-core's version is pinned/decision-recorded; the Playwright/Chromium engine that renders the DOM axe measures against is unpinned**
IDs: S1, S2, S21, S32, SN4
`package.json` declares zero dependencies despite the spike importing `playwright` directly — no version pin exists today. S5's zero-rounding 4.499:1 contrast threshold means a routine Chromium/font-rendering change could flip a borderline finding and trip S30's CI gate with no decision-record trail, since S32 only covers axe-core version bumps.
Fix directive: Add SN7 — pin the Playwright browser binary version, recorded in report metadata. Add S35 — any bump of the pinned browser version requires a decision record before use.

**M13 — S13's mandated refusal is asserted only by text, never by a distinguishable refusal effect**
IDs: S13
The only S13 test regexes stdout/stderr for phrase presence, never asserting `missing.code !== 0` or that no gated result was produced. A gate that always accepts every fixture but prints "operator-declared" in a static footer on every invocation passes without ever refusing anything.
Fix directive: Add `assert.notEqual(missing.code, 0, ...)` to the S13 test block, keeping the existing regex and the ok-case negative control.

**M14 — Schema-lock tests check schema TEXT, not runtime enforcement — description-field padding satisfies S2/S3/S22 with zero constraint**
IDs: S2, S3, S22
The only checks are `JSON.stringify(schema)` + regex match for pinned strings — no `const`/`enum` check, no real report-instance validation. A schema using free-text `description` fields containing the pinned values would validate a report with `axe_version: "9.9.9"` or `lane: "persona"` and still pass every test.
Fix directive: Add gate-fixture negative controls (mirroring the existing sgate() pattern) for a wrong-axe-version fixture and a wrong-lane-value fixture, run through the actual gate script, not schema-text regex.

**M15 — The frozen spec's own traceability claim about the test file ("non-constant behavioral assertions") is false on inspection**
IDs: S4, S5, S6, S7, S12, S13, S14, S16, S17, S18, S19, S21, S22, S23, S30
Per B6, 15 of ~20 CRITICAL IDs' bad-fixture assertions are satisfiable by a constant boilerplate stub — directly contradicting spec.md line 228's claim that the RED test references every CRITICAL ID "with non-constant behavioral assertions."
Fix directive: Fix B6 (add exit-code assertions to all 15 bad-fixture branches) before freeze, which makes line 228's claim true. If left unfixed, reword line 228 to accurately disclose the coverage gap.

### MINOR

**Mi1 — SN4 pins viewport width but not height**
IDs: SN4, S21, S12
"height" appears nowhere in requirements.txt or spec.md; only the spike hardcodes 800px. Since S12's "visible" text-block computation and S21's determinism both depend on initial-viewport contents, an unpinned height is a real (if narrow) determinism gap.
Fix directive: Change SN4 to "a single pinned desktop viewport of 1280x800 pixels," matching the spike's existing hardcoded value.

**Mi2 — S27 mandates labeling "DOM-order findings" as best-practice even though the DOM-order check itself is a cut MVP non-goal**
IDs: S27, spec L182, L198, scrub-log L12
S27 references an output category (DOM-order findings) the built lane can never produce, since technique C27 was explicitly cut to v2 — a dangling reference, though the Non-goals bullet sits a few lines below and no test forces the cut feature to be rebuilt.
Fix directive: Delete "DOM-order findings" (and its connecting comma) from requirements.txt S27 and spec.md L182.

**Mi3 — SN1's stated variance source ("model sampling") is vacuous for a lane with zero LLM/model**
IDs: SN1, S19
S19 establishes zero model judgment enters this lane, making SN1's named risk factor (model sampling) inapplicable leftover vocabulary from the persona lane. S21's fixture-based test already carries the substantive determinism enforcement, making this vestigial rather than load-bearing.
Fix directive: Reword SN1 to name DOM-node-reference instability (per the brief's dedup rationale) instead of "model sampling."

**Mi4 — SN2's gate-checks-schema_version claim is proven only against the schema document, never against an executing gate**
IDs: SN2, test L164-172, scripts/structural-report-gate.mjs
The only SN2 test asserts the string "schema_version" appears in the schema document, not that `structural-report-gate.mjs` rejects a fixture with a wrong/missing value — a builder can leave schema_version as inert metadata and never wire it to runtime rejection.
Fix directive: Replace the schema-document assertion with an `sgate()` behavioral pair using missing/wrong-schema_version fixtures asserting nonzero exit.

**Mi5 — CI-diff naming/contract ambiguity: no baseline-vs-current comparison is specified despite "CI diff" naming and D6's "one CI diff handles both"**
IDs: S30, S2, S32
S30 specifies only a stateless single-report gate; the filename/spec language implies baseline comparison (matching SPEC 0001's sibling). If a future baseline-diff feature is built, nothing requires it to check axe-version parity between baseline and current before treating the comparison as meaningful.
Fix directive: Replace "CI diff" with "CI gate" throughout spec.md. Add S36 — a structural CI comparison MUST refuse to treat two reports as comparable when their axe_version metadata differs.

**Mi6 — S32's decision-record gate is satisfied by a one-line placeholder ADR with no content check**
IDs: S32
The only S32 test asserts the ADR file exists, with no content assertion and no linkage to the schema's currently-pinned axe-core version — a builder satisfies it with `echo '# adr' > docs/adr/0005-axe-core-version-pin.md`.
Fix directive: Replace the bare `existsSync` check with a content assertion requiring a `Status: proposed|accepted` line and the exact pinned axe-core version string cross-checked against the scan script's dependency.

---

## 3. REJECTED

- "CRITICAL" spec-priority tag colliding with axe's "critical" impact value: requirements.txt has zero priority tags at all (they live only in spec.md, always prose-disambiguated inline); S30 names "axe critical-impact violation" directly with no data path through requirement-tag metadata — invented ambiguity, not a real reading.
- S21 determinism vs. "identical DOM snapshot" against S1's live-render mechanism: spec.md L208 already extends the disclaimer to S21 itself, and both the brief and the RED test operationalize S21 as a fixture-comparator contract, never a live double-render — the claimed unachievability is false against the actual test design.
- 0001's `report-gate.mjs` silently passing a misrouted structural-findings.json: the acceptance test already names distinct, disambiguated scripts/schemas (`structural-report-gate.mjs`, `structural-findings.schema.json`) and the brief states "never merged" — no literal-spec builder wires the wrong script.
- 0001's `ci-diff.mjs` misreading structural findings via a stray `convergence_tier`: the acceptance test mandates a separate `structural-ci-diff.mjs`, never `ci-diff.mjs`, against structural fixtures — the wrong-file wiring narrated never occurs under spec-compliant behavior.

---

## 4. Systemic observations

- **Severity-assignment is the single largest fault line.** B1, B3, M10 and (structurally) M9 all trace back to S17's unqualified "severity is a pure function of axe impact" colliding with the spec's own mandate that non-axe DOM checks (S9/S11/S12/S13/S14/S15) carry CRITICAL/HIGH-tagged, bounded severity. This is not four independent bugs — it is one under-specified rule surfacing at every place severity is assigned, gated, or CI-blocked on. Fix S17 once, comprehensively (axe-scoped + a fixed non-axe table + incomplete-precedence), and B1/B3/M10 collapse together.
- **The RED suite locks vocabulary, not behavior.** B6, B7, M13, M15 are the same defect at increasing scope: assertions check that certain substrings appear in stdout/stderr, never that the gate actually exits nonzero or refuses output. A single no-op stub that prints a static keyword banner and always exits 0 passes essentially the entire acceptance suite. This is a freeze-readiness-blocking pattern, not a one-off oversight — any future spec in this series needs an exit-code assertion checklist paired with every "-bad.json" fixture as a mechanical rule, not a per-case fix.
- **Composition with the frozen SPEC 0001 sibling is under-specified at every seam.** B2 (CI gate vs. refusal), B4 (join-key field name mismatch), M9 (schema-family unfalsifiable) all show the "compose with, never fuse" design intent was stated in prose (decision brief, D6) but never operationalized into a cross-artifact test. Two specs that are meant to interoperate need at least one test that actually loads both artifacts together.
- **Timing/environment determinism is asserted more strongly than the architecture can deliver.** M2, M11, M12, Mi1 all stem from S21/SN1's absolute reproducibility language running up against a live-Playwright-render architecture with unpinned browser version, unpinned viewport height, and no settle precondition. None individually blocks the MVP, but collectively they mean the lane's "entire value proposition is reproducibility" (spec L21-22) rests on inputs the spec doesn't yet control.
- **The reject rate (4/32 attacks) confirms verification discipline, not laxity** — each rejected claim was checked against actual file contents (test assertions, schema fields, script names) and falsified on the same evidentiary standard applied to confirmed findings, including two cases where the original CONFIRMED severity was itself downgraded on verification (B3's claimed BLOCKER→ still BLOCKER but CI-gate escalation dropped; M10's claimed BLOCKER→MAJOR; Mi2's claimed MAJOR→MINOR). The gate has teeth in both directions.
