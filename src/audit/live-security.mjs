/**
 * F27 · SECURITY AND TRANSPORT ON THE CLIENT'S LIVE PAGES (Acceptance Amendment 3, _handoffs 7b9a992, 16 Oct 2026).
 *
 * PURE: the recorded reads of the bounded live check in, counts and verdicts out. Nothing is fetched, rendered or written here.
 *   C1  one client's LIVE pages — a page with no recorded read, or a truncated body, is counted and named
 *   C2  HTTPS by the recorded final URL; the http: form REDIRECTS only on a recorded 301/308 to the same host on https; TLS PASSES only on a
 *       recorded TLSv1.2/TLSv1.3 connection whose certificate the platform verified for the host, read inside its validity
 *   C3  mixed content: the raw-HTML references F27 always read (src/audit/transport-security.mjs mixedReferences), and every url() in a style
 *       element or style attribute; a page that runs script leaves script-inserted references NOT MEASURED
 *   C4  unsafe forms (src/audit/transport-security.mjs unsafeForms, unchanged)
 *   C5  headers under beta-g's declaration (config/security/live-header-baseline.mjs), on an HTML page served over https only; its
 *       referrer rule is Mozilla HTTP Observatory's, exactly, by the owner's decision of 16 Oct 2026 (RR-272)
 *   C6  public exposure under the owner's declaration of 3 Oct 2026 (config/security/public-exposure-declaration.mjs), on the recorded
 *       responses only — no path is ever requested to create evidence
 *   C7  every count with its denominator; INCOMPLETE named; three verdicts per part
 * It names no client, product, host or batch.
 */
import { mixedReferences, unsafeForms, VERDICT } from "./transport-security.mjs";

export const LIVE_SECURITY_RECORD = "live_security_read";
export const STATE = Object.freeze({ PASS: "PASS", FAIL: "FAIL", NOT_MEASURED: "NOT MEASURED", NOT_APPLICABLE: "NOT APPLICABLE" });
export const TLS_PROTOCOLS = Object.freeze(["TLSv1.2", "TLSv1.3"]);
export const REDIRECT_STATUSES = Object.freeze([301, 308]);

const present = (v) => typeof v === "string" && v.trim() !== "";
const lower = (h) => Object.fromEntries(Object.entries(h ?? {}).map(([k, v]) => [String(k).toLowerCase(), String(v)]));
const urlOf = (u) => { try { return new URL(u); } catch { return null; } };
const day = (iso) => (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null);

/** C2 · the TLS of one recorded connection. `tls`: { protocol, authorized, authorizationError, validFrom, validTo } as the platform reported. */
export function judgeTls(tls, on) {
  if (!tls || !present(tls.protocol)) return { state: STATE.NOT_MEASURED, why: "the TLS of the connection was not recorded" };
  if (!TLS_PROTOCOLS.includes(tls.protocol)) return { state: STATE.FAIL, why: `protocol ${tls.protocol}` };
  if (tls.authorized !== true) return { state: STATE.FAIL, why: "the platform did not verify the certificate for the host" };
  const from = Date.parse(tls.validFrom ?? ""), to = Date.parse(tls.validTo ?? ""), at = Date.parse(`${on}T12:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return { state: STATE.NOT_MEASURED, why: "the certificate's validity was not recorded" };
  if (!(at >= from && at <= to)) return { state: STATE.FAIL, why: "the read date lies outside the certificate's validity" };
  return { state: STATE.PASS };
}

/** C2 · the recorded answer to a page's http: form. Only a 301 or 308 to the same host on https passes. */
export function judgeRedirect(httpRead, pageUrl) {
  if (!httpRead || !Number.isInteger(httpRead.status)) return { state: STATE.NOT_MEASURED, why: "the http: form was not requested, or its answer was not recorded" };
  const page = urlOf(pageUrl), to = present(httpRead.location) ? urlOf(new URL(httpRead.location, `http://${page?.host}/`).href) : null;
  if (!REDIRECT_STATUSES.includes(httpRead.status)) return { state: STATE.FAIL, why: `status ${httpRead.status}` };
  if (!to || to.protocol !== "https:" || to.host !== page?.host) return { state: STATE.FAIL, why: "the redirect is not to the same host on https" };
  return { state: STATE.PASS };
}

/** C3 · every url() in a style element or a style attribute, how many, and how many resolve to http:. Comments are not read. */
export function styleUrls(html, base) {
  let http = 0, total = 0;
  const text = String(html ?? "").replace(/<!--[\s\S]*?-->/g, " ");
  const css = [...[...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => m[1]),
    ...[...text.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2])].map((c) => c.replace(/\/\*[\s\S]*?\*\//g, " "));
  for (const c of css) for (const m of c.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (raw === "" || /^data:/i.test(raw)) continue;
    total++;
    try { if (new URL(raw, base).protocol === "http:") http++; } catch { /* not a URL */ }
  }
  return { http, total };
}

/** C3 · whether a page's raw HTML runs script: a script element that is not JSON-LD data, or an inline event handler. */
export function runsScript(html) {
  const text = String(html ?? "").replace(/<!--[\s\S]*?-->/g, " ");
  for (const m of text.matchAll(/<script\b([^>]*)>/gi)) { const t = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(m[1])?.[1]?.toLowerCase() ?? ""; if (t !== "application/ld+json") return true; }
  return /<[a-z][^>]*\son[a-z]+\s*=/i.test(text.replace(/<script\b[\s\S]*?<\/script\s*>/gi, " "));
}

/**
 * C5 · the referrer policy a page's own HTML declares, as the Observatory reads it (src/retriever/utils.js parseHttpEquivHeaders): the
 * non-empty content of the LAST <meta name="referrer">; a meta that has both http-equiv and content is never read for it. null: none.
 */
export function referrerMeta(html) {
  let found = null;
  for (const m of String(html ?? "").replace(/<!--[\s\S]*?-->/g, " ").matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = new Map([...m[1].matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].map((a) => [a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? ""]));
    if (attrs.has("http-equiv") && attrs.has("content")) continue;
    if ((attrs.get("name") ?? "").trim().toLowerCase() === "referrer" && attrs.get("content")) found = attrs.get("content");
  }
  return found;
}

/** C5 · one declared header rule on one recorded response. The page's type decides whether it applies: an HTML page served over https. */
export function judgeHeaderRule(rule, read) {
  const h = lower(read?.headers);
  const htmlOverHttps = urlOf(read?.finalUrl)?.protocol === "https:" && /text\/html/i.test(h["content-type"] ?? "");
  if (!read || !read.headers) return { state: STATE.NOT_MEASURED, why: "the response was not recorded" };
  if (!htmlOverHttps) return { state: STATE.NOT_APPLICABLE };
  switch (rule.check) {
    case "HSTS_MIN_MAX_AGE": {
      if (!present(h["strict-transport-security"])) return { state: STATE.FAIL, why: "absent" };
      const age = Number(/max-age\s*=\s*"?(\d+)"?/i.exec(h["strict-transport-security"])?.[1]);
      return Number.isFinite(age) && age >= rule.min ? { state: STATE.PASS } : { state: STATE.FAIL, why: `max-age ${Number.isFinite(age) ? age : "unreadable"}` };
    }
    case "NOSNIFF": return /^\s*nosniff\s*$/i.test(h["x-content-type-options"] ?? "") ? { state: STATE.PASS } : { state: STATE.FAIL, why: present(h["x-content-type-options"]) ? "not nosniff" : "absent" };
    case "CLICKJACKING": {
      /* only an ENFORCED policy protects: a report-only policy enforces nothing */
      if (/(^|;)\s*frame-ancestors\b/i.test(h["content-security-policy"] ?? "")) return { state: STATE.PASS };
      return /^\s*(deny|sameorigin)\s*$/i.test(h["x-frame-options"] ?? "") ? { state: STATE.PASS } : { state: STATE.FAIL, why: "no enforced frame-ancestors and no X-Frame-Options DENY or SAMEORIGIN" };
    }
    case "REFERRER_POLICY": {
      /* Mozilla HTTP Observatory's rule exactly (config/security/live-header-baseline.mjs REFERRER_BASIS; the owner's decision, RR-272) */
      const meta = referrerMeta(read.body);
      const values = [...(Object.hasOwn(h, "referrer-policy") ? [h["referrer-policy"]] : []), ...(meta === null ? [] : [meta])];
      if (values.length === 0) return { state: STATE.PASS, why: "not implemented: no header and no meta — the Observatory passes it" };
      const v = values.join(", ").split(",").map((x) => x.trim().toLowerCase()).filter((x) => rule.private.includes(x) || rule.unsafe.includes(x)).at(-1) ?? null;
      if (v === null) return { state: STATE.FAIL, why: "invalid: no value is one the rule names" };
      return rule.private.includes(v) ? { state: STATE.PASS } : { state: STATE.FAIL, why: `unsafe: ${v}` };
    }
    default: throw Object.assign(new Error(`HEADER_RULE_UNDECLARED: ${rule.check}`), { code: "HEADER_RULE_UNDECLARED" });
  }
}

/** C5 · Content-Security-Policy: what is present, reported — never a verdict. */
export const cspPresence = (read) => { const h = lower(read?.headers); return { enforced: present(h["content-security-policy"]), reportOnly: present(h["content-security-policy-report-only"]) }; };

/** C6 · one recorded response under the owner's declaration: the class it falls in, or null. Only as wide as the declaration's words. */
export function exposureOf(resp, declaration) {
  if (!declaration || !resp || !Number.isInteger(resp.status)) return null;
  const body = String(resp.body ?? "");
  const path = urlOf(resp.url)?.pathname ?? "";
  for (const c of declaration.classes) {
    if (c.kind === "DIRECTORY_LISTING" && resp.status >= 200 && resp.status < 300 && c.title.test(body) && c.heading.test(body)) return c.id;
    if (c.kind === "STACK_TRACE" && resp.status >= 400 && c.trace.some((re) => re.test(body))) return c.id;
    if (c.kind === "SENSITIVE_ARTEFACT" && resp.status >= 200 && resp.status < 300 && c.paths.some((re) => re.test(path))) return c.id;
  }
  return null;
}

const tally = (rows) => rows.reduce((m, r) => ((m[r.state] = (m[r.state] ?? 0) + 1), m), { [STATE.PASS]: 0, [STATE.FAIL]: 0, [STATE.NOT_MEASURED]: 0, [STATE.NOT_APPLICABLE]: 0 });
const verdictOf = (t, of) => (t[STATE.FAIL] > 0 ? VERDICT.DISPROVED : t[STATE.NOT_MEASURED] === 0 && of > 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE);

/**
 * The audit of one client's LIVE pages. `pages`: [{ pageId, url, read: { finalUrl, status, headers, tls, body, truncated } | null,
 * http: { status, location } | null }] — `url` the page's recorded LIVE address. `robots`: { url, status, body } | null.
 */
export function auditLive({ pages = [], robots = null, headerDeclaration, exposureDeclaration, on }) {
  const n = pages.length;
  const read = pages.filter((p) => p.read && present(p.read.finalUrl));
  const absent = [];
  if (n - read.length) absent.push(`${n - read.length} of ${n} LIVE page(s) have no recorded read`);
  const withBody = read.filter((p) => typeof p.read.body === "string" && !p.read.truncated);
  if (read.length - withBody.length) absent.push(`${read.length - withBody.length} of ${read.length} recorded read(s) have no body or a truncated one`);
  /* C2 */
  const scheme = (p) => urlOf(p.read.finalUrl)?.protocol;
  const https = read.filter((p) => scheme(p) === "https:").length, notHttps = read.filter((p) => scheme(p) === "http:").length;
  const redirects = pages.map((p) => judgeRedirect(p.http, p.url)), tls = pages.map((p) => (p.read ? judgeTls(p.read.tls, on) : { state: STATE.NOT_MEASURED }));
  const rT = tally(redirects), tT = tally(tls);
  const httpsPart = { https, notHttps, of: n, redirect: rT, tls: tT,
    verdict: notHttps > 0 || rT[STATE.FAIL] || tT[STATE.FAIL] ? VERDICT.DISPROVED : https === n && n > 0 && !rT[STATE.NOT_MEASURED] && !tT[STATE.NOT_MEASURED] ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };
  if (rT[STATE.NOT_MEASURED]) absent.push(`the http: redirect NOT MEASURED on ${rT[STATE.NOT_MEASURED]} of ${n} page(s)`);
  if (tT[STATE.NOT_MEASURED]) absent.push(`TLS NOT MEASURED on ${tT[STATE.NOT_MEASURED]} of ${n} page(s)`);
  /* C3 */
  const httpsBodies = withBody.filter((p) => scheme(p) === "https:");
  let refs = 0, seen = 0, scripted = 0;
  for (const p of httpsBodies) { const a = mixedReferences(p.read.body, p.read.finalUrl), b = styleUrls(p.read.body, p.read.finalUrl); refs += a.http + b.http; seen += a.total + b.total; if (runsScript(p.read.body)) scripted++; }
  if (scripted) absent.push(`script-inserted references NOT MEASURED on ${scripted} of ${httpsBodies.length} page(s) that run script`);
  const mixed = { references: refs, referencesSeen: seen, pagesRead: httpsBodies.length, of: https, pagesRunningScript: scripted,
    verdict: refs > 0 ? VERDICT.DISPROVED : httpsBodies.length === n && n > 0 && scripted === 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };
  /* C4 */
  let submissions = 0, passwords = 0, forms = 0;
  for (const p of withBody) { const f = unsafeForms(p.read.body, p.read.finalUrl); submissions += f.submissions; passwords += f.passwords; forms += f.forms; }
  const formsPart = { formsSeen: forms, submissions, passwordsOnNotHttps: passwords, pagesRead: withBody.length, of: n,
    verdict: submissions + passwords > 0 ? VERDICT.DISPROVED : withBody.length === n && n > 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };
  /* C5 */
  const headers = headerDeclaration
    ? (() => {
      const per = headerDeclaration.rules.map((rule) => { const t = tally(pages.map((p) => judgeHeaderRule(rule, p.read))); return { name: rule.name, ...t, of: n }; });
      const all = per.reduce((m, r) => ({ fail: m.fail + r[STATE.FAIL], nm: m.nm + r[STATE.NOT_MEASURED], pass: m.pass + r[STATE.PASS] }), { fail: 0, nm: 0, pass: 0 });
      const csp = pages.map((p) => cspPresence(p.read));
      for (const r of per) if (r[STATE.NOT_MEASURED]) absent.push(`header ${r.name} NOT MEASURED on ${r[STATE.NOT_MEASURED]} of ${n} page(s)`);
      return { declaredBy: headerDeclaration.declaredBy, per, csp: { enforced: csp.filter((c) => c.enforced).length, reportOnly: csp.filter((c) => c.reportOnly).length, of: n, verdict: "REPORTED — NO VERDICT" },
        verdict: all.fail > 0 ? VERDICT.DISPROVED : all.nm === 0 && all.pass > 0 ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };
    })()
    : (absent.push("headers: no header declaration"), { per: [], verdict: VERDICT.COULD_NOT_PROVE });
  /* C6 */
  const responses = [...read.map((p) => ({ url: p.read.finalUrl, status: p.read.status, body: p.read.body })),
    ...pages.filter((p) => p.http && Number.isInteger(p.http.status)).map((p) => ({ url: p.url.replace(/^https:/, "http:"), status: p.http.status, body: "" })),
    ...(robots && Number.isInteger(robots.status) ? [robots] : [])];
  const found = exposureDeclaration ? responses.map((r) => exposureOf(r, exposureDeclaration)).filter(Boolean) : [];
  if (!exposureDeclaration) absent.push("public exposure: no owner declaration");
  const exposure = { responses: responses.length, exposures: found.length, byClass: found.reduce((m, c) => ((m[c] = (m[c] ?? 0) + 1), m), {}),
    outside: "every path no request of the bounded live check reached — never requested to create evidence",
    verdict: !exposureDeclaration ? VERDICT.COULD_NOT_PROVE : found.length ? VERDICT.DISPROVED : n > 0 && read.length === n ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };
  const parts = { https: httpsPart, mixedContent: mixed, unsafeForms: formsPart, headers, publicExposure: exposure };
  const verdicts = Object.values(parts).map((p) => p.verdict);
  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : verdicts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;
  return { pages: n, read: read.length, parts, incomplete: absent.length > 0, absent, verdict };
}
