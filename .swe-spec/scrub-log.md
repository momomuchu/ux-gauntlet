# Scrub log — what was cut and why (2026-07-08)

| Cut item | Reason |
|---|---|
| WTP / pricing / conversion estimation | out-of-scope + literature shows LLM WTP estimates unreliable (brief §3, HBS 23-062) — moved to forbidden claims (F21) |
| "% of users would hit this" extrapolation | not-important AND invalid — LLM/human agreement ~45% (brief §3, arXiv 2601.17087) — forbidden (F22) |
| Autonomous task-list discovery from sitemap/nav crawl | over-complex for v1; breaks reproducibility; operator-defined happy path instead (D2) — v2 candidate behind approval gate |
| Accessibility audit lane | out-of-scope — dilutes friction-economics focus; dedicated tools/skills exist |
| Cross-browser / device matrix | over-complex for v1; desktop viewport only |
| Multi-run trend/regression statistics | low-ROI until baselines exist; report schema must stabilize first — v2 |
| ISO 9241-11 "compliance score" | invalid framing — the standard scopes out measurement methods; would be overclaiming (brief §3) |
| Novice/expert differentiated detection, error-prevention-over-recovery rule, financial-over-cosmetic weighting, hesitation-as-signal | claims KILLED in adversarial verification — cannot be encoded as sourced methodology (brief §2.3) |
| 1-persona "quick audit" mode | cut from MVP (D1): single-evaluator severity is unreliable; founder may re-add with a loud low-confidence disclaimer |
| Auto-detection of standardized flows | unproven; replaced by operator allowlist (D4) |
| Pure cognitive-load friction (no extra action, no resolved ambiguity) | cut from MVP: cannot be evidence-anchored without reintroducing the KILLED hesitation-as-signal claim; actions (F10) + ambiguity resolutions (F34) stay in |
| Brief §5 `heuristic_tag[2]` bracket notation | interpreted as an (id,label) pair, NOT multi-tag — single tag per finding is deliberate per brief §2.1 "exactly one" framing (disjoint-review finding #1) |
| "Maximum critique" as a CRITICAL requirement | demoted deliberately from draft 0000 to decision D6: tone is not mechanically gateable; enforced instead via report-template language + F14/F15 evidence discipline (disjoint-review finding #7) |
| Skip-scoring for allowlisted standardized flows (brief §2.2 alternative) | rejected: allowlisted flows keep FULL walkthrough scoring with a downgraded confidence label (F27) — uniform data shape, scoring is cheap, and label-only downgrade preserves comparability across runs (disjoint-review finding #2) |
| GIF/video replay of the worst-severity friction | explicitly deferred to v2 (`docs/research/UNKNOWNS-DELTA.md` V2-04, DR list) — real virality value but not MVP-blocking; the ambiguity itself (neither built nor scrub-logged) was the actual gap the unknowns pass closed, not the feature's absence |
| 16 named-only v2 candidates from the unknowns pass (retention/cleanup policy, LLM temperature disclosure, fix-hint field, CHANGELOG convention, output-path docs, 45-min budget breakdown, pinned viewport, persona locale, evidence count/size cap, disk retention, two-run delta mode, fix-effort tiers, self-contained HTML report, persona-quote narrative, pass/fail badge, two-target comparative mode) | see `docs/research/UNKNOWNS-DELTA.md` §3 "Also surfaced but not individually detailed" for the full list + one-line rationale per item; cut for the 45-item elicitation cap, ranked below the 4 detailed V2 items by weaker failure scenario and/or overlap with an accepted item |
| Order-dependency declaration for multi-task lists (unknowns pass candidate) | rejected — already covered: `spec.md` line 149 / D2 ("agent must not redefine the happy path") + `scrub-log.md` (this file, autonomous task-list discovery scrub above); the task list is an operator-supplied ordered structure with one literal order, so no state-reference-detection engine is needed (`docs/research/UNKNOWNS-DELTA.md` §4) |
| Single-number aggregate "gauntlet score" headline (unknowns pass candidate) | rejected — already covered/killed: `scrub-log.md:11` (this file, ISO 9241-11 compliance score scrubbed above) + `DECISION-BRIEF.md:42` ("do not silently fold this into the 3-factor score") + `spec.md:142` (no ISO 9241-11 compliance score); same overclaiming risk in different clothing, no evidence a blended score beats severity-ranked + convergence-tier presentation (`docs/research/UNKNOWNS-DELTA.md` §4) |

## Challenge round 1 (2026-07-08) — reconciliation decisions

The following table records decisions taken where a CHALLENGE-ROUND-1.md fix_directive left an open
choice, or where two directives interacted and had to be reconciled into one coherent design, per the
executor's instruction to choose the reversible default preserving founder intent (safety-by-default,
open persona set, evidence discipline).

| CR1 tag | Decision | Reversible default chosen | Why |
|---|---|---|---|
| CR1-1 / CR1-5 | F92's original hash had 2 problems at once: it included `persona_role` (BLOCKER item 1) AND it hashed an undefined, narrative-derived "friction semantic key" (BLOCKER item 5). BLOCKER item 5's own fix_directive text proposed re-adding a closed-taxonomy `semantic_key` field to the hash — which would have re-introduced a 4th hash field right after BLOCKER item 1 mandated collapsing to F45's exact 3-field tuple. | Collapsed F92's hash onto F45's exact 3-field tuple (`heuristic_tag`, `normalized_step_id`, `target_element_identifier`) and nothing else. No `semantic_key` field was added. | This resolves BOTH defects with ONE change: dropping `persona_role` satisfies BLOCKER-1 directly, and dropping the undefined narrative-derived field (rather than replacing it with a new taxonomy field) satisfies BLOCKER-5's real complaint — there is no longer any narrative-sourced input in the hash to be undefined or nondeterministic across reruns. Adding a `semantic_key` field back in would have re-opened exactly the "does this hash input match the dedup tuple" mismatch BLOCKER-1 was raised to close. Safety-by-default / evidence-discipline: fewer, well-defined hash inputs beat a wider hash with an ambiguous field. |
| CR1-7 / CR1-10 / CR1-14 | BLOCKER item 7's fix_directive names an exact fail-fast CHECK ORDER (`url → tasks → i-own-this-target → env → denylist → persona-count`, "each refusal naming only its own rule"). MAJOR item 4's fix_directive demands the OPPOSITE control flow: check every precondition before failing on the first one, printing all violations at once. BLOCKER item 10 additionally wants an ADR precedence sentence putting authorization flags "before" tasks/persona-count. | Adopted MAJOR-4's AGGREGATE model as the primary control flow (F107/F108): check every static precondition, then print one stderr line per violated rule in BLOCKER-7's exact fixed order. | Aggregation is strictly stronger than fail-fast for the founder-DX problem both BLOCKER-7 and MAJOR-4 describe (a first run should not need 4 reruns to discover 4 missing flags one at a time). The fixed print order from BLOCKER-7 is preserved as the deterministic OUTPUT order, which also satisfies BLOCKER-10's precedence concern: since every violated rule is always reported regardless of internal check order, `--i-own-this-target`/`--env` refusals can never be silently masked. This is a strict superset — no directive text is contradicted, only the "fail on first" framing is replaced with "report all, in this order." |
| CR1-8 | BLOCKER item 8 offered two options: (A) ship `schemas/run-bundle.schema.json` + name the fixture-only verification gap as an explicit residual risk, or (B) add a true end-to-end Playwright test against a live local server. | Chose Option A: added F109 (ship the schema) and a new "Known verification gaps (MVP)" section in spec.md naming the gap explicitly. | This repo is still in the pre-freeze SPEC phase — zero scripts, zero SKILL.md, zero schemas exist yet (confirmed: `node --test` fails every test with `MODULE_NOT_FOUND`). Option B requires a working `run-gauntlet.mjs`, a real browser, and a fixture HTTP server, none of which exist and are BUILD-phase work, not spec-hardening work. Option A is achievable now, is honest about the residual risk rather than hiding it, and does not block Option B from being added later at BUILD time — it is a reversible, additive choice. UNKNOWNS-DELTA.md itself was out of scope to edit (task instruction), so the residual-risk disclosure was placed in spec.md's own new section instead. |
| CR1-19 | MAJOR item 9 (F27) asked to "add F27a stating explicitly whether a lower-confidence severity-4 finding still triggers the F26 CI gate" — the report explicitly left this open. | Decided YES: a lower-confidence label is cosmetic only (F121) and does not suppress the F26 CI gate. Extended decision record D4 in spec.md with this addendum. | Safety-by-default: an operator-maintained allowlist must not become a silent channel for suppressing catastrophic (severity-4) findings from CI. The brief's "advisory-first" philosophy (D3) already only blocks on severity-4, the highest bar; further discounting severity-4 findings by allowlist status would create a second, undocumented suppression mechanism. This preserves founder intent (maximum critique, D6) over convenience. |

## Challenge round 2 (2026-07-08) — reconciliation decisions

The following table records decisions taken where a CHALLENGE-ROUND-2.md fix_directive left an open
choice, where two directives interacted and had to be reconciled into one coherent design, or where a
directive's literal instruction conflicted with this pass's own scope boundary (`docs/research/*.md`
and `CHALLENGE-ROUND-*.md` are explicitly out of edit scope for this pass).

| CR2 tag | Decision | Reversible default chosen | Why |
|---|---|---|---|
| CR2-1 / CR2-5 / CR2-14 (§4.4 systemic note) | Three confirmed findings (F40/F89 precondition steps, F37/F38 denylist override, F27 standardized-flow allowlist) each independently proposed the identical per-step-operator-override-field shape. The systemic observation suggested "one generalized operator-override extension point" instead of three ad hoc booleans. | Landed `precondition_step` (F126) and `denylist_override` (F128) as two new per-step boolean fields following the EXACT existing precedent of `payment_step` (F115) / `external_side_effect` (F62) — same shape, not a new abstraction layer — and recorded the unifying pattern as Decision D14 in spec.md rather than inventing a new generic "overrides" object/schema. F27's allowlist mechanism was kept as a SEPARATE file-based CLI supply channel (`--standardized-flow-allowlist`, F140/F141/F142), not a 5th per-step boolean, because it labels findings post-hoc rather than exempting a step from a refusal — D14 states this distinction explicitly. | Adding a new generic "overrides" abstraction (e.g. a nested `overrides: {}` object with a registry) would be over-engineering relative to the 4 concrete fields that actually exist; the flat-boolean-per-field shape is already proven (payment_step/external_side_effect), cheap to extend, and directly testable with the same gate() fixture convention used everywhere else in this repo. D14 gives future 5th-field additions one documented place to register against without forcing a schema migration now. |
| CR2-2 | BLOCKER item 2's fix_directive asks for a test that "asserts the crawl starts on the very first invocation." No live fixture server exists in this repo (an explicit, already-disclosed residual risk per CR1-8) — a literal "crawl started and completed" assertion is not achievable pre-build against `http://localhost:9`. | The N8 test asserts the invocation's exit code is in `{0, 3}` (started/completed, or F80's target-unreachable outcome) and that stderr never names a missing/invalid required-flag rule — i.e. "not refused by the static aggregate gate," which is exactly the flag-completeness property N8/F61's original defect broke. | Mirrors the CR1-8 precedent already established in this same repo: verify what is mechanically provable pre-build (the static gate accepts every required flag including `--env`), and name the live-crawl proof as a residual risk shared with the rest of the fixture-only safety layer, rather than fabricating a fake "success" assertion against an unreachable port. |
| CR2-6 | The fix_directive asks the test to "compute finding_id independently from the formula." F92 only specifies "a deterministic hash," not a named algorithm — mandating a specific hash function (e.g. SHA-256) as a hard requirement would be scope creep beyond what CR2-6 actually asked to fix (the field-NAME mismatch, not the hash algorithm), and would retroactively invalidate every existing fixture's human-readable `finding_id` value (e.g. `fid-signup-cta-hidden`), which are stable labels, not hash outputs. | Introduced 3 NEW, self-contained fixtures (`findings-finding-id-formula-a/b.json`, `findings-finding-id-mismatched-bad.json`) whose `finding_id` values are precomputed against one illustrative formula (`fid-` + `sha256(heuristic_tag\|step\|target_element_identifier)`.slice(0,16)), asserted via `gate()` exactly like every other rule in this suite (not inline JS computation in the test, which would trivially pass pre-build and break the RED-preserved contract). Existing fixtures elsewhere in the suite are untouched. | Keeps the fix scoped to CR2-6's actual defect (F45/F92 field-name mismatch — now both literally say `step`), proves the identity function is a pure function of the 3-field tuple across two differently-shaped merge tiers (data-testid vs accessible-name-plus-role) plus one mismatch-must-fail control, and preserves `node --test`'s RED status since the new test still fails pre-build via `gate()`'s dependency on an unbuilt `report-gate.mjs`. |
| CR2-7 | F131 (50-minute default timeout) has no CLI-observable signal pre-build (no `summary.json` field or flag-echo mechanism specified for it), so a dedicated CLI-level assertion of "the default equals 50 when `--timeout` is absent" is not mechanically testable without inventing a new output-contract requirement outside CR2-7's scope. | Added the ADR flag-table row and the `F131` requirement line as directed, but the RED test (`F75 F76 CR2-7`) only exercises F75/F76's partial-ledger-merge behavior via `gate()`, not F131's numeric default directly. F131 is cited in spec.md's HIGH-tagged F75/F76 bullet, not a CRITICAL bullet, so `test-coverage-audit.sh` does not require its own assertion. | Avoids inventing an untested/unrequested output-contract requirement (e.g. "summary.json MUST echo the effective timeout value") just to make F131 mechanically provable pre-build; the gap is honest and narrow, and F131's behavior is fully exercised once `run-gauntlet.mjs` exists and a live-timeout Playwright suite lands (same v2 residual-risk category as the rest of the safety layer, CR1-8). |
| CR2-9 | The fix_directive names 4 pattern classes (Bearer/JWT, cookie header, cloud API-key prefix, card number) but leaves the exact prefix list and card-length range to the executor. | Adopted the fix_directive's own literal enumeration verbatim: `AKIA`, `sk-`, `ghp_`, `gh_pat_` prefixes, 13-19 digit Luhn-valid card sequences — this is DR-05's original scope, which the fix_directive states explicitly as the restoration target. | No independent judgment needed; the directive's enumeration is concrete and traceable to DR-05, so it was landed as-is rather than substituted with a different pattern set. |
| CR2-13 | The fix_directive's third action item asks to "soften DECISION-BRIEF.md §6's 'avoids CI fatigue' claim to scope it explicitly to volume, not severity-4 reliability." `docs/research/*.md` is explicitly out of this pass's edit scope per the executor's own task instruction. | NOT applied. Only the `requirements.txt` (F138/F139) and `spec.md` (F26/F101/N4 bullet, F70/F71/F104 bullet) portions of the fix_directive were landed. `DECISION-BRIEF.md` §6 is left as-is. | The task instruction is an explicit hard boundary ("do NOT edit docs/research/*.md"), which takes precedence over a single fix_directive's action item when the two conflict. The functional effect is unchanged: F138/F139 already state the caveat extension in the artifacts that ARE in scope (requirements.txt, spec.md), so the founder-facing behavior described by the defect (a red CI run needs manual reconfirmation) is fully fixed; only the research document's own wording is left unsoftened, which is a documentation-consistency nice-to-have, not a behavior gap. |
| CR2-14 | The fix_directive asks for an acceptance-test case proving the allowlist "reaches [findings.json] end-to-end from a real CLI invocation" — infeasible pre-build for the same reason as CR2-2 (no live fixture server; this repo's own established precedent per CR1-8 defers live-behavior proof to a v2 Playwright suite). | Reframed F141 from a CLI-invocation-traced "run manifest" concept to a `run configuration` field (`run.standardized_flow_allowlist`) that the ALREADY-EXISTING fixture convention uses (`findings-allowlisted-lower-confidence.json` already carries this exact field pre-CR2), then added F142 as a `report-gate.mjs`-enforced rule requiring the label's step to match a recorded allowlist entry, tested via 2 new `gate()` fixtures (`findings-allowlist-supplied-applied-ok.json` / `-not-applied-bad.json`). | This is the same fixture-only reframing already applied throughout the safety/refusal layer (CR1-8): it makes the actual defect (the label previously had ZERO supply-mechanism enforcement anywhere, not even at the schema/gate level) mechanically provable now, without fabricating an unbuildable live-CLI assertion against a target that does not exist in this repo. |
| CR2-3 | BLOCKER item 3's fix_directive names 6 exact fixture filenames to add. | Landed all 6 exactly as named (`robots-nav-allowed-ok.json`, `evidence-redacted-ok.json`, `evidence-redacted-screenshot-ok.json`, `run-status-blocked-with-disclosure-ok.json`, `walkthrough-no-with-matching-friction-ok.json`, `app-error-correctly-filed-ok.json`), each sharing its paired failing fixture's exact schema shape per the directive's own instruction. | No independent judgment needed; the directive was concrete and unambiguous. |

## Challenge round 3 (2026-07-08) — reconciliation decisions

The following table records decisions taken where a CHALLENGE-ROUND-3.md fix_directive left an open
choice, where a directive's suggested requirement number collided with an already-used ID, or where
a directive's literal instruction conflicted with this pass's own scope boundary (`docs/research/*.md`
and `CHALLENGE-ROUND-*.md` are explicitly out of edit scope for this pass, same as CR1/CR2).

| CR3 tag | Decision | Reversible default chosen | Why |
|---|---|---|---|
| CR3-1 (D15) | BLOCKER item 1 offered two options: (A) rewrite the spec.md flagship scenario to note `--full-submission` is required, plus a companion default-mode scenario, or (B) add a 5th D14-family per-step flag exempting the task's own terminal submission. The executor's own additional systemic mandate explicitly named Option B as preferred "because it fixes the requirement layer, not the narrative." | Chose Option B: added `audited_terminal_step` (F145/F146) as the 5th member of the D14 family, renamed/extended to D15. The flagship Gherkin scenario (F10-F14) was additionally annotated to show the signup step authored with `audited_terminal_step: true`, satisfying the "sweep the scenario for consistency" instruction from the systemic mandate without needing a second, alternate-outcome scenario. | Per explicit executor instruction. Option B is also structurally cheaper: it reuses the exact flag shape D14 already established (`payment_step`/`external_side_effect`/`precondition_step`/`denylist_override`), so a future task author gets one closed vocabulary instead of a scenario-only footnote a builder could still miss. |
| CR3-2 through CR3-20 (numbering) | Several MAJOR/MINOR fix_directives suggested illustrative requirement numbers ("F143", "F145", "N9", "N6a") as `e.g.` examples. `F143`/`F145`/`N9` were already assigned to real CR2 requirements (`F143`/`F144` confidence-label independence, `N9` wallclock-derivation correction) by the time this pass started; reusing them would silently overwrite CR2 content. | Assigned the actual next-available sequential IDs at pass start: `F145`-`F160` (16 new functional requirements), no new N-numbers. | Collision avoidance — requirements.txt is append-only per its own established convention (CR1/CR2 sections never renumber prior lines); the challenge doc's own numbers were always illustrative ("e.g."), never a binding contract on the actual ID space. |
| CR3-7 / CR3-10 (categorization) | The challenge doc's own illustrative numbering labeled the "reference --override-robots in docs" item and the "define localhost technically" item as `N9`/`N6a` (nonfunctional-style IDs), implying they belonged in the N-series. | Applying the Perfect Technology Filter (categorized-requirements.md's own test: "would this still need to be stated on a computer with infinite speed/unlimited memory/zero cost/no failures?"), both are policy/definition requirements — a computer with infinite speed still needs to know exactly which flag resolves a robots.txt disallow, and exactly which hostnames count as localhost. Landed both as F-numbers (F152, F155) instead, matching the existing F86/F91 (doc-content policy) and F67/F68 (classification-gate) precedent. | Consistency with the established Perfect Technology Filter categorization already applied uniformly to every CR1/CR2 addition (only N5/N8/N9 — genuine QoS/time-bound items — ever received N-numbers); mechanically reusing a challenge doc's illustrative label without re-running the filter would have been a categorization regression. |
| CR3-6 / CR3-14 (F26a numbering) | The BLOCKER-6 and MAJOR-8 confirmed defects are the SAME underlying gap (CI mode's absence-by-finding_id-only rule silently exempts a genuine severity escalation) surfaced by two independent adversarial lenses — one framed as a hard defect, the other framed as a DECISION-BRIEF contradiction. | Landed ONE new requirement line (F151) carrying BOTH trace tags (`# CR3-6 CR3-14`), rather than two near-duplicate requirement lines. | Avoids a duplicate-requirement anti-pattern (two lines asserting the identical MUST clause would themselves be a req-lint "true stakeholder need" / non-atomic-in-spirit violation, and would double the fixture/test burden for zero additional coverage). The DECISION-BRIEF.md §7/§8 item 6 contradiction itself is addressed by an in-spec.md note (the CI-mode MEDIUM bullet) stating this is IN SCOPE for v1, since `docs/research/DECISION-BRIEF.md` itself is out of this pass's edit scope — same CR2-13 precedent already recorded above. |
| CR3-4 / CR3-11 (F83 vs F156 vs schemas/tasks.schema.json) | BLOCKER-4 (pin `examples/tasks.json`) and MAJOR-5 (ship `schemas/tasks.schema.json` for per-step booleans) are related but distinct: one pins a shipped artifact PATH, the other defines the artifact's SHAPE/schema authority. | Landed as two separate requirement edits: F83 amended in place to pin the literal path (mirroring F105's pattern exactly), and a new F156 requirement for the schema file — cross-referenced from both the spec.md F62/F154(now F156) HIGH bullet and the F83/F105 Operator-DX bullet, and tested together in one new acceptance-test case (`F83 F156 CR3-4/CR3-11`) since both close the identical "N8/F109-style residual coverage gap" pattern for the tasks-file artifact. | Keeps each requirement atomic (one MUST clause) per req-lint's own atomicity check, while avoiding two disconnected test cases for what is, from an operator's perspective, one coherent gap ("the shipped tasks file has neither a pinned path nor a schema authority"). |
| CR3-15 (Known verification gaps rewording, MAJOR-9) | The fix_directive offered a durable alternative: add a report-gate.mjs assertion that actually validates each fixture against `schemas/run-bundle.schema.json`, "retiring the caveat instead of widening its disclosure." | NOT taken. Reworded the "Known verification gaps" spec.md bullet to widen the disclosed scope (naming every gate-routed requirement ID, not just F37-F58), matching the fix_directive's primary instruction. | The durable alternative requires `report-gate.mjs` and `schemas/run-bundle.schema.json` to exist and be wired together — that is BUILD-phase work (same category as CR1-8's Option A/B split, which this repo already resolved toward "disclose honestly, defer the schema-validation wiring to build time" for the identical reason: this is still the pre-freeze SPEC phase, zero scripts exist). Widening the disclosure is the achievable, honest, additive fix available now. |
| CR3-16 (F27/F121 confounded fixture) | The fix_directive's "minimum required change" instruction was to add `"run_status": "completed"` to `findings-allowlisted-lower-confidence.json`'s top level, matching `findings-valid.json`'s baseline value; a broader instruction also asked to verify the run object's other keys stay aligned aside from the allowlist field the test's own narrative needs. | Applied the minimum required change only: added `"run_status": "completed"`. Left `standardized_flow_allowlist` in place (it is the field the F140/F141/F142 test block and this test's own F27 narrative both require to stay present — removing it would break 3 other passing-fixture assertions elsewhere in the suite). | The fix_directive itself flags this as the "minimum required change... isolat[ing] the only substantive delta" — a broader rewrite risked breaking the `findings-allowlist-supplied-applied-ok.json`/`-not-applied-bad.json` fixtures' own established convention (CR2-14), which already depends on this exact fixture's `standardized_flow_allowlist` shape as their model. |
| DECISION-BRIEF.md §7/§8 item 6 (BLOCKER-6/MAJOR-8, scope boundary) | Both the BLOCKER-6 and MAJOR-8 fix_directives ask to "resolve DECISION-BRIEF.md §8 item 6 (currently open) by adding one line" inside that document. | NOT applied — `docs/research/DECISION-BRIEF.md` is under `docs/research/`, explicitly out of this pass's edit scope per the executor's own task boundary (identical to the CR2-13 precedent already recorded above in this file). | The task instruction's hard boundary ("no edits to docs/research/*.md") takes precedence over a fix_directive's action item when the two conflict — same reasoning as CR2-13. The functional resolution is NOT lost: spec.md's CI-mode MEDIUM bullet now states explicitly, in the artifact that IS in scope, that per-finding-id severity-escalation is IN SCOPE for v1 and distinct from the excluded multi-run trend/dashboard statistics, so a founder reading spec.md (the canonical build contract) sees the resolved position even though the research document's own wording is unchanged. |

## CR3 systemic resolution

Three challenge rounds in a row, the top-ranked BLOCKER findings all traced back to ONE root
tension: the safety/refusal layer (F40 default dry-run boundary, F37/F38 denylist, F41/F42
robots.txt) colliding with the product's core completion mission (personas must actually complete
operator-audited tasks, e.g. signup) — most starkly visible in BLOCKER item 1, where the spec's own
flagship F10-F14 Gherkin scenario was literally unbuildable under F40's own default. Per the
executor's explicit systemic mandate, this pass resolved the tension structurally instead of
patching per-collision:

1. **Closed the per-step classification family (D15).** The task-list step schema now carries
   exactly 5 named per-step override flags — `payment_step` (F115), `precondition_step` (F126),
   `external_side_effect` (F62), `denylist_override` (F128), `audited_terminal_step` (F145/F146,
   new this round) — plus the implicit default class (an ordinary step carrying none of the 5
   flags). D15 (spec.md, superseding D14) states this family is CLOSED: any future step-class need
   is a spec change, not a new ad hoc flag invented mid-build.
2. **One precedence statement, one place.** D15 states, in a single location, the system-wide
   precedence order: a per-step flag beats its own named run-global default for that one step only;
   a run-global safety default (denylist/payment/dry-run/robots.txt) beats task completion for
   every step NOT carrying its own matching flag; and localhost/`--env local` relaxations are
   enumerated exhaustively as exactly ONE relaxation in the whole system (F67/F68's third-party-data
   confirmation, skipped for a target classified as localhost per F155's technical definition — the
   challenge doc's own illustrative "N6a" label was recategorized functional, per CR3-7/CR3-10 above).
   This is the same mechanism that resolves the robots.txt localhost-carve-out MAJOR finding: F41/F42
   is explicitly NOT auto-relaxed for localhost/staging (the gate stays correct everywhere), and the
   existing `--override-robots` escape hatch is simply made discoverable (F152) rather than the gate
   being weakened.
3. **Swept existing requirements/scenarios/tests for consistency.** The flagship F10-F14 Gherkin
   scenario now authors its terminal signup-submit step with `audited_terminal_step: true`, so it no
   longer contradicts F40's default; the F62/tasks-schema HIGH bullet now cross-references the closed
   5-flag family via the new `schemas/tasks.schema.json` (F156); the F45/F92 identity-tuple CRITICAL
   bullets now cross-reference the off-path `step` definition (F147) that a second, independent
   BLOCKER finding (item 2) surfaced in the SAME identity-tuple machinery D15 also touches — both
   are now visible from the same reader path (friction-accounting bullet, dedup bullet) instead of
   two disconnected patches.

Residual scope note: this resolution is requirement/spec/test/fixture-level only (pre-freeze SPEC
phase, zero scripts exist yet, per CR1-8's established precedent) — the actual runtime enforcement
of the closed family, the precedence order, and the localhost/staging documentation surfacing is
BUILD-phase work that inherits this now-closed contract rather than needing to re-derive it.

## Challenge round 4 (2026-07-09) — reconciliation decisions

The following table records decisions taken where a CHALLENGE-ROUND-4.md fix_directive left an open
choice, where a directive's illustrative requirement number collided with an already-used ID, or where
a directive's literal instruction conflicted with this pass's own scope boundary (`docs/research/*.md`
and `CHALLENGE-ROUND-*.md` are explicitly out of edit scope for this pass, same as CR1/CR2/CR3).

| CR4 tag | Decision | Reversible default chosen | Why |
|---|---|---|---|
| CR4-numbering (BLOCKER-3, MAJOR-1/3/4/6/7/8/10, MINOR-3) | Several fix_directives suggested illustrative requirement numbers as `e.g.` examples: "F160"/"F161" for impact/persistence (BLOCKER-3), "F64a" for the walkthrough skip carve-out (MAJOR-1), "F92a" for the finding_id formula (MAJOR-3), "F43a"/"F44a" for cookie redaction (MAJOR-4), "F17a" for personas_flagging (MAJOR-8), "F108a" for the remedy-path stderr line (MINOR-3). `F160` was already assigned to a real CR3 requirement (F27 walkthrough-weakness disclosure) by the time this pass started; reusing it would silently overwrite CR3 content. The lettered-suffix style (`F64a`, `F92a`, etc.) also has no established precedent in this doc's actual line numbering (unlike the challenge doc's own prose, requirements.txt has never shipped a lettered-suffix ID). | Assigned the actual next-available sequential IDs at pass start: `F161`-`F177` (17 new functional requirements), no new N-numbers. Every illustrative letter-suffixed name (F64a, F92a, F43a, F44a, F17a, F108a) was translated 1:1 to its sequential replacement and the mapping is stated inline in requirements.txt's CR4 section header comment. | Collision avoidance — requirements.txt is append-only per its own established convention (CR1/CR2/CR3 sections never renumber prior lines); the challenge doc's own numbers were always illustrative ("e.g."), never a binding contract on the actual ID space. This is the identical resolution pattern already applied at CR3-2/CR3-7/CR3-10/CR3-20. |
| CR4-B2 (F49 atomicity) | BLOCKER-2's fix_directive's own suggested wording for F49 ("...MUST NOT count toward the BLOCKED trigger") introduces a second independent MUST clause joined by an em-dash, which grep confirmed is not otherwise present anywhere else in requirements.txt (req-lint atomicity: one MUST clause per line). | Reworded to a single MUST with the exclusion expressed as a participial qualifier: "...set to BLOCKED only when fewer than 3 persona subagents reach run_status completed, crashed, or timed-out — excluding patience-exhausted and runner-capped persona subagents from that count." | Preserves the fix_directive's full semantic content (the BLOCKED trigger's denominator excludes patience-exhausted/runner-capped personas) as ONE atomic obligation instead of two, keeping F49 consistent with every other line in the document. |
| CR4-M7/CR4-MIN1 (F169 atomicity + redundancy) | MAJOR-7's fix_directive's suggested F28a wording ("...whose value MUST be one of...") plus MINOR-1's suggested addition ("...MUST equal the value of the heuristic-set configuration file's patience_abandonment_tag field") would have produced a single line with 3 independent "MUST" clauses joined by "and", AND the third clause duplicates existing requirement F150's own text verbatim (F150 already states "The heuristic_tag for a patience-abandonment terminal friction MUST equal one fixed value declared as the designated patience-abandonment tag in the heuristic-set configuration file"). | Landed F169 with the config-file-field obligation only, reworded to avoid a second "MUST" ("...naming a designated patience-abandonment tag whose value is one of the tag identifiers present in that same file's heuristic list"). Dropped the F150 cross-reference clause entirely — it was already stated by F150 itself, restating it in F169 would be a duplicate-requirement anti-pattern (the same class scrub-log CR3-6/CR3-14 already flagged and avoided). | MAJOR-7 and MINOR-1 are the SAME underlying defect (F150 presupposes a config-file designation field F28 never established) surfaced by two independent lenses; landing ONE new requirement (F169) plus ONE new test assertion (extending the existing F10/F11/F12/F28/F34 block) closes both fix_directives without inventing a redundant second obligation. |
| CR4-B4 (F14/F15 fr-002 shape) | BLOCKER-4's fix_directive names the existing `finding-no-evidence.json` fixture's shape (fr-001 dropped, fr-002 kept) as the vehicle for the "selective dropping, not just DROPPED substring" assertion, and separately asks for a new `finding-evidence-present-ok.json` companion. | Added the `fr-002` stderr/stdout assertion directly against the EXISTING `finding-no-evidence.json` fixture (no fixture edit needed — its shape already matches), and created `finding-evidence-present-ok.json` as a fresh 2-finding fixture (both evidenced) mirroring `finding-no-evidence.json`'s persona/walkthrough shape exactly, so the only substantive delta between the two fixtures is whether fr-001 carries evidence. | Matches the fix_directive's own three numbered action items exactly, and reuses the CR2-3-established convention of isolating the single variable under test between a bad fixture and its `-ok` companion. |
| CR4-S3 (pattern-3 sweep scope) | The systematic sweep of control-pair evenness (pattern 3) surfaced 2 gaps beyond the panel's own named BLOCKER-1/BLOCKER-4 items: (a) the ENTIRE `F111 F112 F113` retry-classification test block had zero `-ok` fixtures (all 3 assertions were `notEqual(code, 0)`); (b) `F43`'s cardnumber and `F44`'s apikey RED fixtures each had zero dedicated `-ok` redacted counterpart, unlike every other enumerated-pattern rule in the same test. Neither was named by a specific CR4 panel item, since the sweep instruction (not a confirmed-defect fix_directive) mandated finding these independently. | Added 2 new `-ok` fixtures for the retry block (`retry-transient-correctly-excluded-ok.json`, `retry-friction-correctly-included-ok.json`, reusing `app-error-correctly-filed-ok.json` for the 3rd leg) and 2 new `-ok` fixtures for the redaction siblings (`evidence-secret-redacted-apikey-ok.json`, `evidence-secret-redacted-cardnumber-ok.json`), each wired into the existing test blocks rather than new standalone tests. | Matches the CR2-3-established convention project-wide (every gate-checked rule gets a matching `-ok` companion) without inventing new requirement lines — these are test/fixture-coverage gaps, not requirement-text gaps, so no new F-number was needed. |
| CR4-M5/CR4-MIN5 (F24 rewording, consolidated) | MAJOR-5 and MINOR-5 are the SAME underlying defect (F24's literal "Nielsen-heuristic tag" wording contradicts D7's generalized pluggability, and is stale relative to its own already-generic test and Gherkin scenario) surfaced by two independent lenses at different severities. | Landed ONE wording edit to F24 (drop "Nielsen", say "a tag from the configured heuristic set") carrying both `CR4-M5` and `CR4-MIN5` trace tags, plus ONE new test (`F24 D7 CR4-M5`) with a real non-Nielsen heuristic-set fixture pair, satisfying MAJOR-5's test-coverage ask; MINOR-5 explicitly stated "no test change required" for its own half. | Avoids a duplicate-requirement-edit anti-pattern; the two directives target the identical line and are naturally unified. |
| DECISION-BRIEF.md / CHALLENGE-ROUND-*.md (scope boundary, unchanged) | No CR4 fix_directive asked to edit `docs/research/*.md` or `CHALLENGE-ROUND-*.md` this round. | N/A — no conflict arose. | Recorded here only to confirm the CR2-13/CR3 precedent boundary was never tested this round, not because it was newly re-affirmed against a directive. |

### CR4 systematic sweep summary

Beyond the 22 confirmed defects, this pass ran the executor's mandated systematic sweep of the 5
defect-generator patterns named in `.swe-spec/CHALLENGE-ROUND-4.md` §4. Findings and fixes are
summarized in `docs/specs/0001-ux-gauntlet-mvp.spec.md`'s new "Enum / flag-family → producers" table
and in `validation.md`'s "Challenge round 4" section; the concrete new lines are F173-F177 (enum/
producer closure) plus the F111-F113/F43/F44 fixture-pair additions (control-pair evenness) and the
README/spec.md/validation.md/scope-match.md count-consistency edits made in the SAME pass that changed
the counts (SSOT/count-drift prevention). No sibling-completeness gap beyond F12's impact/persistence
(already a named BLOCKER-3 confirmed defect) was found elsewhere in the spec on inspection.

### Repair cycle (2026-07-09, same pass) — atomicity + coverage regressions

A verification re-run (`req-lint.sh` + `test-coverage-audit.sh`) caught 2 classes of self-introduced
regression in the first CR4 landing, both fixed in the same pass before this file was finalized:

1. **req-lint atomicity (8 lines).** `F35`, `F49`, `F157`, `F166`, `F167`, `F168`, `F169`, `F173`,
   `F176` each tripped the mechanical "compound and/or" check — most were literal-word artifacts (a
   list rendered as "X or Y" instead of "X, Y" / "X/Y"), reworded without semantic loss. `F168` was the
   one genuine two-decision line (content-authoring MUST + schema-verification MUST) and was split into
   `F168` (content) + `F178` (verification) rather than reworded, since collapsing two independent MUST
   clauses into a comma list would have hidden a real atomicity violation, not just a wording one. This
   is why the round's final count is `F161`-`F178` (18 new lines), one more than the `F161`-`F177` (17)
   figure recorded in the CR4-numbering entry above — that entry accurately describes the numbering
   decision AT THE TIME IT WAS MADE (before the repair cycle); this note is the forward pointer to the
   later split so a reader following `F161`-`F177` upward is not left with a stale range.
2. **test-coverage-audit gaps (5 CRITICAL IDs).** `F170`, `F172`, `F173`, `F174`, `F176` were cited in
   [CRITICAL] spec.md bullets by the first landing but not yet referenced by a non-constant assertion in
   `test/acceptance.test.mjs` (the Requirement-ID citation existed before the test case did). Closed by
   extending the existing gate()-routed test blocks for the D12/personas_flagging, F107/F108-remedy-path,
   and run_status-producer areas — no new fixtures were needed beyond what CR4-B1/CR4-B2/CR4-M8 already
   shipped; these were assertion-coverage gaps, not fixture gaps. `node --test` grew from 68 to 71 as a
   result (61 pre-CR4 + 10 net-new test cases this round, not 68 total — 68 was itself a
   mid-repair-cycle snapshot number that this same edit corrects downstream in README/validation.md).

Post-repair, fresh re-runs from repo root: `req-lint.sh .swe-spec/requirements.txt` → 187/187 PASS;
`coverage-audit.sh --pre-freeze` → 8/8 stages PASS; `test-coverage-audit.sh docs/specs/0001-ux-gauntlet-mvp.spec.md test/acceptance.test.mjs`
→ 87/87 CRITICAL PASS; `node --test test/acceptance.test.mjs` → 71 tests, 0 pass, 71 fail (RED
preserved, exit 1).

## CR4 closure sweep

Full abort/terminal-state → `run_status` → `reason_code` mapping (Pattern A closure, BLOCKER-1 plus the
mandated systematic sweep). Every terminal or forced-abort path named in the task instruction is listed;
"—" means the axis does not apply to that path (the path never reaches a persona-level `run_status` or
never produces a `task_completed:false` ledger entry, and the table states why).

| Terminal / abort path | `run_status` (F53) | `reason_code` (F123) | Producer requirement(s) | Pushes toward BLOCKED (F49, inverted CR6-B1)? |
|---|---|---|---|---|
| Patience-threshold exhaustion | `patience-exhausted` | `patience-exhausted` | F50-F52, F175 | No — `patience-exhausted` is IN the not-blocked floor set `{completed, patience-exhausted, runner-capped}` (F49 inverted, CR6-B1); designed, successful methodology outcome (CR4-B2) |
| Runner-level action cap (50 actions, F57/F58) | `runner-capped` | `runner-capped` | F57, F58, F176, F123 | No — `runner-capped` is IN the not-blocked floor set `{completed, patience-exhausted, runner-capped}` (F49 inverted, CR6-B1); a capped persona still delivered a valid partial ledger, not an infra failure |
| Runner-level tool-call cap (250 calls default, F99/F100/F154) | `runner-capped` | `runner-capped` | F99, F100, F154, F176, F123 | No — same enum member and same not-blocked-floor membership as the action cap; F176 unifies both caps' producer under one `run_status` value since the founder-facing consequence (force-abort, partial ledger) is identical |
| Run-level wallclock timeout (F75/F76) | `timed-out` | — (no single in-flight task reason code beyond the persona-level `timed-out` status; the partial ledger is merged as-is, F76) | F75, F76, F174 | Yes — `timed-out` is EXCLUDED from the not-blocked floor set `{completed, patience-exhausted, runner-capped}`, so it lowers the floor count and pushes toward BLOCKED (F49 inverted, CR6-B1) — a timeout is an infra-failure signal, not a designed outcome |
| Persona crash (unhandled exception / browser death) | `crashed` | — (crash is an infra fault at the persona-execution level, not a per-task refusal reason; F56's reason-code axis is for a *deliberate* per-task non-completion, not an unplanned fault) | F173 | Yes — `crashed` is EXCLUDED from the not-blocked floor set `{completed, patience-exhausted, runner-capped}`, so it pushes toward BLOCKED (F49 inverted, CR6-B1); 3-of-3 crashed now correctly computes BLOCKED, closing the defect where the pre-CR6 `{completed, crashed, timed-out}` counted set computed count=3 and could never trigger BLOCKED |
| Target-unreachable at crawl start (F80, exit code 3) | — (no persona is ever delegated; findings.json may not exist at all — this is a pre-crawl CLI refusal, not a persona terminal state) | `target-unreachable` | F80, F85, F86, F123 | N/A — the run never starts; F49's BLOCKED trigger is a post-crawl findings.json concept that presupposes at least an attempted delegation |
| Denylist-abort (F37/F38) | `completed` (the persona continues; only the one flagged step is aborted) | `denylist-abort` | F38, F123 | No — per-step refusal, not a persona-terminal state |
| Robots.txt disallow (F41/F42) | `completed` (persona continues; only that navigation is aborted) | `robots-disallowed` | F42, F123 | No — per-step refusal, not a persona-terminal state |
| Default dry-run boundary stop (F40, non-`audited_terminal_step`/`precondition_step`) | `completed` (persona continues; only that submission is withheld) | `dry-run-boundary-stop` | F40, F123 | No — per-step refusal, not a persona-terminal state |
| Successful completion (implicit default) | `completed` | (no reason code — `task_completed:true`, F56 only fires when `task_completed` is `false`) | — (absence of every other trigger) | No — `completed` is IN the not-blocked floor set `{completed, patience-exhausted, runner-capped}` (F49 inverted, CR6-B1) |

Every `run_status` member (F53's now-5-value closed enum) has exactly one producer citation in
`docs/specs/0001-ux-gauntlet-mvp.spec.md`'s "Enum / flag-family → producers" table (F173-F176 plus the
implicit `completed` default), closing the mapping totality Pattern A required. `reason_code` (F123)
stays an explicitly OPEN "at minimum" enumerated set (unlike `run_status`, which is closed) because a
future refusal class (a new D15-family flag, for instance) can add its own reason code without a spec
revision to the closed `run_status` axis — this asymmetry is intentional, not a residual gap: `run_status`
answers "what happened to this persona," a small closed taxonomy; `reason_code` answers "why did this
specific task not complete," an open taxonomy that grows with the refusal layer (D11).

## CR5 canonical token table

Challenge round 5's panel named a single root-cause class behind its 2 BLOCKERs (F170's false
"sole input" claim, F49's requirements.txt-vs-fixture BLOCKED-trigger drift) and one MAJOR (F52's
hyphenated `failed-by-patience` vs. every frozen fixture's underscored `failed_by_patience`): the
same conceptual value spelled, or claimed, differently across requirements.txt / spec.md / fixtures /
tests. This table is the mandated sweep of EVERY closed-enum value family in the spec, not just the
3 cited instances, so the whole class is closed at once rather than patched per-occurrence.

**Tie-break rule applied uniformly below:** prefer the value the frozen fixtures already use where a
gate depends on it (fixtures are the executable ground truth this whole pre-build suite gates
against); otherwise prefer the requirements.txt spelling. Every row below was checked by grepping all
of `test/fixtures/*.json`, `.swe-spec/requirements.txt`, and `docs/specs/0001-ux-gauntlet-mvp.spec.md`
for every literal-string variant (hyphen vs. underscore, singular vs. plural field name) of each
family.

| Family | Field name | Casing convention | Canonical members | Tie-break outcome |
|---|---|---|---|---|
| `run_status` (F53) | `run_status` | kebab-case | `completed`, `crashed`, `timed-out`, `patience-exhausted`, `runner-capped` | Unanimous across all fixtures; requirements.txt F53 already matched — no change needed. |
| Task-ledger outcome (F52) | `outcome` | snake_case (multi-word values, NOT kebab-case — a distinct convention from `run_status`/`reason_code`, which is exactly why this family drifted) | `in_progress`, `failed_by_patience`, `aborted`, `blocked`, `executed` | **CHANGED.** 3 frozen fixtures (`patience-abandon-with-evidence.json`, `patience-identity-divergent-personas-merged-ok.json`, `patience-identity-divergent-values-bad.json`) unanimously write `failed_by_patience`; requirements.txt F52, spec.md, and UNKNOWNS-DELTA.md all previously said the hyphenated `failed-by-patience` — WRONG per the tie-break rule. requirements.txt F52 and spec.md corrected to `failed_by_patience` (CR5-M1); a literal-equality assertion was added to the acceptance test so a future respelling fails RED (`docs/research/UNKNOWNS-DELTA.md` is out of this pass's edit scope per the established CR2-13/CR3 precedent — its `failed-by-patience` spelling is now the one stale artifact left uncorrected, same category of accepted residual as DECISION-BRIEF.md's untouched §6 wording under CR2-13). |
| `reason_code` (F123) | `reason_code` | kebab-case | `dry-run-boundary-stop`, `denylist-abort`, `robots-disallowed`, `patience-exhausted`, `target-unreachable`, `runner-capped` | Unanimous (`ledger-reason-code-ok.json`: `denylist-abort`); requirements.txt F123 already matched — no change needed. |
| `friction_type` (F177) | `friction_type` | snake_case | `extra_action`, `ambiguity_resolution`, `terminal_friction`, `walkthrough_failure` | Unanimous across fixtures and F177 — no change needed. |
| `convergence_tier` / `partial_tier` (F17/F120) | `convergence_tier`, `partial_tier` | integer, not a string enum | n/a — derived values, not literal tokens | **CHANGED (BLOCKER-1, CR5-B1).** F170 falsely claimed `personas_flagging` is convergence_tier's "sole input" — a claim F17's own definition (count of run_status-completed flaggers) and the frozen `run-status-not-blocked-patience-only.json` fixture both disprove (`personas_flagging` length 2, `convergence_tier` 0, because neither flagger's `run_status` is `completed`). F170 corrected to state only its true scope (WHO flagged it, regardless of run_status); F17 remains the sole derivation authority for the join. No fixture/test changes required — the frozen fixture already encoded the correct join behavior; only the requirement/spec prose was wrong. |
| D15 per-step flags | `payment_step`, `precondition_step`, `external_side_effect`, `denylist_override`, `audited_terminal_step` | snake_case boolean field names | n/a — booleans, not string enums | Unanimous across fixtures — no change needed. |
| Confidence family (F27/F124/F143) | `confidence_label`, `confidence` | kebab-case values | `lower-confidence`, `degraded-below-persona-floor` | Unanimous across fixtures — no change needed; included here for sweep completeness. |
| Per-action robots flag (NOT `reason_code`) | `robots_disallowed` | snake_case boolean field name | n/a — boolean, distinct concept from the `reason_code` value `robots-disallowed` | **NOT a collision** — `robots_disallowed` is a per-action annotation on a single navigation attempt (`robots-disallowed-nav.json`, `robots-404-allow-all-ok.json`, `robots-nav-allowed-ok.json`); `robots-disallowed` (hyphenated) is the distinct per-task `reason_code` enum value (F123). Documented here explicitly so a future sweep does not mistake this for a real spelling drift — this is exactly the "confused enum value vs. field name" defect shape CR2-6 already fixed once for `step`/`normalized_step_id`. |

**Gate-level spelling locks added (per the task mandate — at least one canonical string per family
locked by exact equality, so a future respelling fails RED):** `test/acceptance.test.mjs`'s `F50 F51
F52` test now reads `test/fixtures/patience-abandon-with-evidence.json` directly via `json()` and
asserts `tasks_ledger[0].outcome === 'failed_by_patience'` by strict equality (task-ledger-outcome
family). The `F57 F58 F53 F176` test already locks `run_status === 'runner-capped'` via its `-ok`
gate-fixture pair (run_status family, pre-existing). The `F55 F56 F123` test already locks
`reason_code === 'denylist-abort'` via `ledger-reason-code-ok.json` (reason_code family,
pre-existing). The `F10 F11 F12 F28 F34` test already locks `friction_type` membership via the
findings schema `enum` array (friction_type family, pre-existing). The corrected `F170 CR4-M8` test
now locks the convergence_tier join (not a bare `personas_flagging.length`) via
`findings-personas-flagging-provenance-bad.json` (F189, CR5-MIN6).

## Challenge round 5 (2026-07-09) — reconciliation decisions

The following table records decisions taken where a CHALLENGE-ROUND-5.md fix_directive left an open
choice, where a directive's illustrative requirement number collided with another directive's own
illustrative number (a NEW failure mode this round — several independent fix_directives each guessed
"F179" for a DIFFERENT new requirement, since none of them could see each other), or where a
directive's literal instruction conflicted with this pass's own scope boundary (`docs/research/*.md`
and `CHALLENGE-ROUND-*.md` are explicitly out of edit scope for this pass, same as CR1-CR4).

| CR5 tag | Decision | Reversible default chosen | Why |
|---|---|---|---|
| CR5-numbering (all 12 new requirement lines) | Every one of BLOCKER-2, BLOCKER-4, MAJOR-2, MAJOR-3, MAJOR-4, MINOR-2, MINOR-3, MINOR-4, MINOR-5, MINOR-6, MINOR-7's fix_directives independently suggested "F179" (or, for BLOCKER-2, the lettered `F117a`/`F117b`) as the next available id — none of the panel's parallel review lenses could see the others' suggested numbers, so up to 6 different new requirements would have collided on the literal string "F179" if landed verbatim. | Assigned the actual next-available sequential IDs at pass start: F179-F190 (12 new functional requirements, matching the 12 defects that needed a genuinely new requirement line, out of 18 total confirmed defects). The lettered-suffix style (`F117a`/`F117b`) was translated to sequential IDs (F179/F180) per the CR4-numbering precedent (no lettered-suffix ID has ever shipped in this document). | Collision avoidance — requirements.txt is append-only per its own established convention; the panel's own numbers were always illustrative ("e.g."/best-guess), never a binding contract on the actual ID space. Identical resolution pattern to CR3-2/CR3-7/CR3-10/CR4-numbering, now additionally covering directive-vs-directive collisions (not just directive-vs-already-landed collisions). |
| CR5-B1 (F170 fix scope) | The panel's own suggested F170 replacement text restates F17's entire join definition inline ("...convergence_tier (F17) MUST be computed by counting only the entries in personas_flagging whose corresponding persona...has run_status equal to completed"), producing a single requirements.txt line with 2 independent MUST clauses (carry personas_flagging + compute convergence_tier) — the same non-atomicity shape CR4's own repair cycle already flagged and split (F168/F178) even though it does not literally trip req-lint's mechanical and/or check. | Landed a MINIMAL fix instead: F170 now states only its own true scope (personas_flagging carries every flagging persona regardless of run_status), with a clarifying dependent clause distinguishing it from F17's convergence_tier count — one MUST clause. F17 (unedited, already correct: "convergence tier equal to the integer count of run_status-completed personas that flagged it") remains the sole derivation authority. | The actual defect was ONLY the false "sole input" claim F170 added on top of an already-correct F17 — F17 never needed to be restated, and doing so would have manufactured a new 2-decision line into a document that just finished a repair cycle removing exactly that shape. Minimal, atomic, and traceable to the real root cause rather than the panel's own (non-atomic) suggested wording. |
| CR5-B4 (F162 fix, abandonment-branch removal) | The fix_directive's suggested F162 replacement drops the persistence bucket's top-end "-or-never-resolved" qualifier entirely (leaving that signal solely to F161's own `task-abandoned-or-never-resumed=4` impact bucket) and redefines `same_run_recurrence_count` as `F136`'s raw re-encounter count minus 1, rather than an independently-authored count. | Landed verbatim as directed; updated the one fixture the directive named (`findings-severity-impact-persistence-mapped-ok.json` fr-992: `raw_within_run_reencounter_count` unchanged at 1, `same_run_recurrence_count` corrected from 2 to 0, `severity_factors.persistence` corrected from 1 to 0, `severity` recomputed from `round(mean(0,4,1))=2` to `round(mean(0,4,0))=1`) and added a second, genuinely-multi-occurrence fixture (`findings-persistence-multi-occurrence-ok.json`, `raw_within_run_reencounter_count=4` -> `same_run_recurrence_count=3` -> persistence bucket `3-5=2`) so the persistence≠0 branch is still exercised honestly, per the directive's own explicit instruction. | No independent judgment needed beyond fixture arithmetic — the directive's redefinition is concrete, and the severity recomputation is mechanical once `same_run_recurrence_count`'s new definition is applied. |
| CR5-M2 (F60 replacement shape) | The fix_directive's suggested F60 replacement text uses literal "or" three times inside one enumerated list ("a Location header or a JSON body field named id or url"), which trips req-lint's atomicity check. | Reworded the enumeration using `/`-separated alternation (matching the F166/F167 `Cookie: / Set-Cookie:` precedent already established in this document) instead of literal "or". Semantic content unchanged. | Mechanical req-lint compliance without altering the fix_directive's actual intent; `/`-alternation is this document's own established idiom for "matches any of" lists, not a new convention invented for this fix. |
| CR5-MIN3 (F81/F186 split, no new live test) | The fix_directive asks for "one existence/shape fixture test in test/acceptance.test.mjs asserting the merged status file contains a per-persona last_completed_step field after a run." | NOT added. F81/F186 remain in the already-disclosed zero-coverage tier (spec.md "Known verification gaps"). | Proving this would require a real `run-gauntlet.mjs` invocation against a reachable target writing a real status file to disk — the identical infeasible-pre-build shape already resolved at CR2-2/CR2-7/CR2-14 (no live fixture server exists in this repo). Fabricating an assertion against an unreachable target would either be a no-op (asserting nothing about actual behavior) or silently pass on stub output, violating this repo's own established "don't fabricate unbuildable live-CLI proofs" precedent. The gap stays honestly disclosed instead. |
| DECISION-BRIEF.md / UNKNOWNS-DELTA.md / CHALLENGE-ROUND-*.md (scope boundary, unchanged) | MAJOR-1's fix_directive asks to also edit `UNKNOWNS-DELTA.md:50`'s `failed-by-patience` spelling. | NOT applied — `docs/research/UNKNOWNS-DELTA.md` is under `docs/research/`, explicitly out of this pass's edit scope per the executor's own task boundary (identical to the CR2-13/CR3 precedent already recorded above in this file). | The task instruction's hard boundary ("no edits to docs/research/*.md") takes precedence over a fix_directive's action item when the two conflict — same reasoning as CR2-13. requirements.txt and spec.md (the artifacts that ARE in scope) now both carry the corrected `failed_by_patience` spelling and a gate-level literal-equality lock proving it; only the research document's own prose is left with the stale spelling, the same category of accepted residual CR2-13 already established for DECISION-BRIEF.md §6. |

### CR5 rejected attacks (not applied — panel verdict, not this pass's judgment call)

Per CHALLENGE-ROUND-5.md §3, 8 raw attacks were rejected by the panel itself before reaching this
pass (F38/F129 reconciliation already explicit; `--i-own-this-target`/`--env` distinct-rationale
duplication; `--tasks`/`--denylist` default-parity; N8 scope-note co-location; D15's robots.txt
localhost carve-out already adjudicated at CR3; F26/F151's convergence_tier gating already
adjudicated at CR1-19; F27's opt-in confidence routing already a documented soft "should"; the
186/177 traceability-count attack simply misquoted the file's actual current content). None required
action in this pass; recorded here only so a future reader does not re-litigate them as if unseen.

## CR6 arbitration

Challenge round 6 (`.swe-spec/CHALLENGE-ROUND-6.md`, 17 confirmed defects: 7 BLOCKER, 4 MAJOR, 6
MINOR; 5 rejected by the panel). The panel's own §4 systemic observation is that THREE independently
confirmed BLOCKER attacks target ONE requirement — F49's BLOCKED counted-set formula — and propose
THREE MUTUALLY INCONSISTENT fixes. This pass ARBITRATES the disagreement with a stated principle
before patching, rather than mechanically applying all three (which would re-break the requirement).

### Arbitration 1 — F49 BLOCKED counted set (the 3-way conflict) — DECIDED: invert the counted set

**Principle.** `crashed` and `timed-out` are INFRA-FAILURE signals that BLOCKED exists to catch;
`patience-exhausted` and `runner-capped` are DESIGNED non-failure outcomes (F50-F52 patience is a
successful methodology result; F57/F154/F176 runner-caps still deliver a valid partial ledger);
`completed` is success. Therefore the not-blocked floor set is `{completed, patience-exhausted,
runner-capped}` and BLOCKED := count(personas in that set) < 3; `crashed`/`timed-out` are excluded
from the floor and push toward BLOCKED. This matches DR-08's original intent (crash = non-completion)
and ADR-0001's "near-total persona failure must not read as clean CI".

**Chosen fix:** the round-6 "invert the counted set" directive (BLOCKER row 1). Verified against ALL
three ground-truth cases at once:
- `run-status-not-blocked-patience-only.json` (1 completed + 2 patience-exhausted): floor count = 3, NOT < 3 → NOT BLOCKED ✓ (matches frozen ground truth "completed").
- `run-status-blocked-with-disclosure-ok.json` (2 completed + 1 crashed): floor count = 2 < 3 → BLOCKED ✓ (matches frozen ground truth "BLOCKED").
- 3-of-3 crashed (new `run-status-blocked-all-crashed.json`): floor count = 0 < 3 → BLOCKED ✓ (the paradigm case the pre-CR6 formula could never catch).

**Rejected alternative A — floor-AND-crash-trigger** ("BLOCKED iff ≥1 crashed/timed-out AND fewer
than 3 completed"). REJECTED as **redundant**: F53's run_status enum is closed to exactly
`{completed, crashed, timed-out, patience-exhausted, runner-capped}`, and F107/F108 guarantee ≥3
personas are delegated. Given that closed enum, "fewer than 3 in the not-blocked floor set" ALREADY
implies "≥1 crashed-or-timed-out" — the extra AND-clause is subsumed by the floor and adds a second
condition that can never independently fire. The inverted-set formula IS this formula collapsed to
its non-redundant core.

**Rejected alternative B — any-crash-trigger, no floor** ("BLOCKED iff any persona is crashed or
timed-out"). REJECTED as **removing the 3-persona floor the reliability rationale needs**: it BLOCKS a
run of 3 completed + 1 crashed (4 personas), even though the ≥3-completed convergence floor DR-08/F16
require was fully met — a 4th persona crashing after 3 succeeded does not invalidate the run. The
floor is load-bearing (convergence tiers assume ≥3 valid personas); dropping it over-blocks valid
runs. F107/F108 guarantee ≥3 delegation but NOT ≥3 non-failure terminal outcomes, so F49 still needs
the terminal-outcome floor, not just a presence-of-crash trigger.

**Applied coherently in ONE pass** across all four surfaces so no literal drifts stale behind the
fix (the exact CR5-B3 drift defect this round re-attacked): requirements.txt F49 (CR6-B1), spec.md
line 201 partial-run-visibility bullet, ADR-0001 exit-codes paragraph, and this file's CR4
closure-sweep table (the Persona-crash / timeout rows flipped to "pushes toward BLOCKED", the
patience/runner-capped/completed rows re-annotated as "in the not-blocked floor set"; the column
header renamed "Pushes toward BLOCKED (F49, inverted CR6-B1)?"). New fixtures:
`run-status-blocked-all-crashed.json` (positive: CI nonzero via F101) + its boundary negative control
`run-status-not-blocked-runner-capped-boundary-ok.json` (1 completed + 2 runner-capped = NOT BLOCKED).

### Arbitration 2 — the test-lock gap class the panel named (freeze-readiness gap) — F191 added

The panel observed that TODAY no test proves the orchestrator COMPUTES run_status / convergence_tier
/ BLOCKED from a persona list — every fixture HAND-SETS them, so even after the F49 wording fix
nothing would catch a mis-computation. This is a real freeze-readiness gap, not a wording issue. Added
a computation-level requirement **F191** (report-gate.mjs MUST recompute BLOCKED from the per-persona
run_status list under F49's counted-set rule and exit nonzero when the stored run_status disagrees) +
a fixture-pair test (`F191 CR6-B6`): `run-status-blocked-all-crashed.json` (derivation agrees → PASS)
vs. `run-status-derived-blocked-mismatch-bad.json` (3 crashed personas, stored run_status "completed"
→ FAIL). RED (no script yet), but it locks DERIVATION, not just schema shape.

### Per-defect disposition (applied severity = JUDGE's severity from CHALLENGE-ROUND-6.md §2)

| # | Defect (panel severity) | Disposition | Trace | Notes / reintroduction check |
|---|---|---|---|---|
| 1 | F49 counted set contradicts F101 (BLOCKER) | APPLIED — invert counted set | CR6-B1 | Arbitration 1. Reconciled 3-way conflict; 2 alternatives rejected with reasons above. |
| 2 | F49 computes opposite of both fixtures — floor-AND-crash fix (BLOCKER) | REJECTED alt | CR6-B1 | Redundant given closed F53 enum + F107/F108 (see Arbitration 1-A). Same root defect. |
| 3 | payment_step can never submit under --test-mode (BLOCKER) | APPLIED — F196 (payment_step = narrow F40 exemption, test_mode-gated) | CR6-B2 | New fixture `payment-testmode-submits-ok.json`; neg control = existing `payment-no-testmode.json`. Checked against D15 (does NOT add a 6th flag; adds a conditional F40-exemption behavior to the existing payment_step flag) and F164 (no flag stacking) — no conflict; D15 precedence clause (1) updated. |
| 4 | N8 flagship-file stand-in (BLOCKER) | APPLIED — N8 test now invokes `examples/tasks.json`, not `test/fixtures/tasks.json` | CR6-B3 | Grepped test file: only the N8 test used the tasks file as a first-run SUCCESS proof (refusal tests legitimately use any tasks file). No req change. |
| 5 | F49 contradicts both fixtures — any-crash-no-floor fix (BLOCKER) | REJECTED alt | CR6-B1 | Removes the ≥3 floor the reliability rationale needs (see Arbitration 1-B). Same root defect. |
| 6 | F159 frequency bucket ≡ F162 persistence bucket, bit-for-bit (BLOCKER) | APPLIED — F181 restated to exact-identity, F12 discloses reduces-to round((2*frequency+impact)/3) | CR6-B4 | Verified by enumeration (r=c-1 substitution). Did NOT re-derive persistence from an independent signal (out of scope at spec phase, per directive) — disclosed honestly. CR5-B4 record clarified (its shift-by-1 was a math no-op; only disclosure corrects it) in the F161/F162 test comment. |
| 7 | gate() dispatches on literal filename — filename-keyed static table gameable (BLOCKER) | APPLIED — F192 (content-derived exit code/output) + runtime-generated-fixture anti-gaming test | CR6-B5 | mkdtemp per-test paths + one-field mutations (merged-severity flip; render friction_name marker). Cross-ref F23/F24/F119/F153/F189. No requirement-scope expansion — makes existing content-driven behavior explicit. |
| — | (panel freeze-readiness gap) orchestrator never proven to COMPUTE run_status/BLOCKED | APPLIED — F191 + derivation-lock fixture pair | CR6-B6 | Arbitration 2. |
| 8 | F183 tier-5 undefined when zero qualifying ancestors (MAJOR) | APPLIED — F193 (documentElement terminal case) + fixture pair | CR6-M1 | `findings-icon-only-zero-qualifying-ancestor-merged-ok.json` / `-divergent-bad.json`. Mirrors the F183 CR5-M3 test pattern. |
| 9 | F184/F12 lets report attribute score to "NN/g rubric" on swapped/free-text paths (MAJOR) | APPLIED — F194 (7th disclosure condition) + spec.md validity-envelope bullet + render-report test | CR6-M2 | Reuses `findings-custom-severity-rubric-ok.json` (non-default rubric) + `findings-custom-heuristic-set-ok.json` (free-text severity_factors). |
| 10 | run-gauntlet.mjs `--ci --baseline` never invoked; ADR vs spec.md contradiction (MAJOR) | APPLIED — Option B: ADR reworded — run-gauntlet does NOT diff; ci-diff.mjs owns CI mode | CR6-M3 | Chose Option B over Option A (add a run-gauntlet --ci test) to REDUCE interpretation surface per the task's "do not introduce new interpretation surface" constraint: Option A would have created a second, partly-duplicate CI implementation obligation. ADR flag-table row + exit-codes paragraph aligned to spec.md:247's actual narrative (F101 test already invokes ci-diff.mjs). No new test. |
| 11 | report-gate.mjs bare-arg production form never tested (MAJOR) | APPLIED — added `F23 CR6-M4` test invoking the bare positional form | CR6-M4 | Reuses existing pass/fail fixtures (findings-valid.json / finding-untagged.json). No req change — F23 already covers "the JSON findings file"; the gap was a missing invocation form. |
| 12 | F31 unconditional "parallel" unsatisfiable under F98 queuing (MINOR) | APPLIED — F31 reworded (delegated concurrently up to --max-parallel, excess queued per F98) | CR6-MIN1 | Consistent with F98 cap+queue and F134 overlap (min(persona_count, max_parallel) ≥ 2 always overlaps). |
| 13 | F123 binds whole reason_code enum to F56, but target-unreachable has no F56 ledger entry (MINOR) | APPLIED — F123 reworded ("every reason_code emitted by any producer among F56, F80") | CR6-MIN2 | Matches spec.md's producer table (target-unreachable producer = F80). CR5 canonical token table reason_code family unchanged (enum values identical). |
| 14 | No self-consistency check: shipped denylist vs shipped example terminal label (MINOR) | APPLIED — F195 + assertion in the F83 test | CR6-MIN3 | audited_terminal_step exempts only F40, never F38; F164 forbids stacking denylist_override. |
| 15 | DR-28 first-run "under 5 min" met only for canned demo, not real authoring (MINOR) | SKIPPED-with-reason | — | The directive's fix is an informational line in SKILL.md's quickstart — but SKILL.md is a BUILD-phase artifact that does not exist at spec phase (only F83 references it by name). No requirements.txt change (the directive itself says none needed); the F56/F123 `dry-run-boundary-stop` reason_code mechanism already closes the silent-failure mode. Recorded as accepted residual for the build phase, same category as CR5-MIN3's infeasible-pre-build proofs. |
| 16 | Test invokes `--help`, a flag ADR-0001's table never lists (MINOR) | APPLIED — added `--help` row to ADR-0001 flag table | CR6-MIN5 | Content obligation already in F152; this closes the table/prose completeness gap. |
| 17 | scrub-log recorded RED-baseline count (71) stale vs current suite (MINOR) | APPLIED — see count sync below | CR6-MIN6 | Superseded by the CR6 count sync: suite is now 82 tests (76 pre-CR6 + 6 CR6). |

### CR6 numbering note

Per the CR3-2/CR3-7/CR3-10/CR4-numbering/CR5-numbering precedent: two round-6 fix_directives each
independently suggested "F191" for a DIFFERENT new requirement (the content-derivation anti-gaming
line AND the F184/F12 rubric-attribution line), and a third suggested lettered "F183a". None could
see the others. Assigned the actual next-available sequential IDs at pass start: **F191-F196** (6 new
functional requirements; no new N lines — every CR6 addition is a derivation/disclosure/refusal
policy, still needed under the Perfect Technology Filter). Mapping: F191 derivation-lock (CR6-B6),
F192 content-derivation (CR6-B5), F193 documentElement terminal (CR6-M1), F194 rubric-attribution
disclosure (CR6-M2), F195 denylist/example self-consistency (CR6-MIN3), F196 payment test-mode F40
exemption (CR6-B2). The lettered "F183a" was translated to sequential F193 (no lettered-suffix ID has
ever shipped in this document). Edits to existing lines (F12, F31, F49, F123, F181) are made in place;
the CR6 section of requirements.txt holds only the new F191-F196 lines.

### CR6 count sync (supersedes the stale CR4 "71 tests" / CR5 "199 lines" snapshots)

Post-CR6 fresh re-runs from repo root: `req-lint.sh .swe-spec/requirements.txt` → **205/205 PASS**
(199 pre-CR6 + 6 new F191-F196; 196 functional + 9 nonfunctional); `coverage-audit.sh --pre-freeze`
→ **8/8 stages PASS**; `test-coverage-audit.sh` → **95/95 CRITICAL PASS** (up from 91/91 post-CR5;
F191, F192, F194, F196 newly covered as CRITICAL citations); `node --test test/acceptance.test.mjs`
→ **82 tests, 0 pass, 82 fail** (RED preserved; 76 pre-CR6 + 6 new CR6 blocks). The RED baseline
count last recorded in this file as "71 tests" (CR4 snapshot, line ~169) and "76 tests" (CR5) is now
82 (CR6-MIN6 resolution — validation.md remains the file of record and is updated in the same pass).

## CR7 consolidation + freeze-readiness

Challenge round 7 (`.swe-spec/CHALLENGE-ROUND-7.md`, 17 confirmed + 5 rejected) is the round where the
panel's own §4 systemic observation surfaced the real state of the spec: 6 additive rounds grew it 43→205
requirements, and the panel is now finding **internal redundancy** (F78/F79 [DR-25] describe the SAME
patience-abandonment event as F50-F53/F175 [DR-09]; F149/F150 step-normalization rediscovered by 3
independent lenses) rather than product-wrong behavior. The convergence move is **consolidation**, so this
pass DEDUPES and DISCLOSES rather than adds. Net requirement delta: **0** (F78/F79 deleted, F197/F198
added — functional count stays flat at 196, total 205). This is the arbitration record.

### Dedupe / merge table (what merged into what)

| Removed | Folded into (survivor) | DR tags kept on survivor | Rationale |
|---|---|---|---|
| **F78** ("terminate its crawl" on patience threshold, DR-25a) | **F50** (abandon the current task, DR-09a) | `# DR-09a DR-25a CR7-1` | ONE event. F78's "terminate whole crawl" scope is irreconcilable with F50's "abandon current task" for any >1-task list; the DR-09 abandon-task scope is canonical. F78 deleted. |
| **F79** (emit distinct run-status event `patience-exceeded`, DR-25b) | **F175** (set run_status `patience-exhausted`, CR4-S1) | `# CR4-S1 DR-25b CR7-1` | ONE event. F79's literal `patience-exceeded` is a stale spelling the F53/F123/F175 enum never uses (canonical = `patience-exhausted`, per the CR5 canonical token table). F79 deleted. |
| — (replacement, not a merge) | **F197 + F198** (robots-blocked-all false-negative, CR7-2) | new lines | The one genuinely-new product-wrong behavior this round (silent all-zero clean report when a blanket `Disallow:/` aborts every navigation) replaces the deleted duplicate pair, so the count stays flat. |

**Net requirement delta: 0.** requirements.txt: 205 lines before → 205 lines after (196 functional, 9
nonfunctional). spec.md HIGH-item bullet at old line 232 (F78/F79) removed; a robots-false-negative HIGH
bullet (F197/F198) added in the same section. categorized-requirements.md F78/F79 rows marked DELETED,
F197/F198 rows added. lint-result.txt regenerated (205/205 PASS). No IDs reused (append-only convention).

### F149/F150 systemic cluster (3 lenses, ONE root) — resolved by DISCLOSURE, not a new mechanism

The panel's §4 obs #1 correctly traces BLOCKER#3 (fixture-vs-formula), the differing-`patience_threshold_steps`
MAJOR, and the F190-convergence_tier-misleading MAJOR to ONE unfixed root: F149/F150 normalized
`target_element_identifier`/`heuristic_tag` for terminal_friction identity but never normalized `step`.
The panel's own two lenses split on the fix: one proposed a disclosure, the other proposed a new mechanism
(F150a: fix `step` to constant 0). **Arbitration: DISCLOSE, do not add F150a.** A step-normalization
mechanism is a v2 behavior change, out of scope for a consolidation pass, and inconsistent with the
CR6-B4 disclose-don't-rederive posture already governing the severity-formula duplication. Applied as:
(a) spec.md CR3-5 bullet gains a scope-disclosure (CR7-4) stating the corroboration guarantee holds only
for identical-`step` abandonment and that `partial_tier`, not `convergence_tier`, is the corroboration
signal for the patience-abandonment class; (b) the two contradictory positive-control fixtures REPAIRED
(below). Zero new requirements for this cluster.

### Contradictory-fixture repairs (CR7-3) — hygiene that was locking impossible ground truth

- `patience-identity-divergent-personas-merged-ok.json`: both personas now carry `run_status:
  patience-exhausted`; `convergence_tier` 2→0, `partial_tier` 0→2 (F17 counts only run_status=completed
  flaggers — with 0 completed, convergence_tier=2 was **unreachable** for any spec-compliant orchestrator,
  yet the F149/F150 test cited this fixture by name as canonical proof); `confidence` added; narrative
  reworded from convergence_tier to partial_tier corroboration. `component_severities` [3,3] was already
  present. Test message at the F149/F150 block updated to "partial_tier=2, convergence_tier=0"; the
  `gate()` exit-code assertion is unchanged (still RED). This is the arbiter-endorsed BLOCKER#3 repair
  minus its proposed new convergence_tier-recompute requirement (declined — see residuals).
- `run-status-not-blocked-patience-only.json`: `component_severities` [4,4] added to its 2-persona merged
  finding (F118 requires it for any F46-merged finding; it was missing). No tier change (this fixture was
  already internally consistent: convergence_tier=0, partial_tier=2).

### Applied vs rejected — per-defect disposition (round-7 panel §2/§3)

| Round-7 item (panel severity) | Disposition | Reason |
|---|---|---|
| **F78/F79 vs F50-F53 duplicate** (BLOCKER) | **APPLIED — DEDUPE** | Primary mandate. Deleted F78/F79; folded DR-25a→F50, DR-25b→F175. Removed a real build-time contradiction (terminate-crawl vs abandon-task; `patience-exceeded` vs `patience-exhausted`). |
| **robots-blocked-all silent false-negative** (BLOCKER) | **APPLIED — F197/F198** | Close-real-behavior: an all-zero exit-0 "clean" report on a blanket-robots-disallow target is actively misleading (the strongest wrong-output case this round). Added summary field + stderr warning; 2 fixtures + 1 RED test. Replaces the deleted pair (net 0). |
| **fixture convergence_tier=2 unreachable + F149/F150 cite it** (BLOCKER) | **PARTIAL — fixture repaired, recompute-gate requirement DECLINED** | Fixture repaired (CR7-3, above); this closes the contradiction. The proposed new convergence_tier/partial_tier recompute-gate requirement (mirror F191) DECLINED as a consolidation-pass addition — convergence_tier mismatch is ALREADY gate-covered (test lines 394/400/1038 reject `convergence_tier != count(personas_flagging)` and crashed-inflated tiers); the full personas_flagging×run_status recompute is a build-phase F191-generalization residual (panel obs #3). |
| **F192 anti-filename-dispatch scoped to only 2 of 5 scripts** (BLOCKER) | **DECLINED — residual** | Test-rigor / anti-gaming, not product-wrong-output: an honest build is unaffected; only a builder gaming the suite via a filename lookup table is enabled. Documented residual for build phase (extend F192's content-derivation lock to ci-diff.mjs/validate-persona.mjs). Not a freeze blocker. |
| **patience_threshold_steps divergence breaks corroboration** (MAJOR) | **APPLIED — DISCLOSURE (CR7-4)** | Arbiter-directed: narrow the rationale, do not add F150a. spec.md CR3-5 bullet discloses the identical-`step`-only scope + partial_tier signal. |
| **F45/F177 friction_type merge collision** (MAJOR) | **DECLINED — residual** | The collision needs two DIFFERENT friction_types at an identical (heuristic_tag, step, target_element_identifier) tuple. The built product still emits a schema-valid single friction_type (F177 is satisfiable); only the tiebreak on a rare merged finding is under-specified. Heavy fix (component_friction_types array + precedence + amend F177). Documented residual, not wrong-output. |
| **F165 pipe-delimiter hash collision** (MAJOR) | **REJECTED — not reachable** | The claimed collision requires a shared `\|` to redistribute across field boundaries. But `heuristic_tag` is drawn from the configured set (F11 — kebab-case tag ids, pipe-free) and `step` is an integer index (F45/F147): both non-terminal join fields are pipe-free, so `${tag}\|${step}\|${id}` parses unambiguously and uncontrolled accessible-name text (F103 tier-2) only ever lands in the TERMINAL `id` field, which cannot shift a boundary. Two distinct tuples cannot collide. (Residual sliver: a pathological operator-authored CUSTOM heuristic tag containing a literal `\|` — operator controls their own config; near-theoretical.) No F165 change; avoids a needless recompute of every precomputed-hash fixture. |
| **F179 CDP synchronicity signal unobservable** (MAJOR) | **DECLINED — build-phase clarification** | F40's default is fail-safe (do NOT submit); a competent builder maps F179 to CDP/Playwright request `initiator` stack + a correlation time-window. Buildability clarification, not wrong-output. Reword deferred to build phase (touches F179/spec/ADR + a fixture — churn on a just-settled CR5-B2 line). |
| **N8 denylist/audited_terminal collision for operator tasks.json** (MAJOR) | **DECLINED — top residual** | Real operator-hostility gap (silent mid-run F38-abort of the audited terminal step) but ledger-traceable (`denylist-abort` reason_code, F56) and safe-by-default (abort, never a dangerous click); F195 already prevents it for the SHIPPED example. Generalizing F195 to a static launch precondition is the recommended build-phase follow-up. Not untraceable-wrong-output. |
| **F190 convergence_tier=0 misleading for terminal_friction** (MAJOR) | **APPLIED (disclosure part) / DECLINED (F190 stderr change)** | The convergence_tier=0-is-correct-for-non-completed-flaggers fact is now disclosed via the CR7-4 partial_tier scope note. The proposed F190 amendment (add partial_tier to ci-diff stderr) + new disclosure requirement DECLINED as additions; the disclosure carries the operator-facing resolution. |
| **severity frequency/persistence triage consequence undisclosed** (MAJOR) | **APPLIED — F181 amended (CR7-6)** | Disclosure-completeness, in place (net 0). Appended the downstream-triage consequence (ranking can invert: impact-4 single-encounter < impact-0 recurring) to F181 + the spec validity-envelope bullet. Explicitly NOT a formula change — the impact-floor was already rejected at CR6-B4 (this EXTENDS that disclose-don't-rederive decision, does not re-litigate it). |
| **run_status not-BLOCKED never an atomic MUST** (MINOR) | **DECLINED — hygiene** | Panel itself calls it "a req-lint hygiene gap, not an undiscoverable trap"; the fixture + test already encode the `completed` literal. Adding an F-line is pure surface. |
| **Summary brands "NN/g 3-factor rubric" unhedged** (MINOR) | **APPLIED — docs hedge (CR7-5)** | spec.md Summary now carries the persistence=frequency-duplicate hedge (net 0, docs-only). |
| **exit code 2 has zero test coverage** (MINOR) | **REJECTED — re-litigates D9** | D9/spec.md:332 explicitly carves exit-2 out as "no dedicated F-line"; the panel acknowledges this is "a documented, deliberate scope decision." Adding F36a contradicts a durable recorded decision — reviewer disagreement with D9 is not a spec defect. |
| **F129 denylist_override_used no negative control** (MINOR) | **DECLINED — test-rigor + RED-safety risk** | Control-pair completeness only; a bad-only `notEqual(code,0)` assertion would PASS against the missing script (breaking the 0-pass RED invariant unless carefully paired). Documented residual. |
| **N8 test uses 6 flags incl --headless vs "only 5"** (MINOR) | **DECLINED — test-rigor** | `--headless` is redundant-with, not contradictory-to, the F87 auto-default; verification-rigor gap only, not wrong-output. |

### Rejected re-litigations (panel's own §3, concurred)

The panel itself rejected 5 attacks that re-open durable decisions (F119 MAX-merge → D13; CI-gate-on-sev4
→ D3 + CR1-19 + scrub-log CR5; N8 promise scope; F37 always-explicit denylist → ADR-0001:53-57; N8
staging 6th flag → F67/F68). This arbiter concurs — all trace to recorded, reasoned decisions, not
missing context. Per the standing contract, no round-7 attack that re-litigates the **CR6 arbitration**
(F49 inverted counted set) or the **CR5 canonical token table** (run_status/reason_code/outcome
spellings) was applied; the severity-formula duplication (CR6-B4) and the exit-2 carve-out (D9) were
likewise defended rather than re-derived.

### FREEZE-READINESS VERDICT: **FREEZE-READY** (no blocking item)

Judged against the one question that matters — *would any REMAINING known defect make the BUILT product
produce wrong output, vs being requirement-doc hygiene?*

- The single real **build-time contradiction** (F78/F79: terminate-crawl vs abandon-task on the identical
  trigger + a stale `patience-exceeded` literal) is **removed**. No requirement now contradicts another
  on a shared trigger.
- The two **contradictory positive-control fixtures** (which locked ground truth a spec-compliant
  orchestrator could never emit) are **repaired** — the acceptance suite no longer encodes impossible
  targets.
- The one genuinely-misleading built-output behavior (**robots-blocked-all silent false-negative**) is
  **closed** (F197/F198).
- The patience-convergence **overclaim** is now **honestly disclosed** (identical-`step`-only; read
  partial_tier), so the report no longer promises corroboration it cannot deliver for heterogeneous
  thresholds.

Every REMAINING known item is either (a) **ledger-traceable and safe-by-default** (M5 denylist/audited
collision — aborts, never mis-acts; `denylist-abort` in the ledger), (b) a **rare under-specified
tiebreak** on a schema-valid output (M2 friction_type-on-merge), (c) **fail-safe buildability**
(F179 CDP correlation — default is don't-submit), (d) **test-rigor / anti-gaming** (F192 scope, F129
control, exit-2, N8 --headless), or (e) a **build-phase gate-generalization** with partial existing
coverage (convergence_tier full recompute). None makes a correctly-built product silently emit
categorically-wrong, untraceable data. **Blocking item: none.**

Top build-phase follow-ups (not freeze blockers, ranked): (1) generalize F195 → a static launch
precondition rejecting an operator `audited_terminal_step` label that collides with the denylist (M5);
(2) extend F192's content-derivation lock to ci-diff.mjs/validate-persona.mjs (B4); (3) reword F179 to a
CDP-observable initiator-stack + time-window correlation; (4) generalize F191's derivation-lock to all
F46-merge-derived fields (convergence_tier/partial_tier/friction_type). All are enhancements over an
already-buildable, internally-consistent contract. Freeze is withheld only pending founder approval, per
the standing NO-freeze instruction — the SPEC itself is judged freeze-READY.

### CR7 count sync

Fresh re-runs from repo root: `req-lint.sh .swe-spec/requirements.txt` → **205/205 PASS** (196 functional
+ 9 nonfunctional; F78/F79 removed, F197/F198 added — flat); `coverage-audit.sh --pre-freeze` → **8/8
stages PASS**; `test-coverage-audit.sh` → **95/95 CRITICAL PASS** (unchanged — no CRITICAL id added or
removed; F197/F198 landed as HIGH); `node --test test/acceptance.test.mjs` → **83 tests, 0 pass, 83 fail**
(RED preserved; 82 pre-CR7 + 1 new F197/F198 block). validation.md remains the file of record.

## CR8 tail cleanup

Challenge round 8 (`.swe-spec/CHALLENGE-ROUND-8.md`, 16 confirmed: 1 BLOCKER, 7 MAJOR, 8 MINOR; 4
panel-rejected). A **tail-cleanup** pass. The BLOCKER (F49 "separate from findings.json" self-
contradiction) was already fixed in place by the prior applier — verified: requirements.txt:80 reads
"a top-level sibling of the findings array in findings.json" and spec.md:204's partial-run-visibility
bullet reads "(a top-level sibling of the findings array in findings.json)". No F49 counted-set logic
touched.

**Governing posture (per the panel's own §4 + the standing contract):** DISCLOSE / narrow over new
mechanisms (12/16 panel-confirmed items are disclosure-only); REJECT re-litigations of durable
CR6/CR7/CR5 dispositions (panel: 3/16 are re-litigation); apply severity-downgraded items at the
JUDGE's lower severity. Net requirement delta **+3** (F199/F200/F201) — the only growth closes
genuinely-new, previously-undisclosed report-content behavior; every other fix edits an existing line,
adds a spec disclosure bullet, or adds a fixture/assertion.

### Per-item disposition (applied severity = JUDGE's severity from CHALLENGE-ROUND-8.md §2)

| # | Item (panel severity) | Disposition | Trace | Notes |
|---|---|---|---|---|
| BLOCKER | F49 "separate from findings.json" self-contradiction | ALREADY-FIXED (verify-only) | — | Confirmed correct at requirements.txt:80 + spec.md:204. No change. |
| M-A | F103 tier-2/tier-4 identifier embeds F59 synthetic-identity text → convergence undercount (MAJOR) | **PARTIAL — disclosure applied, F199-strip MECHANISM DECLINED** | CR8-M1 | The core complaint is that the failure mode is UNDISCLOSED ("a mechanism F104's disclosure never names"). Applied: widened F104 (+ spec.md:229) to name this as the 3rd tuple-instability cause. DECLINED the proposed F103-identifier strip step + fixture pair as a build-phase residual — consistent with CR7's F150a precedent (declined step-normalization mechanism, chose disclosure) and the panel's OWN systemic obs ("a single normalization pass across all three tuple fields would close all four as follow-ons rather than four separate patches"). Fixing only 1 of the 3 tuple fields' nondeterminism (leaving heuristic_tag + selector-instability disclosure-only) would be inconsistent with the whole-class governance posture. Net 0 for M-A. |
| M-B | `sk-[A-Za-z0-9]{20,}` unqualified pattern redacts ordinary UI text (MAJOR) | **APPLIED — new disclosure F199** | CR8-M2 | Report-content disclosure that the sk- pattern is a generic shape match that MAY corrupt non-credential evidence text (promo/SKU/ticket). Regex deliberately NOT narrowed (directive: narrowing changes behavior, needs its own two-branch fixtures — separate CR). Landed HIGH (spec.md:229 validity-envelope bullet), so no forced CRITICAL test. Net +1. |
| M-C | F45 dedup omits friction_type → F10/F33 force-merge, undisclosed to founder (MAJOR) | **APPLIED — spec.md disclosure bullet only** | CR8-M3 | The defect itself was DECLINED at CR7 (scrub-log:435, rare under-specified tiebreak on schema-valid output). Round-8's valid point: it lived only in the internal scrub-log, absent from founder-facing spec disclosure (unlike pixel-OCR/sequential-fallback residuals). Surfaced it in "Known verification gaps"; does NOT reopen the CR7 DECLINED disposition; no new F-number. Net 0. |
| M-D | Default severity bucket thresholds branded "NN/g" though brief sources only the qualitative concept (MAJOR) | **APPLIED — F194 widened in place + Summary hedge + test** | CR8-M4 | Widened F194's trigger to fire ALSO on the untouched-default numeric branch (naming frequency/impact THRESHOLDS as the spec author's own operationalization, not NN/g-verified numbers). Tightened spec.md Summary (§19-22) to stop calling the default buckets "the NN/g 3-factor rubric". Added a default-config numeric assertion to the existing F194 render-report test block. In-place edit, no new ID. Net 0. |
| M-E | F104 convergence-undercount disclosure names only selector instability, omits heuristic_tag divergence (MAJOR) | **APPLIED — F104 widened in place** | CR8-M5 | Merged with M-A into ONE coherent widened F104 (+ spec.md:229) naming three causes: (a) selector instability, (b) cross-persona heuristic_tag divergence, (c) F59-text-in-identifier. In-place, no new ID. Net 0. |
| M-F | F26/F151 baseline-diff has no disclosed false-"new-finding" mode when identity tuple drifts between runs (MAJOR) | **APPLIED — 2 new disclosure lines F200/F201** | CR8-M6 | Distinct from M-E: this is cross-RUN heuristic_tag reclassification → different finding_id → false F26 regression block. F70/F71 cover detection MISSES, not identity-drift false positives. F200 discloses the drift; F201 instructs the operator to check the baseline for a same-step neighbor before treating a new finding_id as a regression. Per directive: NOT folded into frozen F138/F139. Landed HIGH (spec.md:229). Net +2. |
| M-G | F148 (CRITICAL) only fixture hardcodes status 404 though text says "any non-2xx / any other error" (MAJOR) | **APPLIED — fixture + assertion** | CR8-M7 | Added `robots-500-allow-all-ok.json` + a 2nd assertion in the existing F148 test block asserting code 0, proving the gate enforces the RANGE rule, not a 404-literal. No requirement wording change (text already correct). RED preserved (block already carries a failing positive control). Net 0. |
| MIN-1 | Gherkin names "click trace" evidence type with zero requirement/schema/fixture backing (MINOR) | **APPLIED — docs-only** | CR8-MIN1 | spec.md:69 "(screenshot, DOM snippet, or click trace)" → "(screenshot or DOM snippet)". Matches the only two shapes F43/F44/F166/F167 redact. Net 0. |
| MIN-2 | F41/F148 undefined behavior on a pure network-layer robots.txt fetch failure (MINOR) | **APPLIED — F148 reworded + fixture** | CR8-MIN2 | Reworded F148 to make the network-level case textually explicit (comma-list, req-lint-atomic); added `robots-fetch-network-error-allow-all-ok.json` + assertion in the F148 block; light spec.md:200 alignment. In-place edit. Net 0. |
| MIN-3 | F179/F180 correlation criterion not observable via standard CDP/Playwright, not named by ID in disclosure (MINOR) | **APPLIED — spec.md disclosed-gap bullet** | CR8-MIN3 | Added a "Known verification gaps" bullet naming F179/F180, the heuristic approximation, and F180's fail-safe (miss → block, never wrongful exempt). Cross-refs the CR5-B2/line-437 deferred reword. Disclosure, not the reword (that stays build-phase). Net 0. |
| MIN-4 | F83 examples/tasks.json "pass directly to the CLI" unsatisfiable vs a real app (MINOR) | **REJECTED — re-litigation of DR-28** | CR8-MIN4 | Already adjudicated MINOR at scrub-log.md row 15 (DR-28) / CR6 disposition #15 (SKIPPED-with-reason): the fix is a build-phase SKILL.md quickstart line (SKILL.md does not exist at spec phase). Fails safely into the reason_code taxonomy. The directive itself says "No requirements.txt change." Tracked as the existing build-phase residual; no spec change now. |
| MIN-5 | F192 content-derivation lock exempts ci-diff.mjs/validate-persona.mjs (MINOR) | **REJECTED — re-litigation of CR7 scrub-log:433** | CR8-MIN5 | Verbatim re-raise of the CR7 panel item "F192 anti-filename-dispatch scoped to only 2 of 5 scripts", disposition DECLINED (test-rigor/anti-gaming only, not product-wrong-output). Directive itself: "no spec/test change required now." Build-phase follow-up already ranked in the CR7 freeze-readiness list (#2). No change. |
| MIN-6 | spec.md:188 F192 bullet claims closure "totalizingly" without the scrub-log's declined-scope caveat inline (MINOR) | **APPLIED — spec.md wording precision** | CR8-MIN6 | The one live sliver of the otherwise-re-litigated F192 pair: appended the scoped-residual caveat (2-of-5-scripts, CR7-DECLINED) to spec.md:188 before "Requirement ID: F192." Docs-only; no test/requirement-ID change. Net 0. |
| MIN-7 | N5 45-min SLA structurally unenforceable vs F131 50-min default (MINOR) | **APPLIED — N5 comment clarification** | CR8-MIN7 | Appended a clause to the N5 provenance comment block: F131's 50-min default is a deliberate safety-margin kill-switch ABOVE N5's 45-min target (the standard pattern), N5 is MEDIUM/BLOCKS:none, never runner-gate-enforced. Comment-only, no F/N line. Net 0. |
| MIN-8 | F191 only tests the false-"completed" direction; the reverse (hand-set BLOCKED, derived not-blocked) untested (MINOR) | **APPLIED — fixture + assertion** | CR8-MIN8 | Added `run-status-stored-blocked-derived-not-bad.json` (3 completed personas, stored run_status "BLOCKED") + an assertion in the existing F191 CR6-B6 block that the gate rejects a falsely-BLOCKED disagreement in BOTH directions. F191 text already covers both directions — coverage-only. RED preserved (block already carries `assert.equal(agree.code,0)`). Net 0. |

### Panel-rejected attacks (concurred, not applied)

The panel itself rejected 4 attacks — all re-open durable decisions (N5 residual-gap exclusion → the
requirements.txt:48 provenance comment already flags it; robots.txt not auto-relaxed for localhost →
D15 exhaustive-relaxation decision + CR3 systemic resolution; F83/F8/F37 CLI-defaulting tension →
ADR-0001 "Required: yes" + passing F6/F7/F8/F37 tests; F12 free-text branch nullifies reproducibility
apparatus → already re-rejected across CR3/CR4). This arbiter concurs; none was applied.

### RED-safety note (why every added assertion keeps the suite 0-pass)

All CR8 test additions went into EXISTING test blocks (F148, F191, F194) that already carry a failing
positive assertion (`assert.equal(code, 0)` / `assert.match` on missing-script empty stdout). node:test
fails a test if ANY assertion throws, so the added `notEqual`/`equal`/`match` assertions cannot flip a
block to green — no new standalone `notEqual(code,0)`-only test block was created (the exact RED-safety
trap flagged at CR7 scrub-log:444). No new test() block added; the suite stays 83 tests, 0 pass, 83 fail.

### FREEZE-READINESS: unchanged — **FREEZE-READY** (no blocking item)

CR8 removed no guarantee and added only disclosures + coverage. The one BLOCKER was a wording
self-contradiction already repaired. No CR8 item makes a correctly-built product emit categorically-wrong
untraceable output. Freeze remains withheld only pending founder approval, per the standing NO-freeze
instruction.

### CR8 count sync

Fresh re-runs from repo root: `req-lint.sh .swe-spec/requirements.txt` → **208/208 PASS** (199 functional
+ 9 nonfunctional; F199-F201 added — net +3); `coverage-audit.sh --pre-freeze` → **8/8 stages PASS**;
`test-coverage-audit.sh docs/specs/0001-ux-gauntlet-mvp.spec.md test/acceptance.test.mjs` → **95/95
CRITICAL PASS** (unchanged — F199-F201 landed HIGH, no CRITICAL id added/removed); `node --test
test/acceptance.test.mjs` → **83 tests, 0 pass, 83 fail** (RED preserved; CR8 added assertions to the
existing F148/F191/F194 blocks, no new test block). validation.md updated in the same pass.
