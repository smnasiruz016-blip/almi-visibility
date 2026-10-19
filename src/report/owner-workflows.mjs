/**
 * 🔴 F88 · DESKTOP, MOBILE AND ACCESSIBILITY OF OWNER WORKFLOWS (acceptance _handoffs AlmiVisibility_F88_ACCEPTANCE_2026-10-18.md, RR-285).
 * Owner decision 5 of RR-283: there is no owner app or dashboard; the owner workflows ARE the report files the engine writes.
 *
 *   C1 NAMED        every report file under runs/ is one of the named kinds (path patterns below), or UNLISTED — reported, never dropped
 *   C2 PHONE        rendered at 430 px (the engine's offline renderer, src/render/renderer.mjs): the document is no wider than the screen
 *   C3 DESKTOP      rendered at desktop width: the same visible text as at 430 px
 *   C4 ASSISTIVE    headings in order (no level skipped), every table with a header row, no line whose only meaning is an emoji or a colour,
 *                   every link with words
 *   C5 BAD FIRST    a report that holds a bad finding or anything NOT DONE says so in its first section
 * The judgements here are pure (text and render facts in, failures out); the render itself is done by the caller through the offline
 * renderer. Names no product, tenant or host.
 */
export const OWNER_WORKFLOWS = Object.freeze([
  Object.freeze({ kind: "OPERATIONS_REPORT", pattern: /^runs\/ops\/operations-report-\d{4}-\d{2}-\d{2}\.txt$/, type: "text/plain", why: "F87: one project's operations, for the owner to review" }),
  Object.freeze({ kind: "SABOTAGE_EVIDENCE", pattern: /^runs\/audit\/[^/]+-sabotage-[^/]+\.txt$/, type: "text/plain", why: "the proof a guard can fail, for the owner to inspect" }),
  Object.freeze({ kind: "AUDIT_EVIDENCE", pattern: /^runs\/audit\/[^/]+\.(txt|md)$/, type: "text/plain", why: "other audit evidence the owner inspects" }),
  /* RR-287 (F88 Amendment 1): an export run into its own dated folder (--out) is the same kind — a fresh run never rewrites an earlier one */
  Object.freeze({ kind: "EVIDENCE_EXPORT", pattern: /^runs\/export\/(\d{4}-\d{2}-\d{2}[^/]*\/)?[^/]+\.md$/, type: "text/plain", why: "the evidence export and ruling sheets, for review and approval" }),
  Object.freeze({ kind: "OWNER_REPORT", pattern: /^runs\/report\/[^/]+\.html$/, type: "text/html", why: "the owner's report page" }),
  /* RR-287 (F88 Amendment 1): no engine code writes this kind today — its stored files are checked as stored; no fresh run exists */
  Object.freeze({ kind: "OWNER_VERIFICATION", pattern: /^runs\/owner-verification\/[^/]+\.txt$/, type: "text/plain", why: "a verification record shown to the owner", writer: null }),
]);
/* RR-287 (F88 Amendment 1) · each kind's writer in the engine today, by entry point — or null: HISTORICAL ONLY, named */
export const WRITERS = Object.freeze({
  OPERATIONS_REPORT: "bin/project-operations.mjs", SABOTAGE_EVIDENCE: "test/helpers/*-sabotage*.mjs (through badFindingsFirst)",
  AUDIT_EVIDENCE: "test/helpers/evidence-once.mjs and the evidence writers through badFindingsFirst", EVIDENCE_EXPORT: "bin/export.mjs", OWNER_REPORT: "bin/report.mjs", OWNER_VERIFICATION: null,
});
export const UNLISTED = "UNLISTED";
export const PHONE = Object.freeze({ width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
export const DESKTOP = Object.freeze({ width: 1280, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
export const FAIL = Object.freeze({ WIDER: "WIDER_THAN_THE_SCREEN", TEXT_DIFFERS: "DESKTOP_TEXT_DIFFERS", HEADING_SKIP: "HEADING_LEVEL_SKIPPED", TABLE_HEAD: "TABLE_WITHOUT_A_HEADER_ROW", EMOJI_ONLY: "MEANING_BY_EMOJI_ALONE", COLOUR_ONLY: "MEANING_BY_COLOUR_ALONE", LINK_WORDS: "LINK_WITHOUT_WORDS", BAD_NOT_FIRST: "BAD_FINDINGS_NOT_FIRST" });

/** C1 · each report-like file under runs/ classed by kind, or UNLISTED. `files` are repo-relative paths with forward slashes. */
export function classifyReports(files) {
  const out = [];
  for (const f of files) {
    if (!/^runs\/.+\.(txt|md|html)$/.test(f)) continue;
    const k = OWNER_WORKFLOWS.find((w) => w.pattern.test(f));
    out.push(Object.freeze({ file: f, kind: k ? k.kind : UNLISTED, type: k ? k.type : null }));
  }
  return out;
}

/** C2 · one render's layout: wider than its screen is a failure. */
export function phoneFailures(file, layout) {
  return layout && layout.scrollWidth > layout.viewportWidth ? [Object.freeze({ file, failure: FAIL.WIDER, detail: `${layout.scrollWidth} px of content in a ${layout.viewportWidth} px screen` })] : [];
}
const squash = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
/** C3 · the desktop render shows what the phone render shows. */
export function desktopFailures(file, phoneText, desktopText) {
  return squash(phoneText) === squash(desktopText) ? [] : [Object.freeze({ file, failure: FAIL.TEXT_DIFFERS })];
}

const EMOJI_ONLY = /^[\s\p{Extended_Pictographic}\p{Emoji_Component}️‍·•|:-]+$/u;
/** C4 · the assistive checks on the stored text, by its type; each failure with its line. */
export function assistiveFailures(file, text, type) {
  const out = [], lines = String(text ?? "").split(/\r?\n/);
  const push = (failure, line) => out.push(Object.freeze({ file, failure, line }));
  if (type === "text/html") {
    let last = 0;
    for (const m of String(text).matchAll(/<h([1-6])\b/gi)) { const n = Number(m[1]); if (last && n > last + 1) push(FAIL.HEADING_SKIP, `h${last} → h${n}`); last = n; }
    for (const t of String(text).matchAll(/<table\b[\s\S]*?<\/table>/gi)) if (!/<th\b/i.test(t[0])) push(FAIL.TABLE_HEAD, "a table");
    for (const a of String(text).matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) if (squash(a[1].replace(/<[^>]+>/g, "")) === "" && !/aria-label="[^"]+"/i.test(a[0])) push(FAIL.LINK_WORDS, squash(a[0]).slice(0, 80));
    for (const s of String(text).matchAll(/<(span|div|td)\b[^>]*style="[^"]*\b(background-)?color\s*:[^"]*"[^>]*>\s*<\/\1>/gi)) push(FAIL.COLOUR_ONLY, squash(s[0]).slice(0, 80));
    return out;
  }
  let last = 0, inTable = false;
  lines.forEach((l, i) => {
    const h = /^(#{1,6})\s/.exec(l);
    if (h) { const n = h[1].length; if (last && n > last + 1) push(FAIL.HEADING_SKIP, i + 1); last = n; }
    const row = /^\s*\|.*\|\s*$/.test(l);
    if (row && !inTable && !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) push(FAIL.TABLE_HEAD, i + 1);
    inTable = row;
    if (l.trim() !== "" && EMOJI_ONLY.test(l) && /\p{Extended_Pictographic}/u.test(l)) push(FAIL.EMOJI_ONLY, i + 1);
    for (const m of l.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)) if (m[1].trim() === "") push(FAIL.LINK_WORDS, i + 1);
  });
  return out;
}

/** The bad findings a report holds, by its kind's own words. */
const BAD = /\b(NOT GREEN|NOT DONE|NOT PROVED|DISPROVED|FAILED|landed false|red false|residue [1-9]|unchanged false)\b|proved (\d+) of (\d+)/;
/* a count of zero beside the word ("NOT PROVED 0", "FAILED: 0") is a clean result, not a finding */
const isBad = (l) => [...String(l).matchAll(new RegExp(BAD.source, "g"))].some((m) => (m[2] !== undefined ? m[2] !== m[3] : !/^\s*[:=]?\s*0(?!\d)/.test(l.slice(m.index + m[0].length))));
/**
 * C5 · a report that holds a bad finding says so in its first section: its first non-empty line, or — for a report with headings — its first
 * section (to the second heading), must name one.
 */
export function badFirstFailures(file, text, type) {
  const plain = type === "text/html" ? String(text ?? "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<\/(h[1-6]|p|li|tr|div)>/gi, "\n").replace(/<[^>]+>/g, " ") : String(text ?? "");
  const all = plain.split(/\r?\n/);
  const lines = all.filter((l) => l.trim() !== "");
  const badAt = lines.findIndex(isBad);
  if (badAt < 0) return [];
  /* the first section: with headings, everything to the second heading; without, the report's opening block (to the first blank line)
   * and — when that block is only the report's title and preamble, holding no finding — the first line of the block after it */
  const second = lines.findIndex((l, i) => i > 0 && /^#{1,6}\s/.test(l));
  let firstSectionEnd;
  if (/^#{1,6}\s/.test(lines[0] ?? "") && second > 0) firstSectionEnd = second;
  else { const blank = all.findIndex((l, i) => i > 0 && l.trim() === ""); const opening = blank < 0 ? lines.length : all.slice(0, blank).filter((l) => l.trim() !== "").length; firstSectionEnd = opening + 1; }
  return badAt < firstSectionEnd ? [] : [Object.freeze({ file, failure: FAIL.BAD_NOT_FIRST, line: badAt + 1 })];
}

/**
 * C5 · THE WRITERS' SIDE (beta-g decision C, RR-287): a plain-text report the engine writes is passed through this before it is written.
 * Every line holding a bad finding or anything NOT DONE is copied, word for word, into an opening block: at the very top, or — when the
 * report opens with a heading — directly under that title, before any second heading. Nothing is removed or reworded; a report with no bad
 * finding, or one that already says it first, is returned byte for byte.
 */
/** F88 Amendment 1 · the failures of files NOT on the historical list — the only ones a fresh run can answer for; none is forgiven by kind. */
export function freshFailures(failures, historical = []) {
  const old = new Set((historical ?? []).map((h) => h.file));
  return (failures ?? []).filter((f) => !old.has(f.file));
}

export const BAD_FIRST_TITLE ="BAD FINDINGS AND NOT DONE — first:";
export function badFindingsFirst(text) {
  const s = String(text ?? "");
  const lines = s.split(/\r?\n/);
  const bad = lines.filter((l) => l.trim() !== "" && isBad(l));
  if (!bad.length || badFirstFailures("report", s, "text/plain").length === 0) return s;
  const eol = s.includes("\r\n") ? "\r\n" : "\n";
  const block = [BAD_FIRST_TITLE, ...bad.map((l) => `  ${l.trim()}`), ""];
  if (/^#{1,6}\s/.test(lines[0] ?? "")) return [lines[0], "", ...block, ...lines.slice(1)].join(eol);
  return [...block, ...lines].join(eol);
}
