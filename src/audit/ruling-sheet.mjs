/**
 * 🔴 ROW 60 — THE CONSEQUENCE SHEET, GENERATED FROM THE STORE. NEVER TYPED.
 *
 * It began as the owner's ruling sheet. That sheet was written by hand three times, and each version carried a
 * measurement error:
 *
 *   v1  `noindex` counted as 268 open when 134 had already been ruled SUPERSEDED
 *   v2  one column mixing two units — distinct issues against raw records
 *
 * and the first sheet's error had already gone out in PR #75's table. The owner ruled on 14 September 2026; the
 * sheet now shows that ruling beside the store's numbers, and still refuses to print a disagreement.
 *
 * 🔴 THE CAUSE, NAMED: a state-change record carries NO CLASS FIELD. An issue's state is its FIRST recorded state
 * only until a change record moves it, and that change can only be tied to a class by joining on `issue_id`.
 *
 * So nothing on this sheet is typed. Every count is derived by `lifecycleOf` (src/evidence/lifecycle.mjs), which
 * applies every state change to its issue in time order and refuses a change that cannot apply. Every description,
 * level and Part C gap is copied from the register at generation time; the scale from the owner's scale; the order
 * is `orderByConsequence` over the store's open counts.
 *
 * ── THREE UNITS, NEVER MIXED IN ONE COLUMN ───────────────────────────────────
 *
 *   distinct   issues, by issue_id
 *   open       of those distinct issues, the ones still OPEN after every state change — the volume that amplifies
 *   raw        issue RECORDS, duplicate copies included — its own column, so a duplicate can never pass for a ruling
 *
 * A detector's `severity` is a label about a measured defect and is never read here.
 *
 * This module names no product.
 */

import { lifecycleOf } from "../evidence/lifecycle.mjs";
import { UNCLASSIFIED, consequenceFor, orderByConsequence } from "./consequence.mjs";

const COUNT_FIELDS = Object.freeze(["distinct", "open", "raw"]);

/**
 * @param {object}   a
 * @param {{file: string, records: object[]}[]} a.files  every file read — each one is reported, with what it held
 * @param {object}   a.register     the consequence register
 * @param {object}   a.unreachable  the register's Part C — recommendations no class-keyed entry can reach
 * @param {object[]} a.scale        the owner's severity scale
 * @param {string}   a.generatedAt
 */
export function buildRulingSheet({ files, register, unreachable = {}, scale, generatedAt }) {
  const all = files.flatMap((f) => f.records);
  const life = lifecycleOf(all);

  const sources = files.map((f) => ({
    file: f.file,
    records: f.records.length,
    issueRecords: f.records.filter((r) => r.record_type === "issue").length,
    stateChanges: f.records.filter((r) => r.record_type === "issue_state_change").length,
    recommendations: f.records.filter((r) => r.record_type === "draft_recommendation").length,
  }));

  const byClass = new Map();
  for (const r of all) {
    if (r.record_type !== "issue" || typeof r.issue_class !== "string") continue;
    const e = byClass.get(r.issue_class) ?? { raw: 0, ids: new Set() };
    e.raw += 1;
    e.ids.add(r.issue_id);
    byClass.set(r.issue_class, e);
  }

  const classes = [...byClass.keys()].sort().map((issue_class) => {
    const e = byClass.get(issue_class);
    const states = {};
    for (const id of e.ids) {
      const s = life.issues.get(id)?.state ?? "OPEN";
      states[s] = (states[s] ?? 0) + 1;
    }
    const ruled = Object.fromEntries(Object.entries(states).filter(([s]) => s !== "OPEN").sort());
    const entry = register?.[issue_class];
    return {
      issue_class,
      what: entry?.what ?? null,
      distinct: e.ids.size,
      open: states.OPEN ?? 0,
      raw: e.raw,
      ruled,
      level: entry?.level ?? null,
      escalatedFrom: entry?.escalatedFrom ?? null,
    };
  });

  const order = orderByConsequence({
    items: classes.map((c) => ({ id: c.issue_class, consequence: consequenceFor([c.issue_class], register, scale), volume: c.open })),
    scale,
  });

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
        "every finding class present on an issue record in the files listed under `sources`",
        "counts derived by applying every issue_state_change to its issue on issue_id (lifecycleOf)",
        "descriptions, levels and Part C gaps copied from config/consequence-register.mjs at generation time",
        "the scale copied from config/consequence-scale.mjs; the order computed consequence-first over the open counts",
      ],
      doesNotCover: [
        "🔴 any level the register does not declare — the sheet copies levels, it never sets one",
        "🔴 a detector's `severity` field — it is not a consequence level and is not read",
      ],
      units: { distinct: "issues, by issue_id", open: "distinct issues still OPEN after every state change", raw: "issue records, duplicate copies included" },
    },
    sources,
    lifecycleErrors: life.errors,
    scale: (scale ?? []).map((s) => ({ level: s.level, definition: s.definition })),
    classes,
    order,
    unreachableByAnyEntry,
  };
}

/**
 * The committed sheet, the register, the scale and the store must agree. Each disagreement names its LIMB, so a
 * sabotage can be shown to trip exactly one.
 *
 *   sheet ↔ store      missing-class · extra-class · count · order
 *   register ↔ store   stale-register · missing-register
 *   sheet ↔ register   register-text (descriptions, levels, escalations, Part C) · scale
 *   the join itself    lifecycle
 */
export function reconcileSheet({ sheet, fresh, register, unreachable = {}, scale }) {
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
    if (s.what !== register?.[k]?.what || s.level !== register?.[k]?.level || s.escalatedFrom !== (register?.[k]?.escalatedFrom ?? null)) {
      errors.push({ limb: "register-text", class: k, why: "the sheet's description, level or escalation is not the register's" });
    }
  }
  for (const k of inSheet.keys()) if (!inStore.has(k)) errors.push({ limb: "extra-class", class: k, why: "the sheet lists a class the store does not hold" });

  for (const k of Object.keys(register ?? {})) if (!inStore.has(k)) errors.push({ limb: "stale-register", class: k, why: "the register holds a class that is not in use" });
  for (const k of inStore.keys()) if (!register?.[k]) errors.push({ limb: "missing-register", class: k, why: "a class in use has no register entry" });

  if (JSON.stringify(sheet?.order) !== JSON.stringify(fresh.order)) errors.push({ limb: "order", why: "the sheet's consequence-first order is not the order the store and the register produce" });
  if (JSON.stringify(sheet?.scale) !== JSON.stringify((scale ?? []).map((s) => ({ level: s.level, definition: s.definition })))) {
    errors.push({ limb: "scale", why: "the sheet's scale is not the owner's scale" });
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
  L.push("# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · RULED 14 SEPTEMBER 2026");
  L.push("");
  L.push(`> 🔴 **GENERATED — DO NOT EDIT BY HAND.** \`node bin/row60-ruling-sheet.mjs --confirm\` writes it from the evidence store at ${sheet._provenance.generatedAt}.`);
  L.push("> Every count is derived by applying each state-change record to its issue on issue_id. Every description, level");
  L.push("> and Part C gap is copied from `config/consequence-register.mjs`, the scale from `config/consequence-scale.mjs`.");
  L.push("> The sheet sets no level. A detector's `severity` is not a consequence level and is not shown.");
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
  L.push("## Part B — the finding classes, by name");
  L.push("");
  L.push(`Units: **distinct** = ${sheet._provenance.units.distinct} · **open** = ${sheet._provenance.units.open} · **raw** = ${sheet._provenance.units.raw}.`);
  L.push("");
  L.push("| # | class | what it is (the register's words) | open | distinct | ruled | raw records | level |");
  L.push("|---|---|---|---|---|---|---|---|");
  sheet.classes.forEach((c, i) => {
    const ruled = Object.entries(c.ruled).map(([s, n]) => `${n} ${s}`).join(" · ") || "—";
    const level = `${c.level ?? "🔴 no register entry"}${c.escalatedFrom ? ` (escalated from ${c.escalatedFrom})` : ""}`;
    L.push(`| ${i + 1} | \`${c.issue_class}\` | ${c.what ?? "🔴 no register entry"} | ${c.open} | ${c.distinct} | ${ruled} | ${c.raw} | ${level} |`);
  });
  L.push("");
  L.push("## Part B2 — the consequence-first order");
  L.push("");
  L.push("Consequence first; the open count only amplifies INSIDE a level; the class name is the last, deterministic tie-break.");
  L.push("");
  L.push("| rank | class | level | open |");
  L.push("|---|---|---|---|");
  for (const r of sheet.order.ranked) L.push(`| ${r.rank} of ${r.of} | \`${r.id}\` | ${r.level} | ${r.volume} |`);
  for (const u of sheet.order.unranked) L.push(`| — | \`${u.id}\` | UNCLASSIFIED → ${u.route} | ${sheet.classes.find((c) => c.issue_class === u.id)?.open ?? "—"} |`);
  L.push("");
  L.push("## Part C — recommendations no register entry can reach");
  L.push("");
  if (sheet.unreachableByAnyEntry.length === 0) L.push("None.");
  for (const u of sheet.unreachableByAnyEntry) {
    L.push(`- \`${u.recommendation_id}\` — ${u.reason}. **${u.level ?? "🔴 no Part C entry"}**${u.gap ? ` — ${u.gap}` : ""}${u.needs ? ` Needs, defined and tested: ${u.needs.join("; ")}.` : ""}`);
  }
  L.push("");
  L.push("Each level was ruled by the owner and is written into `config/consequence-register.mjs` with his name, the date");
  L.push("and the reason. Nothing else may set one.");
  return `${L.join("\n")}\n`;
}

export { UNCLASSIFIED };
