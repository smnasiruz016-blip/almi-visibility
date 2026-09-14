/**
 * 🔴 ROW 60 — THE OWNER'S RULING SHEET, GENERATED FROM THE STORE. NEVER TYPED.
 *
 * The consequence register waits on the owner's levels, and the owner rules from a sheet. That sheet was written
 * by hand three times, and each version carried a measurement error:
 *
 *   v1  `noindex` counted as 268 open when 134 had already been ruled SUPERSEDED
 *   v2  one column mixing two units — distinct issues against raw records
 *
 * and the first sheet's error had already gone out in PR #75's table.
 *
 * 🔴 THE CAUSE, NAMED: a state-change record carries NO CLASS FIELD. An issue's state is its FIRST recorded state
 * only until a change record moves it, and that change can only be tied to a class by joining on `issue_id`.
 * Reading each issue's own `state` field reports every superseded or closed issue as still OPEN.
 *
 * So nothing on this sheet is typed. Every count is derived by `lifecycleOf` (src/evidence/lifecycle.mjs) — the
 * one join this repository already has, which applies every state change to its issue in time order and refuses a
 * change that cannot apply. Every description and every level is copied from the register at generation time.
 *
 * ── THREE UNITS, NEVER MIXED IN ONE COLUMN ───────────────────────────────────
 *
 *   distinct   issues, by issue_id — the unit the owner rules on
 *   open       of those distinct issues, the ones still OPEN after every state change
 *   raw        issue RECORDS, duplicate copies included — its own column, so a duplicate can never pass for a ruling
 *
 * ── 🔴 IT PROPOSES NOTHING ───────────────────────────────────────────────────
 *
 * No level, no ordering by consequence, no harm wording. Classes are listed by name. A detector's `severity` is a
 * label about a measured defect and is never read here. LEVEL and WHY are left blank for the owner.
 *
 * This module names no product.
 */

import { lifecycleOf } from "../evidence/lifecycle.mjs";
import { UNCLASSIFIED } from "./consequence.mjs";

const COUNT_FIELDS = Object.freeze(["distinct", "open", "raw"]);

/**
 * @param {object}   a
 * @param {{file: string, records: object[]}[]} a.files  every file read — each one is reported, with what it held
 * @param {object}   a.register   the consequence register
 * @param {string}   a.generatedAt
 */
export function buildRulingSheet({ files, register, generatedAt }) {
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
    return {
      issue_class,
      what: register?.[issue_class]?.what ?? null,
      distinct: e.ids.size,
      open: states.OPEN ?? 0,
      raw: e.raw,
      ruled,
      currentLevel: register?.[issue_class]?.level ?? null,
      level: "",
      why: "",
    };
  });

  const links = all.filter((r) => r.record_type === "recommendation_evidence");
  const unreachable = [...new Set(all.filter((r) => r.record_type === "draft_recommendation").map((r) => r.recommendation_id))]
    .filter((id) => (links.filter((l) => l.recommendation_id === id).at(-1)?.issues ?? []).length === 0)
    .sort()
    .map((recommendation_id) => ({ recommendation_id, reason: "its evidence links no issue, so no finding class — and no register entry — can apply to it", ruling: "" }));

  return {
    _provenance: {
      title: "AlmiVisibility — row 60 owner ruling sheet",
      generatedAt,
      generatedBy: "bin/row60-ruling-sheet.mjs",
      covers: [
        "every finding class present on an issue record in the files listed under `sources`",
        "counts derived by applying every issue_state_change to its issue on issue_id (lifecycleOf)",
        "descriptions and current levels copied from config/consequence-register.mjs at generation time",
      ],
      doesNotCover: [
        "🔴 any consequence level — this sheet proposes none, and orders classes by name only",
        "🔴 a detector's `severity` field — it is not a consequence level and is not read",
      ],
      units: { distinct: "issues, by issue_id", open: "distinct issues still OPEN after every state change", raw: "issue records, duplicate copies included" },
    },
    sources,
    lifecycleErrors: life.errors,
    classes,
    unreachableByAnyEntry: unreachable,
    scale: { levelNames: "", order: "", consequenceAgainstVolume: "", keepUnclassifiedAsUnknown: "" },
  };
}

/**
 * The committed sheet, the register and the store must agree. Each disagreement names its LIMB, so a sabotage can
 * be shown to trip exactly one.
 *
 *   sheet ↔ store      missing-class · extra-class · count
 *   register ↔ store   stale-register · missing-register
 *   sheet ↔ register   register-text (for classes in use only)
 *   the join itself    lifecycle
 */
export function reconcileSheet({ sheet, fresh, register }) {
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
    if (s.what !== register?.[k]?.what || s.currentLevel !== register?.[k]?.level) {
      errors.push({ limb: "register-text", class: k, why: "the sheet's description or current level is not the register's" });
    }
    if (s.level !== "" || s.why !== "") errors.push({ limb: "register-text", class: k, why: "the sheet carries a level or reason — only the owner writes one, and not on the generated sheet" });
  }
  for (const k of inSheet.keys()) if (!inStore.has(k)) errors.push({ limb: "extra-class", class: k, why: "the sheet lists a class the store does not hold" });

  for (const k of Object.keys(register ?? {})) if (!inStore.has(k)) errors.push({ limb: "stale-register", class: k, why: "the register holds a class that is not in use" });
  for (const k of inStore.keys()) if (!register?.[k]) errors.push({ limb: "missing-register", class: k, why: "a class in use has no register entry" });

  return { errors, ok: errors.length === 0 && fresh.classes.length > 0 };
}

/** The human-readable sheet, rendered from the JSON alone — so the two cannot say different things. */
export function renderRulingSheet(sheet) {
  const L = [];
  L.push("# ALMIVISIBILITY — ROW 60 · CONSEQUENCE REGISTER · OWNER RULING SHEET");
  L.push("");
  L.push(`> 🔴 **GENERATED — DO NOT EDIT BY HAND.** \`node bin/row60-ruling-sheet.mjs --confirm\` writes it from the evidence store at ${sheet._provenance.generatedAt}.`);
  L.push("> Every count is derived by applying each state-change record to its issue on issue_id. Every description and");
  L.push("> current level is copied from `config/consequence-register.mjs`. **Nothing here proposes a level**, and classes are");
  L.push("> listed by name. A detector's `severity` is not a consequence level and is not shown.");
  L.push("");
  L.push("## Files read — every `.jsonl` under `runs/`");
  L.push("");
  L.push("| file | records | issue records | state changes | recommendations |");
  L.push("|---|---|---|---|---|");
  for (const s of sheet.sources) L.push(`| \`${s.file}\` | ${s.records} | ${s.issueRecords} | ${s.stateChanges} | ${s.recommendations} |`);
  const t = (k) => sheet.sources.reduce((n, s) => n + s[k], 0);
  L.push(`| **${sheet.sources.length} files** | **${t("records")}** | **${t("issueRecords")}** | **${t("stateChanges")}** | **${t("recommendations")}** |`);
  L.push("");
  L.push("## Part A — the scale (nothing can rank without it)");
  L.push("");
  L.push("- **A1 · level names:** ______________________________");
  L.push("- **A2 · their order, strongest first** (a level with no place in the order cannot rank): ______________________________");
  L.push("- **A3 · does a declared consequence outrank measured volume, or combine with it?** ______________________________");
  L.push("- **A4 · keep UNCLASSIFIED ranking as UNKNOWN, never as low (LAW-ABSENT-1)?** ______________________________");
  L.push("");
  L.push("## Part B — the finding classes");
  L.push("");
  L.push(`Units: **distinct** = ${sheet._provenance.units.distinct} · **open** = ${sheet._provenance.units.open} · **raw** = ${sheet._provenance.units.raw}.`);
  L.push("");
  L.push("| # | class | what it is (the register's words) | open | distinct | ruled | raw records | current level | LEVEL | WHY |");
  L.push("|---|---|---|---|---|---|---|---|---|---|");
  sheet.classes.forEach((c, i) => {
    const ruled = Object.entries(c.ruled).map(([s, n]) => `${n} ${s}`).join(" · ") || "—";
    L.push(`| ${i + 1} | \`${c.issue_class}\` | ${c.what ?? "🔴 no register entry"} | ${c.open} | ${c.distinct} | ${ruled} | ${c.raw} | ${c.currentLevel ?? "—"} | | |`);
  });
  L.push("");
  L.push("## Part C — recommendations no register entry can reach");
  L.push("");
  if (sheet.unreachableByAnyEntry.length === 0) L.push("None.");
  for (const u of sheet.unreachableByAnyEntry) L.push(`- \`${u.recommendation_id}\` — ${u.reason}. **Ruling (its own entry, or leave UNKNOWN):** ______________________________`);
  L.push("");
  L.push("A class left blank stays UNCLASSIFIED — a real state, not a gap. Each ruled level is written into");
  L.push("`config/consequence-register.mjs` with the owner's name, the date and the reason. Nothing else may set one.");
  return `${L.join("\n")}\n`;
}

export { UNCLASSIFIED };
