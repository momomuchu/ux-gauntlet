# Decision Brief: Persona-Driven UX Friction Audit Skill for Claude Code / Codex

**Scope**: spec input for an open-source (MIT) agent SKILL that impersonates consumer buyer personas, live-crawls a target web app in a real browser, and outputs a severity-ranked friction report.
**Research basis**: 12 load-bearing claims independently 3-vote adversarial-checked (7 survived, 5 killed and excluded below), remaining claims used with explicit hedging, 18 sources indexed in §9 (33 unique sources surveyed, 89 claims extracted).

---

## 1. Problem Statement

Existing browser-driving Claude Code/Codex skills solve **functional QA** (does it work?) [16][17] or **generic persona QA** (does an age-cohort persona notice bugs?) [15]. None solve **buyer-economics-aware friction accounting**: quantifying, for a specific commercial intent (try it free / pay for it / buy it for a team), every extra step, ambiguity, or stumble between the user's stated goal and task completion, ranked by a defensible severity methodology and traceable to a named usability principle.

The gap is not "can an LLM agent drive a browser" — that's solved [8][9][15][16][17][18]. The gap is: **no open skill combines (a) buyer-intent-differentiated personas, (b) a citable severity/heuristic framework instead of freeform complaints, and (c) an explicit, disclosed validity boundary on what synthetic-user findings can and cannot be trusted for.** Shipping without (b) produces unranked noise; shipping without (c) produces an OSS tool that overclaims (WTP prediction, statistical user-rate claims) in ways the literature already shows LLM personas cannot support [10][12][13].

The skill's job is narrowly: **surface and rank concrete, evidence-grounded UI/UX friction** relative to a stated happy path, per persona, using an auditable methodology — not to predict conversion, willingness-to-pay, or "what % of real users would hit this."

---

## 2. Methodology the Skill MUST Encode

### 2.1 Operational definition of "friction"
A **friction instance** = any point in a task where the persona must perform an action, resolve an ambiguity, or absorb cognitive load that is *not* required by the minimal expected happy-path completion. Every friction instance is tagged against one of Nielsen's 10 heuristics [2] — no untagged findings are permitted in the output schema (deterministic gate, §5).

### 2.2 Per-step interrogation protocol (cognitive walkthrough)
At each step of a persona's task, the skill MUST evaluate four discrete questions before advancing, and MUST fail the step if any answer is "No" [3][4]:
1. Will the persona try to achieve the right result at this step (goal legibility)?
2. Will the persona notice that the correct interactive element is available (discoverability)?
3. Will the persona associate that element with the desired outcome (mapping)?
4. After acting, will the persona see evidence of progress (feedback)?

This is the exact reusable per-step logic that replaces "vibes-based" browsing with a citable protocol.

**Scope constraint (important, source-grounded)**: cognitive walkthroughs are validated for **novel/complex/unfamiliar workflows**, and are explicitly *weaker* on interfaces using standard, well-learned patterns (e.g., a stock e-commerce checkout) where users already carry a working mental model [3]. The skill MUST NOT claim uniform diagnostic power across a whole app — it should flag standardized flows as lower-confidence findings or route them through simple heuristic-compliance checks [2] rather than full walkthrough scoring, and say so in the report.

### 2.3 Severity scale
Adopt Nielsen's 0–4 ordinal scale (0 = not a problem … 4 = usability catastrophe) as the reporting scale. This specific 0–4 rubric text is the one commonly cited operational form of NN/g's severity work; treat the exact ordinal labels as **standard practice, not independently re-verified** in this research pass, and keep them swappable in the persona/rubric data file (§5).

Compute severity from the **verified 3-factor NN/g formula** [1]:
- **Frequency** — how common is this friction across the task population?
- **Impact** — how hard is it for the persona to recover/route around it?
- **Persistence** — does the persona learn to avoid it after one encounter, or does it recur every session? [1]

Additionally, and as a **separate, explicitly-labeled fourth dimension**, assess **market/business impact**: a friction that is trivial to work around but visibly damages perceived product quality (e.g., broken layout on first load) must be flagged even when frequency/impact/persistence alone would rate it low [1]. Do not silently fold this into the 3-factor score — report it as its own tag so a founder can see "cheap fix, high perception cost" separately from "expensive fix, low visibility."

**Explicitly excluded from the severity model** (killed on adversarial check — do not encode as sourced rules): a hard "error-prevention friction always outranks error-recovery friction" rule, a formal "financial/data-loss > cosmetic" weighting scheme, a "novice vs. expert" differentiated-detection framework, and "observable hesitation alone (no stated complaint) is a valid friction signal." None of these survived source verification as stated; if the skill wants prioritization heuristics resembling these, they must be encoded as the skill author's own explicit design choice, not attributed to NN/g.

### 2.4 Multi-persona convergence as the reliability control
NN/g's own findings on human evaluators state that a **single evaluator's severity rating is not reliable**, and that averaging across evaluators — with 3 being the commonly cited practical minimum — is needed before a severity rating should be trusted [1]. This is human-evaluator evidence, not persona-agent evidence, but it is the direct analytic reason the founder's 3-persona design (free-tier / willing-to-pay / VP-buyer) is the right minimum unit, not an incidental UX choice: **a single-persona run produces an unranked opinion; a 3-persona run produces a severity rating with cross-persona corroboration.** Encode this as a hard structural requirement: the MVP always runs ≥3 personas against the same task list and reports both per-persona findings *and* a convergence tier (flagged-by-1 / flagged-by-2+ / flagged-by-all) so the reader can see corroboration strength at a glance. Treat "flagged by all 3" as the closest analog to NN/g's reliable-mean-rating condition, and "flagged by 1" as a low-confidence lead requiring human follow-up, not a shipped verdict.

---

## 3. Validity Envelope of LLM-Simulated Users

The skill's credibility depends on stating this boundary explicitly in its own output, every run — not once in a README.

### MAY claim
- Surfacing concrete, evidence-grounded usability breakdowns via autonomous browser exploration — this is the demonstrated, validated core use case of LLM-agent usability simulation [8][9].
- Structured, reproducible retrospective interrogation of a persona's in-task reasoning at a specific step, since agent state can be probed at an exact memory snapshot rather than relying on a human's (biased) recollection — reported as a property of this class of system, treat as plausible-but-unverified in this pass [8].
- Operating on simplified/flattened DOM representations without full CSS/JS fidelity being necessary for friction detection — reported by prior work, treat as plausible-but-unverified [9].

### MUST disclaim, every run, in the report itself
- **Not a replacement for real user research.** Independent UX-research critique (ACM Interactions, echoing NN/g's own synthetic-persona findings) found synthetic-user responses "too shallow to be useful" for most research activities, with real participants surfacing contradictions and barriers synthetic personas average away [13]. The report must say: *these are simulated-user findings, not real-user validated findings.*
- **Not a source of willingness-to-pay, pricing, or conversion predictions.** Peer-reviewed evidence shows off-the-shelf LLM WTP/preference estimates are frequently inaccurate or wrong-signed without fine-tuning [12]. The "willing-to-pay persona" role is scoped strictly to *friction-finding on paid-tier flows* (e.g., "the upgrade CTA is 4 clicks deep and unlabeled") — it must never output a dollar figure, a "% likely to convert," or any WTP estimate.
- **No success-rate or "X% of users would hit this" claims.** 2026 evidence shows LLM-simulated users are unreliable proxies for real success/failure rates, with agreement as low as ~45% even under best-aligned conditions [10]. The report may say "this persona failed this step" — it must not extrapolate that failure rate to a human population percentage.
- **Findings must be evidence-anchored, not narrated.** Every friction claim in the output must cite the concrete artifact it came from (a screenshot, a DOM snippet, a console error, a specific click sequence) — a cite-or-abstain discipline, echoing mitigation work aimed at exactly this failure mode [14]. A friction claim with no attached artifact is dropped, not softened.
- **No claim of ISO 9241-11 compliance or certification.** The standard defines usability as effectiveness/efficiency/satisfaction in a specified context of use, but explicitly leaves detailed user-based measurement methods out of scope — meaning a browser-crawl friction audit is *a* measurement method the report author chose, not *the* canonical one the standard mandates. Frame findings as "usability friction observed via automated persona walkthrough," never "ISO 9241-11 usability score" (unverified interpretation, flag as such, but directionally safe given the standard's own explicit scope limitation) [5].

---

## 4. Competitive Gap Table

| Tool | What it does | What it misses |
|---|---|---|
| `ncklrs/claude-chrome-user-testing` [15] | Claude Code plugin, 25 generational personas (Boomer/Millennial/GenZ/GenAlpha) drive Chrome to surface UX issues | Personas are demographic/age-based, not buyer-intent-based (no free/paid/buyer-VP economic framing); no severity-ranked, heuristic-tagged friction accounting; no stated validity envelope |
| `Operative-Sh/web-eval-agent` [16] | MCP server, browser-use-driven autonomous debugging: network/console capture, screenshots | Purely functional QA — no persona layer at all, no UX-critique dimension, no severity model |
| `anthropics/skills` – webapp-testing [17] | Official Playwright-based skill for testing local web apps (navigate, screenshot, log capture) + the reusable SKILL.md + bundled-scripts packaging pattern | Pure dev/functional testing; zero persona, zero buyer framing, zero severity-ranked report — but its packaging pattern (SKILL.md + scripts) is worth imitating structurally |
| UXCascade (research prototype) [11] | Persona-driven browser agents + a dedicated Issue Detector producing severity-rated friction findings — architecturally the closest precedent | It is a research paper/prototype, not an installable, open, MIT-licensed Claude Code/Codex skill; no buyer-economic (free/paid/VP) persona split; no CI/dogfooding integration documented as a reusable artifact |
| alexop.dev agent-browser QA pattern [18] | Persona/behavior injected as a standing system-prompt flag applied every turn, driven via CLI in GitHub Actions | Good CI precedent (persona-as-injected-context, no polling loops), but single generic QA persona, no severity ranking, no buyer-intent differentiation |

**Synthesized gap**: no existing open tool combines buyer-economic persona differentiation + a citable heuristic/severity methodology + an installable SKILL.md package + a documented CI/dogfood loop. That combination is the skill's actual white space, not "another browser-driving agent."

---

## 5. Skill-Format Requirements

- **SKILL.md as thin router, not the payload.** Keep the top-level SKILL.md focused on metadata + when-to-trigger + the 4-question walkthrough protocol + the severity formula, under the progressive-disclosure ceiling used elsewhere in the anthropics/skills repo (same repo family as [17]) — push persona definitions, task-list schemas, and report templates into bundled resource files loaded on demand, not inlined.
- **Personas-as-data, not personas-as-prose.** The three MVP personas (free-tier, willing-to-pay, VP/buyer) live in a structured data file (YAML/JSON), each with: goal statement, success criteria, budget/authority context, patience threshold, and explicit "must not claim" guardrails per §3. This keeps personas swappable/extensible without editing the skill's control logic, and is the concrete design pattern that lets a future contributor add a persona (e.g., "accessibility-dependent user") without touching methodology code.
- **Deterministic, schema-validated output.** The friction report is NOT freeform markdown prose as primary output — it is a schema-validated JSON/structured record per finding: `{step, persona, heuristic_tag[2], severity{frequency, impact, persistence, market_impact}, evidence_artifact, convergence_tier}`, with a markdown rendering generated *from* that schema. This is what makes CI gating (§6) and the "no untagged findings" rule (§2.1) enforceable rather than aspirational.
- **Task list is founder-supplied, not agent-invented, in MVP.** The skill consumes a happy-path task list (the thing being audited for friction) rather than free-exploring — this bounds scope, keeps runs reproducible, and avoids the agent silently redefining what "the happy path" is.
- **Explicit validity-envelope block is a required, non-optional section of every report**, not a README footnote — enforce this as a template requirement, not a convention.

---

## 6. CI / Dogfooding Integration Pattern

Borrow two proven patterns rather than inventing a third:
1. **Persona-as-standing-context, snapshot-driven loop** [18]: inject the active persona + task list as system context once per run; let the agent drive via snapshot → interpret → act → repeat without explicit polling/wait logic, matching the demonstrated pattern for Claude-driven browser CLIs in GitHub Actions.
2. **Bundled-script packaging** [17]: ship the browser-driving logic as black-box scripts the skill calls, not as inline reasoning the model re-derives every run — cheaper, more deterministic, easier to test in isolation.

**Recommended loop**: on PR against a target app (or nightly against a staging URL), run the 3-persona audit headless, diff the new severity-tagged findings against a committed baseline report, and **gate merge only on new severity-4 (catastrophe) findings** — everything below that is informational, posted as a PR comment/artifact, not blocking. This mirrors the standard "advisory-first, hard-block only at the top of the severity scale" pattern and avoids false-positive-driven CI fatigue given the known unreliability ceiling of single-run persona findings (§3) [10].

---

## 7. Recommended MVP Scope + Non-Goals

**MVP scope**
- Exactly 3 fixed personas: free-tier user, willing-to-pay user, VP/buyer evaluating for a team — each as a data file per §5.
- Single target URL + founder-supplied happy-path task list per run.
- Cognitive-walkthrough 4-question protocol executed per step, per persona [3][4].
- Every friction instance heuristic-tagged [2] and severity-scored via the 3-factor + market-impact model [1].
- Convergence tiering across the 3 personas (flagged-by-1/2/3) as the reliability signal, per §2.4.
- Schema-validated JSON output + generated markdown report, each finding evidence-anchored (screenshot/DOM/console).
- Mandatory validity-envelope disclosure block (§3) in every report.
- Playwright-based bundled scripts, CI-runnable headless.

**Explicit non-goals for MVP**
- No willingness-to-pay dollar estimation, conversion-rate prediction, or "% of users" extrapolation (§3).
- No autonomous task/goal invention — the happy path is founder-defined, not agent-discovered, in v1.
- No accessibility audit (route to a dedicated corpus/skill; out of scope here to avoid diluting the friction-economics focus).
- No cross-browser/device-matrix execution in v1 (desktop viewport only).
- No claimed statistical confidence beyond the 3-way convergence tier — no p-values, no "validated at N=X" language.
- No ISO 9241-11 "compliance scoring" — friction findings only, framed per §3's disclaimer.
- No multi-run trend/regression statistics in v1 (defer to v2 once baseline reports exist to diff against).

---

## 8. Open Decisions for the Founder

1. **Persona count vs. cost**: ship exactly 3 personas as a hard architectural minimum (per the evaluator-reliability analogy in §2.4), or allow 1-persona "quick audit" mode with a loud low-confidence disclaimer for cheap CI runs?
2. **Task-list authorship**: founder-supplied task list only (MVP recommendation), or allow the skill to propose a task list from a sitemap/nav crawl that a human then approves before the audit runs?
3. **Severity-gate threshold for CI**: block merge only on new severity-4 findings (recommended), or also block on severity-3 findings that appear in all 3 personas' convergence tier?
4. **Where does "standard pattern, walkthrough is weak" get decided?** Should the skill auto-detect standardized flows (checkout, login) and downgrade confidence automatically, or should the founder maintain an explicit allowlist of flows to skip/downweight?
5. **License/attribution posture**: MIT with the validity-envelope disclosure as a non-removable template section (protects against downstream overclaiming by third-party adopters) — confirm this is acceptable, since it constrains how aggressively marketing copy for the OSS project itself can describe the tool's findings.
6. **v2 roadmap gate**: is multi-run regression tracking (severity delta over time, the natural next CI feature) in scope for a fast-follow, or should the MVP intentionally ship without any historical-trend surface to keep the report schema stable while adoption is validated?

---

## 9. Full Source List

1. NN/g — Severity Ratings for Usability Problems — https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems
2. NN/g — 10 Usability Heuristics for User Interface Design — https://www.nngroup.com/articles/ten-usability-heuristics
3. NN/g — Evaluate Interface Learnability with Cognitive Walkthroughs — https://www.nngroup.com/articles/cognitive-walkthroughs
4. Wikipedia — Cognitive walkthrough — https://en.wikipedia.org/wiki/Cognitive_walkthrough
5. ISO — ISO 9241-11:2018 — https://www.iso.org/obp/ui
6. ISO — ISO/IEC 25010:2011 (SQuaRE) — https://www.iso.org/standard/35733.html
7. Wikipedia — Keystroke-Level Model — https://en.wikipedia.org/wiki/Keystroke-level_model
8. arXiv 2504.09407 — UXAgent (full CHI system paper) — https://arxiv.org/abs/2504.09407
9. arXiv 2502.12561 — UXAgent (CHI 2025 Extended Abstract) — https://arxiv.org/abs/2502.12561
10. arXiv 2601.17087 — Lost in Simulation — https://arxiv.org/pdf/2601.17087
11. arXiv 2601.15777 — UXCascade — https://arxiv.org/html/2601.15777v1
12. HBS Working Paper 23-062 — Using LLMs for Market Research — https://www.hbs.edu/ris/Publication%20Files/23-062_1f58623a-ee21-44b9-a262-276047bc5543.pdf
13. ACM Interactions — The Synthetic Persona Fallacy — https://interactions.acm.org/blog/view/the-synthetic-persona-fallacy-how-ai-generated-research-undermines-ux-research
14. arXiv 2601.22288 — PersonaCite — https://arxiv.org/pdf/2601.22288
15. GitHub — ncklrs/claude-chrome-user-testing — https://github.com/ncklrs/claude-chrome-user-testing
16. GitHub — Operative-Sh/web-eval-agent — https://github.com/Operative-Sh/web-eval-agent
17. GitHub — anthropics/skills (webapp-testing) — https://github.com/anthropics/skills/blob/main/skills
18. alexop.dev — How to Use Claude Code as an AI QA Tester with Agent Browser — https://alexop.dev/posts/automated-qa-claude-code-agent-browser-cli-github-actions

**Research evidence**: 12 load-bearing claims adversarially 3-vote checked, 7 survived majority-confirmed (used as load-bearing in §2–3), 5 killed and excluded: novice/expert differentiated-detection framework; error-prevention-outranks-recovery severity rule; financial/data-loss-over-cosmetic weighting scheme; hesitation-alone-as-friction-signal; cognitive-walkthrough-requires-crossfunctional-team (all flagged in §2.2–2.3 as NOT to be attributed to their claimed sources). Additional claims used with explicit "unverified, hedge" framing throughout, per `load_bearing: false` status in the input research packet.