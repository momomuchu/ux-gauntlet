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

// R2 items 3/11 + R3 M2 — the ONE canonical target_element_identifier normalizer, used EVERYWHERE
// identity is compared (clusterKey in assemble-run.mjs and tupleKey below). Two personas naming the SAME
// element must produce the SAME normalized key regardless of surrounding whitespace, internal whitespace
// runs, letter case, whitespace ADJACENT TO A SEPARATOR ("signup:cta" == "signup: cta" == "signup : cta"),
// or a trailing punctuation mark. Steps, in order:
//   1. trim surrounding whitespace, lowercase,
//   2. collapse whitespace adjacent to ANY punctuation/symbol separator so the separator and its operands
//      touch ("signup : cta" -> "signup:cta") — R3 M2: the prior build only collapsed whitespace RUNS,
//      so a single space around the ':' separator ("signup: cta") under-merged vs "signup:cta",
//   3. collapse every remaining internal whitespace run to a single space ("signup  button" == "signup button"),
//   4. strip trailing punctuation/symbols ("landing:cta." == "landing:cta").
// A null/absent identifier normalizes to '' (the caller treats '' as "no element identifier").
export function normalizeTei(t) {
  if (t == null) return '';
  let s = String(t).trim().toLowerCase();
  s = s.replace(/\s*([\p{P}\p{S}])\s*/gu, '$1'); // R3 M2: fold whitespace touching a separator into the separator
  s = s.replace(/\s+/g, ' ');                    // collapse remaining internal whitespace runs
  s = s.replace(/[\p{P}\p{S}]+$/u, '').trim();   // strip trailing punctuation/symbols
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
