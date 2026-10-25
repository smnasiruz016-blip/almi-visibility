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
export const SHOWN_STATUS = Object.freeze(["confirmed", "approved", "edited"]);
/* the subject's professions (AlmiOET's list, desktop/lists/almiworld-oet-professions.json), by the keys the page plan uses */
export const CF_PROFESSIONS = Object.freeze(["medicine", "nursing", "dentistry", "pharmacy", "physiotherapy", "occupational therapy", "radiography", "dietetics", "optometry", "podiatry", "speech pathology", "veterinary science"]);
/* the countries people come to it from most (owner, RR-328 B) — the collector's order; then the rest of the 197 */
export const CF_PRIORITY = Object.freeze(["India", "Philippines", "Pakistan", "Nigeria", "Kenya", "Egypt", "Bangladesh", "Nepal", "Ghana", "Zimbabwe", "Sri Lanka", "United Arab Emirates", "Saudi Arabia"]);

const shown = (f) => SHOWN_STATUS.includes(f?.status);
/** a council fact is whole when it has its name, official website and address */
export const councilWhole = (v) => Boolean(v?.name && /^https?:\/\//.test(v?.website ?? "") && String(v?.address ?? "").trim().length >= 8);
/** the fee fact shows a figure in the country's own money */
export const feeLocal = (v) => Boolean(v?.local && v?.line);

/**
 * One country's five parts from its facts (any statuses — only the shown ones count).
 * → { country, parts: { fee|questions|centres|councils|rules: { filled, missing: [why…], facts: [fact…] } }, missing: [part…], complete,
 *     councils: { profession: fact|null } }
 */
export function partsOf(country, facts, { professions = CF_PROFESSIONS } = {}) {
  const mine = facts.filter((f) => f.country === country && shown(f)), of = (part) => mine.filter((f) => f.part === part);
  const fee = of("fee").find((f) => feeLocal(f.value)) ?? null, feeAny = of("fee")[0] ?? null;
  const questions = of("questions").filter((f) => f.value?.question && f.value?.answer);
  const centres = of("centres").find((f) => f.value?.venue || (f.value?.home && (f.value?.nearest ?? []).length)) ?? null;
  const councils = Object.fromEntries(professions.map((p) => [p, of("councils").find((f) => f.profession === p && councilWhole(f.value)) ?? null]));
  const noCouncil = professions.filter((p) => !councils[p]), partial = professions.filter((p) => !councils[p] && of("councils").some((f) => f.profession === p));
  const rules = of("rules").filter((f) => f.value?.rule);
  const parts = {
    fee: { filled: Boolean(fee), facts: fee ? [fee] : feeAny ? [feeAny] : [], missing: fee ? [] : [feeAny ? "no figure in its own currency yet" : "no fee read yet"] },
    questions: { filled: questions.length > 0, facts: questions, missing: questions.length ? [] : ["no question from this country with its answer yet"] },
    centres: { filled: Boolean(centres), facts: centres ? [centres] : of("centres"), missing: centres ? [] : ["no venue named, and no nearest venue with taking it at home"] },
    councils: { filled: noCouncil.length === 0, facts: Object.values(councils).filter(Boolean), missing: noCouncil.length ? [`${noCouncil.length} of ${professions.length} professions without a whole council (name, website, address)${partial.length ? ` — ${partial.length} found but incomplete` : ""}: ${noCouncil.join(", ")}`] : [] },
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
    unconfirmed: facts.filter((f) => f.status === "unconfirmed").length, rejected: facts.filter((f) => f.status === "rejected").length } };
}

/** what the app receives for a country (the service answers only SHOWN facts — never an unconfirmed one) */
export function countryPacket(country, facts, { professions = CF_PROFESSIONS } = {}) {
  const p = partsOf(country, facts, { professions }), pick = (f) => ({ key: f.key, value: f.value, source: f.sourceUrl, sourceTitle: f.sourceTitle, readOn: f.readOn, status: f.status, aiWritten: f.aiWritten, profession: f.profession ?? null });
  return { country, complete: p.complete, missing: p.missing, why: Object.fromEntries(PARTS.map((k) => [k, p.parts[k].missing])),
    fee: p.parts.fee.facts.filter(shown).map(pick)[0] ?? null, questions: p.parts.questions.facts.map(pick), centres: p.parts.centres.facts.filter(shown).map(pick)[0] ?? null,
    /* every profession's council the page may show — whole (name, website, address: part 4) or found by its name only (enough for a country × profession page) */
    councils: Object.fromEntries(professions.map((k) => { const f = p.councils[k] ?? facts.find((x) => x.country === country && x.part === "councils" && x.profession === k && shown(x) && x.value?.name); return [k, f ? { ...pick(f), whole: councilWhole(f.value) } : null]; })), rules: p.parts.rules.facts.map(pick) };
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
/** rows [{ keyword, volume, period }] → groups [{ group, keywords, volume, period }], biggest first */
export function questionGroups(rows, { subject, skip = null, max = 8 } = {}) {
  const sub = new RegExp(`(?<![\\p{L}\\p{N}])${String(subject).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"), groups = new Map();
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
