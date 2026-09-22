/**
 * 🔴 ROW 5 — INTENT & QUESTION CLUSTERING. GENERIC: IT KNOWS NO SUBJECT. A SUBJECT'S WORDS ARRIVE AS A LEXICON.
 *
 * ── WHAT IT DOES ────────────────────────────────────────────────────────────
 *
 *   1. NORMALISE each human query into a KEY — its content words after the lexicon's phrases, synonyms and filler —
 *      and its SLOTS: typed values (a number, a year, a place, an occupation) the lexicon declares. 🔴 The ORIGINAL
 *      string is carried untouched beside the key, always, and every member also carries `ref` — the sha256 of the
 *      store row's string, taken at intake — so its identity never depends on the wording it displays.
 *   2. CLUSTER by average-linkage agglomeration over weighted Jaccard of the keys (weights: inverse document
 *      frequency over the population being clustered), merging while the average similarity is at least THRESHOLD.
 *   3. 🔴 A SLOT'S VALUE NEVER ENTERS THE KEY. Whether "47" and "65" are the same intent is not left to fall out of a
 *      threshold: the lexicon's SLOT_RULINGS state, per slot type, that a value selects part of one answer and does
 *      not change the question — and whether the slot's PRESENCE is part of the question. That ruling is recorded
 *      on every cluster that holds the slot.
 *
 * ── HOW IT IS HELD TO ACCOUNT ───────────────────────────────────────────────
 *
 *   · against a REFERENCE placement written before this file existed (config/discovery/intent-reference.mjs),
 *     in BOTH directions, separately: distinct intents merged, and one intent split — over the IN-SAMPLE queries,
 *     the words the clusterer and its lexicon were built from;
 *   · by a HELD-OUT check: a fixed fifth of the queries, chosen by hash before any lexicon was written, is kept out;
 *     the rest is clustered; each held-out query is then placed and scored HIT or MISS, and the misses are named.
 *     A held-out miss is the clusterer failing on words it was not built from — reported, never hidden, never
 *     re-labelled an in-sample defect;
 *   · and the original wording of every member must equal the store's row, byte for byte.
 *
 * 🔴 THE LIMIT, WHICH TRAVELS WITH EVERY RESULT: this proves wordings group together consistently with a reader's
 * placement. It does NOT prove a group is the intent a real person had — that needs human question evidence
 * (row 2, DEFERRED). And the reference is a model's judgement standing in for a human's.
 */
import { createHash } from "node:crypto";

export const THRESHOLD = 0.5;

export const HOLD_OUT_RULE =
  "a human query is HELD OUT when the first byte of sha256(its original string, utf8) is divisible by 5 — about a fifth, " +
  "fixed by the string alone, chosen before any lexicon existed";

export const LIMIT =
  "clustering proves wordings group together consistently with the reference placement; it does NOT prove a group is the " +
  "intent a real person had (that needs row 2, DEFERRED), and the reference is a model's judgement standing in for a human's";

export const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
export const isHeldOut = (original) => parseInt(sha(original).slice(0, 2), 16) % 5 === 0;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lower-case, strip diacritics, keep decimal points inside numbers, turn every other mark into a space. */
export function surface(original) {
  return ` ${original
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d)\.(\d)/g, "$1$2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(//g, ".")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/**
 * One query → { original, key, slots }. `original` is the input string itself.
 *
 * The lexicon: { phrases: [[from, to]], synonyms: {word: word|[words]}, filler: [words], slotTypes: {type: [values]},
 *   absorbs: [types], intentWords: [words], exclusive: [[words]], dominates: [[ifPresent, drop]], slotRulings: {type: {inKey, ruling}} }
 */
export function normalise(original, lexicon) {
  let s = surface(original);
  const phrases = [...(lexicon.phrases || [])].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of phrases) {
    const re = new RegExp(` ${escapeRe(from)} `, "g");
    s = s.replace(re, ` ${to} `).replace(re, ` ${to} `);
  }
  const raw = s.trim().split(/\s+/).filter(Boolean);
  const words = raw.flatMap((w) => {
    const syn = lexicon.synonyms?.[w];
    return syn === undefined ? [w] : Array.isArray(syn) ? syn : [syn];
  }).filter((w) => w !== "");

  const typeOf = new Map();
  for (const [type, values] of Object.entries(lexicon.slotTypes || {})) for (const v of values) typeOf.set(v, type);
  const filler = new Set(lexicon.filler || []);

  const items = [];
  for (const w of words) {
    if (/^\d+(\.\d+)?$/.test(w)) items.push({ slot: /^(19|20)\d\d$/.test(w) ? "year" : "number", value: w });
    else if (typeOf.has(w)) items.push({ slot: typeOf.get(w), value: w });
    else if (filler.has(w)) continue;
    else items.push({ word: w });
  }
  // A declared ABSORBING slot type takes the unknown word directly before it into its value:
  // "restaurant manager" is one occupation, not the word "restaurant" beside one.
  const absorbs = new Set(lexicon.absorbs || []);
  const intentWords = new Set(lexicon.intentWords || []);
  for (let i = items.length - 1; i > 0; i -= 1) {
    if (items[i].slot && absorbs.has(items[i].slot) && items[i - 1].word && !intentWords.has(items[i - 1].word)) {
      items[i] = { slot: items[i].slot, value: `${items[i - 1].word} ${items[i].value}` };
      items.splice(i - 1, 1);
    }
  }
  const slots = items.filter((x) => x.slot).map((x) => ({ type: x.slot, value: x.value }));
  const key = new Set(items.filter((x) => x.word).map((x) => x.word));
  for (const { type } of slots) if (lexicon.slotRulings?.[type]?.inKey) key.add(`<${type}>`);
  for (const [ifPresent, drop] of lexicon.dominates || []) if (key.has(ifPresent)) key.delete(drop);
  return { original, key: [...key].sort(), slots };
}

export const idfOf = (keys) => {
  const df = new Map();
  for (const k of keys) for (const t of k) df.set(t, (df.get(t) || 0) + 1);
  const n = keys.length;
  return (t) => Math.log(1 + n / Math.max(1, df.get(t) || 0));
};

/**
 * Weighted Jaccard of two keys.
 *
 * 🔴 EXCLUSIVE GROUPS. Inverse document frequency gives the subject's most common words the least weight — and in a
 * subject's own queries those are often its main ENTITIES, the very thing a question is about. So a lexicon may
 * declare groups: two keys naming a DIFFERENT set of a group's members (one naming a member and the other none
 * included) score 0, however much else they share. (Reference rules R3 and R4, generic.)
 */
export function similarity(a, b, w, exclusive = []) {
  if (a.length === 0 && b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  for (const group of exclusive) {
    if (group.filter((t) => A.has(t)).join("|") !== group.filter((t) => B.has(t)).join("|")) return 0;
  }
  let shared = 0;
  let union = 0;
  for (const t of new Set([...A, ...B])) {
    const wt = w(t);
    union += wt;
    if (A.has(t) && B.has(t)) shared += wt;
  }
  return union === 0 ? 0 : shared / union;
}

const clusterId = (members) => `intent-${sha(members.map((m) => m.ref).sort().join("\n")).slice(0, 10)}`;

const member = (row, lexicon) => ({ ...normalise(row.query, lexicon), ref: sha(row.query), impressions: row.impressions, clicks: row.clicks });

function describe(members, lexicon) {
  const sorted = [...members].sort((a, b) => a.original.localeCompare(b.original));
  const slots = {};
  for (const m of sorted) for (const s of m.slots) (slots[s.type] ||= new Set()).add(s.value);
  const slotList = Object.fromEntries(Object.entries(slots).map(([t, v]) => [t, [...v].sort()]));
  return {
    id: clusterId(sorted),
    size: sorted.length,
    impressions: sorted.reduce((n, m) => n + (m.impressions || 0), 0),
    members: sorted,
    slots: slotList,
    slotRulings: Object.fromEntries(Object.keys(slotList).map((t) => [t, lexicon.slotRulings?.[t] ?? { inKey: false, ruling: "UNRULED — no ruling was declared for this slot type" }])),
  };
}

/** Cluster query rows ({query, impressions, clicks}). Returns clusters sorted by size, then id. */
export function clusterIntents(rows, lexicon, { threshold = THRESHOLD } = {}) {
  const items = rows.map((r) => member(r, lexicon));
  const w = idfOf(items.map((x) => x.key));
  // identical keys start together; an empty key (every word filler) stays alone, by its identity
  const byKey = new Map();
  items.forEach((x, i) => {
    const k = x.key.length ? x.key.join(" ") : ` ${x.ref}`;
    byKey.set(k, [...(byKey.get(k) || []), i]);
  });
  let groups = [...byKey.values()];
  const n = items.length;
  const S = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) S[i][j] = S[j][i] = similarity(items[i].key, items[j].key, w, lexicon.exclusive);
  const sum = (a, b) => { let t = 0; for (const i of a) for (const j of b) t += S[i][j]; return t; };
  const label = (g) => g.map((i) => items[i].ref).sort()[0];

  for (;;) {
    let best = null;
    for (let a = 0; a < groups.length; a += 1) {
      for (let b = a + 1; b < groups.length; b += 1) {
        const avg = sum(groups[a], groups[b]) / (groups[a].length * groups[b].length);
        if (avg < threshold) continue;
        const tie = `${label(groups[a])} ${label(groups[b])}`;
        if (!best || avg > best.avg || (avg === best.avg && tie < best.tie)) best = { a, b, avg, tie };
      }
    }
    if (!best) break;
    const merged = [...groups[best.a], ...groups[best.b]];
    groups = groups.filter((_, k) => k !== best.a && k !== best.b);
    groups.push(merged);
  }
  return groups.map((g) => describe(g.map((i) => items[i]), lexicon)).sort((x, y) => y.size - x.size || x.id.localeCompare(y.id));
}

/** Index a reference placement by the sha256 of each member string (the same identity a cluster member carries). */
export function referenceIndex(reference, ambiguous = {}) {
  const intentOf = new Map();
  for (const [id, intent] of Object.entries(reference)) for (const m of intent.members) intentOf.set(sha(m), id);
  return { intentOf, ambiguous: new Set(Object.keys(ambiguous).map(sha)) };
}

/**
 * Both failure modes, separately. Ambiguous queries are scored in neither direction.
 *   merged — one cluster holds members of two or more reference intents
 *   split  — one reference intent's members sit in two or more clusters
 */
export function compareToReference(clusters, reference, ambiguous = {}) {
  const { intentOf, ambiguous: amb } = referenceIndex(reference, ambiguous);
  const merged = [];
  const clustersOfIntent = new Map();
  for (const c of clusters) {
    const byIntent = {};
    for (const m of c.members) {
      if (amb.has(m.ref)) continue;
      const r = intentOf.get(m.ref) ?? `UNPLACED:${m.ref.slice(0, 10)}`;
      (byIntent[r] ||= []).push(m.original);
      clustersOfIntent.set(r, new Set([...(clustersOfIntent.get(r) || []), c.id]));
    }
    if (Object.keys(byIntent).length > 1) merged.push({ cluster: c.id, intents: byIntent });
  }
  const split = [];
  for (const [r, ids] of clustersOfIntent) {
    if (ids.size > 1) {
      const where = clusters.filter((c) => ids.has(c.id)).map((c) => ({ cluster: c.id, members: c.members.filter((m) => intentOf.get(m.ref) === r).map((m) => m.original) }));
      split.push({ intent: r, clusters: where });
    }
  }
  return { merged, split };
}

/** Place one query against existing clusters: the cluster of highest average similarity, if it clears the threshold. */
export function place(query, clusters, lexicon, w, threshold = THRESHOLD) {
  const { key } = normalise(query, lexicon);
  let top = { id: null, avg: 0 };
  for (const c of clusters) {
    const avg = c.members.reduce((t, m) => t + similarity(key, m.key, w, lexicon.exclusive), 0) / c.members.length;
    if (avg > top.avg || (avg === top.avg && top.id !== null && c.id < top.id)) top = { id: c.id, avg };
  }
  return { id: top.avg >= threshold ? top.id : "NEW", avg: top.avg, nearest: top.id, key };
}

/**
 * 🔴 THE HELD-OUT CHECK — RUN, NOT DECLARED. Cluster the in-sample queries without the held-out ones; place each
 * held-out query against those clusters alone; score each against the reference.
 *   HIT  — placed in a cluster holding its reference intent; or NEW where no in-sample query has that intent
 *   MISS — placed in a cluster of a different intent; or NEW although its intent exists in-sample
 *   UNSCORED — the reference marks it ambiguous
 */
export function heldOutCheck(humanRows, lexicon, reference, ambiguous = {}, { threshold = THRESHOLD } = {}) {
  const held = humanRows.filter((r) => isHeldOut(r.query));
  const train = humanRows.filter((r) => !isHeldOut(r.query));
  const clusters = clusterIntents(train, lexicon, { threshold });
  const w = idfOf(train.map((r) => normalise(r.query, lexicon).key));
  const { intentOf, ambiguous: amb } = referenceIndex(reference, ambiguous);
  const results = held.map((r) => {
    const p = place(r.query, clusters, lexicon, w, threshold);
    const ref = sha(r.query);
    const base = { original: r.query, ref, placedIn: p.id, similarity: Number(p.avg.toFixed(4)), nearest: p.nearest };
    if (amb.has(ref)) return { ...base, referenceIntent: "AMBIGUOUS", verdict: "UNSCORED", why: ambiguous[r.query] };
    const intent = intentOf.get(ref) ?? null;
    const target = clusters.find((c) => c.id === p.id);
    const targetIntents = target ? [...new Set(target.members.map((m) => intentOf.get(m.ref)).filter(Boolean))] : [];
    const intentInSample = train.some((t) => intentOf.get(sha(t.query)) === intent);
    let verdict;
    let why;
    if (p.id === "NEW") {
      verdict = intentInSample ? "MISS" : "HIT";
      why = intentInSample
        ? `left NEW (best average similarity ${p.avg.toFixed(3)} < ${threshold}), but its intent '${intent}' has in-sample members`
        : `NEW, and no in-sample query has its intent '${intent}'`;
    } else {
      verdict = targetIntents.includes(intent) ? "HIT" : "MISS";
      why = verdict === "HIT" ? `joined a cluster holding '${intent}'` : `joined a cluster of ${targetIntents.map((x) => `'${x}'`).join(", ")}, not '${intent}'`;
    }
    return { ...base, referenceIntent: intent, verdict, why };
  });
  /* 🔴 ORDER IS NOT EVIDENCE (22 September 2026). The results followed the order the store happened to list the rows in,
   * so the same population reordered gave a different output while every verdict was the same. Sorted by `ref` — the
   * sha256 identity fixed at intake — the output is byte-identical under any reordering of the input. */
  results.sort((x, y) => (x.ref < y.ref ? -1 : x.ref > y.ref ? 1 : 0));
  const count = (v) => results.filter((x) => x.verdict === v).length;
  return {
    ran: true,
    rule: HOLD_OUT_RULE,
    threshold,
    inSample: train.length,
    heldOut: held.length,
    inSampleClusters: clusters,
    hits: count("HIT"),
    misses: count("MISS"),
    unscored: count("UNSCORED"),
    missed: results.filter((x) => x.verdict === "MISS"),
    results,
  };
}

/**
 * THE RECORD: the in-sample clusters, with every held-out query added where it was placed — into its cluster, or
 * as a new one. A held-out query with no placement result (the check did not run for it) is added alone and marked
 * NOT RUN, so its wording is never lost merely because the check failed.
 */
export function buildRecord(humanRows, heldOut, lexicon) {
  const byId = new Map(heldOut.inSampleClusters.map((c) => [c.id, c.members.map((m) => ({ ...m, heldOut: false }))]));
  const resultOf = new Map((heldOut.results || []).map((r) => [r.ref, r]));
  const fresh = [];
  for (const row of humanRows.filter((r) => isHeldOut(r.query))) {
    const m = member(row, lexicon);
    const res = resultOf.get(m.ref);
    const tagged = { ...m, heldOut: true, placement: res ? { verdict: res.verdict, placedIn: res.placedIn, similarity: res.similarity } : { verdict: "NOT RUN" } };
    if (res && byId.has(res.placedIn)) byId.get(res.placedIn).push(tagged);
    else fresh.push([tagged]);
  }
  return [...byId.values(), ...fresh].map((ms) => describe(ms, lexicon)).sort((x, y) => y.size - x.size || x.id.localeCompare(y.id));
}

/** Every source word of a lexicon that occurs in none of `rows`. Targets of a synonym or phrase are labels, not words. */
export function lexiconWordsAbsentFrom(lexicon, rows) {
  const text = new Set(rows.flatMap((r) => surface(r.query).trim().replace(/\./g, " ").split(/\s+/)));
  const targets = new Set([...Object.values(lexicon.synonyms || {}).flat(), ...(lexicon.phrases || []).flatMap(([, t]) => t.split(" "))]);
  const words = new Set();
  for (const [from] of lexicon.phrases || []) from.split(" ").forEach((w) => words.add(w));
  Object.keys(lexicon.synonyms || {}).forEach((w) => words.add(w));
  (lexicon.filler || []).forEach((w) => words.add(w));
  Object.values(lexicon.slotTypes || {}).flat().filter((v) => !targets.has(v)).forEach((v) => v.split("_").forEach((w) => words.add(w)));
  (lexicon.exclusive || []).flat().filter((v) => !targets.has(v)).forEach((w) => words.add(w));
  return [...words].filter((w) => w && !text.has(w)).sort();
}

/**
 * 🔴 ROW 5's CLUSTERING LAW. Returns [] when every limb holds; each error names its limb.
 *   wording-lost          — a store query is not a record member verbatim exactly once, or a member's wording differs from its store row
 *   merged / split        — the in-sample clusters against the reference, separately
 *   record-merged /       — 🔴 THE FROZEN CLAUSE OVER THE WHOLE OUTPUT (D-HELDOUT-1): the RECORD — in-sample
 *   record-split             clusters PLUS held-out placements — against the same reference, by the same
 *                            `compareToReference`. The in-sample limbs above cannot see a held-out member at all:
 *                            `inSampleClusters` is built from the training half alone, so a held-out query left in
 *                            its own cluster is invisible to them however wrong it is. These two limbs are what
 *                            makes "distinct intents merge, or identical intents stay split" fail-capable for the
 *                            whole population the clusterer actually produced.
 *   held-out-unrun        — the held-out report did not run over exactly the held-out population, or its counts disagree with its own results
 *   lexicon-held-out-word — the lexicon holds a word no in-sample query contains
 *
 * 🔴 RULE-EXCLUDED, NOT EVALUATED: `compareToReference` skips every R6-AMBIGUOUS member (:214), by the reference's
 * own rule that an ambiguous wording is "scored in NEITHER direction". Those members are neither passed nor failed
 * by any limb here; they are reported separately, by name, as UNEVALUATED-BY-RULE.
 */
export function clusteringErrors({ humanRows, record, heldOut, reference, ambiguous = {}, lexicon }) {
  const errs = [];
  /* 🔴 EMPTY POPULATION (22 September 2026). Every limb below counts defects in a population; over NO population each
   * finds none, and "0 merges · 0 splits" would read as a pass. Measured before this limb existed: with every human
   * row marked ambiguous — a scored population of 0 — this function returned NO error at all. So the population is
   * counted first: no human row, or no human row the reference places and does not mark ambiguous, is itself a
   * failure. A population that cannot be scored is not a population that passed. */
  const amb = referenceIndex(reference || {}, ambiguous).ambiguous;
  const placedIn = referenceIndex(reference || {}, ambiguous).intentOf;
  const scored = (humanRows || []).filter((r) => placedIn.has(sha(r.query)) && !amb.has(sha(r.query)));
  if (!humanRows || humanRows.length === 0) errs.push({ limb: "empty-population", why: "no human query row was given — there is nothing to cluster, and nothing clustered is not nothing wrong" });
  else if (scored.length === 0) errs.push({ limb: "empty-population", why: `${humanRows.length} human row(s), but none is both placed by the reference and not ambiguous — the scored population is 0, so no limb can find a defect in it` });
  const storeByRef = new Map(humanRows.map((r) => [sha(r.query), r.query]));
  const refs = new Map();
  for (const c of record) for (const m of c.members) refs.set(m.ref, (refs.get(m.ref) || 0) + 1);
  for (const [ref, q] of storeByRef) if (refs.get(ref) !== 1) errs.push({ limb: "wording-lost", why: `the store's query "${q}" is a record member ${refs.get(ref) || 0} time(s); it must be there exactly once` });
  for (const c of record) {
    for (const m of c.members) {
      const q = storeByRef.get(m.ref);
      if (q === undefined) errs.push({ limb: "wording-lost", why: `member "${m.original}" has no row in the store` });
      else if (m.original !== q) errs.push({ limb: "wording-lost", why: `member "${m.original}" is stored as "${q}" — its original wording was changed` });
    }
  }

  const expected = humanRows.filter((r) => isHeldOut(r.query)).map((r) => sha(r.query)).sort();
  const h = heldOut;
  if (!h || h.ran !== true) errs.push({ limb: "held-out-unrun", why: "no held-out check ran" });
  else {
    const got = (h.results || []).map((x) => x.ref).sort();
    if (JSON.stringify(got) !== JSON.stringify(expected)) errs.push({ limb: "held-out-unrun", why: `the held-out results cover ${got.length} queries; the held-out population is ${expected.length}` });
    const by = (v) => (h.results || []).filter((x) => x.verdict === v).length;
    if (h.hits !== by("HIT") || h.misses !== by("MISS") || h.unscored !== by("UNSCORED") || h.hits + h.misses + h.unscored !== expected.length) {
      errs.push({ limb: "held-out-unrun", why: `reported ${h.hits} hit · ${h.misses} miss · ${h.unscored} unscored, but its own results say ${by("HIT")} · ${by("MISS")} · ${by("UNSCORED")} of ${expected.length}` });
    }
    if ((h.missed || []).length !== by("MISS")) errs.push({ limb: "held-out-unrun", why: `${by("MISS")} misses in the results, ${(h.missed || []).length} named` });

    const { merged, split } = compareToReference(h.inSampleClusters || [], reference, ambiguous);
    for (const x of merged) errs.push({ limb: "merged", why: `cluster ${x.cluster} merges ${Object.keys(x.intents).length} distinct intents: ${Object.entries(x.intents).map(([k, v]) => `${k} [${v.join(" · ")}]`).join(" + ")}` });
    for (const x of split) errs.push({ limb: "split", why: `intent ${x.intent} is split across ${x.clusters.length} clusters: ${x.clusters.map((c) => `[${c.members.join(" · ")}]`).join(" | ")}` });
  }

  /* 🔴 D-HELDOUT-1 — THE SAME COMPARISON, OVER THE WHOLE RECORD. Not a new rule and not a new qualifier: the same
   * `compareToReference`, the same reference, the same two directions — applied to the output the clusterer actually
   * produced rather than to the training half of it. */
  const overRecord = compareToReference(record || [], reference, ambiguous);
  for (const x of overRecord.merged) {
    errs.push({ limb: "record-merged", why: `cluster ${x.cluster} merges ${Object.keys(x.intents).length} distinct intents: ${Object.entries(x.intents).map(([k, v]) => `${k} [${v.join(" · ")}]`).join(" + ")}` });
  }
  for (const x of overRecord.split) {
    errs.push({ limb: "record-split", why: `intent ${x.intent} is split across ${x.clusters.length} clusters: ${x.clusters.map((c) => `[${c.members.join(" · ")}]`).join(" | ")}` });
  }

  if (lexicon) {
    const absent = lexiconWordsAbsentFrom(lexicon, humanRows.filter((r) => !isHeldOut(r.query)));
    if (absent.length) errs.push({ limb: "lexicon-held-out-word", why: `the lexicon holds ${absent.length} word(s) no in-sample query contains: ${absent.join(", ")}` });
  }
  return errs;
}

/** Every token a lexicon DECLARES: its phrase words and targets, synonym keys and targets, filler, slot values, intent words and exclusive entities. */
export function declaredTokens(lexicon) {
  const s = new Set();
  for (const [from, to] of lexicon.phrases || []) for (const w of `${from} ${to}`.split(" ")) s.add(w);
  for (const [k, v] of Object.entries(lexicon.synonyms || {})) [k, ...[].concat(v)].forEach((w) => s.add(w));
  [...(lexicon.filler || []), ...Object.values(lexicon.slotTypes || {}).flat(), ...(lexicon.intentWords || []), ...(lexicon.exclusive || []).flat()].forEach((w) => s.add(w));
  s.delete("");
  return s;
}

/** 🔴 THE NAMED REASON CODES A REMAINING SPLIT CAN CARRY. A code states what the structure shows — never what a word means. */
export const SPLIT_CAUSES = Object.freeze({
  SPLIT_UNKNOWN_TOKEN: "the member's key holds a token no in-sample key holds and the lexicon does not declare — the token is UNKNOWN; what it means is not for this code to say",
  SPLIT_NO_IN_SAMPLE_MEMBER: "the member's intent has no in-sample member, so the held-out protocol has nothing of its own to place it with",
  SPLIT_BELOW_THRESHOLD: "every token of the member's key is known, and its best placement is below the threshold — a pure threshold effect",
  SPLIT_IN_SAMPLE: "the intent's in-sample members themselves sit in more than one cluster",
});

/**
 * 🔴 WHY EACH REMAINING SPLIT IS A SPLIT — VISIBLE, WITH A NAMED REASON CODE (22 September 2026).
 *
 * For every intent the record splits, the members standing apart from the cluster(s) holding its in-sample members,
 * each with the codes its structure earns. An UNKNOWN token is listed and left UNKNOWN: this function never says a
 * word is an occupation, a place, a skill or a function word — that needs declared subject data or a human, and
 * missing vocabulary stays visible as SPLIT_UNKNOWN_TOKEN rather than being guessed. Evaluation only: it reads the
 * reference after clustering is done and changes no cluster.
 */
export function splitCauses({ humanRows, record, heldOut, reference, ambiguous = {}, lexicon }) {
  const { intentOf, ambiguous: amb } = referenceIndex(reference, ambiguous);
  const declared = declaredTokens(lexicon);
  const inSampleTokens = new Set(humanRows.filter((r) => !isHeldOut(r.query)).flatMap((r) => normalise(r.query, lexicon).key));
  const resultOf = new Map((heldOut?.results || []).map((r) => [r.ref, r]));
  const { split } = compareToReference(record, reference, ambiguous);
  return split.map(({ intent }) => {
    const homes = new Set();
    for (const c of record) if (c.members.some((m) => !m.heldOut && !amb.has(m.ref) && intentOf.get(m.ref) === intent)) homes.add(c.id);
    const members = record.flatMap((c) => c.members.filter((m) => !amb.has(m.ref) && intentOf.get(m.ref) === intent).map((m) => ({ m, cluster: c.id })));
    const apart = [];
    for (const { m, cluster } of members) {
      if (homes.has(cluster) && !(homes.size > 1 && !m.heldOut)) continue;
      const codes = [];
      if (!m.heldOut) codes.push("SPLIT_IN_SAMPLE");
      if (homes.size === 0) codes.push("SPLIT_NO_IN_SAMPLE_MEMBER");
      const unknown = m.key.filter((t) => !t.startsWith("<") && !inSampleTokens.has(t) && !declared.has(t));
      if (unknown.length) codes.push("SPLIT_UNKNOWN_TOKEN");
      if (m.heldOut && homes.size > 0 && unknown.length === 0) codes.push("SPLIT_BELOW_THRESHOLD");
      apart.push({ original: m.original, heldOut: m.heldOut, codes, unknownTokens: unknown, bestSimilarity: resultOf.get(m.ref)?.similarity ?? null });
    }
    apart.sort((a, b) => a.original.localeCompare(b.original));
    return { intent, inSample: members.filter((x) => !x.m.heldOut).length, heldOut: members.filter((x) => x.m.heldOut).length, codes: [...new Set(apart.flatMap((a) => a.codes))].sort(), apart };
  }).sort((a, b) => a.intent.localeCompare(b.intent));
}
