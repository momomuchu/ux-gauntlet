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
| `--denylist <file>` | yes | action-level denylist of destructive element labels (F37/F38) |
| `--test-mode` | conditional | declares payment flows sandboxed; payment-submission steps refuse without it (F39) |
| `--confirm-third-party-data` | conditional | required for any non-localhost target: acknowledges evidence may contain third-party data (F67/F68) |
| `--full-submission` | no | disables the default dry-run boundary on non-idempotent requests (F40) |
| `--override-robots` | no | overrides robots.txt disallow-abort (F41/F42); off by default |
| `--personas <paths...>` | no | persona data files; default = every file in `personas/` |
| `--max-parallel <n>` | no | concurrent persona subagent cap; default 5 (F98) |
| `--headless` | no | headless browser mode (CI) |
| `--ci --baseline <file>` | no | CI mode: diff findings against committed baseline by finding_id (F72–F74) |
| `--out <dir>` | no | output directory; default `runs/<timestamp>/` |

Exit codes: `0` = run completed and gates passed; `1` = gate/validation failure (incl. refusal to
start: missing task list, <3 personas, malformed persona, missing safety flags per F37/F39/F61/F65/F67);
`2` = usage error (unknown flag, missing required flag); `3` = target unreachable at crawl start —
DNS failure, connection refused, TLS handshake error (F80, distinct from gate refusals so CI can
tell "new severity-4" from "app down"). Refusals print a one-line reason to stderr naming the
violated rule.

**Revision 2026-07-08 (same day):** refusal-layer flags added after the unknowns audit
(docs/research/UNKNOWNS-DELTA.md) — closes the disjoint-executor residual "CLI contract not
updated for refusal requirements". Safety flags are REQUIRED-by-default and opt-out is explicit
and loud; this inverts the usual CLI convenience default deliberately (delta §5 pattern 1:
"discover, don't refuse" was the spec's dominant gap shape).

Companion scripts share the convention: `report-gate.mjs [--check-fixture <file>|<findings.json>]`,
`render-report.mjs <findings.json>`, `validate-persona.mjs <persona-file>` — each exits nonzero on
violation with a stderr reason.

## Alternatives considered

Config-file-only invocation (no flags): rejected — flags are the convention every CI example in
the decision brief uses, and per-run overrides (URL, baseline) are the common case.

## Consequences

The acceptance test may only invoke the interface recorded here; changing the CLI requires
updating this ADR first.
