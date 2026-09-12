/**
 * v0.1 ITEM 6 — MARKDOWN / JSON / CSV EXPORTS (V5.1 §40; v0.1 CONTAINS, §62).
 *
 * ── 🔴 LAW-BOUND-1 APPLIES HERE HARDEST ────────────────────────────────────
 *
 * An export of a PARTIAL inventory that does not say PARTIAL is a confident
 * wrong answer ON DISK — and that is worse than one on screen, because a file
 * gets emailed, pasted into a plan, and read six weeks later by somebody who
 * never saw the run that produced it. The screen at least had a scrollback.
 *
 * So every export carries, in the file itself:
 *   · what it covers and what it does NOT
 *   · the coverageState / dataState of its inputs
 *   · every bound that shaped it
 *
 * ── 🔴 AND AN EXPORT MAY NEVER UPGRADE A STATE ─────────────────────────────
 *
 * UNKNOWN exports as UNKNOWN. FORBIDDEN exports as FORBIDDEN, never as 0.
 * `null` exports as an empty cell, never as a zero.
 *
 * This is the same law as `classify()` in the search layer, applied at the
 * boundary where data leaves the system. A serialiser that writes `0` for a
 * FORBIDDEN row has not formatted the data — it has changed the finding, and
 * the reader has no way to know.
 */

import { STATE_NEVER_UPGRADES, assertNoUpgrade } from "./state-guard.mjs";

export const EXPORT_FORMATS = Object.freeze(["markdown", "json", "csv"]);

/* ------------------------------------------------------------------ *
 * THE PROVENANCE BLOCK — every export begins with one.
 * ------------------------------------------------------------------ */

/**
 * `bounds` is required and may not be empty: an export with no stated bound
 * cannot be checked against the run that produced it.
 */
export function provenanceBlock({ title, generatedAt, covers, doesNotCover, states, bounds }) {
  if (!Array.isArray(covers) || covers.length === 0) throw new TypeError("an export must say what it covers");
  if (!Array.isArray(doesNotCover) || doesNotCover.length === 0) {
    throw new TypeError(
      "an export must say what it does NOT cover — the omission a reader cannot see is the one that misleads",
    );
  }
  if (!bounds || Object.keys(bounds).length === 0) {
    throw new Error(`LAW-BOUND-1: the export "${title}" states no bound.`);
  }
  return { title, generatedAt, covers, doesNotCover, states, bounds };
}

/* ------------------------------------------------------------------ *
 * MARKDOWN
 * ------------------------------------------------------------------ */

export function toMarkdown({ provenance, sections }) {
  const p = provenance;
  const out = [
    `# ${p.title}`,
    "",
    `**Generated:** ${p.generatedAt}`,
    "",
    "## What this covers",
    ...p.covers.map((c) => `- ${c}`),
    "",
    "## 🔴 What this does NOT cover",
    ...p.doesNotCover.map((c) => `- ${c}`),
    "",
    "## State of the inputs",
    "",
    "| input | state |",
    "|---|---|",
    ...Object.entries(p.states ?? {}).map(([k, v]) => `| ${k} | **${v}** |`),
    "",
    "## Bounds that shaped this export (LAW-BOUND-1)",
    "",
    "| bound | value |",
    "|---|---|",
    ...Object.entries(p.bounds).map(([k, v]) => `| \`${k}\` | ${v} |`),
    "",
  ];

  for (const section of sections ?? []) {
    out.push(`## ${section.title}`, "");
    if (section.note) out.push(section.note, "");
    if (section.rows?.length) {
      const cols = section.columns;
      out.push(`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`);
      for (const row of section.rows) {
        out.push(`| ${cols.map((c) => mdCell(row[c])).join(" | ")} |`);
      }
      out.push("");
    } else {
      out.push("_no rows_", "");
    }
  }
  return out.join("\n");
}

/**
 * 🔴 `null` renders as an em dash, NEVER as 0.
 *
 * A FORBIDDEN row carries `rowCount: null` precisely because we learned nothing.
 * Printing `0` there would state a measurement nobody took.
 */
function mdCell(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.includes("|")) return v.split("|").join("\\|");
  return String(v);
}

/* ------------------------------------------------------------------ *
 * JSON
 * ------------------------------------------------------------------ */

export function toJson({ provenance, data }) {
  assertNoUpgrade(data);
  // The provenance rides INSIDE the document. A sidecar file gets separated
  // from the data it describes on the first copy-paste.
  return JSON.stringify({ _provenance: provenance, ...data }, null, 2) + "\n";
}

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

/**
 * CSV with the provenance as leading `#` comment lines.
 *
 * ⚠️ A spreadsheet will show those lines as data. That is deliberate and is the
 * lesser evil: a CSV whose bounds are in a separate README is a CSV whose
 * bounds are lost. The alternative — silently dropping them — is the failure
 * this whole file exists to prevent.
 */
export function toCsv({ provenance, columns, rows }) {
  const head = [
    `# ${provenance.title}`,
    `# generated: ${provenance.generatedAt}`,
    ...provenance.covers.map((c) => `# covers: ${c}`),
    ...provenance.doesNotCover.map((c) => `# DOES NOT COVER: ${c}`),
    ...Object.entries(provenance.states ?? {}).map(([k, v]) => `# state: ${k}=${v}`),
    ...Object.entries(provenance.bounds).map(([k, v]) => `# bound: ${k}=${v}`),
  ];
  const body = [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))];
  return [...head, ...body].join("\n") + "\n";
}

/** 🔴 An empty cell for null. Never `0`, and never the string "null". */
function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.split('"').join('""')}"` : s;
}

export { STATE_NEVER_UPGRADES };
