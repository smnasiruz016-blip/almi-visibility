/**
 * F26 · ACCESSIBILITY ASSESSMENT (acceptance _handoffs b1a94e7, RR-95).
 *
 * Spec row: "Measure machine-checkable accessibility issues and clearly separate automated findings from human review." Owner RR-95: the
 * two kinds are never merged into one number; an automated scan never proves accessibility; stored bodies are not rendered pages.
 *
 *   MACHINE-CHECKED   a declared check (named by its WCAG 2.2 success criterion) finds an instance of a failure in the STORED body
 *   NEEDS A PERSON    an instance a machine can locate but only a person can judge — counted, never judged, never scored
 *   NOT MEASURED      every criterion that needs a rendered, styled or operated page — with the missing fact named
 *
 * Verdict per page: DISPROVED when a machine check finds a failure, otherwise COULD-NOT-PROVE — never PROVED. A missing or truncated body
 * is NOT MEASURED. Tag-level reading of the stored HTML (script, style, template and comment content removed first, so markup inside them
 * never counts); pure — no fetch, no render. Names no product.
 */

export const VERDICT = Object.freeze({ DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE", NOT_MEASURED: "NOT_MEASURED" });

/** The declared machine checks, each named by the WCAG 2.2 success criterion it tests (acceptance S4). */
export const MACHINE_CHECKS = Object.freeze([
  Object.freeze({ id: "img-alt", criterion: "1.1.1 Non-text Content", finds: "an image with no text alternative attribute" }),
  Object.freeze({ id: "page-title", criterion: "2.4.2 Page Titled", finds: "no page title, or an empty one" }),
  Object.freeze({ id: "page-lang", criterion: "3.1.1 Language of Page", finds: "no page language, or an empty one" }),
  Object.freeze({ id: "link-name", criterion: "4.1.2 Name, Role, Value", finds: "a link with no accessible name" }),
  Object.freeze({ id: "button-name", criterion: "4.1.2 Name, Role, Value", finds: "a button with no accessible name" }),
  Object.freeze({ id: "frame-name", criterion: "4.1.2 Name, Role, Value", finds: "a frame with no accessible name" }),
]);

/** What only a person can judge, located by a machine (acceptance S4: ADEQUACY is a human judgement under the same criteria). */
export const PERSON_ITEMS = Object.freeze([
  Object.freeze({ id: "alt-adequate", criterion: "1.1.1 Non-text Content", judge: "whether each image's text alternative is adequate" }),
  Object.freeze({ id: "decorative-claim", criterion: "1.1.1 Non-text Content", judge: "whether each image or graphic marked decorative (an empty alternative, or hidden from assistive technology) really is" }),
  Object.freeze({ id: "graphic-alternative", criterion: "1.1.1 Non-text Content", judge: "whether each inline graphic (svg) conveys meaning and, if so, has an adequate text alternative" }),
  Object.freeze({ id: "title-descriptive", criterion: "2.4.2 Page Titled", judge: "whether the page title describes its topic or purpose" }),
  Object.freeze({ id: "name-adequate", criterion: "4.1.2 Name, Role, Value", judge: "whether each link, button and frame name is adequate" }),
]);

/** Needs a rendered, styled or operated page — NOT MEASURED from a stored body, with the missing fact named. */
export const NOT_MEASURED_CRITERIA = Object.freeze([
  Object.freeze({ criterion: "1.4.3 Contrast (Minimum)", missing: "a rendered page with its styles applied" }),
  Object.freeze({ criterion: "1.4.4 Resize Text", missing: "a rendered page" }),
  Object.freeze({ criterion: "1.4.10 Reflow", missing: "a rendered page at a narrow viewport" }),
  Object.freeze({ criterion: "2.1.1 Keyboard", missing: "an operated page (keyboard interaction)" }),
  Object.freeze({ criterion: "2.4.3 Focus Order", missing: "an operated page (keyboard interaction)" }),
  Object.freeze({ criterion: "2.4.7 Focus Visible", missing: "an operated, styled page" }),
  Object.freeze({ criterion: "content inserted by script", missing: "a page whose scripts have run" }),
]);
export const STORED_BODY_EXCLUDES = "script-inserted content, styles (colour, size, visibility, order) and interaction (keyboard, focus, state)";

const attr = (tag, name) => { const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag); return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null; };
const hasAttr = (tag, name) => new RegExp(`\\s${name}(\\s|=|>|/)`, "i").test(tag);
const text = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;|&#xa0;/gi, " ").trim();
const hidden = (tag) => (attr(tag, "aria-hidden") ?? "").toLowerCase() === "true";
const filled = (v) => typeof v === "string" && v.trim() !== "";

/** The stored body with the content a scan must never read as markup removed. */
export function scannable(html) {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
}

/** The accessible name of an element from its own attributes and content, or of the ids aria-labelledby names. */
function hasName(openTag, inner, ids) {
  if (filled(attr(openTag, "aria-label")) || filled(attr(openTag, "title"))) return true;
  const by = attr(openTag, "aria-labelledby");
  if (filled(by) && by.split(/\s+/).some((id) => filled(ids.get(id)))) return true;
  if (filled(text(inner))) return true;
  return [...String(inner).matchAll(/<img\b[^>]*>/gi)].some((m) => filled(attr(m[0], "alt")));
}

/** One page: machine findings and person items, by check. */
export function assessPage(html) {
  const s = scannable(html);
  const ids = new Map();
  for (const m of s.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*\sid\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*)>([\s\S]*?)<\/\1\s*>/gi)) ids.set(attr(`<x ${m[2]}>`, "id"), text(m[3]));
  const machine = Object.fromEntries(MACHINE_CHECKS.map((c) => [c.id, 0]));
  const person = Object.fromEntries(PERSON_ITEMS.map((p) => [p.id, 0]));

  for (const m of s.matchAll(/<img\b[^>]*>/gi)) {
    const t = m[0];
    const role = (attr(t, "role") ?? "").toLowerCase();
    /* hidden from assistive technology is a CLAIM that the image is decorative — a person judges it (C2), it is never dropped */
    if (hidden(t) || role === "presentation" || role === "none") { person["decorative-claim"]++; continue; }
    const alt = attr(t, "alt");
    if (alt === null) machine["img-alt"]++;
    else if (alt.trim() === "") person["decorative-claim"]++;
    else person["alt-adequate"]++;
  }
  for (const m of s.matchAll(/<svg\b[^>]*>/gi)) {
    const role = (attr(m[0], "role") ?? "").toLowerCase();
    if (hidden(m[0]) || role === "presentation" || role === "none") person["decorative-claim"]++;
    else person["graphic-alternative"]++;
  }
  const html0 = /<html\b[^>]*>/i.exec(s)?.[0] ?? null;
  if (!html0 || !filled(attr(html0, "lang"))) machine["page-lang"]++;
  const title = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(s);
  if (!title || !filled(text(title[1]))) machine["page-title"]++;
  else person["title-descriptive"]++;
  for (const m of s.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a\s*>/gi)) {
    if (!hasAttr(m[1], "href") || hidden(m[1])) continue;
    if (hasName(m[1], m[2], ids)) person["name-adequate"]++; else machine["link-name"]++;
  }
  for (const m of s.matchAll(/(<button\b[^>]*>)([\s\S]*?)<\/button\s*>/gi)) {
    if (hidden(m[1])) continue;
    if (hasName(m[1], m[2], ids)) person["name-adequate"]++; else machine["button-name"]++;
  }
  for (const m of s.matchAll(/<iframe\b[^>]*>/gi)) {
    if (hidden(m[0])) continue;
    if (filled(attr(m[0], "title")) || filled(attr(m[0], "aria-label"))) person["name-adequate"]++; else machine["frame-name"]++;
  }
  const failures = Object.values(machine).reduce((a, b) => a + b, 0);
  return { machine, person, failures, verdict: failures > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE };
}

/**
 * The client's pages. @param pages [{ pageId, html, truncated }] — a missing or truncated body is NOT MEASURED.
 */
export function assessAccessibility(pages) {
  const rows = pages.map((p) => {
    if (typeof p.html !== "string" || p.html === "" || p.truncated === true) return { pageId: p.pageId, verdict: VERDICT.NOT_MEASURED, missing: p.truncated ? "an untruncated stored body" : "a stored body" };
    return { pageId: p.pageId, ...assessPage(p.html) };
  });
  const judged = rows.filter((r) => r.verdict !== VERDICT.NOT_MEASURED);
  const sum = (k, ids) => Object.fromEntries(ids.map((id) => [id, judged.reduce((n, r) => n + r[k][id], 0)]));
  return Object.freeze({
    rows,
    machineChecked: Object.freeze({ checks: MACHINE_CHECKS.length, pagesChecked: judged.length, instances: sum("machine", MACHINE_CHECKS.map((c) => c.id)), pagesWithAFailure: judged.filter((r) => r.failures > 0).length }),
    needsAPerson: Object.freeze({ pages: judged.length, items: sum("person", PERSON_ITEMS.map((p) => p.id)) }),
    notMeasured: Object.freeze({ criteria: NOT_MEASURED_CRITERIA, pagesWithoutABody: rows.length - judged.length, excludes: STORED_BODY_EXCLUDES }),
    verdicts: rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {}),
  });
}
