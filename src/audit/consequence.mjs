/**
 * 🔴 ROW 60 — CONSEQUENCE-WEIGHTED PRIORITY. THE ENGINE APPLIES A DECLARED JUDGEMENT; IT NEVER MAKES ONE.
 *
 * Priority by measured volume (item 51) cannot see harm, and harm is a judgement, not a measurement. So the
 * levels live in a register the OWNER controls (config/consequence-register.mjs), and this module does exactly
 * three things with it:
 *
 *   reconcileRegister  the register against the finding classes ACTUALLY PRESENT in the store, line by line —
 *                      a class with no entry, an entry for a class not in use (stale), an entry without its
 *                      what / level / why, or a level no owner ruled
 *   consequenceFor     the entries that apply to a set of classes, and whether a consequence is DECLARED or UNKNOWN
 *   priorityCensus     every presented recommendation's priority states its basis and the register entries that
 *                      applied, and no level appears that the register does not declare
 *
 * 🔴 UNCLASSIFIED NEVER DEFAULTS TO LOW (LAW-ABSENT-1). An unrated class is UNKNOWN and says so — it is not
 * ranked, not treated as small, and not left out. There is no order of levels in this module: until the owner
 * declares one, a consequence-weighted rank cannot exist and is reported UNKNOWN.
 *
 * This module names no product.
 */

export const UNCLASSIFIED = "UNCLASSIFIED";
export const BASIS_KINDS = Object.freeze(["MEASURED VOLUME", "DECLARED CONSEQUENCE", "BOTH", "NONE"]);

const filled = (s) => typeof s === "string" && s.trim().length > 0;

/** The finding classes actually present on issue records. */
export function classesInUse(records = []) {
  return [...new Set(records.filter((r) => r.record_type === "issue" && filled(r.issue_class)).map((r) => r.issue_class))].sort();
}

export function reconcileRegister({ records, register }) {
  const inUse = classesInUse(records);
  const declared = Object.keys(register ?? {}).sort();
  const missing = inUse.filter((k) => !declared.includes(k));
  const stale = declared.filter((k) => !inUse.includes(k));
  const invalid = [];
  for (const k of declared) {
    const e = register[k];
    if (!filled(e?.what)) invalid.push({ class: k, why: "the entry does not say what the class is" });
    if (!filled(e?.level)) invalid.push({ class: k, why: "the entry has no level — UNCLASSIFIED must be written, never implied" });
    if (!filled(e?.why)) invalid.push({ class: k, why: "the entry does not say why it has that level" });
    if (filled(e?.level) && e.level !== UNCLASSIFIED && !(e.ruledBy === "owner" && /^\d{4}-\d{2}-\d{2}$/.test(e.ruledOn ?? ""))) {
      invalid.push({ class: k, why: `level ${e.level} carries no dated owner ruling — only the owner sets a consequence level` });
    }
  }
  return {
    classesInUse: inUse,
    entries: declared.length,
    missing,
    stale,
    invalid,
    unclassified: declared.filter((k) => register[k]?.level === UNCLASSIFIED),
    ok: inUse.length > 0 && !missing.length && !stale.length && !invalid.length,
    vacuous: inUse.length === 0,
  };
}

/** The register entries that apply to these finding classes, and the consequence they declare. */
export function consequenceFor(classes = [], register) {
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
  return { state: "DECLARED", entries };
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
