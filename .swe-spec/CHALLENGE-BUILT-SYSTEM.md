# CHALLENGE: Built System vs. DONE_VERIFIED Claims

Adversarial re-run of every attack against the live repo (`/Users/maache/ux-gauntlet`), not a re-read of prior write-ups. 22 attacks confirmed as real defects, 11 attacks confirmed the system behaves as claimed (held), 0 attacks were false positives.

---

## 1) Verdict — honest or theater?

**Mixed, and the theater is concentrated in exactly the claims a founder would trust most.**

Counts:
- 22 CONFIRMED defects (9 BLOCKER, 11 MAJOR, 2 MINOR)
- 11 CLAIMS HELD (mechanisms that really work as described)
- 0 REJECTED (no attack was a false positive — every hypothesis tested either broke something real or confirmed something real; no wasted adversarial cycles)

The core mechanical spine is real: `crawl.mjs` drives a real Playwright browser deterministically, `assemble-run.mjs → report-gate.mjs → render-report.mjs` is byte-reproducible, several structural gate checks (S17 enum, S50 finding_id, S22 lane discriminator on isolated fixtures) genuinely fire. That part is NOT theater.

But three specific DONE_VERIFIED-shaped claims are false when reproduced against the actual delivered artifacts, not synthetic cases:

- **"The gate caught the $19/seat WTP leak and blocked the run"** — FALSE. `report-gate.mjs` is never invoked by the real pipeline (zero call sites in `run-gauntlet.mjs`/`assemble-run.mjs`/`crawl.mjs`). The redaction that actually happened was a silent, unlogged, symbol-only regex inside `assemble-run.mjs` (`scrubWTP()`) that ran *before* the gate could ever see the raw text. Nothing was ever blocked; `run_status` stayed `completed` throughout. (BLOCKER #5)
- **"Real end-to-end demo"** — the documented CLI entry point (`run-gauntlet.mjs`) never drives a crawl at all; it's an honestly-commented stub that exits 0 after precondition checks. The actual demo run bypassed the tool's own orchestrator and hand-wired `crawl.mjs` + `assemble-run.mjs` — a code path with zero automated test coverage of the orchestration step itself. (MAJOR #22)
- **"Both lanes are tested"** — `npm test` runs only the 93-test UX-lane suite; the 44-test structural-lane suite is never invoked by the standard command and there is no CI workflow file anywhere in the repo to catch the gap. (MAJOR #21)

And the founder-facing artifact itself (`runs/combined-two-lane-report.html`) contains a fabricated finding (`main-content-missing`, from an invalid CLI argument, not a real defect) sitting at the same visual severity as a genuine WCAG violation, plus it's hand-authored with no generator script — its correctness depended entirely on manual transcription, which is exactly how the fabricated finding slipped through undetected. (MAJOR #16/17, MAJOR #20)

**Bottom-line verdict: the plumbing claims are honest; the "the safety mechanisms actually protected the founder" claims are theater.** The gate exists and works in isolation (proven by direct fixture tests) but was never wired into the path that produced the artifact the founder was shown.

---

## 2) CONFIRMED defects — BLOCKER → MAJOR → MINOR

### BLOCKER (9)

**B1 — Real under-merge: two personas flag identical CTA-below-fold friction, reported as two tier-1 findings instead of one tier-2**
- Target: `scripts/assemble-run.mjs` `issueKey()` KEY_RULES regex for `cta-below-fold`
- Repro: `runs/1783573340280/findings.json` — `fid-823014f8274738df` ("dead space... scroll") and `fid-9f6e818b9eedbb62` ("isn't visible on load... scroll to find") describe the same step-1 friction but don't cluster because the regex requires the literal substring "not visible on load" and the persona wrote "isn't visible on load".
- Fix: broaden the regex to `/below.{0,3}the fold|below-fold|below fold|isn.?t visible on load|not visible on load|aboveFold:false|scroll to get started|dead space/i`; add a regression fixture pinning the correct tier-2 merge.

**B2 — `assemble-run.mjs` false-merges two UNRELATED frictions into one fabricated cross-persona finding; frozen `report-gate.mjs` PASSES it**
- Target: `scripts/assemble-run.mjs` KEY_RULES `unprofessional-copy` rule (`/probably|cute|casual copy|hedge/i`)
- Repro: two unrelated findings (pricing-copy-tone vs. broken-search) sharing the word "probably" merge into one `convergence_tier=2` finding; the real one loses its own identity; `report-gate.mjs` prints `PASS`, exit 0.
- Fix: tighten the regex to require multi-word phrases (`/cute little|casual copy|unprofessional (tone|copy)/i`); require `heuristic_tag` equality as a co-condition for any KEY_RULES cluster merge, not just narrative text.

**B3 — The gate never ran on the real pipeline; a separate silent regex redacted the $19/seat text before `report-gate.mjs` ever saw it**
- Target: `scripts/assemble-run.mjs` `scrubWTP()` vs. `scripts/report-gate.mjs` (pipeline wiring)
- Repro: raw ledger contains `"...deciding whether to pay $19/seat."`; re-running the real assembler reproduces the shipped, already-scrubbed `findings.json` byte-identical; `grep -rn report-gate scripts/{assemble-run,run-gauntlet,crawl}.mjs` = 0 hits; `report-gate.mjs findings.json` → `PASS` exit 0, no F21 line ever printed; run_status stayed `completed`.
- Fix: remove `scrubWTP()` from the merge step (or gate it strictly after gate evaluation); wire `report-gate.mjs` as a mandatory step (`node scripts/report-gate.mjs runs/<id>/findings.json || exit 1`) between assembly and report generation.

**B4 — 5 findings across 2 personas cite verbatim `/pricing` copy that was never crawled — fabricated, not observed**
- Target: `runs/1783573340280/{vp-team-buyer,willing-to-pay-user}/ledger.json` step-1 findings
- Repro: `trace.json` for both personas visits only `/`, `/signup`×2, `/verify`, `/dashboard` — never `/pricing`; keyword search confirms "Flexible", "Scale", "$19", "seat" absent from the trace — yet both ledgers quote that exact pricing-page copy verbatim (matches `examples/staging-demo/server.mjs`'s `/pricing` route HTML byte-for-byte), attributed to step 1 (the landing screenshot).
- Fix: make `crawl.mjs` actually navigate to every page a persona's task references; add a post-generation validator that greps each finding's narrative against the actually-captured trace text and drops/flags findings whose quoted content isn't present in the cited evidence step.

**B5 — Zero mechanical trace-grounding check anywhere; two hallucinations merge into a `convergence_tier=2`, severity-S4 finding that `ci-diff.mjs` treats as release-blocking**
- Target: `scripts/assemble-run.mjs` (merge logic) + `scripts/ci-diff.mjs` (severity-4 block predicate)
- Repro: `grep -rln trace scripts/*.mjs scripts/core/*.mjs` → only `crawl.mjs` (the writer); no downstream script re-reads `trace.json` to verify grounding. The fabricated `no-self-serve-team-tier...` finding renders in `runs/combined-two-lane-report.html` at S4, "flagged by 2/3" — exactly the shape `ci-diff.mjs` unconditionally blocks CI on.
- Fix: before clustering, load each persona's own `trace.json` and require the finding's asserted terms to substring/fuzzy-match that step's `visible_text`; mark ungrounded findings and exclude them from `convergence_tier` counting and from `ci-diff.mjs`'s severity-4 block.

**B6 — Impact-string case sensitivity (`"Critical"` vs `"critical"`) bypasses BOTH structural gates for the single highest-severity defect class**
- Target: `scripts/structural-report-gate.mjs` (S17) + `scripts/core/structural-severity.mjs` (`AXE_IMPACT_SEVERITY`, `findingBlocksCi`) + `scripts/structural-ci-diff.mjs`
- Repro: flip `impact:"critical"` → `impact:"Critical"` on the repo's own critical-impact fixture; both `structural-report-gate.mjs` (exit 0, "clean") and `structural-ci-diff.mjs` (exit 0, "merge may proceed") pass what should be a hard block. Schema declares an enum (`critical|serious|moderate|minor`) but neither script validates against it at runtime.
- Fix: reject non-canonical impact strings outright (fail-closed) rather than silently no-op'ing on a lookup miss; centralize an `isValidImpact()` used by both gates.

**B7 — S20/S41 dedup is keyed on raw `f.source`, not the code-inferred source used everywhere else — an omitted `source` field lets a literal duplicate axe finding pass**
- Target: `scripts/structural-report-gate.mjs` lines ~91 (display inference) vs. ~141 (dedup key)
- Repro: two byte-identical axe findings, one with `source:"axe"`, one with `source` omitted (relying on the `axe:` code prefix like the display logic does) → dedup keys differ (`axe|...` vs `|...`) → no collision detected → `PASS`, exit 0.
- Fix: extract the source-inference expression into a shared helper and use it for both the display path and the dedup key.

**B8 — `report-gate.mjs` only checks BLOCKED-derivation consistency when `run_status` is present; omitting the field entirely bypasses F191/F49/F54/F124**
- Target: `scripts/report-gate.mjs` line ~174 (`if (personaEntries && storedRunStatus !== undefined)`)
- Repro: personas `[completed, crashed, crashed]` (floorCount=1<3 → should derive BLOCKED); `run_status` key omitted entirely → `PASS`, exit 0. Contrast: an explicit *wrong* `run_status:"completed"` on the same personas correctly fails with F191. The gate polices disagreement but not absence.
- Fix: always compute `derivedBlocked` when `personaEntries` is present; treat a missing `run_status` as a violation, and gate F54/F124 disclosure checks on the derived value, not solely the stored field.

**B9 — `report-gate.mjs` has zero lane-discriminator check — a structural bundle with a CRITICAL a11y violation passes clean**
- Target: `scripts/report-gate.mjs` (no read of `bundle.lane` anywhere — confirmed by grep)
- Repro: `node scripts/report-gate.mjs test/fixtures/structural-critical-impact-violation.json` → drops the critical finding as "zero evidence artifacts (F14/F15)" (a coincidental side effect of the persona-only `evidence[]` rule, not a lane defense — confirmed by adding a dummy `evidence[]` array, which then only fails on unrelated persona-only fields) → `PASS`, exit 0.
- Fix: add an explicit `if (bundle.lane === 'structural') { refuse; exit 1; }` guard at the top of `main()`, mirroring the reverse-direction guard that `structural-report-gate.mjs`/`structural-ci-diff.mjs` already have (S22/S57).

### MAJOR (11)

**M1 — `scrubWTP()` only matches symbol-prefixed prices, not word-form currency ("19 dollars per seat", "USD 19", "20 EUR")**
- Target: `scripts/assemble-run.mjs` line 40
- Fix: extend the regex with a second pass for `\d[\d,.]*\s?(dollars?|bucks?|usd|eur|gbp|pounds?)` etc.

**M2 — The `scrubWTP()` redaction is silent/unlogged — no audit trail proves a WTP claim was ever present or handled**
- Target: `scripts/assemble-run.mjs scrubWTP()` vs. `report-gate.mjs`'s own visible `dropLog`
- Fix: return a `redacted` flag from `scrubWTP`, set `wtp_redacted: true` on affected findings, push to a `redactLog` array analogous to `dropLog`, print at end of run.

**M3 — The "no WTP claims" guarantee is shape-anchored and misses non-numeric WTP phrasing ("worth every penny", "I'd spend real money on this")**
- Target: `scripts/core/claims.mjs WTP_RE` + `SKILL.md` line 84's unconditional claim
- Repro: three plain-English WTP assertions all pass `report-gate.mjs` clean (`PASS`, exit 0) because `WTP_RE` requires a currency symbol/digit or the exact "would pay" bigram.
- Fix: caveat the `SKILL.md` claim to name the gate as shape-anchored with a known non-numeric residual (documented in `claims.mjs`'s own trailing comment); optionally extend the regex/lexical fallback.

**M4 — `crawl.mjs` scroll-detection uses `isVisible()`, which doesn't check viewport position — `action_cost` for step 2 is silently undercounted on every run**
- Target: `scripts/crawl.mjs` lines 60-66
- Repro: live check — `isVisible()`=true, `boundingBox.y`=1324, `scrollY`=0, viewport 844px tall — CTA is ~480px below the fold but the scroll loop never runs (`scrolls`=0, `action_cost`=1, the "ideal" cost).
- Fix: replace `isVisible()` with a `getBoundingClientRect()`-based viewport-intersection check as the loop condition.

**M5 — The heuristic_tag-divergence undercount cause is disclosed for cause (a) only; validity envelope omits causes (b)/(c) that spec F104 requires**
- Target: `scripts/render-report.mjs` Validity Envelope block
- Fix: extend the disclosed-causes text to include heuristic_tag judgment divergence and target-identifier identity leakage; strengthen `test/acceptance.test.mjs`'s generic `/undercount/i` assertion to check for the specific phrase.

**M6 — `--main-content` with plain text (not a CSS selector) silently produces a false severity-4 CI-blocking finding — a fallback present in the pre-build spike was dropped**
- Target: `scripts/structural-scan.mjs` lines ~171-178
- Repro: `--main-content "Create your account"` against the live demo → `main-content-missing` S4 finding → `structural-ci-diff.mjs` BLOCKs. `--main-content "h1"` (same element) → no finding. `git show 6fa90be` (pre-build spike) had a text-substring fallback that the shipped version lacks.
- Fix: restore the substring-match fallback when `querySelector` returns null/throws, matching the documented `<css|text>` contract.

**M7 — The false main-content finding isn't hypothetical — it's literally in the founder-facing `combined-two-lane-report.html`, rendered at the same severity/styling as a genuine WCAG violation**
- Target: `runs/combined-two-lane-report.html` line 21
- Fix: distinguish "selector syntactically invalid/misuse-shaped" from "selector valid but genuinely absent" with a separate `refused`/`possible_selector_misuse` state, not a blind S4 finding; regenerate the report with the correct selector.

**M8 — One of the demo's 3 "real structural findings" is a fabricated artifact of an invalid CSS selector, not a genuine site defect**
- Target: `scripts/structural-scan.mjs` (main-content check) + `runs/combined-two-lane-report.html`
- Repro: re-running with the correct selector (`h1`) yields 2 findings, not 3 — the h1 genuinely is inside `<main>` and is the largest block.
- Fix: same as M6/M7 — add misuse-detection heuristics; regenerate the artifact.

**M9 — `runs/combined-two-lane-report.html` has no generator script — hand-authored static HTML, not produced by tested code**
- Target: `runs/combined-two-lane-report.html`
- Repro: `grep -rl combined scripts/ docs/` → no generator; file is static with hand-typed inline data.
- Fix: either build a real templated generator reading both lanes' JSON output with an acceptance test, or relabel the file as a non-generated mockup outside `runs/`.

**M10 — `npm test` wires only the 93-test UX-lane suite; the 44-test structural-lane suite is never run by the standard command; no CI workflow file exists**
- Target: `package.json` `scripts.test`
- Fix: `"test": "node --test test/acceptance.test.mjs test/acceptance-0002.test.mjs"`; add a `.github/workflows/test.yml`.

**M11 — The documented `run-gauntlet.mjs` CLI entry point never actually drives a crawl; the real demo bypassed it entirely**
- Target: `scripts/run-gauntlet.mjs` lines ~126-131
- Repro: after all precondition checks pass, it prints "crawl entry reached (Playwright persona-subagent integration is stubbed in this build)" and exits 0 — honestly TODO-commented, but the demo's actual run called `crawl.mjs`/`assemble-run.mjs` by hand, a path with zero orchestration-level test coverage.
- Fix: wire the stub to actually invoke the crawl driver per persona and the assembly step; add an integration test against a real fixture server asserting `findings.json`/`summary.json` are written.

### MINOR (2)

**Mi1 — KEY_RULES fallback (`heuristic_tag@step`) silently fails to merge same-issue findings when two personas pick different free-text `heuristic_tag` values for a friction outside the 15 hardcoded patterns**
- Target: `scripts/assemble-run.mjs issueKey()` fallback path
- Note: downgraded from claimed MAJOR — this is a disclosed, deliberate residual (spec F104, cause (b), explicitly adjudicated across CR1-CR9), not a hidden defect. The real fixable gap found: `render-report.mjs`'s Validity Envelope omits this disclosed cause (folded into M5 above).
- Fix: none required for the merge mechanism itself (declined by design); see M5 for the actual actionable gap.

**Mi2 — Zero live-execution test coverage for `structural-scan.mjs` itself (all 44 structural tests are fixture-driven, none spawn a live Playwright/axe run)**
- Target: `test/acceptance-0002.test.mjs` + `test/fixtures/structural-*.json`
- Note: downgraded from claimed MAJOR — this is explicitly self-disclosed as a known v2 residual in `docs/specs/0002-structural-ui-lane.spec.md` (line ~352, CR3-M13/CR4-B1/B2), not a silently hidden gap. It is the direct cause of why M6 (invalid-selector false positive) went undetected by the test suite.
- Fix: add a dedicated live-execution test spinning up a local fixture server + real Playwright/axe run against `structural-scan.mjs`, tracked as the already-named v2 work item.

---

## 3) CLAIMS TESTED — held vs. broke

### Held under adversarial reproduction (11)
- Whether `action_cost` in `crawl.mjs` is a real measurement (not hardcoded) — HELD, though M4 shows the below-fold sub-measurement within it is wrong.
- `convergence_tier` arithmetic (`c.personas.size`) correctly equals distinct-persona count *once a cluster is correctly formed* — HELD (the clustering upstream of it is what breaks, per B1/B2).
- `report-gate.mjs` genuinely rejects a raw `$19/seat` WTP claim when it actually sees unscrubbed text — HELD (narrow claim; B3 shows it never sees that text in the real pipeline).
- `free-tier-user`'s full 9-finding ledger holds up against `trace.json` and the planted `server.mjs` frictions — HELD; this lane is NOT uniformly fabricated (contrast with B4's other two personas).
- S17 axe critical-impact severity enum mapping — HELD on the canonical-case input (broken only on case variants, B6).
- S50 `finding_id` raw-UUID rejection — HELD.
- S22 lane discriminator on isolated, non-confounded fixtures — HELD on both structural gates.
- Reverse direction (`structural-report-gate.mjs`/`structural-ci-diff.mjs` rejecting a real persona bundle) — HELD, with named diagnostics.
- The built S12 main-content logic is faithful to the frozen spec text; the text-fallback removal was a deliberate documented spec decision, not an accidental regression — HELD (separately, M6 shows the *shipped behavior* still produces a false positive on legitimate misuse input, which is a real gap even though it's spec-compliant).
- The crawl layer drives a real, deterministic browser — HELD.
- `assemble-run.mjs → report-gate.mjs → render-report.mjs` is fully mechanical and byte-reproducible — HELD (the *content* it processes is what's compromised, per B1-B5).

### Broke under reproduction
Every BLOCKER and MAJOR item in section 2 is a claim that broke, most importantly the three named in the verdict: gate-catches-WTP-and-blocks (B3), real-end-to-end (M11), both-lanes-tested (M10). Also broken: "the combined report reflects real crawled content" (B4, M6-M9), "duplicate/unrelated findings can't slip through the merge" (B1, B2), "a missing field can't silently bypass BLOCKED disclosure" (B8), "case variants can't bypass severity mapping" (B6).

---

## 4) REJECTED attacks

None. Every attack submitted for adversarial reproduction against the live repo either (a) reproduced a real, evidence-backed defect, or (b) reproduced a real, evidence-backed working mechanism (HELD). Zero attacks were speculative, unfalsifiable, or failed to reproduce. This is itself worth flagging: it means the attack surface chosen was well-targeted, not padded with throwaway hypotheses — but it also means none of the theater claims get a pass on "well, that attack was overreaching."

---

## 5) Honest bottom line

**Genuinely verified, not theater:**
- The browser-driven crawl (`crawl.mjs`) is real and deterministic.
- The assembly/gate/render mechanical chain is byte-reproducible.
- Several structural gate checks (S17 canonical case, S50, S22 in isolation) fire correctly and with named diagnostics.
- At least one full persona ledger (`free-tier-user`, 9 findings) is genuinely grounded in captured evidence — the pipeline is not uniformly fabricating content.
- `report-gate.mjs`'s WTP detector genuinely works *on the text it's given*.

**Overclaimed / theater:**
- The signature safety-mechanism story — "the gate caught a real WTP violation and blocked the run" — is false. The gate was never in the real pipeline's call path; a separate silent regex did the redaction with zero logging, and nothing was ever blocked.
- "Real end-to-end demo" overstates what shipped: the documented orchestrator entry point is a stub, and the actual run used hand-wired, untested glue code.
- "Both lanes tested" overstates `npm test`: it silently covers only one of two lane test suites, with no CI to catch drift.
- The founder-facing combined report contains at least one fabricated finding (invalid-selector artifact, not a real defect) presented at the same severity/credibility as a genuine WCAG violation, and the report itself has no generator — its correctness depends on manual transcription, which is exactly why the fabrication went undetected.
- The convergence/severity machinery (which is supposed to be the trust signal — "N personas independently agree") can both under-merge real convergent findings (B1) and over-merge unrelated ones into fake convergence (B2), and — most seriously — has zero grounding check, so two independent hallucinations about a page nobody crawled can produce a `convergence_tier=2`, CI-blocking severity-4 finding (B5).

Net: the DONE_VERIFIED claims about *mechanical plumbing* were honest. The DONE_VERIFIED claims about *the safety net protecting the founder from bad output* were not — the safety net exists as tested code but was disconnected from the path that produced what the founder actually saw.
