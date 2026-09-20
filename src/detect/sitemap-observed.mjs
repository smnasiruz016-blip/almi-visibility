/**
 * DETECTOR D — SITEMAP MEMBERSHIP AGAINST THE OBSERVED STATE OF THE URL.
 *
 * A sitemap is a publisher telling a crawler *"these URLs exist, are canonical, and are worth
 * indexing"*. Every entry is therefore a claim, and every claim can be checked against what the
 * URL actually did when it was fetched.
 *
 * 🔴 IT REUSES THE EXISTING PER-URL MEASUREMENTS AND RE-MEASURES NOTHING. `preflight` and
 * `noindexState` (src/audit/technical-checks.mjs) already decide indexability from status, robots,
 * noindex, canonical and sitemap membership; this module imports `preflight` and supplies the
 * sitemap side. What is new here is only the JOIN — sitemap membership against stored observation —
 * which nothing previously did.
 *
 * 🔴 A URL IN THE SITEMAP WITH NO OBSERVATION IS **UNKNOWN**, NEVER CLEAN. That is the whole trap
 * of this class: the defect is a sitemap entry that leads nowhere, and "we never fetched it" looks
 * identical to "it was fine" unless the detector refuses to guess. An unfetched entry is exactly
 * the entry most likely to be broken.
 */
import { finding, clean, unknown } from "./outcome.mjs";
import { preflight } from "../audit/technical-checks.mjs";

const DETECTOR = "sitemap-vs-observed";

/**
 * @param {object} input
 * @param {string[]} input.sitemapUrls                 every URL the sitemap declares
 * @param {Record<string,object>} input.observations   url -> { status, redirectTo, robotsAllowed, noindexed, canonical, hasContent }
 */
export function detectSitemapVsObserved({ sitemapUrls, observations } = {}) {
  if (!Array.isArray(sitemapUrls) || observations === undefined || observations === null || typeof observations !== "object") {
    return [unknown({
      detector: DETECTOR, subject: "(input)", reasonCode: "INPUT_ABSENT",
      detail: `sitemapUrls=${Array.isArray(sitemapUrls) ? sitemapUrls.length : "absent"} observations=${observations ? "present" : "absent"}`,
    })];
  }
  if (sitemapUrls.length === 0) {
    /* An empty sitemap is not a clean sitemap — there is simply nothing to judge, and saying CLEAN
     * would let a missing sitemap score as a healthy one. */
    return [unknown({ detector: DETECTOR, subject: "(sitemap)", reasonCode: "EVIDENCE_INCOMPLETE", detail: "the sitemap declares no URLs, so no membership claim exists to check" })];
  }

  const out = [];
  for (const url of sitemapUrls) {
    const o = observations[url];
    if (o === undefined || o === null) {
      out.push(unknown({
        detector: DETECTOR, subject: url, reasonCode: "INPUT_ABSENT",
        detail: "the sitemap declares this URL and no stored observation of it was supplied — an unfetched entry is unmeasured, not healthy",
      }));
      continue;
    }
    if (!Number.isInteger(o.status)) {
      out.push(unknown({ detector: DETECTOR, subject: url, reasonCode: "EVIDENCE_INCOMPLETE", detail: `the stored observation carries no integer status (got ${JSON.stringify(o.status)})` }));
      continue;
    }

    const reasons = [];
    if (o.status >= 400) reasons.push(`status ${o.status} — the sitemap declares a URL that does not resolve`);
    else if (o.status >= 300 && o.status < 400) reasons.push(`status ${o.status} redirects to ${o.redirectTo ?? "(target not recorded)"} — a sitemap lists canonical destinations, not hops`);
    if (o.noindexed === true) reasons.push("the page is noindexed while the sitemap asks for it to be indexed");
    if (o.robotsAllowed === false) reasons.push("robots disallows the URL the sitemap advertises");
    if (typeof o.canonical === "string" && o.canonical.trim() !== "" && o.canonical !== url) {
      reasons.push(`the page declares a different canonical (${o.canonical}) from the URL the sitemap lists`);
    }

    /* The shared preflight is consulted so this detector's verdict and the existing indexability
     * measurement cannot drift apart. It is read as corroboration, never as a second opinion. */
    let pre = null;
    try {
      pre = preflight({ status: o.status, robotsAllowed: o.robotsAllowed, noindexed: o.noindexed, canonicalOk: !(typeof o.canonical === "string" && o.canonical.trim() !== "" && o.canonical !== url), inSitemap: true, hasContent: o.hasContent });
    } catch { pre = null; }
    const shared = pre === null ? "shared preflight: not evaluable on this observation" : `shared preflight: ${JSON.stringify(pre)}`;

    if (reasons.length > 0) {
      out.push(finding({
        detector: DETECTOR, subject: url,
        defectClass: "sitemap-entry-contradicted-by-observed-state",
        evidence: [`in sitemap: yes`, `observed status ${o.status}`, ...reasons, shared],
        summary: `the sitemap advertises this URL and its observed state contradicts that: ${reasons.length} reason(s)`,
      }));
      continue;
    }
    out.push(clean({
      detector: DETECTOR, subject: url,
      checked: [`in sitemap: yes`, `observed status ${o.status}`, `noindexed: ${JSON.stringify(o.noindexed)}`, `robotsAllowed: ${JSON.stringify(o.robotsAllowed)}`, `canonical: ${JSON.stringify(o.canonical ?? null)}`, shared],
      summary: "the URL the sitemap advertises resolves, is indexable and is canonical to itself",
    }));
  }
  return out;
}
