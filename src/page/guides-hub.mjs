/**
 * RR-273 · THE GUIDES HUB: one page on the client's site that lists the client's LIVE guides, so a search engine finds them through the
 * site's own links. PURE: the stored records of the published pages in, the hub page, its checks and its record out. Nothing is fetched
 * or written here.
 *
 *   hubEntries   one entry per LIVE page, from its own published record: its address, its own H1 and its own two-line intro, word for
 *                word as the page shows them — nothing composed, no new claim. A page whose hero is not an H1 and two lines is refused.
 *   hubPage      the hub: the guides' own style, header and footer byte for byte (the client's design and logos), a title and one H1
 *                composed by the Title Law from a recorded search phrase, a self-referencing canonical, no noindex, an ItemList of the
 *                LIVE addresses (no FAQ data), and one section per guide — its H1 a link to the guide, its intro below. The base address
 *                is the guides' folder, so the logo the header names (assets/<file>) is the one the guides already serve.
 *   hubChecks    what a served hub must show, each check failing on its own fault alone
 *   hubRecord    the hub as built (the BUILD), and publishedHubRecord the same hub recorded as LIVE: where, when, by whose decision
 *   hubLinkPage  the hub as one page of F23's bounded link check: its address, and the links of its own list (the guides) — the header
 *                and footer are the guides' own, checked with the guides
 * It names no client, product, host or batch.
 */
import { createHash } from "node:crypto";
import { JOINED_RECORD, escapeText, composeTitle, titleWordsTraced, capitalsIn } from "./joined-page.mjs";
import { publishedHtml } from "./publish-page.mjs";
import { POPULATION } from "../audit/page-links.mjs";

export const HUB_RECORD = "guides_hub_page";
export const HUB_PAGE = "guides-hub";
export const HUB_REFUSE = Object.freeze({
  NO_PAGES: "NO_LIVE_PAGE",
  NO_HERO: "NO_H1_AND_TWO_LINE_INTRO",
  NO_ADDRESS: "NO_HTTPS_ADDRESS",
  NO_DESIGN: "NO_STYLE_HEADER_OR_FOOTER",
  MIXED_DESIGN: "THE_PAGES_DO_NOT_SHARE_ONE_DESIGN",
  NO_TITLE: "NO_TITLE_FROM_A_RECORDED_PHRASE",
  NO_DAY: "NO_PUBLICATION_DAY",
  NO_DECISION: "NO_OWNER_DECISION",
  NOT_A_HUB: "NOT_A_HUB_BUILD",
});
export const HUB_CHECK = Object.freeze({ PASS: "PASS", FAIL: "FAIL" });

const present = (v) => typeof v === "string" && v.trim() !== "";
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const refused = (reason, detail = null) => Object.freeze({ state: "REFUSED", reason, detail });
const httpsAddress = (u) => { try { const x = new URL(u); return x.protocol === "https:" && x.hash === "" && x.search === "" && x.href === u; } catch { return false; } };
const one = (re, s) => { const m = String(s ?? "").match(re); return m ? m[1] : null; };
const blockOf = (tag, s) => one(new RegExp(`(<${tag}[\\s\\S]*?<\\/${tag}>)`), s);
const styleOf = (s) => one(/(<style>[\s\S]*?<\/style>)/, s);
const mainOf = (s) => one(/<main>([\s\S]*?)<\/main>/, s);
/* the page's own escaping undone, for the ItemList's names: the five characters escapeText writes */
const unescape = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** A page's hero, as the page shows it: its H1 and the two lines after it, byte for byte. Null when the hero is not that shape. */
export function heroOf(html) {
  const m = String(html ?? "").match(/<section class="hero"><h1>([\s\S]*?)<\/h1>(<p>[\s\S]*?<\/p>)(<p>[\s\S]*?<\/p>)/);
  return m ? Object.freeze({ h1: m[1], intro: Object.freeze([m[2], m[3]]) }) : null;
}

/** One entry per LIVE page record (a record with a published address), in the order given: its own H1 and intro, nothing composed. */
export function hubEntries(records = []) {
  const entries = [];
  for (const r of records) {
    if (r?.record_type !== JOINED_RECORD || !present(r?.publishedUrl)) return refused(HUB_REFUSE.NO_PAGES, String(r?.value ?? ""));
    const hero = heroOf(r.html);
    if (!hero) return refused(HUB_REFUSE.NO_HERO, String(r.value));
    entries.push(Object.freeze({ page: r.value, url: r.publishedUrl, h1: hero.h1, intro: hero.intro, from: r.measurement_key, publishedSha256: r.publishedSha256 ?? null }));
  }
  if (entries.length === 0) return refused(HUB_REFUSE.NO_PAGES);
  return Object.freeze({ state: "LISTED", entries: Object.freeze(entries) });
}

/** The design the hub takes from the guides: their style, header and footer, the same on every guide — or refused. */
export function designOf(records = []) {
  const parts = records.map((r) => { const p = publishedHtml(r, { url: r.publishedUrl }); return p.state === "PUBLISHED" ? { style: styleOf(p.html), header: blockOf("header", p.html), footer: blockOf("footer", p.html) } : null; });
  if (parts.length === 0 || parts.some((p) => !p || !p.style || !p.header || !p.footer)) return refused(HUB_REFUSE.NO_DESIGN);
  if (parts.some((p) => p.style !== parts[0].style || p.header !== parts[0].header || p.footer !== parts[0].footer)) return refused(HUB_REFUSE.MIXED_DESIGN);
  return Object.freeze({ state: "DESIGN", ...parts[0] });
}

/** The hub's title: composed by the Title Law from ONE recorded search phrase, as the head of the page, every word traced. */
export function hubTitle({ phrase, entries = [] }) {
  if (!present(phrase?.phraseId) || !present(phrase?.text)) return refused(HUB_REFUSE.NO_TITLE);
  const head = { ...phrase, role: "HEAD", withYear: false };
  const capitals = capitalsIn([phrase.text, ...entries.map((e) => unescape(e.h1))]);
  const t = composeTitle({ phrases: [head], capitals });
  if (!present(t.title) || titleWordsTraced({ title: t.title, phrases: [head] }).length !== 0) return refused(HUB_REFUSE.NO_TITLE, t.missing ?? null);
  return Object.freeze({ state: "COMPOSED", title: t.title, trace: t.trace });
}

/** The ItemList of the LIVE addresses, in the hub's order. */
export const itemListOf = (entries) => ({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: entries.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: e.url, name: unescape(e.h1) })) });
const jsonInScript = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const folderOf = (url) => url.replace(/\/?$/, "/");

/** The hub page. */
export function hubPage({ entries = [], design, title, url }) {
  if (!httpsAddress(url)) return refused(HUB_REFUSE.NO_ADDRESS, String(url ?? ""));
  if (design?.state !== "DESIGN") return refused(HUB_REFUSE.NO_DESIGN);
  if (!present(title)) return refused(HUB_REFUSE.NO_TITLE);
  if (entries.length === 0) return refused(HUB_REFUSE.NO_PAGES);
  const html = [
    "<!doctype html>",
    `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${escapeText(folderOf(url))}"><link rel="canonical" href="${escapeText(url)}"><title>${escapeText(title)}</title>${design.style}`,
    `<script type="application/ld+json">${jsonInScript(itemListOf(entries))}</script></head><body>`,
    design.header,
    "<main>",
    `<section class="hero"><h1>${escapeText(title)}</h1></section>`,
    ...entries.map((e) => `<section class="guide"><h2><a href="${escapeText(e.url)}">${e.h1}</a></h2>${e.intro.join("")}</section>`),
    "</main>",
    design.footer,
    "</body></html>",
    "",
  ].join("\n");
  return Object.freeze({ state: "BUILT", html, sha256: sha256(html), url });
}

/** What a served hub must show, against the hub as built from these entries: each check PASS or FAIL with what was seen. */
export function hubChecks({ html, entries = [], design, title, url }) {
  const s = String(html ?? "");
  const want = hubPage({ entries, design, title, url });
  const ok = (b, why = null) => Object.freeze({ state: b ? HUB_CHECK.PASS : HUB_CHECK.FAIL, ...(b ? {} : { why }) });
  const main = mainOf(s) ?? "";
  const hrefs = [...main.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  const canon = [...s.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
  const lds = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const list = (() => { try { return lds.length === 1 ? JSON.parse(lds[0]) : null; } catch { return null; } })();
  const sections = [...main.matchAll(/<section class="guide">([\s\S]*?)<\/section>/g)].map((m) => m[1]);
  const h1s = [...s.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  return Object.freeze({
    titleAndOneH1: ok(one(/<title>([\s\S]*?)<\/title>/, s) === escapeText(title) && h1s.length === 1 && h1s[0] === escapeText(title), `title ${JSON.stringify(one(/<title>([\s\S]*?)<\/title>/, s))} · h1 ${JSON.stringify(h1s)}`),
    everyGuideLinkedOnce: ok(hrefs.length === entries.length && entries.every((e, i) => hrefs[i] === escapeText(e.url)), `links ${hrefs.length} of ${entries.length}`),
    ownH1AndIntroWordForWord: ok(sections.length === entries.length && entries.every((e, i) => sections[i] === `<h2><a href="${escapeText(e.url)}">${e.h1}</a></h2>${e.intro.join("")}`), "an entry is not its page's own H1 and intro"),
    canonicalOwnAddress: ok(canon.length === 1 && canon[0] === escapeText(url), `canonical ${JSON.stringify(canon)}`),
    noNoindex: ok(!/<meta[^>]+name="robots"[^>]+noindex/i.test(s), "a noindex line is on the page"),
    noFaqData: ok(!/FAQPage/.test(s), "FAQ structured data is on the page"),
    itemListOfTheGuides: ok(list?.["@type"] === "ItemList" && Array.isArray(list.itemListElement) && list.itemListElement.length === entries.length && entries.every((e, i) => list.itemListElement[i]?.url === e.url && list.itemListElement[i]?.position === i + 1), "the ItemList is not the guides' addresses in order"),
    headerFooterAsTheGuides: ok(design?.state === "DESIGN" && blockOf("header", s) === design.header && blockOf("footer", s) === design.footer && styleOf(s) === design.style, "the client's header, footer or style is not the guides'"),
    logoFromTheGuidesFolder: ok(one(/<base href="([^"]*)">/, s) === escapeText(folderOf(String(url ?? ""))), "the base address is not the guides' folder: the header's logo would not resolve"),
    sameAsBuilt: ok(want.state === "BUILT" && s === want.html, want.state === "BUILT" ? "the served hub differs from the hub as built" : want.reason),
  });
}

/** The hub as built: its page, the pages it lists (by the record each entry came from) and the phrase its title came from. */
export function hubRecord({ entries = [], design, title, trace = [], url, subject, assets = [], on }) {
  const p = hubPage({ entries, design, title, url });
  if (p.state !== "BUILT") return p;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on ?? "")) return refused(HUB_REFUSE.NO_DAY, String(on ?? ""));
  return Object.freeze({
    record_type: HUB_RECORD, measurement_key: `${HUB_RECORD}:${sha256(JSON.stringify([url, p.sha256])).slice(0, 24)}`, value: HUB_PAGE, subject: subject ?? null, url, title, titleTrace: trace,
    entries: entries.map((e) => ({ page: e.page, url: e.url, from: e.from, publishedSha256: e.publishedSha256 })), assets, html: p.html, sha256: p.sha256, recorded_at: `${on}T00:00:00Z`,
  });
}

/** The hub recorded as LIVE: the build again, saying where and when it was published and by whose decision. A new record. */
export function publishedHubRecord(record, { on, decision }) {
  if (record?.record_type !== HUB_RECORD || !present(record?.html) || sha256(record.html) !== record.sha256) return refused(HUB_REFUSE.NOT_A_HUB);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on ?? "")) return refused(HUB_REFUSE.NO_DAY, String(on ?? ""));
  if (!/^_handoffs:\S+\.md$/.test(decision ?? "")) return refused(HUB_REFUSE.NO_DECISION, String(decision ?? ""));
  return Object.freeze({ ...record, measurement_key: `${HUB_RECORD}:${sha256(JSON.stringify([record.measurement_key, on])).slice(0, 24)}`, publishedUrl: record.url, publishedOn: on, publishedSha256: record.sha256, publishedFrom: record.measurement_key, publishedBy: { decision }, recorded_at: `${on}T00:00:00Z` });
}

/** The hub as one LIVE page of F23's bounded link check: the latest LIVE hub at this address; its links are those of its own list. */
export function hubLinkPage({ records = [], url, hosts = [] }) {
  const hub = records.filter((r) => r?.record_type === HUB_RECORD && r.publishedUrl === url).at(-1) ?? null;
  if (!hub) return null;
  let host = null; try { host = new URL(url).hostname; } catch { /* no address */ }
  if (!hosts.includes(host)) return null;
  return Object.freeze({ population: POPULATION.LIVE, batchId: null, pageId: hub.value, build: hub.publishedFrom, canonical: url, html: `<main>${mainOf(hub.html) ?? ""}</main>`, internalHosts: Object.freeze([...hosts]) });
}
