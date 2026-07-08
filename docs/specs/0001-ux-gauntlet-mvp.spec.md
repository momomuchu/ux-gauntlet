---
status: PLANNED (pending founder approval — NOT frozen)
version: null
created: 2026-07-08
shipped: null
evidence: docs/research/DECISION-BRIEF.md (18 sources; 7 load-bearing claims 3-vote adversarially verified)
---
# Feature: ux-gauntlet MVP — persona-driven friction audit skill

## Summary

An MIT-licensed agent skill (Claude Code first, Codex-compatible where feasible) that runs an
**open, extensible set of personas** — 3 buyer-intent defaults shipped (free-tier user,
willing-to-pay user, VP/team buyer); minimum 3 per run for convergence reliability, no upper
bound; one data file = one persona — through an operator-supplied happy-path task list against a
live web app. **Each persona executes as an independent delegated subagent, in parallel, in the
background, with its own browser session.** Every extra action is recorded as a named friction
instance with evidence, tagged against exactly one criterion from the **configured heuristic set
(pluggable data; default: Nielsen 10)**, scored 0–4 via the NN/g 3-factor rubric (frequency,
impact, persistence) plus a separate market-impact flag. The orchestrator merges the per-persona
ledgers into a schema-validated JSON findings file from which a severity-ranked markdown report
is generated — always carrying the validity-envelope disclosure (simulated users find breakdowns;
they do not predict WTP, conversion, or population rates).

White space claimed (per decision brief §4): buyer-economic persona differentiation +
citable heuristic/severity methodology + installable SKILL.md packaging + CI dogfood loop.
No existing open tool combines these.

## Architecture of a run

```mermaid
flowchart LR
    P[persona files\npersonas/*.yaml\nopen set, min 3] --> R(orchestrator\nskill main loop)
    T[happy-path\ntask list] --> R
    H[heuristic set\nconfig data\ndefault: Nielsen 10] --> R
    R -->|delegate, parallel,\nbackground| A1[persona subagent 1\nown browser session]
    R -->|delegate| A2[persona subagent 2\nown browser session]
    R -->|delegate| A3[persona subagent N\nown browser session]
    A1 --> W[per step: 4-question\nwalkthrough -> friction ledger\ntag + severity + evidence]
    A2 --> W
    A3 --> W
    W --> J[orchestrator merges ->\nfindings.json\nschema-validated]
    J --> G{report gate\nPASS/BLOCK}
    G -->|PASS| M[markdown report\nseverity-ranked +\nconvergence tiers +\nvalidity envelope]
    G -->|BLOCK| X[run invalid\nno report ships]
```

## Scenarios (Gherkin)

```gherkin
Scenario: run refuses to start without a happy path          # F7 F8
  Given a target URL but no happy-path task list
  When the operator invokes the skill
  Then the skill refuses to start the crawl
  And it explains that the happy path is operator-defined in MVP

Scenario: an extra step becomes a named, evidenced friction  # F10 F11 F12 F14
  Given the free-tier persona pursuing task "sign up and reach the dashboard"
  And the happy path expects 4 steps, whose final "submit the signup form" step is authored with
    audited_terminal_step: true (D15, F145/F146) so it submits under F40's default dry-run boundary
    without the run needing --full-submission
  When the app forces an email-verification detour of 2 extra actions
  Then the ledger records one friction instance naming the detour
  And the instance carries exactly one criterion tag from the configured heuristic set
  And a 0-4 severity score from the frequency-impact-persistence rubric
  And at least one evidence artifact (screenshot, DOM snippet, or click trace)

Scenario: a walkthrough "No" always becomes a friction        # F9 F33
  Given the persona answers "No" to the discoverability question at step 2
  When the step record is written
  Then a friction instance exists for step 2
  And a findings file containing a "No" answer with no matching friction fails the report gate

Scenario: a finding without evidence is dropped, not softened  # F15
  Given a finding whose evidence artifact reference is empty
  When the report is generated
  Then that finding is absent from both findings.json and the markdown report

Scenario: three personas produce convergence tiers            # F16 F17
  Given a standard audit run
  When it completes
  Then at least 3 personas have executed the same task list
  And every finding carries a convergence tier equal to the number of personas that flagged it

Scenario: every report carries the validity envelope          # F20 F21 F22
  Given any completed run
  When the markdown report is generated
  Then it contains the validity-envelope disclosure section
  And it contains no willingness-to-pay estimate
  And it contains no population-percentage extrapolation

Scenario: the gate blocks an untagged finding                 # F18 F23 F24
  Given a findings.json where one finding lacks a heuristic tag
  When the report gate script runs
  Then it exits nonzero and no report ships

Scenario: persona validator rejects a malformed persona       # F1 F5 F25
  Given a persona file missing the patience-threshold field
  When the persona validator runs
  Then it exits nonzero and names the missing field

Scenario: CI blocks only on new catastrophes                  # F26
  Given a committed baseline report and a new run with one new severity-4 finding
  When CI mode compares the run to the baseline
  Then the process exits nonzero
  And findings of severity 3 or below are reported as informational only

Scenario: a persona aborts rather than clicking a denylisted action  # F37 F38
  Given a run configuration with an operator-supplied destructive-action denylist
  And the happy-path task list's only path forward at step 5 matches a denylisted label ("Delete Account")
  When the persona subagent reaches step 5
  Then the persona subagent aborts the step instead of clicking the denylisted element
  And a run started with no denylist configured is refused before any persona is delegated

Scenario: a legitimately audited destructive flow is authored with denylist_override   # F37 F38 F128 F129 F130
  Given a happy-path task list whose step 5 clicks "Cancel Subscription" (a denylisted label)
  And the operator has flagged step 5 with denylist_override in the task-list schema
  When the persona subagent reaches step 5
  Then the persona subagent clicks the denylisted element instead of aborting
  And a denylist_override_used event is logged for that click
  And a different, non-overridden step matching a denylisted label elsewhere in the same run is still aborted (F130 — the override is step-scoped, not a run-global bypass)

Scenario: a payment step is refused outside test-mode          # F39
  Given a happy-path task list containing a payment-submission step
  And the run configuration has not declared the run as test-mode
  When the persona subagent reaches the payment-submission step
  Then the skill refuses to execute the payment-submission step

Scenario: the crawl respects robots.txt disallow rules         # F41 F42
  Given a target whose robots.txt disallows the persona's user-agent from "/admin"
  And no override flag was passed
  When a persona's happy-path step would navigate to "/admin"
  Then the persona subagent aborts that navigation
  And the robots.txt file is loaded before any crawling begins

Scenario: secrets are redacted from captured evidence          # F43 F44 F102
  Given a page whose DOM contains a bearer-token-shaped string and whose screenshot evidence's captured_text sidecar field (F102, accessibility-tree text, not OCR'd pixels) contains the same token
  When the evidence capture module writes the screenshot and DOM snippet to disk
  Then neither the on-disk DOM snippet nor the on-disk screenshot evidence's captured_text sidecar field contains the raw token substring
  And rendered screenshot pixel content is out of scope for redaction in the MVP (named v2 residual risk, see Non-goals)

Scenario: ambiguity resolution requires a multi-candidate artifact, not self-narrated hesitation   # F34 F110
  Given the persona's evidence artifact shows 2 candidate plan-copy segments concurrently visible on the pricing page before the persona's choice
  When the persona resolves the ambiguity and advances past that step
  Then an ambiguity_resolution friction instance is recorded for that step
  And a friction instance whose only evidence is persona self-narrated hesitation text, with no multi-candidate artifact, fails the report gate (F110)

Scenario: a crashed persona sets run-status BLOCKED            # F49 F53 F173
  Given a standard run of 3 persona subagents
  When one persona subagent crashes before completing its crawl
  Then the run-level run-status field is set to BLOCKED
  And that persona's findings.json entry carries run_status "crashed"

Scenario: two patience-exhausted personas alone never trigger BLOCKED   # F49 F175 CR4-B2
  Given a standard run of 3 persona subagents
  And 2 of the 3 personas legitimately abandon their task via patience exhaustion (0 crashed, 0 timed-out)
  When the run completes
  Then the run-level run-status field is NOT set to BLOCKED
  And CI mode exits zero for this run, distinguishing designed patience-exhaustion from execution failure

Scenario: a persona past the runner-level action cap is capped, not silently completed   # F53 F57 F176 CR4-B1
  Given a persona subagent that has executed 50 actions
  When the runner force-aborts that persona's walkthrough per F57
  Then that persona's findings.json entry carries run_status "runner-capped"
  And that persona's partial ledger is emitted with reason_code "runner-capped"

Scenario: CI diff matches by stable finding_id, not by text    # F72 F73 F92
  Given a committed baseline containing a finding with a fixed finding_id
  And a new run whose matching finding has an identical finding_id but reworded narrative text
  When CI mode diffs the new run against the baseline
  Then the finding is treated as already-known, not as a new finding
  And the diff comparison ignores the reworded narrative and timestamp fields
```

## Acceptance criteria (two-axis tags; IDs trace to .swe-spec/requirements.txt)

### CRITICAL items
- [CRITICAL][BLOCKS:critical] Personas load from structured data files conforming to the persona schema (goal statement, success criteria, budget-authority context, patience threshold in steps, forbidden-claim guardrails). Requirement ID: F1, F5.
- [CRITICAL][BLOCKS:critical] Live crawl of a real browser session against the operator-supplied target URL, consuming an operator-supplied happy-path task list; refuses to start without one. Requirement ID: F6, F7, F8.
- [CRITICAL][BLOCKS:high] Per-step 4-question cognitive-walkthrough record (right goal? element noticed? mapping understood? feedback seen?) before advancing — and a "No" answer to any question MUST produce a friction instance for that step (a logged "No" with no consequence is a gate violation). This obligation applies only to steps the persona actually executes (F9, CR4-M1) — a step skipped under F63's external_side_effect rule is exempt, and the persona MUST NOT fabricate walkthrough answers for a step it never performed (F163). Requirement ID: F9, F33, F163.
- [CRITICAL][BLOCKS:high] Friction accounting: one named friction instance per action beyond the happy path; exactly one criterion tag from the configured heuristic set (data-loaded; default: Nielsen 10); severity computed as round(mean(frequency, impact, persistence)), each factor 0-4. Friction covers extra actions AND ambiguity resolutions the happy path does not require, and an ambiguity_resolution's evidence must show ≥2 candidate elements concurrently visible before the persona's choice — self-narrated hesitation alone does not qualify (pure cognitive-load-only friction is a logged MVP cut — see scrub log). For an off-path friction instance (extra_action, ambiguity_resolution), the `step` field used in its F45/F92 identity tuple equals the index of the NEXT not-yet-completed happy-path step at the time the friction occurred, never the last-completed step — a fixed rule closing a defect where two independently-authored records of the same friction could hash to two different finding_ids (F147, CR3-2). The frequency factor is scored as the count of times the persona subagent re-encountered the same friction instance within its own run — never a cross-persona/population estimate, which the isolated per-persona scoring unit (F30/F31) cannot observe (F136, CR2-11); when severity_factors is stored as 3 numeric values, that count maps to the frequency factor via a fixed bucket function (1=0, 2-3=1, 4-6=2, 7-10=3, 11+=4), applied identically by every persona (F159, CR3-17). The severity arithmetic check applies only when severity_factors is stored as 3 numeric values; when stored as free-text rationale instead, the recorded severity value is authoritative (CR2-20). Impact and persistence are no longer half-operationalized: when severity_factors is numeric, impact maps from the persona's terminal recovery outcome for that friction (self-recovered-no-detour=0 ... task-abandoned-or-never-resumed=4, F161) and persistence maps from the same-run recurrence count of the same finding_id (resolved-once-never-recurring=0 ... recurred-11-plus-times-or-never-resolved=4, F162), the same fixed-bucket-function treatment frequency already received (F159) — closing the gap where 2 of the formula's 3 inputs had no reproducible scoring rubric (CR4-B3). Requirement ID: F10, F11, F12, F28, F34, F110, F136, F147, F159, F161, F162.
- [CRITICAL][BLOCKS:high] Evidence discipline: every friction instance references ≥1 captured artifact; zero-evidence findings are dropped. Requirement ID: F14, F15.
- [CRITICAL][BLOCKS:high] Reliability control: ≥3 personas per standard run; per-finding convergence tier = count of run_status-completed personas that flagged it, with a separate partial_tier counting non-completed-persona contributions. The sole input to convergence_tier is the finding's own personas_flagging array field (F170, CR4-M8) — resolving a contradiction where D12's prose claimed persona attribution lived only in the evidence-pointer array while the gate-checked mechanism was always personas_flagging. Requirement ID: F16, F17, F120, F170.
- [CRITICAL][BLOCKS:high] Primary output is schema-validated findings.json; markdown report is generated from it. Requirement ID: F18, F19.
- [CRITICAL][BLOCKS:low] Every report carries the validity-envelope disclosure with its 6 enumerated sub-disclosures (not a replacement for real user research; no WTP claims; no population-rate claims; no ISO-9241-11 compliance claim; no guarantee that a severity value is comparable/reproducible across runs for the same finding_id — regardless of whether severity_factors is free-text or numeric, F157 widened per CR4-B3/CR4-M9 to close the false certainty the prior free-text-only wording implied about the numeric branch even after F161/F162 close its scoring gap; cognitive walkthroughs are weaker on standardized, well-learned interaction patterns, stated unconditionally on every report — not only when a finding happens to carry the F27 lower-confidence label — F171, CR4-M10, closing the gap where N8's own default zero-allowlist happy path shipped full-confidence findings on its own precondition-step login with zero disclosure); the report never emits WTP estimates or population-percentage extrapolations. Requirement ID: F20, F21, F22, F35, F157, F171.

### CRITICAL items — safety & refusal contract

Landed from the 2026-07-08 unknowns pass (`docs/research/UNKNOWNS-DELTA.md` §2, §5 pattern 1): the
spec above is thorough about what personas must *discover*; this block is what the orchestrator and
each persona subagent must *refuse to do*. See D11.

- [CRITICAL][BLOCKS:critical] Destructive-action refusal: the orchestrator rejects any run configuration lacking an operator-supplied action-level denylist of destructive element labels that validates as a non-empty JSON array of strings; each persona subagent aborts (never clicks) a step whose only path forward matches a denylisted label. The denylist abort rule stays live on every step for the whole run EXCEPT a step the operator has explicitly flagged `denylist_override` in the task-list schema (a per-step field, never a run-global bypass — see D14); a `denylist_override` click is still logged as a `denylist_override_used` event, distinct from a silent abort. Requirement ID: F37, F38, F106, F128, F129, F130.
- [CRITICAL][BLOCKS:critical] Financial-side-effect refusal: the skill refuses to execute any payment-submission step in the task list unless the operator has explicitly declared the run test-mode; the payment-step condition is a schema-declared payment_step flag the operator sets per step, never a runtime guess. Requirement ID: F39, F115, F116.
- [CRITICAL][BLOCKS:critical] Default dry-run boundary: the persona agent defaults to stopping short of submitting any form whose action is a non-idempotent HTTP method, unless the operator has explicitly configured full-submission mode; the non-idempotent method is detected via network-request interception of the actual submitted request, never static DOM form-attribute sniffing. The ONLY two per-step exemptions from this default are `precondition_step` (a leading login/setup step, F126/F127) and `audited_terminal_step` (the audited task's own final submission, F145/F146, CR3-1, D15) — every other step stays subject to the default even when the run is not `--full-submission`. Requirement ID: F40, F117, F145, F146.
- [CRITICAL][BLOCKS:critical] Authorization gate: the runner loads the target's robots.txt before crawling begins; each persona subagent aborts navigation to a path disallowed for its user-agent unless the operator passes an explicit override flag. A robots.txt fetch that returns any non-2xx response (absent/404, or any other error) on an otherwise-reachable target is treated as allow-all, not as a refusal (F148, CR3-3) — the gate itself is never weakened for localhost/staging; the one documented resolution for a blanket `Disallow: /` on a real robots.txt is the existing `--override-robots` flag, which first-run guidance and `--help` text must now name (F152, CR3-7, D15). Requirement ID: F41, F42, F148, F152.
- [CRITICAL][BLOCKS:critical] Evidence secret redaction: before any evidence artifact is written to disk, the evidence capture module redacts pattern matches from both a screenshot-type evidence entry's captured_text sidecar field and DOM snippets. The redaction pattern set is an enumerated minimum, not a single narrow shape: Bearer/JWT tokens, cookie header values, shape-qualified cloud API-key patterns (`AKIA[A-Z0-9]{16}`, `sk-[A-Za-z0-9]{20,}`, `ghp_[A-Za-z0-9]{36}`, `gh_pat_[A-Za-z0-9_]{20,}` — CR3-8 closes the bare-3-char-prefix defect that would have redacted ordinary UI text like "Task-42" or "Desk-booking"), 13-19 digit Luhn-valid card-number sequences (CR2-9, restoring DR-05's original scope). The "cookie header value" clause is itself shape-defined, not left as a bare undefined phrase (CR4-M4): a case-insensitive literal `Cookie:`/`Set-Cookie:` prefix followed by one or more semicolon-separated key=value segments (F166 screenshot sidecar, F167 DOM snippets), narrow enough to leave ordinary UI copy that merely mentions the word "cookie" untouched. Requirement ID: F43, F44, F102, F153, F166, F167.
- [CRITICAL][BLOCKS:high] CI-diff identity — dedup rule: two friction records that share an identical (heuristic tag, happy-path step index, target-element identifier) tuple are classified as the same underlying finding and merged into one findings.json entry with one evidence-pointer array; the merged entry's severity equals the maximum severity among the pre-merge records, recorded in a component_severities array. For an off-path (non-happy-path) friction, the `step` value feeding this tuple is defined by F147 (CR3-2) — the next not-yet-completed happy-path step, never the last-completed one. finding_id (the identical dedup tuple used for CI-diff, see D12) is bound to one normative formula, not left to unspecified builder discretion: `'fid-' + sha256(heuristic_tag|step|target_element_identifier).hex[:16]` (F165, CR4-M3). Requirement ID: F45, F46, F118, F119, F147, F165.
- [CRITICAL][BLOCKS:high] App-error isolation: a target-app-side 5xx-or-network-failure event during a walkthrough step is recorded as a distinct app-error event, separate from the friction ledger, and the report lists app-error events in a section separate from the heuristic-tagged friction list. Requirement ID: F47, F48.
- [CRITICAL][BLOCKS:high] Partial-run visibility: the orchestrator records a machine-readable run-status field (separate from findings.json) set to BLOCKED when fewer than 3 persona subagents reach run_status completed, crashed, or timed-out — patience-exhausted and runner-capped personas do NOT count toward the BLOCKED trigger (F49 rescoped, CR4-B2: patience-exhaustion is a designed, successful methodology outcome per F50-F52, not a failure, and must never make the tool's most valuable output — catching a genuinely terrible flow — read as indistinguishable from an infra crash); each persona entry in findings.json carries a run_status value from {completed, crashed, timed-out, patience-exhausted, runner-capped} (F53, 5th member CR4-B1) plus a confidence value of degraded-below-persona-floor when run_status is not completed, and the validity envelope states the count of non-completed personas whenever it is greater than zero. Every run_status member has a defined producer (CR4-S1, see Traceability's enum→producers table): crashed on unrecoverable execution failure (F173), timed-out on the F75 wallclock termination (F174), patience-exhausted on the F50 patience-threshold crossing (F175), runner-capped on the F57 action-cap or F154 tool-call-cap force-abort (F176) — closing the gap where a persona hitting the 50-action or tool-call cap had no enum value it could legally report. Requirement ID: F49, F53, F54, F124, F173, F174, F175, F176.
- [CRITICAL][BLOCKS:high] Patience-threshold abandonment protocol: when a persona's step count crosses patience_threshold_steps, the subagent abandons the current task, captures a screenshot evidence artifact, records a terminal friction instance tagged with the abandonment step index and a heuristic_tag from the configured set, and sets the task outcome field to failed-by-patience in its ledger. The terminal friction's identity fields are fixed, not narrative-derived, so two personas independently abandoning the identical task at the identical step corroborate into one finding rather than two: `target_element_identifier` is a fixed sentinel computed only from the step value (F149), `heuristic_tag` is the one designated patience-abandonment tag in the heuristic-set config (F150) — closing a gap where the class of friction most needing cross-persona corroboration (F16/N5) was the one most likely to silently fail to converge (CR3-5). The heuristic-set configuration file itself now carries the field F150 presupposes: exactly one top-level `patience_abandonment_tag` field whose value MUST be one of the tag identifiers already present in that same file's heuristic list (F169, CR4-M7/CR4-MIN1) — closing the gap where two builders could satisfy every fixture-driven test without ever adding the designation mechanism to the config file itself. Requirement ID: F50, F51, F52, F114, F125, F149, F150, F169.
- [CRITICAL][BLOCKS:high] Task-completion ledger: the ledger records a task_completed boolean per persona per task, plus a reason code drawn from a fixed enumerated set when task_completed is false, independent of the friction list for that task; the enumerated set now also includes `runner-capped` (F123, CR4-B1), matching the F53 run_status 5th member. Requirement ID: F55, F56, F123.
- [CRITICAL][BLOCKS:high] Runner-level cost hard cap: the runner aborts any persona subagent's walkthrough once it has executed 50 actions (regardless of its self-declared patience threshold) and emits that subagent's partial ledger; the identical treatment applies to the F154 per-run LLM tool-call maximum. Either force-abort sets that persona's run_status to `runner-capped` (F176, CR4-B1/CR4-S1) — a real, forced-abort terminal state the pre-CR4 4-value run_status enum had no legal value for. Requirement ID: F57, F58, F176.
- [CRITICAL][BLOCKS:critical] Static-precondition aggregation: the runner CLI checks every static launch precondition (url, tasks, `--i-own-this-target`, `--env`, denylist validity, persona-count minimum) before refusing to start, printing one stderr line per violated rule in that fixed order when several are violated at once — no rule is skipped or masked by check order. A violated rule that has a shipped-default remedy (the tasks and denylist preconditions) additionally names that remedy's file path (`examples/tasks.json`, `denylist/default-destructive-labels.json`) in its own stderr line, not just the rule name (F172, CR4-MIN3) — a first-time operator running the raw script blind gets an actionable refusal, not merely a technically-correct one. Requirement ID: F107, F108, F172.

### HIGH items
- [HIGH][BLOCKS:high] Three default persona files ship: free-tier user, willing-to-pay user, VP/team buyer — the persona set is OPEN: one data file = one persona, zero skill-logic edits to add one. Requirement ID: F2, F3, F4, F29.
- [HIGH][BLOCKS:high] Execution model: each persona runs as an independent delegated subagent with its own browser session; persona subagents run in parallel as background tasks; the orchestrator merges all ledgers into the single findings file. Each persona entry in findings.json carries `start_ts`/`end_ts` fields (F132/F133); the report gate rejects a completed run of ≥2 personas whose recorded intervals never overlap, as the mechanical proof that execution is parallel, not a sequential loop reusing one browser context (F134, CR2-8). **This proof is fixture-only, same as the rest of the safety/refusal layer — see Known verification gaps.** Requirement ID: F30, F31, F32, F132, F133, F134.
- [HIGH][BLOCKS:low] Market-impact flag stored separately from the severity score (cheap-fix/high-perception findings stay visible). Requirement ID: F13.
- [HIGH][BLOCKS:low] Deterministic gates: report gate exits nonzero on schema violation or untagged finding; persona validator exits nonzero on schema violation. Requirement ID: F23, F24, F25.
- [HIGH][BLOCKS:high] Runner CLI conforms to the contract in docs/adr/0001-runner-cli-contract.md (flags, exit codes, stderr refusal reasons). Requirement ID: F36.
- [HIGH][BLOCKS:none] Agent-skills packaging: SKILL.md with name+description frontmatter; body <500 lines; personas/schemas/templates as bundled resources (progressive disclosure). Requirement ID: N1, N2.

**Side-effect guards (unknowns pass, `docs/research/UNKNOWNS-DELTA.md` §2):**
- [HIGH][BLOCKS:high] Persona-filled name/email/phone-number fields are sourced from a pre-declared synthetic-test-domain identity pool rather than freely-generated real-looking values. Requirement ID: F59.
- [HIGH][BLOCKS:low] The run ledger records every account-or-resource artifact a persona subagent creates on the target app during a run (identifying key-or-URL) as a distinct created-artifact entry. Requirement ID: F60.
- [HIGH][BLOCKS:critical] The runner hard-stops before starting any crawl when the operator has not explicitly declared the target environment class (local, staging, production). Requirement ID: F61.
- [HIGH][BLOCKS:high] The task-list schema supports a per-step operator-set external-side-effect flag; a flagged step is skipped by the persona and recorded as blocked rather than executed, and the skipped step is exempt from F9's per-step walkthrough obligation — the persona MUST NOT fabricate walkthrough answers for a step it never performed (F163, CR4-M1). The repo ships `schemas/tasks.schema.json` defining task-list steps as either a plain string or an object carrying the closed set of 5 optional per-step boolean fields (`payment_step`, `precondition_step`, `external_side_effect`, `denylist_override`, `audited_terminal_step` — D15), so the operator-authored tasks.json and the run-bundle's derived `task_list_steps` array are declared to be the same data at different pipeline stages (F156, CR3-11). The schema validator rejects a step object carrying more than one of the 5 D15 flags at once (F164, CR4-M2) — resolving the previously-unadjudicated case where a step schema-legally authored with both `audited_terminal_step:true` (F146 requires submission) and `external_side_effect:true` (F63 requires skip) would trigger two contradictory MUSTs; the 5 flags are mutually exclusive per step. The shipped `examples/tasks.json`'s own terminal non-idempotent submission step MUST itself carry `audited_terminal_step: true`, verified by schema validation and a dedicated acceptance test, not merely referenced by name in SKILL.md (F168, CR4-M6) — otherwise the one real shipped example a founder's first run actually uses could silently dry-run-block its own signup submission despite every frozen test passing. Requirement ID: F62, F63, F64, F156, F163, F164, F168.
- [HIGH][BLOCKS:critical] The runner refuses to begin any crawl unless the operator has passed an explicit `--i-own-this-target` confirmation flag. Requirement ID: F65.
- [HIGH][BLOCKS:high] The persona validator exits nonzero when a persona file contains a field matching a live-credential pattern instead of an operator-designated disposable-test-account reference. Requirement ID: F66.
- [HIGH][BLOCKS:high] Before any run against a non-localhost target, the runner requires and then gates on an explicit operator confirmation that captured evidence (screenshots, DOM excerpts) may contain third-party data. "localhost" is technically defined, not a bare hostname-string match: a target is localhost when its `--url` hostname is the literal string `localhost`, an address in `127.0.0.0/8`, or `::1` (F155, CR3-10) — this is the ONLY automatic localhost/`--env local` relaxation in the whole safety layer (D15); `127.0.0.1` targets (common with Docker/Vite/uvicorn defaults) get the same treatment as `localhost` and never silently require `--confirm-third-party-data`. Requirement ID: F67, F68, F155.

**Run-integrity & reproducibility (CI-mode dependency chain — see D12):**
- [HIGH][BLOCKS:high] Each run emits a run manifest recording the skill/schema version, the heuristic-set version, and a per-persona content hash used in that run. Requirement ID: F69.
- [HIGH][BLOCKS:low] The validity-envelope section states that re-running the same target/personas can surface a differing, non-superset-non-subset set of findings, that it never claims single-run completeness, and that convergence tiers can undercount on apps lacking stable element selectors. Requirement ID: F70, F71, F104.
- [HIGH][BLOCKS:high] The baseline file stores one stable finding_id per finding (deterministic across reruns, independent of evidence text/timestamp, using a field name distinct from any narrative or timestamp field); CI mode matches findings against the baseline solely by finding_id, treating evidence-text/timestamp fields as informational-only and excluded from the diff. Requirement ID: F72, F73, F74, F122.
- [HIGH][BLOCKS:high] The orchestrator terminates any persona subagent still running when the run-level wallclock timeout fires and merges that subagent's partial ledger, as-is, into findings.json; the timeout defaults to 50 minutes when the operator has not supplied `--timeout <minutes>` (F131, CR2-7). Requirement ID: F75, F76, F131.
- [HIGH][BLOCKS:high] A transient technical failure is disambiguated from friction from an app-error by outcome, not just event type: a retry that succeeds automatically within the wait timeout is transient (excluded); a retry requiring a persona-initiated extra action is friction unless a 5xx-or-network-failure response was captured, in which case it is an app-error. Requirement ID: F77, F111, F112, F113.
- [HIGH][BLOCKS:none] The repo ships schemas/run-bundle.schema.json defining the run-bundle shape the report-gate script's fixture-check mode consumes (see Known verification gaps). Requirement ID: F109.
- [HIGH][BLOCKS:low] A persona subagent that exceeds its declared patience threshold terminates its crawl and emits a distinct patience-exceeded run-status event, separate from the findings ledger. Requirement ID: F78, F79.
- [HIGH][BLOCKS:low] The runner CLI exits with distinct code 3, printing a one-line stderr reason, when the target URL is unreachable at crawl start (DNS failure, connection refused, TLS handshake error) — distinct from exit code 1 gate/validation refusals. Requirement ID: F80.

**Operator DX:**
- [HIGH][BLOCKS:low] The orchestrator writes a status file, updated at least once per completed persona step, recording each subagent's current state (running/done/failed) and last-completed step index. Requirement ID: F81, F82.
- [HIGH][BLOCKS:low] The skill ships `examples/tasks.json` (pinned concrete path, CR3-4 — mirrors F105's pattern rather than leaving the shipped path unpinned), an example happy-path tasks JSON file, referenced by name in SKILL.md, that an operator can pass directly to the CLI without authoring their own; it also ships a default denylist file conforming to a denylist schema, referenced by name in SKILL.md. Requirement ID: F83, F105.
- [HIGH][BLOCKS:low] A first-time operator reaches a started crawl against a reachable localhost target using only the required flags enumerated in ADR-0001's CLI contract table (`--url`, `--tasks`, `--i-own-this-target`, `--env`, `--denylist`), the shipped example tasks file, and the shipped default denylist file, in one CLI invocation with zero failed prior attempts (CR2-2/CR2-19: `--env` was missing from the original minimal flag list, making N8 literally unsatisfiable against F61's hard-stop; the flag count is now bounded by naming the closed ADR-0001 set rather than left open-ended; the frozen suite's own proof invocation additionally passes `--headless` per F87's sandboxed-CI caveat below, CR4-MIN6). This promise covers flag-validation refusal only — a target whose robots.txt disallows the crawl path still requires `--override-robots` per F152/D15 (CR4-MIN2). Requirement ID: N8.
- [HIGH][BLOCKS:low] The runner CLI emits a fixed-path summary.json (distinct from findings.json) on every completed run: exit status, finding counts per severity, convergence-tier distribution, and the findings.json/report output paths. Requirement ID: F84.
- [HIGH][BLOCKS:high] The runner CLI verifies target URL reachability before delegating any subagent and emits a single actionable stderr message identifying the unreachable URL when the check fails. Requirement ID: F85, F86.
- [HIGH][BLOCKS:low] The runner auto-enables headless browser mode when no display server (`DISPLAY`) is detected, instead of erroring and instructing the operator to add a flag — consistent with the "report, don't just error" philosophy; `--no-headless` forces a visible-browser launch, overriding the auto-headless default (F135). This also closes a second way N8's "zero failed prior attempts" promise was false: every environment the frozen test suite itself runs in is headless/CI/sandboxed (CR2-10). Requirement ID: F87, F135.

**Methodology isolation:**
- [HIGH][BLOCKS:high] Each persona subagent's browser session uses a profile with no cookies/localStorage/app-server session state shared with any other concurrently running persona subagent against the same app instance (cross-persona contamination guard). Requirement ID: F88.
- [HIGH][BLOCKS:medium] The happy-path task-list format lets the operator author precondition-establishing steps (e.g. login with a pre-seeded fixture account) as explicit leading steps; the spec states that creating precondition state is the operator's responsibility, out of scope for the persona to invent. A step is marked precondition-establishing via an operator-set `precondition_step` boolean, distinct from `payment_step`/`external_side_effect` (F126, CR2-1); a `precondition_step`-flagged step is the ONLY submission F40's default dry-run boundary exempts by default — it submits even when `--full-submission` was never passed (F127), so a login-gated target is reachable without globally defeating F40's protection for the audited task's own submission (see D14). Requirement ID: F89, F90, F126, F127.

### MEDIUM items
- [MEDIUM][BLOCKS:none] CI mode: headless, non-interactive; exits nonzero on a new severity-4 finding vs the committed baseline, and independently exits nonzero whenever the run's run_status is BLOCKED regardless of severity-4 content. CI mode also exits nonzero when a finding matched by finding_id to a baseline entry escalated from severity <4 to severity 4 in the current run — an "already-known" finding_id match is not itself a suppression of a genuine catastrophic regression (F151, CR3-6/CR3-14; per-finding-id severity-escalation is IN SCOPE for v1, distinct from the multi-run trend/dashboard statistics that DECISION-BRIEF §7/§8 item 6 excludes — that document lives under docs/research/ and is out of this pass's edit scope per the executor's own task boundary, same CR2-13 precedent already recorded in scrub-log.md; this spec bullet is the authoritative in-scope resolution). A new-or-escalated severity-4 finding that trips the F26/F151 gate carries the same rerun-instability caveat F70 already discloses for the run as a whole (F138); the validity envelope instructs the operator to manually re-run the target before treating a single red CI run as a confirmed regression (F139, CR2-13) — and `ci-diff.mjs` prints that same caveat directly to its own stderr, not only via the human-read markdown report, since a headless CI consumer (N4) typically only surfaces the failing command's own stderr (F158, CR3-13) — this closes the gap where DECISION-BRIEF §6's "avoids CI fatigue" rationale covered only finding *volume* (severity 1-3 excluded), not severity-4 *reliability* (no confirmation step existed at the top tier). Requirement ID: F26, F101, N4, F138, F139, F151, F158.
- [MEDIUM][BLOCKS:none] Operator-allowlisted standardized flows (login, stock checkout) labeled lower-confidence in the report (cognitive walkthrough is weaker there); the lower-confidence label is cosmetic only and does not suppress the CI gate on a severity-4 finding. The allowlist is supplied via `--standardized-flow-allowlist <file>` (F140); the run configuration records the flow-name entries used during that run (F141); the report gate rejects a finding carrying the lower-confidence label whose step matches no recorded allowlist entry (F142) — closing the gap where the label had no supply channel from a real CLI invocation to findings.json (CR2-14). The report also states the rationale, not just the label: whenever any finding carries the lower-confidence label, the validity envelope states that cognitive walkthroughs are weaker on standardized, well-learned interaction patterns (F160, CR3-19). This statement is now ALSO made unconditionally, on every report, independent of whether any finding happens to carry the label (F171, CR4-M10) — F27's mechanism is entirely operator-opt-in via `--standardized-flow-allowlist`, absent from N8's required-flag set, so the zero-effort default MVP run (which routinely opens with a precondition_step login, the brief's own canonical standardized-flow example) previously shipped full-confidence findings on that step with zero disclosure; F160 stays as reinforcing text when the label is present, F171 fires unconditionally. Requirement ID: F27, F121, F140, F141, F142, F160, F171.
- [MEDIUM][BLOCKS:none] 3-persona × 5-step run completes ≤45 min on one machine — under F30/F31 parallel execution the bound derives from a SINGLE persona's 50-action runner cap × per-action budget, not personas × actions (N9 corrects N5's original sequential-looking derivation comment, CR2-8; see requirements.txt N5 comment); localhost targets need no third-party service beyond the agent runtime. Requirement ID: N5, N6, N9.
- [MEDIUM][BLOCKS:none] A finding carrying both the F27 lower-confidence label and the F124 degraded-confidence value stores them as two independent fields, `confidence_label` and `confidence` (matching the existing fixture convention, now made explicit in requirements.txt); neither field alters the other's value, and the combination never alters the F121 CI-gate outcome for that finding. Requirement ID: F143, F144.
- [MEDIUM][BLOCKS:low] The skill README instructs operators to add the evidence output directory to .gitignore before running against any target containing real user data. Requirement ID: F91.
- [MEDIUM][BLOCKS:high] The findings schema assigns each finding a finding_id computed as a deterministic hash of exactly the (heuristic_tag, step, target_element_identifier) tuple — the literal same tuple, same JSON field names, as the F45 dedup key, never persona role, never ledger arrival order (see D12; CR2-6 standardized the field name to `step`, replacing the undefined `normalized_step_id` name that previously didn't match F45's own text); the target_element_identifier itself is computed via the F45/F103 priority-ordered selector fallback, applied identically regardless of persona/account state, but never conflated with a persona-gated or account-gated element that legitimately differs by design (F104, CR2-18). The hash algorithm itself is now a normative formula, not an unspecified "any deterministic hash" left to builder discretion: `'fid-' + sha256(heuristic_tag|step|target_element_identifier).hex[:16]` (F165, CR4-M3) — the exact formula the frozen fixtures already hard-coded as ground truth, now stated in a normative artifact rather than only in fixture prose. Requirement ID: F92, F103, F104, F165.
- [MEDIUM][BLOCKS:low] findings.json and each persona file carry a top-level schema_version integer field; the report-gate and persona-validator scripts reject any artifact whose schema_version is outside the gate's supported-versions list. Requirement ID: F93, F94, F95, F96.
- [MEDIUM][BLOCKS:none] On a delegation-unsupported runtime (no Task/subagent delegation, no background-task support), the skill README states that persona execution requires sequential non-parallel fallback and is unverified/unsupported in the MVP, rather than claiming unqualified Codex compatibility. Requirement ID: F97.
- [MEDIUM][BLOCKS:low] The runner caps concurrently executing persona subagents at a configurable max-parallelism value (default 5), queuing additional persona subagents until a running slot frees. Requirement ID: F98.
- [MEDIUM][BLOCKS:none] The orchestrator terminates a persona subagent early, and emits its partial ledger, when that subagent's LLM tool-call count exceeds a configured per-run maximum, independent of its step-count patience threshold. The maximum is operator-configurable via `--max-tool-calls <n>`, defaulting to 250 when not supplied (F154, CR3-9) — closing the same "configured limit with no CLI surface" defect class already fixed once for `--timeout` (F131, CR2-7). Requirement ID: F99, F100, F154.

### LOW items (convergence tail)
- [LOW][BLOCKS:none] MIT license file present. Requirement ID: N3.
- [LOW][BLOCKS:none] All shipped artifacts in English. Requirement ID: N7.

## Non-goals (MVP)

- No WTP/dollar estimation, conversion prediction, or "% of users" claims (validity envelope, brief §3).
- No autonomous task/goal invention — happy path is operator-defined in v1.
- No accessibility audit (dedicated skill territory), no cross-browser/device matrix (desktop viewport only).
- No multi-run trend statistics in v1 (defer to v2 once baselines exist).
- No ISO 9241-11 "compliance score" — friction findings only.
- No pixel-level OCR redaction of screenshot images (F43 redacts the captured_text sidecar metadata field only, F102) — real rendered-pixel redaction is a named v2 residual risk (CR1-3).

## Known verification gaps (MVP)

- **Every acceptance test that calls `gate()` (`report-gate.mjs --check-fixture`) shares the identical unvalidated-run-bundle-schema caveat, not just the F37-F58 safety/refusal layer.** That set is: F37-F58 (denylist-abort, payment-test-mode, robots.txt, evidence-redaction refusal rules), plus F14/F15, F16/F17, F20-F22, F23/F24, F75/F76, F92, F110-F119, F124, F126/F127, F132-F134, F136, F140-F144, F147, F149/F150, F151, F153, F154, F157, F159/F160, F161-F167, F177, and any other gate-routed test (CR3-15 — a prior draft of this section named only F37-F58, undercounting a founder's real residual-risk picture at freeze). Every one of these routes exclusively through `report-gate.mjs --check-fixture` against a run-bundle shape defined at `schemas/run-bundle.schema.json` (F109) — **that schema is not itself validated by any test in the frozen suite; only its existence is checked** (`existsSync`, corrected wording per CR2-23 — a prior draft of this section overclaimed that tests run "against a schema-validated run-bundle shape," which is not what happens). No test in the frozen suite drives a real browser against a live target to prove the refusal fires end-to-end. This is a named v2 residual risk: a dedicated Playwright-driven end-to-end test suite against a minimal local fixture server is deferred past MVP. (challenge-round-1 CR1-8, widened challenge-round-2 MAJOR item 11, widened again challenge-round-3 MAJOR item 8 — see `.swe-spec/CHALLENGE-ROUND-1.md` BLOCKER item 8, `.swe-spec/CHALLENGE-ROUND-3.md` MAJOR "Known verification gaps" entry.)
- **F30/F31/F32 (parallel independent-subagent delegation) and F88 (cross-persona browser-profile isolation) have no live-behavior test coverage.** F132/F133/F134 (CR2-8) add a fixture-level mechanical check that recorded persona start_ts/end_ts intervals overlap, which rules out a single strictly-sequential loop reusing one shared browser context — but nothing in the frozen suite drives real concurrent subagents or inspects real browser-profile isolation (cookies/localStorage/session state) end-to-end. This gap is explicitly disclosed, not silently absent, per the spec's own headline architecture claim in the Summary above. Deferred to build-time manual/empirical observation plus the same v2 Playwright-driven suite named above (challenge-round-2 BLOCKER item 4; see `.swe-spec/CHALLENGE-ROUND-2.md`).
- **A second, wider zero-coverage tier exists beyond the F37-F58 fixture-only tier named above.** `test/acceptance.test.mjs` has ZERO references — not fixture-level, not live — to: F59 (synthetic-identity pool), F60 (created-artifact ledger), F62-F64 (external-side-effect step handling, HIGH/BLOCKS:high — CR4 partially narrows this: F163's skipped-step-no-walkthrough-answers carve-out now has gate()-routed coverage, but the base skip/record-blocked behavior itself still has none), F66 (live-credential rejection, HIGH — see the dedicated gap note below), F69 (run manifest), F81-F90 (status file, shipped example tasks, N8 first-run, summary.json, reachability check, headless auto-default, cross-persona isolation, precondition steps — several tagged HIGH/BLOCKS:high or BLOCKS:critical), F93-F100 (schema_version rejection, portability disclosure, max-parallelism cap, LLM tool-call cap), F168-F170 (shipped-example schema/flag content once schemas/tasks.schema.json exists, personas_flagging), F173-F176 (run_status producer transitions — crashed/timed-out/patience-exhausted/runner-capped are each exercised indirectly by existing fixtures' `run_status` field values, but no test independently proves the ORCHESTRATOR sets that field under the stated trigger condition; this is the same class of fixture-shape-only proof, not live-behavior proof, that the rest of this tier already discloses). A founder reading only the F37-F58 bullet above would underestimate the actual residual test-coverage risk at freeze. A v2 task must add minimum existence/shape tests for this tier, or the founder explicitly accepts it as unverified-at-freeze (challenge-round-2 MAJOR item 11).
- **F66 (persona validator rejects live-credential-shaped fields) is the exact sibling of the tested F43/F44/F102 redaction rules but had zero test coverage.** Closed in this pass: `test/fixtures/persona-live-credential.yaml` plus a dedicated RED test assert `validate-persona.mjs` rejects a persona file carrying a live-credential-shaped field value, distinct from an operator `TEST-`-prefixed placeholder (challenge-round-2 MAJOR item 12).

## Decisions taken (reversible defaults; founder may override)

| # | Decision | Default chosen | Why |
|---|----------|----------------|-----|
| D1 | Persona count | Floor of 3 per run, NO ceiling; set open via data files; 3 buyer-intent defaults shipped | single-evaluator ratings unreliable (brief §2.4); founder: 3 was never a cap |
| D2 | Task-list authorship | Operator-supplied only | reproducibility; agent must not redefine the happy path |
| D3 | CI gate threshold | Block on new severity-4 only, independent of convergence_tier (CR1-19 generalizes this asymmetric-risk rationale: a lower-confidence label, like a low convergence_tier, must never silently suppress a severity-4 finding from the F26 gate — see D4's CR1-19 addendum) | advisory-first, avoids CI fatigue (brief §6) |
| D4 | Standardized-flow handling | Operator allowlist (no auto-detect); allowlisted flows keep FULL walkthrough scoring, only the confidence label is downgraded. **CR1-19 addendum**: the lower-confidence label is cosmetic only — a lower-confidence severity-4 finding still triggers the F26 CI gate identical to a full-confidence one (F121); safety-by-default over allowlist-as-suppression | auto-detection unproven; skip-scoring (brief §2.2 alternative) rejected for uniform data shape + cross-run comparability; CR1-19: an allowlist must not become a silent catastrophe-suppression channel |
| D5 | Browser substrate | Playwright-based bundled scripts | CI-headless requirement (N4) + anthropics/skills precedent |
| D6 | Report tone | Maximum critique, zero flattery — but every claim evidence-anchored | founder intent, made defensible by F14/F15 |
| D7 | Heuristic taxonomy | Pluggable data file; default = Nielsen 10; alternative sets (ISO 9241-110, Bastien-Scapin, custom conversion-friction) loadable without logic edits; any custom set labeled as author's own choice, never source-attributed | founder: Nielsen is not the only lens; invariant is "no untagged finding", not "Nielsen" |
| D8 | Worker routing | Persona subagents run on Sonnet/Haiku-class workers, model stated explicitly per lane, never the session flagship | founder cost policy |
| D9 | Runner CLI contract | Flags + exit codes fixed in docs/adr/0001-runner-cli-contract.md; tests may only invoke that interface | a CLI is a public interface — decision-recorded, not test-invented (review finding #18) |
| D10 | convergence_tier representation | Integer count of flagging personas in findings.json, counting only run_status-completed personas (CR1-18); a separate partial_tier field counts non-completed-persona contributions (F120); named buckets (flagged-by-1/2+/all) derived at render time only | one canonical representation; buckets are presentation (review finding #19); CR1-18: a crashed/timed-out persona's contribution must not silently inflate the completed-persona reliability signal |
| D11 | Refusal layer | The tool must refuse to perform destructive/financial/unauthorized/leaky actions, not only discover friction around them; refusal requirements (denylist abort, payment test-mode gate, default dry-run boundary, robots.txt gate, evidence redaction) are CRITICAL and sit alongside, not beneath, the discovery contract | unknowns-pass §5 pattern 1: "the spec defines what the tool should discover, but not what it must refuse to do" — 7 of 12 mvp-critical gaps shared this root cause |
| D12 | CI-diff identity | A finding's identity for baseline diffing is its deterministic finding_id — the SAME function as the F45/F46 dedup key: a hash of exactly the (heuristic_tag, step, target_element_identifier) tuple (F92/F103), never full-text equality, never persona_role, never a narrative-derived key. Persona attribution lives in the merged entry's personas_flagging array field (F170, CR4-M8), never in the identity key; the evidence-pointer array (F46) is independent evidentiary support and is NOT the source of convergence_tier. The dedup rule (F45/F46) collapses same-identity records BEFORE the diff runs. **CR4-M8**: the prior wording ("persona attribution lives only in the merged entry's evidence-pointer array") was contradicted by the canonical `findings-valid.json` fixture itself, which has only ONE evidence-pointer entry (no persona field) while the actual gate-checked mechanism is the separate `personas_flagging` array — nowhere formalized in requirements.txt before F170. Fix: state the field that was already gate-checked, add F170 as its normative definition; no test changes needed | unknowns-pass §5 pattern 2: DR-06 (dedup) + DR-35 (stable finding_id) unblock DR-08/DR-10/DR-22 "almost for free"; landing the pair first was the audit's explicit sequencing recommendation. **CR1-1/CR1-5 (challenge round 1)**: the original F92 hashed persona_role plus an undefined narrative-derived "friction semantic key" alongside a 3-field tuple that only partially overlapped F45's — 4 independent adversarial lenses converged on this as the single highest-priority defect (structurally impossible cross-persona merge, collapsed convergence_tier). Fix: collapse F92's hash onto F45's exact tuple so dedup identity and CI-diff identity are literally the same function, not merely "equivalent"; this also resolves the undefined/narrative-derived-key defect (CR1-5) by elimination — there is no longer any narrative-sourced field in the hash to be undefined or nondeterministic across reruns. **CR2-6 (challenge round 2)**: F92's tuple named its second field `normalized_step_id`, a name F45 never used (F45 said "happy-path step index" with no JSON field name stated) — the two requirements described the same tuple with mismatched field names, and the only fixture used a bare `step` integer matching neither literal name. Fix: standardize the JSON field name as `step` in both F45 and F92 (matching the pre-existing fixture convention); a new RED test independently recomputes finding_id from `(heuristic_tag, step, target_element_identifier)` for two fixtures and asserts equality with their stored `finding_id`, proving the identity function is actually one function, not two hand-matched literals |
| D13 | Cross-persona merge aggregation function | MAX, not MEAN, across a merged finding's `component_severities` (F118/F119) — deliberately DIFFERENT from F12's cross-factor scoring, which uses MEAN (frequency/impact/persistence). `component_severities` is rendered adjacent to the merged severity value whenever it holds more than one distinct value (F137, CR2-12), so a founder reading the report can distinguish a MAX-driven severity-4 flagged by 1-of-3 personas from one all three agreed on | CR1-17 (challenge round 1): the brief's own reliability rationale for the 3-persona architecture is averaging across evaluators (correctly implemented by F12's MEAN), but severity aggregation across personas is safety-first, not evaluator-agreement-first — a single persona hitting a catastrophic finding must not have its severity diluted toward the mean by two personas who never reached that step. This decision was applied in challenge round 1 but never received its own Decisions-table row or inline `CR1-17` marker, violating the document's own stated traceability convention (challenge round 2 MAJOR item 6, CR2-12) |
| D14 | Per-step operator-override flag family (SUPERSEDED by D15 below — kept for history) | The task-list step schema carries 4 independent operator-set override fields, each narrowly scoped to ONE named exemption on ONE step, none acting as a run-global bypass: `payment_step` (F115, gates F39's payment refusal), `external_side_effect` (F62, gates F63/F64's skip-and-record-blocked behavior), `precondition_step` (F126, CR2-1, exempts ONLY that step from F40's default dry-run boundary — closing the defect where a login-gated target was unreachable under F40 without globally defeating it via `--full-submission`), `denylist_override` (F128, CR2-5, exempts ONLY that step from F38's denylist-abort, logged via a `denylist_override_used` event) — every step NOT carrying its own matching flag stays fully subject to F37/F38 (denylist), F39/F40 (payment/dry-run), F41/F42 (robots.txt) for the whole run | challenge round 2 §4.4 systemic observation: 3 confirmed BLOCKER/MAJOR findings (F40/F89 precondition steps, F37/F38 denylist override, F27 standardized-flow allowlist) independently proposed the identical per-step-operator-override-field shape, following the precedent `payment_step`/`external_side_effect` already set; this decision unifies the shape as one design so a future 5th override field composes the same way rather than reopening the run-global safety default each time. (F27's allowlist mechanism is a separate, file-based CLI supply channel — `--standardized-flow-allowlist`, F140/F141/F142 — not a task-list per-step boolean, since it labels findings post-hoc rather than exempting a step from a refusal.) **D15 (challenge round 3) extends this table to a 5th field and declares the family CLOSED — see below.** |
| D15 | Per-step operator-override flag family — CLOSED (systemic resolution, supersedes D14) | The COMPLETE, CLOSED per-step classification family is exactly 6 members: the 4 existing D14 flags (`payment_step` F115, `external_side_effect` F62, `precondition_step` F126, `denylist_override` F128) plus a 5th, `audited_terminal_step` (F145/F146, CR3-1) — which exempts ONLY the audited task's own final non-idempotent submission from F40's default dry-run boundary, distinct from `precondition_step` (which exempts a *leading* login/setup step, never the task's own terminal outcome) — plus the implicit 6th member, the DEFAULT class: an ordinary step carrying none of the 5 flags, fully subject to every run-global safety gate. This family is declared CLOSED: any future step-class need is a spec change (a new ralplan/decision record), never an ad hoc flag added mid-build. **Precedence order (stated ONCE, here, for the whole safety layer):** (1) a per-step flag beats its own named run-global default, for that one step only; (2) a run-global safety default (F37/F38 denylist, F39 payment test-mode, F40 dry-run boundary, F41/F42 robots.txt) beats task completion for every step NOT carrying its own matching flag — safety always wins over "just finish the task"; (3) localhost/`--env local` relaxations are enumerated EXHAUSTIVELY as exactly ONE relaxation in the whole system: F67/F68's third-party-data confirmation is skipped for a target classified as localhost per F155's technical definition (hostname `localhost`, `127.0.0.0/8`, `::1` — CR3-10; the challenge doc's own illustrative "N6a" label was recategorized functional, not nonfunctional, per the Perfect Technology Filter — see categorized-requirements.md). No other gate is auto-relaxed by localhost or `--env local`; F41/F42 (robots.txt) is explicitly NOT auto-relaxed for localhost/staging (unlike F67/F68) — its escape hatch stays the existing, now better-documented, `--override-robots` flag (F152, CR3-7); (4) the 5 per-step flags are mutually exclusive per step — a task-list step object MUST carry at most one of `payment_step`, `precondition_step`, `external_side_effect`, `denylist_override`, `audited_terminal_step`; a step carrying two or more is a task-list authoring error, rejected by the schema validator (F164, CR4-M2) — closing the previously-unadjudicated case where a step legally carried both `audited_terminal_step:true` (F146 requires submission) and `external_side_effect:true` (F63 requires skip), two contradictory MUSTs the original "CLOSED" framing never actually adjudicated | challenge round 3 systemic mandate (extended by challenge round 4, CR4-M2): three rounds running, the top blockers all traced to ONE root tension — the safety/refusal layer colliding with the product's core completion mission (F40's flagship signup scenario was itself unbuildable under F40's own default, BLOCKER item 1). Per the round-3 mandate, this is resolved structurally (a closed classification family + one stated precedence order), not per-collision — the spec's own flagship Gherkin scenario (F10-F14, `docs/specs/…` scenario "an extra step becomes a named, evidenced friction") now authors its terminal signup-submit step with `audited_terminal_step: true`, so it no longer contradicts F40's default. Option B (a 5th D14-family flag) was chosen over Option A (a scenario-only caveat) per the round-3 mandate's explicit preference: Option B fixes the requirement layer, not just the narrative, so every future task author gets the same closed vocabulary instead of a one-off scenario footnote. |

## Enum / flag-family → producers (systematic sweep, CR4-S1)

Challenge round 4 §4 named "closed enums and flag families keep shipping without a
combinatorial/forced-abort audit" as a recurring defect-generator pattern (F53's run_status enum,
D15's flag family, F49's BLOCKED trigger all failed the same way). This table makes every closed
enum/flag family's producer mapping mechanically visible so drift is caught by inspection, not by a
5th challenge round:

| Enum / family | Members | Producer (requirement that sets/produces this value) |
|---|---|---|
| `run_status` (F53) | `completed` | default terminal state when no other member's trigger fires |
| | `crashed` | F173 — unrecoverable persona execution failure |
| | `timed-out` | F174 — F75 run-level wallclock termination |
| | `patience-exhausted` | F175 — F50 patience_threshold_steps crossing |
| | `runner-capped` | F176 — F57 action-cap OR F154 tool-call-cap force-abort (CR4-B1) |
| `reason_code` (F123, open "at minimum" set) | `dry-run-boundary-stop` | F40 default dry-run boundary |
| | `denylist-abort` | F38 |
| | `robots-disallowed` | F42 |
| | `patience-exhausted` | F52 (task outcome) via F56 |
| | `target-unreachable` | F80 |
| | `runner-capped` | F57/F154 force-abort (CR4-B1) |
| `friction_type` (F177, closed set) | `extra_action` | F10 |
| | `ambiguity_resolution` | F34 |
| | `terminal_friction` | F51 |
| | `walkthrough_failure` | F33 |
| D15 per-step flag family (5 members + implicit default, CR3/D15) | `payment_step` | F115 |
| | `precondition_step` | F126 |
| | `external_side_effect` | F62 |
| | `denylist_override` | F128 |
| | `audited_terminal_step` | F145 |
| | (implicit default: none set) | fully subject to every run-global safety gate |
| CLI exit codes (ADR-0001, D9-authoritative) | `0` | run completed, gates passed |
| | `1` | F37/F39/F61/F65/F67/F106/gate refusals, aggregated per F107/F108 |
| | `2` | CLI usage error (unknown/missing flag) — ADR-0001 defines this surface; no dedicated F-line, per D9 |
| | `3` | F80 target-unreachable |
| `convergence_tier` / `partial_tier` (F17/F120) | — | sole input is `personas_flagging` (F170); `partial_tier` counts non-completed-run_status personas separately |

Every enum member above now has at least one producing requirement (closing the F53/F123
`runner-capped` gap, CR4-B1) and every producing requirement maps to a real enum member (no
orphaned trigger with nowhere to report). Where a member's producer is documentation-only pre-build
(e.g. `crashed`/`timed-out`/`patience-exhausted` at the F53 persona-level field), see "Known
verification gaps" above for the disclosed live-behavior-proof boundary.

## Traceability

- Research: `docs/research/DECISION-BRIEF.md` (each methodology choice cites its source there).
- Unknowns audit: `docs/research/UNKNOWNS-DELTA.md` (8-lens adversarial pass, 45 candidates, 39 accepted as DR-01..DR-39, 4 deferred to v2, 2 rejected).
- Challenge round 1: `.swe-spec/CHALLENGE-ROUND-1.md` (29 attacks, 26 confirmed distinct defects — 10 BLOCKER, 12 MAJOR, 4 MINOR — 2 rejected; each landed line traced via `# CR1-NN` comments in requirements.txt and inline `CR1-NN` markers here).
- Challenge round 2: `.swe-spec/CHALLENGE-ROUND-2.md` (24 raw attacks converging on 23 distinct confirmed defects — 4 BLOCKER, 12 MAJOR, 7 MINOR — 4 rejected; each landed line traced via `# CR2-NN` comments in requirements.txt and inline `CR2-NN` markers here; reconciliation judgment calls recorded in `.swe-spec/scrub-log.md` under the `CR2-N` prefix).
- Challenge round 3: `.swe-spec/CHALLENGE-ROUND-3.md` (23 raw attacks converging on 20 distinct confirmed defects — 6 BLOCKER, 10 MAJOR, 4 MINOR — 3 rejected; each landed line traced via `# CR3-NN` comments in requirements.txt and inline `CR3-NN` markers here; reconciliation + the systemic D15 resolution recorded in `.swe-spec/scrub-log.md` under a dedicated `## CR3 systemic resolution` note).
- Challenge round 4: `.swe-spec/CHALLENGE-ROUND-4.md` (25 raw attacks converging on 22 distinct confirmed defects — 4 BLOCKER, 12 MAJOR, 6 MINOR — 3 rejected; each landed line traced via `# CR4-NN` comments in requirements.txt and inline `CR4-NN` markers here; plus a mandated systematic sweep of 5 defect-generator patterns named in the panel's §4, traced via `# CR4-S<n>` comments — reconciliation + numbering-collision decisions recorded in `.swe-spec/scrub-log.md` under a dedicated `## CR4` section).
- Requirements: `.swe-spec/requirements.txt` (187 lines: 178 functional, 9 nonfunctional; req-lint 187/187 PASS — see `.swe-spec/lint-result.txt`).
- RED acceptance test: `test/acceptance.test.mjs` (references every CRITICAL requirement ID; fails until built).
