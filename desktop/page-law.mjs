/**
 * 🔴 RR-378b/c · THE Q&A LAW'S PUBLISH GATE (C:\Projects\_handoffs\ALMIVISIBILITY_QA_LAW_v1.md, sections 5, 5A, 5B): what a page shows a
 * customer, read from the page itself, as it goes live. A page with any fault here is not ready and is never published, for every client.
 * The same functions scan the real pages for the owner's check (section 9.4). Pure: html in, faults out.
 *   pageFaults(html, { url, known })  one page: forbidden texts (5.2), a question with no answer (5.1), the FAQ data not equal to the
 *                                      visible Q&A (5.4), an answer without its source and check date, or naming its source twice (5.5),
 *                                      no "Last checked" (5A), the canonical not its own address (5A), an internal link to no page (5A)
 *   setFaults(pages)                    across the set: two pages with one title or one description (5A); one fee from one source with
 *                                      two values (5A "one fact, one value")
 */
import { withoutNotes } from "./empty-answers.mjs";

const decode = (s) => String(s ?? "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const text = (h) => decode(String(h ?? "").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const norm = (s) => decode(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mainOf = (h) => /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(String(h ?? ""))?.[1] ?? "";
/* 5.2: never shown to a customer, on the page or in its FAQ data */
/* 🔴 RR-408 B3: "404" is forbidden as an ERROR MESSAGE ("404 – Page not found", "Error 404", a block that says only "404"), never as digits
 * inside a longer number: `\b404\b` failed three AlmiSalary pages on "৳1,404,000". N404 = a 404 that is not part of a longer number. */
const N404 = String.raw`(?<![\w.,])404(?![.,]?\d|\w)`;
export const ERROR_404 = new RegExp(String.raw`^\s*(?:error\s*)?404\s*[.!]?\s*$|${N404}\s*(?:[-–—:|·]\s*)?(?:error\b|(?:this\s+)?(?:page|file|url|document)?\s*(?:could\s+not\s+be|was\s+not|is\s+not|not)\s+found)|\b(?:error|http|status)(?:\s+code)?\s*:?\s*${N404}|\bnot\s+found\b[^.!?]{0,10}${N404}`, "i");
export const FORBIDDEN = Object.freeze([/\bdoes not say this\b/i, /\bcould not be read\b/i, /\b(?:still )?being looked for\b/i, ERROR_404, /\bwork note\b/i, /\bnot read yet\b/i, /\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\bTODO\b/, /\bour reader\b/i, /\bthe judge\b/i, /\bstand-in\b/i, /\bthe pages checked show\b/i]);
/** how a forbidden rule is named in a fault (the 404 rule is too long to print) */
export const forbiddenName = (re) => (re === ERROR_404 ? "a 404 error message" : re.source);
/* 🔴 RR-408 B1: a page's text as its BLOCKS (a heading, paragraph, list item, table cell, ...). A forbidden phrase counts inside one block
 * only: the scan joined the heading "What officialdom does not say" and the next paragraph "This is the part…" and read "does not say this".
 * Inline tags (a, strong, em, span) stay inside their block, so "does not <em>say</em> this" in one paragraph still fails. */
const BLOCK_TAG = /<\/?(?:p|h[1-6]|li|td|th|tr|dt|dd|div|section|article|header|footer|nav|aside|main|details|summary|blockquote|figcaption|figure|caption|pre|table|thead|tbody|tfoot|ul|ol|dl|form|fieldset|legend|label|button|option|select|textarea|br|hr)\b[^>]*>/gi;
export const textBlocks = (h, dec = decode) => String(h ?? "").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "\u0001").replace(BLOCK_TAG, "\u0001").replace(/<[^>]+>/g, " ").split("\u0001").map((s) => dec(s).replace(/\s+/g, " ").trim()).filter(Boolean);
/** the forbidden rules any one block breaks (blocks: a list of strings, each one block) */
export const forbiddenInBlocks = (blocks) => FORBIDDEN.filter((re) => blocks.some((b) => re.test(b))).map(forbiddenName);
/** the questions and answers a customer sees: each <details> with its <summary> and the answer paragraphs under it */
export function visibleQa(html) {
  return [...mainOf(html).matchAll(/<details\b[^>]*data-need-id[^>]*>([\s\S]*?)<\/details>/gi)].map((m) => { /* a question block; a "choose your country" list is navigation, not a question */
    const q = text(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(m[1])?.[1] ?? ""), ps = [...m[1].replace(/<summary\b[\s\S]*?<\/summary>/i, "").matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)];
    const answers = ps.filter((p) => !/class="checked"/.test(p[1])).map((p) => ({ html: p[2], words: text(p[2].replace(/<a class="src"[\s\S]*?<\/a>|<span class="src">[\s\S]*?<\/span>/gi, "")) })).filter((a) => a.words);
    return { q, answers };
  }).filter((x) => x.q);
}
/** the FAQ data: every FAQPage's questions and answers */
export function faqData(html) {
  const out = []; for (const m of String(html ?? "").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) { let j; try { j = JSON.parse(m[1]); } catch { continue; } for (const x of [j].flat()) if (x?.["@type"] === "FAQPage") for (const e of [x.mainEntity ?? []].flat()) out.push({ q: decode(e?.name ?? ""), a: decode([e?.acceptedAnswer ?? []].flat().map((a) => a?.text ?? "").join(" ")) }); }
  return out;
}
export function pageFaults(html, { url = null, known = null } = {}) {
  const h = String(html ?? ""), main = mainOf(h), faults = [], qa = visibleQa(h), shown = text(main);
  for (const f of forbiddenInBlocks(textBlocks(main))) faults.push(`a customer would read forbidden words (/${f}/)`);
  for (const x of faqData(h)) for (const f of forbiddenInBlocks([x.q, x.a])) faults.push(`the FAQ data holds forbidden words (/${f}/)`);
  for (const x of qa) { if (!x.answers.length) faults.push(`"${x.q.slice(0, 80)}" is shown with no answer`); for (const a of x.answers) { if (withoutNotes(a.words) !== a.words) faults.push(`"${x.q.slice(0, 60)}": its answer holds a work note`); if (!/<a class="src" href="https?:\/\/[^"]+"/.test(a.html)) faults.push(`"${x.q.slice(0, 60)}": an answer without its source link`); else if (!/checked \d{4}-\d{2}-\d{2}/.test(a.html)) faults.push(`"${x.q.slice(0, 60)}": an answer without the date it was checked`); if (/\(Source: [^)]*\)/.test(a.words)) faults.push(`"${x.q.slice(0, 60)}": its source is named twice`); } }
  const faq = faqData(h); if (faq.length) { const seen = new Map(qa.map((x) => [norm(x.q), x])); for (const f of faq) { const v = seen.get(norm(f.q)); if (!v) faults.push(`the FAQ data asks "${f.q.slice(0, 60)}", which the page does not show`); else if (!v.answers.some((a) => norm(a.words).includes(norm(f.a).slice(0, 120)) || norm(f.a).includes(norm(a.words).slice(0, 120)))) faults.push(`the FAQ data answers "${f.q.slice(0, 60)}" with words the page does not show`); } const asked = new Set(faq.map((f) => norm(f.q))); for (const x of qa) if (x.answers.length && !asked.has(norm(x.q))) faults.push(`"${x.q.slice(0, 60)}" is shown but not in the FAQ data`); }
  if (main && !/Last checked/i.test(main)) faults.push("no \"Last checked\" date");
  if (url) { const c = [...h.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => decode(m[1])); if (c.length && (c.length !== 1 || c[0] !== url)) faults.push(`its canonical is not its own address (${c.join(", ")})`); }
  if (url && known) { let origin = null; try { origin = new URL(url).origin; } catch { /* no address */ } const lists = [...main.matchAll(/<section class="related"[\s\S]*?<\/section>|<section class="av-choose"[\s\S]*?<\/section>|<nav class="av-bar"[\s\S]*?<\/nav>/gi)].map((m) => m[0]).join(" "); /* the links that lead to the set's pages and the site's own; the offer button is the client's own address */ for (const m of lists.matchAll(/<a\b[^>]*href="([^"#]+)"/gi)) { let u; try { u = new URL(decode(m[1]), url); } catch { continue; } if (u.origin !== origin) continue; const k = `${u.origin}${u.pathname.replace(/\/+$/, "")}`; if (!known.has(k) && k !== origin) faults.push(`a link to ${u.pathname}, a page that does not exist`); } }
  return [...new Set(faults)];
}
const titleOf = (h) => text(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(String(h ?? ""))?.[1] ?? "");
const descOf = (h) => decode(/<meta name="description" content="([^"]*)"/i.exec(String(h ?? ""))?.[1] ?? "");
const MONEY = /\b(AUD|USD|GBP|EUR|NZD|CAD|SGD)\s?(\d[\d,]*(?:\.\d\d)?)\b/g;
/** across the set → Map(url → faults) */
export function setFaults(pages = []) {
  const out = new Map(pages.map((p) => [p.url, []])), by = (f) => { const m = new Map(); for (const p of pages) { const k = norm(f(p.html)); if (!k) continue; m.set(k, [...(m.get(k) ?? []), p.url]); } return m; };
  for (const [, urls] of by(titleOf)) if (urls.length > 1) for (const u of urls) out.get(u).push(`its title is the title of ${urls.length - 1} other page(s)`);
  for (const [, urls] of by(descOf)) if (urls.length > 1) for (const u of urls) out.get(u).push(`its description is the description of ${urls.length - 1} other page(s)`);
  /* one fact, one value: the OET fee (a currency amount in an answer about cost) from the same source page, on every page the same */
  const fee = new Map(); for (const p of pages) for (const x of visibleQa(p.html)) { if (!/\b(?:cost|fee|price|how much)\b/i.test(x.q)) continue; for (const a of x.answers) { const src = /<a class="src" href="([^"]+)"/.exec(a.html)?.[1]; if (!src) continue; const firstAud = /\bAUD\s?(\d[\d,]*)/.exec(a.words)?.[1]?.replace(/,/g, ""); if (!firstAud || !/oet/i.test(src)) continue; const k = decode(src); fee.set(k, [...(fee.get(k) ?? []), { url: p.url, v: firstAud }]); } }
  for (const [src, rows] of fee) { const vals = [...new Set(rows.map((r) => r.v))]; if (vals.length > 1) { const most = vals.map((v) => [v, rows.filter((r) => r.v === v).length]).sort((a, b) => b[1] - a[1])[0][0]; for (const r of rows) if (r.v !== most) out.get(r.url).push(`one fact, two values: the OET fee from ${src} is AUD ${r.v} here and AUD ${most} on other pages`); } }
  for (const [k, v] of out) out.set(k, [...new Set(v)]);
  return out;
}
export const MONEY_RE = MONEY;
