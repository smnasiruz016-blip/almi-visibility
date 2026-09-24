/**
 * 🔴 ROW 6 — AXIS DISCOVERY. AN AXIS IS A HYPOTHESIS UNTIL ITS DISTINGUISHING POWER IS MEASURED.
 *
 * Generic: the axis names, their words and their URL families arrive as a spec, from a declared subject package's configuration (subjects/<id>/, F02 relocation).
 * For every candidate — each one the frozen contract names, and each slot type the evidence carries that none of
 * them claims — seven legs are recorded, each with a STATE and the BASIS for it:
 *
 *   discovery              which values actually appear in the human queries, how often, with what demand
 *   distinguishing power   ANSWER: does the useful answer materially change as the value changes?
 *                          QUESTION: does the question change? (from row 5, or from the searcher-country mix)
 *   demand distribution    CONCENTRATED · BROAD · SPARSE · UNKNOWN across the values
 *   evidence availability  can enough per-value evidence be acquired?
 *   sibling collapse risk  how alike are OUR OWN archived pages that differ only along this axis?
 *   human-value delta      does the axis help a real person get a materially better answer?
 *   verdict                BUILD · MONITOR · REJECT · UNKNOWN — computed from the legs, never typed
 *
 * ── 🔴 THE TWO LAWS THE VERDICT OBEYS ───────────────────────────────────────
 *
 *   ACCEPT ONLY ON A MEASUREMENT. BUILD requires the ANSWER-level distinguishing power MEASURED, and every other leg
 *   measured. A question that changes, a page that differs, demand that exists — none of these is the answer
 *   changing, and none of them may stand in for it.
 *
 *   LAW-ABSENT-1: THIN EVIDENCE IS A FACT ABOUT OUR DATA, NEVER A FINDING THAT THE AXIS DOES NOT MATTER. REJECT
 *   requires the answer-level power MEASURED as not changing, on values each sampled enough to decide. Absent or
 *   thin evidence is UNKNOWN — never REJECT. The validator refuses a REJECT on thin data, and refuses one per value
 *   (a country with one query row is UNKNOWN, not "no power").
 *
 * 🔴 OUR OWN PAGES ARE NOT THE ANSWER. Sibling collapse is measured on what WE published; two near-identical pages
 * prove our construction does not change along the axis — never that the useful answer does not.
 */
import { extractBody, shingles, jaccard } from "../audit/shell.mjs";
import { surface } from "./intent-clusters.mjs";

export const VERDICTS = Object.freeze(["BUILD", "MONITOR", "REJECT", "UNKNOWN"]);
export const LEGS = Object.freeze(["discovery", "distinguishing", "demand", "evidenceAvailability", "siblingCollapse", "humanValue"]);

/** An axis is PRESENT in the evidence with at least this many human queries across at least MIN_VALUES values. */
export const MIN_QUERIES = 5;
export const MIN_VALUES = 2;
/** A VALUE is sampled enough to decide anything about it with at least this many query rows. */
export const MIN_OBS_PER_VALUE = 3;
/** A searcher country is testable with at least this many country×query rows (the brief's "five or more"). */
export const MIN_ROWS_PER_COUNTRY = 5;
/** Sibling collapse is MEASURED on at least this many archived page pairs. */
export const MIN_SIBLING_PAIRS = 10;
/** The owner's bars, reused and not re-chosen: Gate A's maximum sibling overlap, the audit's near-duplicate line. */
export const GATE_A_MAX_SIBLING_OVERLAP = 0.4;
export const NEAR_DUPLICATE_THRESHOLD = 0.9;

const ANSWER_UNKNOWN =
  "no per-value ANSWER evidence is owned. Measuring whether the useful answer changes needs the answer at each value from " +
  "a source that is not our own page — per-value verified claims (row 7 SUPPLY, deferred) or real people's questions and " +
  "outcomes (row 2, deferred). Our pages differing, or a question changing, is not the answer changing";
const AVAILABILITY_UNKNOWN =
  "whether enough verifiable per-value evidence can be acquired is itself a supply measurement, which needs external " +
  "sources this row may not fetch (row 7 SUPPLY is deferred)";
const HUMAN_VALUE_UNKNOWN =
  "needs evidence of what a person does with the answer at each value — row 2 is deferred, and every query row in the " +
  "store carries 0 clicks, so owned behaviour says nothing either way";

const inc = (map, k, imp) => {
  const e = map.get(k) || { value: k, queries: 0, impressions: 0 };
  e.queries += 1;
  e.impressions += imp || 0;
  map.set(k, e);
};

/** The values one spec reads from one row-5 member. */
export function valuesOf(member, spec) {
  const out = new Set();
  const key = new Set(member.key || []);
  const contextOk =
    (!spec.contextAny || spec.contextAny.some((w) => key.has(w))) &&
    (!spec.contextNone || !spec.contextNone.some((w) => key.has(w)));
  if (spec.slotTypes && contextOk) {
    for (const s of member.slots || []) if (spec.slotTypes.includes(s.type) && (!spec.include || spec.include(s.value))) out.add(s.value);
  }
  if (spec.slotTypes?.includes("audience")) for (const s of member.slots || []) if (s.type === "audience") out.add(s.value);
  if (spec.words) for (const [value, words] of Object.entries(spec.words)) if (words.some((w) => key.has(w))) out.add(value);
  if (spec.markers) {
    const tokens = surface(member.original).trim().split(/\s+/);
    for (const [lang, markers] of Object.entries(spec.markers)) {
      if (tokens.filter((t) => markers.includes(t)).length >= (spec.minMarkers ?? 2)) out.add(lang);
    }
  }
  return [...out];
}

/** Demand across an axis's values. `thin` is about deciding; `present` is about the axis appearing at all. */
export function demandDistribution(values) {
  const list = [...values].sort((a, b) => b.queries - a.queries || b.impressions - a.impressions || String(a.value).localeCompare(String(b.value)));
  const queries = list.reduce((n, v) => n + v.queries, 0);
  const impressions = list.reduce((n, v) => n + v.impressions, 0);
  const sampled = list.filter((v) => v.queries >= MIN_OBS_PER_VALUE).length;
  const present = queries >= MIN_QUERIES && list.length >= MIN_VALUES;
  const topShare = impressions ? list[0].impressions / impressions : 0;
  const singletonShare = list.length ? list.filter((v) => v.queries === 1).length / list.length : 0;
  let shape = "UNKNOWN";
  if (present) shape = topShare >= 0.5 ? "CONCENTRATED" : singletonShare >= 0.8 ? "SPARSE" : "BROAD";
  return {
    state: present ? "MEASURED" : "UNKNOWN",
    shape,
    present,
    thin: sampled < MIN_VALUES,
    values: list.length,
    sampledValues: sampled,
    queries,
    impressions,
    topValue: list[0]?.value ?? null,
    topShare: Number(topShare.toFixed(3)),
    singletonShare: Number(singletonShare.toFixed(3)),
    basis: present
      ? `${queries} human queries across ${list.length} values; ${sampled} value(s) with ≥ ${MIN_OBS_PER_VALUE} queries; top value '${list[0].value}' holds ${(topShare * 100).toFixed(1)}% of ${impressions} impressions; ${(singletonShare * 100).toFixed(1)}% of values appear once`
      : `${queries} human queries across ${list.length} value(s) — below the ${MIN_QUERIES} queries across ${MIN_VALUES} values an axis needs to be present. LAW-ABSENT-1: that is thin evidence, not an absent axis`,
  };
}

/** Body-text overlap of two archived pages (shell subtraction, 8-word shingles), or null when a body is not confidently found. */
export function bodyOverlap(htmlA, htmlB) {
  const a = extractBody(htmlA);
  const b = extractBody(htmlB);
  if (!a.confident || !b.confident) return null;
  return jaccard(shingles(a.bodyText), shingles(b.bodyText));
}

/** Sibling collapse over measured pairs [{ a, b, overlap }]. */
export function siblingCollapse(pairs, families = []) {
  const measured = pairs.filter((p) => typeof p.overlap === "number");
  const skipped = pairs.length - measured.length;
  const sorted = measured.map((p) => p.overlap).sort((x, y) => x - y);
  const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null;
  const where = families.map((f) => `${f.host}/${f.prefix} varying ${f.varies}`).join("; ") || "no archived sibling family varies along this axis alone";
  if (measured.length < MIN_SIBLING_PAIRS) {
    return {
      state: "UNKNOWN",
      pairs: measured.length,
      skipped,
      median: median === null ? null : Number(median.toFixed(4)),
      basis: `${measured.length} measured archived pair(s) (${where}) — below the ${MIN_SIBLING_PAIRS} needed. LAW-ABSENT-1: few pairs is a fact about our archive`,
    };
  }
  const above = sorted.filter((x) => x > GATE_A_MAX_SIBLING_OVERLAP).length;
  const near = sorted.filter((x) => x >= NEAR_DUPLICATE_THRESHOLD).length;
  return {
    state: "MEASURED",
    pairs: measured.length,
    skipped,
    median: Number(median.toFixed(4)),
    min: Number(sorted[0].toFixed(4)),
    max: Number(sorted.at(-1).toFixed(4)),
    aboveGateABar: above,
    nearDuplicate: near,
    basis: `${measured.length} archived pairs of OUR pages (${where}): body overlap median ${median.toFixed(3)} (min ${sorted[0].toFixed(3)}, max ${sorted.at(-1).toFixed(3)}); ${above} above Gate A's ${GATE_A_MAX_SIBLING_OVERLAP}; ${near} at or above the near-duplicate line ${NEAR_DUPLICATE_THRESHOLD}. It measures our construction, never the answer`,
  };
}

/** Total variation distance between two count maps. */
function tvd(a, b) {
  const na = [...a.values()].reduce((x, y) => x + y, 0);
  const nb = [...b.values()].reduce((x, y) => x + y, 0);
  let d = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) d += Math.abs((a.get(k) || 0) / na - (b.get(k) || 0) / nb);
  return d / 2;
}

/**
 * THE QUESTION MIX BY SEARCHER COUNTRY — does what people ASK change by where they search from? For every country with
 * at least MIN_ROWS_PER_COUNTRY rows: the distance between its intent mix and everyone else's, and how often a random
 * relabelling of the same rows is as far (a seeded permutation test). Fewer rows → UNKNOWN for that country, by name.
 */
export function questionMixByCountry(rows, intentOf, { permutations = 999, seed = 7 } = {}) {
  const labelled = rows.map((r) => ({ country: r.country, intent: intentOf(r.query) })).filter((r) => r.intent);
  const byCountry = new Map();
  for (const r of labelled) byCountry.set(r.country, [...(byCountry.get(r.country) || []), r]);
  let state = seed >>> 0;
  const rand = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const count = (xs) => { const m = new Map(); for (const x of xs) m.set(x.intent, (m.get(x.intent) || 0) + 1); return m; };
  const perCountry = [];
  for (const [country, own] of [...byCountry].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
    if (own.length < MIN_ROWS_PER_COUNTRY) {
      perCountry.push({ value: country, rows: own.length, state: "UNKNOWN", verdict: "UNKNOWN", basis: `${own.length} row(s) < ${MIN_ROWS_PER_COUNTRY}. LAW-ABSENT-1: too few rows to say anything — not 'no difference'` });
      continue;
    }
    const rest = labelled.filter((r) => r.country !== country);
    const d = tvd(count(own), count(rest));
    let asFar = 0;
    const intents = labelled.map((r) => r.intent);
    for (let p = 0; p < permutations; p += 1) {
      for (let i = intents.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [intents[i], intents[j]] = [intents[j], intents[i]]; }
      const a = new Map();
      const b = new Map();
      labelled.forEach((r, i) => { const m = r.country === country ? a : b; m.set(intents[i], (m.get(intents[i]) || 0) + 1); });
      if (tvd(a, b) >= d) asFar += 1;
    }
    const pValue = (asFar + 1) / (permutations + 1);
    perCountry.push({ value: country, rows: own.length, state: "MEASURED", verdict: "MONITOR", distance: Number(d.toFixed(3)), pValue: Number(pValue.toFixed(3)), basis: `intent-mix distance ${d.toFixed(3)} from the other countries; a random relabelling is as far ${asFar} of ${permutations} times (p ≈ ${pValue.toFixed(3)}). This is the QUESTION changing, never the answer` });
  }
  return { rowsLabelled: labelled.length, rowsUnlabelled: rows.length - labelled.length, perCountry };
}

/** 🔴 THE VERDICT — computed from the legs, never typed. */
export function verdictOf(r) {
  const answer = r.distinguishing?.answer ?? {};
  const measured = answer.state === "MEASURED";
  if (measured && answer.materiallyChanges === true && !r.demand.thin && r.evidenceAvailability.state === "MEASURED" && r.humanValue.state === "MEASURED") return "BUILD";
  if (measured && answer.materiallyChanges === false && !r.demand.thin) return "REJECT";
  if (r.demand.present) return "MONITOR";
  return "UNKNOWN";
}

function verdictBasis(r) {
  switch (r.verdict) {
    case "BUILD": return "the answer was measured to change materially across adequately sampled values, and every other leg was measured";
    case "REJECT": return "the answer was measured NOT to change across adequately sampled values";
    case "MONITOR": return `present in the evidence (${r.demand.basis}) — but the answer-level distinguishing power is UNKNOWN, so it can be neither adopted nor rejected`;
    default: return `not decidable: ${r.demand.basis}`;
  }
}

/**
 * Discover and test every candidate.
 *   record         row 5's clusters (members carry original, key, slots, impressions)
 *   specs          the axis specs (named, and how each reads its values)
 *   countryRows    human country×query rows (for a searcherCountry spec)
 *   intentOf       query → row-5 cluster id
 *   siblingPairs   axis → [{ a, b, overlap }] measured on archived pages; siblingFamilies axis → families
 *   hardCoded      axis → { pages, impressions, examples } read from the page rows; declaredBy axis → [product ids]
 *   answerLegs     axis → a measured answer leg from src/discovery/answer-evidence.mjs
 *   availabilityLegs, humanValueLegs
 *                  axis → a measured leg for the two remaining gates BUILD requires
 *
 * 🔴 answerLegs IS THE WAY IN, AND IT DEFAULTS TO CLOSED. Until this parameter existed the answer
 * leg was the literal UNKNOWN and no input could change it, so BUILD and REJECT were unreachable from
 * this path however much evidence was owned. Supplying nothing still yields that same literal and the
 * same basis, so a caller that does not pass it behaves exactly as it did before.
 */
export function discoverAxes({ record, specs, countryRows = [], intentOf = () => null, siblingPairs = {}, siblingFamilies = {}, hardCoded = {}, declaredBy = {}, answerLegs = {}, answerDefault = null, availabilityLegs = {}, humanValueLegs = {} }) {
  const members = record.flatMap((c) => c.members.map((m) => ({ ...m, cluster: c.id })));
  const claimed = new Set(Object.values(specs).flatMap((s) => s.slotTypes || []));
  const discovered = [...new Set(members.flatMap((m) => (m.slots || []).map((s) => s.type)))].filter((t) => !claimed.has(t)).sort();
  const all = { ...specs, ...Object.fromEntries(discovered.map((t) => [t, { named: false, reads: `the '${t}' slot row 5 recorded — claimed by no named axis`, slotTypes: [t] }])) };

  return Object.entries(all).map(([axis, spec]) => {
    const values = new Map();
    const clustersByValue = new Map();
    let carrying = 0;
    for (const m of members) {
      const vs = valuesOf(m, spec);
      if (vs.length) carrying += 1;
      for (const v of vs) {
        inc(values, v, m.impressions);
        clustersByValue.set(v, new Set([...(clustersByValue.get(v) || []), m.cluster]));
      }
    }
    let mix = null;
    if (spec.searcherCountry) {
      for (const row of countryRows) inc(values, `searcher:${row.country}`, row.impressions);
      mix = questionMixByCountry(countryRows, intentOf);
    }
    const demand = demandDistribution(values.values());
    const clusterSets = [...clustersByValue.values()];
    const shared = new Set(clusterSets.flatMap((s) => [...s]).filter((c) => clusterSets.filter((s) => s.has(c)).length >= 2));
    const question = mix
      ? { state: mix.perCountry.some((c) => c.state === "MEASURED") ? "MEASURED" : "UNKNOWN", measuredCountries: mix.perCountry.filter((c) => c.state === "MEASURED").length, unknownCountries: mix.perCountry.filter((c) => c.state === "UNKNOWN").length, perCountry: mix.perCountry, basis: "whether the QUESTION mix changes by searcher country — measured where a country has enough rows" }
      : { state: values.size ? "FROM_ROW5" : "UNKNOWN", valuesSharingAnIntent: clusterSets.filter((s) => [...s].some((c) => shared.has(c))).length, intentsHoldingTwoOrMoreValues: shared.size, basis: values.size ? `${shared.size} row-5 intent(s) hold two or more of its values: there the question stays the same as the value changes. A consequence of row 5's slot ruling, not independent evidence` : "no values in the queries" };

    const r = {
      axis,
      named: Boolean(spec.named),
      contractName: spec.contractName ?? (spec.named ? axis : null),
      reads: spec.reads,
      discovery: { state: carrying || values.size ? "PRESENT" : "ABSENT_IN_SAMPLE", queriesCarrying: carrying, values: [...values.values()].sort((a, b) => b.queries - a.queries || String(a.value).localeCompare(String(b.value))), basis: carrying || values.size ? `${carrying} human queries carry it${spec.searcherCountry ? `, plus ${countryRows.length} country×query rows` : ""}` : "no human query carries it — LAW-ABSENT-1: absent from 329 queries over four weeks is thin evidence, not an absent axis" },
      /* 🔴 A REFUSAL IS NOT AN ABSENCE. When the join was refused, every axis says SO — carrying the
       * refusal's own state and reason — instead of the "no evidence is owned" text, which is false
       * the moment evidence exists and is being refused. */
      distinguishing: { answer: answerLegs[axis] ?? answerDefault ?? { state: "UNKNOWN", basis: ANSWER_UNKNOWN }, question },
      demand,
      /* 🔴 BUILD NEEDS THIS LEG TOO, SO IT NEEDS A WAY IN TOO. Unsupplied it is the same literal
       * and the same basis as before — the supply question it asks is not answered by the evidence
       * we happen to hold. */
      evidenceAvailability: availabilityLegs[axis] ?? { state: "UNKNOWN", basis: AVAILABILITY_UNKNOWN },
      siblingCollapse: siblingCollapse(siblingPairs[axis] || [], siblingFamilies[axis] || []),
      humanValue: humanValueLegs[axis] ?? { state: "UNKNOWN", basis: HUMAN_VALUE_UNKNOWN },
      hardCoded: { pages: hardCoded[axis]?.pages ?? 0, impressions: hardCoded[axis]?.impressions ?? 0, examples: hardCoded[axis]?.examples ?? [], declaredBy: declaredBy[axis] ?? [] },
    };
    r.verdict = verdictOf(r);
    r.verdictBasis = verdictBasis(r);
    return r;
  });
}

/**
 * 🔴 ROW 6's LAW. Returns [] when every limb holds; each error names its limb.
 *   named-axis-untested  — an axis the contract names has no result
 *   leg-missing          — a result lacks a leg, or a leg has no state or no basis
 *   accepted-unmeasured  — BUILD without a recorded ANSWER-level distinguishing-power measurement
 *   rejected-on-thin     — REJECT without that measurement, or on values too thin to decide (LAW-ABSENT-1) — per axis and per value
 *   verdict-inconsistent — a recorded verdict that its own legs do not produce
 */
export function axisErrors({ results, namedAxes }) {
  const errs = [];
  for (const a of namedAxes) if (!results.some((r) => r.contractName === a)) errs.push({ limb: "named-axis-untested", why: `the contract names '${a}' and no result tests it` });
  for (const r of results) {
    for (const leg of LEGS.filter((x) => x !== "distinguishing")) {
      const l = r[leg];
      if (!l || typeof l.state !== "string") errs.push({ limb: "leg-missing", why: `${r.axis}: leg '${leg}' has no state` });
      else if (typeof l.basis !== "string") errs.push({ limb: "leg-missing", why: `${r.axis}: leg '${leg}' states ${l.state} with no basis` });
    }
    // distinguishing power is two measurements, and both must be on the record: the ANSWER (which decides) and the QUESTION
    const d = r.distinguishing;
    if (!d?.answer || typeof d.answer.state !== "string" || typeof d.answer.basis !== "string") errs.push({ limb: "leg-missing", why: `${r.axis}: the answer-level distinguishing power is not recorded with a state and a basis` });
    if (!d?.question || typeof d.question.state !== "string" || typeof d.question.basis !== "string") errs.push({ limb: "leg-missing", why: `${r.axis}: the question-level distinguishing power is not recorded with a state and a basis` });
    const answer = r.distinguishing?.answer ?? {};
    const measuredAnswer = answer.state === "MEASURED" && typeof answer.materiallyChanges === "boolean" && Number.isFinite(answer.sample) && typeof answer.method === "string";
    if (r.verdict === "BUILD" && !measuredAnswer) {
      errs.push({ limb: "accepted-unmeasured", why: `${r.axis} is BUILD with answer-level distinguishing power ${answer.state ?? "unrecorded"} — an axis is adopted on a measurement, never because it is obvious` });
    }
    if (r.verdict === "REJECT" && (!measuredAnswer || r.demand?.thin || (answer.sample ?? 0) < MIN_VALUES)) {
      errs.push({ limb: "rejected-on-thin", why: `${r.axis} is REJECT on ${measuredAnswer ? `${r.demand.sampledValues} adequately sampled value(s)` : `an answer-level power that is ${answer.state ?? "unrecorded"}`} — LAW-ABSENT-1: thin evidence is a fact about our data, never a finding that the axis does not matter` });
    }
    for (const c of r.distinguishing?.question?.perCountry || []) {
      if (c.verdict === "REJECT") errs.push({ limb: "rejected-on-thin", why: `${r.axis}: searcher country '${c.value}' is REJECT on ${c.rows} row(s) — a question mix is never an answer, and ${c.rows < MIN_ROWS_PER_COUNTRY ? "those rows are too few to decide (LAW-ABSENT-1)" : "the answer was not measured"}` });
    }
    if (VERDICTS.includes(r.verdict) && r.verdict !== verdictOf(r)) errs.push({ limb: "verdict-inconsistent", why: `${r.axis} records ${r.verdict}; its own legs produce ${verdictOf(r)}` });
    if (!VERDICTS.includes(r.verdict)) errs.push({ limb: "verdict-inconsistent", why: `${r.axis}: '${r.verdict}' is not a verdict` });
  }
  return errs;
}
