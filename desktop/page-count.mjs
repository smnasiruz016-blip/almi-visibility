/**
 * 🔴 RR-318 C · "HOW MANY PAGES CAN I MAKE FOR THIS PRODUCT?" (the owner's own design, 23 Oct 2026):
 *   1 the client picks the DIMENSIONS — countries, universities, professions / job roles, subjects, cities, or their own (several at once);
 *   2 each dimension is FILTERED BY REALITY: an item is kept only when an official page shows it — the subject's own site (e.g. oet.com has
 *     a page for Ireland that says OET is recognised there; a page for each of its 12 professions) or a body's own page naming the subject —
 *     each kept item with that page and the day it was checked; a dropped item says why. The candidates come from Visibility's own country
 *     list, or a list the client adds as a file (AlmiWorld's universities, its job roles);
 *   3 then the advice, honestly: "Yes — possible and good: N pages" or "No — better this way" (never 196 × 12 near-identical pages, which
 *     Google treats as scaled content abuse — one page per country, each profession a section inside it). THE SAMENESS RULE: the country a
 *     person comes from never splits a question; what is specific to a country goes inside the one page for it;
 *   4 the final number, the list, and "Make these pages (drafts)". Nothing is published for AlmiWorld.
 * Reads only through desktop/official.mjs (robots obeyed, paced, GET only, nothing kept but what was measured).
 */
import { COUNTRIES, COUNTRY_LIST_SOURCE, countriesIn, namesOf, slugOf } from "./world.mjs";
import { itemOnSubjectSite } from "./official.mjs";
import { universityFunnel } from "./universities.mjs"; // RR-320 D

export const DIMENSIONS = Object.freeze([
  { id: "countries", label: "Countries", list: `built in — ${COUNTRY_LIST_SOURCE}` },
  { id: "universities", label: "Universities", list: "a file you add (for example your own university list)" },
  { id: "roles", label: "Professions / job roles", list: "a file you add (for example your job-role list)" },
  { id: "subjects", label: "Subjects", list: "a file you add, or typed one per line" },
  { id: "cities", label: "Cities", list: "typed one per line, or a file" },
  { id: "own", label: "Your own", list: "typed one per line" },
].map(Object.freeze));
export const SPAM_RULE = "Google's spam policies call many near-identical pages made for the variations of one question \"scaled content abuse\".";
export const SPAM_SOURCE = "https://developers.google.com/search/docs/essentials/spam-policies";
export const SAMENESS = "The country a person comes from never splits a question; what is specific to a country goes inside the one page for it.";
const plural = (n, one, many = `${one}s`) => `${Number(n).toLocaleString("en-US")} ${n === 1 ? one : many}`;
const day = (d) => String(d ?? "").slice(0, 10);

/** A list file the client adds — CSV, Excel, JSON or one per line (desktop/lists.mjs, RR-319 B2) */
export { listFromFile } from "./lists.mjs";

/* ── the subject's own site, as lists ── */
/* the parent address with the most short child pages that are not countries is the site's list of professions (oet.com: its 12 sample-test
 * pages /…/nursing, /…/medicine …); a blog's long addresses never count */
export function professionPagesOf(urls) {
  const groups = new Map();
  for (const u of urls) { let p; try { p = new URL(u).pathname.replace(/\/+$/, ""); } catch { continue; } const seg = p.split("/").pop(), parent = p.slice(0, p.length - seg.length);
    if (!seg || parent === "/" || seg.split("-").length > 2 || /\d/.test(seg) || /\/(post|posts|blog|blogs|news|article|articles|story|stories|press|events?|tag|tags|category)\//i.test(parent) || countriesIn(seg.replace(/-/g, " ")).length) continue;
    groups.set(parent, [...(groups.get(parent) ?? []), { slug: seg, url: u }]); }
  const best = [...groups.entries()].filter(([, xs]) => xs.length >= 5).sort((a, b) => b[1].length - a[1].length || a[0].length - b[0].length)[0];
  return best ? best[1] : [];
}
/* a word's stem, so "nurse" meets "nursing" and "pharmacist" meets "pharmacy" */
const stem = (w) => { w = String(w).toLowerCase(); for (const s of ["istry", "ists", "ist", "ians", "ian", "ics", "ing", "ers", "er", "y", "s", "e"]) if (w.length - s.length >= 4 && w.endsWith(s)) return w.slice(0, -s.length); return w; };
/* the plain words a profession is also called by (a doctor works in "medicine"; a dietitian in "dietetics") */
const ALSO = Object.freeze({ physiotherap: ["physical therapist", "physiotherapist"], dent: ["oral surgeon", "orthodontist", "periodontist", "endodontist", "prosthodontist"], medicin: ["doctor", "physician", "surgeon", "general practitioner", "medical practitioner"], dietet: ["dietitian", "dietician", "nutritionist"], veterinar: ["veterinarian", "vet", "veterinary surgeon"], "speech patholog": ["speech therapist", "speech and language therapist", "speech-language pathologist"], nurs: ["midwife"] });
const GENERIC = new Set(["science", "sciences", "studies", "practice", "test", "tests"]);
const keyOf = (slug) => slug.split("-").filter((w) => !GENERIC.has(w)).map(stem).join(" ");
/** which profession page of the subject's site a role or subject is (or null) */
/* a role that SUPPORTS a profession is not that profession ("Pharmacy Technician" is no pharmacist, "Dental Assistant" no dentist) */
const SUPPORT = new Set(["technician", "technologist", "assistant", "aide", "receptionist", "manager", "clerk", "coordinator", "administrator", "representative", "secretary", "scheduler", "biller", "coder", "lecturer", "teacher", "professor", "researcher", "writer", "sales", "rep", "director", "officer", "inspector", "educator", "trainer", "consultant", "specialist", "analyst", "engineer", "attendant", "porter", "cleaner"]);
export function professionOf(name, professions) {
  const words = String(name).toLowerCase().replace(/[^a-z ]+/g, " ").split(/\s+/).filter(Boolean), stems = words.map(stem), text = ` ${words.join(" ")} `;
  if (SUPPORT.has(words.at(-1))) return null;
  for (const p of professions) { const ks = keyOf(p.slug).split(" "); if (ks.every((x) => stems.includes(x))) return p; }
  /* the plain words, as WHOLE words ("physician" is not inside "physical"), the longest first ("oral surgeon" is a dentist before "surgeon"
   * is a doctor) */
  const st = ` ${stems.join(" ")} `;
  const hits = professions.flatMap((p) => (ALSO[keyOf(p.slug)] ?? []).filter((a) => text.includes(` ${a} `) || st.includes(` ${a.split(" ").map(stem).join(" ")} `) || (!a.includes(" ") && a.length >= 6 && words.some((w) => w.endsWith(a)))).map((a) => ({ p, len: a.length }))); // "neurosurgeon" ends with "surgeon"
  return hits.sort((x, y) => y.len - x.len)[0]?.p ?? null;
}

/**
 * THE REALITY FILTER for the chosen dimensions. `lists` = { countries?, universities?, roles?, subjects?, cities?, own? } (items { name, … });
 * countries default to Visibility's own list. Returns per dimension { candidates, kept:[{ name, source, checkedOn, how }], dropped:[{ name,
 * why }], notVerified?:[…] } — never a kept item without its official page.
 */
export async function realityFilter({ dims, lists = {}, subject, subjectName = subject, subjectSite, reader, maxUniversityReads = 0, siteProfessions = false, queries = [], countryWeight = {}, onProgress = () => {} }) {
  const tell = (s) => { try { onProgress(s); } catch {} };
  tell(`Reading ${subjectName}'s own site (its list of pages)`);
  const sm = await reader.sitemapOf(subjectSite);
  if (!sm.ok) return { ok: false, why: `${subjectName}'s own site (${subjectSite}) could not be read: ${sm.why}. Visibility keeps nothing it cannot check on an official page.` };
  const out = { ok: true, subject, subjectName, subjectSite: sm.origin, checkedOn: reader.on, pagesListed: sm.urls.length, dims: {} };
  const professions = professionPagesOf(sm.urls);
  /* countries */
  let keptCountries = null;
  if (dims.includes("countries")) {
    const cands = (lists.countries?.length ? lists.countries.map((x) => x.name) : COUNTRIES);
    const kept = [], dropped = [];
    for (const [i, c] of cands.entries()) {
      const slugs = namesOf(c).map(slugOf);
      const listed = sm.urls.some((u) => slugs.some((s) => new RegExp(`(^|/|-)${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|-|$)`).test(new URL(u).pathname.toLowerCase())));
      if (!listed) { dropped.push({ name: c, why: `${subjectName}'s own site has no page for it (its page list, read ${reader.on})` }); continue; }
      tell(`Checking ${c} on ${subjectName}'s own pages (${i + 1} of ${cands.length})`);
      const k = await itemOnSubjectSite({ item: c, subject, subjectName, sitemapUrls: sm.urls, reader });
      if (k.kept) kept.push({ name: c, source: k.source, checkedOn: k.checkedOn, how: k.how, bodies: k.bodies ?? [] }); else dropped.push({ name: c, why: k.why });
    }
    out.dims.countries = { candidates: cands.length, from: lists.countries?.length ? "your list" : COUNTRY_LIST_SOURCE, kept, dropped };
    keptCountries = new Set(kept.map((k) => k.name));
  }
  /* professions: the subject site's own profession pages, each read once */
  const profRead = new Map();
  const confirm = async (p) => { if (!profRead.has(p.url)) profRead.set(p.url, await reader.read(p.url)); const r = profRead.get(p.url); return r.ok && new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(`${r.title} ${r.text}`) ? r : null; };
  if (dims.includes("roles")) {
    /* RR-320 A: "12 professions" with no list of his own → the subject site's own profession pages are the list */
    const cands = lists.roles?.length ? lists.roles : siteProfessions ? professions.map((p) => ({ name: p.slug.replace(/-/g, " ") })) : [];
    const kept = [], dropped = [];
    if (!cands.length) out.dims.roles = { candidates: 0, kept, dropped, missing: "Add your list of professions or job roles as a file — Visibility then keeps only those the official site has a page for." };
    else {
      for (const r of cands) { const p = [r.name, ...(r.aliases ?? [])].map((x) => professionOf(x, professions)).find(Boolean) ?? null; if (!p) { dropped.push({ name: r.name, why: `${subjectName}'s own site has no page for this profession` }); continue; } const ok = await confirm(p); if (ok) kept.push({ name: r.name, profession: p.slug.replace(/-/g, " "), source: { url: ok.url, title: ok.title }, checkedOn: ok.checkedOn, how: `${subjectName}'s own page for ${p.slug.replace(/-/g, " ")}` }); else dropped.push({ name: r.name, why: `${subjectName}'s page for ${p.slug.replace(/-/g, " ")} could not be read` }); }
      out.dims.roles = { candidates: cands.length, from: "your list", kept, dropped, professions: [...new Set(kept.map((k) => k.profession))] };
    }
  }
  /* subjects: kept when one of the subject site's professions is in it */
  let keptSubjects = null;
  if (dims.includes("subjects")) {
    const cands = lists.subjects ?? [];
    const kept = [], dropped = [];
    for (const s of cands) { const words = slugOf(s.name).split("-").map(stem); const p = professions.find((x) => keyOf(x.slug).split(" ").every((k) => words.includes(k))); if (!p) { dropped.push({ name: s.name, why: `none of ${subjectName}'s profession pages is in this subject` }); continue; } const ok = await confirm(p); if (ok) kept.push({ name: s.name, source: { url: ok.url, title: ok.title }, checkedOn: ok.checkedOn, how: `${subjectName}'s own page for ${p.slug.replace(/-/g, " ")} is in this subject` }); else dropped.push({ name: s.name, why: "its official page could not be read" }); }
    out.dims.subjects = { candidates: cands.length, from: cands.length ? "your list" : null, kept, dropped, ...(cands.length ? {} : { missing: "Add your list of subjects (a file, or one per line)." }) };
    keptSubjects = new Set(kept.map((k) => slugOf(k.name)));
  }
  /* universities: only in the kept countries and subjects; kept only when the university's OWN page (from the list) names the subject */
  /* RR-320 D (owner: "graduates of 8,000+ universities need OET to work in these 9 countries"): a university's graduates go TO the
   * destination countries — so every university that teaches healthcare counts, wherever it is; its COURSE pages are read (RR-319 read its
   * general English page and found 0) */
  if (dims.includes("universities")) {
    const all = lists.universities ?? [];
    if (!all.length) out.dims.universities = { candidates: 0, inScope: 0, kept: [], dropped: [], notRead: [], missing: "Add your university list as a file." };
    else { const f = await universityFunnel({ all, reader, subject, queries, countryWeight, maxReads: maxUniversityReads, tell }); out.dims.universities = { ...f, from: "your list" }; }
  }
  /* cities and the client's own: kept when the subject's own site has a page that names it and the subject */
  for (const id of ["cities", "own"]) {
    if (!dims.includes(id)) continue;
    const cands = lists[id] ?? [], kept = [], dropped = [];
    for (const it of cands) { const k = await itemOnSubjectSite({ item: it.name, names: [it.name], subject, subjectName, sitemapUrls: sm.urls, reader }); if (k.kept) kept.push({ name: it.name, source: k.source, checkedOn: k.checkedOn, how: k.how }); else dropped.push({ name: it.name, why: k.why }); }
    out.dims[id] = { candidates: cands.length, from: "your list", kept, dropped, ...(cands.length ? {} : { missing: "Type them one per line, or add a file." }) };
  }
  /* RR-319 A3 · where the test can be TAKEN: an origin country is kept only where the subject's own site names a venue, test centre or test
   * dates there; then the fee from its own page, in the local currency with the ECB's official reference rate and its date */
  if (dims.includes("origins")) {
    const cands = (lists.origins?.length ? lists.origins.map((x) => x.name) : COUNTRIES);
    const kept = [], dropped = [];
    for (const [i, c] of cands.entries()) {
      const slugs = namesOf(c).map(slugOf);
      const listed = sm.urls.some((u) => slugs.some((s) => new RegExp(`(^|/|-)${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|-|$)`).test(new URL(u).pathname.toLowerCase())));
      if (!listed) { dropped.push({ name: c, why: `${subjectName}'s own site names no test venue there (no page of its site is about ${c})` }); continue; }
      tell(`Checking test venues in ${c} (${i + 1} of ${cands.length})`);
      const k = await itemOnSubjectSite({ item: c, subject, subjectName, sitemapUrls: sm.urls, reader, mode: "venue" });
      if (k.kept) kept.push({ name: c, source: k.source, checkedOn: k.checkedOn, how: k.how }); else dropped.push({ name: c, why: k.why });
    }
    out.dims.origins = { candidates: cands.length, from: lists.origins?.length ? "your list" : COUNTRY_LIST_SOURCE, kept, dropped };
    tell(`Reading the fee on ${subjectName}'s own site`);
    out.fee = await feeOf({ urls: sm.urls, subject, subjectName, reader });
    if (out.fee?.ok && kept.length) { tell("Reading the European Central Bank's reference rates"); out.rates = await ecbRates(reader); }
  }
  out.requests = reader.requests();
  return out;
}

/* ── RR-319 A3 · the fee (desktop/fee.mjs since RR-328), and the official rate ── */
import { feeOf } from "./fee.mjs";
export { feeOf };
export const ECB_RATES = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
/** the European Central Bank's euro reference rates (its own daily file) → { date, rates: { CUR: per euro } } or null */
export async function ecbRates(reader) {
  const x = await reader.raw?.(ECB_RATES); if (!x) return null;
  const date = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(x)?.[1] ?? null, rates = { EUR: 1 };
  for (const m of x.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) rates[m[1]] = Number(m[2]);
  return date ? { date, rates, source: ECB_RATES } : null;
}
/* a country's currency — only those the ECB publishes a reference rate for (others say so) */
const CURRENCY_OF = { "United States": "USD", Japan: "JPY", "Czech Republic": "CZK", Denmark: "DKK", "United Kingdom": "GBP", Hungary: "HUF", Poland: "PLN", Romania: "RON", Sweden: "SEK", Switzerland: "CHF", Iceland: "ISK", Norway: "NOK", "Türkiye": "TRY", Australia: "AUD", Brazil: "BRL", Canada: "CAD", China: "CNY", "Hong Kong": "HKD", Indonesia: "IDR", Israel: "ILS", India: "INR", "South Korea": "KRW", Mexico: "MXN", Malaysia: "MYR", "New Zealand": "NZD", Philippines: "PHP", Singapore: "SGD", Thailand: "THB", "South Africa": "ZAR", Ireland: "EUR", Germany: "EUR", France: "EUR", Italy: "EUR", Spain: "EUR", Portugal: "EUR", Netherlands: "EUR", Belgium: "EUR", Austria: "EUR", Finland: "EUR", Greece: "EUR", Croatia: "EUR", Cyprus: "EUR", Malta: "EUR", Slovakia: "EUR", Slovenia: "EUR", Estonia: "EUR", Latvia: "EUR", Lithuania: "EUR", Luxembourg: "EUR" };
/** the fee in a country's own currency, with the rate's source and date — or why not */
export function localFee(fee, country, rates) {
  if (!fee?.ok) return null;
  const cur = CURRENCY_OF[country];
  if (!cur) return { line: `${fee.currency} ${fee.amount} — the European Central Bank publishes no reference rate for ${country}'s currency, so it is shown in ${fee.currency}.` };
  if (cur === fee.currency) return { line: `${fee.currency} ${fee.amount}`, currency: cur, amount: fee.amount };
  if (!rates?.rates?.[cur] || !rates.rates[fee.currency]) return { line: `${fee.currency} ${fee.amount} — no official rate was read today.` };
  const local = (fee.amount / rates.rates[fee.currency]) * rates.rates[cur];
  return { line: `${fee.currency} ${fee.amount} ≈ ${cur} ${Math.round(local).toLocaleString("en-US")} (the European Central Bank's reference rates of ${rates.date})`, currency: cur, amount: Math.round(local) };
}

/**
 * THE ADVICE: the number of pages that is possible AND good, the list, why, and each page's sources. `demand` = the searches known (Search
 * Console, files) — a page with real searches says so.
 */
export function advise(r, { demand = [] } = {}) {
  if (!r?.ok) return null;
  const D = r.dims, n = (id) => D[id]?.kept?.length ?? 0;
  const ONE = { countries: "country", universities: "university", roles: "profession", subjects: "subject", cities: "city", own: "item" };
  const label = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.label.toLowerCase()]));
  const chosen = Object.keys(D);
  const allCombos = chosen.reduce((m, id) => m * Math.max(1, D[id].candidates ?? 0), 1), realCombos = chosen.reduce((m, id) => m * Math.max(1, n(id)), 1);
  const primary = ["countries", "cities", "own", "subjects", "roles", "universities"].find((id) => n(id) > 0) ?? null;
  const searched = (name) => demand.filter((d) => countriesIn(d.text).includes(name) || new RegExp(`\\b${name}\\b`, "i").test(d.text));
  if (!primary) return { verdict: "NONE", number: 0, line: `No — no item was confirmed by an official page yet, so Visibility advises no page from these lists.`, pages: [], allCombos, realCombos: 0, sameness: SAMENESS };
  const sections = chosen.filter((id) => id !== primary && n(id) > 0);
  const pages = D[primary].kept.map((k) => ({ title: `${r.subject} for ${k.name}`, item: k.name, source: k.source, checkedOn: k.checkedOn, bodies: k.bodies ?? [], searched: searched(k.name).map((d) => d.text),
    sections: sections.map((id) => ({ dim: label[id], items: id === "universities" ? D[id].kept.filter((u) => countriesIn(u.country ?? "")[0] === k.name || u.country === k.name).map((u) => u.name) : id === "roles" ? D[id].professions : D[id].kept.map((x) => x.name) })).filter((s) => s.items.length) }));
  const many = chosen.length > 1 && allCombos > pages.length;
  const verdict = many || pages.length > 60 ? "BETTER" : "YES";
  const why = verdict === "YES"
    ? `Each of these ${label[primary]} has its own official page saying ${r.subject} is recognised there, so each page has facts of its own.`
    : `Not ${plural(allCombos, "page")} (${chosen.map((id) => `${D[id].candidates} ${label[id]}`).join(" × ")}), and not even ${plural(realCombos, "page")} of the confirmed ones: pages that differ only by a name are near-identical. ${SPAM_RULE} Instead: one page per ${ONE[primary]}, ${sections.length ? `each with a section for ${sections.map((id) => label[id]).join(" and ")}` : "each with its own official facts"}.`;
  return { verdict, number: pages.length, line: verdict === "YES" ? `Yes — possible and good: ${plural(pages.length, "page")}.` : `No — better this way: ${plural(pages.length, "page")}, one per ${ONE[primary]}.`, why, pages, allCombos, realCombos, sameness: SAMENESS, spamSource: SPAM_SOURCE, checkedOn: r.checkedOn };
}
