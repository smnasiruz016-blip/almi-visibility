/**
 * F27 C5 · HEADERS JUDGED BY THE PAGE'S OWN TYPE AND BEHAVIOUR (Acceptance Amendment 2, _handoffs 258141f; declaration
 * config/security/header-declaration.mjs).
 *
 * For each fetched page and each declared header:
 *   does it APPLY?   from the page's own record only — the final URL's scheme, and the stored raw HTML. No body, or a truncated body that
 *                    does not show the behaviour, leaves applicability NOT MEASURED; it is never guessed either way.
 *   its state        through the existing provenance rule (src/crawl/provenance.mjs recordedHeader), REUSED, not re-written:
 *                    RECORDED (present) · ABSENT (its collector recorded that header and the response had none) · NOT MEASURED (its
 *                    collector never recorded it — never "missing", never "absent"). Values are never read.
 *   frame protection X-Frame-Options recorded counts; when only a Content-Security-Policy is recorded, whether it carries frame-ancestors
 *                    is a VALUE, never read — so frame protection is NOT MEASURED there, never assumed either way.
 * A part is DISPROVED when an applicable header is ABSENT, PROVED only when every applicable header on every page is measured and present,
 * and COULD-NOT-PROVE otherwise. Pure: records in, counts out. Generic.
 */
import { recordedHeader } from "../crawl/provenance.mjs";

export const NOT_MEASURED = "NOT MEASURED";
const SCRIPT = /<script\b|\son[a-z]+\s*=/i;
const FRAMES_OR_POWERFUL = /<(iframe|frame|embed|object)\b|getUserMedia|navigator\.geolocation|mediaDevices/i;

/** Does a declared condition hold for this page? true · false · null (NOT MEASURED: the record cannot show it). */
export function applies(condition, page) {
  const scheme = (() => { try { return new URL(page.url).protocol; } catch { return null; } })();
  const html = typeof page.html === "string" ? page.html : null;
  const seen = (re) => (html === null ? null : re.test(html) ? true : page.truncated ? null : false);
  switch (condition) {
    case "SERVED_OVER_HTTPS": return scheme === null ? null : scheme === "https:";
    case "ANY_FETCHED_RESPONSE": return true;
    case "HTML_PAGE": return html === null ? null : true;
    case "HTML_RUNS_SCRIPT": return seen(SCRIPT);
    case "HTML_EMBEDS_FRAMES_OR_POWERFUL_APIS": return seen(FRAMES_OR_POWERFUL);
    default: throw Object.assign(new Error(`HEADER_CONDITION_UNDECLARED: ${condition}`), { code: "HEADER_CONDITION_UNDECLARED" });
  }
}

/** One page, one declared header → PRESENT · ABSENT · NOT MEASURED (with why) · NOT APPLICABLE. */
export function judgeHeader(page, h) {
  const a = applies(h.appliesWhen, page);
  if (a === false) return { state: "NOT APPLICABLE" };
  if (a === null) return { state: NOT_MEASURED, why: `whether ${h.name} applies — the page's record cannot show ${h.appliesWhen}` };
  const r = recordedHeader(page.observation, h.name);
  if (r.state === "RECORDED") return { state: "PRESENT" };
  if (h.frameProtection && recordedHeader(page.observation, "content-security-policy").state === "RECORDED") {
    return { state: NOT_MEASURED, why: "frame protection — a Content-Security-Policy is recorded, and whether it carries frame-ancestors is a value never read" };
  }
  if (r.state === "ABSENT") return { state: "ABSENT" };
  return { state: NOT_MEASURED, why: r.fact };
}

export function assessHeaders(pages, declaration) {
  const per = declaration.headers.map((h) => {
    const counts = { PRESENT: 0, ABSENT: 0, [NOT_MEASURED]: 0, "NOT APPLICABLE": 0 };
    const why = {};
    for (const p of pages) { const s = judgeHeader(p, h); counts[s.state] += 1; if (s.why) why[s.why] = (why[s.why] ?? 0) + 1; }
    return { name: h.name, appliesWhen: h.appliesWhen, ...counts, of: pages.length, notMeasuredWhy: why };
  });
  const absent = per.reduce((n, h) => n + h.ABSENT, 0), unmeasured = per.reduce((n, h) => n + h[NOT_MEASURED], 0);
  const verdict = absent > 0 ? "DISPROVED" : unmeasured === 0 && pages.length > 0 ? "PROVED" : "COULD-NOT-PROVE";
  return { per, judgedPages: pages.length, neverCredited: [...declaration.neverCredited], notAssessed: [...declaration.notAssessed], verdict };
}
