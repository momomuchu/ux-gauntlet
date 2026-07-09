# Categorized requirements — Perfect Technology Filter (SWEBOK KA1 §1.8)

Test applied per line: "would this still need to be stated on a computer with infinite speed,
unlimited memory, zero cost, no failures?" yes → functional; no → nonfunctional.

| ID | Category | Filter note |
|----|----------|-------------|
| F1 | functional | persona-as-data is product policy, not a tech constraint |
| F2 | functional | shipped content (default persona) |
| F3 | functional | shipped content (default persona) |
| F4 | functional | shipped content (default persona) |
| F5 | functional | schema content is domain policy |
| F6 | functional | "real browser" trips the tech lexicon, but here the browser IS the domain object being exercised (live crawl is the product behavior, not an implementation choice) — functional by the filter question |
| F7 | functional | input contract |
| F8 | functional | guard behavior (policy) |
| F9 | functional | walkthrough protocol is the core method |
| F10 | functional | friction accounting rule |
| F11 | functional | tagging policy |
| F12 | functional | scoring policy |
| F13 | functional | scoring policy |
| F14 | functional | evidence policy |
| F15 | functional | cite-or-drop policy |
| F16 | functional | reliability-control policy |
| F17 | functional | reporting policy |
| F18 | functional | output contract |
| F19 | functional | output contract |
| F20 | functional | disclosure policy |
| F21 | functional | forbidden-claim policy |
| F22 | functional | forbidden-claim policy |
| F23 | functional | gate behavior |
| F24 | functional | gate behavior |
| F25 | functional | gate behavior |
| F26 | functional | gate behavior (CI policy) |
| F27 | functional | confidence-labeling policy |
| F28 | functional | taxonomy-as-data policy (default set = shipped content) |
| F29 | functional | extensibility policy (persona = one data file) |
| F30 | functional | execution model: per-persona delegated subagent is the product behavior the founder specified (isolation of persona context), not a QoS constraint |
| F31 | functional | execution model: parallel background delegation, same rationale as F30 |
| F32 | functional | output contract (merge into one findings file) |
| F33 | functional | walkthrough-failure consequence rule (review finding #3) |
| F34 | functional | friction-definition completeness: ambiguity resolutions (review finding #4) |
| F35 | functional | disclosure-content policy (review finding #5) |
| F36 | functional | interface contract per ADR-0001 (review finding #18) |
| N1 | nonfunctional | packaging/format constraint (agent-skills format) — vanishes on a perfect computer |
| N2 | nonfunctional | size/progressive-disclosure constraint (token budget = imperfect tech) |
| N3 | nonfunctional | licensing constraint |
| N4 | nonfunctional | execution-environment constraint (headless CI) |
| N5 | nonfunctional | quality-of-service: time bound (45 minutes) |
| N6 | nonfunctional | dependency/environment constraint |
| N7 | nonfunctional | language constraint |

## Unknowns pass 2026-07-08 (docs/research/UNKNOWNS-DELTA.md, DR-01..DR-39)

Same Perfect Technology Filter question applied to each landed line. All 39 accepted DR items
resolved to `functional`: every one is a refusal/safety/behavior policy or an output-contract rule
that a live-target crawl, a real payment form, or a nondeterministic parallel pipeline still needs
regardless of compute speed/memory/cost — none describe a pure QoS/resource attribute of the
*system itself* the way N1-N7 do (packaging, size budget, license, headless mode, wall-clock bound,
network dependency, language). The 3 candidate resource-cap lines (F57/F58, F98, F99/F100) were the
closest borderline calls: their trigger is a real-world side effect (unbounded live-browser actions
against an external target, unbounded LLM spend) rather than the evaluating machine's own
performance, so — consistent with the existing precedent of F16's hard persona-count floor being
functional — they stay functional, not QoS.

| ID | Category | Filter note |
|----|----------|-------------|
| F37 | functional | refusal policy (denylist required) — DR-01a |
| F38 | functional | refusal policy (abort on match) — DR-01b |
| F39 | functional | refusal policy (payment test-mode gate) — DR-02 |
| F40 | functional | refusal policy (default dry-run boundary) — DR-03 |
| F41 | functional | authorization-gate policy (robots.txt load) — DR-04a |
| F42 | functional | authorization-gate policy (disallowed-path abort) — DR-04b |
| F43 | functional | evidence-redaction policy (screenshots) — DR-05a |
| F44 | functional | evidence-redaction policy (DOM snippets) — DR-05b |
| F45 | functional | dedup policy (finding identity tuple) — DR-06a |
| F46 | functional | dedup policy (merge into one entry) — DR-06b |
| F47 | functional | error-classification policy (app-error vs friction) — DR-07a |
| F48 | functional | reporting policy (separate app-error section) — DR-07b |
| F49 | functional | partial-run policy (BLOCKED run-status) — DR-08 |
| F50 | functional | patience-abandonment policy (abandon task) — DR-09a |
| F51 | functional | patience-abandonment policy (terminal friction) — DR-09b |
| F52 | functional | patience-abandonment policy (outcome field) — DR-09c |
| F53 | functional | output-contract policy (run_status enum) — DR-10a |
| F54 | functional | disclosure policy (non-completed count) — DR-10b |
| F55 | functional | ledger policy (task_completed boolean) — DR-11a |
| F56 | functional | ledger policy (reason code) — DR-11b |
| F57 | functional | behavioral safety cap (real-world side effects), not QoS — parallels F16's hard-count precedent — DR-12a |
| F58 | functional | partial-ledger-emission policy paired with F57 — DR-12b |
| F59 | functional | side-effect guard (synthetic identity pool) — DR-13 |
| F60 | functional | side-effect guard (created-artifact inventory) — DR-14 |
| F61 | functional | side-effect guard (environment-class hard-stop) — DR-15 |
| F62 | functional | side-effect guard (external-side-effect flag, schema) — DR-16a |
| F63 | functional | side-effect guard (skip flagged step) — DR-16b |
| F64 | functional | side-effect guard (record as blocked) — DR-16c |
| F65 | functional | authorization policy (--i-own-this-target) — DR-17 |
| F66 | functional | authz/privacy gate policy (live-credential rejection) — DR-18 |
| F67 | functional | authz/privacy gate policy (third-party-data confirmation required) — DR-19a |
| F68 | functional | authz/privacy gate policy (refuse without confirmation) — DR-19b |
| F69 | functional | reproducibility policy (run manifest) — DR-20 |
| F70 | functional | disclosure policy (non-determinism statement) — DR-21a |
| F71 | functional | forbidden-claim policy (no single-run completeness claim) — DR-21b |
| F72 | functional | reproducibility policy (stable finding_id in baseline) — DR-22a |
| F73 | functional | CI-diff policy (match by finding_id only) — DR-22b |
| F74 | functional | CI-diff policy (informational-only fields excluded) — DR-22c |
| F75 | functional | partial-run policy (wallclock termination) — DR-23a |
| F76 | functional | partial-run policy (merge partial ledger as-is) — DR-23b |
| F77 | functional | error-classification policy (transient failure never a friction) — DR-24 |
| F78 | — | DELETED CR7-1 — DR-25a folded onto F50 (superseded duplicate of the DR-09 patience family) |
| F79 | — | DELETED CR7-1 — DR-25b folded onto F175 (patience-exhausted enum, not the stale "patience-exceeded") |
| F80 | functional | interface-contract policy (distinct exit code 3) — DR-26 |
| F81 | functional | operator-dx policy (status file, state) — DR-27a |
| F82 | functional | operator-dx policy (status file, step index) — DR-27b |
| F83 | functional | operator-dx policy (shipped example tasks file) — DR-28 |
| F84 | functional | output-contract policy (summary.json) — DR-29 |
| F85 | functional | operator-dx policy (pre-flight reachability check) — DR-30a |
| F86 | functional | operator-dx policy (actionable stderr message) — DR-30b |
| F87 | functional | portability policy (missing-display diagnostic) — DR-31 |
| F88 | functional | methodology-integrity policy (isolated browser profiles) — DR-32 |
| F89 | functional | methodology-integrity policy (precondition steps authorable) — DR-33a |
| F90 | functional | methodology-integrity policy (precondition = operator responsibility, documented) — DR-33b |
| F91 | functional | documentation-content policy (.gitignore instruction) — DR-34 |
| F92 | functional | reproducibility policy (deterministic finding_id hash) — DR-35 |
| F93 | functional | schema-versioning policy (findings.json field) — DR-36a |
| F94 | functional | schema-versioning policy (persona file field) — DR-36b |
| F95 | functional | schema-versioning policy (gate rejects unsupported findings version) — DR-36c |
| F96 | functional | schema-versioning policy (validator rejects unsupported persona version) — DR-36d |
| F97 | functional | documentation-content policy (portability claim accuracy) — DR-37 |
| F98 | functional | behavioral concurrency cap, parallels F31's execution-model precedent, not pure QoS — DR-38 |
| F99 | functional | behavioral cost cap (real-world LLM spend bound) — DR-39a |
| F100 | functional | partial-ledger-emission policy paired with F99 — DR-39b |

Summary (post-unknowns-pass): 100 functional, 7 nonfunctional (107 total). Borderline calls recorded: F6, F30/F31 (original
pass, see notes above); F57/F58, F98, F99/F100 (unknowns pass — resource/action caps kept functional
per the F16/F31 hard-count-and-execution-model precedent, see note above table).

## Challenge round 1 pass 2026-07-08 (.swe-spec/CHALLENGE-ROUND-1.md, F101-F125, N8)

Same Perfect Technology Filter question applied to each landed line. All 25 new F-lines resolved to
`functional`: every one is a refusal/safety/detection/scoring/disclosure policy that a live-target
crawl, a real payment form, or a nondeterministic parallel pipeline still needs regardless of compute
speed/memory/cost — none describe a pure QoS/resource attribute of the evaluating machine itself. N8
(first-run-under-one-invocation) is `nonfunctional`, same category as N5 (quality-of-service /
onboarding-time bound), consistent with the DR-28 provenance it traces to.

| ID | Category | Filter note |
|----|----------|-------------|
| F101 | functional | CI gate policy (BLOCKED run_status independent trigger) — CR1-2 |
| F102 | functional | evidence-schema policy (screenshot captured_text sidecar) — CR1-3 |
| F103 | functional | identity-computation policy (selector fallback) — DR-06a CR1-4 |
| F104 | functional | disclosure policy (undercount on unstable selectors) — DR-06a CR1-4 |
| F105 | functional | shipped-artifact policy (denylist default + schema) — DR-01a CR1-6 |
| F106 | functional | gate policy (denylist file validation) — DR-01a CR1-6 |
| F107 | functional | refusal-aggregation policy (check all before failing) — CR1-7 CR1-14 |
| F108 | functional | refusal-reporting policy (fixed-order multi-line output) — CR1-7 CR1-14 |
| F109 | functional | shipped-artifact policy (run-bundle schema) — CR1-8 |
| F110 | functional | evidence-sufficiency policy (ambiguity_resolution) — CR1-9 |
| F111 | functional | error-classification policy (transient exclusion) — DR-24 CR1-11 |
| F112 | functional | error-classification policy (persona-actioned retry = friction) — DR-24 CR1-11 |
| F113 | functional | error-classification policy (persona-actioned retry + 5xx = app-error) — DR-24 CR1-11 |
| F114 | functional | evidence-capture policy (terminal friction) — DR-09b CR1-12 CR1-26 |
| F115 | functional | schema policy (payment_step flag) — DR-02 CR1-13 |
| F116 | functional | refusal-mechanism policy (schema-gated, not runtime judgment) — DR-02 CR1-13 |
| F117 | functional | detection-mechanism policy (network interception) — DR-03 CR1-13 |
| F118 | functional | merge-provenance policy (component_severities) — DR-06b CR1-17 |
| F119 | functional | merge-scoring policy (severity = max) — DR-06b CR1-17 |
| F120 | functional | reliability-signal policy (partial_tier) — CR1-18 |
| F121 | functional | CI-gate-interaction policy (confidence label is cosmetic) — CR1-19 |
| F122 | functional | output-contract policy (finding_id field-name distinctness) — CR1-22 |
| F123 | functional | ledger policy (reason-code enum) — CR1-23 |
| F124 | functional | disclosure policy (per-finding confidence degradation) — CR1-24 |
| F125 | functional | evidence-tagging policy (terminal friction heuristic_tag) — CR1-26 |
| N8 | nonfunctional | quality-of-service: first-run onboarding-time bound — DR-28 CR1-15 |

Summary: 125 functional, 8 nonfunctional (133 total).

## Challenge round 2 pass 2026-07-08 (.swe-spec/CHALLENGE-ROUND-2.md, F126-F144, N9)

Same Perfect Technology Filter question applied to each landed line. All 19 new F-lines resolved to
`functional`: every one is a refusal/safety/detection/scoring/disclosure/schema policy that a live-target
crawl, a real payment form, or a nondeterministic parallel pipeline still needs regardless of compute
speed/memory/cost. N9 (parallel-vs-sequential wallclock-budget derivation rule) is `nonfunctional`, same
category as N5 (quality-of-service / wall-clock bound), since it is a QoS-derivation correction, not a
behavior policy.

| ID | Category | Filter note |
|----|----------|-------------|
| F126 | functional | schema policy (precondition_step per-step flag) — CR2-1 |
| F127 | functional | refusal-exemption policy (F40 boundary does not apply to precondition_step) — CR2-1 |
| F128 | functional | schema policy (denylist_override per-step flag) — CR2-5 |
| F129 | functional | logging policy (denylist_override_used event) — CR2-5 |
| F130 | functional | refusal-scoping policy (F38 stays live outside the override) — CR2-5 |
| F131 | functional | default-value policy (50-minute timeout when --timeout absent) — CR2-7 |
| F132 | functional | output-contract policy (persona start_ts field) — CR2-8 |
| F133 | functional | output-contract policy (persona end_ts field) — CR2-8 |
| F134 | functional | gate policy (concurrency-overlap proof) — CR2-8 |
| F135 | functional | interface-contract policy (--no-headless flag) — CR2-10 |
| F136 | functional | scoring-scope policy (frequency = within-run re-encounter count) — CR2-11 |
| F137 | functional | rendering policy (component_severities adjacency) — CR2-12 |
| F138 | functional | disclosure policy (rerun-instability extends to F26-blocking findings) — CR2-13 |
| F139 | functional | disclosure policy (manual-re-run instruction) — CR2-13 |
| F140 | functional | interface-contract policy (--standardized-flow-allowlist flag) — CR2-14 |
| F141 | functional | reproducibility policy (allowlist entries recorded in run configuration) — CR2-14 |
| F142 | functional | gate policy (label requires a matching allowlist entry) — CR2-14 |
| F143 | functional | output-contract policy (confidence_label/confidence field independence) — CR2-17 |
| F144 | functional | gate-interaction policy (combo never alters F121 outcome) — CR2-17 |
| N9 | nonfunctional | quality-of-service: wall-clock budget derivation correction (parallel, not sequential) — CR2-8 |

Summary: 144 functional, 9 nonfunctional (153 total).

## Challenge round 3 pass 2026-07-08 (.swe-spec/CHALLENGE-ROUND-3.md, F145-F160)

Same Perfect Technology Filter question applied to each landed line. All 16 new lines resolve to
`functional`: every one is a refusal/definition/identity/scoring/disclosure/schema policy that a
live-target crawl, a real payment form, or a nondeterministic parallel pipeline still needs regardless
of compute speed/memory/cost — none describe a pure QoS/resource attribute of the evaluating machine
itself. This round adds ZERO new N-numbers, correcting two items the challenge doc's own illustrative
numbering suggested as `N9`/`N6a`: the `--override-robots` documentation-content requirement (landed as
F152) is the same category as the existing F86/F91 doc-content-policy precedent, not a QoS attribute —
a computer with infinite speed/memory/cost still needs to know which flag resolves a robots.txt
disallow. The localhost technical-definition requirement (landed as F155) is the same category as the
existing F67/F68 classification-gate precedent it feeds — a perfect computer still needs to know
exactly which hostnames count as localhost before it can apply F67/F68's third-party-data gate. Both
corrections are recorded in scrub-log.md under CR3-7/CR3-10.

| ID | Category | Filter note |
|----|----------|-------------|
| F145 | functional | schema policy (audited_terminal_step per-step flag, D15 5th member) — CR3-1 |
| F146 | functional | refusal-exemption policy (F40 boundary does not apply to audited_terminal_step) — CR3-1 |
| F147 | functional | identity-computation policy (off-path friction step = next-pending happy-path index) — DR-06a CR3-2 |
| F148 | functional | authorization-gate policy (robots.txt non-2xx treated as allow-all) — DR-04a CR3-3 |
| F149 | functional | identity-computation policy (patience-abandonment fixed-sentinel target_element_identifier) — DR-09b CR3-5 |
| F150 | functional | identity-computation policy (patience-abandonment fixed heuristic_tag) — DR-09b CR3-5 |
| F151 | functional | CI-gate policy (severity-escalation on a matched finding_id) — CR3-6 CR3-14 |
| F152 | functional | documentation-content policy (--override-robots first-run guidance) — same category as F86/F91 — CR3-7 |
| F153 | functional | evidence-redaction policy (shape-qualified pattern, no bare-prefix match) — CR3-8 |
| F154 | functional | default-value policy (250 tool-call maximum when --max-tool-calls absent) — CR3-9 |
| F155 | functional | classification policy (localhost technical definition) — same category as F67/F68 — CR3-10 |
| F156 | functional | shipped-artifact policy (tasks.schema.json) — CR3-11 |
| F157 | functional | disclosure policy (free-text severity non-reproducibility caveat) — CR3-12 |
| F158 | functional | disclosure-surfacing policy (rerun-instability caveat reaches ci-diff.mjs's own stderr) — CR3-13 |
| F159 | functional | scoring policy (numeric-branch frequency bucket mapping) — CR3-17 |
| F160 | functional | disclosure policy (F27 walkthrough-weakness rationale, not just the label) — CR3-19 |

Summary: 160 functional, 9 nonfunctional (169 total).

## Challenge round 4 pass 2026-07-09 (.swe-spec/CHALLENGE-ROUND-4.md, F161-F178)

Same Perfect Technology Filter question applied to each landed line. All 18 new lines resolve to
`functional`: every one is a scoring/enum-closure/refusal-scoping/identity/disclosure/schema policy
that a live-target crawl, a real payment form, or a nondeterministic parallel pipeline still needs
regardless of compute speed/memory/cost — none describe a pure QoS/resource attribute of the
evaluating machine itself. This round adds ZERO new N-numbers (same pattern as round 3): the
enum-producer-closure lines (F173-F176) are refusal/output-contract policy, not a QoS bound, matching
the existing F53/F123 precedent those lines extend. F178 (the round-4 repair pass's atomicity split of
the original combined F168) is the same shipped-artifact-verification policy category as its sibling.

| ID | Category | Filter note |
|----|----------|-------------|
| F161 | functional | scoring policy (numeric-branch impact fixed mapping) — CR4-B3 |
| F162 | functional | scoring policy (numeric-branch persistence fixed mapping) — CR4-B3 |
| F163 | functional | walkthrough-scope policy (no fabricated answers for a skipped step) — CR4-M1 |
| F164 | functional | schema policy (D15 per-step flag mutual exclusivity) — CR4-M2 |
| F165 | functional | identity-computation policy (normative finding_id hash formula) — CR4-M3 |
| F166 | functional | evidence-redaction policy (cookie shape, screenshot sidecar) — CR4-M4 |
| F167 | functional | evidence-redaction policy (cookie shape, DOM snippets) — CR4-M4 |
| F168 | functional | shipped-artifact content policy (examples/tasks.json audited_terminal_step) — CR4-M6 |
| F169 | functional | schema policy (heuristic-set config patience_abandonment_tag field) — CR4-M7 CR4-MIN1 |
| F170 | functional | output-contract policy (personas_flagging array field) — CR4-M8 |
| F171 | functional | disclosure policy (unconditional walkthrough-weakness statement) — CR4-M10 |
| F172 | functional | refusal-reporting policy (shipped-default remedy path in stderr) — CR4-MIN3 |
| F173 | functional | enum-producer policy (run_status=crashed trigger) — CR4-S1 |
| F174 | functional | enum-producer policy (run_status=timed-out trigger) — CR4-S1 |
| F175 | functional | enum-producer policy (run_status=patience-exhausted trigger) — CR4-S1 |
| F176 | functional | enum-producer policy (run_status=runner-capped trigger) — CR4-S1 CR4-B1 |
| F177 | functional | enum-closure policy (friction_type closed set + producer citation) — CR4-S1 |
| F178 | functional | example-verification policy (schema-validated terminal flag) — CR4-M6 |

Summary: 178 functional, 9 nonfunctional (187 total).

## Challenge round 5 pass 2026-07-09 (.swe-spec/CHALLENGE-ROUND-5.md, F179-F190)

Same Perfect Technology Filter question applied to each landed line. All 12 new lines resolve to
`functional`: every one is a correlation/disclosure/data-file-swappability/ledger-detection/schema-
fallback/CI-output policy that a live-target crawl, a real non-idempotent request, or a nondeterministic
parallel pipeline still needs regardless of compute speed/memory/cost — none describe a pure QoS/
resource attribute of the evaluating machine itself. This round adds ZERO new N-numbers (same pattern
as rounds 3 and 4): F184 (severity-rubric swappability) is a data-loading policy, not a QoS bound,
matching the existing F28 heuristic-set-pluggability precedent it extends.

| ID | Category | Filter note |
|----|----------|-------------|
| F179 | functional | refusal-scoping policy (non-idempotent request correlation rule) — CR5-B2 |
| F180 | functional | refusal-scoping policy (uncorrelated request never exempted) — CR5-B2 |
| F181 | functional | disclosure policy (frequency/persistence shared-observation caveat) — CR5-B4 |
| F182 | functional | ledger-detection policy (self-reported created-artifact entry) — CR5-M2 |
| F183 | functional | identity-computation policy (5th structural-path selector tier) — CR5-M3 |
| F184 | functional | scoring-rubric swappability policy (data-file override) — CR5-M4 |
| F185 | functional | CLI validation policy (--max-parallel floor rejection) — CR5-MIN2 |
| F186 | functional | orchestration policy (status-fragment merge) — CR5-MIN3 |
| F187 | functional | documentation policy (sequential-fallback CI-mode caveat) — CR5-MIN4 |
| F188 | functional | disclosure policy (heuristic_tag corroboration-sentinel caveat) — CR5-MIN5 |
| F189 | functional | output-contract policy (personas_flagging merge-provenance check) — CR5-MIN6 |
| F190 | functional | CI-output policy (convergence_tier stderr line) — CR5-MIN7 |

Summary: 190 functional, 9 nonfunctional (199 total).

## Challenge round 6 pass 2026-07-09 (.swe-spec/CHALLENGE-ROUND-6.md, F191-F196)

Same Perfect Technology Filter question applied to each landed line. All 6 new lines resolve to
`functional`: each is a derivation/content-gating/identity-fallback/disclosure/self-consistency/
refusal-scoping policy that a real crawl or a real gate still needs regardless of the evaluating
machine's speed/memory/cost — none describe a pure QoS/resource attribute of the machine itself. This
round adds ZERO new N-numbers (same pattern as rounds 3-5). The 5 in-place edits (F12, F31, F49, F123,
F181) do not change any line's functional/nonfunctional category.

| ID | Category | Filter note |
|----|----------|-------------|
| F191 | functional | derivation-lock policy (report-gate recomputes run_status/BLOCKED from per-persona list) — CR6-B6 |
| F192 | functional | content-gating policy (exit code/output from parsed content, not path) — CR6-B5 |
| F193 | functional | identity-computation policy (F183 documentElement terminal case) — CR6-M1 |
| F194 | functional | disclosure policy (non-default-rubric/free-text severity attribution) — CR6-M2 |
| F195 | functional | self-consistency policy (example terminal label vs shipped denylist) — CR6-MIN3 |
| F196 | functional | refusal-scoping policy (payment_step F40 exemption, test_mode-gated) — CR6-B2 |
| F197 | functional | reporting-surface policy (summary.json robots_blocked_all_navigation false-negative signal) — CR7-2 |
| F198 | functional | operator-warning policy (stderr --override-robots warning on all-robots-blocked run) — CR7-2 |

Summary: 196 functional, 9 nonfunctional (205 total). CR7 consolidation: F78/F79 deleted (DR-25 duplicates
of the DR-09 patience family), F197/F198 added (robots-blocked-all false-negative) — functional count
stays flat at 196; net requirement delta 0. Every requirement here passes the Perfect Technology Filter
(each is a policy/definition/refusal still needed on a computer with infinite speed/memory/cost).

## Challenge round 8 pass 2026-07-09 (.swe-spec/CHALLENGE-ROUND-8.md, F199-F201) — TAIL CLEANUP

Same Perfect Technology Filter applied. All 3 new lines resolve to `functional`: each is a
report-content disclosure policy a real report generator still needs regardless of machine
speed/memory/cost — none describes a QoS/resource attribute of the machine. Zero new N-numbers (same
pattern as rounds 3-6). In-place edits (F104 disclosure-widen, F148 network-layer wording, F194
default-numeric trigger, the N5 provenance comment) do not change any line's category.

| ID | Category | Filter note |
|----|----------|-------------|
| F199 | functional | disclosure policy (sk- redaction generic-shape false-positive risk) — CR8-M2 |
| F200 | functional | disclosure policy (heuristic_tag cross-run reclassification → finding_id drift) — CR8-M6 |
| F201 | functional | operator-instruction policy (check baseline same-step neighbor before regression) — CR8-M6 |

Summary: 199 functional, 9 nonfunctional (208 total). Net requirement delta +3 (F199-F201 added; no
deletions). M-A's proposed F103-identifier strip mechanism was DECLINED as a build-phase residual
(disclosure-only landed in the widened F104); 3 MAJOR/MINOR were re-litigations of durable CR7
dispositions and were rejected — see scrub-log.md `## CR8 tail cleanup`. Every new line passes the
Perfect Technology Filter.
