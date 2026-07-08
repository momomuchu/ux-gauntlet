# Scope match — scope vs budget (2026-07-08)

Budget: one solo founder acting as product owner + coding agents as build labor; no external
deadline; token budget effectively unconstrained per founder policy; calendar target = ship an
installable MVP skill quickly, iterate in public (MIT).

Scope (2026-07-08, post-unknowns-pass): requirement count grew from 43 (F1-F36, N1-N7) to 107
(F1-F100, N1-N7) — the unknowns audit (`docs/research/UNKNOWNS-DELTA.md`) added 39 accepted lines
(12 mvp-critical, 21 mvp-high, 6 mvp-medium). Build surface = 1 SKILL.md, 3 persona data files,
2+ JSON schemas (findings, persona, plus a run-config/denylist schema implied by F37/F61/F65),
~4 scripts (runner, report gate, renderer, persona validator) now carrying materially more gate
logic (dedup/finding_id matching, redaction, robots.txt, denylist/payment/full-submission refusal,
run-status/status-file/summary.json emission, schema_version rejection), 1 report template, 1 CI
workflow, plus fixtures/tests (test/fixtures/ grew from 11 to 24 files). This is still a
small-to-medium single-repo build with no research risk (all capabilities remain demonstrated prior
art — see validation.md Feasible) — the unknowns pass added policy/refusal density, not new
subsystems or external dependencies.

**Largest single build item is now the safety/refusal layer** (D11): denylist enforcement (F37/F38),
payment test-mode gate (F39), default dry-run boundary (F40), robots.txt gate (F41/F42), and evidence
redaction (F43/F44) all land inside the same two functions the original scope already budgeted for
(action execution, evidence capture) — cheap to land together per the delta's own pattern-4 note —
but they are new gating logic, not restatements of existing behavior, so they materially exceed the
original "~4 scripts" sizing even though file count barely changes.

Verdict: scope still FITS budget (unconstrained token budget, no external deadline). The watched
items are: N5 (45-minute run bound, unchanged) — now under more pressure because F41/F42 (robots.txt
fetch), F43/F44 (redaction pass), and F65/F67/F68 (confirmation gates) add pre-crawl and
per-evidence-capture latency; and F98 (max-parallelism default 5) — a NEW lever, not just a watch
item, since it directly trades wall-clock against concurrency.

Levers if over budget (in order, updated): 1) reduce — cut F26/F27 (CI mode + standardized-flow
labeling) from MVP to fast-follow, as before; now also: land the refusal layer (D11 CRITICAL items)
first and defer mvp-medium items (F91-F100) to fast-follow, since scrub-log confirms none of them are
ship-blocking; 2) add capacity — parallelize persona runs up to the F98 max-parallelism cap (default
5); 3) negotiate — founder may relax N5 to a nightly-only run where wall-clock is irrelevant, or may
raise F98's default concurrency cap if the target app can tolerate more simultaneous sessions.

## Challenge round 1 growth (2026-07-08)

Requirement count grew again, from 107 (F1-F100, N1-N7) to 133 (F1-F125, N1-N8), after the challenge-round-1
adversarial pass confirmed 26 distinct defects (10 BLOCKER, 12 MAJOR, 4 MINOR) and every fix_directive was
applied. test/fixtures/ grew from 24 to 48 files (24 new/extended fixtures for the new RED test cases).
Build surface addition: 2 new schema files (schemas/run-bundle.schema.json, schemas/denylist.schema.json),
1 new shipped resource (denylist/default-destructive-labels.json) — all three are requirements-only in this
pass (F105/F109/F106), not yet built, consistent with the rest of the pre-freeze spec phase. Verdict
unchanged: scope still FITS budget (unconstrained token budget, no external deadline); the identity-
unification fix (F92 collapsed onto the F45/F46 tuple) net-simplifies the eventual CI-diff implementation
versus the pre-challenge-round design, since dedup and CI-diff now share one function instead of two.

## Challenge round 2 growth (2026-07-08)

Requirement count grew again, from 133 (F1-F125, N1-N8) to 153 (F1-F144, N1-N9), after the challenge-round-2
adversarial pass confirmed 23 distinct defects (4 BLOCKER, 12 MAJOR, 7 MINOR) and every fix_directive was
applied (one, MAJOR-9's DECISION-BRIEF.md softening request, was intentionally NOT applied — out of this
pass's edit scope, see scrub-log.md CR2 notes). `test/fixtures/` grew from 49 to 77 files (28 new fixtures
for the new/extended RED test cases). Build surface addition: two new per-step task-list schema fields
(`precondition_step`, `denylist_override`, F126/F128 — requirements-only, following the exact schema shape
already budgeted for `payment_step`/`external_side_effect`), three new CLI flags (`--timeout`, `--no-headless`,
`--standardized-flow-allowlist` — requirements-only, ADR-0001 flag-table rows), no new schema *files* (the
new per-step fields extend the existing task-list schema `payment_step`/`external_side_effect` already
budgeted for; `--standardized-flow-allowlist`'s file is a flat flow-name list, not a new JSON Schema).
Verdict unchanged: scope still FITS budget (unconstrained token budget, no external deadline); the
per-step operator-override family (D14) net-simplifies the eventual implementation versus three
independently-numbered ad hoc booleans, since all four fields (`payment_step`, `external_side_effect`,
`precondition_step`, `denylist_override`) now share one documented extension-point pattern instead of
four one-off designs.

## Challenge round 3 growth (2026-07-08)

Requirement count grew again, from 153 (F1-F144, N1-N9) to 169 (F1-F160, N1-N9), after the
challenge-round-3 adversarial pass confirmed 20 distinct defects (6 BLOCKER, 10 MAJOR, 4 MINOR) and
every fix_directive was applied (two research-document edit requests — DECISION-BRIEF.md §8 item 6,
requested by both the BLOCKER-6 and MAJOR-8 fix_directives — were intentionally NOT applied, same
`docs/research/*.md` out-of-scope boundary already established at CR2-13; see scrub-log.md CR3 notes).
`test/fixtures/` grew from 77 to 88 files (11 new fixtures for the new RED test cases; 1 existing
fixture, `findings-allowlisted-lower-confidence.json`, edited in place to fix a confounded-test
defect). Build surface addition: one new schema file (`schemas/tasks.schema.json`, F156 —
requirements-only, following the exact pattern already budgeted for `schemas/run-bundle.schema.json`/
`schemas/denylist.schema.json`), one new pinned shipped-artifact path (`examples/tasks.json`, F83
amended in place — requirements-only, mirroring F105's denylist-default pattern), one new CLI flag
(`--max-tool-calls`, requirements-only, ADR-0001 flag-table row, same pattern as `--timeout`/CR2-7),
no new build subsystems. The largest structural change is NOT a new build item but a systemic
simplification: D15 closes the per-step operator-override family at exactly 5 named flags plus the
implicit default class, and states the ONE precedence order for the whole safety layer in one place —
this net-REDUCES eventual implementation risk versus the pre-round-3 design, where the same
safety-vs-completion tension had already produced 3 rounds of independent per-collision patches on the
identical root cause (F41/F42 alone drew 3 separate confirmed findings across the 3 rounds).
Verdict unchanged: scope still FITS budget (unconstrained token budget, no external deadline).

## Challenge round 4 growth (2026-07-09)

Requirement count grew again, from 169 (F1-F160, N1-N9) to 187 (F1-F178, N1-N9), after the
challenge-round-4 adversarial pass confirmed 22 distinct defects (4 BLOCKER, 12 MAJOR, 6 MINOR) and
every fix_directive was applied, PLUS a mandated systematic sweep of the panel's own 5 named
defect-generator patterns across the whole spec (traced via `# CR4-S<n>`). `test/fixtures/` grew from
88 to 107 files (19 new fixtures for the new/extended RED test cases). Build surface addition: zero new
schema/script files (this round's fixes are all requirement-wording, disclosure, and identity-formula
closures, not new subsystems) — the closest to a new build item is the enum-producer closure
(F173-F176), which is pure orchestrator state-transition logic the runner already needed to implement
to satisfy the pre-existing F53 enum, not a new capability. No new CLI flags (ADR-0001 unchanged this
round). The systematic sweep's most consequential finding was NOT a new requirement but a test-suite
completeness gap: the entire F111/F112/F113 retry-classification test block had zero positive controls
(all 3 assertions were `notEqual(code, 0)`), meaning it could pass without the gate ever correctly
classifying a CORRECT retry — closed with 2 new `-ok` fixtures, net-improving test-suite rigor at zero
schema/build cost. Verdict unchanged: scope still FITS budget (unconstrained token budget, no external
deadline); the enum-producer traceability table added to spec.md (Enum / flag-family → producers)
net-simplifies future challenge-round audits by making producer coverage visually inspectable instead
of requiring a fresh adversarial sweep each round.

## Challenge round 5 growth (2026-07-09)

Requirement count grew again, from 187 (F1-F178, N1-N9) to 199 (F1-F190, N1-N9), after the
challenge-round-5 adversarial pass confirmed 18 distinct defects (4 BLOCKER, 7 MAJOR, 7 MINOR) and
every fix_directive was applied, PLUS a mandated root-cause sweep of every closed-enum value family
across requirements.txt/spec.md/fixtures/tests for the "same value spelled differently" defect class
(recorded as `## CR5 canonical token table` in scrub-log.md). `test/fixtures/` grew from 107 to 119
files (12 new fixtures for the new/extended RED test cases; 1 existing fixture,
`findings-severity-impact-persistence-mapped-ok.json`, edited in place to correct its severity
arithmetic under F162's corrected bucket definition). Build surface addition: zero new schema/script
files (this round's fixes are all requirement-wording, correlation-rule, disclosure, and
provenance-check closures, not new subsystems) — the closest to a new build item is F179/F180's
request-correlation rule, which is browser network-interception logic the runner already needed to
implement to satisfy the pre-existing F117 requirement, not a new capability. No new CLI flags
(ADR-0001's flag table is unchanged this round; `--max-parallel`'s existing cell gained a
minimum-value clause, F185, not a new flag). The root-cause sweep's most consequential finding was
that only 3 of the ~8 closed-enum families it checked had a real spelling/claim drift (F170, F49,
F52) — the sweep also positively confirmed one near-miss (`robots_disallowed`, a per-action boolean
field, vs. `robots-disallowed`, the `reason_code` enum value) was NOT a collision, closing the
question before a future round mistakes it for one. Verdict unchanged: scope still FITS budget
(unconstrained token budget, no external deadline); the canonical token table net-simplifies future
challenge-round audits the same way CR4's enum-producer table already did, by making every closed
family's ground-truth spelling visually inspectable in one place instead of requiring a fresh
cross-file grep sweep each round.
