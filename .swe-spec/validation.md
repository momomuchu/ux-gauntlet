# Validation — SWEBOK KA1 §5 set criteria (ux-gauntlet MVP, 2026-07-08)

## Complete
The set is complete against the decision brief: every MUST in brief §2 (methodology), §3 (validity envelope), §5 (skill format) and §7 (MVP scope) maps to at least one requirement (F1–F36, N1–N7); the brief's non-goals map to the spec's non-goals section rather than silent omission.
Boundary coverage: F8 fixes the lower input boundary (no task list → refuse); F16 fixes the minimum persona count (≥3); severity is bounded to the closed 0–4 ordinal scale (F12); N5 bounds run time (45 min) and N2 bounds SKILL.md size (500 lines).
Exception coverage: F15 defines the zero-evidence exception path (drop, never soften); F23–F25 define gate failure behavior (exit nonzero, no report ships); F26 defines the CI failure condition precisely (new severity-4 only) so every other finding is a non-exception informational path.
Security coverage: the skill crawls only the operator-supplied target URL (F6) — no autonomous target discovery; forbidden-claim guardrails per persona (F5) plus F21/F22 prevent the report itself from emitting claims that could mislead downstream users; N6 excludes third-party data egress for localhost runs, keeping audit data on the operator's machine.

## Concise
Each line states one testable obligation; req-lint passed 43/43 (F1-F36, N1-N7) with zero compound/vague/unbound findings on the original elicitation pass, and the scrub log (stage 6) cut speculative items rather than carrying them as padding. req-lint passed 133/133 after the unknowns pass plus challenge round 1; 153/153 after challenge round 2; 169/169 after challenge round 3. Current live total (post-challenge-round-4): req-lint passes 187/187 — see lint-result.txt for the up-to-date re-run.

## Consistent
No requirement contradicts another: the maximum-critique stance (D6) is compatible with the evidence discipline because F14/F15 make every critique artifact-anchored; F26's "block only severity-4" does not contradict F12's full 0–4 scoring because scoring and gating are separate concerns; persona minimum (F16) is consistent with the three shipped defaults (F2–F4).

## Feasible
Every capability is demonstrated prior art: browser-driving agent skills exist (anthropics/skills webapp-testing; ncklrs plugin), persona-driven friction detection exists as a research prototype (UXCascade), and schema-gated JSON output is ordinary tooling; the only novel work is composition, which is engineering effort, not research risk. N5's 45-minute bound is the one feasibility unknown flagged for empirical check during build.

## Manual checklist from req-lint (stakeholder judgment)
- True stakeholder need: each line traces to founder verbatim intent (persona impersonation, live crawl, max critique, named frictions, final report) or to a verified brief claim — no orphan requirements.
- Stakeholder vocabulary: lines use the founder's product words (persona, happy path, friction, report, gate); implementation jargon is confined to N-lines where it IS the constraint.
- Acceptable to all stakeholders: single-founder project; founder approval of this spec is the acceptance event and is explicitly pending (spec status PLANNED, freeze withheld).

## Unknowns pass (2026-07-08)

An 8-lens adversarial elicitation pass ran against the frozen-pending spec, requirements.txt (then
F1-F36/N1-N7), scrub-log.md, and ADR-0001 (`docs/research/UNKNOWNS-DELTA.md`): side-effects,
authz-privacy, reproducibility, partial-runs, operator-dx, portability, methodology-gaps,
cost-limits. 45 candidates surfaced; 39 integrated as F37-F100 (12 mvp-critical, 21 mvp-high, 6
mvp-medium); 4 explicitly deferred to v2 plus 16 named-only v2 candidates (scrub-log.md); 2 rejected
as already-covered by an existing decision (D2 task-list ordering; the ISO/blended-score scrub — see
scrub-log.md for citations). Zero of the 39 accepted items duplicated an existing F/N line — every
one was a genuine, additive gap.

**Completeness** now explicitly includes the refusal/safety layer the original pass under-specified:
the original set was thorough about what personas must *discover* (friction, evidence, severity) but
silent on what the orchestrator and each persona subagent must *refuse to do* (destructive clicks,
live payments, non-idempotent submits by default, robots.txt violations, unredacted secrets in
evidence) — see spec.md D11. The CI-mode promise (F26/N4) is also now fully specified end-to-end: a
finding's identity for baseline diffing is a deterministic finding_id (F92) with a content-based
dedup rule applied before diffing (F45/F46) — see spec.md D12.

Complete/concise/consistent/feasible and the boundary/exception/security coverage recorded above
remain valid and unchanged for F1-F36/N1-N7; this paragraph extends coverage to the F37-F100 range
only. Consistency check: the new refusal-layer lines (F37-F44) do not contradict the discovery-first
design (F10/F34) — refusal fires on a narrow denylisted/financial/unauthorized/robots-disallowed
subset of actions, not on exploratory "extra actions" generally, so F10's friction-accounting mandate
and the refusal layer apply to disjoint action classes.

## Challenge round 1 (2026-07-08)

An independent adversarial challenge pass (`.swe-spec/CHALLENGE-ROUND-1.md`, 6 lenses: contradictions,
operator-hostility, methodology, evidence-fidelity, plus 2 more) ran 29 attacks against the frozen-pending
spec (F1-F100/N1-N7), the ADR, and the RED test suite. Verdict: CHANGES_REQUIRED. 26 distinct defects
confirmed (10 BLOCKER, 12 MAJOR, 4 MINOR; 5 raw attacks independently converged on one F92 defect), 2
attacks rejected as already-covered by an existing decision. All 26 confirmed defects are applied in
this pass: 25 new functional requirements (F101-F125) plus 1 nonfunctional requirement (N8), 7 existing
lines edited in place (F12, F17, F26, F35, F43, F92, N5), the runner CLI validation model changed from
implicit fail-fast to explicit aggregate-check-all-then-report (ADR-0001), the F92 finding_id identity
function collapsed onto the F45/F46 dedup tuple (D12, the single highest-priority fix — 4 independently
converged lenses), and 24 new RED test cases plus 26 new/extended fixtures added to
`test/acceptance.test.mjs` — every new [CRITICAL] requirement is now covered by a non-constant
assertion (`test-coverage-audit.sh`: 59/59 CRITICAL PASS). requirements.txt grew from 107 to 133 lines
(125 functional, 8 nonfunctional); req-lint 133/133 PASS. `node --test test/acceptance.test.mjs`: 40
tests, 0 pass, 40 fail — RED preserved. Reconciliation decisions made where the challenge round left a
choice open are recorded in `scrub-log.md` with the `CR1-N` prefix (identity-unification field drop,
CI-flag validation-order-vs-aggregation merge, allowlist-confidence-label-is-cosmetic-not-suppressive).

## Challenge round 2 (2026-07-08)

A second independent adversarial challenge pass (`.swe-spec/CHALLENGE-ROUND-2.md`) ran 24 raw attacks
against the post-round-1 spec (F1-F125/N1-N8), the ADR, and the RED test suite. Verdict:
CHANGES_REQUIRED. 23 distinct defects confirmed (4 BLOCKER, 12 MAJOR, 7 MINOR; 2 raw attacks
independently converged on one N8/F61 `--env` defect), 4 attacks rejected as already resolved by an
existing decision or partition (see CHALLENGE-ROUND-2.md §3). All 23 confirmed defects are applied in
this pass: 19 new functional requirements (F126-F144) plus 1 nonfunctional requirement (N9), 11
existing lines edited in place (F12, F26, F43, F44, F45, F87, F92, F103, F104, the N5 derivation
comment, N8), one new unified Decision D14 (per-step operator-override flag family) plus D13 (max-not-
mean, backfilling a CR1-17 decision that was applied but never got its own Decisions-table row), and
33 new/extended acceptance-test assertions plus 28 new fixtures added to `test/acceptance.test.mjs` —
every new [CRITICAL] requirement citation is now covered by a non-constant assertion
(`test-coverage-audit.sh`: 63/63 CRITICAL PASS, up from 59/59 post-round-1). requirements.txt grew
from 133 to 153 lines (144 functional, 9 nonfunctional); req-lint 153/153 PASS.
`node --test test/acceptance.test.mjs`: 52 tests, 0 pass, 52 fail — RED preserved. Reconciliation
decisions made where the challenge round left a choice open, or where directives had to be composed
into one coherent design, are recorded in `scrub-log.md` with the `CR2-N` prefix (unified per-step
override family, F27 allowlist reframed as a gate-testable run-configuration field rather than an
unbuildable live-CLI assertion, N8's "crawl started" interpreted as "not refused by the static gate"
given no live fixture server exists pre-build, DECISION-BRIEF.md left untouched per this pass's scope
boundary).

Boundary/exception/security coverage recorded above for F1-F125/N1-N8 remains valid and unchanged;
this paragraph extends coverage to the F126-F144/N9 range only. Consistency check: the new per-step
override family (F126, F128) does not contradict the run-global safety defaults (F37/F38, F40) — each
override is logged, step-scoped, and every non-flagged step in the same run stays fully subject to the
existing refusal rules (D14; proven by the `*-scoped-not-global-bad` fixture pairs in the acceptance
test).

Complete/concise/consistent/feasible coverage recorded above for F1-F100/N1-N7 remains valid and
unchanged; combined with the Challenge round 1 and round 2 passes, every requirement through
F144/N9 maps to at least one brief/audit source (F101-F125/N8 per CHALLENGE-ROUND-1.md;
F126-F144/N9 per CHALLENGE-ROUND-2.md) — no line was added without a corresponding defect citation
or elicitation-lens source.

## Challenge round 3 (2026-07-08)

A third independent adversarial challenge pass (`.swe-spec/CHALLENGE-ROUND-3.md`) ran 23 raw attacks
against the post-round-2 spec (F1-F144/N1-N9), the ADR, and the RED test suite. Verdict:
CHANGES_REQUIRED. 20 distinct defects confirmed (6 BLOCKER, 10 MAJOR, 4 MINOR), 3 attacks rejected as
already litigated/closed in a prior round or factually contradicted by the frozen files (see
CHALLENGE-ROUND-3.md §3). All 20 confirmed defects are applied in this pass: 16 new functional
requirements (F145-F160, no new N-numbers — the Perfect Technology Filter recategorized the two items
the challenge doc's own illustrative numbering suggested as N-series), 5 existing lines edited in place
(F35, F43, F44, F83, the N5 derivation comment), one new unified Decision D15 (per-step
operator-override flag family, CLOSED — supersedes D14 with a 5th flag `audited_terminal_step` plus a
single system-wide precedence statement), and 18 new acceptance-test cases plus 11 new fixtures (one
existing fixture, `findings-allowlisted-lower-confidence.json`, edited in place to fix a confounded-test
defect) added to `test/acceptance.test.mjs` — every new [CRITICAL] requirement citation is now covered
by a non-constant assertion (`test-coverage-audit.sh`: 73/73 CRITICAL PASS, up from 63/63
post-round-2). requirements.txt grew from 153 to 169 lines (160 functional, 9 nonfunctional); req-lint
169/169 PASS. `node --test test/acceptance.test.mjs`: 61 tests, 0 pass, 61 fail — RED preserved.
Reconciliation decisions made where the challenge round left a choice open, where a directive's
suggested requirement number collided with an already-used ID, or where a directive's literal
instruction conflicted with this pass's own scope boundary, are recorded in `scrub-log.md` with the
`CR3-N` prefix and a dedicated `## CR3 systemic resolution` note (the D15 closed-family design and its
single system-wide precedence statement, resolving the recurring safety-vs-completion tension named
across all three challenge rounds).

Boundary/exception/security coverage recorded above for F1-F144/N1-N9 remains valid and unchanged;
this paragraph extends coverage to the F145-F160 range only. Consistency check: the new 5th per-step
override field (`audited_terminal_step`, F145) does not contradict the run-global default dry-run
boundary (F40) or the existing `precondition_step` field (F126) — it is scoped to exactly ONE step
(the task's own terminal submission, never a leading precondition step), logged the same way as every
other D15-family flag, and every non-flagged step in the same run stays fully subject to F40's default
(proven by the `audited-terminal-step-scoped-not-global-bad.json` fixture, mirroring the existing
`*-scoped-not-global-bad` convention). The off-path `step` definition (F147) does not contradict the
F45/F92 identity tuple it feeds — it resolves an ambiguity the tuple's own field never closed, it does
not change the tuple's shape or field names.

## Challenge round 4 (2026-07-09)

A fourth independent adversarial challenge pass (`.swe-spec/CHALLENGE-ROUND-4.md`) ran 25 raw attacks
against the post-round-3 spec (F1-F160/N1-N9), the ADR, and the RED test suite. Verdict:
CHANGES_REQUIRED. 22 distinct defects confirmed (4 BLOCKER, 12 MAJOR, 6 MINOR), 3 attacks rejected as
already litigated/closed in a prior round or factually contradicted by the frozen files (see
CHALLENGE-ROUND-4.md §3). All 22 confirmed defects are applied in this pass: 18 new functional
requirements (F161-F178, no new N-numbers — F178 split out of the original combined F168 during the
same-pass atomicity repair described below), 8 existing lines edited in place (F9, F24, F35, F49, F53,
F123, F157, N8), the D12/D15 decision rows amended (personas_flagging as the sole convergence_tier
input; the D15 per-step flag family gains a 4th precedence clause closing flag-vs-flag mutual
exclusivity), and 10 new acceptance-test cases plus 19 new fixtures added to `test/acceptance.test.mjs`
(61 → 71 tests) — `node --test test/acceptance.test.mjs`: 71 tests, 0 pass, 71 fail — RED preserved.
requirements.txt grew from 169 to 187 lines (178 functional, 9 nonfunctional); req-lint 187/187 PASS.
A same-pass repair cycle (`test-coverage-audit.sh` + `req-lint.sh` re-run) found and fixed 8 lines that
tripped req-lint's atomic (compound and/or) check — F35, F49, F157, F166, F167, F168, F169, F173, F176
— by rewording to comma/slash-list style consistent with the rest of the document (F168 was split into
F168 + F178 rather than reworded, since its two MUST clauses — content authoring and schema
verification — are genuinely distinct decisions), plus 5 CRITICAL requirement IDs (F170, F172, F173,
F174, F176 producer citations) that `test-coverage-audit.sh` initially found uncovered, closed with
additional assertions in the existing gate()-routed test blocks. `req-lint.sh`: 187/187 PASS;
`coverage-audit.sh --pre-freeze`: 8/8 stages PASS; `test-coverage-audit.sh`: 87/87 CRITICAL PASS.
Reconciliation decisions — including the numbering-collision resolution where the panel's own
illustrative "e.g." numbers (F160, F161, F108a, F92a, F43a, F44a, F64a, F17a) collided with
already-assigned IDs — are recorded in `scrub-log.md` under a dedicated `## CR4` section.

Beyond the 22 confirmed defects, this pass additionally ran a MANDATED systematic sweep of the 5
defect-generator patterns the round-4 panel named in its §4 systemic observations, across the whole
spec (traced via `# CR4-S<n>` comments), so no further instance of these patterns remains for a future
panel to find:

1. **Enum/producer completeness** — every closed enum/flag family (`run_status`, `reason_code`,
   `friction_type`, the D15 per-step flag family, CLI exit codes, `convergence_tier`/`partial_tier`)
   was audited for a producer mapping. Closed the `run_status` producer gap for all 5 members
   (F173-F176) and closed `friction_type` as an explicit closed set with producer citations (F177). A
   new "Enum / flag-family → producers" table in spec.md makes this mapping mechanically visible.
2. **Sibling completeness** — F12's severity formula had frequency operationalized (F159, CR3-17) but
   impact and persistence left as free judgment; F161/F162 close both with the same fixed-bucket-
   function treatment, and F157's reproducibility caveat is widened to cover the numeric branch too
   (closing the false-certainty gap the free-text-only wording implied).
3. **Control-pair evenness** — swept `test/acceptance.test.mjs` + fixtures for gate-checked rules
   missing a matching `-ok`/bad companion. Closed: F57/F58/F154 (runner-capped positive controls,
   BLOCKER-1), F14/F15 (evidence-present positive control, BLOCKER-4), F111/F112/F113 (the whole
   retry-classification test block had ZERO positive controls — 2 new `-ok` fixtures added), F43/F44
   (the apikey/cardnumber RED fixtures each had zero dedicated `-ok` counterpart — 2 new fixtures
   added), and F9 (walkthrough answer-completeness gained its own gate()-routed bad/ok pair).
4. **SSOT/count drift** — README.md, spec.md traceability, validation.md (this section), and
   scope-match.md all updated to the current 187-requirement/107-fixture/71-test state, closing the
   exact one-round-behind drift class CR4 itself found in README (MAJOR-12). This count itself moved
   twice within the same pass (186→187, 68→71) once the atomicity-repair cycle above split F168 into
   F168+F178 and added 3 more test assertions to close the 5 initially-uncovered CRITICAL IDs — an
   instance of the identical drift pattern, closed as evidence-collector rather than left stale, per
   the fresh req-lint/coverage-audit/test-coverage-audit re-run this same pass.
5. **Traceability sweep** — every new requirement carries a `# CR4-Bn`/`# CR4-Mn`/`# CR4-MINn`/
   `# CR4-Sn` trace comment; the "Known verification gaps" section's gate-routed-ID list and
   zero-coverage-tier list were both extended to include every new F161-F178 ID, so the disclosed
   residual-risk boundary does not itself drift one round behind (the same defect class as CR4's own
   README finding, applied preemptively here).
6. **Pluggability-commitment wording regression (panel §4 systemic observation 5)** — swept every
   CRITICAL gate-enforcement requirement's literal wording against its own paired decision record for
   a hardcoded-vs-pluggable mismatch (the F24-vs-D7 pattern: F24 named "Nielsen" literally while D7
   promised generalized pluggability). Checked F23, F25, F28, F95, F96 (the other schema/gate-rejection
   lines) — all already use generic wording ("violates the schema," "not in the gate's supported-
   versions list"); F28's own "Nielsen 10-heuristic list shipped as the default set" phrase is a
   correct DEFAULT-content description, not a gate-enforcement mismatch. F24 (fixed under MAJOR-5) is
   confirmed as the sole instance of this pattern in the current spec.

Boundary/exception/security coverage recorded above for F1-F160/N1-N9 remains valid and unchanged;
this paragraph extends coverage to the F161-F178 range only. Consistency check: F164's mutual-
exclusivity rule does not contradict any existing D15-family fixture (`audited-terminal-step-ok.json`,
`precondition-step-login-ok.json`, `denylist-override-used-ok.json` — each already carries exactly one
flag); F49's rescoped BLOCKED trigger does not contradict F101 (CI mode still exits nonzero on BLOCKED
independent of severity-4 content) — it only narrows WHEN run_status becomes BLOCKED in the first
place, which is a stricter, not looser, definition (fewer runs read as BLOCKED, never more).
