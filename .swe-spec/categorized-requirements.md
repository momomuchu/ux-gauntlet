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
| F78 | functional | patience-exceeded policy (terminate crawl) — DR-25a |
| F79 | functional | patience-exceeded policy (distinct run-status event) — DR-25b |
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

Summary: 100 functional, 7 nonfunctional (107 total). Borderline calls recorded: F6, F30/F31 (original
pass, see notes above); F57/F58, F98, F99/F100 (unknowns pass — resource/action caps kept functional
per the F16/F31 hard-count-and-execution-model precedent, see note above table).
