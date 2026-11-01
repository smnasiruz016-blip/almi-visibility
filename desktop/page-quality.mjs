/**
 * 🔴 RR-355 (owner, reading AlmiOET's 1.15.8 drafts: 31 of 32 showed ✅ and none could be published — "OET Reading" showed Listening scores
 * for Ireland, a card "0 to", one card twice, one question answered; "OET in Pakistan" showed "AUD 1" (a cut piece of a State Bank rate),
 * "2026, OET", two different PKR amounts and research notes such as "the October M2M page is blocked by Cloudflare") · THE SIXTH CHECK,
 * "GOOD TO READ". The five checks ask "does every fact have a source"; this one asks "is this page good to read". A page that fails it
 * never gets ✅, and the client reads why in one plain line.
 *   a) on topic — every card and answer is about the page's own subject (a Reading page about Reading; a country page about that country);
 *   b) no broken cards — no cut-off piece ("AUD 1", "0 to", "2026, OET"), no bare number without its meaning, no card twice;
 *   c) no internal notes — research notes, blocked-page notes and source debates never reach a page;
 *   d) one value per thing — one converted amount and one rate per currency, never a rate from a central bank's page (owner: one
 *      exchange-rate service for every page);
 *   e) enough real help — at least three questions answered, with real answers;
 *   f) plain English — short sentences, no machine words.
 * Also here: LOOKS LIKE YOUR SITE (Rule 1) and the country page's FIVE THINGS (Rule 3) and the profession page's three (Rule 4).
 * Pure: the page's HTML in, the problems out.
 */
import { countriesIn } from "./world.mjs";
export const QUALITY_GATE = "F";
export const LOOK_GATE = "G";
export const SUBTESTS = Object.freeze(["Listening", "Reading", "Writing", "Speaking"]);
export const MIN_ANSWERED = 3;
export const MIN_ANSWER_WORDS = 120;

/* c) a research note, a blocked-page note, a source debate — words a reader of the page should never see */
export const NOTE = /\bblocked by\b|\bcloudflare\b|\bcaptcha\b|\bin this file\b|\bthis file\b|\bthe one that matters\b|\bM2M\b|\brevaluation rate\b|\bthe (?:fetched|cached) page\b|\bas printed\b|\bthis is dated\b|\bcheck the current\b|\bnot (?:yet )?(?:read|fetched|verified)\b|\bcould not (?:be )?(?:read|fetched|opened|verified)\b|\bstates? no [A-Z]{3}\b|\bstate no [A-Z]{3}\b|\bno [A-Z]{3} (?:price|fee) on\b|\bdoes NOT state\b|\bnumbersMissing\b|\bverdict\b|\bquote not found\b|\bTODO\b|\bFIXME\b|\bper the (?:file|research)\b|\b(?:the )?latest [A-Z]{3} figure\b|\bpage is (?:down|blocked|gone)\b|\bHTTP (?:403|404|500)\b|\bpages? also show\b|\bit names no (?:list|date|price)\b|\bthe file (?:says|lists|gives)\b/i;
/* d) a central bank's page: never the source of a rate on a page (owner: the same ONE exchange-rate service for every page) */
export const CENTRAL_BANK = /(?:^|\.)(?:sbp\.org\.pk|centralbank\.go\.ke|centralbank\.ae|bot\.go\.tz|qcb\.gov\.qa|sama\.gov\.sa|rba\.gov\.au|bankofengland\.co\.uk|rbi\.org\.in|bsp\.gov\.ph|cbn\.gov\.ng|ecb\.europa\.eu|rbnz\.govt\.nz|mas\.gov\.sg|federalreserve\.gov|bankofcanada\.ca|cbe\.org\.eg|bb\.org\.bd|nrb\.org\.np|cbsl\.gov\.lk)$/i;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const centralBankLink = (u) => CENTRAL_BANK.test(hostOf(u));

/* RR-356 (owner: "say it plainly — Writing C+ (300), the other three B (350)"): "Grade B in three components and C+ in one (table: Listening B,
 * Reading B, Writing C+, Speaking B)" → "Writing C+ (300), the other three B (350)" — each grade with its own score on OET's 0–500 scale */
const GRADE_SCORE = { A: 450, B: 350, "C+": 300, C: 200 };
export function plainScores(text) {
  return String(text ?? "").replace(/(?:minimum |at least )?grade ([ABC]\+?)(?: \((\d{3})\))? in three (?:components|sub-tests|sections) and ([ABC]\+?)(?: \((\d{3})\))? in (?:one|any one)(?: \(table: ([^)]*)\))?/i, (m, g1, s1, g2, s2, table) => {
    const odd = table ? [...table.matchAll(/(Listening|Reading|Writing|Speaking) ([ABC]\+?)/g)].find((x) => x[2] === g2)?.[1] ?? null : null;
    const low = `${g2} (${s2 ?? GRADE_SCORE[g2]})`, high = `${g1} (${s1 ?? GRADE_SCORE[g1]})`;
    return odd ? `${odd} ${low}, the other three ${high}` : `${high} in three sub-tests and ${low} in one`;
  });
}

/** a fact's text with its notes taken out: a sentence (or a bracket) that is a note goes; what is left is the fact. "" when nothing is left */
export function cleanFact(text) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  const noBrackets = t.replace(/\s*\(([^()]*)\)/g, (m, inner) => (NOTE.test(inner) ? "" : m));
  const kept = noBrackets.split(/(?<=[.!?])\s+(?=[A-Z0-9("'])/).filter((s) => !NOTE.test(s));
  return kept.join(" ").replace(/\s+([.,;])/g, "$1").trim();
}

/* b) a card that is a cut-off piece, or a number without its meaning */
const MONEY = /^(?:[A-Za-z ]+ — )?(?:AUD|A\$|AU\$|US\$|USD|GBP|£|EUR|€|PKR|INR|NGN|PHP|SGD|AED|NZD|Rs\.?)\s?\$?\s?(\d[\d,]*(?:\.\d+)?)\s*$/i;
export function brokenCard(value) {
  const v = String(value ?? "").replace(/\s+/g, " ").trim();
  if (v.length < 3) return "it is empty";
  if (/(?:\b(?:to|and|or|of|from|in|for|the|a|an|with|by|at)|[,:;–—-])$/i.test(v)) return `"${v}" is cut off`;
  if (/^[\d.,\s%+\-–()]+$/.test(v)) return `"${v}" is a number without its meaning`;
  const m = MONEY.exec(v); if (m && Number(m[1].replace(/,/g, "")) < 10) return `"${v}" is a cut piece of a longer figure`;
  const nums = (v.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]+$/, ""));
  if (nums.length && nums.every((n) => /^(?:19|20)\d\d$/.test(n)) && !/\b(?:since|from|until|in|on|after|before)\b/i.test(v)) return `"${v}" holds only a year — it says nothing`;
  return null;
}
/** the card's value without the place it names ("Pakistan — AUD 587" and "AUD 587" are the same card) */
const cardKey = (v) => String(v ?? "").replace(/^[A-Za-z ]+ — /, "").replace(/\s+/g, " ").trim().toLowerCase();

const decode = (s) => String(s ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const textOf = (h) => decode(String(h ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const ownMain = (html) => { const h = String(html ?? ""); const m = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(h); return (m ? m[1] : h).replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, " "); };
/** what a page shows a reader: its title, its cards, its answers (each item's question and its answer lines), its parts, every line of text */
export function readPage(html) {
  const main = ownMain(html);
  const title = textOf(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(main)?.[1] ?? "");
  const cards = [...main.matchAll(/<li class="card"[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => ({ label: textOf(/<span class="k">([\s\S]*?)<\/span>/i.exec(m[1])?.[1]), value: textOf((/<span class="v">([\s\S]*?)<\/span>(?=\s*<a|\s*$)/i.exec(m[1]) ?? /<span class="v">([\s\S]*?)<\/span>/i.exec(m[1]))?.[1]?.replace(/<small[\s\S]*?<\/small>/gi, "")) }));
  const answerOf = (p) => textOf(p.replace(/<a class="src"[\s\S]*?<\/a>|<span class="src">[\s\S]*?<\/span>/gi, ""));
  const items = [...main.matchAll(/<details data-need-id="([^"]*)"[^>]*>([\s\S]*?)<\/details>/gi)].map((m) => ({ id: m[1], question: textOf(/<summary>([\s\S]*?)<\/summary>/i.exec(m[2])?.[1]), answers: [...m[2].matchAll(/<p data-claim-id="[^"]*">([\s\S]*?)<\/p>/gi)].map((p) => answerOf(p[1])).filter(Boolean) }));
  const parts = [...main.matchAll(/<section data-part="([^"]*)">([\s\S]*?)<\/section>/gi)].map((m) => ({ part: m[1], lines: [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((l) => answerOf(l[1])) }));
  const top = textOf(/<p class="answer"[^>]*>([\s\S]*?)<\/p>/i.exec(main)?.[1] ?? "");
  const tables = [...main.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((m) => textOf(m[0]));
  const links = [...String(html ?? "").matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((m) => decode(m[1]));
  return { title, cards, items, parts, top, tables, links, text: textOf(main.replace(/<section class="related">[\s\S]*?<\/section>|<p class="stamp">[\s\S]*?<\/p>/gi, " ")) };
}

const has = (s, w) => new RegExp(`(?<![\\p{L}])${String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(String(s ?? ""));
/**
 * The page's topic: { kind, subtest?, country?, people: [words], otherPeople: [[words]] } — from the title and the plan's kind.
 * `people` = { profession: "nurses" } (desktop/recognition.mjs PEOPLE_WORD).
 */
export function topicOf({ title = "", kind = null, country = null, profession = null, people = {} }) {
  const subtest = SUBTESTS.find((s) => has(title, s)) ?? null;
  const c = country ?? (kind === "country" ? countriesIn(title)[0] ?? null : null);
  const mine = profession ? [people[profession], profession].filter(Boolean) : [];
  return { kind, subtest, country: c, people: mine, otherPeople: Object.entries(people).filter(([p]) => p !== profession).map(([p, w]) => [w, p]) };
}
/** a) is a line about the page's own topic? → null, or why not */
export function offTopic(line, t) {
  const s = String(line ?? ""), places = countriesIn(s);
  if (t.subtest) {
    /* a sub-test is named with its capital ("Reading"); "reading time" in a Writing line is not the Reading test */
    const named = (x) => new RegExp(`(?<![\\p{L}])${x}(?![\\p{L}])`, "u").test(s);
    const others = SUBTESTS.filter((x) => x !== t.subtest && named(x));
    if (!named(t.subtest) && others.length) return `it is about ${others.join(" and ")}, not ${t.subtest}`;
    if (places.length) return `it is ${places[0]}'s requirement, not about the ${t.subtest} test itself`;
  }
  if (t.kind === "country" && t.country && places.length && !places.includes(t.country)) return `it is about ${places[0]}, not ${t.country}`;
  if (t.kind === "profession" && t.people.length && !t.people.some((w) => has(s, w))) { const other = t.otherPeople.find((ws) => ws.some((w) => has(s, w))); if (other) return `it is about ${other[0]}, not ${t.people[0]}`; }
  return null;
}

const words = (s) => String(s ?? "").split(/\s+/).filter((w) => /\p{L}/u.test(w));
const MACHINE = /\bundefined\b|\bnull\b|\bNaN\b|\[object |\{|\}|\brr\d{3}\b|\bclaimId\b|\bslug\b|\bpayload\b|\bJSON\b|_[a-z]+_/;
/**
 * THE SIXTH CHECK. `html` = the page; `topic` = topicOf(…). → { pass, problems: [{ check: "a".."f", line }] } — each line in plain words.
 */
export function goodToRead(html, topic) {
  const p = readPage(html), problems = [], add = (check, line) => { if (!problems.some((x) => x.check === check)) problems.push({ check, line }); };
  const lines = [...p.cards.map((c) => c.value), p.top, ...p.items.flatMap((i) => i.answers), ...p.parts.flatMap((x) => x.lines)].filter(Boolean);
  /* a) on topic */
  for (const l of lines) { const why = offTopic(l, topic); if (why) { add("a", `Off topic: "${l.slice(0, 70)}${l.length > 70 ? "…" : ""}" — ${why}.`); break; } }
  /* b) broken or doubled cards */
  for (const c of p.cards) { const why = brokenCard(c.value); if (why) { add("b", `A broken fact card: ${why}.`); break; } }
  const seen = new Set(); for (const c of p.cards) { const k = cardKey(c.value); if (seen.has(k)) { add("b", `The same fact card twice: "${c.value}".`); break; } seen.add(k); }
  /* c) internal notes */
  const note = lines.find((l) => NOTE.test(l)) ?? (NOTE.test(p.text) ? (p.text.match(new RegExp(`[^.]{0,60}${NOTE.source}[^.]{0,40}`, "i"))?.[0] ?? "a note") : null);
  if (note) add("c", `A research note reached the page: "${String(note).trim().slice(0, 80)}" — readers must never see notes.`);
  /* d) one value per thing */
  const amounts = new Map();
  for (const m of p.text.matchAll(/\b([A-Z]{3})\s?≈\s?([\d,]{3,})|\b(?:about|≈)\s([\d,]{3,})\s([A-Z]{3})\b/g)) { const cur = m[1] ?? m[4], n = (m[2] ?? m[3]).replace(/,/g, ""); if (cur === "AUD" || cur === "USD") continue; (amounts.get(cur) ?? amounts.set(cur, new Set()).get(cur)).add(n); }
  for (const [cur, set] of amounts) if (set.size > 1) { add("d", `Two different ${cur} amounts on one page (${[...set].map((n) => Number(n).toLocaleString("en-US")).join(" and ")}) — a page shows one.`); break; }
  const rates = new Set([...p.text.matchAll(/\b1 AUD = ([\d.]+) ([A-Z]{3})\b|\bAUD 1 = ([A-Z]{3}) ([\d.]+)/g)].map((m) => `${m[2] ?? m[3]}:${Number(m[1] ?? m[4]).toFixed(2)}`));
  if (rates.size > new Set([...rates].map((r) => r.split(":")[0])).size) add("d", "Two different exchange rates on one page — a page uses one rate, from one service.");
  if (p.links.some(centralBankLink)) add("d", "A rate from a central bank's page — every page uses the same one exchange-rate service.");
  /* e) enough real help */
  const answered = p.items.filter((i) => i.answers.length).length + p.parts.filter((x) => x.lines.length && /question/.test(x.part)).length;
  const answerWords = words([p.top, ...p.items.flatMap((i) => i.answers), ...p.parts.flatMap((x) => x.lines)].join(" ")).length;
  /* R7 (owner, after v3 §14): NO fixed word or answer minimum — whether the intent is answered is the completeness check (desktop/seo-pages.mjs);
   * here only an empty page, or FILLER (the same sentence said twice to look deeper), fails */
  const said = new Map(); for (const s of lines.flatMap((l) => l.split(/(?<=[.!?])\s+/)).map((s) => s.trim().toLowerCase()).filter((s) => words(s).length >= 6)) said.set(s, (said.get(s) ?? 0) + 1);
  const filler = [...said].find(([, n]) => n > 1)?.[0];
  if (!answered) add("e", "Empty — it answers no question yet.");
  else if (filler) add("e", `Filler — the same sentence twice: "${filler.slice(0, 70)}".`);
  /* f) plain English */
  const sentences = lines.flatMap((l) => l.split(/(?<=[.!?])\s+/)).filter((s) => words(s).length);
  const long = sentences.find((s) => words(s).length > 55), avg = sentences.length ? sentences.reduce((n, s) => n + words(s).length, 0) / sentences.length : 0;
  const machine = lines.find((l) => MACHINE.test(l));
  if (machine) add("f", `Machine words a reader would not understand: "${machine.slice(0, 60)}".`);
  else if (long || avg > 32) add("f", "Sentences too long to read easily — split them.");
  return { pass: problems.length === 0, problems };
}

/* Rule 3 · a country page's five things (owner, decided): the fee in its currency FIRST, its questions with answers, its test centres, each
 * profession's council there, a rule of its own. Each is a part of the page (its item's id ends with the part's name) — a missing one named. */
export const COUNTRY_PARTS = Object.freeze({ fee: "the fee in its own currency", questions: "the questions people there ask, with answers", centres: "test centres", councils: "the council for each profession", rules: "a rule special to it" });
/* Rule 4 · a profession page's three: the score each council asks (by country), what the Writing letter is for it, its own questions */
export const PROFESSION_PARTS = Object.freeze({ scores: "the score each council asks, by country", writing: "what the Writing letter is for this profession", questions: "its own questions and answers" });
export function partsMissing(html, kind, { localCurrency = null } = {}) {
  const want = kind === "country" ? COUNTRY_PARTS : kind === "profession" ? PROFESSION_PARTS : null; if (!want) return [];
  const p = readPage(html), have = new Set(p.items.filter((i) => i.answers.length).map((i) => (/--([a-z]+)\d*$/.exec(i.id) ?? [])[1]).filter(Boolean));
  const missing = Object.entries(want).filter(([k]) => !have.has(k)).map(([, v]) => v);
  /* the fee in the country's own currency is the FIRST card */
  if (kind === "country" && localCurrency && !missing.includes(want.fee) && !new RegExp(`^${localCurrency}\\b`).test(p.cards[0]?.value ?? "")) missing.unshift(`${want.fee} as the first fact card`);
  return missing;
}

/* Rule 1 · LOOKS LIKE YOUR SITE: the page carries the site's own header, footer and styles (read from the site), or it is created inside the
 * site's own theme (WordPress, Shopify). Otherwise it never gets ✅ — "This page does not look like your site yet." */
export const NOT_YOUR_LOOK = "This page does not look like your site yet.";
export const THEME_TARGETS = new Set(["wordpress", "shopify"]);
export function looksLikeSite(html, { target = null } = {}) {
  if (THEME_TARGETS.has(target)) return { pass: true, how: "it is created inside your site's own theme" };
  const h = String(html ?? "");
  const ok = /<(?:header|nav)\b[^>]*data-site-shell/i.test(h) && /<footer\b[^>]*data-site-shell/i.test(h) && /data-site-style/i.test(h);
  return ok ? { pass: true, how: "it carries your site's own header, footer and styles" } : { pass: false, why: NOT_YOUR_LOOK };
}
