/**
 * 🔴 RR-331 · TEST DATES — which tests, whose pages are official for them, and the collector's own check that a date stands on its page.
 * Owner decision 27 Oct 2026: for each test × country the upcoming dates, city/centre, format (paper / computer / at home), the booking
 * link, the source and the day checked — from the test owner or its official partners only (British Council / IDP for IELTS …); where the
 * official page shows no dates: "no public dates", with the day checked; never a guess. The Duolingo English Test has no dates (online, any
 * time): recorded once. Pure.
 */
import { governmentHost, normText, quoteOnPage } from "./country-facts.mjs";

/* the tests of AlmiWorld's test and language products — `hosts`: the test owner's and its official partners' own sites (the owner may
 * change this list; a government's own site always counts) */
export const DATE_TESTS = Object.freeze({
  oet: { name: "OET", hosts: /(^|\.)oet\.com$/ },
  prep: { name: "IELTS", hosts: /(^|\.)ielts\.org$|(^|\.)britishcouncil\.[a-z.]+$|(^|\.)idp\.com$|(^|\.)ieltsidpindia\.com$/ },
  pte: { name: "PTE Academic", hosts: /(^|\.)pearsonpte\.com$|(^|\.)pearson\.com$/ },
  toefl: { name: "TOEFL iBT", hosts: /(^|\.)ets\.org$/ },
  celpip: { name: "CELPIP", hosts: /(^|\.)celpip\.ca$|(^|\.)paragontesting\.ca$/ },
  goethe: { name: "Goethe-Zertifikat or telc Deutsch", hosts: /(^|\.)goethe\.de$|(^|\.)telc\.net$/ },
  french: { name: "DELF, DALF or TCF", hosts: /(^|\.)france-education-international\.fr$|institut-?francais|alliance-?francaise|(^|\.)af[a-z-]*\.org$/ },
  spanish: { name: "DELE or SIELE", hosts: /(^|\.)cervantes\.es$|(^|\.)siele\.org$/ },
  italian: { name: "CILS or CELI", hosts: /(^|\.)unistrasi\.it$|(^|\.)unistrapg\.it$|(^|\.)esteri\.it$/ },
  japanese: { name: "JLPT", hosts: /(^|\.)jlpt\.jp$|(^|\.)jees\.or\.jp$|(^|\.)jpf\.go\.jp$/ },
  korean: { name: "TOPIK", hosts: /(^|\.)topik\.go\.kr$/ },
  danish: { name: "Prøve i Dansk (Danish language tests)", hosts: /(^|\.)uim\.dk$|(^|\.)nyidanmark\.dk$|(^|\.)ufm\.dk$/ },
  norwegian: { name: "Norskprøven", hosts: /(^|\.)hkdir\.no$|(^|\.)kompetansenorge\.no$|(^|\.)folkeuniversitetet\.no$/ },
  swedish: { name: "Swedex or Tisus", hosts: /(^|\.)su\.se$|(^|\.)swedex\.net$/ },
  icelandic: { name: "the Icelandic language test for citizenship", hosts: /(^|\.)mms\.is$|(^|\.)mimir\.is$|(^|\.)island\.is$/ },
  dutch: { name: "Staatsexamen NT2 or CNaVT", hosts: /(^|\.)duo\.nl$|(^|\.)cnavt\.org$|(^|\.)staatsexamensnt2\.nl$/ },
  portuguese: { name: "CAPLE (CIPLE, DEPLE …)", hosts: /(^|\.)ulisboa\.pt$|(^|\.)instituto-camoes\.pt$/ },
  swiss: { name: "fide", hosts: /(^|\.)fide-service\.ch$|(^|\.)fide-info\.ch$/ },
});
/* the Duolingo English Test: no dates — online, taken at any time (its own page says so; read once a month) */
export const NO_DATES = Object.freeze({ det: { name: "Duolingo English Test", page: "https://englishtest.duolingo.com/applicants", says: /\b(any ?time|24\/7|whenever (you|it suits)|on demand|from home)\b/i } });
export const FORMATS = Object.freeze(["paper", "computer", "home"]);
export const officialFor = (product, host) => Boolean(host && (governmentHost(host) || DATE_TESTS[product]?.hosts.test(host)));

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** the date (YYYY-MM-DD) stands in the quoted words: written out ("14 November 2026", "Nov 14"), or as 14/11, 11/14, 14.11 or 2026-11-14 */
export function dateInQuote(iso, quote) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "")); if (!m) return false;
  const [, y, mo, d] = m, day = String(Number(d)), mon = Number(mo), raw = String(quote ?? "").toLowerCase(), t = ` ${normText(quote)} `;
  if (raw.includes(iso)) return true;
  const name = MONTHS[mon - 1], short = name.slice(0, 3);
  const hasDay = new RegExp(`\\b0?${day}(st|nd|rd|th)?\\b`).test(t), hasMonth = t.includes(` ${name} `) || t.includes(` ${short} `) || t.includes(` ${short}. `);
  if (hasDay && hasMonth && (!/\b20\d\d\b/.test(t) || t.includes(` ${y} `))) return true;
  const dd = `0?${day}`, mm = `0?${mon}`;
  return new RegExp(`(^|[^\\d])(${dd}[/.-]${mm}|${mm}/${dd})([/.-](${y}|${y.slice(2)}))?([^\\d]|$)`).test(raw);
}
/** a proposed date the collector may keep: in the future (or today), on an official page, its quoted words on the page, the date in them */
export function checkDate(x, { product, today, page }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.date ?? "")) || x.date < today) return "not an upcoming date";
  const host = page?.ok ? hostOnly(page.url) : hostOnly(x.sourceUrl);
  if (!officialFor(product, host)) return "its page is not the test owner's, an official partner's or a government's";
  if (!page?.ok) return `its page could not be read (${page?.why ?? "no answer"})`;
  if (!x.quote || !quoteOnPage(x.quote, page.text)) return "the quoted words are not on its page";
  if (!dateInQuote(x.date, x.quote)) return "the date is not in the quoted words";
  return null;
}
export const hostOnly = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };
/** past dates drop off */
export const upcoming = (dates = [], today) => dates.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
