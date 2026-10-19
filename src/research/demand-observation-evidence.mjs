/**
 * 🔴 F14 · DEMAND EVIDENCE RESEARCH (acceptance _handoffs AlmiVisibility_F14_ACCEPTANCE_2026-10-19.md, RR-291).
 *
 * Every demand observation a research batch stores, shown with where it came from and how sure we are: its METHOD, DATE, POPULATION,
 * LIMITATION and CONFIDENCE (C1); a public-search observation also with its SURFACE, ECOSYSTEM, COUNTRY, LANGUAGE, WINDOW, BOUND and
 * OBSERVED/INFERRED (C2). A field the record does not hold is NAMED as missing — never filled in. A new record missing a required field is
 * refused with the field named (C3). Pure: no read, no write.
 *
 * Generic: it names no client, product or host.
 */
export const FIELDS = Object.freeze(["method", "date", "population", "limitation", "confidence"]);
export const SEARCH_FIELDS = Object.freeze(["surface", "ecosystem", "country", "language", "window", "bound", "observedOrInferred"]);
const present = (v) => typeof v === "string" && v.trim() !== "" && !/^NOT REPORTED$/i.test(v.trim());
const day = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/** The METHOD of each declared source, with the limitation that method always carries (the method's own words — not a per-record guess). */
export const METHODS = Object.freeze({
  CLIENT_AI_GOOGLE: Object.freeze({ method: "the client's own AI agent read the search engine's own suggestion surfaces in the client's own browser", ecosystem: "GOOGLE", limitation: "personalised by place and person; one browser's view" }),
  PERSON_SEEN: Object.freeze({ method: "a person recorded what the search engine showed them", ecosystem: "GOOGLE", limitation: "one person's view on one day" }),
  AI_SUGGESTION: Object.freeze({ method: "an AI suggested the wording; nobody is shown to have searched it", ecosystem: null, limitation: "INFERRED — never seen asked" }),
  SEARCH_CONSOLE: Object.freeze({ method: "the client's own Search Console export", ecosystem: "GOOGLE", limitation: "only queries the site was shown for; low-volume queries are withheld by the export" }),
  PUBLIC_QUESTION: Object.freeze({ method: "a question read on a public page and recorded with its source", ecosystem: null, limitation: "a heading or post on one page; its reach is not measured" }),
  RESEARCH_DERIVED: Object.freeze({ method: "derived by research from the client's own field; nobody is shown to have asked it", ecosystem: null, limitation: "RESEARCH-DERIVED — never observed demand" }),
});
const SEARCH_SURFACE_SOURCES = new Set(["CLIENT_AI_GOOGLE", "PERSON_SEEN", "SEARCH_CONSOLE"]);

/**
 * C1 + C2 · one stored demand record, described. `population` is the batch the record belongs to; `runs` the batch's search runs by id (for
 * each run's bound); `exports` its Search Console exports (for the window). Returns null for a record that is not a demand observation.
 */
export function describeDemand(r, { population, runs = new Map(), exports = [] } = {}) {
  let src, d, conf, extra = {};
  if (r?.record_type === "search_phrase") {
    src = r.source;
    d = { date: day(r.date) ?? day(r.recorded_at), observedOrInferred: r.label ?? null, caveat: r.caveat ?? null };
    conf = r.label === "OBSERVED" ? "OBSERVED — seen on the source" : r.label === "INFERRED" ? "INFERRED — never seen asked" : null;
    if (SEARCH_SURFACE_SOURCES.has(src)) {
      const run = r.runId ? runs.get(r.runId) : null;
      const exp = src === "SEARCH_CONSOLE" ? exports[0] ?? null : null;
      extra = {
        surface: r.kind ?? null,
        ecosystem: METHODS[src]?.ecosystem ?? null,
        country: present(r.place) ? r.place : null,
        language: present(r.language) ? r.language : null,
        window: exp?.window ? `${exp.window.from ?? exp.window.start ?? "?"} … ${exp.window.to ?? exp.window.end ?? "?"}` : d.date,
        bound: run ? `${run.searchesUsed ?? "?"} search(es) used of a daily cap of ${run.dailyCap ?? "?"} in run ${r.runId}` : src === "SEARCH_CONSOLE" && exp ? `the export's own rows (${exp.queries ?? "?"} queries)` : null,
        observedOrInferred: d.observedOrInferred,
      };
    }
  } else if (r?.record_type === "public_question") {
    src = "PUBLIC_QUESTION";
    d = { date: day(r.value?.observedOn) ?? day(r.value?.date) ?? day(r.recorded_at), caveat: null };
    conf = r.value?.kind ? `${r.value.kind} — ${r.value?.provenance?.observerType ?? "observer not recorded"}` : null;
  } else if (r?.record_type === "research_derived_question") {
    src = "RESEARCH_DERIVED";
    d = { date: day(r.recorded_at), caveat: null };
    conf = r.tier ?? null;
  } else return null;
  const m = METHODS[src] ?? null;
  const out = {
    id: r.measurement_key ?? r.question_id ?? r.phrase_id ?? null,
    record_type: r.record_type,
    source: src ?? null,
    method: m?.method ?? null,
    date: d.date,
    population: present(population) ? population : null,
    limitation: present(d.caveat) ? d.caveat : m?.limitation ?? null,
    confidence: conf,
    ...(Object.keys(extra).length ? { publicSearch: extra } : {}),
  };
  const missing = FIELDS.filter((f) => !present(out[f] ?? ""));
  const missingSearch = out.publicSearch ? SEARCH_FIELDS.filter((f) => !present(out.publicSearch[f] ?? "")) : [];
  return Object.freeze({ ...out, missing: Object.freeze(missing), missingSearch: Object.freeze(missingSearch) });
}

/** C1 + C2 over a whole batch: every demand record described; each missing field counted by name. */
export function demandEvidence(records, ctx) {
  const described = records.map((r) => describeDemand(r, ctx)).filter(Boolean);
  const count = (key) => described.reduce((m, x) => { for (const f of x[key]) m[f] = (m[f] ?? 0) + 1; return m; }, {});
  const bySource = described.reduce((m, x) => ((m[x.source] = (m[x.source] ?? 0) + 1), m), {});
  return Object.freeze({ described, total: described.length, bySource, publicSearch: described.filter((x) => x.publicSearch).length, missing: count("missing"), missingSearch: count("missingSearch") });
}

/**
 * C3 · a NEW demand record is accepted only with every required field: the five, and for a public-search record the seven more. A record
 * missing any is REFUSED, with the missing fields named.
 */
export function admitDemandRecord(rec) {
  const missing = FIELDS.filter((f) => !present(rec?.[f] ?? ""));
  if (rec?.publicSearch === true || rec?.surface !== undefined) for (const f of SEARCH_FIELDS) if (!present(rec?.[f] ?? "")) missing.push(f);
  if (rec && present(rec.observedOrInferred ?? "x") && rec.observedOrInferred !== undefined && !["OBSERVED", "INFERRED"].includes(rec.observedOrInferred)) missing.push("observedOrInferred (OBSERVED or INFERRED)");
  return missing.length ? Object.freeze({ state: "REFUSED", missing: Object.freeze(missing) }) : Object.freeze({ state: "ACCEPTED", missing: Object.freeze([]) });
}
