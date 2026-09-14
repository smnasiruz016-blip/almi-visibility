/**
 * 🔴 ROW 60 — CONSEQUENCE-WEIGHTED PRIORITY. THE ENGINE APPLIES A DECLARED JUDGEMENT; IT NEVER MAKES ONE.
 *
 * Priority by measured volume (item 51) cannot see harm, and harm is a judgement, not a measurement. So the
 * levels live in a register the OWNER controls (config/consequence-register.mjs), on a scale the owner ruled
 * (config/consequence-scale.mjs, 14 September 2026), and this module does exactly these things with them:
 *
 *   scaleErrors         the scale holds levels only — UNCLASSIFIED, UNKNOWN, INFORMATIONAL and OBSERVATION are
 *                       classification or reporting STATES and are refused on it (A4)
 *   reconcileRegister   the register against the finding classes ACTUALLY PRESENT in the store, line by line — a
 *                       class with no entry, a stale entry, a PARTIAL entry (any of the six parts missing), a level
 *                       not on the scale, a level no owner ruled, an escalation of more than one level
 *   consequenceFor      the entries that apply to a set of classes, and whether a consequence is DECLARED or UNKNOWN
 *   orderByConsequence  consequence FIRST, strongest-first; volume only as an amplifier INSIDE a level; the name
 *                       as the last, deterministic tie-break (A2, A3). An UNKNOWN consequence is never ranked
 *   orderErrors         the order checked from the register, independently of the code that produced it
 *   determinismErrors   the same evidence, presented in a different order, must order identically (A2)
 *   priorityCensus      every presented recommendation's priority states its basis and the entries that applied
 *
 * 🔴 UNCLASSIFIED NEVER DEFAULTS TO LOW (LAW-ABSENT-1, A4). An unrated class is UNKNOWN and says so — it is not
 * ranked, not treated as small, not placed last, and not left out: it is routed to owner review.
 *
 * This module names no product, and holds no level of its own: every level it knows arrives in the scale passed in.
 */

import { effectiveClassesInUse, coverageClassesOf } from "./class-split.mjs";

export const UNCLASSIFIED = "UNCLASSIFIED";
export const BASIS_KINDS = Object.freeze(["MEASURED VOLUME", "DECLARED CONSEQUENCE", "BOTH", "NONE"]);

/** A4 — states, never severities. None of these may appear on a scale. */
export const NOT_SEVERITIES = Object.freeze(["UNCLASSIFIED", "UNKNOWN", "INFORMATIONAL", "OBSERVATION"]);

/** The six parts of a classified entry. The finding class is the key; the other five are fields. */
export const ENTRY_PARTS = Object.freeze(["level", "consequence", "reversibility", "blastRadius", "why"]);

const filled = (s) => typeof s === "string" && s.trim().length > 0;
const levelsOf = (scale) => (Array.isArray(scale) ? scale.map((s) => s?.level) : []);

export function scaleErrors(scale) {
  const errors = [];
  if (!Array.isArray(scale) || scale.length === 0) return [{ limb: "scale", why: "no severity scale was supplied — nothing can be ranked without the owner's scale" }];
  const seen = new Set();
  for (const s of scale) {
    if (!filled(s?.level) || !filled(s?.definition)) errors.push({ limb: "scale", why: `a scale entry lacks its level or its definition: ${JSON.stringify(s)}` });
    if (NOT_SEVERITIES.includes(s?.level)) errors.push({ limb: "scale", why: `${s.level} is a classification or reporting STATE, not a severity — it may never be a member of the scale (A4)` });
    if (seen.has(s?.level)) errors.push({ limb: "scale", why: `${s.level} appears twice on the scale` });
    seen.add(s?.level);
  }
  return errors;
}

/** The finding classes actually present on issue records. */
export function classesInUse(records = []) {
  return [...new Set(records.filter((r) => r.record_type === "issue" && filled(r.issue_class)).map((r) => r.issue_class))].sort();
}

export function reconcileRegister({ records, register, scale, splits }) {
  // 🔴 The classes in use are the SPLIT classes (config/class-splits.mjs). Leaving the splits out would read the
  // store's stored names and quietly reconcile against a bundle — so they are required: pass {} for none.
  if (splits === undefined) throw new TypeError("reconcileRegister needs the declared class splits — pass {} for none, never leave them out");
  // 🔴 An unmeasured check is NOT a finding (owner, 14 Sep 2026): the coverage classes leave the findings population.
  const coverage = coverageClassesOf(splits);
  const inUse = effectiveClassesInUse(records, splits).filter((k) => !coverage.has(k));
  const declared = Object.keys(register ?? {}).sort();
  const missing = inUse.filter((k) => !declared.includes(k));
  const stale = declared.filter((k) => !inUse.includes(k) && !coverage.has(k));
  // a coverage class in this register is refused by coverageErrors (limb coverage-level), not reported as stale
  const onCoverage = declared.filter((k) => coverage.has(k));
  const levels = levelsOf(scale);
  const invalid = [];
  for (const k of declared) {
    const e = register[k];
    const bad = (why) => invalid.push({ class: k, why });
    if (!filled(e?.what)) bad("the entry does not say what the class is");
    if (!filled(e?.level)) {
      bad("the entry has no level — UNCLASSIFIED must be written, never implied");
      continue;
    }
    if (e.level === UNCLASSIFIED) {
      if (!filled(e.why)) bad("the entry does not say why it is UNCLASSIFIED");
      // An unclassified entry that carries a consequence has picked a half: that is a guessed level by another name.
      for (const p of ["consequence", "reversibility", "blastRadius"]) if (e[p] !== null && e[p] !== undefined) bad(`an UNCLASSIFIED entry carries a ${p} — its consequence is UNKNOWN, and writing one picks a half`);
      if (e.ruledBy === "owner" && (!filled(e.bundles) || !filled(e.split))) bad("a ruled UNCLASSIFIED entry must name what it bundles and the split that would fix it");
      continue;
    }
    // 🔴 A PARTIAL ENTRY IS REFUSED — all six, REVERSIBILITY included.
    for (const p of ENTRY_PARTS) if (!filled(e[p])) bad(`the entry has no ${p} — a classified entry states all six parts, and a partial one is refused`);
    if (!levels.includes(e.level)) bad(`level ${e.level} is not on the owner's scale (${levels.join(", ") || "no scale supplied"})`);
    if (!(e.ruledBy === "owner" && /^\d{4}-\d{2}-\d{2}$/.test(e.ruledOn ?? ""))) bad(`level ${e.level} carries no dated owner ruling — only the owner sets a consequence level`);
    if (e.escalatedFrom !== undefined) {
      const from = levels.indexOf(e.escalatedFrom);
      const to = levels.indexOf(e.level);
      if (from < 0 || to < 0 || from - to !== 1) bad(`escalatedFrom ${e.escalatedFrom} to ${e.level} is not one step up the scale — blast radius may escalate to the NEXT severity only (A3)`);
    }
  }
  // 🔴 A HALF IS A NEW CLASS: it arrives UNCLASSIFIED and unruled, and no parent's level carries down to it.
  const inherited = declared
    .filter((k) => register[k]?.splitFrom !== undefined)
    .filter((k) => {
      const e = register[k];
      if (e.level === UNCLASSIFIED && e.ruledBy === null && e.ruledOn === null) return false;
      // A half may carry a level only by a ruling that names THE HALF ITSELF. A parent ruling cannot — so a copy of it is refused.
      return !(e.ruledFor === k && e.ruledBy === "owner" && /^\d{4}-\d{2}-\d{2}$/.test(e.ruledOn ?? ""));
    })
    .map((k) => ({
      class: k,
      why: `a half of ${register[k].splitFrom} arrives with level ${register[k].level}${register[k].ruledBy ? ` ruled by ${register[k].ruledBy}` : ""} and no ruling that names the half itself — a half is a new class, and no parent level carries down`,
    }));
  return {
    classesInUse: inUse,
    entries: declared.length,
    missing,
    stale,
    invalid,
    inherited,
    onCoverage,
    unclassified: declared.filter((k) => register[k]?.level === UNCLASSIFIED),
    ok: inUse.length > 0 && !missing.length && !stale.length && !invalid.length && !inherited.length,
    vacuous: inUse.length === 0,
  };
}

/** The register entries that apply to these finding classes, and the consequence they declare. */
export function consequenceFor(classes = [], register, scale) {
  const unique = [...new Set(classes)].sort();
  if (!register) {
    return { state: "UNKNOWN", reason: "no consequence register was supplied to this computation", entries: unique.map((c) => ({ issue_class: c, level: null, inRegister: false })) };
  }
  const entries = unique.map((c) => ({ issue_class: c, level: register[c]?.level ?? UNCLASSIFIED, inRegister: Boolean(register[c]) }));
  if (entries.length === 0) {
    return { state: "UNKNOWN", reason: "its evidence links no finding class, so no register entry applies — its consequence is UNKNOWN, never low", entries };
  }
  const unrated = entries.filter((e) => e.level === UNCLASSIFIED);
  if (unrated.length) {
    return {
      state: "UNKNOWN",
      reason: `UNCLASSIFIED — ${unrated.map((e) => e.issue_class).join(", ")} ${unrated.length === entries.length ? "has" : "have"} no level the owner ruled; an unrated consequence is UNKNOWN, never low`,
      entries,
    };
  }
  const levels = levelsOf(scale);
  const off = entries.filter((e) => !levels.includes(e.level));
  if (off.length) return { state: "UNKNOWN", reason: `${off.map((e) => `${e.issue_class}=${e.level}`).join(", ")} is not on the owner's scale, so no consequence can be stated`, entries };
  // Consequence first: an item carries the STRONGEST level among the classes it applies.
  const level = entries.map((e) => e.level).sort((a, b) => levels.indexOf(a) - levels.indexOf(b))[0];
  return { state: "DECLARED", level, entries };
}

/**
 * 🔴 A2 · A3 — CONSEQUENCE FIRST, VOLUME AS AMPLIFIER INSIDE A LEVEL, NAME AS THE LAST TIE-BREAK.
 *
 * @param {object}   a
 * @param {{id: string, consequence: object, volume: number|null}[]} a.items
 * @param {object[]} a.scale
 * @returns {{ranked: object[], unranked: object[]}}
 */
export function orderByConsequence({ items = [], scale }) {
  const levels = levelsOf(scale);
  const declared = items.filter((i) => i.consequence?.state === "DECLARED" && levels.includes(i.consequence.level));
  const vol = (i) => (typeof i.volume === "number" ? i.volume : -1);
  const ranked = [...declared]
    .sort(
      (a, b) =>
        levels.indexOf(a.consequence.level) - levels.indexOf(b.consequence.level) || // 1–2: consequence (reversibility is inside the level)
        vol(b) - vol(a) || //                                                          3: blast radius / volume, INSIDE the level only
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0), //                                  A2: a deterministic last word
    )
    .map((i, n) => ({ id: i.id, rank: n + 1, of: declared.length, level: i.consequence.level, volume: typeof i.volume === "number" ? i.volume : null }));
  // 🔴 A4: an UNKNOWN consequence is NOT ranked — not last, not low, not on a fallback. It goes to owner review.
  const unranked = items
    .filter((i) => !declared.some((d) => d.id === i.id))
    .map((i) => ({ id: i.id, state: "UNKNOWN", route: "OWNER REVIEW", reason: `${i.consequence?.reason ?? "no consequence"} — routed to owner review; never ranked and never executed on a fallback` }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ranked, unranked };
}

/**
 * The order, checked from the REGISTER — never from the code that produced it. Each limb is its own, so a
 * sabotage can be shown to trip exactly one.
 *
 *   partial               an item missing from the order, or placed twice
 *   cross-level-amplifier a weaker level ranked above a stronger one — volume crossed a level boundary (A3)
 *   amplifier             inside one level, less volume ranked above more (A3)
 *   unclassified-ordered  a ranked item whose applied classes are not all on the scale by the register (A4)
 *   nearest-class         the classes an item's consequence applied are not the classes its own evidence links
 *
 * @param {{id: string, appliedClasses: string[], linkedClasses: string[], volume: number|null}[]} a.items
 */
export function orderErrors({ order, items = [], register, scale }) {
  const errors = [];
  const levels = levelsOf(scale);
  const ranked = order?.ranked ?? [];
  const placed = [...ranked.map((r) => r.id), ...(order?.unranked ?? []).map((u) => u.id)];
  for (const i of items) {
    const n = placed.filter((p) => p === i.id).length;
    if (n !== 1) errors.push({ limb: "partial", id: i.id, why: `placed ${n} times in the order — every item is ranked or routed to owner review, exactly once` });
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const i of items) {
    const applied = [...new Set(i.appliedClasses ?? [])].sort();
    const linked = [...new Set(i.linkedClasses ?? [])].sort();
    if (JSON.stringify(applied) !== JSON.stringify(linked)) {
      errors.push({ limb: "nearest-class", id: i.id, why: `its consequence applied [${applied.join(", ")}] but its evidence links [${linked.join(", ")}] — no entry is stretched to reach an item, and no nearest class is guessed` });
    }
  }
  for (const r of ranked) {
    const applied = byId.get(r.id)?.appliedClasses ?? [];
    const lv = applied.map((c) => register?.[c]?.level ?? UNCLASSIFIED);
    if (applied.length === 0 || lv.some((l) => !levels.includes(l))) {
      errors.push({ limb: "unclassified-ordered", id: r.id, why: `ranked ${r.rank} at ${r.level} while the register gives [${lv.join(", ") || "no class"}] — an UNCLASSIFIED consequence is UNKNOWN, never low, never ranked on a fallback` });
    }
  }
  for (let n = 1; n < ranked.length; n++) {
    const a = ranked[n - 1];
    const b = ranked[n];
    const la = levels.indexOf(a.level);
    const lb = levels.indexOf(b.level);
    if (la > lb) errors.push({ limb: "cross-level-amplifier", id: a.id, why: `${a.id} (${a.level}, volume ${a.volume}) ranks above ${b.id} (${b.level}, volume ${b.volume}) — volume never crosses a level; only a declared escalation does` });
    else if (la === lb && (a.volume ?? -1) < (b.volume ?? -1)) errors.push({ limb: "amplifier", id: a.id, why: `inside ${a.level}, ${a.id} (volume ${a.volume}) ranks above ${b.id} (volume ${b.volume}) — more volume is higher priority inside the same level` });
  }
  return errors;
}

/** 🔴 A2 — the same evidence never orders twice differently: presented forwards, reversed and rotated. */
export function determinismErrors({ order: orderFn = orderByConsequence, items = [], scale }) {
  const runs = [items, [...items].reverse(), [...items.slice(Math.floor(items.length / 2)), ...items.slice(0, Math.floor(items.length / 2))]];
  const outs = runs.map((xs) => JSON.stringify(orderFn({ items: xs, scale })));
  return outs.some((o) => o !== outs[0])
    ? [{ limb: "determinism", why: "the same evidence, presented in a different order, ordered differently — a ranking that depends on input order is not a classification (A2)" }]
    : [];
}

/**
 * Every presented recommendation's priority, checked against the register it was computed with.
 * @param {object[]} fields  computeRecommendationFields output
 */
export function priorityCensus({ fields = [], register }) {
  const errors = [];
  for (const f of fields) {
    const p = f.priority ?? {};
    const id = f.recommendation_id;
    if (!BASIS_KINDS.includes(p.basisKind)) errors.push({ limb: "basis", id, why: `its priority states no basis (got ${JSON.stringify(p.basisKind)})` });
    const c = p.consequence;
    if (!c || !Array.isArray(c.entries)) {
      errors.push({ limb: "entries", id, why: "its priority does not say which register entries applied" });
      continue;
    }
    for (const e of c.entries) {
      const declared = register?.[e.issue_class]?.level ?? UNCLASSIFIED;
      if (e.level !== declared) errors.push({ limb: "level", id, why: `class ${e.issue_class} carries level ${JSON.stringify(e.level)}, but the register declares ${declared} — the engine may not compute, infer or default a level` });
    }
    const unrated = c.entries.some((e) => e.level === UNCLASSIFIED) || c.entries.length === 0;
    if (unrated && c.state !== "UNKNOWN") errors.push({ limb: "unclassified-ranked", id, why: "an unclassified or absent consequence was not reported UNKNOWN" });
    if (unrated && ["DECLARED CONSEQUENCE", "BOTH"].includes(p.basisKind)) errors.push({ limb: "unclassified-ranked", id, why: `its priority claims a consequence basis (${p.basisKind}) while a class is unclassified` });
  }
  return { checked: fields.length, errors, ok: fields.length > 0 && errors.length === 0 };
}
