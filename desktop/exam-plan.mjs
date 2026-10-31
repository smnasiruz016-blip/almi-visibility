/**
 * 🔴 RR-354 (owner, AlmiOET's run on 1.15.7: "the plan must include profession pages (12 OET professions) and country pages (the 10 main OET
 * countries), not only keyword pages … OET for Nurses was mapped to the Pakistan country page") · THE PLAN OF AN EXAM-PREP SITE.
 *   · One page per profession ("OET for Nurses") with every CHECKED score requirement for that profession, country by country.
 *   · One page per main country ("OET in the United Kingdom") with its checked fee, test centres, rules and its regulators' scores.
 *   · The keyword searches join the page they are about — a profession search the profession's page, a country search the country's page —
 *     and the rest become topic pages, the same need asked two ways one page ("OET Exam" / "OET Examination" / "OET English Test").
 *   · A search for another site (oet.com, "official website", a competitor's brand) or for real exam questions ("recent writing questions")
 *     makes no page — said, with why.
 *   · A topic page whose site sentences hold no checked number gets the checked fact that fits it (the fee, the scores, the centres) from the
 *     collectors — never a made-up one. A page with no checked fact stays "needs work", with the reason in plain words.
 * Facts come ONLY from checked sources: the owner's facts file (VERIFIED facts) and AlmiWorld's country facts (shown facts only). Pure.
 */
import { PEOPLE_WORD, inCountry } from "./recognition.mjs";
import { countriesIn } from "./world.mjs";
import { professionIn } from "./page-plan.mjs";

const STOP = new Set(["the", "a", "an", "for", "of", "in", "to", "and", "or", "is", "what", "how", "my", "your", "with", "on", "at", "about", "do", "does", "i", "you"]);
const SAME = { examination: "exam", exams: "exam", test: "exam", tests: "exam", english: "exam", occupational: "exam", practise: "practice", mock: "practice", preparation: "practice", prep: "practice", sample: "practice", results: "result", score: "result", scores: "result", centre: "centre", centres: "centre", center: "centre", centers: "centre", venue: "centre", venues: "centre", fees: "fee", cost: "fee", costs: "fee", price: "fee", registration: "book", register: "book", booking: "book", dates: "date" };
const words = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
/** the need a search asks, without the subject's own name and the words every search of it shares */
export const needOf = (text, subject) => { const sub = new Set(words(subject)); const w = [...new Set(words(text).filter((x) => !STOP.has(x) && !sub.has(x)).map((x) => SAME[x] ?? x))].filter((x) => x !== "exam"); return w.sort().join(" "); };

/* a search for ANOTHER site, or for the real exam's own questions: no page of ours answers it honestly */
const NAVIGATIONAL = /\b(com|org|net|login|log in|sign in|portal|official web ?site|official site|website|global|customer (care|service)|contact)\b|^\S{13,}$/i; // one long word: a site's own name ("occupationalenglishtest")
const COMPETITOR = /\b(e2|e2language|benchmark|swoosh|ieltsliz|magoosh)\b/i;
const EXAM_IP = /\b(recent|real|actual|leaked|previous|past|latest)\b.*\b(questions?|papers?|topics?|letters?|case notes?)\b|\banswers? (key|pdf)\b/i;
export function skipWhy(text) {
  if (EXAM_IP.test(text)) return "asks for the real exam's own questions — Visibility never copies or promises them";
  if (COMPETITOR.test(text)) return "a search for another company's product";
  if (NAVIGATIONAL.test(text)) return "people searching this want another website (the official one) — a page of ours would not be what they look for";
  return null;
}

const title = (s) => String(s).replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bOet\b/g, "OET");
const peopleOf = (prof) => PEOPLE_WORD[prof] ?? prof;
/* the card a checked fact shows: a piece of its OWN text — "not accepted", a score ("Grade B (350)", "B (350+)", "350"), a fee ("AUD 587") or a
 * count ("22 cities") — with its country; none when its text holds none (never a number typed in) */
const PRICE = /(?:AUD|A\$|AU\$|US\$|USD|GBP|£|EUR|€|PKR|INR|NGN|PHP|SGD|AED|NZD|Rs\.?)\s?\$?\s?\d[\d,]*(?:\.\d+)?/;
const SCORE = /grade\s+[abc]\+?\s*\(\d{3}\+?\)|\b[abc]\+?\s*\(\d{3}\+?\)|\b(?:minimum|at least|score of|min\.?)\s+(?:a\s+)?(?:grade\s+)?[abc]?\+?\s*\(?\d{3}\+?\)?|\b(?:listening|reading|writing|speaking)\s+\d{3}\b/i;
export function cardOf(text, country = null) {
  const t = String(text ?? ""), at = (v) => (country ? `${country} — ${v}` : v);
  if (/\b(does not|doesn't|do not|not) accept\b/i.test(t)) return at("OET not accepted");
  const m = t.match(SCORE) ?? t.match(PRICE) ?? t.match(/\b\d[\d,]*\s(?:cities|venues|centres|centers|countries|minutes|hours|days|weeks)\b/i);
  if (!m) return null;
  let v = m[0].replace(/\s+/g, " ").trim(); if (v.endsWith(")") && !v.includes("(")) v = v.slice(0, -1); if (v.includes("(") && !v.includes(")")) v = v.replace(/\s*\(/, " ");
  return at(v.trim());
}
const claimOf = (f, country) => ({ claimId: f.claimId ?? f.id, card: cardOf(f.text, country ?? null), text: country ? `In ${inCountry(country)}: ${f.text}` : f.text, link: f.link, readOn: f.readOn ?? f.on, source: `${f.source ?? f.body ?? "its official page"} — its official page`, official: true, body: f.source ?? f.body ?? null, fromCollector: f.fromCollector ?? false });

/** AlmiWorld's country facts (the service's packets: shown facts only) → checked lines per country, each with its page and date */
export function serviceFactsOf(packets = {}, subject = "OET") {
  const out = {};
  for (const [country, p] of Object.entries(packets ?? {})) {
    const add = (part, text, source, readOn, extra = {}) => { if (!text || !/^https:\/\//.test(source ?? "") || !/^\d{4}-\d{2}-\d{2}/.test(readOn ?? "")) return; (out[country] ??= []).push({ id: `svc-${part}-${country}-${(out[country]?.length ?? 0)}`, country, part, text: String(text).trim(), link: source, on: String(readOn).slice(0, 10), body: (() => { try { return new URL(source).hostname.replace(/^www\./, ""); } catch { return null; } })(), verified: true, fromCollector: true, ...extra }); };
    if (p?.fee) add("fee", p.fee.value?.line, p.fee.source, p.fee.readOn);
    if (p?.centres) add("centres", p.centres.value?.venue ? `${subject} can be taken at a test venue in ${inCountry(country)}.` : p.centres.value?.home, p.centres.source, p.centres.readOn);
    for (const q of p?.questions ?? []) if (q?.value?.pageable && q.value.question && q.value.answer) add("questions", q.value.answer, q.source, q.readOn, { question: q.value.question });
  }
  return out;
}

/**
 * → { pages: [pagePlan entries: { kind, title, profession?, country?, questions, claims, links, lastChecked }], skipped: [{ text, why }],
 *     existing: [{ text, page }], counts: { profession, country, topic } }
 * `facts` = the facts file's facts (factsOfStore: { country, part, profession, verified, text, link, on, id, label }) plus serviceFactsOf rows;
 * `demand` = [{ text, source, weight }]; `site` = the client's site read (its own pages: a need one of them already answers is improved there).
 */
export function examPlan({ subject = "OET", professions = [], countries = [], facts = [], demand = [], site = null, maxTopics = 10 }) {
  const ok = facts.filter((f) => f.verified && f.text && /^https?:\/\//.test(f.link ?? "") && /^\d{4}-\d{2}-\d{2}/.test(f.on ?? ""));
  const cs = (countries.length ? countries : [...new Set(ok.map((f) => f.country))]).slice(0, 10);
  const skipped = [], existing = [];
  const profPages = professions.map((prof) => { const fx = ok.filter((f) => f.profession === prof); return { kind: "profession", profession: prof, title: `${subject} for ${title(peopleOf(prof))}`, questions: [], claims: fx.map((f) => claimOf(f, f.country)) }; });
  const countryPages = cs.map((c) => ({ kind: "country", country: c, title: `${subject} in ${inCountry(c)}: fee, centres and scores`, questions: [], claims: ok.filter((f) => f.country === c).sort((a, b) => (a.part === "councils") - (b.part === "councils")).map((f) => claimOf(f, null)) }));
  for (const f of ok.filter((x) => x.question)) { const p = countryPages.find((x) => x.country === f.country); if (p) p.questions.push({ question: f.question }); }
  /* each search joins the page it is about; the rest are topics, one page per need */
  const topics = new Map(), sitePages = (site?.pages ?? []).map((p) => ({ url: p.url, need: needOf([p.h1, p.title].filter(Boolean).join(" "), subject) }));
  for (const d of [...demand].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))) {
    const why = skipWhy(d.text); if (why) { skipped.push({ text: d.text, why }); continue; }
    const prof = professionIn(d.text), where = countriesIn(d.text).filter((c) => cs.includes(c));
    if (prof && profPages.some((p) => p.profession === prof)) { profPages.find((p) => p.profession === prof).questions.push({ question: d.text, source: d.source }); continue; }
    if (where.length) { countryPages.find((p) => p.country === where[0]).questions.push({ question: d.text, source: d.source }); continue; }
    const need = needOf(d.text, subject); if (!need && topics.has("")) { topics.get("").questions.push({ question: d.text, source: d.source }); continue; }
    const own = need && sitePages.find((p) => p.need === need); if (own) { existing.push({ text: d.text, page: own.url }); continue; }
    const t = topics.get(need) ?? { kind: "topic", need, title: need ? title(d.text) : `What is ${subject}? The test, its fee and the scores asked`, questions: [], claims: [], source: d.source };
    if (topics.has(need)) t.questions.push({ question: d.text, source: d.source }); topics.set(need, t);
  }
  /* a topic's checked fact: by what it asks (the fee, the scores, the centres, taking it online), else by the words it shares with a fact */
  /* two topics never carry the same facts (a page with another's facts only competes with it): facts used by a topic before come last */
  const used = new Set();
  const pick = (need) => { const got = pick0(need); const fresh = got.filter((f) => !used.has(f.id)); const out = fresh.length ? fresh : []; for (const f of out) used.add(f.id); return out; };
  const pick0 = (need) => {
    const w = new Set(need.split(" ").filter(Boolean)), take = (pred, n) => ok.filter(pred).filter((f) => !used.has(f.id)).filter((f, i, all) => all.findIndex((x) => x.country === f.country) === i).slice(0, n);
    if (w.has("fee") || w.has("book") || w.has("register")) return take((f) => f.part === "fee" && /\bAUD\b|A\$|AU\$/.test(f.text), 1).concat(take((f) => f.part === "fee", 2));
    if (w.has("result") || w.has("pass") || w.has("grade") || w.has("band")) return take((f) => f.part === "councils", 3);
    if (w.has("centre") || w.has("online") || w.has("home") || w.has("computer") || w.has("where")) return take((f) => f.part === "centres" || /\b(home|computer|online)\b/i.test(f.text), 3);
    const shared = ok.filter((f) => !used.has(f.id) && words(`${f.label ?? ""} ${f.text}`).some((x) => w.has(SAME[x] ?? x)));
    if (shared.length) return shared.slice(0, 3);
    if (!need) return take((f) => f.part === "fee" && /\bAUD\b|A\$|AU\$/.test(f.text), 1).concat(take((f) => f.part === "councils", 2)); // "what is the exam": its fee and the scores asked
    return [];
  };
  const topicPages = [...topics.values()].slice(0, maxTopics).map((t) => ({ kind: "topic", title: t.title, questions: t.questions, claims: pick(t.need).map((f) => claimOf(f, f.country)), source: t.source }));
  /* the pages link each other: a profession page its country pages, a country page its profession pages, a topic page the hubs */
  const pages = [...profPages, ...countryPages, ...topicPages];
  for (const p of profPages) p.links = countryPages.map((c) => c.title);
  for (const p of countryPages) p.links = profPages.filter((x) => x.claims.some((c) => c.text.startsWith(`In ${inCountry(p.country)}:`))).map((x) => x.title).concat(topicPages.slice(0, 2).map((x) => x.title));
  for (const p of topicPages) p.links = [...countryPages.slice(0, 4), ...profPages.slice(0, 4)].map((x) => x.title);
  for (const p of pages) { p.lastChecked = p.claims.map((c) => c.readOn).filter(Boolean).sort().at(-1) ?? null; p.weak = !p.questions.length; }
  return { pages, skipped, existing, counts: { profession: profPages.length, country: countryPages.length, topic: topicPages.length } };
}
