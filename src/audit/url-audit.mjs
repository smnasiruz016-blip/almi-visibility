/**
 * F20 · STATUS, REDIRECT AND URL AUDIT (acceptance _handoffs f566059, RR-96).
 *
 * Spec row: "Detect status errors, redirect chains and loops, malformed URLs and inconsistent preferred locations." V3 G16: confirm status.
 *
 *   OBSERVED URLS     a recorded fetch exists — STATUS (OK / CLIENT_ERROR / SERVER_ERROR / OTHER; a recorded fetch error is NOT_MEASURED,
 *                     never "broken" — historical row 10's check read it as a failure, which is not reused) and REDIRECTS (NONE / CHAIN /
 *                     LOOP; no recorded chain is NOT_MEASURED)
 *   LINKED-ONLY URLS  a recorded link points to it and no fetch of it is recorded — status and redirects NOT_MEASURED (missing: a fetch)
 *   MALFORMED         a link target AS WRITTEN in the stored markup that the WHATWG parser rejects, or that carries raw whitespace, a
 *                     backslash or a control character; non-web schemes counted apart
 *   PREFERRED         an observed page linked in more than one form of itself, or whose declared canonical names another form of it, is
 *                     INCONSISTENT; no declared canonical is NOT_MEASURED
 * Verdict: DISPROVED on any finding · COULD-NOT-PROVE when anything is NOT_MEASURED · PROVED only when nothing is open. Pure; names no
 * product.
 */
import { parseHead } from "./technical-checks.mjs";
import { scannable } from "./accessibility.mjs";

export const AUDIT_VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
const NON_WEB = /^(mailto|tel|sms|javascript|data|ftp|file):/i;

export function statusOf(v) {
  if (v?.error) return { state: "NOT_MEASURED", missing: "a successful fetch — the recorded fetch failed" };
  const s = Number(v?.status);
  if (!Number.isInteger(s)) return { state: "NOT_MEASURED", missing: "a recorded status" };
  if (s >= 200 && s < 300) return { state: "OK", status: s };
  if (s >= 400 && s < 500) return { state: "CLIENT_ERROR", status: s };
  if (s >= 500 && s < 600) return { state: "SERVER_ERROR", status: s };
  return { state: "OTHER", status: s };
}

export function redirectsOf(v) {
  if (!Array.isArray(v?.redirect_chain)) return { state: "NOT_MEASURED", missing: "a recorded redirect chain" };
  const hops = v.redirect_chain.map((h) => (typeof h === "string" ? h : h?.url ?? h?.location ?? null));
  if (hops.length === 0) return { state: "NONE", hops: 0 };
  const seen = new Set([v.requested_url].filter(Boolean));
  for (const h of hops) { if (h !== null && seen.has(h)) return { state: "LOOP", hops: hops.length }; if (h !== null) seen.add(h); }
  return { state: "CHAIN", hops: hops.length };
}

/** A link target as written: WELL_FORMED, MALFORMED (with why) or NON_WEB. */
export function hrefForm(raw, base) {
  if (NON_WEB.test(raw.trim())) return { form: "NON_WEB" };
  if (/[\s\\]/.test(raw) || /[\u0000-\u001f\u007f]/.test(raw)) return { form: "MALFORMED", why: "raw whitespace, a backslash or a control character" };
  try { return { form: "WELL_FORMED", url: new URL(raw, base).href }; } catch { return { form: "MALFORMED", why: "rejected by the WHATWG URL parser" }; }
}

/** The page's identity with its FORM removed: scheme, host case and a trailing slash do not make another page. */
export const formKey = (href) => { try { const u = new URL(href); return `${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "") || "/"}${u.search}`; } catch { return null; } };
const hrefsIn = (html) => [...scannable(html).matchAll(/<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");

/**
 * @param observations  the client's recorded crawl observations (value: requested_url, final_url, status, error, redirect_chain)
 * @param bodies        Map observation id → stored markup
 * @param edges         the recorded link edges ({ to })
 */
export function auditUrls({ observations, bodies, edges }) {
  const observed = observations.map((o) => ({ id: o.observation_id, v: o.value ?? {}, status: statusOf(o.value), redirects: redirectsOf(o.value) }));
  const observedKeys = new Map();
  for (const o of observed) for (const u of [o.v.final_url, o.v.requested_url]) { const k = u && formKey(u); if (k) observedKeys.set(k, o.id); }
  const linkedOnly = new Set((edges ?? []).map((e) => e?.to).filter((t) => t && !observedKeys.has(formKey(t)) ).map((t) => formKey(t) ?? t));

  /* C3 + C4 — link targets as written, and the forms each observed page is linked in */
  const forms = { WELL_FORMED: 0, MALFORMED: 0, NON_WEB: 0 };
  const malformedWhy = {};
  const linkedForms = new Map();
  let canonicalInconsistent = 0, canonicalMissing = 0, canonicalElsewhere = 0, bodiesRead = 0;
  for (const o of observed) {
    const html = bodies.get(o.id);
    if (typeof html !== "string" || html === "") continue;
    bodiesRead++;
    const base = o.v.final_url ?? o.v.requested_url;
    for (const raw of hrefsIn(html)) {
      const f = hrefForm(raw, base);
      forms[f.form]++;
      if (f.form === "MALFORMED") malformedWhy[f.why] = (malformedWhy[f.why] ?? 0) + 1;
      if (f.form === "WELL_FORMED") {
        const k = formKey(f.url);
        if (k && observedKeys.has(k)) { const u = new URL(f.url); u.hash = ""; linkedForms.set(k, (linkedForms.get(k) ?? new Set()).add(u.href)); }
      }
    }
    const canonical = parseHead(html).canonical;
    if (!canonical) { canonicalMissing++; continue; }
    let c; try { c = new URL(canonical, base).href; } catch { canonicalInconsistent++; continue; }
    const finalUrl = o.v.final_url ?? base;
    if (formKey(c) !== formKey(finalUrl)) canonicalElsewhere++;
    else if (new URL(c).href.replace(/#.*$/, "") !== new URL(finalUrl).href.replace(/#.*$/, "")) canonicalInconsistent++;
  }
  const linkedInMoreThanOneForm = [...linkedForms.values()].filter((s) => s.size > 1).length;

  const count = (xs, k) => xs.reduce((m, x) => ((m[x[k].state] = (m[x[k].state] ?? 0) + 1), m), {});
  const findings = observed.filter((o) => ["CLIENT_ERROR", "SERVER_ERROR"].includes(o.status.state) || o.redirects.state === "LOOP").length + forms.MALFORMED + canonicalInconsistent + linkedInMoreThanOneForm;
  const open = linkedOnly.size > 0 || canonicalMissing > 0 || observed.some((o) => o.status.state === "NOT_MEASURED" || o.redirects.state === "NOT_MEASURED") || bodiesRead < observed.length;
  return Object.freeze({
    observed: Object.freeze({ urls: observed.length, status: count(observed, "status"), redirects: count(observed, "redirects"), hops: observed.reduce((n, o) => n + (o.redirects.hops ?? 0), 0) }),
    linkedOnly: Object.freeze({ urls: linkedOnly.size, status: "NOT_MEASURED", missing: "a fetch of each linked-only URL — not run" }),
    linkTargets: Object.freeze({ bodiesRead, ...forms, malformedWhy }),
    preferredLocation: Object.freeze({ linkedInMoreThanOneForm, canonicalInconsistent, canonicalMissing, canonicalElsewhere }),
    findings,
    verdict: findings > 0 ? AUDIT_VERDICT.DISPROVED : open ? AUDIT_VERDICT.COULD_NOT_PROVE : AUDIT_VERDICT.PROVED,
  });
}
