# ADR-0001: Runner CLI contract

Status: PROPOSED (accepted together with spec 0001 at founder approval) — 2026-07-08
Criticality: [HIGH][BLOCKS:high]

## Context

The acceptance test exercises the runner's command-line interface; without a recorded contract,
the test would silently define spec-level interface decisions (disjoint-review finding #18).
A CLI is a public interface — a material decision per decision-record discipline.

## Decision

`scripts/run-gauntlet.mjs` accepts:

| Flag | Required | Meaning |
|---|---|---|
| `--url <target>` | yes | target application base URL |
| `--tasks <file>` | yes | happy-path task list (JSON) |
| `--i-own-this-target` | yes | explicit operator-authority confirmation (F65) — no flag, no crawl |
| `--env <local\|staging\|production>` | yes | target environment class declaration (F61) — hard-stop without it |
| `--denylist <file>` | yes | action-level denylist of destructive element labels, validated as a non-empty JSON array of strings against `schemas/denylist.schema.json` (F37/F38/F106); `denylist/default-destructive-labels.json` ships as the copyable default (F105) |
| `--test-mode` | conditional | declares payment flows sandboxed; payment-submission steps refuse without it (F39) |
| `--confirm-third-party-data` | conditional | required for any non-localhost target: acknowledges evidence may contain third-party data (F67/F68) |
| `--full-submission` | no | disables the default dry-run boundary on non-idempotent requests (F40) — does NOT affect a step flagged `precondition_step` in the task list, which submits regardless (F126/F127, CR2-1) |
| `--override-robots` | no | overrides robots.txt disallow-abort (F41/F42); off by default |
| `--personas <paths...>` | no | persona data files; default = every file in `personas/` |
| `--max-parallel <n>` | no | concurrent persona subagent cap; default 5 (F98) |
| `--headless` | no | forces headless browser mode; redundant with the auto-default below but kept for explicit CI invocations |
| `--no-headless` | no | forces a visible-browser launch, overriding the auto-headless default (F135, CR2-10) |
| `--timeout <minutes>` | no | run-level wallclock timeout; default 50 (F131, CR2-7) |
| `--standardized-flow-allowlist <file>` | no | flow-name file naming standardized flows (e.g. login) whose findings receive the F27 lower-confidence label (F140/F141/F142, CR2-14) |
| `--ci --baseline <file>` | no | CI mode: diff findings against committed baseline by finding_id (F72–F74) |
| `--out <dir>` | no | output directory; default `runs/<timestamp>/` |

Exit codes: `0` = run completed and gates passed; `1` = gate/validation failure (incl. refusal to
start: missing task list, <3 personas, malformed persona, invalid denylist file, missing safety
flags per F37/F39/F61/F65/F67/F106); `2` = usage error (unknown flag, missing required flag); `3` =
target unreachable at crawl start — DNS failure, connection refused, TLS handshake error (F80,
distinct from gate refusals so CI can tell "new severity-4" from "app down"). Refusals print a
one-line reason to stderr naming the violated rule (F108 governs the multi-violation case). In
`--ci` mode, exit is additionally nonzero whenever the run's `run_status` is `BLOCKED`, independent
of severity-4 diff content (F101) — a near-total persona failure must not read as a clean CI run.

**Revision 2026-07-08 (same day):** refusal-layer flags added after the unknowns audit
(docs/research/UNKNOWNS-DELTA.md) — closes the disjoint-executor residual "CLI contract not
updated for refusal requirements". Safety flags are REQUIRED-by-default and opt-out is explicit
and loud; this inverts the usual CLI convenience default deliberately (delta §5 pattern 1:
"discover, don't refuse" was the spec's dominant gap shape).

**Revision 2026-07-08 (challenge round 1, CR1-7/CR1-10/CR1-14):** required-flag validation is
AGGREGATE, not fail-fast. Before refusing to start a crawl, the runner MUST check every static
launch precondition — url presence, tasks-file presence, `--i-own-this-target` presence, `--env`
presence, denylist-file validity, persona-count minimum (F107) — and, when more than one is
violated, print one stderr line per violated rule in the fixed order `url, tasks,
i-own-this-target, env, denylist, persona-count` (F108). This closes two defects at once: (a) the
"iterative archaeology" failure where a founder's first invocation burns 4 reruns discovering one
missing flag at a time (challenge-round MAJOR item 4), and (b) the "coin-flip test" failure where
a builder validating in table order legitimately refuses on a different rule than the one an
under-specified test asserts (challenge-round BLOCKER item 7). The fixed print order also settles
BLOCKER item 10's "authorization flags need documented precedence" concern: since every violated
rule is always reported regardless of internal check order, `--i-own-this-target` and `--env`
refusals can never be silently masked by an earlier or later check. Exit code stays `1` for this
whole set, even when several rules are violated simultaneously.

**Revision 2026-07-08 (challenge round 1, CR1-13):** F39 (payment-submission refusal) and F40
(non-idempotent dry-run boundary) gate on schema/network signals, not runtime inference. The
task-list schema carries an operator-set `payment_step` boolean per step (F115); F39's refusal
reads that flag directly (F116) rather than guessing from button text or form contents. F40's
non-idempotent-method detection uses network-request interception of the actual HTTP method used
by the submitted request (F117), not static sniffing of a `<form method>` DOM attribute, which is
frequently absent or overridden by client-side JS.

**Revision 2026-07-08 (challenge round 2, CR2-1/CR2-5/CR2-10):** two per-step task-list schema
fields join `payment_step` (F115) and `external_side_effect` (F62) as the same kind of narrowly
scoped, operator-set, per-step override — see spec.md D14. `precondition_step` (F126) marks an
operator-authored precondition-establishing step (e.g. a pre-seeded-fixture login); F40's default
dry-run boundary does not apply to that step (F127), so a login-gated target is reachable without
passing `--full-submission` (which would also strip F40's protection from the audited task's own
submission). `denylist_override` (F128) marks a step the operator has deliberately authored to
audit a destructive flow (e.g. "Cancel Subscription"); the persona clicks instead of aborting on
that one step, logging a `denylist_override_used` event (F129), while F38's abort rule stays fully
live for every other step in the same run (F130) — the run-global denylist default is never
reopened by a per-step flag. Separately, `--headless` auto-enables whenever no `DISPLAY` is
detected (F87) instead of erroring — every environment the frozen test suite itself runs in is
headless, so the prior error-and-instruct behavior made N8's "zero failed prior attempts" promise
false a second way; `--no-headless` (F135) is the explicit escape hatch for a forced visible
browser.

Companion scripts share the convention: `report-gate.mjs [--check-fixture <file>|<findings.json>]`,
`render-report.mjs <findings.json>`, `validate-persona.mjs <persona-file>` — each exits nonzero on
violation with a stderr reason.

## Alternatives considered

Config-file-only invocation (no flags): rejected — flags are the convention every CI example in
the decision brief uses, and per-run overrides (URL, baseline) are the common case.

## Consequences

The acceptance test may only invoke the interface recorded here; changing the CLI requires
updating this ADR first.
