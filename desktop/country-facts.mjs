/**
 * 🔴 RR-328 · COUNTRY FACTS — the owner's five-part rule for a country page (26 Oct 2026, final), ONE rule for the site's collector, the
 * owner's coverage grid, the app's page plan and its count:
 *   1 FEE        the subject's fee in that country's own currency (desktop/rates.mjs: official rates first, else the open daily rate)
 *   2 QUESTIONS  the questions people in that country ask (keyword data FROM that country), each with its answer
 *   3 CENTRES    the test centres in that country — or the nearest centres AND taking it at home, where the subject's own page offers it
 *   4 COUNCILS   the council or office for EACH of the subject's professions in that country: its name, official website and address
 *   5 RULES      a rule specific to that country (home-council verification, documents, attestation …), from an official page
 * A country page is made only when all five are filled; a country partly filled is "missing: …", never padded.
 * A COUNTRY × PROFESSION page needs that profession's own council in that country AND that profession's searches from that country.
 * Only a fact a page may show counts: "confirmed" (read on its source page by the collector itself), or the owner's "approved"/"edited" —
 * never "unconfirmed" or "rejected" (site/cf-store.mjs SHOWN).
 * Pure: facts in, coverage out.
 */
export const PARTS = Object.freeze(["fee", "questions", "centres", "councils", "rules"]);
export const PART_NAMES = Object.freeze({ fee: "the fee in its currency", questions: "the questions people there ask, with answers", centres: "test centres (or the nearest and at home)", councils: "the council for each profession", rules: "a rule of its own" });
/* RR-329 D (rule R9): "owner" — a fact the owner supplied himself ("Add what I know"), dated; shown as AlmiWorld's own checked information */
export const SHOWN_STATUS = Object.freeze(["confirmed", "approved", "edited", "owner"]);
/* RR-334 · a question the filter removed (a comment to a video's maker) is out of every count; an unconfirmed fact still waits for a look */
export const removed = (f) => f.status === "unconfirmed" && Boolean(f.value?.removedBy);
export const waiting = (f) => f.status === "unconfirmed" && !f.value?.removedBy;
/* RR-329 C (rule R8): an AlmiOET record whose page is gone is hidden until the collector reads it again and confirms it */
export const GONE = /^the page is gone/;
/* the subject's professions (AlmiOET's list, desktop/lists/almiworld-oet-professions.json), by the keys the page plan uses */
export const CF_PROFESSIONS = Object.freeze(["medicine", "nursing", "dentistry", "pharmacy", "physiotherapy", "occupational therapy", "radiography", "dietetics", "optometry", "podiatry", "speech pathology", "veterinary science"]);
/* RR-328 addition (owner, 26 Oct, rule R1): the body that does a council's job, under ANY same-meaning name — the collector records which
 * type it is, and keeps searching every day until each profession has one */
export const NAME_TYPES = Object.freeze(["council", "board", "registration authority", "licensing body", "regulatory authority", "ministry or department of health", "health professions council", "medical, nursing, pharmacy or dental council", "embassy or consulate", "national test office or venue", "named by the profession's association"]);
/** a body's name type from its name alone (for AlmiOET's records, which do not say it) */
export function nameTypeOf(name) {
  const n = String(name ?? "").toLowerCase();
  return /embassy|consulate|high commission/.test(n) ? "embassy or consulate" : /ministry|department of health|directorate/.test(n) ? "ministry or department of health"
    : /health professions? council/.test(n) ? "health professions council" : /(medical|nursing|midwifery|pharmacy|dental|pharmac\w+) (and \w+ )?council/.test(n) ? "medical, nursing, pharmacy or dental council"
    : /licens/.test(n) ? "licensing body" : /registration/.test(n) ? "registration authority" : /regulat|commission|authority/.test(n) ? "regulatory authority"
    : /board/.test(n) ? "board" : /test (office|centre|center|venue)/.test(n) ? "national test office or venue" : /council/.test(n) ? "council" : null;
}
/* the countries people come to it from most (owner, RR-328 B) — the collector's order; then the rest of the 197 */
export const CF_PRIORITY = Object.freeze(["India", "Philippines", "Pakistan", "Nigeria", "Kenya", "Egypt", "Bangladesh", "Nepal", "Ghana", "Zimbabwe", "Sri Lanka", "United Arab Emirates", "Saudi Arabia"]);

const shown = (f) => SHOWN_STATUS.includes(f?.status);
/* RR-332: the councils a country page needs (the rest add country × profession pages) */
export const COUNCIL_CORE = Object.freeze(["nursing", "medicine"]);
/** a council fact is whole when it has its name, official website and address (the app's pages print the address: desktop/local-pages.mjs) */
export const councilWhole = (v) => Boolean(v?.name && /^https?:\/\//.test(v?.website ?? "") && String(v?.address ?? "").trim().length >= 8);
/* RR-343 (owner, 29 Oct 2026) · a council is FOUND when its official NAME and official WEBSITE are known: the website is the body's own
 * domain (a government's, an .org, or the body's own name), confirmed by reading it — or, when the site does not open from abroad, by its
 * domain and its name together in the search results (siteCheck "search", shown with SITE_ABROAD). The ADDRESS is optional. The owner's
 * own councils and his Approve/Edit count by his word; a blocked private site never. REPLACES "name + website + address" for counting. */
export const SITE_ABROAD = "website does not open from abroad";
const NAME_STOP = new Set(["of", "and", "the", "for", "in", "on", "de", "del", "la", "le", "des", "et", "du"]);
const GENERIC = new Set(["council", "board", "authority", "ministry", "department", "national", "health", "medical", "nursing", "commission", "general", "registration", "regulatory", "professions", "professional", "midwifery", "dental", "pharmacy", "republic", "state", "federal"]);
/** the website is the body's OWN domain: a government's, an .org, or a domain made of the body's name (its short name, its initials, its words) */
export function officialSite(name, website) {
  const h = hostOf(website); if (!h || !/^https?:\/\//.test(String(website ?? "")) || blockedSource(website)) return false;
  if (governmentHost(h) || /(^|\.)(org|or)(\.[a-z]{2})?$/.test(h)) return true;
  const label = h.split(".")[0].replace(/[^a-z0-9]/g, ""), short = /\(([A-Za-z]{2,10})\)/.exec(String(name ?? ""))?.[1]?.toLowerCase();
  const ws = words(String(name ?? "").replace(/\([^)]*\)/g, "")).filter((w) => !NAME_STOP.has(w)), initials = ws.map((w) => w[0]).join("");
  const inLabel = ws.filter((w) => w.length >= 4 && label.includes(w));
  return Boolean((short && label.includes(short)) || (initials.length >= 3 && label.includes(initials)) || inLabel.length >= 2 || inLabel.some((w) => w.length >= 5 && !GENERIC.has(w)));
}
/** a council fact counts as FOUND (the RR-343 rule above) — the whole fact, because "confirmed" must say how its website was confirmed */
export function councilFound(f) {
  const v = f?.value; if (!f || !SHOWN_STATUS.includes(f.status) || !v?.name || !/^https?:\/\//.test(String(v.website ?? "")) || blockedSource(v.website) || blockedSource(f.sourceUrl)) return false;
  if (f.status !== "confirmed") return true; // the owner's word: his own council, his Approve or his Edit
  if (!officialSite(v.name, v.website)) return false;
  /* RR-343: the collector records how; a council stored before says it by its source page — the website itself was read */
  return v.siteCheck === "read" || v.siteCheck === "search" || (!v.siteCheck && hostOf(f.sourceUrl) === hostOf(v.website));
}
/** the fee fact shows a figure in the country's own money */
export const feeLocal = (v) => Boolean(v?.local && v?.line);

/**
 * One country's five parts from its facts (any statuses — only the shown ones count).
 * → { country, parts: { fee|questions|centres|councils|rules: { filled, missing: [why…], facts: [fact…] } }, missing: [part…], complete,
 *     councils: { profession: fact|null } }
 */
export function partsOf(country, facts, { professions = CF_PROFESSIONS } = {}) {
  const mine = facts.filter((f) => f.country === country && shown(f) && (f.product ?? "oet") === "oet"), of = (part) => mine.filter((f) => f.part === part);
  /* RR-329 D: the owner's own fact for a part fills it, first */
  const own = (part, p = null) => of(part).filter((f) => f.status === "owner" && (p === null || f.profession === p) && f.value?.text);
  const fee = own("fee")[0] ?? of("fee").find((f) => feeLocal(f.value)) ?? null, feeAny = of("fee")[0] ?? null;
  const questions = [...own("questions"), ...of("questions").filter((f) => f.value?.question && f.value?.answer)];
  const centres = own("centres")[0] ?? of("centres").find((f) => f.value?.venue || (f.value?.home && (f.value?.nearest ?? []).length)) ?? null;
  const councils = Object.fromEntries(professions.map((p) => [p, own("councils", p)[0] ?? of("councils").find((f) => f.profession === p && councilFound(f)) ?? null])); // RR-343: found = name + official website
  const noCouncil = professions.filter((p) => !councils[p]), partial = professions.filter((p) => !councils[p] && of("councils").some((f) => f.profession === p));
  /* RR-332 (owner, 27 Oct 2026): the councils part is FILLED when the nursing AND medicine councils are whole; the other professions add
   * country × profession pages as they are found and keep being searched — REPLACES "a whole council for EVERY profession" */
  const coreMissing = COUNCIL_CORE.filter((p) => professions.includes(p) && !councils[p]);
  const rules = [...own("rules"), ...of("rules").filter((f) => f.value?.rule)];
  const parts = {
    fee: { filled: Boolean(fee), facts: fee ? [fee] : feeAny ? [feeAny] : [], missing: fee ? [] : [feeAny ? "no figure in its own currency yet" : "no fee read yet"] },
    questions: { filled: questions.length > 0, facts: questions, missing: questions.length ? [] : ["no question from this country with its answer yet"] },
    centres: { filled: Boolean(centres), facts: centres ? [centres] : of("centres"), missing: centres ? [] : ["no venue named, and no nearest venue with taking it at home"] },
    councils: { filled: coreMissing.length === 0, facts: Object.values(councils).filter(Boolean), missing: coreMissing.length ? [`the ${coreMissing.join(" and ")} council${coreMissing.length > 1 ? "s are" : " is"} not found yet (official name and website)${partial.some((p) => coreMissing.includes(p)) ? " — a name was found, its official website not confirmed yet" : ""}; ${noCouncil.length} of ${professions.length} professions still searched: ${noCouncil.join(", ")}`] : [] },
    rules: { filled: rules.length > 0, facts: rules, missing: rules.length ? [] : ["no rule of its own from an official page yet"] },
  };
  const missing = PARTS.filter((p) => !parts[p].filled);
  return { country, parts, missing, complete: missing.length === 0, councils };
}

/** the owner's grid: every country → its five parts; every country × profession → council found or missing; with counts */
export function coverageOf(facts, { countries, professions = CF_PROFESSIONS } = {}) {
  const rows = countries.map((c) => partsOf(c, facts, { professions }));
  const pairs = rows.flatMap((r) => professions.map((p) => ({ country: r.country, profession: p, council: Boolean(r.councils[p]) })));
  return { rows, pairs, counts: { countries: rows.length, complete: rows.filter((r) => r.complete).length, byPart: Object.fromEntries(PARTS.map((p) => [p, rows.filter((r) => r.parts[p].filled).length])), pairs: pairs.length, councilsFound: pairs.filter((x) => x.council).length,
    unconfirmed: facts.filter(waiting).length, rejected: facts.filter((f) => f.status === "rejected").length, removed: facts.filter(removed).length } };
}

/**
 * RR-329 B · one country of ANOTHER product (desktop/product-facts.mjs — its own template): each part filled by its shown facts (the
 * owner's own first). → { product, country, parts: { part: { filled, facts, missing } }, missing, complete }
 */
export function productPartsOf(product, country, facts, { template }) {
  const mine = facts.filter((f) => f.product === product && f.country === country && shown(f));
  const parts = Object.fromEntries(template.parts.map((k) => {
    const own = mine.filter((f) => f.part === k && f.status === "owner" && f.value?.text);
    const got = k === "questions" ? mine.filter((f) => f.part === k && f.value?.question && f.value?.answer) : mine.filter((f) => f.part === k && (f.value?.text || f.value?.name) && f.status !== "owner");
    const all = [...own, ...got];
    return [k, { filled: all.length > 0, facts: all, missing: all.length ? [] : [`no ${PART_LABEL[k] ?? k} from an official page yet`] }];
  }));
  const missing = template.parts.filter((k) => !parts[k].filled);
  return { product, country, parts, missing, complete: missing.length === 0 };
}
const PART_LABEL = { questions: "question with its answer", offices: "office that asks for it", employment: "public employment service", universities: "official university list", tax: "tax authority", recognition: "recognition body", studentVisa: "student-visa office" };
/** the owner's grid for another product: every country → its parts, with counts */
export function productCoverageOf(product, facts, { countries, template }) {
  const rows = countries.map((c) => productPartsOf(product, c, facts, { template }));
  return { rows, counts: { countries: rows.length, complete: rows.filter((r) => r.complete).length, byPart: Object.fromEntries(template.parts.map((k) => [k, rows.filter((r) => r.parts[k].filled).length])),
    unconfirmed: facts.filter((f) => f.product === product && waiting(f)).length, rejected: facts.filter((f) => f.product === product && f.status === "rejected").length, removed: facts.filter((f) => f.product === product && removed(f)).length } };
}

/**
 * RR-332 · ONE meaning of "done" (the owner's frozen five-part rule): a (product, country) is done only when ALL its parts are filled —
 * AlmiOET's five (fee, questions with answers, centres, councils = nursing + medicine whole, rules), another product's own template. The
 * first-15 line, the queue's progress and ETA, the table and the page counter all read THIS. → (product, country) => boolean
 */
export function doneIn(facts, { templates = {} } = {}) {
  const memo = new Map();
  return (product, country) => {
    const k = `${product}|${country}`; if (memo.has(k)) return memo.get(k);
    const v = product === "oet" ? partsOf(country, facts).complete : templates[product] ? productPartsOf(product, country, facts, { template: templates[product] }).complete : false;
    memo.set(k, v); return v;
  };
}
/**
 * RR-332 · THE PAGE COUNTER — from collected data only, never an estimate (the frozen rules):
 *   country page: one per country, ready when done · country × profession page: only where that profession's council is found (by its
 *   name on its official page) · question page: a group whose answer is official AND asked enough (its stored `pageable`) · test dates
 *   live on the country page (no page of their own) · city pages: none.
 * → { country: { ready, waiting, why: { part: n } }, countryProfession: { ready, searching }, questions: { ready, waiting, why }, city: 0 }
 */
export function pageCounts(facts, { product = "oet", countries, template = null, professions = CF_PROFESSIONS }) {
  const done = doneIn(facts, { templates: template ? { [product]: template } : {} }), why = {};
  let ready = 0;
  for (const c of countries) {
    if (done(product, c)) { ready++; continue; }
    const missing = product === "oet" ? partsOf(c, facts, { professions }).missing : productPartsOf(product, c, facts, { template }).missing;
    for (const m of missing) why[m] = (why[m] ?? 0) + 1;
  }
  const mine = facts.filter((f) => (f.product ?? "oet") === product && shown(f));
  const found = product === "oet" ? new Set(mine.filter((f) => f.part === "councils" && f.value?.name).map((f) => `${f.country}|${f.profession}`)) : new Set();
  const qs = facts.filter((f) => (f.product ?? "oet") === product && f.part === "questions"), qReady = qs.filter((f) => shown(f) && f.value?.pageable);
  const qWhy = {}; for (const f of qs.filter((x) => !qReady.includes(x))) { const w = !shown(f) ? "answer not shown (not verified, or rejected)" : f.value?.answerKind !== "official" ? "no official answer yet" : "asked too little (under 50 searches, 3 askers)"; qWhy[w] = (qWhy[w] ?? 0) + 1; }
  return { country: { ready, waiting: countries.length - ready, why }, countryProfession: product === "oet" ? { ready: found.size, searching: countries.length * professions.length - found.size } : null, questions: { ready: qReady.length, waiting: qs.length - qReady.length, why: qWhy }, city: 0 };
}

/** what the app receives for a country (the service answers only SHOWN facts — never an unconfirmed one) */
export function countryPacket(country, facts, { professions = CF_PROFESSIONS } = {}) {
  const p = partsOf(country, facts, { professions }), pick = (f) => ({ key: f.key, value: f.value, source: f.sourceUrl, sourceTitle: f.sourceTitle, readOn: f.readOn, status: f.status, aiWritten: f.aiWritten, profession: f.profession ?? null });
  return { country, complete: p.complete, missing: p.missing, why: Object.fromEntries(PARTS.map((k) => [k, p.parts[k].missing])),
    /* RR-329: the AlmiOET records whose page the collector found gone (hidden until confirmed again), and the owner's own facts */
    gone: [...new Set(facts.filter((f) => f.country === country && f.proposedBy === "almioet-record" && GONE.test(f.why ?? "") && !shown(f)).map((f) => f.sourceUrl).filter(Boolean))],
    owner: facts.filter((f) => f.country === country && f.status === "owner" && (f.product ?? "oet") === "oet").map(pick),
    fee: p.parts.fee.facts.filter(shown).map(pick)[0] ?? null, questions: p.parts.questions.facts.map(pick), centres: p.parts.centres.facts.filter(shown).map(pick)[0] ?? null,
    /* every profession's council the page may show — whole (name, website, address: part 4) or found by its name only (enough for a country × profession page) */
    councils: Object.fromEntries(professions.map((k) => { const f = p.councils[k] ?? facts.find((x) => x.country === country && x.part === "councils" && x.profession === k && shown(x) && x.value?.name); return [k, f ? { ...pick(f), whole: councilWhole(f.value), found: councilFound(f) } : null]; })), rules: p.parts.rules.facts.map(pick) };
}

/* ── the questions of a country: its searches that ASK something about the subject, grouped by the need they ask about (the first group
 * whose words a search holds); a search naming a brand or a site people go to is not a question for our page ── */
export const QUESTION_GROUPS = Object.freeze([
  ["remark", /\bre-?mark|\brecheck|\bre-?scor/], ["fees", /\b(fees?|cost|costs|price|prices|charges?|how much)\b/], ["dates", /\b(dates?|schedule|calendar|when)\b/], ["results", /\bresults?\b/],
  ["scores", /\b(scores?|grades?|bands?|marks?|pass(ing)? ?(mark|score)?)\b/], ["centres", /\b(centres?|centers?|venues?|near me|where)\b/], ["booking", /\b(book|booking|register|registration|apply|application)\b/],
  ["validity", /\b(valid|validity|expire|expiry)\b/], ["home", /\b(home|online|computer)\b/], ["requirements", /\b(requirements?|eligib\w*|accepted|recogni[sz]ed?)\b/],
  ["practice", /\b(sample|samples|practice|mock|papers?|materials?|questions?)\b/], ["preparation", /\b(prepar\w*|course|courses|class|classes|coaching|academy|tips|study|preparation)\b/],
]);
const ASKS = /^(what|how|when|where|which|who|why|can|is|are|does|do|should|will)\b/;
/** RR-329: a search that ASKS something (a question word first, or the words of a question group) — the keyword collector keeps these */
export const isQuestion = (text) => { const t = String(text ?? "").toLowerCase(); return ASKS.test(t) || QUESTION_GROUPS.some(([, re]) => re.test(t)); };
/** rows [{ keyword, volume, period }] → groups [{ group, keywords, volume, period }], biggest first. `subject`: a word or (RR-329) a list of words */
export function questionGroups(rows, { subject, skip = null, max = 8 } = {}) {
  const esc = (s) => String(s).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sub = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[subject].flat().map(esc).join("|")})(?![\\p{L}\\p{N}])`, "u"), groups = new Map();
  for (const r of rows) {
    const t = String(r.keyword ?? "").toLowerCase(); if (!sub.test(t) || (skip && skip.test(t))) continue;
    const g = QUESTION_GROUPS.find(([, re]) => re.test(t))?.[0] ?? (ASKS.test(t) ? "other questions" : null); if (!g) continue;
    const x = groups.get(g) ?? { group: g, keywords: [], volume: 0, period: r.period ?? null }; x.keywords.push(r.keyword); x.volume += Number(r.volume ?? 0); groups.set(g, x);
  }
  return [...groups.values()].sort((a, b) => b.volume - a.volume || a.group.localeCompare(b.group)).slice(0, max);
}

/* ── the collector's own check that a proposed fact stands on its source page (it reads the page itself; an AI's word is never enough) ── */
export const normText = (s) => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (s) => normText(s).split(" ").filter(Boolean);
export const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };
/* RR-333 C (owner, 27 Oct 2026): private sites that are NEVER a source — exam-help sites, a private company, a licensing agent's advert.
 * The collectors never read them, so nothing can be confirmed from them */
export const BLOCKED_SOURCES = Object.freeze(["nle.ph", "board.com.ph", "prescriply.bd", "felixhappich.com"]);
export const blockedSource = (u) => { const h = hostOf(u); return Boolean(h) && BLOCKED_SOURCES.some((b) => h === b || h.endsWith(`.${b}`)); };
/** a reader that refuses the blocked sites (every other call unchanged) */
export const refuseBlocked = (reader) => (reader ? { ...reader, read: async (url, ...rest) => (blockedSource(url) ? { ok: false, url, why: "a private site the owner blocked as a source — never read" } : reader.read(url, ...rest)) } : reader);
/* a government's own address (gov, go, gob, govt, gouv …) */
export const governmentHost = (h) => /(^|\.)(gov|go|gob|govt|gouv|government|gv|nic)(\.[a-z]{2,3})?\.[a-z]{2}$|\.gov$/.test(String(h ?? ""));
/** the name stands on the page: whole, or its short name in brackets with most of its words */
export function nameOnPage(name, text) {
  const t = ` ${normText(text)} `, n = normText(name); if (!n) return false;
  if (t.includes(` ${n} `)) return true;
  const short = /\(([A-Za-z]{2,10})\)/.exec(String(name))?.[1]?.toLowerCase(), big = words(String(name).replace(/\([^)]*\)/g, "")).filter((w) => w.length > 3 && !["council", "board", "authority", "ministry", "department"].includes(w));
  const share = big.length ? big.filter((w) => t.includes(` ${w} `)).length / big.length : 0;
  return Boolean(short && t.includes(` ${short} `) && share >= 0.6) || (big.length >= 2 && share === 1);
}
/** the address stands on the page: most of its words, and its numbers (a street number, a postcode) */
export function addressOnPage(address, text) {
  const t = ` ${normText(text)} `, w = words(address).filter((x) => x.length >= 3 || /\d/.test(x)); if (w.length < 2) return false;
  const nums = w.filter((x) => /\d/.test(x)), hit = w.filter((x) => t.includes(` ${x} `)).length / w.length;
  return hit >= 0.6 && nums.every((x) => t.includes(` ${x} `));
}
/** a quoted sentence stands on the page (whole, or 85% of its four-word runs, in its words) */
export function quoteOnPage(quote, text) {
  const t = ` ${normText(text)} `, q = normText(quote); if (q.split(" ").length < 6) return false;
  if (t.includes(` ${q} `)) return true;
  const w = q.split(" "), runs = []; for (let i = 0; i + 4 <= w.length; i++) runs.push(w.slice(i, i + 4).join(" "));
  return runs.length > 0 && runs.filter((r) => t.includes(` ${r} `)).length / runs.length >= 0.85;
}
/** the numbers an answer states (12, 587, 2026, 7.5) */
export const numbersOf = (s) => [...String(s ?? "").replace(/(\d),(\d{3})/g, "$1$2").matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);
