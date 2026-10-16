/**
 * RR-271 · A BUILT PAGE, PUBLISHED: the one page a client's site serves for a joined page the engine built and the owner GREENed for
 * publication. PURE: a stored build record and the address it is published at in, the published page and its checks out. Nothing is
 * fetched or written here.
 *
 *   publishedHtml   the build's own page with exactly three changes: the robots line that keeps a test page out of search (noindex) is
 *                   replaced by a canonical link to the page's own address, and the two stamps that say "never published" are taken out.
 *                   Every other byte is the build's — the title, the heading, the FAQ structured data (sourced lines only), the client's
 *                   header, footer and logos. A build that does not hold exactly one such robots line and exactly two stamps is refused.
 *   slugOf          the page's address part: its recorded H1 phrase (the first part of its traced title), in lower case, words joined by "-"
 *   publishChecks   what a served page must show, against its build: the same title and heading, the build's FAQ data byte for byte, one
 *                   canonical naming its own address, no noindex, no stamp, the client's header and footer — and nothing else changed
 *   publishedRecord the build's record again, now saying where and when it was published (publishedUrl, publishedOn) with the sha256 of the
 *                   published page; a page so recorded is PUBLISHED (config/page/built-page-needs.mjs PUBLISHED_FIELDS)
 * It names no client, product, host or batch.
 */
import { createHash } from "node:crypto";
import { JOINED_RECORD, escapeText } from "./joined-page.mjs";

export const PUBLISH = Object.freeze({
  NOINDEX: '<meta name="robots" content="noindex, nofollow">',
  CHECK: Object.freeze({ PASS: "PASS", FAIL: "FAIL" }),
});
export const PUBLISH_REFUSE = Object.freeze({
  NO_BUILD: "NOT_A_BUILT_PAGE",
  NO_ADDRESS: "NO_HTTPS_ADDRESS",
  NOINDEX_COUNT: "NOT_EXACTLY_ONE_NOINDEX_LINE",
  STAMP_COUNT: "NOT_EXACTLY_TWO_STAMPS",
  NO_SLUG: "NO_RECORDED_H1_PHRASE",
  NO_DAY: "NO_PUBLICATION_DAY",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
const count = (s, part) => s.split(part).length - 1;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const stampLine = (stamp) => `<p class="stamp">${escapeText(stamp)}</p>\n`;
const canonicalLine = (url) => `<link rel="canonical" href="${escapeText(url)}">`;
/* an address of its own: https, no query, no fragment, written as the URL parser writes it */
const httpsAddress = (u) => { try { const x = new URL(u); return x.protocol === "https:" && x.hash === "" && x.search === "" && x.href === u; } catch { return false; } };
const refused = (reason, detail = null) => Object.freeze({ state: "REFUSED", reason, detail });

/** The page's address part, from its recorded H1 phrase: "OET for Dentists" → "oet-for-dentists". Null when no phrase is recorded. */
export function slugOf(record) {
  const part = record?.titleTrace?.[0]?.part;
  if (!present(part)) return null;
  const slug = part.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug === "" ? null : slug;
}

/** The published page: the build's page with its noindex line made a canonical link and its two stamps taken out — nothing else. */
export function publishedHtml(record, { url } = {}) {
  if (record?.record_type !== JOINED_RECORD || !present(record?.html) || !present(record?.stamp)) return refused(PUBLISH_REFUSE.NO_BUILD);
  if (!httpsAddress(url)) return refused(PUBLISH_REFUSE.NO_ADDRESS, String(url ?? ""));
  const html = record.html;
  if (count(html, PUBLISH.NOINDEX) !== 1) return refused(PUBLISH_REFUSE.NOINDEX_COUNT, String(count(html, PUBLISH.NOINDEX)));
  if (count(html, stampLine(record.stamp)) !== 2) return refused(PUBLISH_REFUSE.STAMP_COUNT, String(count(html, stampLine(record.stamp))));
  const out = html.replace(PUBLISH.NOINDEX, canonicalLine(url)).split(stampLine(record.stamp)).join("");
  return Object.freeze({ state: "PUBLISHED", html: out, sha256: sha256(out), url });
}

const one = (re, s) => { const m = s.match(re); return m ? m[1] : null; };
const titleOf = (s) => one(/<title>([\s\S]*?)<\/title>/, s);
const h1Of = (s) => one(/<h1>([\s\S]*?)<\/h1>/, s);
const ldOf = (s) => one(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, s);
const blockOf = (tag, s) => one(new RegExp(`(<${tag}[\\s\\S]*?<\\/${tag}>)`), s);

/**
 * What a served page must show, measured against its build: each check PASS or FAIL with what was seen. `html` is the page as served.
 * `sameAsBuilt` holds only when the served page is exactly the published page of this build at this address.
 */
export function publishChecks({ record, html, url }) {
  const want = publishedHtml(record, { url });
  const s = String(html ?? "");
  const canon = [...s.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
  const ok = (b, why = null) => Object.freeze({ state: b ? PUBLISH.CHECK.PASS : PUBLISH.CHECK.FAIL, ...(b ? {} : { why }) });
  const built = record?.html ?? "";
  return Object.freeze({
    titleAsBuilt: ok(titleOf(s) !== null && titleOf(s) === titleOf(built), `title ${JSON.stringify(titleOf(s))}`),
    h1AsBuilt: ok(h1Of(s) !== null && h1Of(s) === h1Of(built), `h1 ${JSON.stringify(h1Of(s))}`),
    faqDataAsBuilt: ok(ldOf(s) !== null && ldOf(s) === ldOf(built) && (() => { try { JSON.parse(ldOf(s)); return true; } catch { return false; } })(), "the FAQ structured data is not the build's, or is not valid JSON"),
    canonicalOwnAddress: ok(canon.length === 1 && canon[0] === escapeText(url), `canonical ${JSON.stringify(canon)}`),
    noNoindex: ok(!/<meta[^>]+name="robots"[^>]+noindex/i.test(s), "a noindex line is on the page"),
    noStamp: ok(present(record?.stamp) && !s.includes(escapeText(record.stamp)), "the test stamp is visible"),
    headerFooterAsBuilt: ok(blockOf("header", s) !== null && blockOf("header", s) === blockOf("header", built) && blockOf("footer", s) !== null && blockOf("footer", s) === blockOf("footer", built), "the client's header or footer is not the build's"),
    sameAsBuilt: ok(want.state === "PUBLISHED" && s === want.html, want.state === "PUBLISHED" ? "the served page differs from the published build" : want.reason),
  });
}

/** The build's record, now published: where, on which day, and the sha256 of the published page. A new record — the build is not rewritten. */
export function publishedRecord(record, { url, on }) {
  const p = publishedHtml(record, { url });
  if (p.state !== "PUBLISHED") return p;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on ?? "")) return refused(PUBLISH_REFUSE.NO_DAY, String(on ?? ""));
  return Object.freeze({ ...record, measurement_key: `${JOINED_RECORD}:${sha256(JSON.stringify([record.measurement_key, url, on])).slice(0, 24)}`, publishedUrl: url, publishedOn: on, publishedSha256: p.sha256, publishedFrom: record.measurement_key });
}
