# CHALLENGE-BUILT-SYSTEM — Round 3 re-verification (against commit 73d770a)

Evidence-first. Every CONFIRMED item was independently reproduced this pass (real command run against `/Users/maache/ux-gauntlet` at HEAD `73d770a`, output observed) unless the rationale says otherwise. This supersedes the prior draft of this file. Note on filename: this is the third challenge pass; the file is still named `-R2.md` for path continuity (see §5, item on commit provenance — the round-3 commit itself cites this exact path as its evidence file, so the path is kept stable).

---

## 1. CONVERGENCE VERDICT

**Round 1: 9 BLOCKER / 11 MAJOR / 2 MINOR (22 confirmed).**
**Round 3 (this pass): 6 BLOCKER / 8 MAJOR / 5 MINOR (19 confirmed)** + 9 claims independently re-verified as holding cleanly + 0 rejected.

Total confirmed defects: 22 → 19 (net -3). BLOCKER: 9 → 6 (net -3). **Verdict: partially converging, still leaking theater** — improvement is real but concentrated in the exact spots that were directly probed by name in prior rounds; every other surface that got a *new* adversarial angle this round produced a fresh BLOCKER or MAJOR.

Evidence for "partially converging":
- The 9 HELD items are genuine, adversarially-stress-tested holds (concurrent port stress, ZWSP-adjacent padding, cross-lane feed attacks with mutated discriminators, a real end-to-end crawl branch). These are not softballs — several were re-probed harder than their original claim and still held. Real fix work happened.
- 3 of the 6 BLOCKERs were found by directly re-attacking a named prior fix (`fixes-held` lens: ZWSP variant of the already-"fixed" whitespace normalizer; trace grounding that still never reads the DOM data it captures; a lane-discriminator "fix" that reopens the exact round-2/MI3 BLOCKER in an *easier*-to-trigger form). That is the textbook definition of whack-a-mole: the literal repro from a prior round no longer reproduces, but the invariant behind it was never actually established.

Evidence for "still leaking theater":
- **One root cause, found twice, independently, by two different lenses.** `scripts/core/lane.mjs assertLane()`'s omitted-`lane` bypass was rediscovered both by re-verifying `report-gate.mjs`'s specific claim (`claim-reverify` lens) and by auditing round-3's own commit message against its diff (`honesty-audit` lens). Two unrelated probing strategies converged on the same hole — strong signal it's real, not an artifact of one lane's framing.
- **One cluster dominates the defect list.** `scripts/assemble-run.mjs`'s `pageOf()`/`grounded()` heuristic — a single ~15-line function — is the root cause of 5 of the 19 confirmed findings (fabricates convergence on free-text identifiers, drops legitimate findings on ordinary prose colons, drops on CSS-pseudo-class colons, drops on redirect/vanity-URL routes, and never cross-checks the real `actionables` DOM data `crawl.mjs` already captures for this exact purpose). Each was patched-around individually in earlier rounds (per the `identity.mjs`/`lane.mjs` fix history); none of the patches touched the shared function that produces all five symptoms.
- **`normalizeTei()`'s trailing-punctuation strip was independently reproduced twice, at two severities** (MINOR on a structured `data-testid:` string, MAJOR on human-readable label text ending in `!`). Same code, same root cause (`/[\p{P}\p{S}]+$/u` strip is unscoped), confirmed by two separate agents attacking it from different angles — again, convergent evidence of a real, not incidental, invariant gap.
- **A 5th, previously-unaudited gate (`combined-report.mjs`, the script that renders the actual composed founder-facing artifact) has *zero* lane validation** — never had any, isn't covered by the 18-test orchestration suite that locks the other 4 gates. This is the same failure class (M9: lane confusion) the trust boundary was explicitly built to prevent, just in a script nobody had pointed a test at yet.
- **Round-3's own commit message is not fully backed by what's on disk**: it cites this exact file as the "Round-3 report" but the committed diff never touched it (evidence file existed only as an uncommitted working-tree edit at the time of audit), and it claims a "19/19 consecutive green" figure for the live suite that appears nowhere in any committed run log, artifact, or test count (the suite has 9 tests, not 19). The underlying non-flakiness claim IS true (re-verified 6 sequential + 3 concurrent runs, 9/9 every time) — the specific number is just unsourced.

Net read: this round's fixes did real, verifiable work on the specific repros named in round 2/prior R3 items — that work should not be discounted. But every dimension that got a genuinely new probe (a different Unicode class, a different identifier shape, a different script entry point, the commit's own paper trail) found a live defect. The system is converging on named repros faster than it is converging on the invariants those repros were symptoms of.

---

## 2. CONFIRMED defects, BLOCKER → MINOR

Format: `[severity] title — target — repro (1-line) — fix (1-line)`. Full repro commands/fix diffs are in the source findings; this is the terse index.

### BLOCKER (6)

1. **ZWSP-variant `target_element_identifier` defeats clustering AND report-gate's dedup backstop** — `scripts/core/identity.mjs normalizeTei()` + `scripts/assemble-run.mjs` + `scripts/report-gate.mjs` F45/F46 — 2 personas, same finding, teis differ only by a U+200B zero-width space around a colon → 2 separate tier-1 findings ship, gate PASS. `\s`/`.trim()` don't match Cf-category chars. **Fix:** strip `\p{Cf}` before whitespace-folding in `normalizeTei()`; single-file fix covers both clustering and the "independent" gate backstop since both call the same function.

2. **Grounding never checks the real captured DOM data (`actionables`) it exists to check against** — `scripts/assemble-run.mjs grounded()` — fabricated `data-testid:...` and bare colon-less identifiers citing a real step both ship as grounded findings; `grep -n actionables scripts/*.mjs` returns nothing even though `crawl.mjs` captures per-step actionables specifically for this. **Fix:** in `grounded()`, require the parsed element token to match a captured `actionables[].tag/text/href` entry for the cited step; drop selector-strategy/colon-less exemption.

3. **Free-text (no-colon) `target_element_identifier` fabricates cross-persona convergence** — `scripts/assemble-run.mjs` clustering — 2 personas, unrelated frictions, identical free-text tei ("the continue button") → merges into one tier-2 finding, `0 ungrounded dropped` reported (actively false). **Fix:** route non-page-prefixed free-text teis through the same unique-per-finding key used for the no-tei case instead of literal-string clustering.

4. **Ordinary narrative colon punctuation ("Modal: submit button") silently zeroes a real severity-4 finding** — `scripts/assemble-run.mjs pageOf()` (case-insensitive `^([a-z0-9-]+):` prefix parse) — a legit, on-trace, corroborated finding drops to `findings:0`, `run_status:"completed"`, only trace is one stderr line. **Fix:** make `pageOf()` case-sensitive (verified against repo's existing lowercase-only page-prefix fixtures; `npm test` 155/155 unaffected after patch).

5. **`report-gate.mjs` silently PASSES a fully axe-marked, WCAG-critical structural bundle when only the `lane` field is dropped** — `scripts/core/lane.mjs assertLane()` — R3's fix (commit 73d770a, "M15/MI3") deleted the multi-marker shape-sniffer entirely in favor of a bare `lane==='persona'||undefined` check; drops 1 field (not ~6 markers as round-2 assumed) to bypass. **Fix:** reinstate shape-fallback keyed on axe-source markers (`source==='axe'`, `code` prefix `axe:`, `violation_ids` array, `axe_version`), excluding the lone `impact`-field trigger that caused the original false positive being "fixed."

6. **Same root cause as #5, found independently via commit-message audit** — round-3's commit body claims a hardened lane discriminator; the diff shows the shape-sniffer was deleted, not hardened, and the pre-existing `.swe-spec` doc's own recommendation ("comment-only fix, not realistic to bypass") was overridden by a change that made the bypass strictly easier. Two lanes (`claim-reverify`, `honesty-audit`) hit the identical hole independently — treat as one root cause with two confirmations, not two separate defects, when prioritizing the fix above.

### MAJOR (8)

7. **WTP idiom detector misses the `"I'd (happily/gladly) pay"` contraction family** — `scripts/core/claims.mjs WTP_RE` — requires literal "would", not "'d"; 3 contraction-phrased narratives return `[]` (missed), ship through `report-gate PASS`. **Fix:** extend regex alternative to `(?:would|\w+'d)\s+(?:gladly\s+|happily\s+)?pay`.

8. **`test/acceptance-live.test.mjs` tests 1–5 pass against a total no-browser, no-axe stub** — swapping `structural-scan.mjs` for a 54-line stub that pattern-matches on the test file's own literal argv strings, reusing only 2 public helpers to satisfy shape checks, still passes 5/5 including the "anti-theater" negative control. Zero browsers launched. **Fix:** parameterize the staging fixture's main-content text and negative-control string with a per-run random nonce so a literal-string stub can't guess them; tie one assertion to a selector that only real axe execution would produce.

9. **`combined-report.mjs` (the actual founder-facing composed report generator) has zero lane validation** — swapped `--persona`/`--structural` file args → exits 0, renders structural axe findings under "🎭 Persona friction" as "flagged by 0/0", no error, `grep -n assertLane` returns nothing, `grep -rl combined-report test/` returns nothing (untested). Same failure class (M9) the lane trust boundary exists to prevent, in the one script producing the real deliverable. **Fix:** import and call `assertLane()` on both inputs before rendering; exit 1 + no output file on mismatch.

10. **Trailing-punctuation stripping in `normalizeTei()` over-merges two different elements when the trailing char is part of the visible label** — `scripts/core/identity.mjs` step 4 (`/[\p{P}\p{S}]+$/u` strip) — a hero CTA reading "Sign up!" and an unrelated link reading "Sign up" collide into one fabricated tier-2 finding. (Independently reproduced a second time at MINOR severity on a narrower, structured-selector variant — see MINOR #16.) **Fix:** scope the strip to a narrow sentence-terminator allowlist (e.g. only trailing `.`) instead of all `\p{P}\p{S}`.

11. **Grounding false-drops legit findings using colon syntax that isn't a page prefix (CSS pseudo-class style, e.g. `"button:disabled"`)** — `scripts/assemble-run.mjs pageOf()`/`SELECTOR_STRATEGIES` allowlist — 2 corroborating personas both dropped, `findings:[]`, `run_status:"completed"`. **Fix:** extend `SELECTOR_STRATEGIES` with bare HTML tag names + common pseudo-class/state words.

12. **Grounding false-drops a legitimately-visited page when the link's semantic name diverges from the final post-redirect URL segment** — `scripts/assemble-run.mjs grounded()` — route grounding is literal-URL-segment-only (R3 M7 removed the free-text fallback); a "Sign up" link that redirects to `/onboarding/step-1` never grounds because "signup" never appears as a literal path segment. **Fix:** additionally harvest path segments from each step's captured `actionables[].href` (real DOM evidence `crawl.mjs` already records), not free-text label words.

13. **Round-3 commit cites this exact report file as evidence of a FROZEN/converged state; the diff never touched it** — `git show 73d770a --stat -- .swe-spec/` empty; `git log -- .swe-spec/CHALLENGE-BUILT-SYSTEM-R2.md` shows only the round-2 authoring commit. Anyone auditing 73d770a in isolation finds the cited file contradicting the commit's headline claim. **Fix:** commit the round-3 report content in a follow-up commit (this write closes that gap for the current pass).

14. **`render-report.mjs`'s "gate" (M11 fix) is shape-only — semantically fabricated content still renders cleanly** — `scripts/core/schema-validate.mjs validatePersonaBundle()` never calls `forbiddenClaims()` (`core/claims.mjs`) or any dedup check; a hand-built bundle with a fabricated "80% would pay $20/month" claim and a byte-identical unmerged duplicate finding renders to a clean HTML report, exit 0. Disclosed in-code as "shape/lane gate, not the full report-gate.mjs run" but the round-3 commit message doesn't carry that caveat. **Fix:** call `forbiddenClaims()` and the F45/F46 dedup check (extracted to a shared module) before rendering; refuse with exit 1 on violation.

### MINOR (5)

15. **R3's child-process reap doesn't (can't) survive `SIGKILL` of the worker** — `test/acceptance-live.test.mjs` reap handlers — `kill -9` on the worker orphans `staging-demo/server.mjs`, still `LISTEN`ing; matches pre-existing orphaned processes independently observed on the dev machine. Doc comment is precise about SIGINT/SIGTERM and even name-checks this exact prior failure mode, so this is a coverage gap, not a false claim. **Fix:** add a `pkill -9 -f <server-src>` best-effort sweep in `before()`.

16. **Same `normalizeTei()` trailing-punctuation bug as MAJOR #10, narrower trigger** — structured `data-testid:cta-signup` vs `data-testid:cta-signup.` (unrelated severities) merges into one finding, higher-severity narrative wins representative status. Narrower/less realistic input space than #10 (structured selector strings vs. natural-language labels), hence MINOR not MAJOR for this specific shape — same root cause, same fix.

17. **CLAIM-HELD with a coverage caveat: the literal no-tei case genuinely never merges (even adversarially), but the fix's real coverage is narrower than its framing implies** — two personas, byte-identical narrative, no `target_element_identifier` at all → stays tier-1, correct ungrounded warning fires, matches the 9/9 live-suite result exactly. The gap: this only closes the *field-absent* slice; free-text-non-empty (BLOCKER #3) and colon-bearing-prose (BLOCKER #4) slices — arguably more realistic LLM output shapes — are untouched by this specific fix.

18. **Reported test totals undercount current HEAD** — `npm test` at 73d770a is 155/155 (93+44+18), not the previously-cited 137/137; `npm run test:live` is 9/9, not 7/7. Both undercounts stem from a suite (`acceptance-orchestration.test.mjs`, 18 tests) and two live tests added in the same commit whose totals weren't regenerated post-commit. No functional regression — a reporting-hygiene gap only.

19. **"19/19 consecutive green" in the round-3 commit message is unsourced** — repo-wide grep for the literal string returns zero hits outside the commit message; the live suite has 9 top-level tests. Direction of the claim (non-flaky) is independently re-verified true (6 sequential + 3 concurrent runs, 9/9 every time, ephemeral-port fix at `server.mjs:10` confirmed working under concurrency) — only the specific number is untraceable to any evidence artifact.

---

## 3. CLAIMS RE-VERIFIED — held vs broke

**Held cleanly under adversarial re-probing (9):**

| Claim | Target | How it was stressed |
|---|---|---|
| Impact case/whitespace normalization | `structural-severity.mjs canonicalImpact()`/`isValidImpact()` | Adversarial padding incl. invisible ZWSP, null |
| Live suite catches its named regression (M6 main-content fallback) | `acceptance-live.test.mjs` test 2 | Re-run against a real regressed `structural-scan.mjs` |
| Ephemeral-port allocation + normal-path reap | `acceptance-live.test.mjs` before/after (M16/M10) | Concurrent stress (3-way simultaneous runs) |
| Test 1's axe assertions are grounded in real planted defects | `acceptance-live.test.mjs` test 1 vs `staging-demo/server.mjs` | Verified defects are genuinely present in fixture, not arbitrary strings |
| Cross-lane feed attacks across all 4 named gates | `report-gate.mjs`, `ci-diff.mjs`, `structural-report-gate.mjs`, `structural-ci-diff.mjs` via `core/lane.mjs` | Case-mutated discriminator, explicit cross-lane feeds |
| Real-crawl branch runs end-to-end without crashing | `run-gauntlet.mjs` live-crawl → `crawl.mjs` → `assemble-run.mjs --write` | Full manual completion into a gated `findings.json` |
| Legit lane-omitted persona bundle is accepted (not falsely rejected) | `core/lane.mjs assertLane()` | Confirms the safe-default direction of the fix still works even though the *unsafe* direction (BLOCKER #5/#6) reopened |
| `structural-ci-diff.mjs` null/missing-impact fail-closed (M1) | `structural-ci-diff.mjs` | Freshly-mutated real fixture |
| Persona-LLM `tei` residual dependency is real, not theater | `crawl.mjs` | Confirmed zero code path emits `target_element_identifier` — the disclosed dependency on hand-curated/external LLM data is genuine, not a hedge |

**Broke under re-verification (3 of the 6 BLOCKERs are direct re-attacks on a named prior fix — see §2 items 1, 2, 6):** the ZWSP variant of the whitespace normalizer, the trace-grounding "structural clustering" claim (never reads the DOM evidence it has), and the lane-discriminator hardening (deleted the shape check instead of hardening it). All three are cases where the *literal* prior repro no longer reproduces but the underlying invariant was never established, so a different input in the same class still breaks it.

**Rejected (0):** no reviewer claim was rejected as a measurement artifact this pass (contrast with the prior round's one rejection) — every claim brought forward this round reproduced.

---

## 4. Persona-LLM residual verdict — real blocker or acceptably disclosed?

**Real blocker for real runs, not acceptably disclosed as-is.** Breakdown:

- The narrow shape the shipped fix explicitly targets (`target_element_identifier` field literally absent) **genuinely holds**, including under an adversarial byte-identical-narrative attempt to trigger a hidden text-similarity fallback (§2 item 17 / HELD table). This is real, verified work — not theater.
- But that shape is the *least* likely one an unguided LLM persona actually produces. Nothing in `schemas/findings.schema.json` (`target_element_identifier` is a bare `{"type":"string"}`), `personas/*.yaml`, or `SKILL.md` specifies or nudges toward a `page:selector` convention. The two more-realistic shapes — free text with no colon (BLOCKER #3, fabricates convergence) and ordinary narrative prose that happens to contain a colon (BLOCKER #4, silently drops a real finding) — are both live, both reproduced end-to-end through the real pipeline with `--write`, both exit 0 with no error signal in the persisted output.
- Severity split matters here: BLOCKER #3 (fabricated corroboration) is the worse of the two because it *manufactures* false signal that looks identical to genuine convergence (real hex `finding_id`, `convergence_tier:2`) — a report consumer has no way to distinguish it from a real finding without re-deriving the pipeline's internal logic. BLOCKER #4 (silent drop) is bad but at least fails toward under-reporting rather than fabrication.
- Verdict for production trust: **do not treat `target_element_identifier` as reliably grounded input from an LLM persona today.** The field-absent case is closed; the two more-common non-conforming shapes are not, and the pipeline gives zero downstream signal (no low-confidence flag, no drop-count in the returned bundle) when they occur. This is squarely a persona-LLM-residual blocker, not an edge case to disclose-and-ship.

---

## 5. Honest bottom line

Real fix work happened and it's verifiable: BLOCKER count dropped 9→6, 9 claims held under harder adversarial pressure than their original framing (including full concurrent-stress and cross-lane attack testing), and one reviewer-style self-check killed a false positive in the prior round. This is not a system standing still.

But it is not converged, and the round-3 commit message oversold it. The clearest tell: the *specific* mechanism built and explicitly described as the fix for last round's named BLOCKER (the lane-discriminator hardening) was found, independently, by two different probing strategies, to have reopened that exact BLOCKER in an easier-to-trigger form — 1 field dropped instead of ~6 markers stripped. That is not a coincidence of hard luck; it is what happens when a fix closes the literal reported repro without re-establishing the invariant behind it. The same pattern repeats at smaller scale in `assemble-run.mjs`'s grounding heuristic (one function, five confirmed symptoms, no shared fix) and in `normalizeTei()`'s punctuation handling (same bug, found twice, two severities).

Process note, not a code defect: the round-3 commit cites this file as its own frozen evidence and the commit's diff never touched it — this write is what actually closes that gap. Treat future round completions as unverified until the report they cite is confirmed present in the same commit.

**State: PARTIAL.** 6 BLOCKER-severity defects remain open (2 are one root cause found twice — net 5 distinct root causes: ZWSP normalization, grounding/DOM-check absence, lane-discriminator omission, plus the two grounding-fabrication/drop pairs already counted in the cluster). None of the 6 are safe to ship past without a fix. Residual risk concentrated in `scripts/assemble-run.mjs` (grounding heuristic) and `scripts/core/lane.mjs` (trust boundary) — both single-function, multi-symptom root causes with clear, scoped fix directives given in §2.
