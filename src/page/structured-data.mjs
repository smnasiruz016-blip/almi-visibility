/**
 * F48 · STRUCTURED DATA AND RICH-RESULT VALIDATION — discovered from the stored body, validated as far as recorded authority allows
 * (acceptance _handoffs 8d03429, AMENDMENT 1 _handoffs d09dd5e/7f212cd, RR-92).
 *
 * Spec row: "Discover, validate and recommend applicable structured data without guaranteeing rich-result display." V3 G16: "valid
 * visible-data-aligned schema"; §16: "visible text that matches structured data" · "Do not assume special AI markup guarantees citation or
 * visibility" · "Never promise ranking, indexing or AI citation".
 *
 *   discover    every JSON-LD block of a verified stored body; a block that does not parse is INVALID, never skipped
 *   validate    (a) parses and names a type; (b) each text the markup asserts is VISIBLE (in the stored server HTML's visible text),
 *               NOT VISIBLE (nowhere in the page outside its structured data) or RENDER-ONLY (only inside a script or template — it would
 *               show only if JavaScript renders it; its visibility is NOT MEASURED: no rendered text is recorded, renderMode RAW_HTML).
 *               A type's full requirement set is NOT MEASURED — no committed authority records it.
 *   recommend   ALIGN only for a NOT VISIBLE text · REPAIR for a block that does not parse — never for a RENDER-ONLY text, never a
 *               new type: no recorded page-kind classification decides which type applies
 *   worlds      ALIGNED · MISALIGNED (a NOT VISIBLE text or an invalid block) · NOT_MEASURED (missing fact named, incl. render-only)
 *
 * Nothing here claims rich-result display, ranking, indexing or AI citation. Pure; names no product.
 */
import { visibleText } from "../audit/shell.mjs";

export const STATE = Object.freeze({ ALIGNED: "ALIGNED", MISALIGNED: "MISALIGNED", NOT_MEASURED: "NOT_MEASURED" });
export const NO_GUARANTEE = "Structured data guarantees no rich-result display, ranking, indexing or AI citation; outcomes are measured only after publication (V3 §16).";
export const NOT_MEASURED_ALWAYS = Object.freeze([
  "a type's full requirement set — no committed authority records which properties a search engine requires",
  "which structured-data type applies to the page — no recorded page-kind classification",
]);
export const MISSING = Object.freeze({
  BODY: "a verified stored body for the page (F31)",
  NONE: "any structured data on the page — no JSON-LD block is present",
  RENDERED: "the page's rendered visible text for its render-only marked-up texts (F22; every crawl is renderMode RAW_HTML) — it would decide ALIGNED or MISALIGNED",
});
const SCRIPTS = /<(script|template)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const LD = /application\/ld\+json/i;

const BLOCK = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
/** The comparison form: markup and visible text are compared as lower-cased words, tags and entities removed. */
export const normalise = (s) => decode(String(s ?? "").replace(/<[^>]+>/g, " ")).toLowerCase().replace(/\s+/g, " ").trim();

/** Every text the markup asserts that V3 requires to be visible: Question names, Answer texts, and any node's name. */
function assertedTexts(node, out) {
  if (Array.isArray(node)) { for (const n of node) assertedTexts(n, out); return out; }
  if (!node || typeof node !== "object") return out;
  const type = [].concat(node["@type"] ?? []);
  if (typeof node.name === "string" && node.name.trim()) out.push({ kind: type.includes("Question") ? "question" : "name", text: node.name });
  if (type.includes("Answer") && typeof node.text === "string" && node.text.trim()) out.push({ kind: "answer", text: node.text });
  for (const [k, v] of Object.entries(node)) if (k !== "name" && k !== "text" && v && typeof v === "object") assertedTexts(v, out);
  return out;
}
function typesOf(node, out = new Set()) {
  if (Array.isArray(node)) { for (const n of node) typesOf(n, out); return out; }
  if (!node || typeof node !== "object") return out;
  for (const t of [].concat(node["@type"] ?? [])) if (typeof t === "string") out.add(t);
  for (const v of Object.values(node)) if (v && typeof v === "object") typesOf(v, out);
  return out;
}

/** The blocks a body carries: each parsed, or INVALID. */
export function discoverBlocks(html) {
  const blocks = [];
  for (const m of String(html ?? "").matchAll(BLOCK)) {
    try {
      const json = JSON.parse(m[1]);
      const types = [...typesOf(json)];
      blocks.push({ valid: types.length > 0, reason: types.length ? null : "NO_TYPE", types, texts: assertedTexts(json, []) });
    } catch {
      blocks.push({ valid: false, reason: "DOES_NOT_PARSE", types: [], texts: [] });
    }
  }
  return blocks;
}

/** One page. */
export function assessPage({ pageId, html, verified, ref = null }) {
  const base = { pageId, notice: NO_GUARANTEE, notMeasured: NOT_MEASURED_ALWAYS };
  if (!verified || typeof html !== "string" || html === "") return Object.freeze({ ...base, state: STATE.NOT_MEASURED, blocks: 0, missing: Object.freeze([MISSING.BODY]), recommendations: Object.freeze([]), schemaFact: null });
  const blocks = discoverBlocks(html);
  if (blocks.length === 0) return Object.freeze({ ...base, state: STATE.NOT_MEASURED, blocks: 0, missing: Object.freeze([MISSING.NONE]), recommendations: Object.freeze([]), schemaFact: null });
  const visible = normalise(visibleText(html));
  const texts = blocks.flatMap((b) => b.texts);
  const notShown = texts.filter((t) => { const n = normalise(t.text); return n !== "" && !visible.includes(n); });
  /* where a text not in the visible text otherwise sits: inside another script or template (RENDER-ONLY) or nowhere (NOT VISIBLE) */
  const scripted = [...html.matchAll(SCRIPTS)].filter((m) => !LD.test(m[0].slice(0, m[0].indexOf(">") + 1))).map((m) => normalise(m[2])).join(" ");
  const renderOnly = notShown.filter((t) => scripted.includes(normalise(t.text)));
  const hidden = notShown.filter((t) => !renderOnly.includes(t));
  const invalid = blocks.filter((b) => !b.valid);
  const types = [...new Set(blocks.flatMap((b) => b.types))].sort();
  const recommendations = [
    ...(hidden.length ? [Object.freeze({ kind: "ALIGN", count: hidden.length, why: "the markup states text the visible page does not show (V3 §16)" })] : []),
    ...(invalid.length ? [Object.freeze({ kind: "REPAIR", count: invalid.length, why: "a block does not parse or names no type" })] : []),
  ];
  const aligned = hidden.length === 0 && invalid.length === 0 && renderOnly.length === 0;
  const misaligned = hidden.length > 0 || invalid.length > 0;
  return Object.freeze({
    ...base,
    state: aligned ? STATE.ALIGNED : misaligned ? STATE.MISALIGNED : STATE.NOT_MEASURED,
    blocks: blocks.length,
    invalidBlocks: invalid.length,
    types: Object.freeze(types),
    items: Object.freeze({ questions: texts.filter((t) => t.kind === "question").length, answers: texts.filter((t) => t.kind === "answer").length, names: texts.filter((t) => t.kind === "name").length, notVisible: hidden.length, renderOnly: renderOnly.length }),
    missing: Object.freeze(!aligned && !misaligned ? [MISSING.RENDERED] : []),
    recommendations: Object.freeze(recommendations),
    /* F41's schema fact — only from an ALIGNED page, with its source */
    schemaFact: aligned && ref ? Object.freeze({ type: types.join(", "), ref }) : null,
  });
}

export function summariseStructuredData(assessments) {
  const by = (f) => assessments.reduce((m, a) => ((m[f(a)] = (m[f(a)] ?? 0) + 1), m), {});
  const sum = (k) => assessments.reduce((n, a) => n + (a.items?.[k] ?? 0), 0);
  return Object.freeze({
    population: assessments.length,
    state: by((a) => a.state),
    types: by((a) => (a.types?.length ? a.types.join("+") : "none")),
    items: Object.freeze({ questions: sum("questions"), answers: sum("answers"), names: sum("names"), notVisible: sum("notVisible"), renderOnly: sum("renderOnly") }),
    recommendations: by((a) => a.recommendations.map((r) => r.kind).join("+") || "none"),
    notice: NO_GUARANTEE,
  });
}
