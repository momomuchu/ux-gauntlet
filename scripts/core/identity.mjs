// core/identity.mjs — PURE finding-identity hash + dedup tuple (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic (sha256 is pure).
import { createHash } from 'node:crypto';

// A shape-valid finding_id: the fid- prefix plus exactly 16 lowercase hex chars (F165).
export const HEX_FINDING_ID = /^fid-[0-9a-f]{16}$/;

// F165 normative formula: 'fid-' + sha256(heuristic_tag|step|target_element_identifier).hex[:16].
// NOTE: the hash consumes the RAW tei verbatim (never normalizeTei'd) — the persisted finding_id is a
// byte-stable function of the literal stored field so report-gate can recompute it deterministically.
// Clustering/dedup identity uses normalizeTei (below); the persisted hash does not, by design.
export function findingId(tag, step, tei) {
  return 'fid-' + createHash('sha256').update(`${tag}|${step}|${tei}`).digest('hex').slice(0, 16);
}

// R4 ROOT 1 — the tei is a PURE OPAQUE cluster identifier. normalizeTei is the ONE canonical normalizer
// used EVERYWHERE identity is compared (clusterKey in assemble-run.mjs and tupleKey below). It is
// DECOUPLED from grounding: it never parses a colon into a "page", and it no longer strips trailing
// punctuation (that over-merged genuinely different labels — R4 MAJOR #10/#16: "Sign up!" vs "Sign up" —
// and punctuation is a real character difference on an opaque identifier, not an identity-folding artifact).
// Two personas naming the SAME element must produce the SAME normalized key regardless of surrounding
// whitespace, internal whitespace runs, letter case, whitespace ADJACENT TO A SEPARATOR
// ("signup:cta" == "signup: cta" == "signup : cta"), or INVISIBLE Unicode format characters
// (\p{Cf}: ZWSP U+200B, ZWNJ U+200C, ZWJ U+200D, BOM/ZWNBSP U+FEFF, LRM/RLM, SOFT HYPHEN U+00AD) that
// JS `\s` and String.trim() do NOT match — a copy/pasted or LLM-echoed "signup​:cta" with a zero-width
// space around the colon must fold to the SAME key as "signup:cta" (R4 ROOT 1 BLOCKER #1). Steps, in order:
//   1. lowercase,
//   2. STRIP all Unicode format/zero-width chars (\p{Cf}) — the ZWSP-variant clustering defeat,
//   3. trim surrounding whitespace,
//   4. collapse whitespace adjacent to ANY punctuation/symbol separator so the separator and its operands
//      touch ("signup : cta" -> "signup:cta") — R3 M2: the prior build only collapsed whitespace RUNS,
//      so a single space around the ':' separator ("signup: cta") under-merged vs "signup:cta",
//   5. collapse every remaining internal whitespace run to a single space ("signup  button" == "signup button").
// A null/absent identifier normalizes to '' (the caller treats '' as "no element identifier").
export function normalizeTei(t) {
  if (t == null) return '';
  let s = String(t).toLowerCase();
  s = s.replace(/\p{Cf}/gu, '');                 // R4 ROOT 1: strip zero-width/format chars \s and trim() miss
  s = s.trim();
  s = s.replace(/\s*([\p{P}\p{S}])\s*/gu, '$1'); // R3 M2: fold whitespace touching a separator into the separator
  s = s.replace(/\s+/g, ' ').trim();             // collapse remaining internal whitespace runs
  return s;
}

// The F45/F92 dedup identity tuple key for a finding record. target_selector is the F103 fallback.
// Keyed on (heuristic_tag, step, normalized-tei) — the full F45 3-tuple. normalizeTei makes report-gate
// independently CATCH a whitespace/case/trailing-punctuation under-merge that clustering should have
// collapsed (R2 items 3/11): two records that normalize to the same tuple but were left unmerged trip
// the F45/F46 dedup violation here.
export function tupleKey(f) {
  const raw = f.target_element_identifier || f.target_selector || '';
  return `${f.heuristic_tag}|${f.step}|${normalizeTei(raw)}`;
}

// The target-element identifier feeding the identity tuple (F103 fallback to target_selector).
export function teiOf(f) {
  return f.target_element_identifier || f.target_selector;
}
