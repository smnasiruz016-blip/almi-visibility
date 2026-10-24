/**
 * 🔴 RR-321 G1 + B2 · WHERE THE TEST CAN BE TAKEN, AND HOW MANY TAKE IT — from the subject's OWN pages, read once while COUNTING (fast: a few
 * pages, never a slow crawl):
 *   · "countries where it can be taken": every country the subject's own pages name in a sentence about a venue, a test centre or sitting the
 *     test there — its country pages AND its news of new venues and its pages about ways to take it — each with its page and date; a country
 *     named as where a person comes FROM is never a venue;
 *   · taking it AT HOME: what its own page says about where that is offered (OET@Home: "where a venue is not yet available") — said, never
 *     turned into a list of countries the page does not give;
 *   · Q1 "how many take it": its own test-statistics page and the files it links (OET: its yearly PDFs) — the professions' shares and the
 *     nationalities it reports, as numbers that stand on that page; a total it does not state is "checked <date>, does not say".
 * The venue finder of oet.com is a search in the browser (no page text holds it) — Visibility does not call it; the client's own AI in the
 * client's own browser may hand its countries in later.
 */
import { countriesIn, originsIn } from "./world.mjs";

const VENUE = /\b(venues?|test (centres?|centers?|locations?|sessions?)|test(ing)? cent(re|er)s?|exam cent(re|er)s?|sit(ting)? (the|your|an?) (test|exam)|take (the|your) (test|exam|speaking)|at a venue|at test venues)\b/i;
const NOT_A_VENUE = /\bsanction|\bresidents? of\b|\bnationals? of\b|\bpassport\b/i;
/* the subject's own pages about where and how it is taken */
export const VENUE_PAGE = /\/(post|posts|news|blog)\/[^/]*(venue|centre|center|speaking-sub-test|where-to-take|test-dates)|\/test-at-home$|-at-home$|\/book-a-test$|\/where-to-take[^/]*$|\/test-venues?$|recognising-organisations\/[a-z-]+$/i;
const sentences = (t) => String(t ?? "").split(/(?<=[.!?])\s+|:\s+(?=[A-Z])/);

/** the countries one page names as places with a venue: { country → the sentence's place in the page } */
export function venueCountriesIn(text) {
  const out = new Set();
  for (const s of sentences(text)) {
    if (!VENUE.test(s) || NOT_A_VENUE.test(s)) continue;
    const from = new Set(originsIn(s));
    for (const c of countriesIn(s)) if (!from.has(c)) out.add(c);
  }
  return [...out];
}
/* a list that follows a sentence ending in ":" ("Candidates in the below regions can now take the Speaking sub-test at a venue: Kenya South
 * Africa …") is that sentence's list — the countries before the next full stop */
export function listedAfterColon(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(/([^.!?:]{0,200}):\s+([^.!?]{0,600})/g)) if (VENUE.test(m[1]) && !NOT_A_VENUE.test(m[1])) for (const c of countriesIn(m[2])) out.add(c);
  return [...out];
}

/**
 * The countries where the subject can be taken, from its own pages. `urls` = its sitemap's pages; `already` = countries the per-country check
 * kept (page-count.mjs, its country pages). → { countries: [{ name, source:{url,title}, checkedOn, how }], home, pagesRead, checked }
 */
export async function venueCountries({ urls, subject, reader, already = [], maxPages = 24 }) {
  /* its news of venues first (they name the countries), then its pages about taking it at home and booking, then its country pages */
  const rank = (u) => (/\/(post|posts|news|blog)\//.test(u) ? 0 : /recognising-organisations/.test(u) ? 2 : 1);
  const pages = urls.filter((u) => { try { return VENUE_PAGE.test(new URL(u).pathname); } catch { return false; } }).sort((a, b) => rank(a) - rank(b) || a.length - b.length).slice(0, maxPages);
  const found = new Map(already.map((k) => [k.name, k])), checked = [];
  let home = null;
  for (const u of pages) {
    const r = await reader.read(u); checked.push({ url: u, ok: r.ok, why: r.why ?? null, on: r.checkedOn });
    if (!r.ok) continue;
    for (const c of [...venueCountriesIn(r.text), ...listedAfterColon(r.text)]) if (!found.has(c)) found.set(c, { name: c, source: { url: r.url, title: r.title }, checkedOn: r.checkedOn, how: `${subject}'s own page names a venue there` });
    /* at home: the page's own words about where it is offered — kept as what the page says, never as a list it does not give */
    if (!home && /at-home|@home/i.test(u)) { const s = sentences(r.text).find((x) => /offered|available/i.test(x) && /venue|countr/i.test(x)); if (s) home = { url: r.url, title: r.title, checkedOn: r.checkedOn, says: /not yet available|where (taking|a) .*venue .*not/i.test(s) ? `${subject}'s own page says taking it at home is offered in countries where a venue is not yet available, and that not every regulator accepts it — it names no list of those countries` : `${subject}'s own page about taking it at home names no list of countries` }; }
  }
  return { countries: [...found.values()].sort((a, b) => a.name.localeCompare(b.name)), home, pagesRead: checked.filter((c) => c.ok).length, checked };
}

/* ── Q1 · how many take it: the subject's own statistics page and its files ── */
const SHARE = /\b(Nursing|Medicine|Others?)\s+(\d{1,2}(?:\.\d{1,2})?)\s?%/g;
const NATIONALITY = /([A-Z][a-z]+(?:[ /-][A-Z][a-z]+)?)\s+Mean Scaled Score/g;
/** → { ok, year, shares:[{ profession, percent }], nationalities:[…], total: null, sources:[{url,title,on}], line } */
export async function statisticsOf({ urls, subject, reader }) {
  const page = urls.find((u) => /test-statistics|statistics/i.test(u));
  if (!page) return { ok: false, line: `${subject}'s own site lists no statistics page.` };
  const r = await reader.read(page);
  if (!r.ok) return { ok: false, line: `${subject}'s statistics page could not be read (${r.why}).`, sources: [{ url: page, on: r.checkedOn }] };
  const files = (r.links ?? []).filter((l) => /\.pdf($|\?)/i.test(l.href) && /candidate|demographic|stat/i.test(`${l.text} ${l.href}`)).slice(0, 2);
  const sources = [{ url: r.url, title: r.title, on: r.checkedOn }], shares = [], nats = new Set();
  let year = /\b(20\d\d)\b/.exec(r.text)?.[1] ?? null, hundred = null;
  for (const f of files) {
    const p = await reader.read(f.href); if (!p.ok) continue;
    sources.push({ url: p.url, title: p.title, on: p.checkedOn });
    for (const m of p.text.matchAll(SHARE)) if (!shares.some((s) => s.profession === m[1])) shares.push({ profession: m[1], percent: m[2], url: p.url });
    /* the nationality table only (its gender and age tables use the same words); a table's header word ("Speaking") is no nationality */
    const at = p.text.search(/\bNationality\b/), end = at < 0 ? -1 : p.text.slice(at + 12).search(/\b(First language|Age|Profession|Gender|Country of testing)\b/);
    const part = at < 0 ? "" : p.text.slice(at, end < 0 ? undefined : at + 12 + end);
    for (const m of part.matchAll(NATIONALITY)) { const n = m[1].replace(/^(Listening|Reading|Writing|Speaking|Stat|Nationality)\s+/, ""); if (!/^(Listening|Reading|Writing|Speaking|Female|Male|Other|Stat)$/.test(n)) nats.add(n); }
    hundred ??= /\b(\d{2,4}) or more candidates\b/.exec(p.text)?.[1] ?? null;
    year ??= /\b(20\d\d)\b/.exec(p.title ?? "")?.[1] ?? null;
  }
  const total = /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*(?:million|thousand))\+?\s+(candidates|test[- ]takers|people)\b/i.exec(r.text);
  const nationalities = [...nats];
  return { ok: shares.length > 0 || nationalities.length > 0, year, shares, nationalities, atLeast: hundred, total: total ? total[0] : null, sources,
    line: `${subject}'s own test statistics${year ? ` for ${year}` : ""}: ${shares.length ? `${shares.map((s) => `${s.profession.toLowerCase()} ${s.percent}%`).join(", ")} of its candidates` : "no profession shares read"}${nationalities.length ? `; ${nationalities.length} nationalities${hundred ? ` with ${hundred} or more candidates each` : ""}` : ""}. ${total ? `It states ${total[0]}.` : `Its pages (checked ${r.checkedOn}) do not state how many people take ${subject} in all.`}` };
}
