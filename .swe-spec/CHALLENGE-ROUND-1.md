# Challenge Round 1

## 1. Verdict

**CHANGES_REQUIRED** — 29 attacks CONFIRMED (26 distinct defects after merging 4 independently-converged findings on the same F92 defect into one entry), 2 attacks REJECTED.

| Severity | Distinct defects |
|---|---|
| BLOCKER | 10 |
| MAJOR | 12 |
| MINOR | 4 |
| **Total confirmed** | **26** |
| Rejected | 2 |

Freeze is blocked on the 10 BLOCKER items. 5 of the 29 raw attacks (across contradictions / operator-hostility / methodology / evidence-fidelity lenses) independently converged on the identical F92 persona-role defect — see systemic observation §4.1.

---

## 2. CONFIRMED defects

### BLOCKER

**F92 finding_id hash includes persona_role, structurally breaking F45/F46 cross-persona merge and F17 convergence_tier — confirmed independently by 4 lenses (contradictions, operator-hostility, methodology, evidence-fidelity)**
IDs: F45, F46, F17, F92, D12, F72, F73
Failure story: F45 defines "same underlying finding" via a 3-field tuple (heuristic_tag, step_index, target-element identifier) that deliberately excludes persona, so F46 can merge cross-persona records into one entry and F17's convergence_tier can count distinct personas. F92 hashes finding_id from 4 inputs including persona_role, so the same real bug flagged by two personas gets two different finding_ids by the spec's own identity function — merge is structurally impossible, convergence_tier collapses to 1 for every finding, and D12 asserts the two functions are equivalent when they share zero fields verbatim.
Fix directive: Replace F92's hash inputs with F45's exact 3-field tuple (heuristic_tag, normalized_step_id, target_element_identifier), no persona_role. Update D12 to state persona attribution lives only in the merged entry's evidence-pointer array (F46), never in the identity key. Add a fixture proving two same-tuple findings from different personas produce one finding_id and convergence_tier=2.

**F26's literal "exit nonzero ONLY when new severity-4" wording lets CI pass green on a BLOCKED run with near-zero coverage**
IDs: F26, F49, F53, F54, F16
Failure story: ci-diff.mjs (the only script that implements "CI mode") is a pure severity-4 diff with zero run_status awareness; report-gate.mjs enforces BLOCKED disclosure but nothing wires it into ci-diff.mjs's exit code, and no fixture tests the BLOCKED+matching-baseline combination. 2 of 3 personas crash, the 1 survivor finds nothing new vs baseline → ci-diff.mjs exits 0 → a CI pipeline gating only on ci-diff.mjs goes green on a run that audited almost nothing.
Fix directive: Add F101 to requirements.txt: "CI mode MUST exit nonzero when the run's run_status field is BLOCKED." Add acceptance-test fixture pairing BLOCKED run_status with baseline-matching findings content, asserting ci-diff.mjs still exits nonzero, plus a negative control on a completed run.

**F43/F44 screenshot redaction is untestable-as-specified — the RED test lets a non-compliant builder pass (false-green gate on a CRITICAL safety requirement)**
IDs: F43, F44, spec.md:126-129, test/acceptance.test.mjs:190-195
Failure story: spec.md's Gherkin scenario requires the on-disk screenshot's rendered pixels be free of the raw token, but the only test exercises a `captured_text` JSON sidecar field on DOM-type evidence — no PNG/OCR check exists anywhere, and no fixture even has a "screenshot"-type evidence entry. A builder can regex-redact `captured_text` and never touch pixels, shipping visible unredacted credentials in every screenshot while the suite passes 100%.
Fix directive: Add a `captured_text` sidecar metadata field to screenshot-type evidence (not OCR'd pixels — out of MVP scope) and require F43 redact it before disk write. Add test/fixtures/evidence-secret-leak-screenshot.json + assertion giving F43 its own RED test distinct from F44's. Reword spec.md:126-129 to match the metadata-only scope and name real pixel redaction as a named v2 residual risk.

**F45/F46 dedup key "target-element identifier" is undefined and unstable on real dynamic DOM, corrupting convergence tiers**
IDs: F45, F46, F17, spec.md:168
Failure story: No artifact defines how "target-element identifier" is computed (CSS selector? XPath? accessible name?). UNKNOWNS-DELTA.md DR-06 names this gap explicitly but the ambiguity was carried unresolved into F45/F46. F88 mandates zero shared session state across persona browser profiles, so structurally different DOM can render around the identical bug for different personas — any positional/structural identifier scheme assigns different identifiers to the same real bug, silently defeating F46's merge and corrupting F17's convergence_tier, the exact reliability signal the ≥3-persona floor exists to produce.
Fix directive: Add F45a defining a priority-ordered fallback: data-testid > accessible name+role > stable id attribute > innerText-anchored CSS path, computed identically regardless of persona/account state. Add a validity-envelope disclosure that convergence tiers can undercount on apps without stable selectors. Extend the F45/F46 test with a fixture pair using structurally-different DOM snapshots of the same control, asserting merge still lands at tier ≥2.

**F92's "friction semantic key" hash input is undefined and, if narrative-derived, self-contradicts F72's "independent of ledger text" clause**
IDs: F92, F73, F74, spec.md:137-142
Failure story: "friction semantic key" is not defined as a data field anywhere; the only plausible source is the persona's free-text friction narrative. DR-21/F70 already establish personas rephrase narrative nondeterministically across reruns, and DR-35's own stated rationale is preventing exactly that rephrasing from changing finding_id. A literal implementer hashing narrative text reproduces the failure DR-35 was written to prevent: identical bug reworded across reruns → different finding_id → CI reports spurious "new" findings every rerun, defeating F26/N4's CI-dogfood promise. Zero test coverage of finding_id or reworded-text-same-id behavior exists.
Fix directive: Add F93 requiring a `semantic_key` field selected by the persona at logging time from a fixed closed taxonomy (e.g. detour / dead-end / hidden-control / unexpected-result / repeated-attempt), never derived from free-text narrative. Mirror into spec.md D12. Add a test: identical (persona_role, heuristic_tag, step, semantic_key) with different narrative text produces the same finding_id; differing semantic_key produces different finding_id.

**Denylist file (F37/F38) is a mandatory, blind, unschemaed authored artifact — the exact operator-DX failure DR-28 already fixed for tasks, left unfixed here**
IDs: F37, F38, F83 (DR-28), ADR-0001:22
Failure story: `--denylist <file>` is required to start any run, but zero requirement anywhere defines its format (JSON array? regex list?), and no test exercises the raw file — only report-gate.mjs's internal synthesized run-config shape. Unlike tasks (F83, shipped example + schema) and personas (F5, full schema), the founder's first run following the shipped example tasks file abandons at the single highest-severity gate (UNKNOWNS-DELTA.md's own words) with nothing to copy.
Fix directive: Add F38b (ship `denylist/default-destructive-labels.json` + `schemas/denylist.schema.json`, referenced by name in SKILL.md) and F38c (denylist file MUST validate as a non-empty JSON array of strings, exit nonzero otherwise). Keep F37's "operator-supplied" wording unchanged — passing the shipped default still satisfies it.

**CLI acceptance tests omit ADR-0001-required flags, and no validation-order rule exists — the frozen test suite can fail a fully spec-compliant build**
IDs: test/acceptance.test.mjs:41-47, test/acceptance.test.mjs:98-109, docs/adr/0001-runner-cli-contract.md:20-22
Failure story: ADR-0001 marks --i-own-this-target, --env, --denylist unconditionally required, but the F16/F17 test omits all three while asserting a persona-count-specific stderr message. A builder validating required flags in the ADR's own table order would legitimately refuse on the first missing safety flag before ever reaching the persona-count check — failing the test on a fully ADR-compliant build, purely as a coin-flip on unstated check order.
Fix directive: Add a "required-flag validation order" clause to ADR-0001 (url → tasks → i-own-this-target → env → denylist → persona-count, each refusal naming only its own rule). Update the F16/F17 test invocation to pass all upstream-required flags so the persona-count refusal is isolated deterministically.

**The entire safety/refusal layer (F37-F58, ~14 CRITICAL requirements) is behavior-locked only against a schema-less invented fixture format, never against live runner/persona behavior**
IDs: test/acceptance.test.mjs:163-243, test/fixtures/run-config-no-denylist.json, test/fixtures/payment-no-testmode.json, requirements.txt F37-F58
Failure story: All 10 tests covering F37-F58 route exclusively through `report-gate.mjs --check-fixture`, never through run-gauntlet.mjs. The "run bundle" JSON shape has zero schema authority anywhere in the repo. A builder can pass all 10 tests by pattern-matching this invented shape in report-gate.mjs while never implementing real in-browser denylist-abort, payment-test-mode refusal, robots.txt loading, or evidence redaction — the freeze would certify ~14 CRITICAL safety behaviors as tested when the live code path is never exercised.
Fix directive: Either (A) add schemas/run-bundle.schema.json + a new requirement naming this a named, explicit MVP residual risk in UNKNOWNS-DELTA.md/spec.md ("F37-F58 verified via static fixture only; no test exercises live in-browser abort/redaction"), or (B) add at least one true end-to-end test running run-gauntlet.mjs against a minimal local fixture server, asserting a persona subagent actually aborts/redacts live.

**F34 (ambiguity-resolution friction) has no observable trigger definition, risking silent reintroduction of the adversarially-KILLED "hesitation-as-signal" claim**
IDs: F34, F14, F15, F9
Failure story: DECISION-BRIEF.md explicitly KILLED "observable hesitation alone is a valid friction signal." scrub-log.md names F34 as the sole surviving evidence-anchorable cognitive-friction type specifically because it's supposedly distinguishable from hesitation — but F34 has no spec-defined observable trigger, and F14's evidence requirement only checks non-empty evidence array, not content. A builder can satisfy F34 exactly as written by having the persona self-narrate "I hesitated between X and Y" as its own evidence — functionally identical to the killed claim, passing every existing gate.
Fix directive: Add F34a requiring the evidence artifact show ≥2 candidate interactive elements/copy segments concurrently visible before the persona's choice. Add a Gherkin scenario and a negative-control fixture (self-narrated hesitation, no multi-candidate artifact) asserting the gate rejects it.

**F61/F65/F67/F68 — the spec's own BLOCKS:critical authorization gates — have zero test coverage, and the existing suite actively omits these flags, so the frozen tests will contradict themselves once the gates are built**
IDs: test/acceptance.test.mjs:2, spec.md:186/188/190, requirements.txt F61/F65/F67/F68
Failure story: F65 (--i-own-this-target) is the entire legal-authorization gate for the product and has no behavior lock. Worse, the two live CLI invocations that DO exist actively omit --i-own-this-target/--env/--denylist while asserting unrelated stderr substrings, with no documented precedence rule — a correct F61/F65 implementation can legitimately fail these tests on the right refusal, tripping the wrong assertion.
Fix directive: Add an ADR-0001 precedence sentence (authorization flags checked before --tasks/persona-count). Update the two existing invocations to pass all required flags so they test their intended behavior. Add four dedicated tests: F61 hard-stop on missing --env, F65 refusal without --i-own-this-target, F67/F68 confirmation requirement on non-localhost targets, plus a localhost negative control.

### MAJOR

**No disambiguation criterion between transient failure (F77), friction (F10), and app-error (F47) for the identical observable event**
IDs: F77, F10, F47, F92
Failure story: An element-slow-to-render retry has no rubric placing it as excluded (F77), scored friction (F10), or app-error (F47). UNKNOWNS-DELTA.md DR-24 names this exact ambiguity and marks it ACCEPTED, but only the prohibition clause (F77) was landed — the disambiguation rule DR-24 called for was never added. Two spec-compliant implementations can legally classify the identical event differently, breaking F92/F73's determinism and CI-diff comparability promises.
Fix directive: Add a new requirement after F77 (cross-ref DR-24): a retry succeeding automatically within the wait timeout is transient (excluded); a retry requiring a persona-initiated extra action is friction (F10) unless a 5xx/network-failure response was captured, in which case it's an app-error (F47). Add one acceptance-test case for each branch.

**Terminal friction on patience-abandonment (F51) has no guaranteed evidence artifact, so F15's zero-evidence drop rule can silently delete the mandated record**
IDs: F51, F14, F15, F52
Failure story: F50-52 mandate recording a terminal friction instance at patience-abandonment, but nothing wires an evidence-capture call into that specific bookkeeping event (it's a step-count threshold crossing, not a walkthrough step with its own capture). F14/F15 unconditionally drop any friction instance with zero evidence artifacts. A builder following F50-52 literally can emit a terminal friction with zero evidence, which F15 then drops — though F52/F53/F55/F56 preserve task-level visibility via redundant ledger fields, so it's not fully silent.
Fix directive: Add F52a requiring the abandonment procedure capture a screenshot evidence artifact for the terminal friction instance before recording it, closing the gap at its source. Add a positive-control fixture/test proving the terminal friction instance survives F15's gate.

**F39 (payment-step refusal) and F40 (non-idempotent-method dry-run boundary) have no schema field or mechanism specified for detecting the conditions they gate on**
IDs: F39, F40, docs/adr/0001-runner-cli-contract.md:23, test/acceptance.test.mjs:174-181
Failure story: No task-list schema field lets an operator or persona classify a step as "payment" or determine a form's HTTP method — unlike F62-64's operator-set flag for generic external-side-effect steps, this pattern was never extended to F39/F40. The only tests exercise gate rejection of an already-labeled fixture, never detection. This mirrors DR-02/DR-03's own acknowledged risk but leaves the "how" unresolved and undocumented (no ADR/decision-record for this material decision).
Fix directive: Add F101 (task-list schema MUST support operator-set payment_step boolean) and F102 (F39's refusal gates on that flag, not runtime judgment), plus F103 (F40's HTTP-method detection MUST use network-request interception, not static DOM form-attribute sniffing). Add an ADR-0001 decision row and a test exercising the schema field, not just gate rejection.

**Refusal gates (F8, F37, F61, F65, F87) have no aggregation requirement — first run becomes a serial one-error-at-a-time discovery loop**
IDs: F8, F37, F61, F65, F87, ADR-0001 exit-code table
Failure story: Nothing requires validating all static preconditions before failing on the first one checked. ADR-0001 itself frames refusal as singular ("naming the violated rule," singular). A founder's first command with only --url/--tasks can hit 4 sequential reruns (missing --env → missing --i-own-this-target → missing --denylist → missing display) producing zero crawl output — the exact "iterative archaeology" pattern the spec's own authors already fixed once for content-level gaps (DR-01 through DR-09) but never extended to the flag layer.
Fix directive: Add F88 (check every static launch precondition before printing the first refusal) and F89 (print one stderr line per violated rule when multiple are violated simultaneously). Update ADR-0001's exit-code table language accordingly. Add a test asserting 3 simultaneous missing flags produce all 3 violation lines in one invocation.

**DR-28's own justifying claim ("first run works in under 5 minutes") is never itself encoded as a testable requirement**
IDs: F83 (DR-28), N5, UNKNOWNS-DELTA.md:69
Failure story: The "5 minutes" claim is quoted as F83's sole rationale but never promoted to an N-requirement; N5 measures a disjoint quantity (post-start crawl runtime, not pre-crawl onboarding). A builder can satisfy every literal F-line (F83, F37, F61, F65, F87) individually while the aggregate first-run experience still requires multiple flags and possible reruns, since nothing bounds the aggregate.
Fix directive: Add N8: a first-time operator MUST reach a started crawl against a reachable localhost target using only the shipped example tasks file, shipped default denylist, and --i-own-this-target, in a single CLI invocation with no failed prior attempt. Add a corresponding acceptance test.

**F12 mandates severity "computed from" the 3-factor rubric but no aggregation formula exists anywhere, and the only test checks factor names are present as strings**
IDs: F12, F26, DECISION-BRIEF.md:37-42, test/acceptance.test.mjs:76-79, requirements.txt:19
Failure story: DECISION-BRIEF.md names the three factors but gives no formula and explicitly hedges even the label semantics aren't independently re-verified. The only test asserts severity is 0-4 and that severity_factors mentions the three substrings — never that severity is a function of those values. A spec-faithful builder can ship severity_factors as decorative JSON while setting severity to any LLM-emitted value, undermining F26's CI catastrophe gate at its foundation. (The sibling F17/convergence_tier already gets a real arithmetic check, proving the test authors know this pattern — they just didn't apply it here.)
Fix directive: Replace F12 with a formula-bearing requirement: severity = round(mean(frequency, impact, persistence)), each factor itself 0-4. Mirror in spec.md. Add a gate check + fixture (findings-bad-severity.json) mirroring the existing convergence_tier arithmetic check, with a matching valid-fixture negative control.

**F45/F46 merge combines N independently-scored friction records into one entry but never specifies how the merged entry's single severity is derived**
IDs: F45, F46, F12, F26, requirements.txt:19/66-67, spec.md:168
Failure story: Two personas hitting the same bug may rate frequency/impact/persistence differently. Whether the merged severity is max(), mean(), or first-seen() is unspecified and untested — UNKNOWNS-DELTA.md DR-06 names the merge-count ambiguity but never resolves the severity-aggregation sub-question. Since F26 gates CI on severity==4, two independently-correct builders would produce CI pipelines that disagree on whether the same finding blocks the build.
Fix directive: Add F46a: merged finding's severity MUST equal the maximum severity value among the pre-merge friction records combined. Add a merge fixture with two pre-merge records at differing severities, asserting the merged entry equals the max, not the mean or first-seen.

**convergence_tier (F17) counts friction contributions from personas regardless of run_status, letting crashed/timed-out personas inflate the reliability signal the methodology is built on**
IDs: F17, F49, F53, F76, requirements.txt:24/70/74/97, spec.md:153/168-171, DECISION-BRIEF.md:47
Failure story: DECISION-BRIEF.md frames convergence_tier as the analog of NN/g's multi-evaluator-reliability finding, but F76 requires merging a wallclock-timed-out persona's PARTIAL ledger "as-is" into findings.json, and F17's definition never excludes non-completed personas from the count. A finding flagged by 2 completed personas + 1 crashed persona reads as convergence_tier=3 ("flagged by all 3"), the top-confidence bucket, though one contribution came from a compromised run — UNKNOWNS-DELTA.md DR-10 names this exact gap and it's only partially closed (disclosure elsewhere in the report, not attached to the finding).
Fix directive: Redefine F17 to count only personas with run_status=completed. Add F17a: a `partial_tier` field counting non-completed-persona contributions separately. Add the field to the findings schema. Add a test: 2 completed + 1 crashed → convergence_tier=2, partial_tier=1, not convergence_tier=3.

**F27 (lower-confidence label for standardized-flow findings) has zero acceptance-test coverage and no defined interaction with the F26 CI severity-4 gate**
IDs: F27, F26, F17
Failure story: Brief §2.2 names cognitive walkthroughs as weaker on standardized flows and requires flagging them lower-confidence; D4 chose to keep full walkthrough scoring and only downgrade a label. Grep confirms zero test references F27 anywhere, and F26 has no confidence-tier carve-out. A builder can ship F27 as a cosmetic string with no gate effect — a lower-confidence severity-4 finding on an allowlisted login/checkout flow blocks a PR with the same force as a high-confidence novel-workflow finding, exactly the case the literature says is least trustworthy.
Fix directive: Add a test locking F27 (allowlisted-flow finding renders with the lower-confidence label; negative control for non-allowlisted). Add F27a stating explicitly whether a lower-confidence severity-4 finding still triggers the F26 CI gate, and extend decision record D4 with the chosen interaction.

**F70/F71 (rerun-variance and non-completeness disclosures that license the whole CI baseline-diff mechanism) have zero acceptance-test coverage, and F35's wording reads as an exhaustive closed list**
IDs: F70, F71, F35, F20, F26
Failure story: F35 enumerates "these 4 disclosures" and is the only tested part of the validity-envelope section; F70/F71 (the ~45%-agreement rerun-variance hedge that makes it honest to CI-gate on severity-4 diffs at all) have zero references anywhere in the test suite. A builder can pass every existing gate test while never shipping the one caveat that justifies treating a CI-blocking severity-4 diff as signal rather than noise.
Fix directive: Extend the validity-envelope test to also assert F70/F71 content via regex match on the report generator's actual disclosure wording. Reword F35 from "MUST contain these 4 disclosures" to "MUST contain at least these 4 disclosures" so it isn't misread as exhaustive.

**F18/F19 markdown-render test asserts only literal strings copied verbatim from its single input fixture — passable by a hardcoded static template**
IDs: test/acceptance.test.mjs:111-119, test/fixtures/findings-valid.json
Failure story: The renderer test feeds exactly one fixture and asserts 4 substrings all verbatim-derivable from it. A `console.log` of matching hardcoded markdown would satisfy every assertion while ignoring process.argv[2] entirely — the exact failure mode F19 ("generated from JSON, not a static template") exists to prevent, with the anti-gaming guard itself gameable for want of a differential fixture or negative control.
Fix directive: Add a second fixture with distinct friction_name/persona/tier values. Assert the renderer's own-fixture strings appear AND the first fixture's fixture-specific strings do NOT appear (and vice versa) — proving output tracks input, not a template.

**Spec's own documented Gherkin scenario for stable finding_id CI-diffing (F72/F73/F92) is never implemented by any test**
IDs: docs/specs/0001-ux-gauntlet-mvp.spec.md:137-142, test/acceptance.test.mjs:147-155, test/fixtures/findings-new-sev4.json
Failure story: The scenario requires identical finding_id + reworded narrative to be treated as already-known, but zero test references finding_id/F72/F73/F92, no findings-schema file exists to enforce a finding_id field distinct from narrative, and the only CI-diff test never varies narrative while holding id constant. A builder can wire ci-diff.mjs to string-compare a literal `id` field assigned by ledger arrival order (which F92 explicitly forbids), causing spurious CI-fatigue floods or missed catastrophes on rerun.
Fix directive: Add a fixture with identical finding_id/heuristic/step/semantic-key but reworded narrative and different timestamp; add a test asserting ci-diff.mjs treats it as unchanged (exit 0). Add F101: findings JSON output MUST use a `finding_id` field name distinct from any narrative/timestamp field.

### MINOR

**Default dry-run boundary (F40) blocks the spec's own flagship signup scenario by default — but the ledger already records a distinct non-friction reason code, so the "silent" framing overstates it**
IDs: F40, F7, F55, F56, F83
Failure story: F55/F56 already require task_completed=false plus a reason code independent of the friction list — the "distinct non-friction reason code" the original attack demanded is already present. The flagship Gherkin scenario never actually asserts task_completed=true. F40's dry-run stop is one instance of a pervasive, deliberate "refuse rather than complete" safety pattern (DR-03) shared with several other requirements, not a unique contradiction. Residual real gap: F56's reason code has no enumerated value set the way F53 does.
Fix directive: Add F56a: the reason code recorded per F56 MUST be drawn from a fixed enumerated set including at minimum dry-run-boundary-stop, denylist-abort, robots-disallowed, patience-exhausted, target-unreachable.

**No report-gate rule distinguishes a BLOCKED (<3 completed personas) run's report from a normal one at the per-finding level — a real but already-mitigated gap**
IDs: F16, F49, F17, F53, F54
Failure story: F49/F53/F54 already require run_status=BLOCKED, per-persona run_status, and a rendered validity-envelope disclosure sentence in the markdown report itself (not buried JSON) — and the gate already enforces the disclosure exists (test fixture confirmed). DR-08/scrub-log.md already document disclosure-over-refusal as the deliberate product philosophy. The residual real gap: individual findings from a BLOCKED run carry no per-finding confidence-degradation tag, only run-level disclosure.
Fix directive: Add F54a: each finding from a run whose run_status is not completed MUST carry a confidence field set to degraded-below-persona-floor. Add a fixture/test pair (positive: field present passes; negative: field absent fails) alongside the existing disclosure fixture.

**N5's 45-minute run budget has no per-step derivation and is silently at odds with F57's 50-action cap and F43's redaction cost — but it is self-flagged, untested, and BLOCKS:none**
IDs: N5, F43, F57, requirements.txt:48-49
Failure story: N5 already carries its own provenance comment admitting it's an unvalidated agent-set assumption. No gate or test enforces the number. Three personas each legitimately using 30-40 of their 50-action budget, each costing a multi-second agentic round-trip plus redaction overhead, plausibly exceeds 45 minutes on the exact friction-heavy scenario the tool targets — but since N5 is explicitly BLOCKS:none and nothing depends on it holding, this is a documentation gap, not a build-blocking one.
Fix directive: Reword N5 in spec.md to state the derivation explicitly (personas × max_actions × per-action-budget) and mark it pending empirical measurement at build time. Record the arithmetic in requirements.txt next to N5's existing provenance comment. No new test required given BLOCKS:none status.

**Patience-exhaustion terminal friction (F50-52) has an interpretive gap on which heuristic tag/evidence to use, but is resolvable within F11/F14/F15 as written — not a forced fabrication**
IDs: F50, F51, F52, F11, F14, F15, requirements.txt:18/21-22/71-73, spec.md:171
Failure story: F51's "tagged with the abandonment step index" plausibly just fills the existing `step` field, not a substitute for F11's mandatory heuristic tag — so a heuristic tag and an evidence artifact (reusable from the last-captured screenshot/DOM snapshot at the abandonment step) are both genuinely obtainable without fabrication. No worked example or fixture shows a passing patience-exhaustion finding, risking inconsistent tagging across implementations, but this is a clarity gap, not a logical impossibility forcing F15 to silently drop the finding.
Fix directive: Add F52a: the terminal friction instance MUST carry a heuristic_tag from the configured set and an evidence artifact captured from the persona's last observed page state at the abandonment step. Add a passing Gherkin scenario and a positive fixture/test proving it survives the gate. Do not add an exemption from F11/F14/F15.

---

## 3. REJECTED attacks

- **Mandatory denylist-abort (F37/F38) makes it impossible to audit a cancellation/deletion flow** — rejected: F37 only requires SOME denylist file exist; it does not mandate any specific label appear on it, so an operator auditing a cancellation flow simply omits it from their own file. Fabricated a mandatory-inclusion premise the spec never states.
- **--env unconditionally required even for obvious localhost URLs, no auto-infer considered** — rejected: DECISION-BRIEF.md DR-15 gives the exact generalizable rationale (localhost strings can be port-forwarded/tunneled staging or prod), directly defeating the proposed auto-infer fix; not a silent oversight, a deliberate belt-and-suspenders design already on record.

---

## 4. Systemic observations

**4.1 — Convergent multi-lens finding is the strongest signal in this round.** The F92-includes-persona_role defect was found independently by 4 of 6 lenses (contradictions, operator-hostility, methodology, evidence-fidelity) via different reasoning paths (identity-tuple mismatch, CI-baseline churn, cross-merge impossibility, reliability-signal corruption). When multiple adversarial lenses converge on the same root cause without coordination, that is the highest-confidence class of finding this panel can produce — treat it as the single highest-priority fix before any other BLOCKER.

**4.2 — The panel over-claimed severity on ~5 of 29 attacks, and the verify pass caught it every time.** F40 (BLOCKER→MINOR), the BLOCKED-report gap (MAJOR→MINOR), F12's severity formula (BLOCKER→MAJOR), and patience-exhaustion evidence (MAJOR→MINOR) were all downgraded on reproduction because the attack's "silent/impossible" framing didn't survive contact with adjacent requirements (F55/F56, DR-03, DR-08, F52's `step` field) that already partially mitigate the failure. This is healthy: it means the panel had teeth on both sides — willing to confirm real gaps and willing to reject overstatement.

**4.3 — The test suite systematically under-covers the CRITICAL safety layer relative to the schema/report layer.** F37-F58 (denylist, payment, redaction, patience), F61/F65/F67/F68 (authorization gates), F70/F71 (rerun-variance disclosure), and F72/F73/F92 (stable finding_id) all have zero or fixture-only test coverage, while F17/F26/F45 (schema/scoring mechanics) get real arithmetic checks. The project's own test-authoring pattern (proven capable, e.g. the convergence_tier arithmetic test) was simply never extended to the safety/authorization/CI-integrity requirements — this is a coverage gap in test-authoring discipline, not a spec-design flaw.

**4.4 — Several DR-numbered "resolved" unknowns were re-opened by this round.** DR-06 (target-element identifier), DR-24 (transient-vs-friction), DR-28 (first-run-under-5-minutes), and DR-35 (finding_id determinism) were all marked ACCEPTED/resolved in UNKNOWNS-DELTA.md but the actual disambiguation/formula/test the resolution promised was never landed in requirements.txt or the test suite. The DR ledger records intent to resolve, not verified resolution — future rounds should diff DR rationale text against the corresponding F-line and test, not trust the ACCEPTED status alone.
