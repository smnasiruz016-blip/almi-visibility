/**
 * 🔴 RR-281 · THE LINK GUARD — a page never cites a fact through a link the fact was not verified at.
 *
 * beta-g's decision of 17 Oct 2026 (RR-281 A, on CC's RR-279 proposal): the build FAILS for a page when, for any claim on it,
 *   1  its fact is rechecked against a link other than the one the page shows for that claim (LINK_DIFFERS) — RR-279: fact ahpra-2026
 *      was rechecked at a regulator's web page while its eight pages linked the PDF its quotation lives in, so the recheck could never
 *      reach CURRENT; or
 *   2  none of its fact's recorded word-for-word quotations is found, word for word, in a stored text of the link the page shows
 *      (QUOTE_NOT_IN_LINKED_TEXT) — a fact with no recorded quotation, or a link with no stored text, fails too: nothing is assumed.
 * The facts are the batch's own, read by the one rule the recheck uses (src/facts/batch-facts.mjs); a quotation is matched by the one
 * rule the recheck uses (src/facts/source-reader.mjs quotationIn). A stored text is a READ record's text — the caller joins the private
 * texts (src/facts/private-texts.mjs) first. Pure: records in, a verdict out. It names no client, host or batch.
 */
import { batchFacts } from "./batch-facts.mjs";
import { quotationIn } from "./source-reader.mjs";
import { isBarred } from "./licence-guard.mjs";

export const LINK_GUARD = Object.freeze({ LINK_DIFFERS: "LINK_DIFFERS", QUOTE_NOT_IN_LINKED_TEXT: "QUOTE_NOT_IN_LINKED_TEXT" });

/* RR-288: a link whose licence forbids storing its words (barred, src/facts/licence-guard.mjs) holds no stored text by design — its claim stands
 * on the link check alone and is listed by name as checked by link only; it is never matched against words the engine may not keep */
export function linkGuard({ drafts, findings = [], registry = { facts: [] }, intervals = [], reads = [], barred = new Set() }) {
  const factOf = new Map();
  for (const f of batchFacts({ drafts, findings, registry, intervals })) for (const c of f.claims) factOf.set(c, f);
  const texts = new Map();
  for (const r of reads ?? []) if (r?.state === "READ" && typeof r.text === "string" && typeof r.url === "string") texts.set(r.url, [...(texts.get(r.url) ?? []), r.text]);
  const refused = [], linkOnly = [];
  let claims = 0;
  for (const p of drafts?.pages ?? []) {
    const page = Object.values(p.combination ?? {}).map(String).sort().join("+");
    for (const n of p.needs ?? []) for (const c of n.answer?.claims ?? []) {
      claims += 1;
      const f = factOf.get(c.claimId) ?? null, link = c.source?.link ?? null;
      if (!f || f.link !== link) { refused.push(Object.freeze({ page, claimId: c.claimId, factId: f?.factId ?? null, code: LINK_GUARD.LINK_DIFFERS, pageLink: link, factLink: f?.link ?? null })); continue; }
      if (isBarred(barred, link)) { linkOnly.push(Object.freeze({ page, claimId: c.claimId, factId: f.factId, link })); continue; }
      const found = (texts.get(link) ?? []).some((t) => f.quotations.some((q) => quotationIn(q, t)));
      if (!found) refused.push(Object.freeze({ page, claimId: c.claimId, factId: f.factId, code: LINK_GUARD.QUOTE_NOT_IN_LINKED_TEXT, pageLink: link, quotations: f.quotations.length, storedTexts: (texts.get(link) ?? []).length }));
    }
  }
  return Object.freeze({ claims, refused: Object.freeze(refused), linkOnly: Object.freeze(linkOnly) });
}
