/**
 * 🔴 F17 · F58 · F64 · F69 (acceptances _handoffs AlmiVisibility_F17/F58/F64/F69_ACCEPTANCE_2026-10-19.md, RR-291) — pure rules over stored
 * records only; nothing fetched or searched.
 *   F17 · FOLLOW-UPS: after a page that answers need A, the needs of the SAME declared combination that other pages answer are the follow-ups
 *         people may still have — INFERRED, each naming the two coverage records it is inferred from. An OBSERVED next-question sequence is its
 *         own kind (source, date, bound), never counted with them. A competitor's absence alone never makes an opportunity.
 *   F58 · COMPETITORS only from the client's declaration or from stored OBSERVED result surfaces, each with its source; a query's difficulty is
 *         INFERRED, with its method named; a coverage gap only where a stored observation shows the competitor's page.
 *   F64 · NAME / ADDRESS / PHONE from the client's own pages (and files it supplies): each value with its source; a field with more than one
 *         value is a mismatch naming both sources; no address anywhere is NOT APPLICABLE for the address, by name.
 *   F69 · BENCHMARK only over declared competitors with stored evidence; fewer than 3 prints "no benchmark".
 * Generic: it names no client, product or host.
 */
export const INFERRED = "INFERRED";
export const OBSERVED_SEQUENCE = "OBSERVED_NEXT_QUESTION_SEQUENCE";
const present = (v) => typeof v === "string" && v.trim() !== "";
const comboKey = (c) => JSON.stringify(Object.entries(c ?? {}).sort());

/* ── F17 ── */
/** Follow-ups inferred from the latest coverage records: same combination, answered by a DIFFERENT page. */
export function inferFollowUps(coverageRows) {
  const latest = new Map();
  for (const r of coverageRows) if (r?.needId) latest.set(r.needId, r);
  const byCombo = new Map();
  for (const r of latest.values()) { const k = comboKey(r.combination); if (!byCombo.has(k)) byCombo.set(k, []); byCombo.get(k).push(r); }
  const out = [];
  for (const group of byCombo.values()) for (const a of group) {
    const pagesA = new Set((a.pages ?? []).map((p) => p.pageId));
    if (!pagesA.size) continue;
    for (const b of group) {
      if (a === b) continue;
      const pagesB = (b.pages ?? []).map((p) => p.pageId);
      /* answered on the same page: not a follow-up of that page */
      if (pagesB.some((p) => pagesA.has(p))) continue;
      /* answered on another page — or on NO page: then it is an INFORMATION GAP the reader still has */
      out.push(Object.freeze({ kind: INFERRED, after: a.needId, next: b.needId, answeredBy: pagesB[0] ?? null, gap: pagesB.length === 0, inferredFrom: Object.freeze([a.measurement_key, b.measurement_key]) }));
    }
  }
  return out;
}
/** An observed next-question sequence: kept only with its source, date and bound; refused otherwise. */
export function admitSequence(s) {
  const missing = ["source", "bound"].filter((f) => !present(s?.[f]));
  if (!/^\d{4}-\d{2}-\d{2}/.test(s?.date ?? "")) missing.push("date");
  if (!Array.isArray(s?.questions) || s.questions.length < 2) missing.push("questions (at least two, in order)");
  return missing.length ? Object.freeze({ state: "REFUSED", missing }) : Object.freeze({ state: "KEPT", sequence: Object.freeze({ kind: OBSERVED_SEQUENCE, ...s }) });
}
/** An opportunity needs the client's own need evidence; a gap resting only on a competitor's absence is dropped, named. */
export function opportunitiesOf(gaps) {
  return gaps.map((g) => (g.ownNeedEvidence && g.ownNeedEvidence.length ? { ...g, state: "OPPORTUNITY" } : { ...g, state: "DROPPED", reason: "a competitor's absence alone is never an opportunity" }));
}

/* ── F58 ── */
/** Competitors from the declaration and from OBSERVED result surfaces only, each with its source; an unsourced one refused. */
export function competitorsOf({ declared = [], observedSurfaces = [], ownDomains = [] }) {
  const own = new Set(ownDomains);
  const out = new Map(), refused = [];
  for (const c of declared) (present(c?.domain) && present(c?.source) ? out.set(c.domain, { domain: c.domain, source: c.source, from: "DECLARED" }) : refused.push({ competitor: c, reason: "NO_SOURCE" }));
  for (const s of observedSurfaces) if (s.state === "OBSERVED") for (const r of s.results ?? []) if (!own.has(r.domain) && !out.has(r.domain)) out.set(r.domain, { domain: r.domain, source: `answer_surface:${s.observation_id}`, from: "OBSERVED_RESULT_SURFACE" });
  return Object.freeze({ competitors: [...out.values()], refused });
}
/** A query's difficulty — INFERRED, never observed — by one named method: the more words, the more specific, the easier to reach. */
export const DIFFICULTY_METHOD = "INFERRED from the query's own words: 1 word HIGHER, 2–3 words MEDIUM, 4 or more LOWER (a more specific query has fewer competing pages); no search volume or rank is read";
export function inferDifficulty(query) {
  const n = String(query ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Object.freeze({ query, difficulty: n === 0 ? null : n === 1 ? "HIGHER" : n <= 3 ? "MEDIUM" : "LOWER", label: INFERRED, method: DIFFICULTY_METHOD });
}

/* ── F64 ── */
const JSONLD = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
/** The name, address and phone one of the client's own pages states — from its structured data and its tel: links — each with the page. */
export function napOf(html, source) {
  const out = [];
  for (const m of String(html ?? "").matchAll(JSONLD)) {
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    const walk = (v) => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (!v || typeof v !== "object") return;
      if (/^(Organization|LocalBusiness|EducationalOrganization|Corporation)$/.test(String(v["@type"] ?? ""))) {
        if (present(v.name)) out.push({ field: "name", value: v.name.trim(), source });
        if (present(v.telephone)) out.push({ field: "phone", value: v.telephone.replace(/[^\d+]/g, ""), source });
        if (v.address) out.push({ field: "address", value: typeof v.address === "string" ? v.address.trim() : [v.address.streetAddress, v.address.addressLocality, v.address.postalCode, v.address.addressCountry].filter(Boolean).join(", "), source });
      }
      Object.values(v).forEach(walk);
    };
    walk(j);
  }
  for (const m of String(html ?? "").matchAll(/href=["']tel:([^"']+)["']/gi)) out.push({ field: "phone", value: m[1].replace(/[^\d+]/g, ""), source });
  return out;
}
export function napConsistency(values) {
  const fields = ["name", "address", "phone"];
  const report = {};
  for (const f of fields) {
    const vs = values.filter((v) => v.field === f);
    const distinct = [...new Set(vs.map((v) => v.value.toLowerCase()))];
    report[f] = vs.length === 0 ? (f === "address" ? "NOT APPLICABLE — no address on any of the client's own pages or supplied listings" : "NOT STATED") : distinct.length === 1 ? { state: "CONSISTENT", value: vs[0].value, sources: vs.length } : { state: "MISMATCH", pairs: distinct.slice(1).map((d) => ({ a: vs.find((v) => v.value.toLowerCase() === distinct[0]), b: vs.find((v) => v.value.toLowerCase() === d) })) };
  }
  return report;
}

/* ── F69 ── */
export const BENCHMARK_AT = 3;
export function benchmark({ clientScore, peers = [] }) {
  const usable = peers.filter((p) => p.from === "DECLARED" && typeof p.score === "number" && present(p.evidence));
  if (usable.length < BENCHMARK_AT) return Object.freeze({ state: "NO_BENCHMARK", line: `no benchmark — ${usable.length} declared competitor(s) with stored evidence (at least ${BENCHMARK_AT} needed)`, sample: usable.length });
  const sorted = usable.map((p) => p.score).sort((a, b) => a - b);
  return Object.freeze({ state: "BENCHMARK", sample: usable.length, median: sorted[Math.floor(sorted.length / 2)], line: `client ${clientScore} beside ${usable.length} declared competitor(s) (median ${sorted[Math.floor(sorted.length / 2)]}); limits: only these peers, only their stored evidence, scored by the same checks` });
}
