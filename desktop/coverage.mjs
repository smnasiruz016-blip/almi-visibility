/**
 * 🔴 RR-359 · G5's COVERAGE LIST HOLDS ONLY THE TOPIC'S REAL SUBTOPICS AND QUESTIONS (owner's first real run with Google's results, 1 Nov
 * 2026: "Not covered yet" listed every heading of the top pages — menus, "Thank you!", "Leave a Reply", comment authors and dates, "25% OFF",
 * "OET Score Guarantee", "' + escapeHtml(title) + '", form fields, competitor self-praise, country lists, "OET on Paper Dates 2024" — and
 * pages failed for not covering junk). A heading is kept only when:
 *   · it is not navigation, a footer, a form, a comment, an ad, a price or offer, a brand claim, a code fragment, a bare name (a place, a
 *     person, a company) or dated in a past year;
 *   · AND it is shown by more than one independent top result (different sites), or Google lists it under "People also ask", or it is
 *     clearly a reader's question.
 * Same-meaning items are merged (fees = cost = price; dates = schedule; register = book …). "Covered" is judged by MEANING: the same groups
 * of words, never the exact words. Pure.
 */
const NAV = /^(home|menu|search|main menu|navigation|skip to|quick links?|useful links|important links|links|recent posts?|recent comments|related (posts?|articles?|courses?)|popular (posts?|courses?)|latest (posts?|news|blogs?|articles?)|more (posts?|articles?|from)|categories|category|archives?|tags?|share( this)?|follow us|connect with us|contact( us| info| details)?|get in touch|reach us|call us|email us|about( us| the author| me)?|our (team|courses?|services|programs?|blog|story|mission|vision|partners|branches|offices|centres?|centers?|results|achievers|toppers)|services|courses|programs?|blog|news|resources|company|legal|support|help( centre| center)?|faqs?|frequently asked questions|privacy( policy)?|terms( (and|&) conditions| of (use|service))?|cookie(s| policy)?|disclaimer|sitemap|careers?|newsletter|subscribe|sign ?up|log ?in|login|register now|enquire now|enquiry|apply now|book now|join now|download( now| app)?|thank you|thanks|need help( with)?|have a question|any questions|you may also like|table of contents|contents|in this article|on this page|leave a (reply|comment)( cancel reply)?|post a comment|comments?|\d+ comments?|no comments( yet)?|one comment|\d+ thoughts? on .+|reply|cancel reply|post navigation|comment navigation|like this|search for|previous( post)?|next( post)?|read more|load more|see (all|more)|view (all|more)|watch now|back to top|follow|social|testimonials?|reviews?|success stories|what our (students|clients) say|why choose us|why us|trusted by|as seen on|featured in|address|location|locations|branches|offices|opening hours|hours)\b[\s:!.?–-]*$/i;
const FORM = /\b(your (name|e-?mail|phone|mobile|number|message|city|country|details)|full name|e-?mail address|phone number|mobile number|whatsapp( number)?|enter (your|the)|submit|select (your|an?|the)|choose (your|an?)|you wish to|would you like to|do you want to (join|enrol|enroll|book|study)|preferred (mode|time|centre|center|batch|course)|which (degree|course|program|batch|intake|mode)|how did you hear|captcha|i agree|terms of service)\b/i;
const OFFER = /\b\d+\s*%\s*(off|discount)|\b(off|discount|coupon|promo( code)?|voucher|deal|sale|offer|offers|limited time|hurry|flat \d|cashback|free (demo|trial|class|session|counselling|counseling|consultation|webinar)|enrol(l)? now|book (a|your) (free|demo)|guarantee[ds]?|money[- ]back|refund policy|pricing plans?|packages?|buy now|add to cart|checkout)\b/i;
/* RR-359 walk: Google's own "People also ask" can be a brand's praise ("Why is Brooklyn Review the top online OET Coaching institute in India?") */
const CLAIM = /\b(?:the )?(?:top|best|leading|no\.?\s*1|number one|#1)\b.{0,40}\b(?:institute|academy|coaching|coach|centre|center|tutors?|course|platform|company|school|classes)\b|\b(best|top[- ]rated|top \d+|no\.?\s*1|#1|number one|leading|trusted|award[- ]winning|awards?|world[- ]class|expert (coaching|trainers?|tutors?)|our (expert|experienced|certified)|highest (rated|success)|success rate|\d+\+? (students|learners|candidates) (trained|placed|cleared)|why (choose|join|learn with)|join (the|our|thousands)|is the (best|leading|top|no)\b)/i;
const CODE = /['"`{}<>;=]|\+\s*['"]|\$\{|\bescapeHtml\b|\bfunction\b|\bundefined\b|\bnull\b|\bvar\b|\bconst\b|&[a-z]+;|\\[nrt]/i;
const COMMENT = /\b(says|said|wrote|replied)\s*:?\s*$|\bat \d{1,2}:\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b|\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+\d{4}\b|\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b(posted|updated|published) (on|by)\b|\bby admin\b|\bminutes? read\b|\bmin read\b/i;
/* the words that make a heading a topic — a short all-capitalised heading without one is a name (a place, a person, a company) */
const TOPIC = /\b(exam|exams|test|tests|score|scores|scoring|grade|grades|band|bands|fee|fees|cost|costs|price|prices|pay|payment|date|dates|schedule|result|results|preparation|prepare|tips|tip|strategy|strategies|writing|reading|listening|speaking|registration|register|eligibility|eligible|criteria|requirement|requirements|pattern|format|structure|duration|time|timing|centre|centres|center|centers|venue|venues|location|council|councils|board|regulator|booking|book|practice|syllabus|sample|samples|mock|mocks|module|modules|section|sections|sub-?tests?|validity|valid|certificate|recognition|recognised|recognized|accept|accepted|accepts|countries|country|visa|license|licence|licensing|nurses?|doctors?|pharmacists?|dentists?|profession|professions|marks?|pass|passing|fail|retake|resit|online|computer|paper|home|vs|versus|difference|compare|comparison|how|what|which|when|where|why|who|can|is|are|do|does|should|guide|overview|introduction|about)\b/i;
const QUESTION = /^(what|how|which|when|where|why|who|whom|whose|can|could|is|are|do|does|did|should|will|would|may|must|has|have)\b/i;
const MONTHS = /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i;

/* the same-meaning groups: each word becomes its group's name, so "fees", "cost" and "price" are one thing */
const GROUPS = [
  ["cost", /^(fee|fees|cost|costs|price|prices|pricing|pay|paying|payment|charge|charges|expensive|cheap|afford)$/],
  ["date", /^(date|dates|schedule|schedules|calendar|session|sessions|slot|slots|upcoming|availability)$/],
  ["book", /^(book|booking|bookings|register|registering|registration|enrol|enroll|enrolment|enrollment|apply|application|sign)$/],
  ["score", /^(score|scores|scoring|grade|grades|band|bands|mark|marks|result|results|pass|passing|cutoff|cut-off|minimum)$/],
  ["valid", /^(valid|validity|expire|expires|expiry|expiration|last|lasts)$/],
  ["place", /^(centre|centres|center|centers|venue|venues|location|locations|city|cities|near)$/],
  ["time", /^(duration|long|time|timing|timings|hour|hours|minute|minutes|length)$/],
  ["prepare", /^(prepare|preparing|preparation|practice|practise|practicing|study|studying|tip|tips|strategy|strategies|course|courses|coaching|guide)$/],
  ["accept", /^(accept|accepts|accepted|recognise|recognises|recognised|recognize|recognizes|recognized|recognition|countries|country|where)$/],
  ["format", /^(format|pattern|structure|structured|syllabus|section|sections|part|parts|module|modules|subtest|subtests|sub-test|sub-tests|component|components)$/],
  ["eligible", /^(eligible|eligibility|criteria|requirement|requirements|require|requires|required|need|needs|who)$/],
  ["hard", /^(hard|harder|hardest|difficult|difficulty|easy|easier|easiest|tough|tougher)$/],
];
const STOP = new Set(["the", "a", "an", "for", "of", "in", "to", "and", "or", "is", "are", "what", "how", "do", "does", "i", "my", "can", "you", "your", "with", "on", "at", "by", "it", "its", "be", "this", "that", "from", "as", "about", "much", "many", "get", "take", "taking", "there", "which", "when", "should", "will", "me", "we", "our", "if", "than", "vs", "versus", "all", "any", "exam", "test", "tests", "exams", "need"]);
const stem = (w) => w.replace(/ies$/, "y").replace(/(s|x|ch|sh)es$/, "$1").replace(/([^s])s$/, "$1");
/** the meaning of a text: its content words, each in its same-meaning group (the subject's own name and the page's place left out) */
export function meaningOf(text, { drop = [] } = {}) {
  const gone = new Set(drop.flatMap((d) => String(d ?? "").toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean));
  const out = new Set();
  for (const raw of String(text ?? "").toLowerCase().replace(/[‘’]/g, "'").split(/[^a-z0-9+-]+/)) {
    const w = raw.replace(/^[-+]+|[-+]+$/g, ""); if (!w || STOP.has(w) || gone.has(w) || /^\d+$/.test(w)) continue;
    const g = GROUPS.find(([, re]) => re.test(w)); out.add(g ? g[0] : stem(w));
  }
  return [...out].sort();
}
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return String(u ?? ""); } };
const tidy = (t) => String(t ?? "").replace(/\s+/g, " ").replace(/^[\s\d.)(:–-]+(?=\p{L})/u, "").replace(/[\s:–-]+$/, "").trim();

/**
 * Why a heading is not a topic of the page ("navigation", "a form field", …) — or null when it may be one. `now` gives the year: a heading
 * dated in a past year is stale; `names` = the place names known (countries) — a heading that is only a name is no subtopic.
 */
export function junkWhy(text, { now = new Date().toISOString(), names = [] } = {}) {
  const t = tidy(text);
  if (t.length < 4 || t.length > 110) return "too short or too long to be a subtopic";
  if (CODE.test(t)) return "a piece of the page's code";
  if (NAV.test(t)) return "navigation, a footer or a comment box";
  if (COMMENT.test(t)) return "a comment, an author or a date line";
  if (FORM.test(t)) return "a form field";
  if (OFFER.test(t)) return "an ad, a price or an offer";
  if (CLAIM.test(t)) return "a brand's claim about itself";
  const year = Number(String(now).slice(0, 4)), years = [...t.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  if (years.length && years.every((y) => y < year)) return "dated in a past year";
  const words = t.replace(/[^\p{L}\p{N}\s'&-]/gu, " ").split(/\s+/).filter(Boolean);
  const placeOnly = names.some((n) => t.toLowerCase().replace(/[^a-z ]/g, "").trim() === String(n).toLowerCase());
  if (placeOnly || words.every((w) => MONTHS.test(w))) return "a bare name, not a subtopic";
  if (words.length <= 3 && words.every((w) => /^\p{Lu}/u.test(w)) && !TOPIC.test(t) && !QUESTION.test(t)) return "a bare name, not a subtopic";
  if (!/\p{L}{3,}/u.test(t)) return "not words";
  return null;
}

/**
 * THE COVERAGE LIST from the top results' headings and Google's "People also ask" → [{ topic, seenOn, sites, urls, from }] — at most `max`.
 * `results` = [{ url, headings }]; `paa` = Google's questions; `subject`/`title` = the page's own words (left out of the meaning, so "OET
 * Fees" and "Fees" are one item). `dropped` (optional) collects what was left out and why.
 */
export function cleanCoverage({ results = [], paa = [], subject = null, title = "", now = new Date().toISOString(), names = [], max = 8, dropped = null } = {}) {
  const drop = [subject, ...String(title).split(/[^A-Za-z]+/).filter((w) => /^\p{Lu}/u.test(w) && w.length > 2 && !TOPIC.test(w))];
  const items = [];
  const add = (text, url, from) => {
    const t = tidy(text), why = junkWhy(t, { now, names }); if (why) { dropped?.push({ text: String(text), why }); return; }
    const m = meaningOf(t, { drop }); if (!m.length) { dropped?.push({ text: String(text), why: "says nothing beyond the page's own subject" }); return; }
    /* same meaning → one item: the groups of the shorter are all in the longer, or most of them are */
    const same = items.find((x) => { const both = m.filter((w) => x.meaning.includes(w)).length, small = Math.min(m.length, x.meaning.length); return (small >= 2 && both === small) || both / Math.max(m.length, x.meaning.length) >= 0.67; });
    if (same) { if (url) { same.sites.add(hostOf(url)); same.urls.push(url); } if (from === "paa") same.paa = true; if (QUESTION.test(t) && !QUESTION.test(same.topic)) same.topic = t; return; }
    items.push({ topic: t, meaning: m, sites: new Set(url ? [hostOf(url)] : []), urls: url ? [url] : [], paa: from === "paa", question: QUESTION.test(t) || /\?$/.test(t) });
  };
  for (const q of paa) add(q, null, "paa");
  for (const r of results) for (const h of r.headings ?? []) add(h, r.url, "heading");
  const kept = [], independent = new Set(results.map((r) => hostOf(r.url))).size;
  for (const x of items) {
    const ok = x.paa || x.sites.size >= 2 || x.question;
    if (!ok) { dropped?.push({ text: x.topic, why: independent >= 2 ? "only one site shows it" : "only one top result was read, and it is no reader's question" }); continue; }
    kept.push({ topic: x.topic, seenOn: x.sites.size, sites: [...x.sites], urls: [...new Set(x.urls)], from: x.paa ? "people also ask" : x.sites.size >= 2 ? `${x.sites.size} top results` : "a reader's question" });
  }
  return kept.sort((a, b) => (b.from === "people also ask") - (a.from === "people also ask") || b.seenOn - a.seenOn).slice(0, max);
}
/** a coverage list kept before RR-359 ({ topic, seenOn, urls }) cleaned the same way — so a run's old list never fails a page for junk */
export function recleanCoverage(list = [], { subject = null, title = "", now, names = [], max = 8 } = {}) {
  /* each item keeps where it came from: its top results' sites, Google's "People also ask" (said so), or one unnamed source */
  const results = [], paa = [];
  for (const c of list ?? []) { const t = c?.topic ?? c; if (c?.paa || c?.from === "people also ask") { paa.push(t); continue; } for (const u of (c?.urls?.length ? [...new Set(c.urls)] : [null])) results.push({ url: u, headings: [t] }); }
  return cleanCoverage({ results, paa, subject, title, now, names, max });
}
/** does a page's text cover a subtopic BY MEANING? most of the subtopic's same-meaning groups stand in the page */
export function coversByMeaning(pageText, topic, { subject = null, title = "" } = {}) {
  const drop = [subject, ...String(title).split(/[^A-Za-z]+/).filter((w) => /^\p{Lu}/u.test(w) && w.length > 2 && !TOPIC.test(w))];
  const want = meaningOf(topic, { drop }); if (!want.length) return true;
  const have = new Set(meaningOf(pageText));
  const hit = want.filter((w) => have.has(w)).length;
  return want.length <= 3 ? hit === want.length : hit / want.length >= 0.75;
}
