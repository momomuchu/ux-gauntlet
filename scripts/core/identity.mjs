// core/identity.mjs — PURE finding-identity hash + dedup tuple (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic (sha256 is pure).
import { createHash } from 'node:crypto';

// A shape-valid finding_id: the fid- prefix plus exactly 16 lowercase hex chars (F165).
export const HEX_FINDING_ID = /^fid-[0-9a-f]{16}$/;

// F165 normative formula: 'fid-' + sha256(heuristic_tag|step|target_element_identifier).hex[:16].
export function findingId(tag, step, tei) {
  return 'fid-' + createHash('sha256').update(`${tag}|${step}|${tei}`).digest('hex').slice(0, 16);
}

// The F45/F92 dedup identity tuple key for a finding record. target_selector is the F103 fallback.
export function tupleKey(f) {
  const id = f.target_element_identifier || f.target_selector || '';
  return `${f.heuristic_tag}|${f.step}|${id}`;
}

// The target-element identifier feeding the identity tuple (F103 fallback to target_selector).
export function teiOf(f) {
  return f.target_element_identifier || f.target_selector;
}
