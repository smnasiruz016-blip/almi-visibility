/**
 * 🔴 LANGUAGES (RR-298 A; RTP-1 P16: one answer, many languages). The 10 most used languages; the client picks which ones per product.
 * Every language version of a page or article says the SAME facts — the same numbers, units, conditions, sources and checked dates — only
 * the wording changes (the same-meaning rule, numbers and conditions exact). Arabic and Urdu are right-to-left. Each language page links
 * its siblings (hreflang, and x-default) and is in the sitemap; every language version passes all gates, judged within its own language.
 * A language whose translation is not worthy is NOT published — refused by name, and the report says so.
 * Translation runs on the client's OWN AI connection (its cost is the client's); this module never translates — it checks and builds what
 * it is handed. Pure: nothing is fetched, written or published. Generic: no client is named.
 */
import { renderItems, gateInput, servedBy } from "./one-builder.mjs";
import { allGates } from "./page-gates.mjs";

export const LANGUAGES = Object.freeze([
  { code: "en", name: "English", dir: "ltr" }, { code: "es", name: "Spanish", dir: "ltr" }, { code: "de", name: "German", dir: "ltr" },
  { code: "it", name: "Italian", dir: "ltr" }, { code: "fr", name: "French", dir: "ltr" }, { code: "pt", name: "Portuguese", dir: "ltr" },
  { code: "ar", name: "Arabic", dir: "rtl" }, { code: "ur", name: "Urdu", dir: "rtl" }, { code: "hi", name: "Hindi", dir: "ltr" },
  { code: "zh", name: "Chinese", dir: "ltr" },
].map(Object.freeze));
const byCode = new Map(LANGUAGES.map((l) => [l.code, l]));

/** The client's languages for one product: a subset of the ten, the base language first. A code outside the ten is refused, named. */
export function chooseLanguages(codes = ["en"]) {
  const faults = codes.filter((c) => !byCode.has(c)).map((c) => `"${c}" is not one of the ten languages`);
  const list = [...new Set(codes.filter((c) => byCode.has(c)))];
  if (!list.length) faults.push("at least one language is needed");
  return Object.freeze({ languages: Object.freeze(list), valid: faults.length === 0, faults: Object.freeze(faults) });
}

/* numbers in any script, thousands and decimal marks ignored: "1,400" = "1400" = "١٤٠٠" = "۱۴۰۰" */
const DIGITS = [["٠", 0x0660], ["۰", 0x06f0], ["०", 0x0966], ["０", 0xff10]];
const toAscii = (s) => String(s ?? "").replace(/[٠-٩۰-۹०-९０-９]/g, (ch) => { const c = ch.charCodeAt(0); const base = DIGITS.find(([, b]) => c >= b && c <= b + 9)[1]; return String(c - base); });
export const numbersOf = (s) => (toAscii(s).match(/\d+(?:[.,٫٬\s]\d+)*/g) ?? []).map((n) => n.replace(/[.,٫٬\s]/g, "")).sort();
const MONEY = /[A-Z]{1,3}\$|US\$|€|£|¥|\b(?:USD|EUR|GBP|PKR|INR|AUD|CAD)\b/g;
const moneyOf = (s) => [...new Set(String(s ?? "").match(MONEY) ?? [])].sort();
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Check one translation against its source. `source` { question, claims: [{ claimId, text }], cards: [{ claimId, value }] };
 * `t` { lang, question, claims: [{ claimId, text }], cards: [{ claimId, value }], by }. Returns { ok, why }.
 */
export function checkTranslation(source, t) {
  if (!byCode.has(t?.lang)) return { ok: false, why: `"${t?.lang}" is not one of the ten languages` };
  if (typeof t.question !== "string" || !t.question.trim()) return { ok: false, why: "the question is not translated" };
  const ids = source.claims.map((c) => c.claimId).sort(), tids = (t.claims ?? []).map((c) => c.claimId).sort();
  if (!same(ids, tids)) return { ok: false, why: "the translation does not hold the same facts (a fact added or dropped)" };
  for (const c of source.claims) {
    const x = t.claims.find((y) => y.claimId === c.claimId);
    if (!x?.text?.trim()) return { ok: false, why: `${c.claimId}: not translated` };
    if (!same(numbersOf(c.text), numbersOf(x.text))) return { ok: false, why: `${c.claimId}: a number changed or was dropped (${numbersOf(c.text).join(", ") || "none"} → ${numbersOf(x.text).join(", ") || "none"})` };
    if (!same(moneyOf(c.text), moneyOf(x.text))) return { ok: false, why: `${c.claimId}: a currency changed` };
  }
  for (const k of source.cards ?? []) {
    const x = (t.cards ?? []).find((y) => y.claimId === k.claimId);
    if (!x?.value?.trim()) return { ok: false, why: `${k.claimId}: its key-fact card is not translated` };
    if (!same(numbersOf(k.value), numbersOf(x.value)) || !same(moneyOf(k.value), moneyOf(x.value))) return { ok: false, why: `${k.claimId}: the card's number or currency changed` };
    if (!numbersOf(x.value).every((n) => numbersOf(t.claims.find((y) => y.claimId === k.claimId)?.text).includes(n))) return { ok: false, why: `${k.claimId}: the card says what its translated fact does not` };
  }
  return { ok: true, why: null };
}

const urlIn = (lang, url) => { const u = new URL(url); return lang === "en" ? u.href : `${u.origin}/${lang}${u.pathname}`; };

/**
 * Build the language versions of ONE page by the one renderer. `page` { url, title, items, questions }, its English `cards`,
 * `translations` [t...]. The sources, links and checked dates are the page's own — never translated. Returns { versions, refused }.
 */
export function languageVersions({ page, keyFacts = [], translations = [], design, on, related = () => [] }) {
  const claims = page.items.flatMap((it) => it.claims);
  const source = { question: page.title, claims: claims.map((c) => ({ claimId: c.claimId, text: c.text })), cards: keyFacts.filter((k) => claims.some((c) => c.claimId === k.claimId)) };
  const refused = [], ok = [];
  for (const t of translations) { const r = checkTranslation(source, t); (r.ok ? ok : refused).push(r.ok ? t : { lang: t?.lang ?? null, url: urlIn(t?.lang ?? "en", page.url), why: r.why }); }
  const langs = ["en", ...ok.map((t) => t.lang)];
  const alternates = (urlOf) => [...langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlOf(l)}">`), `<link rel="alternate" hreflang="x-default" href="${urlOf("en")}">`].join("");
  const dress = (html, lang) => { const L = byCode.get(lang); return String(html).replace('<html lang="en">', `<html lang="${lang}"${L.dir === "rtl" ? ' dir="rtl"' : ""}>`).replace("</head>", `${alternates((l) => urlIn(l, page.url))}</head>`); };
  const versions = [];
  for (const lang of langs) {
    const t = ok.find((x) => x.lang === lang);
    const items = lang === "en" ? page.items : page.items.map((it, i) => ({ ...it, heading: { wording: i === 0 ? t.question : it.heading.wording }, questions: i === 0 ? [{ questionId: `${it.needId}:${lang}`, wording: t.question }] : it.questions,
      claims: it.claims.map((c) => ({ ...c, text: t.claims.find((y) => y.claimId === c.claimId).text, quotation: t.claims.find((y) => y.claimId === c.claimId).text })) }));
    const facts = lang === "en" ? keyFacts : (t.cards ?? []).map((k) => ({ ...k }));
    const r = renderItems({ title: lang === "en" ? page.title : t.question, items, keyFacts: facts, rates: [], quotationOf: lang === "en" ? (id) => claims.find((c) => c.claimId === id)?.quotation ?? null : (id) => items.flatMap((it) => it.claims).find((c) => c.claimId === id)?.text ?? null, design, stamp: null, on, related: related(lang) });
    const url = urlIn(lang, page.url);
    versions.push(Object.freeze({ lang, dir: byCode.get(lang).dir, url, title: lang === "en" ? page.title : t.question, questions: items.flatMap((it) => it.questions.map((q) => q.wording)), answer: claims.map((c) => c.claimId), items, html: dress(r.html, lang), cards: r.cards, by: lang === "en" ? null : t.by ?? null }));
  }
  return Object.freeze({ versions: Object.freeze(versions), refused: Object.freeze(refused) });
}

/** Gate every language version within its own language (a translation is never a duplicate of its sibling), and list the sitemap. */
export function gateLanguages({ versions, guidance, on, cost, robotsTxt, extraPagesFor = () => [] }) {
  const by = new Map();
  for (const v of versions) { if (!by.has(v.lang)) by.set(v.lang, []); by.get(v.lang).push(v); }
  const results = [];
  for (const [lang, vs] of by) {
    const gated = vs.map(gateInput);
    for (const r of allGates(gated, { guidance, on, cost, site: { robotsTxt, sitemapUrls: versions.map((v) => v.url), serve: servedBy(versions), extraPages: extraPagesFor(lang) } })) {
      results.push(Object.freeze({ lang, url: r.id, pass: r.pass, failed: Object.values(r.gates).flatMap((g) => (g?.checks ?? []).filter((c) => c.result !== "PASS").map((c) => `${g.gate}: ${c.reason ?? c.name}`)) }));
    }
  }
  return Object.freeze({ results: Object.freeze(results), sitemap: Object.freeze(versions.map((v) => v.url)) });
}
