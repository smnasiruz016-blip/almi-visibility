/**
 * 🔴 ROW 60 — THE CONSEQUENCE SHEET, GENERATED FROM THE STORE. NEVER TYPED.
 *
 * It began as the owner's ruling sheet. That sheet was written by hand three times, and each version carried a
 * measurement error:
 *
 *   v1  `noindex` counted as 268 open when 134 had already been ruled SUPERSEDED
 *   v2  one column mixing two units — distinct issues against raw records
 *
 * and the first sheet's error had already gone out in PR #75's table. The owner ruled on 14 September 2026; the same
 * day seven classes were split (config/class-splits.mjs), and their halves arrive for him to rule in one pass — each
 * with blank LEVEL and WHY, beside the ten levels already ruled and attributed.
 *
 * 🔴 THE CAUSE, NAMED: a state-change record carries NO CLASS FIELD. An issue's state is its FIRST recorded state
 * only until a change record moves it, and that change can only be tied to a class by joining on `issue_id`.
 *
 * So nothing on this sheet is typed. Every count comes from `splitView` — the lifecycle join, with each issue counted
 * under the class its own stored fields place it in. Every description, level and attribution is copied from the
 * register at generation time; the scale from the owner's scale; the order is `orderByConsequence` over open counts.
 *
 * ── UNITS, NEVER MIXED IN ONE COLUMN ─────────────────────────────────────────
 *
 *   distinct   issues, by issue_id
 *   open       of those distinct issues, the ones still OPEN after every state change — the volume that amplifies
 *   raw        issue RECORDS, duplicate copies included
 *   not run    of the distinct issues, the ones that record a check that never ran — never a defect found
 *
 * A detector's `severity` is a label about a measured defect and is never read here.
 *
 * This module names no product.
 */

import { UNCLASSIFIED, consequenceFor, orderByConsequence } from "./consequence.mjs";
import { classOf, splitView, isUnmeasured, coverageClassesOf } from "./class-split.mjs";

const COUNT_FIELDS = Object.freeze(["distinct", "open", "raw", "notRun"]);

/**
 * @param {object}   a
 * @param {{file: string, records: object[]}[]} a.files  every file read — each one is reported, with what it held
 * @param {object}   a.register         the consequence register
 * @param {object}   a.unreachable      the register's Part C — recommendations no class-keyed entry can reach
 * @param {object[]} a.scale            the owner's severity scale
 * @param {object}   a.splits           the declared class splits
 * @param {object}   a.superseded       the register entries the splits superseded
 * @param {string[]} a.unmeasuredCodes  reason codes that mean no measurement was made
 * @param {string}   a.generatedAt
 */
export function buildRulingSheet({ files, register, unreachable = {}, scale, splits, superseded = {}, coverage = {}, decisions = {}, auditTrail = {}, unmeasuredCodes, generatedAt }) {
  const all = files.flatMap((f) => f.records);
  const { view, lifecycleErrors } = splitView(all, splits);

  const sources = files.map((f) => ({
    file: f.file,
    records: f.records.length,
    issueRecords: f.records.filter((r) => r.record_type === "issue").length,
    stateChanges: f.records.filter((r) => r.record_type === "issue_state_change").length,
    recommendations: f.records.filter((r) => r.record_type === "draft_recommendation").length,
  }));

  const byClass = new Map();
  const entryFor = (k) => byClass.get(k) ?? byClass.set(k, { raw: 0, ids: new Set() }).get(k);
  for (const r of all) {
    if (r.record_type !== "issue" || typeof r.issue_class !== "string") continue;
    const e = entryFor(classOf(r, splits).class);
    e.raw += 1;
    e.ids.add(r.issue_id);
  }

  // 🔴 An unmeasured check is not a finding (owner, 14 Sep 2026): coverage classes are counted apart and never ranked.
  const coverageClasses = coverageClassesOf(splits);
  const coverageRows = [...byClass.keys()].filter((k) => coverageClasses.has(k)).sort().map((issue_class) => {
    const e = byClass.get(issue_class);
    const reasonCodes = [...new Set([...e.ids].map((id) => view.get(id).reason_code))].sort();
    return { issue_class, splitFrom: coverage?.[issue_class]?.splitFrom ?? null, count: e.ids.size, raw: e.raw, reasonCodes, missing: coverage?.[issue_class]?.missing ?? null };
  });
  // 🔴 Option A (owner, 14 Sep 2026): a decision on record and the audit trail are not findings either — each apart.
  const measureOf = new Map(Object.values(splits ?? {}).flatMap((s) => s.halves.map((h) => [h.class, h.measures])));
  const ofMeasure = (m) => [...byClass.keys()].filter((k) => measureOf.get(k) === m).sort();
  const decisionRows = ofMeasure("decision").map((issue_class) => {
    const e = byClass.get(issue_class);
    const d = decisions?.[issue_class];
    return { issue_class, splitFrom: d?.splitFrom ?? null, count: e.ids.size, open: [...e.ids].filter((id) => view.get(id).state === "OPEN").length, raw: e.raw, decided: d?.decided ?? null, notEstablished: d?.notEstablished ?? null, awaits: d?.awaits ?? null };
  });
  const auditRows = ofMeasure("withdrawn").map((issue_class) => {
    const e = byClass.get(issue_class);
    const states = {};
    for (const id of e.ids) states[view.get(id).state] = (states[view.get(id).state] ?? 0) + 1;
    return { issue_class, splitFrom: auditTrail?.[issue_class]?.splitFrom ?? null, count: e.ids.size, raw: e.raw, states, why: auditTrail?.[issue_class]?.why ?? null };
  });
  const notFindings = new Set([...coverageClasses, ...decisionRows.map((d) => d.issue_class), ...auditRows.map((a) => a.issue_class)]);
  const classes = [...byClass.keys()].filter((k) => !notFindings.has(k)).sort().map((issue_class) => {
    const e = byClass.get(issue_class);
    const states = {};
    let notRun = 0;
    for (const id of e.ids) {
      const v = view.get(id);
      states[v.state] = (states[v.state] ?? 0) + 1;
      if (isUnmeasured(v, unmeasuredCodes)) notRun += 1;
    }
    const ruled = Object.fromEntries(Object.entries(states).filter(([s]) => s !== "OPEN").sort());
    const entry = register?.[issue_class];
    return {
      issue_class,
      what: entry?.what ?? null,
      splitFrom: entry?.splitFrom ?? null,
      distinct: e.ids.size,
      open: states.OPEN ?? 0,
      raw: e.raw,
      notRun,
      ruled,
      level: entry?.level ?? null,
      escalatedFrom: entry?.escalatedFrom ?? null,
      ruledBy: entry?.ruledBy ?? null,
      ruledOn: entry?.ruledOn ?? null,
    };
  });

  const order = orderByConsequence({
    items: classes.map((c) => ({ id: c.issue_class, consequence: consequenceFor([c.issue_class], register, scale), volume: c.open })),
    scale,
  });

  const supersededClasses = Object.entries(superseded)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([issue_class, e]) => ({ issue_class, level: e.level, ruledBy: e.ruledBy ?? null, supersededOn: e.supersededOn, supersededBy: [...e.supersededBy] }));

  const links = all.filter((r) => r.record_type === "recommendation_evidence");
  const unreachableByAnyEntry = [...new Set(all.filter((r) => r.record_type === "draft_recommendation").map((r) => r.recommendation_id))]
    .filter((id) => (links.filter((l) => l.recommendation_id === id).at(-1)?.issues ?? []).length === 0)
    .sort()
    .map((recommendation_id) => ({
      recommendation_id,
      reason: "its evidence links no issue, so no finding class — and no register entry — can apply to it",
      level: unreachable?.[recommendation_id]?.level ?? null,
      gap: unreachable?.[recommendation_id]?.gap ?? null,
      needs: unreachable?.[recommendation_id]?.needs ? [...unreachable[recommendation_id].needs] : null,
    }));

  return {
    _provenance: {
      title: "AlmiVisibility — row 60 consequence sheet",
      generatedAt,
      generatedBy: "bin/row60-ruling-sheet.mjs",
      covers: [
        "every finding class present on an issue record in the files listed under `sources`, as config/class-splits.mjs counts it",
        "counts derived by applying every issue_state_change to its issue on issue_id (lifecycleOf), per split class",
        "descriptions, levels, attributions and Part C gaps copied from config/consequence-register.mjs at generation time",
        "the scale copied from config/consequence-scale.mjs; the order computed consequence-first over the open counts",
      ],
      doesNotCover: [
        "🔴 any level the register does not declare — the sheet copies levels, it never sets one; a half's LEVEL and WHY are blank",
        "🔴 a detector's `severity` field — it is not a consequence level and is not read",
      ],
      units: {
        distinct: "issues, by issue_id",
        open: "distinct issues still OPEN after every state change",
        raw: "issue records, duplicate copies included",
        notRun: "distinct issues that record a check that never ran — not a defect found",
      },
    },
    sources,
    lifecycleErrors,
    scale: (scale ?? []).map((s) => ({ level: s.level, definition: s.definition })),
    classes,
    order,
    coverage: coverageRows,
    decisions: decisionRows,
    auditTrail: auditRows,
    populations: {
      FINDINGS: classes.reduce((n, c) => n + c.distinct, 0),
      "COVERAGE GAP": coverageRows.reduce((n, c) => n + c.count, 0),
      "DECISION ON RECORD": decisionRows.reduce((n, c) => n + c.count, 0),
      "AUDIT TRAIL": auditRows.reduce((n, c) => n + c.count, 0),
      distinct: view.size,
    },
    supersededClasses,
    unreachableByAnyEntry,
  };
}

/**
 * The committed sheet, the register, the scale and the store must agree. Each disagreement names its LIMB, so a
 * sabotage can be shown to trip exactly one.
 *
 *   sheet ↔ store      missing-class · extra-class · count · order
 *   register ↔ store   stale-register · missing-register
 *   sheet ↔ register   register-text (descriptions, levels, attributions, splits, superseded, Part C) · scale
 *   the join itself    lifecycle
 */
export function reconcileSheet({ sheet, fresh, register, unreachable = {}, scale, superseded = {}, coverage = {}, decisions = {}, auditTrail = {} }) {
  const errors = [];
  const inStore = new Map(fresh.classes.map((c) => [c.issue_class, c]));
  const inSheet = new Map((sheet?.classes ?? []).map((c) => [c.issue_class, c]));

  for (const e of fresh.lifecycleErrors) errors.push({ limb: "lifecycle", why: e });

  for (const [k, c] of inStore) {
    const s = inSheet.get(k);
    if (!s) {
      errors.push({ limb: "missing-class", class: k, why: "a class in the store is missing from the sheet" });
      continue;
    }
    for (const f of COUNT_FIELDS) {
      if (s[f] !== c[f]) errors.push({ limb: "count", class: k, why: `${f} reads ${s[f]} on the sheet and ${c[f]} in the store` });
    }
    if (JSON.stringify(s.ruled) !== JSON.stringify(c.ruled)) errors.push({ limb: "count", class: k, why: `rulings read ${JSON.stringify(s.ruled)} on the sheet and ${JSON.stringify(c.ruled)} in the store` });
    const e = register?.[k];
    const same = s.what === e?.what && s.level === e?.level && s.escalatedFrom === (e?.escalatedFrom ?? null) && s.splitFrom === (e?.splitFrom ?? null) && s.ruledBy === (e?.ruledBy ?? null) && s.ruledOn === (e?.ruledOn ?? null);
    if (!same) errors.push({ limb: "register-text", class: k, why: "the sheet's description, level, attribution, escalation or split is not the register's" });
  }
  for (const k of inSheet.keys()) if (!inStore.has(k)) errors.push({ limb: "extra-class", class: k, why: "the sheet lists a class the store does not hold" });

  for (const k of Object.keys(register ?? {})) if (!inStore.has(k)) errors.push({ limb: "stale-register", class: k, why: "the register holds a class that is not in use" });
  for (const k of inStore.keys()) if (!register?.[k]) errors.push({ limb: "missing-register", class: k, why: "a class in use has no register entry" });

  // the coverage population: its counts are the store's, its words the coverage register's, and none of it is ranked
  if (JSON.stringify(sheet?.coverage) !== JSON.stringify(fresh.coverage)) errors.push({ limb: "coverage", why: "the sheet's coverage population is not the one the store and the coverage register produce" });
  for (const c of fresh.coverage) if (c.missing === null || c.missing !== (coverage?.[c.issue_class]?.missing ?? null)) errors.push({ limb: "coverage", class: c.issue_class, why: "a coverage class has no coverage-register entry" });
  // the decisions on record and the audit trail: counts the store's, words their registers', and the four totals summing to the store
  for (const [key, reg, words] of [["decisions", decisions, ["decided", "notEstablished", "awaits"]], ["auditTrail", auditTrail, ["why"]]]) {
    if (JSON.stringify(sheet?.[key]) !== JSON.stringify(fresh[key])) errors.push({ limb: "populations", why: `the sheet's ${key} are not the ones the store and their register produce` });
    for (const row of fresh[key]) if (words.some((w) => row[w] === null || row[w] !== reg?.[row.issue_class]?.[w])) errors.push({ limb: "populations", class: row.issue_class, why: `a ${key} class has no entry in its register, or its words differ` });
  }
  const p = fresh.populations;
  if (JSON.stringify(sheet?.populations) !== JSON.stringify(p) || p.FINDINGS + p["COVERAGE GAP"] + p["DECISION ON RECORD"] + p["AUDIT TRAIL"] !== p.distinct) {
    errors.push({ limb: "populations", why: "the four populations on the sheet do not sum to the store's distinct issues, or differ from the store" });
  }
  if (JSON.stringify(sheet?.order) !== JSON.stringify(fresh.order)) errors.push({ limb: "order", why: "the sheet's consequence-first order is not the order the store and the register produce" });
  if (JSON.stringify(sheet?.scale) !== JSON.stringify((scale ?? []).map((s) => ({ level: s.level, definition: s.definition })))) {
    errors.push({ limb: "scale", why: "the sheet's scale is not the owner's scale" });
  }
  if (JSON.stringify(sheet?.supersededClasses) !== JSON.stringify(fresh.supersededClasses) || Object.keys(superseded).length !== (sheet?.supersededClasses ?? []).length) {
    errors.push({ limb: "register-text", why: "the sheet's superseded classes are not the register's" });
  }
  for (const u of sheet?.unreachableByAnyEntry ?? []) {
    const e = unreachable?.[u.recommendation_id];
    if (u.level !== (e?.level ?? null) || u.gap !== (e?.gap ?? null) || JSON.stringify(u.needs) !== JSON.stringify(e?.needs ? [...e.needs] : null)) {
      errors.push({ limb: "register-text", class: u.recommendation_id, why: "the sheet's Part C is not the register's" });
    }
  }

  return { errors, ok: errors.length === 0 && fresh.classes.length > 0 };
}

/** The human-readable sheet, rendered from the JSON alone — so the two cannot say different things. */
export function renderRulingSheet(sheet) {
  const L = [];
  L.push("# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · RULED 14 SEPTEMBER 2026 · SEVEN CLASSES SPLIT");
  L.push("");
  L.push(`> 🔴 **GENERATED — DO NOT EDIT BY HAND.** \`node bin/row60-ruling-sheet.mjs --confirm\` writes it from the evidence store at ${sheet._provenance.generatedAt}.`);
  L.push("> Every count is derived by applying each state-change record to its issue on issue_id, with each issue counted under");
  L.push("> the class its own stored fields place it in (`config/class-splits.mjs`). Every description, level and attribution is");
  L.push("> copied from `config/consequence-register.mjs`, the scale from `config/consequence-scale.mjs`. The sheet sets no level.");
  L.push("> A detector's `severity` is not a consequence level and is not shown.");
  L.push("");
  L.push("## Files read — every `.jsonl` under `runs/`");
  L.push("");
  L.push("| file | records | issue records | state changes | recommendations |");
  L.push("|---|---|---|---|---|");
  for (const s of sheet.sources) L.push(`| \`${s.file}\` | ${s.records} | ${s.issueRecords} | ${s.stateChanges} | ${s.recommendations} |`);
  const t = (k) => sheet.sources.reduce((n, s) => n + s[k], 0);
  L.push(`| **${sheet.sources.length} files** | **${t("records")}** | **${t("issueRecords")}** | **${t("stateChanges")}** | **${t("recommendations")}** |`);
  L.push("");
  L.push("## Part A — the owner's scale, strongest first");
  L.push("");
  for (const s of sheet.scale) L.push(`- **${s.level}** — ${s.definition}`);
  L.push("");
  L.push(`**${UNCLASSIFIED} is not a level.** It is UNKNOWN: never low, never ranked, routed to owner review (A4).`);
  L.push("");
  const ruledRows = sheet.classes.filter((c) => c.level !== UNCLASSIFIED);
  const openRows = sheet.classes.filter((c) => c.level === UNCLASSIFIED);
  const u = sheet._provenance.units;
  L.push(`Units: **distinct** = ${u.distinct} · **open** = ${u.open} · **raw** = ${u.raw} · **not run** = ${u.notRun}.`);
  L.push("");
  L.push(`## Part B — the ${ruledRows.length} levels already ruled (unchanged, attributed)`);
  L.push("");
  L.push("| # | class | what it is (the register's words) | open | distinct | ruled states | raw | not run | level | ruled by |");
  L.push("|---|---|---|---|---|---|---|---|---|---|");
  const states = (c) => Object.entries(c.ruled).map(([s, n]) => `${n} ${s}`).join(" · ") || "—";
  ruledRows.forEach((c, i) => {
    const level = `${c.level ?? "🔴 no register entry"}${c.escalatedFrom ? ` (escalated from ${c.escalatedFrom})` : ""}`;
    L.push(`| ${i + 1} | \`${c.issue_class}\` | ${c.what ?? "🔴 no register entry"} | ${c.open} | ${c.distinct} | ${states(c)} | ${c.raw} | ${c.notRun} | ${level} | ${c.ruledBy ?? "—"} ${c.ruledOn ?? ""} |`);
  });
  L.push("");
  L.push(`## Part B1 — the ${openRows.length} finding classes for the owner to rule: LEVEL and WHY are blank`);
  L.push("");
  L.push("A half is a new class: no level of the class it was split from carries to it. A class whose name ends");
  L.push("`-check-not-run` holds checks that never ran — nothing was found in it, and nothing was ruled out.");
  L.push("");
  L.push("| # | class | split from | what it is (the register's words) | open | distinct | ruled states | raw | not run | LEVEL | WHY |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|");
  openRows.forEach((c, i) => {
    L.push(`| ${i + 1} | \`${c.issue_class}\` | ${c.splitFrom ? `\`${c.splitFrom}\`` : "—"} | ${c.what ?? "🔴 no register entry"} | ${c.open} | ${c.distinct} | ${states(c)} | ${c.raw} | ${c.notRun} | | |`);
  });
  L.push("");
  L.push("## Part B2 — the consequence-first order");
  L.push("");
  L.push("Consequence first; the open count only amplifies INSIDE a level; the class name is the last, deterministic tie-break.");
  L.push("");
  L.push("| rank | class | level | open |");
  L.push("|---|---|---|---|");
  for (const r of sheet.order.ranked) L.push(`| ${r.rank} of ${r.of} | \`${r.id}\` | ${r.level} | ${r.volume} |`);
  for (const x of sheet.order.unranked) L.push(`| — | \`${x.id}\` | UNCLASSIFIED → ${x.route} | ${sheet.classes.find((c) => c.issue_class === x.id)?.open ?? "—"} |`);
  L.push("");
  L.push("## Part D — THE COVERAGE POPULATION: checks that never ran. Not findings, never a level, never ranked");
  L.push("");
  L.push("A check that never ran says nothing about the product. It says something about our instrument: we could not look.");
  L.push("");
  L.push("| class | split from | checks not run | raw | reason codes | what is missing |");
  L.push("|---|---|---|---|---|---|");
  for (const c of sheet.coverage) L.push(`| \`${c.issue_class}\` | ${c.splitFrom ? `\`${c.splitFrom}\`` : "—"} | ${c.count} | ${c.raw} | ${c.reasonCodes.join(" / ")} | ${c.missing ?? "🔴 no coverage entry"} |`);
  L.push(`| **total** | | **${sheet.coverage.reduce((n, c) => n + c.count, 0)}** | | | |`);
  L.push("");
  L.push("## Part E — DECISIONS ON RECORD: a deliberate choice whose consequence is not established. Never a level, never ranked — it waits on the owner");
  L.push("");
  L.push("| class | split from | issues | open | raw | what was decided | why its consequence is not established | waits on |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const d of sheet.decisions) L.push(`| \`${d.issue_class}\` | ${d.splitFrom ? `\`${d.splitFrom}\`` : "—"} | ${d.count} | ${d.open} | ${d.raw} | ${d.decided ?? "🔴 no entry"} | ${d.notEstablished ?? "🔴 no entry"} | ${d.awaits ? `\`${d.awaits}\`` : "🔴 none"} |`);
  L.push("");
  L.push("## Part F — THE AUDIT TRAIL: claims withdrawn as wrong. History, never live");
  L.push("");
  L.push("| class | split from | issues | states | raw | why it was withdrawn |");
  L.push("|---|---|---|---|---|---|");
  for (const a of sheet.auditTrail) L.push(`| \`${a.issue_class}\` | ${a.splitFrom ? `\`${a.splitFrom}\`` : "—"} | ${a.count} | ${Object.entries(a.states).map(([s, n]) => `${n} ${s}`).join(" · ")} | ${a.raw} | ${a.why ?? "🔴 no entry"} |`);
  L.push("");
  const pp = sheet.populations;
  L.push(`**Every issue in exactly one population:** findings **${pp.FINDINGS}** + coverage gaps **${pp["COVERAGE GAP"]}** + decisions on record **${pp["DECISION ON RECORD"]}** + audit trail **${pp["AUDIT TRAIL"]}** = **${pp.FINDINGS + pp["COVERAGE GAP"] + pp["DECISION ON RECORD"] + pp["AUDIT TRAIL"]}** of **${pp.distinct}** distinct issues.`);
  L.push("");
  L.push("## Part B3 — the classes the split superseded (not in use; their words kept in the register)");
  L.push("");
  L.push("| class | its level before the split | became |");
  L.push("|---|---|---|");
  for (const s of sheet.supersededClasses) L.push(`| \`${s.issue_class}\` | ${s.level}${s.ruledBy ? ` (${s.ruledBy})` : ""} — carries to neither half | ${s.supersededBy.map((h) => `\`${h}\``).join(" + ")} |`);
  L.push("");
  L.push("## Part C — recommendations no register entry can reach");
  L.push("");
  if (sheet.unreachableByAnyEntry.length === 0) L.push("None.");
  for (const x of sheet.unreachableByAnyEntry) {
    L.push(`- \`${x.recommendation_id}\` — ${x.reason}. **${x.level ?? "🔴 no Part C entry"}**${x.gap ? ` — ${x.gap}` : ""}${x.needs ? ` Needs, defined and tested: ${x.needs.join("; ")}.` : ""}`);
  }
  L.push("");
  L.push("Each level is ruled by the owner and written into `config/consequence-register.mjs` with his name, the date and");
  L.push("the reason. Nothing else may set one.");
  return `${L.join("\n")}\n`;
}

export { UNCLASSIFIED };
