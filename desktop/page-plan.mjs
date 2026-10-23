/**
 * 🔴 RR-319 · RIGHT COMBINATIONS, RIGHT QUANTITY — THE PAGE ENGINE THINKS LIKE THE OWNER ("never thin, never duplicate"):
 *   FORMULA   the client says in his own words which pages he has in mind ("from 197 countries to 9 countries; 8,000 universities in 12
 *             subjects; 519 job roles") — Visibility shows back what it understood, the client confirms or corrects (guided: from → to → for);
 *   QUESTIONS before counting, Visibility gathers the questions people ask — the client's Search Console, his YouTube niche, the subject's
 *             official FAQ pages, and his own AI's research (said as research, never as searches) — and groups the same-meaning ones;
 *   KINDS     every page answers ONE question, and only the dimensions that change that answer split it:
 *               REQUIREMENT  destination country × profession — a separate page only where the official rule differs (another body,
 *                            other scores); the same rule is one page with a section per profession;
 *               UNIVERSITY   only universities in the kept countries and subjects whose OWN page names the subject — one page per
 *                            country (its universities as sections);
 *               TAKING       where/how/how much to take it — the ORIGIN country matters here only, and only where an official page names
 *                            a venue; the fee in local currency at the official rate with its date;
 *               TOPIC        the questions no dimension page answers (fees, how it is scored, versus another test, on computer …);
 *   THE ONE TEST  is this page's ANSWER different from every other page's? Yes → a page. No → it goes inside the bigger page. A planned
 *             page no question asks for is WEAK: an honest "opportunity" page, said plainly, or merged.
 * Pure: everything is handed in.
 */
import { tokens } from "./youtube-advice.mjs";
import { countriesIn, destinationsIn, originsIn, slugOf } from "./world.mjs";
import { professionOf } from "./page-count.mjs";
import { professionsOfBody, isHealthRegulator } from "./official.mjs";
import { localFee } from "./page-count.mjs";

/* RR-319 C1 (owner typed a long description into Subject → 0 of 197 kept): the subject is the short name people search, e.g. OET */
export const SHORT_SUBJECT = "Write only the product's or test's short name here, e.g. OET. A longer description goes in the box below it.";
export const subjectProblem = (s) => { const t = String(s ?? "").trim(); return t.length > 40 || t.split(/\s+/).length > 4 || /[.!?]\s/.test(t) ? SHORT_SUBJECT : null; };
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (s, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(s ?? ""));

/* ── 1 · THE CLIENT'S OWN FORMULA ── */
const NOUN = [["universities", /universit(?:y|ies)|colleges?|institutions?|schools?/i], ["roles", /(?:job\s+)?roles?|professions?|occupations?|jobs?/i], ["subjects", /subjects?|fields?|courses?|disciplines?/i], ["cities", /cit(?:y|ies)|towns?/i], ["countries", /countr(?:y|ies)|nations?/i]];
const NUM = /(\d[\d,.]*)\s*(\+|k\b)?\s*(?:(?:job|healthcare|health)\s+)?([a-z]+(?:\s+roles?)?)/gi;
/**
 * The client's sentence → parts, each with its dimensions ({ dim, n, role: origin | destination | located | null }), and the plain line
 * "You mean: origin country (197) → destination country (9) · universities (8,000) × subjects (12) · job roles (519)".
 */
export function parseFormula(text) {
  const parts = String(text ?? "").split(/[;\n]|\.\s+(?=[a-z0-9])/i).map((p) => p.trim()).filter(Boolean).map((p) => {
    const dims = [];
    for (const m of p.matchAll(NUM)) {
      const noun = NOUN.find(([, re]) => re.test(m[3]))?.[0]; if (!noun) continue;
      const n = Math.round(Number(m[1].replace(/,/g, "")) * (/k/i.test(m[2] ?? "") ? 1000 : 1));
      const before = p.slice(0, m.index).toLowerCase().split(/\s+/).slice(-3).join(" ");
      let role = null;
      if (noun === "countries" && dims.some((d) => d.dim === "universities")) role = "located"; // "8,000 universities to 197 countries": where they are
      else if (noun === "countries") role = /\bfrom\b|\bpeople from\b|\bcoming from\b/.test(before) ? "origin" : /\bto\b|\bgoing to\b|\binto\b|\bfor\b/.test(before) ? "destination" : dims.some((d) => d.dim === "universities") ? "located" : null;
      dims.push({ dim: noun, n, role });
    }
    /* "from 197 countries to 9 countries": the first is where people come from, the second where they go */
    const cs = dims.filter((d) => d.dim === "countries");
    if (cs.length === 2 && !cs[0].role) cs[0].role = "origin";
    if (cs.length === 2 && !cs[1].role) cs[1].role = "destination";
    for (const d of cs) if (!d.role) d.role = dims.some((x) => x.dim === "universities") ? "located" : dims.some((x) => x.dim === "roles") ? "origin" : "destination";
    return { text: p, dims };
  }).filter((p) => p.dims.length);
  const say = (d) => `${{ countries: { origin: "origin country", destination: "destination country", located: "country" }[d.role] ?? "country", universities: "universities", roles: "job roles", subjects: "subjects", cities: "cities" }[d.dim] ?? d.dim} (${fmt(d.n)})`;
  const line = parts.length ? `You mean: ${parts.map((p) => { const o = p.dims.filter((d) => d.role === "origin"), rest = p.dims.filter((d) => d.role !== "origin"); return o.length && rest.some((d) => d.role === "destination") ? `${o.map(say).join(" × ")} → ${rest.map(say).join(" × ")}` : p.dims.map(say).join(" × "); }).join(" · ")}` : null;
  const all = parts.flatMap((p) => p.dims);
  const run = [...new Set(all.map((d) => (d.dim === "countries" ? (d.role === "origin" ? "origins" : "countries") : d.dim)))];
  if (all.some((d) => d.dim === "countries" && d.role === "origin") && !run.includes("countries")) run.push("countries");
  return { parts, line, run, ok: parts.length > 0 };
}
/** the guided form (no AI): "from what → to what → for what" — made into one sentence the same reader understands */
export const fromGuided = ({ from = "", to = "", for: forWhat = "" }) => parseFormula([from && `from ${from}`, to && `to ${to}`, forWhat && `for ${forWhat}`].filter(Boolean).join(" "));

/* ── 2 · THE QUESTIONS PEOPLE ASK ── */
/** gather and group: each question once (same meaning → one group, its other wordings "also asked"), each with its source and date */
export function groupQuestions(items) {
  const groups = [];
  for (const q of items) {
    const t = new Set(tokens(q.text)); if (t.size < 1) continue;
    const g = groups.find((x) => { const a = x.tokens; const both = [...a].filter((w) => t.has(w)).length; return both / new Set([...a, ...t]).size >= 0.6 || ([...t].every((w) => a.has(w)) && t.size >= 2) || ([...a].every((w) => t.has(w)) && a.size >= 2); });
    if (g) { if (!g.also.includes(q.text) && g.question !== q.text) g.also.push(q.text); g.sources.push(q); g.weight += q.weight ?? 1; }
    else groups.push({ question: q.text, also: [], sources: [q], tokens: t, weight: q.weight ?? 1 });
  }
  return groups.sort((a, b) => b.weight - a.weight).map(({ tokens: _t, ...g }) => g);
}
/** the official FAQ: the questions on the subject's own help or FAQ pages (each sentence that asks) */
export const faqQuestions = (pages) => pages.flatMap((p) => [...new Set(String(p.text ?? "").split(/(?<=[?])\s+|(?<=[.!])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => /\?$/.test(s) && s.length >= 12 && s.length <= 160 && !/cookie|newsletter|subscribe/i.test(s)))].map((q) => ({ text: q.replace(/^.*?(?=(How|What|Why|When|Where|Which|Who|Can|Do|Does|Is|Are|Will|Should)\b)/, ""), source: `${p.title ?? p.url} (official FAQ)`, link: p.url, on: p.checkedOn, kind: "official FAQ", weight: 2 })));

/* ── 3 · THE PLAN ── */
const PROFESSION_WORD = [[/\bnurs|midwi/i, "nursing"], [/\bdoctors?\b|physicians?|medic(al|ine)\b|\bgp\b|pgme|residen/i, "medicine"], [/\bdentist|dental/i, "dentistry"], [/\bpharmac/i, "pharmacy"], [/\bphysio|physical therap/i, "physiotherapy"], [/\boccupational therap|\bot\b/i, "occupational therapy"], [/\bradiograph/i, "radiography"], [/\bdietit|dietic/i, "dietetics"], [/\boptom/i, "optometry"], [/\bpodiat/i, "podiatry"], [/\bspeech/i, "speech pathology"], [/\bveterin|\bvets?\b|\bavbc\b/i, "veterinary science"]];
const professionIn = (q) => PROFESSION_WORD.find(([re]) => re.test(q))?.[1] ?? null;
const TAKING = /\b(fees?|costs?|price|how much|book|booking|venues?|centres?|centers?|test dates?|dates|where (to|can i) (take|sit)|exam cent\w*|at home|in pkr|in inr)\b/i; // RR-319 proof: "test centres" missed
const UNIVERSITY = /\b(universit(y|ies)|college|course|degree|admission|masters?|pgme|postgraduate)\b/i;
const TOPICS = [["fees", /\b(fee|fees|cost|costs|price|how much|cheap)/i, (s) => `${s} fees`], ["versus", /\b(vs|versus|or|compare|comparison|easier|harder|difference)\b.*\b(ielts|pte|toefl|cambridge)\b|\b(ielts|pte|toefl)\b.*\b(vs|versus|or|easier|harder)\b/i, (s) => `${s} vs IELTS and other tests`], ["scoring", /\b(score|scored|scoring|grade|grades|band|bands|marks?|result|results|pass)\b/i, (s) => `How ${s} is scored`], ["computer", /\b(computer|online|at home|@home|remote)\b/i, (s) => `${s} on computer and at home`], ["preparation", /\b(prepar|study|practi[cs]e|tips?|books?|material|course|sample)/i, (s) => `How to prepare for ${s}`], ["writing", /\bwriting\b/i, (s) => `${s} Writing`], ["speaking", /\bspeaking\b/i, (s) => `${s} Speaking`], ["listening", /\blistening\b/i, (s) => `${s} Listening`], ["reading", /\breading\b/i, (s) => `${s} Reading`], ["test day", /\b(test day|on the day|bring|arrive|identification)\b/i, (s) => `${s} test day: what to bring and expect`], ["validity", /\b(valid|validity|expire|how long)\b/i, (s) => `How long ${s} results are valid`]];

/**
 * THE PLAN, per kind. `r` = the reality filter's result; `official` = the official answers per country (claims with their body, the
 * professions the body is for, and its rule); `questions` = the grouped questions; `formula` = the client's understood formula.
 */
export function planPages({ r, official = {}, notSaid = {}, questions = [], formula = null, subject, demandNote = null }) {
  if (!r?.ok) return null;
  const D = r.dims, kept = (id) => D[id]?.kept ?? [];
  const countries = kept("countries").map((k) => k.name), origins = kept("origins").map((k) => k.name);
  const professions = [...new Set([...(D.roles?.professions ?? []), ...kept("roles").map((k) => k.profession)].filter(Boolean))];
  /* REQUIREMENT pages: per country, one page per distinct official rule (body + scores); the professions with no body page of their own
   * stay on the country's main page */
  const requirement = [];
  for (const c of countries) {
    const claims = official[c] ?? [], groups = new Map();
    for (const cl of claims.filter((x) => x.body && isHealthRegulator(x.body) && !/— its page for /.test(x.source ?? ""))) { // a visa office (Home Affairs) never sets the professional rule
      const profs = cl.professions ?? professionsOfBody(cl.body) ?? null; // a body named for no profession (Ahpra) is for every profession
      const key = profs ? `${profs.join("+")}|${cl.rule ?? ""}` : `all|${cl.rule ?? ""}`;
      const g = groups.get(key) ?? { professions: profs, bodies: [], claims: [] }; g.bodies.push(cl.body); g.claims.push(cl); groups.set(key, g);
    }
    const specific = [...groups.values()].filter((g) => g.professions?.length), general = [...groups.values()].filter((g) => !g.professions?.length);
    const country = kept("countries").find((k) => k.name === c);
    /* the same rule for every profession → ONE page; a body for some professions with its own rule → its own page, only when the country
     * has more than one rule */
    const distinct = new Set([...groups.values()].map((g) => g.claims.map((x) => x.rule).join("|")));
    if (specific.length && (distinct.size > 1 || general.length === 0 && specific.length > 1)) {
      for (const g of specific) requirement.push({ kind: "requirement", title: `${subject} for ${g.professions.map(cap).join(" and ")} in ${c}`, country: c, professions: g.professions, bodies: [...new Set(g.bodies)], claims: g.claims, why: `${[...new Set(g.bodies)].join(", ")} set${g.bodies.length === 1 ? "s" : ""} ${g.claims[0]?.sets?.[0] ? `its own scores (${g.claims[0].sets[0]})` : "its own rule"} — a different answer from the rest of ${c}`, source: g.claims[0] ? { url: g.claims[0].link, title: g.claims[0].source } : country?.source, checkedOn: g.claims[0]?.readOn ?? country?.checkedOn });
      const rest = professions.filter((p) => !specific.some((g) => g.professions.includes(p)));
      requirement.push({ kind: "requirement", title: `${subject} for ${c}`, country: c, professions: rest, bodies: general.flatMap((g) => g.bodies), claims: [...general.flatMap((g) => g.claims), ...claims.filter((x) => /— its page for /.test(x.source ?? ""))], why: rest.length ? `the other professions (${rest.join(", ")}) — ${general.length ? `${general.flatMap((g) => g.bodies).join(", ")}'s rule` : `no body page of their own found yet; ${subject}'s own page for ${c}`}` : `${subject}'s own page for ${c}`, source: country?.source, checkedOn: country?.checkedOn });
    } else requirement.push({ kind: "requirement", title: `${subject} for ${c}`, country: c, professions, bodies: [...groups.values()].flatMap((g) => g.bodies), claims, why: groups.size ? `one rule for every profession (${[...new Set([...groups.values()].flatMap((g) => g.bodies))].join(", ")}) — one page, a section per profession` : `${subject}'s own page for ${c}; no regulator's page was read yet — one page, a section per profession`, source: country?.source, checkedOn: country?.checkedOn });
  }
  /* C5: each country page says plainly which official pages were checked and do not say it; a visa office is named as such, never as the rule */
  for (const p of requirement) { p.notSaid = (notSaid[p.country] ?? []).map((n) => n.line); p.otherBodies = [...new Set([...(official[p.country] ?? []).map((x) => x.body), ...(kept("countries").find((k) => k.name === p.country)?.bodies ?? [])].filter((b) => b && b !== subject && !isHealthRegulator(b)))]; /* never the subject itself */ if (!(official[p.country] ?? []).some((x) => x.body && isHealthRegulator(x.body))) p.regulator = `No health regulator's own page for ${p.country} names ${subject} yet${p.notSaid.length ? ` — checked: ${p.notSaid.length} official page${p.notSaid.length === 1 ? "" : "s"}` : ""}.`; }
  /* UNIVERSITY pages: one per country with at least one university whose own page names the subject */
  const uni = D.universities, byCountry = new Map();
  for (const u of uni?.kept ?? []) { const c = countriesIn(u.country ?? "")[0] ?? u.country; byCountry.set(c, [...(byCountry.get(c) ?? []), u]); }
  const university = [...byCountry.entries()].map(([c, us]) => ({ kind: "university", title: `Universities in ${c} that accept ${subject}`, country: c, universities: us.map((u) => u.name), why: `${plural(us.length, "university", "universities")} whose own page names ${subject} — one page, a section each`, source: us[0].source, checkedOn: us[0].checkedOn }));
  /* TAKING-THE-TEST pages: one per origin country with an official venue — the fee in its own currency */
  /* RR-319 A3: the fee as the subject's own page states it — a sourced, dated answer for the taking pages and the fees topic */
  const feeClaim = (country) => (r.fee?.ok && r.fee.source?.url ? { claimId: `fee-${slugOf(country ?? "all")}`, text: `${subject}'s own page states the fee — ${country ? localFee(r.fee, country, r.rates)?.line ?? `${r.fee.currency} ${r.fee.amount}` : `${r.fee.currency} ${r.fee.amount}`}.`, link: r.fee.source.url, readOn: r.fee.checkedOn, source: `${subject} — its own page`, official: true, body: subject } : null);
  const taking = kept("origins").map((k) => ({ claims: [feeClaim(k.name)].filter(Boolean), kind: "taking", title: `Taking ${subject} in ${k.name}: venues, dates and fee`, country: k.name, fee: localFee(r.fee, k.name, r.rates)?.line ?? null, why: `${k.how} — where and how to sit it, and what it costs there`, source: k.source, checkedOn: k.checkedOn }));
  /* every question to the ONE page whose answer it needs; the rest become TOPIC pages; the ones not about the subject or its dimensions are not used */
  const pages = [...requirement, ...university, ...taking];
  const topics = new Map(), unused = [];
  for (const g of questions) {
    const q = [g.question, ...g.also].join(" "), dest = destinationsIn(q).filter((c) => countries.includes(c)), orig = [...originsIn(q), ...countriesIn(q)].filter((c) => origins.includes(c)), prof = professionIn(q);
    /* RR-319 ADD 3 (real run: AVBC, Dalhousie PGME, Singapore physiotherapy became topic pages): a question is used only when it names the
     * subject or a kept country, and never when it is about a profession the subject is not for */
    const about = names(q, subject) || dest.length || g.sources?.some((x) => x.kind === "official FAQ"); // the subject's own FAQ is about the subject
    if (prof && professions.length && !professions.includes(prof)) { unused.push({ question: g.question, why: `about ${prof}, which ${subject} is not for` }); continue; }
    let page = null;
    if (TAKING.test(q) && orig.length) page = taking.find((p) => p.country === orig[0]);
    if (!page && UNIVERSITY.test(q) && dest.length) page = university.find((p) => p.country === dest[0]);
    if (!page && dest.length) page = requirement.filter((p) => p.country === dest[0]).find((p) => prof && p.professions?.includes(prof)) ?? requirement.find((p) => p.country === dest[0] && p.title === `${subject} for ${dest[0]}`) ?? requirement.find((p) => p.country === dest[0]);
    if (page) { (page.questions ??= []).push({ ...g, section: prof }); continue; } // a profession's question is that profession's SECTION
    if (!about) { unused.push({ question: g.question, why: `not about ${subject} or one of the kept countries or professions` }); continue; }
    const t = TOPICS.find(([, re]) => re.test(q));
    const key = t ? t[0] : `q:${g.question.toLowerCase()}`;
    const tp = topics.get(key) ?? { claims: t?.[0] === "fees" ? [feeClaim(null)].filter(Boolean) : [], kind: "topic", title: t ? t[2](subject) : cap(g.question.replace(/\?$/, "")), why: t ? `the questions people ask about ${t[0]} — no country or profession changes this answer` : "a question of its own", questions: [] };
    tp.questions.push(g); topics.set(key, tp);
  }
  const topic = [...topics.values()];
  /* weak TAKING pages (no one searches for one country yet) are one page with a section per country — never 13 near-identical pages; a
   * country gets its own page when people ask about taking it there */
  for (const p of taking) p.questions ??= [];
  const lone = taking.filter((p) => !p.questions.length);
  if (lone.length >= 2) { taking.splice(0, taking.length, ...taking.filter((p) => p.questions.length), { kind: "taking", title: `Where to take ${subject}: venues, dates and fees by country`, countries: lone.map((p) => p.country), fees: lone.map((p) => `${p.country}: ${p.fee ?? "no fee read"}`), claims: [feeClaim(null)].filter(Boolean), why: `${lone.length} countries where ${subject}'s own pages name a venue — no search asks about one of them yet, so one page with a section per country`, source: lone[0].source, checkedOn: lone[0].checkedOn, questions: [] }); pages.splice(0, pages.length, ...requirement, ...university, ...taking); }
  /* a planned page no question asks for is WEAK: an honest opportunity page (the owner's 18 Oct rule), said plainly */
  /* RR-319 ADD 3 (owner: "avbc australia" — a vets' search — showed as the Australia page's main search): a page's MAIN search is one about
   * the page itself — on a profession's own page, that profession; on a country's page, a question naming no one profession */
  const own = (p, g) => (p.title === `${subject} for ${p.country}` ? !g.section : !g.section || (p.professions ?? []).includes(g.section)); // a country's page: never one profession's search (AVBC is the vets' section)
  for (const p of pages) { p.questions ??= []; p.weak = p.questions.length === 0; p.main = p.questions.find((g) => own(p, g))?.question ?? null; }
  const kinds = { requirement, university, taking, topic };
  const count = (xs) => ({ total: xs.length, withQuestions: xs.filter((p) => !p.weak).length, opportunity: xs.filter((p) => p.weak).length });
  return { kinds, counts: Object.fromEntries(Object.entries(kinds).map(([k, xs]) => [k, count(xs)])), total: Object.values(kinds).reduce((n, xs) => n + xs.length, 0), unused, questionsTotal: questions.length, perPart: formula ? answerParts(formula, r, kinds, subject) : [], whyNotMore: whyNotMore(r, kinds, subject, formula), demandNote };
}
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/** "why not more": the naive product of the client's numbers against what is real and distinct */
function whyNotMore(r, kinds, subject, formula) {
  const D = r.dims, n = (id) => D[id]?.candidates ?? 0;
  const nums = formula?.parts?.flatMap((p) => p.dims) ?? [];
  const has = (dim, role) => nums.find((d) => d.dim === dim && (!role || d.role === role))?.n;
  const naive = [has("countries", "destination") ?? (D.countries ? n("countries") : null), has("roles") ?? (D.roles ? n("roles") : null), has("countries", "origin") ?? (D.origins ? n("origins") : null), has("universities") ?? (D.universities ? n("universities") : null)].filter((x) => x);
  const product = naive.reduce((a, b) => a * b, 1);
  const lines = [];
  if (D.countries) lines.push(`${fmt(D.countries.candidates)} countries → ${D.countries.kept.length}: an official page says ${subject} is recognised only there.`);
  if (D.roles) lines.push(`${fmt(D.roles.candidates)} job roles → ${(D.roles.professions ?? []).length} professions: ${subject} has a test only for these; the roles inside a profession share its answer.`);
  if (D.origins) lines.push(`The country people come FROM does not change the requirement answer — it matters only for where to sit the test: ${D.origins.kept.length} of ${fmt(D.origins.candidates)} countries have a venue an official page names.`);
  if (D.universities) lines.push(`${fmt(D.universities.candidates)} universities → ${D.universities.inScope} in the kept countries and subjects → ${D.universities.kept.length} whose own page names ${subject} (${D.universities.notRead.length} not checked yet).`);
  lines.push(`A separate requirement page only where the official rule differs (another body, other scores) — otherwise one page with a section per profession.`);
  return { product, factors: naive, line: product > 1 ? `Not ${fmt(product)} pages (${naive.map(fmt).join(" × ")}): pages that differ only by a name are near-identical, and Google calls that scaled content abuse.` : null, lines };
}

/** the honest answer for each part of the client's own formula */
function answerParts(formula, r, kinds, subject) {
  return formula.parts.map((p) => {
    const dims = p.dims.map((d) => d.dim), roles = p.dims.map((d) => d.role);
    if (dims.includes("universities")) return { part: p.text, answer: `${kinds.university.length ? `Better this way: ${plural(kinds.university.length, "page")} — one per country, its universities as sections` : "No page yet"}: ${fmt(r.dims.universities?.candidates ?? 0)} universities → ${r.dims.universities?.inScope ?? 0} in the ${r.dims.countries?.kept.length ?? "kept"} countries and the subjects ${subject} applies to → ${r.dims.universities?.kept.length ?? 0} whose own page names ${subject}${r.dims.universities?.notRead?.length ? ` (${r.dims.universities.notRead.length} still to check)` : ""}.` };
    if (dims.includes("roles") && roles.includes("origin")) return { part: p.text, answer: `Better this way: ${fmt(r.dims.roles?.candidates ?? 0)} job roles → the ${(r.dims.roles?.professions ?? []).length} professions ${subject} is for, as sections of the requirement pages; the ${fmt(p.dims.find((d) => d.role === "origin")?.n ?? 0)} countries people come from do not change that answer — no page per origin.` };
    if (roles.includes("origin") && roles.includes("destination")) return { part: p.text, answer: `Better this way: ${plural(kinds.requirement.length, "requirement page")} for the ${r.dims.countries?.kept.length ?? 0} countries that recognise ${subject} (a separate page only where the rule differs); the countries people come from matter only for taking the test — ${plural(kinds.taking.length, "page")} for the ${plural(r.dims.origins?.kept.length ?? 0, "country", "countries")} where an official page names a venue.` };
    if (dims.includes("roles")) return { part: p.text, answer: `${fmt(r.dims.roles?.candidates ?? 0)} job roles → ${(r.dims.roles?.professions ?? []).length} professions, sections of the requirement pages.` };
    if (dims.includes("countries")) return { part: p.text, answer: `Yes, good: ${plural(kinds.requirement.length, "page")} — ${r.dims.countries?.kept.length ?? 0} countries that recognise ${subject}.` };
    return { part: p.text, answer: "Counted in the plan below." };
  });
}
