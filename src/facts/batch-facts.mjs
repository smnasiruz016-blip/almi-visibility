/**
 * 🔴 F44 Amendment 2 (RR-268) · THE FACTS A RESEARCH BATCH'S PAGES USE, as the source reader rechecks them (C11). Pure: it reads the
 * batch's own files as they are handed in and names no product, client, exam or host.
 *
 * A fact is one of:
 *   · a record of the batch's fact registry (`facts`), named by a finding of a claim on a page (finding.factId);
 *   · a claim whose finding names no registry record — one fact per (source link, claim text), its id `claim:<first claimId>`.
 * Its pages are every page whose claims it supports. Its recorded word-for-word quotations are the spans its record puts between straight
 * double quotation marks (the registry's `whatSupportsIt`, else the finding's) — a span shorter than QUOTATION_MIN_CHARS is not one.
 * A record that quotes nothing has no quotation, and the recheck can only REJECT it, named. Nothing here is rewritten.
 */
export const QUOTATION_MIN_CHARS = 8;
const QUOTED = new RegExp(`"([^"]{${QUOTATION_MIN_CHARS},})"`, "g");
/** The recorded word-for-word quotations in a record's text. */
export const quotationsOf = (text) => [...String(text ?? "").matchAll(QUOTED)].map((m) => m[1]);

export function batchFacts({ drafts, findings = [], registry = { facts: [] }, intervals = [] }) {
  const findingOf = new Map(findings.map((f) => [f.claimId, f]));
  const factOf = new Map((registry?.facts ?? []).map((f) => [f.factId, f]));
  const recheckOf = new Map(intervals.map((r) => [r.claimId, r.recheckDays]));
  const out = new Map();
  for (const p of drafts?.pages ?? []) {
    const page = Object.values(p.combination ?? {}).map(String).sort().join("+");
    for (const n of p.needs ?? []) for (const c of n.answer?.claims ?? []) {
      const f = findingOf.get(c.claimId);
      const reg = f?.factId ? factOf.get(f.factId) : null;
      const id = reg ? reg.factId : `claim:${c.source?.link ?? ""}|${c.text}`;
      if (!out.has(id)) out.set(id, reg
        ? { factId: reg.factId, link: reg.link, quotations: quotationsOf(reg.whatSupportsIt), readOn: reg.readOn ?? null, recheckDays: Number.isInteger(reg.recheckDays) ? reg.recheckDays : recheckOf.get(c.claimId) ?? null, pages: new Set(), claims: new Set() }
        : { factId: `claim:${c.claimId}`, link: c.source?.link ?? null, quotations: quotationsOf(f?.whatSupportsIt), readOn: c.source?.readOn ?? null, recheckDays: recheckOf.get(c.claimId) ?? null, pages: new Set(), claims: new Set() });
      out.get(id).pages.add(page);
      out.get(id).claims.add(c.claimId);
    }
  }
  return [...out.values()].map((x) => Object.freeze({ ...x, pages: Object.freeze([...x.pages].sort()), claims: Object.freeze([...x.claims].sort()), quotations: Object.freeze(x.quotations) }));
}
