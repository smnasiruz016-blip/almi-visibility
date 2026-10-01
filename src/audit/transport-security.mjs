/**
 * F27 · SECURITY AND TRANSPORT CHECKS (acceptance _handoffs 8a6312b, amended 93fa696 — name only; RR-111). Built under the owner's
 * refinement (RR-111 §0): this row reports what was never collected, and earns only the verdict its real population supports.
 *
 *   C2  HTTPS by the recorded final URL's scheme (RFC 9110 §4.2); a skipped page is NOT MEASURED; the http: form's redirect and the
 *       TLS protocol and certificate are NOT MEASURED — the collector recorded neither
 *   C3  mixed content: an http: URL in a declared subresource attribute of an HTTPS page's raw HTML (comments, script, style and
 *       template removed first — the stripping F26 uses); CSS, style attributes and script-inserted content are NOT MEASURED
 *   C4  unsafe forms: a form action or formaction resolving to http:, and a password input on a NOT HTTPS page
 *   C5  headers: no owner declaration of which headers F27 checks, so none is judged; recorded header NAMES are counts only
 *   C6  public exposure: no owner declaration of what it covers, so NOT MEASURED — no list exists here to invent
 *   C7  every count with its denominator; INCOMPLETE named; three verdicts per part
 * Pure: recorded pages in, counts out. Never fetches, renders or writes.
 */
import { scannable } from "./accessibility.mjs";

export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const MISSING = Object.freeze({
  tls: "the TLS protocol and certificate of each connection — the collector recorded neither",
  httpRedirect: "a request for each page's http: form — none was made, so whether it redirects to https is not recorded",
  rendered: "a rendered page — references in CSS, style attributes and script-inserted content, and script-inserted forms, are invisible in raw HTML",
  headers: "an owner declaration of which response headers F27 checks — none is declared",
  publicExposure: "an owner declaration of what public exposure covers — none is declared",
});

/** An attribute's value from an opening tag, at a whitespace boundary so `data-src` is never read as `src`; quoted or unquoted. */
export function attrOf(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]).replace(/&amp;/g, "&").trim() : null;
}
const isHttp = (raw, base) => { if (!raw) return false; try { return new URL(raw, base).protocol === "http:"; } catch { return false; } };

const SRC_TAGS = /^(img|script|iframe|frame|audio|video|source|track|embed|input)$/i;
const LOADING_REL = /(^|\s)(stylesheet|icon|preload|modulepreload|manifest)(\s|$)/i;

/** C3: every subresource reference among the declared attributes of one page's raw HTML — how many, and how many resolve to http:. */
export function mixedReferences(html, base) {
  let http = 0, total = 0;
  const see = (raw) => { if (raw) { total++; if (isHttp(raw, base)) http++; } };
  /* scannable() removes a script element WHOLE, opening tag included — so a script's own src is read here, from its opening tag only,
   * after comments and templates are removed and without reading the script's contents. */
  const outsideComments = String(html ?? "").replace(/<!--[\s\S]*?-->/g, " ").replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, " ");
  for (const m of outsideComments.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)) see(attrOf(`<script ${m[1]}>`, "src"));
  for (const m of scannable(html).matchAll(/<([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    const tag = m[0], name = m[1];
    if (SRC_TAGS.test(name)) see(attrOf(tag, "src"));
    if (/^(img|source)$/i.test(name)) { const set = attrOf(tag, "srcset"); if (set) for (const c of set.split(",")) see(c.trim().split(/\s+/)[0]); }
    if (/^video$/i.test(name)) see(attrOf(tag, "poster"));
    if (/^object$/i.test(name)) see(attrOf(tag, "data"));
    if (/^link$/i.test(name) && LOADING_REL.test(attrOf(tag, "rel") ?? "")) see(attrOf(tag, "href"));
  }
  return { http, total };
}

/** C4: unencrypted submissions (an action or formaction resolving to http:) and password inputs on a NOT HTTPS page. */
export function unsafeForms(html, base) {
  const body = scannable(html);
  const httpsPage = new URL(base).protocol === "https:";
  let submissions = 0, passwords = 0, forms = 0;
  for (const m of body.matchAll(/<form\b[^>]*>/gi)) {
    forms++;
    const action = attrOf(m[0], "action");
    if (isHttp(action === null || action === "" ? base : action, base)) submissions++;
  }
  for (const m of body.matchAll(/<(button|input)\b[^>]*>/gi)) if (isHttp(attrOf(m[0], "formaction"), base)) submissions++;
  if (!httpsPage) for (const m of body.matchAll(/<input\b[^>]*>/gi)) if ((attrOf(m[0], "type") ?? "").toLowerCase() === "password") passwords++;
  return { submissions, passwords, forms };
}

/**
 * @param {{ pages: { url: string|null, fetched: boolean, html: string|null, truncated: boolean, httpFormRequested: boolean }[], headerNames: Record<string, number>, fetchedObservations: number }} a
 *   pages        one entry per distinct recorded page; `url` is its recorded final URL (null when never fetched)
 *   headerNames  how many fetched observations recorded each response-header NAME (values are never read)
 */
export function auditTransport({ pages, headerNames, fetchedObservations }) {
  const fetched = pages.filter((p) => p.fetched && p.url !== null);
  const notMeasured = pages.length - fetched.length;
  const https = fetched.filter((p) => new URL(p.url).protocol === "https:").length;
  const notHttps = fetched.filter((p) => new URL(p.url).protocol === "http:").length;
  const unknownScheme = fetched.length - https - notHttps;
  const redirectMeasured = fetched.filter((p) => p.httpFormRequested).length;
  const withBody = fetched.filter((p) => p.html !== null);
  const absent = fetched.length - withBody.length;
  const truncated = withBody.filter((p) => p.truncated).length;
  const readable = withBody.filter((p) => !p.truncated);
  const httpsReadable = readable.filter((p) => new URL(p.url).protocol === "https:");
  let mixedRefs = 0, refsSeen = 0, mixedPages = 0;
  for (const p of httpsReadable) { const r = mixedReferences(p.html, p.url); mixedRefs += r.http; refsSeen += r.total; if (r.http) mixedPages++; }
  let submissions = 0, passwords = 0, formPages = 0, formsSeen = 0;
  for (const p of readable) { const f = unsafeForms(p.html, p.url); formsSeen += f.forms; submissions += f.submissions; passwords += f.passwords; if (f.submissions + f.passwords) formPages++; }
  const parts = {
    https: { https, notHttps, notMeasured: notMeasured + unknownScheme, denominator: pages.length, redirectMeasured, tls: "NOT MEASURED",
      missing: [MISSING.tls, MISSING.httpRedirect], verdict: notHttps > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE },
    mixedContent: { references: mixedRefs, referencesSeen: refsSeen, pagesWithAReference: mixedPages, pagesRead: httpsReadable.length, denominator: https,
      missing: [MISSING.rendered], verdict: mixedRefs > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE },
    unsafeForms: { formsSeen, submissions, passwordsOnNotHttps: passwords, pagesWithOne: formPages, pagesRead: readable.length, denominator: fetched.length,
      missing: [MISSING.rendered], verdict: submissions + passwords > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE },
    headers: { recordedNames: { ...headerNames }, observations: fetchedObservations, judged: 0, missing: [MISSING.headers], verdict: VERDICT.COULD_NOT_PROVE },
    publicExposure: { missing: [MISSING.publicExposure], verdict: VERDICT.COULD_NOT_PROVE },
  };
  const named = [];
  if (notMeasured) named.push(`${notMeasured} of ${pages.length} page(s) were never fetched (robots-skipped or unfetched) — HTTPS NOT MEASURED`);
  if (unknownScheme) named.push(`${unknownScheme} of ${fetched.length} fetched page(s) have a final URL that is neither http nor https`);
  if (absent) named.push(`${absent} of ${fetched.length} fetched page(s) have no stored body`);
  if (truncated) named.push(`${truncated} of ${withBody.length} stored bod(ies) were truncated by the collector`);
  named.push(`TLS: ${MISSING.tls}`, `redirect: ${MISSING.httpRedirect} (${redirectMeasured} of ${fetched.length} measured)`,
    `raw HTML: ${MISSING.rendered}`, `headers: ${MISSING.headers}`, `public exposure: ${MISSING.publicExposure}`);
  const verdicts = Object.values(parts).map((x) => x.verdict);
  /* No part can read PROVED while TLS, raw-HTML exclusions and two owner declarations are unmeasured, so the row cannot either (a branch
   * for it would be unreachable — sabotage S19 found it so on 1 Oct 2026). One DISPROVED part disproves the row. */
  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE;
  return { pages: pages.length, fetched: fetched.length, parts, incomplete: named.length > 0, absent: named, verdict };
}
