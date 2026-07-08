# Validation — SWEBOK KA1 §5 set criteria (ux-gauntlet MVP, 2026-07-08)

## Complete
The set is complete against the decision brief: every MUST in brief §2 (methodology), §3 (validity envelope), §5 (skill format) and §7 (MVP scope) maps to at least one requirement (F1–F27, N1–N7); the brief's non-goals map to the spec's non-goals section rather than silent omission.
Boundary coverage: F8 fixes the lower input boundary (no task list → refuse); F16 fixes the minimum persona count (≥3); severity is bounded to the closed 0–4 ordinal scale (F12); N5 bounds run time (45 min) and N2 bounds SKILL.md size (500 lines).
Exception coverage: F15 defines the zero-evidence exception path (drop, never soften); F23–F25 define gate failure behavior (exit nonzero, no report ships); F26 defines the CI failure condition precisely (new severity-4 only) so every other finding is a non-exception informational path.
Security coverage: the skill crawls only the operator-supplied target URL (F6) — no autonomous target discovery; forbidden-claim guardrails per persona (F5) plus F21/F22 prevent the report itself from emitting claims that could mislead downstream users; N6 excludes third-party data egress for localhost runs, keeping audit data on the operator's machine.

## Concise
Each line states one testable obligation; req-lint passed 34/34 with zero compound/vague/unbound findings on the first pass (see lint-result.txt), and the scrub log (stage 6) cut speculative items rather than carrying them as padding.

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
