/**
 * 🔴 RR-363 · R15's TWO TRUTH CHECKS (beta-g, 2 Nov 2026, on pages marked ready: "United Kingdom — NMC — B (350+)" while the NMC asks Writing C+ (300+); "How far ahead can I book OET? 7 days" while
 * bookings CLOSE 7 days before; "How long does it take to get your results?" answered about OET@Home; New Zealand's council answered with UK and Ahpra text). A page failing either is never ✅.
 *   A · SUMMARY = FACT: a card, table cell or title line that shortens a fact keeps its meaning: every score, the direction of a time rule, the right place. If it cannot, the full sentence is shown.
 *   B · ANSWER FITS QUESTION: an answer answers its own question: the same place, body, profession and part of the test, the asked thing said. A line that does not fit leaves the question; a question left
 *       with nothing is dropped (a core question then stays open, named). Recipe R12 (no lies to customers), R15. Pure.
 */
import { countriesIn } from "./world.mjs";
import { meaningOf, NEED_GROUPS } from "./coverage.mjs";
import { oldWording } from "./subject-facts.mjs";
import { professionIn, professionRegistered } from "./page-plan.mjs";
import { unclearWhy } from "./page-types.mjs";
import { HONEST, VIEW_MARK } from "./answer-ladder.mjs"; // RR-366
import { councilLineWhy } from "./council-truth.mjs"; // RR-366

const SUBTESTS = ["Listening", "Reading", "Writing", "Speaking"];
const distinct = (xs) => [...new Set(xs)];
/* a score, never money or a rate ("AUD 587", "= 194.49"); "340, 320" is two scores */
const scoresIn = (t) => distinct(String(t).match(/(?<![\d.,])(?<!\b[A-Z]{3} |[$£€] ?)[1-5]\d{2}(?!\d|[.,]\d)/g) ?? []);
const gradesIn = (t) => distinct((String(t).match(/\b[ABC]\+?(?=\s*\(\d{3}|\s+in\b|\s+for\b|\s*[,;.]|\s+\(|\s*$)/g) ?? []).filter((g) => g !== "A" && /\d{3}/.test(t) || /\+/.test(g)));
const TIME_RULE = /\b(before|after|within|from|up to|at least|no later|as little as|in as little|close[sd]?)\b/i, BARE_TIME = /^(?:[A-Za-z ]+ — )?(?:about |up to )?\d[\d–-]*\s*(?:minutes?|hours?|days?|weeks?|months?|years?)$/i;

/** A · why this short form changes the fact → the reason, or null */
export function summaryFault(card, text) {
  const c = String(card ?? "").trim(), t = String(text ?? ""); if (!c) return null;
  const s = scoresIn(t), lost = s.filter((n) => !c.includes(n));
  if (scoresIn(c).length && lost.length) return `it shows ${scoresIn(c).join(", ")} but the fact also says ${lost.join(", ")}`;
  if (!scoresIn(c).length && s.length >= 2 && /\b[ABC]\+?\b/.test(c)) return `it shows a grade but the fact states ${s.join(", ")}`;
  const lostGrade = gradesIn(t).filter((g) => /\+/.test(g) && !c.includes(g)); if (lostGrade.length && /\b[ABC]\+?\b|\d{3}/.test(c)) return `it leaves out ${lostGrade.join(", ")}`;
  if (BARE_TIME.test(c) && TIME_RULE.test(t)) return "a time alone: the fact says which way it runs (before, after, within)";
  /* RR-365: "AU$120" of "AU$120 up to the closing date and AU$200 after" */
  const moneyOf = (x) => distinct((String(x).match(/(?:AU\$|AUD|US\$|USD|A\$|[$£€])\s?\d[\d,]*/g) ?? []).map((m) => m.replace(/\s/g, "")));
  if (moneyOf(c).length && /\b(?:up to|before|after|less than)\b|\(US\$\d+ in the US\)/i.test(t) && moneyOf(t).some((m) => !moneyOf(c).includes(m))) return "it shows one price, the fact has more than one";
  const here = countriesIn(c), there = countriesIn(t); if (here.length && there.length && !here.some((x) => there.includes(x))) return `it names ${here[0]}, the fact is about ${there[0]}`;
  const body = bodyIn(t), name = body?.replace(/^The\s+/i, "").split(/[\s(,]+/)[0]; if (name && SCOREISH.test(c) && !c.toLowerCase().includes(name.toLowerCase())) return `it shows a score but not that it is ${body}'s`;
  return null;
}
/** a card as the page shows it: judged by its own fact; a card nobody planned (an edit) by the facts that hold its number */
export function cardFaultOf(value, planned, texts = []) {
  if (planned) return summaryFault(value, planned);
  const nums = String(value).match(/\d[\d,.]*/g) ?? [], whys = texts.filter((t) => nums.some((n) => String(t).includes(n))).map((t) => summaryFault(value, t));
  return whys.length && whys.every(Boolean) ? whys[0] : null;
}
/* the fact's own sentence, without the "X's own page:" lead-in: never cut */
/* R12: a score or total that has lost whose it is ("1400 total", "minimum 350": HCPC, Ahpra). The first name the fact gives is the body */
const bodyIn = (t) => /^(?:[^:]{0,40}own page:\s*)?(?:In [^:]{2,40}:\s*)?([A-Z][^.:;]{1,70}?)\s+(?:\([^)]*\)\s*)?(?:accepts?|asks?|requires?|wants?)\b/.exec(String(t))?.[1] ?? null;
const SCOREISH = /\b[1-5]\d{2,3}\b|\b[ABC]\+?\s*\(/;
export const wholeFact = (text) => { const t = String(text ?? "").replace(/^[^:]{0,40}own page:\s*/i, "").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
/** a short form that keeps the fact's meaning, or the whole sentence */
export const fitCard = (card, text) => (summaryFault(card, text) ? wholeFact(text) : card);

const nameIn = (t, w) => new RegExp(`(?<![\\p{L}])${String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(String(t ?? ""));
const OPTIONS = Object.freeze([["paper", /\bon paper\b|\bpaper\b/i], ["computer", /\bon computer\b|\bcomputer\b/i], ["home", /@home|\bat home\b/i]]);
const ASKS_TIME = /^(how long|when)\b/i, SAYS_TIME = /\d|\b(?:minutes?|hours?|days?|weeks?|months?|years?|immediately|same day)\b/i;
const placesOf = (t, bodies) => distinct([...countriesIn(t), ...bodies.filter((b) => (b.names ?? []).some((n) => nameIn(t, n))).map((b) => b.country)]);

/* 🔴 RR-365 · C2 made strict: the KEY THING asked must be what the answer speaks of, from any source, official or not (beta-g on pages marked ready). Plain words, for every product */
const WHO_SETS = /\b(?:Board|Council|College|Authority|Commission|Ministry|Registry|Regulator|Association|Federation)\b/;
const namesWhoSets = (a, { subject, bodies }) => WHO_SETS.test(a) || bodies.some((b) => (b.names ?? []).some((n) => nameIn(a, n))) || (subject && new RegExp(`\\b${String(subject).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'s own\\b`, "i").test(a)) || (String(a).match(/\b[A-Z]{2,}\b/g) ?? []).some((w) => !["UK", "US", "USA", "UAE", "NZ", "EU", String(subject ?? "").toUpperCase()].includes(w));
const THINGS = Object.freeze([
  /* the fee for changing the venue is not the fee for changing the date */
  { asks: /\b(?:chang|mov|switch|transfer)\w*\b[^?]*\b(?:venue|cent(?:re|er)|location)s?\b/i, says: (a) => /\b(?:venue|cent(?:re|er)|location)s?\b/i.test(a), why: "it asks about changing the venue, the answer is about something else" },
  /* classes are not the test */
  { asks: /\b(?:class|classes|courses?|coaching|tuition|lessons?|tutors?)\b/i, says: (a) => /\b(?:class|classes|courses?|coaching|tuition|lessons?|tutors?|teach\w*|training|review cent(?:re|er)s?|practice|practise|sample tests?)\b/i.test(a), why: "it asks about classes, the answer is about the test itself" },
  /* how to pass is advice, not how scoring works */
  { asks: /^how\s+(?:do|can|should|could|to|does)\b[^?]*\b(?:pass|clear|crack|succeed|improve)\b/i, says: (a) => /\byou (?:should|need to|must)\b|\bto pass\b|\baim (?:for|to)\b|\bfocus on\b|\bwork on\b|\bpractice tests?\b|\bpractise\b|\brevise\b|\bstudy (?:the|your)\b|\btips?\b/i.test(a), why: "it asks how to pass, the answer only says how scoring works" },
  /* what a score means is not what one body asks: "What grade is 300?" */
  { asks: /^what (?:grade|score|band) is\b/i, says: (a) => !/\b(?:asks?|requires?|accepts?|wants?)\b/i.test(a), why: "it asks what a score means, the answer is what one body asks" },
  /* how long a pass counts is somebody's rule: say whose */
  { asks: /\b(?:valid|validity|expires?|expiry)\b/i, says: namesWhoSets, why: "it says how long a result counts, but not who sets that rule" },
]);
/* the part's own kind: a line under "What rules are special to …?" states a rule; a line under the councils names a council, never a price */
const RULE_SAYS = /\b(?:must|required?|requires|needs? to|only|cannot|can't|not allowed|may not|mandatory|shall|apostille|legali[sz]\w*|attest\w*|verif\w*|good standing|authenticat\w*|consular|not a party|registr\w*|register\w*|licen[cs]\w*)\b/i;
const NOT_RULE = /\bresults?\b[^.]*\b(?:released?|come|available)\b|\b(?:listed among|among the locations|regions? where)\b/i;
/* 🔴 RR-366 Part 6 C: "The NMC's certificate … is also called a letter of good standing": a name, not a rule. A sentence that only names a thing is out, unless it also says what must be done */
const ONLY_A_NAME = /\b(?:is|are) (?:also )?(?:called|known as|referred to as|named)\b/i, A_DUTY = /\b(?:must|required?|requires|needs? to|needed|cannot|can't|will not|won't|not allowed|may not|mandatory|shall)\b/i;
const PRICE = /(?:\bAU[D$]|\bUS[D$]|≈|\bcosts?\b)/;
export function partFitWhy(part, text) {
  const t = String(text ?? ""), k = String(part ?? "");
  if (k === "rules" && (NOT_RULE.test(t) || !RULE_SAYS.test(t))) return "it is a fact about the country, not a rule";
  if (k === "rules" && ONLY_A_NAME.test(t) && !A_DUTY.test(t)) return "it gives a thing's name, not a rule";
  if (k === "councils") { const who = councilLineWhy(t); if (who) return who; }
  if (k === "councils" && PRICE.test(t) && !/\bregister/i.test(t)) return "a price is not a council";
  return null;
}
/* the councils most candidates look for come first (owner + beta-g): nurses, then doctors, then the rest as they were */
const COUNCIL_RANK = { nursing: 0, medicine: 1 };
const councilRank = (c) => COUNCIL_RANK[professionRegistered(c.text)] ?? 2;

const MANY_PROFESSIONS = (a) => (String(a).match(/\b(?:medicine|nursing|dentistry|dietetics|pharmacy|physiotherapy|podiatry|radiology|optometry)\b/gi) ?? []).length >= 4;
/**
 * B · why this answer does not answer its question → the reason, or null. `bodies` = [{ names, country }] (a regulator's name says its country); `loose`: a part the plan built for this very
 * question (its fee, its councils): only who and where are judged, never the words.
 */
export function answerFitWhy(question, answer, { subject = null, bodies = [], loose = false } = {}) {
  const q = String(question ?? ""), a = String(answer ?? "");
  /* RR-366: "its official page … does not say this" and a marked view answer honestly in their own way: judged by what they say of themselves, never for the words they lack */
  if (HONEST.test(a)) return null;
  if (a.startsWith(VIEW_MARK)) return /\b(?:AU[D$]|US[D$])\s?\d/.test(a) ? "a view may not carry a fee: that is a fact, with its own source" : null;
  if (staleNews(a)) return "it is old news, not the current answer";
  if (oldWording(a)) return "it gives an old figure the official page has replaced"; /* Part D: whatever page it came from, the client's own too */
  const qp = placesOf(q, bodies), ap = placesOf(a, bodies); if (qp.length && ap.length && !ap.some((x) => qp.includes(x))) return `it asks about ${qp[0]}, the answer is about ${ap[0]}`;
  const prof = professionIn(q), other = MANY_PROFESSIONS(a) ? null /* RR-366: a list of all the professions answers for each */ : professionIn(a); if (prof && other && prof !== other) return `it asks about ${prof}, the answer is about ${other}`;
  const sq = SUBTESTS.filter((s) => nameIn(q, s)), sa = SUBTESTS.filter((s) => new RegExp(`(?<![\\p{L}])${s}(?![\\p{L}])`, "u").test(a)); if (sq.length && sa.length && !sa.some((s) => sq.includes(s))) return `it asks about ${sq[0]}, the answer is about ${sa[0]}`;
  if (loose) return null;
  const oq = OPTIONS.filter(([, re]) => re.test(q)).map(([k]) => k), oa = OPTIONS.filter(([, re]) => re.test(a)).map(([k]) => k); if (oq.length && oa.length && !oa.some((k) => oq.includes(k))) return `it asks about the test ${oq[0]}, the answer is about the test ${oa[0]}`;
  /* a need the words must meet (a cost, a time, a score …); a question with no such need is judged by who and where: an official answer may say it in other words */
  const drop = [subject], want = meaningOf(q, { drop }), have = new Set(meaningOf(a, { drop })); const needs = want.filter((w) => NEED_GROUPS.has(w)); if (needs.length && !needs.some((w) => have.has(w))) return "the answer talks about something else";
  if (ASKS_TIME.test(q) && !SAYS_TIME.test(a)) return "it asks how long or when, the answer gives no time";
  /* "How long does it take to get your results?" must say results, not only some time */
  const nouns = want.filter((w) => !["time", "long", "take", "way", "much", "know"].includes(w)); if (ASKS_TIME.test(q) && nouns.length && !nouns.some((w) => have.has(w))) return "it gives a time, but not of what was asked";
  for (const k of THINGS) if (k.asks.test(q) && !k.says(a, { subject, bodies })) return k.why;
  return null;
}
/* R12 (beta-g, 2 Nov 2026): a paragraph of the client's own site was written for its own page, not for this question: "Is the OET valid for 3 years?" got Ahpra's scores. It is split into single statements; each stands only under the question it answers, holding most of that question's words; what fits nowhere goes */
export const sentencesOf = (t) => String(t ?? "").split(/(?<=[.!?])\s+(?=["'(]?[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
const SAME_THING = (t) => String(t).replace(/\b(?:rescheduling|reschedule|moving|move|changing|change|defer|deferring)\b/gi, "reschedule");
const holdsMost = (q, s, subject) => { const want = meaningOf(SAME_THING(q), { drop: [subject] }), have = new Set(meaningOf(SAME_THING(s), { drop: [subject] })); if (!want.length) return false; /* "What is OET Exam?": no word to check against: a site line about a council cannot be shown to answer it */
  if ((String(q).match(/\b\d{3,}\b/g) ?? []).some((n) => !String(s).includes(n))) return false; /* "What grade is 300?" must say 300 */
  /* the question's own words must stand in the answer ("reschedule", "better", "C+"); a general word ("cost", "accept") alone says nothing: a price never answers the fee for rescheduling. One may be missing of three or more */
  const own = want.filter((w) => !NEED_GROUPS.has(w)), lost = own.filter((w) => !have.has(w)).length; if (lost > (own.length >= 3 ? 1 : 0)) return false;
  return want.filter((w) => have.has(w)).length / want.length > 0.5; };
/* item 29: a site line about a regulator that names no country is not known to be this country's ("The Optometrists … Board" on the India page) */
export const bodyOfUnknownPlace = (text, country) => /\b(?:Board|Council|College|Authority|Registry)\b/.test(String(text)) && !countriesIn(text).includes(country);
/** the client's own paragraph → only its statements that answer this question, or null */
export function ownSiteAnswer(question, text, { subject = null, bodies = [] } = {}) { return sentencesOf(text).filter((s) => !answerFitWhy(question, s, { subject, bodies }) && holdsMost(question, s, subject)).join(" ") || null; }
const hostIs = (u, host) => { try { return Boolean(host) && new URL(u).hostname.replace(/^www\./, "") === host; } catch { return false; } };
/* R12: news from years ago is never the current answer ("OET's Feb 2020 Liverpool venue announcement") */
export function staleNews(text, now = new Date()) {
  const t = String(text ?? ""), years = [...t.matchAll(/\b(19|20)\d\d\b/g)].map((m) => Number(m[0])); if (!years.length) return false;
  return Math.max(...years) <= now.getUTCFullYear() - 2 && /\b(announce\w*|press release|news|launch\w*|new venue|recently opened|opened)\b/i.test(t);
}
/* 🔴 RR-366 Part 5 (beta-g: "The GMC treats OET certificates as valid for two years", sourced to our own site) · a fee, date, score, time limit or a body's rule is shown with the official source. Our own site may be a source only for our own product */
const HOLDS_A_FACT = /(?:AU[D$]|US[D$]|GBP|EUR|PKR|INR|[$£€₹])\s?\d|\b\d+\s*(?:hours?|days?|weeks?|months?|years?|minutes?)\b|\b(?:one|two|three|four|five|six|seven|twelve) (?:hours?|days?|weeks?|months?|years?)\b|\b[1-5]\d{2}\b|\bgrade [A-E]\b/i;
const A_BODYS_RULE = /\b(?:accepts?|requires?|asks? for|must|valid|validity|recogni[sz]es?|treats?)\b/i;
export function ownSiteFactWhy(text, { subject = null, bodies = [] } = {}) {
  const t = String(text ?? ""); if (HOLDS_A_FACT.test(t)) return "a fee, date, score or time limit is shown only with its official source, not our own site";
  const body = bodies.some((b) => (b.names ?? []).some((n) => nameIn(t, n))) || (subject && nameIn(t, subject)) || WHO_SETS.test(t) || /\b[A-Z]{3,}\b/.test(t);
  return body && A_BODYS_RULE.test(t) ? "a body's rule is shown only with that body's own page, not our own site" : null;
}
/* Part 6 F: a fact with no source or no date maps to nothing */
const unsourced = (c) => !/^https?:\/\//.test(c?.link ?? "") || !/^\d{4}-\d{2}-\d{2}/.test(c?.readOn ?? "");
const WATCHED = /^(questions|topic|main)\d*$/;
/** the parts a page shows, each line that fits its own question kept → { parts, removed: [{ question, line, why }], dropped: [question] }. A question left with nothing goes */
export function fitParts(parts, { subject = null, bodies = [], ownHost = null, officialHost = null, requireSource = false } = {}) {
  const removed = [], dropped = [], out = [], droppedWhy = [], separateOfficial = Boolean(ownHost && officialHost && ownHost !== officialHost);
  for (const it of parts) {
    /* RR-365: whichever road a question came by: one nobody asks does not stand. RR-366: the words people of a country type keep their own wording */
    if (/^questions/.test(String(it.part)) && !it.localWording && unclearWhy(it.question)) { dropped.push(it.question); droppedWhy.push({ question: it.question, why: unclearWhy(it.question), plain: true }); continue; }
    const loose = !WATCHED.test(String(it.part)), kept = (it.claims ?? []).flatMap((c) => { if (requireSource && unsourced(c)) { removed.push({ question: it.question, line: String(c.text).slice(0, 160), why: "it has no source and date, so it maps to no verified fact" }); return []; } const off = partFitWhy(it.part, c.text); if (off) { removed.push({ question: it.question, line: String(c.text).slice(0, 160), why: off }); return []; } if (c.ownProduct) return [c]; if (separateOfficial && hostIs(c.link, ownHost)) { const fact = ownSiteFactWhy(c.text, { subject, bodies }); if (fact) { removed.push({ question: it.question, line: String(c.text).slice(0, 160), why: fact }); return []; } } if (hostIs(c.link, ownHost)) { const text = ownSiteAnswer(it.question, c.text, { subject, bodies }); if (text !== c.text) removed.push({ question: it.question, line: String(c.text).slice(0, 160), why: text ? "only the part that answers it stayed" : "your own site's paragraph does not answer this" }); return text ? [{ ...c, text }] : []; } const why = answerFitWhy(it.question, c.text, { subject, bodies, loose }); if (why) removed.push({ question: it.question, line: String(c.text).slice(0, 160), why }); return why ? [] : [c]; });
    if (it.part === "councils") kept.sort((a, b) => councilRank(a) - councilRank(b));
    if (kept.length) out.push({ ...it, claims: kept }); else if ((it.claims ?? []).length) { dropped.push(it.question); droppedWhy.push({ question: it.question, why: "no line fitted it" }); }
  }
  return { parts: out, removed, dropped, droppedWhy };
}

/* 🔴 RR-366 Part 5 · ONE QUESTION, ONE ANSWER: "What is the fee for rescheduling an OET Test?" and "What does changing an OET booking cost?" are one need. Their answers join under the first; the second question goes, said */
const NEED_CLASSES = Object.freeze([
  ["change-fee", /\b(?:reschedul\w*|postpon\w*|defer\w*|chang\w*|mov\w*)\b[^?]*\b(?:fee|costs?|price|charge)\b|\b(?:fee|costs?|price|charge)\b[^?]*\b(?:reschedul\w*|postpon\w*|defer\w*|chang\w*|mov\w*)\b/i],
  ["remark-fee", /\bre-?mark\w*\b[^?]*\b(?:fee|costs?|price)\b|\b(?:fee|costs?|price)\b[^?]*\bre-?mark\w*\b/i],
  ["result-time", /\bhow (?:long|soon|many days)\b[^?]*\bresults?\b|\bwhen\b[^?]*\bresults?\b|\bresults?\b[^?]*\b(?:take|come|released?|out)\b/i],
  ["booking-close", /\bbookings?\b[^?]*\bclose\b|\bwhen\b[^?]*\bbook\w*\b[^?]*\bclose\b/i],
  ["fee", /\b(?:how much|fees?|costs?|price)\b/i],
]);
export const needClass = (q) => NEED_CLASSES.find(([, re]) => re.test(String(q)))?.[0] ?? null;
const textKey = (c) => String(c.text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
/* one fact once: a question whose whole answer already stands on the page does not repeat it (a repeat is filler, and it stops a page): it joins the question that holds it */
export function oneFactOnce(parts = [], { droppedWhy = [] } = {}) {
  const at = new Map(), out = [];
  for (const it of parts) {
    if (/^(?:councils|openCouncils|scores|rules|centres|writing)/.test(String(it.part))) { out.push(it); continue; }
    const honest = (c) => HONEST.test(String(c.text)), left = (it.claims ?? []).filter((c) => honest(c) || !at.has(textKey(c)));
    /* an answer is its first line: with that gone, what is left does not answer the question ("Can a dental MDS graduate sit it?" left with only "for someone who is not a health professional"): the question joins the one that holds it */
    const first = (it.claims ?? [])[0];
    if (first && !honest(first) && at.has(textKey(first))) { droppedWhy.push({ question: it.question, why: `its answer already stands on this page, under "${at.get(textKey(first))}"`, plain: true }); continue; }
    for (const c of left) if (!at.has(textKey(c))) at.set(textKey(c), it.question);
    out.push(left.length === (it.claims ?? []).length ? it : { ...it, claims: left });
  }
  return out;
}
const sameWords = (a, b) => { if (!a.length || !b.length) return false; const y = new Set(b), both = a.filter((w) => y.has(w)).length; return both / new Set([...a, ...b]).size >= 0.8; };
export function mergeSameNeeds(parts = [], { droppedWhy = [], subject = null } = {}) {
  const first = new Map(), out = [];
  for (const it of parts) {
    /* two wordings nearly word for word ("the criteria used for marking OET", "the criteria used to mark the OET"): one question */
    if (/^questions/.test(String(it.part))) { const m = meaningOf(String(it.question).replace(/\b(?:marking|marked)\b/gi, "mark"), { drop: [subject] }), twin = out.find((o) => /^questions/.test(String(o.part)) && sameWords(m, meaningOf(String(o.question).replace(/\b(?:marking|marked)\b/gi, "mark"), { drop: [subject] }))); if (twin) { droppedWhy.push({ question: it.question, why: `it asks what "${twin.question}" asks: one question, one answer`, plain: true }); continue; } }
    const k = needClass(it.question), had = k ? first.get(k) : null;
    /* the country's own fee stands first, its question kept; a council's or a score's fee is another thing */
    if (had && !/^(?:councils|scores|rules|centres|writing)/.test(String(it.part))) { const keys = new Set(had.claims.map(textKey)); for (const c of it.claims ?? []) if (!keys.has(textKey(c)) && (!/fee$/.test(k) || /(?:AU[D$]|US[D$]|A\$|[$£€₹])\s?\d/.test(String(c.text))) /* a line under a price says a price */) { had.claims = [...had.claims, c]; keys.add(textKey(c)); } droppedWhy.push({ question: it.question, why: `it is the same need as "${had.question}": one question, one answer`, plain: true }); continue; }
    if (k && !first.has(k)) first.set(k, it);
    out.push(it);
  }
  return out;
}
/* 🔴 RR-366 Part 6 F · every fee, time limit and score a reader sees maps to a verified fact: a number that stands on the page outside the page's sourced facts → the list */
const SHOWN_NUMBER = /(?:AU[D$]|US[D$]|A\$|GBP|EUR|[$£€₹])\s?\d[\d,]*|\b\d+\s*(?:hours?|calendar days?|days?|weeks?|months?|years?|minutes?)\b/gi;
export function numbersWithoutFact(html, claims = []) {
  const main = String(html ?? "").replace(/<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>/gi, " "), body = (/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(main)?.[1] ?? main).replace(/<[^>]*\bdata-cta\b[^>]*>[\s\S]*?<\/[a-z]+>/gi, " ").replace(/<section class="related">[\s\S]*?<\/section>|<p class="stamp">[\s\S]*?<\/p>|<summary\b[\s\S]*?<\/summary>|<h[1-6]\b[\s\S]*?<\/h[1-6]>/gi, " ").replace(/<[^>]+>/g, " ");
  const norm = (x) => String(x).toLowerCase().replace(/\s+/g, "").replace(/aud/g, "au$").replace(/usd/g, "us$").replace(/,/g, "").replace(/s$/, ""), known = claims.filter((c) => /^https?:/.test(c.link ?? "")).flatMap((c) => [...String(c.text ?? "").matchAll(SHOWN_NUMBER)].map((m) => norm(m[0])));
  return [...new Set([...body.matchAll(SHOWN_NUMBER)].map((m) => m[0]).filter((n) => !known.includes(norm(n))))];
}

/* 🔴 RR-366 X4 ("OET Exam Schedule": the same sentence twice): a sentence said once on a page: it goes from every later line before the page is shown; a line left with nothing goes. Council and score lines differ by their body's name and are never touched */
export function oneSentenceOnce(parts = []) {
  const seen = new Set(), key = (s) => s.toLowerCase().replace(/\s+/g, " ").trim(), long = (s) => s.split(/\s+/).length >= 6;
  return parts.map((it) => { if (/^(?:councils|openCouncils|scores)/.test(String(it.part))) return it; const claims = (it.claims ?? []).flatMap((c) => { const keep = sentencesOf(c.text).filter((s) => { if (HONEST.test(s) || !long(s)) return true; const k = key(s); if (seen.has(k)) return false; seen.add(k); return true; }); return keep.length ? [keep.join(" ") === c.text ? c : { ...c, text: keep.join(" ") }] : []; }); return { ...it, claims }; }).filter((it) => it.claims.length);
}
