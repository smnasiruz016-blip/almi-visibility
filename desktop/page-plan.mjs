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
import { RECOGNITION_DIRECTORIES } from "./universities.mjs";

/* RR-319 C1 (owner typed a long description into Subject → 0 of 197 kept): the subject is the short name people search, e.g. OET */
export const SHORT_SUBJECT = "Write only the product's or test's short name here, e.g. OET. A longer description goes in the box below it.";
export const subjectProblem = (s) => { const t = String(s ?? "").trim(); return t.length > 40 || t.split(/\s+/).length > 4 || /[.!?]\s/.test(t) ? SHORT_SUBJECT : null; };
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (s, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(s ?? ""));

/* ── 1 · THE CLIENT'S OWN FORMULA ── */
/*
 * 🔴 RR-320 B (owner: "it multiplied everything — 8,000 × 197 × 12 = 7.36 billion — and took the WRONG 12"): Visibility reads the
 * RELATIONS in his words and never multiplies every number blindly:
 *   "People from 197 countries apply for 12 professions in the 9 OET destination countries" → origin (197) → profession (12) in destination (9)
 *   "Graduates of 8,000+ universities need OET to work in these 9 countries"            → graduates of universities (8,000) → destination (9)
 *   "How many questions do people from 197 countries ask about OET?"                    → the questions people from origin countries (197) ask
 * "professions" are the subject's professions (OET's 12) — never a list of study subjects; "job roles" are job roles.
 */
const NOUN = [["universities", /^(universit(y|ies)|colleges?|institutions?|schools?)$/i, "universities"], ["roles", /^(professions?|occupations?)$/i, "professions"], ["roles", /^(roles?|jobs?)$/i, "job roles"], ["subjects", /^(subjects?|fields?|courses?|disciplines?)$/i, "subjects"], ["cities", /^(cit(y|ies)|towns?)$/i, "cities"], ["countries", /^(countr(y|ies)|nations?)$/i, "countries"]];
const NUMBER = /^(\d[\d,.]*)(\+|k)?\+?$/i;
const FILLER = new Set(["the", "these", "those", "all", "our", "its", "his", "her", "their", "of", "over", "about", "around", "some", "more", "than"]);
/** the words of one part → its dimensions, each with the RELATION the words give it */
function dimsOf(p) {
  const w = p.replace(/[()?!:"“”]|,(?!\d{3})/g, " ").split(/\s+/).filter(Boolean), dims = []; // "8,000" stays one number
  for (let i = 0; i < w.length; i++) {
    const m = NUMBER.exec(w[i]); if (!m) continue;
    let k = i + 1, noun = null;
    for (; k < Math.min(w.length, i + 5) && !NUMBER.test(w[k]); k++) { noun = NOUN.find(([, re]) => re.test(w[k].replace(/[.;]$/, ""))); if (noun) break; }
    if (!noun) continue;
    const n = Math.round(Number(m[1].replace(/,/g, "")) * (/k/i.test(m[2] ?? "") ? 1000 : 1));
    const between = w.slice(i + 1, k).join(" ").toLowerCase(), before = w.slice(Math.max(0, i - 4), i).map((x) => x.toLowerCase()).filter((x) => !FILLER.has(x) || x === "of"), last = before.filter((x) => !FILLER.has(x)).slice(-2).join(" ");
    let role = null;
    if (noun[0] === "countries") {
      const prev = dims.at(-1);
      if (/destination/.test(between)) role = "destination";
      else if (/\bfrom$|coming from$|people from$/.test(last) && !(prev?.dim === "universities")) role = "origin";
      else if (prev?.dim === "universities" && /(^| )(in|across|at)$/.test(last) && before.slice(-1)[0] !== "work" && !/work in$/.test(last)) role = "located"; // "universities in 197 countries": where they are
      else if (/(^| )(to|into|in|for|at)$|work in$|go to$|move to$/.test(last)) role = "destination";
    }
    if (noun[0] === "universities" && before.join(" ").match(/\b(graduates|alumni|students)\s+(of|from)$/)) role = "graduates";
    dims.push({ dim: noun[0], n, role, word: noun[2] });
    i = k;
  }
  const cs = dims.filter((d) => d.dim === "countries");
  if (cs.length === 2 && !cs[0].role) cs[0].role = "origin";
  if (cs.length === 2 && !cs[1].role) cs[1].role = "destination";
  for (const d of cs) if (!d.role) d.role = dims.some((x) => x.dim === "universities") ? "destination" : dims.some((x) => x.dim === "roles" && x.word === "job roles") ? "origin" : "destination";
  /* "how many QUESTIONS do people … ask": the questions people ask, per country they come from */
  if (/\bquestions?\b/i.test(p) && /\b(how many|which|what)\b/i.test(p)) dims.push({ dim: "questions", n: null, role: null, word: "questions" });
  return dims;
}
/** what a part is about — the one kind of answer it needs (the owner's 3 questions: professions, universities, questions) */
export function kindOfPart(dims) {
  const has = (dim, role) => dims.some((d) => d.dim === dim && (!role || d.role === role));
  if (has("questions")) return "questions";
  if (has("universities")) return "university";
  if (has("roles") && (has("countries", "destination") || has("countries", "origin"))) return dims.some((d) => d.dim === "roles" && d.word === "job roles") && !has("countries", "destination") ? "roles" : "profession";
  if (has("countries", "destination")) return "profession";
  return "other";
}
const sayDim = (d) => `${{ countries: { origin: "origin country", destination: "destination country", located: "country" }[d.role] ?? "country", universities: d.role === "graduates" ? "graduates of universities" : "universities", roles: d.word ?? "job roles", subjects: "subjects", cities: "cities", questions: "questions" }[d.dim] ?? d.dim}${d.n ? ` (${fmt(d.n)})` : ""}`;
function sayPart(p) {
  const by = (dim, role) => p.dims.filter((d) => d.dim === dim && (!role || d.role === role)).map(sayDim);
  if (p.kind === "questions") return `the questions people from ${[...by("countries", "origin"), ...by("countries", "destination")][0] ?? "every country"} ask`;
  if (p.kind === "university") return `${p.dims.filter((d) => d.dim === "universities").map((d) => sayDim({ ...d, role: "graduates" })).join(" ")} → working in ${by("countries").join(", ") || "the destination countries"}`;
  if (p.kind === "profession") return [by("countries", "origin").map((x) => `people from ${x}`)[0], [by("roles").join(" × "), by("countries", "destination").join(" × ")].filter(Boolean).join(" in ")].filter(Boolean).join(" → ");
  const o = by("countries", "origin"), rest = p.dims.filter((d) => d.role !== "origin").map(sayDim);
  return o.length && rest.length ? `${o.join(" × ")} → ${rest.join(" × ")}` : p.dims.map(sayDim).join(" × ");
}
/** parts (from the plain reader or the client's AI) → the confirmed formula: its parts with their kind, the plain line, the lists to check */
export function formulaOf(parts) {
  parts = parts.map((p) => ({ ...p, kind: kindOfPart(p.dims) })).filter((p) => p.dims.length);
  const line = parts.length ? `You mean: ${parts.map(sayPart).join(" · ")}` : null;
  const all = parts.flatMap((p) => p.dims).filter((d) => d.dim !== "questions");
  const run = [...new Set(all.map((d) => (d.dim === "countries" ? (d.role === "origin" ? "origins" : "countries") : d.dim)))];
  if (!run.includes("countries") && (all.some((d) => d.dim === "countries") || parts.some((p) => p.kind === "university" || p.kind === "questions"))) run.push("countries");
  return { parts, line, run, professions: all.some((d) => d.dim === "roles" && d.word === "professions"), ok: parts.length > 0 };
}
/**
 * The client's sentence → parts, each with its dimensions ({ dim, n, role: origin | destination | located | graduates | null, word }),
 * its kind, and the plain line "You mean: people from origin country (197) → professions (12) in destination country (9) · …".
 */
export function parseFormula(text) {
  /* a part per line, ";" or sentence — "How many pages?" alone names nothing and is dropped */
  return formulaOf(String(text ?? "").replace(/^\s*\d+[).]\s+/gm, "").split(/[;\n]|(?<=[.?!])\s+(?=[A-Za-z0-9])/).map((p) => p.trim()).filter(Boolean).map((p) => ({ text: p, dims: dimsOf(p) })).filter((p) => p.dims.some((d) => d.dim !== "questions") || p.dims.length && /\bquestions?\b/i.test(p.text)));
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
/* search EVIDENCE: the client's own Search Console, what his AI saw in Google in his browser, or a search-data file that reports searches —
 * never an AI's research or a FAQ */
const searched = (g) => (g.sources ?? []).some((x) => x.kind === "search" || x.kind === "observed" || (x.kind === "tool" && parseFloat(String(x.volume?.estimate ?? x.volume ?? 0).replace(/[^\d.]/g, "")) > 0));
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
/* RR-320 proof: 21 of 22 university drafts failed only the title check (over 70 characters) — the university's own name; its short name
 * (in brackets) when the whole name is long */
const uniTitle = (subject, x) => { const name = String(x.name).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim(), short = /\(([^)/]{2,20})/.exec(x.name)?.[1]?.trim(); const t = `${subject} for ${name} graduates`; return t.length <= 60 || !short ? t : `${subject} for ${short} graduates`; };
/* a body's rule is for a profession when its NAME names it (Nursing and Midwifery Board → nursing), or — for a body whose name names none
 * (Ahpra) — when its own page names the people of that profession */
const accepts = (cl, prof) => (cl.professions?.length ? cl.professions.includes(prof) : (cl.named ?? []).includes(prof));

/**
 * THE PLAN, per kind (RR-320 owner policy, final): `r` = the reality filter's result; `official` = the official answers per country (claims
 * with their body, the professions its name or page names, its rule); `questions` = the grouped questions; `formula` = the client's formula.
 *   REQUIREMENT  destination × profession — ONLY where that country's regulator's own page accepts the subject for that profession; a
 *                country page only where people SEARCH for the country in general;
 *   TAKING       an origin country's own page only where the answer differs (a venue, the fee in its currency) AND people search for it;
 *                the others are sections of one page;
 *   UNIVERSITY   ONE page per university (its own site read: a health course page), all destination countries inside it;
 *   TOPIC        the questions no dimension page answers.
 * Never a product of all dimensions; each page's answer is different from every other page's.
 */
export function planPages({ r, official = {}, notSaid = {}, questions = [], formula = null, subject, demandNote = null }) {
  if (!r?.ok) return null;
  const D = r.dims, kept = (id) => D[id]?.kept ?? [];
  const countries = kept("countries").map((k) => k.name), origins = kept("origins").map((k) => k.name);
  const professions = [...new Set([...(D.roles?.professions ?? []), ...kept("roles").map((k) => k.profession)].filter(Boolean))];
  /* ── REQUIREMENT: destination × profession, only where the regulator accepts it ── */
  const requirement = [], gaps = [], hubs = new Map();
  for (const c of countries) {
    const claims = official[c] ?? [], own = claims.find((x) => /— its page for /.test(x.source ?? "")) ?? null, country = kept("countries").find((k) => k.name === c);
    const regs = claims.filter((x) => x.body && isHealthRegulator(x.body) && !/— its page for /.test(x.source ?? ""));
    const checked = (notSaid[c] ?? []).map((n) => n.line), blocked = checked.filter((l) => /robots/i.test(l)).length;
    for (const prof of professions) {
      const mine = regs.filter((x) => accepts(x, prof));
      if (!mine.length) { gaps.push({ country: c, profession: prof, reason: regs.length ? "read" : checked.length ? (blocked === checked.length ? "robots" : "not said") : "no page", why: regs.length ? `${[...new Set(regs.map((x) => x.body))].join(", ")}: its own page names ${subject}, but not ${prof}` : checked.length ? `no regulator's own page says it — ${checked.length} official page${checked.length === 1 ? "" : "s"} checked${blocked ? `, ${blocked} refused by robots.txt` : ""}` : `no regulator's own page for ${c} was found to read yet` }); continue; }
      const b = [...new Set(mine.map((x) => x.body))];
      requirement.push({ kind: "requirement", questions: [], title: `${subject} for ${cap(prof)} in ${c}`, country: c, profession: prof, professions: [prof], bodies: b, claims: [...mine, own].filter(Boolean).slice(0, 4), why: `${b.join(", ")}: its own page names ${subject}${mine[0].sets?.[0] ? ` (${mine[0].sets[0]})` : ""}${mine[0].professions?.length ? "" : ` and names ${prof} among the people it registers`}`, source: { url: mine[0].link, title: mine[0].source }, checkedOn: mine[0].readOn });
    }
    /* RR-320 proof: Ahpra's ONE rule made 9 near-identical Australian pages (the draft gate then made 8 of them sections) — professions that
     * share one regulator and one rule are ONE page, a section per profession; a regulator of one profession keeps its own page */
    const groups = new Map();
    for (const p of requirement.filter((x) => x.country === c)) { const k = `${p.bodies.join("+")}|${p.claims[0]?.sets?.[0] ?? p.claims[0]?.rule ?? p.claims[0]?.text}`; groups.set(k, [...(groups.get(k) ?? []), p]); }
    for (const g of groups.values()) if (g.length > 1) {
      const [first, ...rest] = g, names = g.map((p) => cap(p.profession));
      Object.assign(first, { professions: g.map((p) => p.profession), title: `${subject} for ${names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`} in ${c}`, why: `${first.bodies.join(", ")}: one rule for ${g.map((p) => p.profession).join(", ")} — one page, a section per profession`, merged: rest.length });
      for (const p of rest) requirement.splice(requirement.indexOf(p), 1);
    }
    /* a country's own page exists only where people search for the country in general (decided after the questions are given out) */
    hubs.set(c, { kind: "requirement", hub: true, title: `${subject} in ${c}: professions and regulators`, country: c, professions: requirement.filter((p) => p.country === c).flatMap((p) => p.professions), bodies: [...new Set(regs.map((x) => x.body))], claims: [own, ...regs].filter(Boolean).slice(0, 4), why: `people search for ${subject} in ${c} in general — ${requirement.some((p) => p.country === c) ? "this page links its profession pages" : `${subject}'s own page for ${c} says it is recognised there`}`, source: own ? { url: own.link, title: own.source } : country?.source, checkedOn: own?.readOn ?? country?.checkedOn, regulator: regs.length ? null : `No health regulator's own page for ${c} names ${subject} yet${checked.length ? ` — checked: ${checked.length} official page${checked.length === 1 ? "" : "s"}` : ""}.`, notSaid: checked, otherBodies: [...new Set([...claims.map((x) => x.body), ...(country?.bodies ?? [])].filter((x) => x && x !== subject && !isHealthRegulator(x)))], questions: [] });
  }
  /* ── TAKING: where to sit it, the fee in the local currency ── */
  const feeClaim = (country) => (r.fee?.ok && r.fee.source?.url ? { claimId: `fee-${slugOf(country ?? "all")}`, text: `${subject}'s own page states the fee — ${country ? localFee(r.fee, country, r.rates)?.line ?? `${r.fee.currency} ${r.fee.amount}` : `${r.fee.currency} ${r.fee.amount}`}.`, link: r.fee.source.url, readOn: r.fee.checkedOn, source: `${subject} — its own page`, official: true, body: subject } : null);
  const taking = kept("origins").map((k) => ({ claims: [feeClaim(k.name)].filter(Boolean), kind: "taking", title: `Taking ${subject} in ${k.name}: venues, dates and fee`, country: k.name, fee: localFee(r.fee, k.name, r.rates)?.line ?? null, why: `${k.how} — where and how to sit it, and what it costs there`, source: k.source, checkedOn: k.checkedOn, questions: [] }));
  /* ── UNIVERSITY: one page per university whose own site was read, every destination inside it ── */
  const U = D.universities, university = [], uniDropped = [];
  const factsFor = (profs = []) => countries.map((c) => { const facts = requirement.filter((p) => !p.hub && p.country === c && (!profs.length || p.professions.some((q) => profs.includes(q)))).map((p) => ({ profession: (profs.length ? p.professions.filter((q) => profs.includes(q)) : p.professions).join(", "), body: p.bodies.join(", "), text: p.claims[0].text, link: p.claims[0].link, readOn: p.claims[0].readOn, page: p.title })); return { country: c, facts, says: facts.length ? null : hubs.get(c)?.regulator ?? `Official pages checked — none says what ${profs.length ? profs.join(", ") : "its"} graduates need for ${c} yet.` }; });
  for (const x0 of U?.kept ?? []) {
    const x = { ...x0, professions: x0.professions ?? [] }; // a count saved before RR-320 has no professions
    const dest = factsFor(x.professions), withFacts = dest.filter((d) => d.facts.length);
    if (!withFacts.length) { uniDropped.push({ name: x.name, why: `its own site lists ${x.professions.join(", ") || "health"} courses, but no destination's regulator page was found for them yet` }); continue; }
    const courses = x.site?.courses ?? [], named = courses.find((c) => c.namesSubject);
    const claims = [
      ...courses.slice(0, 1).map((c) => ({ claimId: `course-${slugOf(c.url).slice(-40)}`, text: `${x.name} lists a ${c.profession} course on its own site.`, link: c.url, readOn: c.readOn, source: `${x.name} — its own page`, official: true, body: x.name })),
      ...(named ? [{ claimId: `course-subject-${slugOf(named.url).slice(-40)}`, text: `${x.name}'s own ${named.profession} page names ${subject}.`, link: named.url, readOn: named.readOn, source: `${x.name} — its own page`, official: true, body: x.name }] : []),
      ...withFacts.slice(0, 2).map((d) => requirement.find((p) => p.title === d.facts[0].page)?.claims[0]).filter(Boolean),
    ].slice(0, 5);
    university.push({ kind: "university", title: uniTitle(subject, x), university: x.name, country: x.country, city: x.city, professions: x.professions, destinations: dest, courses, namesSubject: Boolean(named) || Boolean(x.site?.homeNamesSubject), accreditation: x.accreditation, listVerifiedOn: x.verifiedOn, listSource: x.listSource,
      directories: RECOGNITION_DIRECTORIES.filter((d) => d.professions.some((p) => x.professions.includes(p))).map((d) => ({ name: d.name, url: d.url, line: d.line })),
      claims, why: `its own site lists ${[...new Set(courses.map((c) => c.profession))].join(", ")} course pages (read ${courses[0]?.readOn ?? "?"}); ${withFacts.length} of ${countries.length} destinations have a regulator's own page for them`, source: { url: courses[0]?.url ?? x.page, title: courses[0]?.title ?? x.name }, checkedOn: courses[0]?.readOn ?? null, searchedBy: x.searched ?? [], questions: [] });
  }
  /* ── every question to the ONE page whose answer it needs ── */
  const topics = new Map(), unused = [];
  for (const g of questions) {
    const q = [g.question, ...g.also].join(" "), dest = destinationsIn(q).filter((c) => countries.includes(c)), orig = [...originsIn(q), ...countriesIn(q)].filter((c) => origins.includes(c)), prof = professionIn(q);
    const about = names(q, subject) || dest.length || g.sources?.some((x) => x.kind === "official FAQ");
    if (prof && professions.length && !professions.includes(prof)) { unused.push({ question: g.question, why: `about ${prof}, which ${subject} is not for` }); continue; }
    let page = null;
    if (UNIVERSITY.test(q)) page = university.find((p) => (p.searchedBy ?? []).some((s) => q.toLowerCase().includes(String(s).toLowerCase())));
    if (!page && TAKING.test(q) && orig.length) page = taking.find((p) => p.country === orig[0]);
    if (!page && dest.length && prof) page = requirement.find((p) => p.country === dest[0] && !p.hub && p.professions.includes(prof)) ?? null;
    if (!page && dest.length) { if (prof && !searched(g)) { unused.push({ question: g.question, why: `no regulator's own page says ${subject} is accepted for ${prof} in ${dest[0]} yet` }); continue; } page = hubs.get(dest[0]); }
    if (page) { page.questions.push({ ...g, section: prof }); continue; }
    if (!about) { unused.push({ question: g.question, why: `not about ${subject} or one of the kept countries or professions` }); continue; }
    const t = TOPICS.find(([, re]) => re.test(q));
    const key = t ? t[0] : `q:${g.question.toLowerCase()}`;
    const tp = topics.get(key) ?? { claims: t?.[0] === "fees" ? [feeClaim(null)].filter(Boolean) : [], kind: "topic", title: t ? t[2](subject) : cap(g.question.replace(/\?$/, "")), why: t ? `the questions people ask about ${t[0]} — no country or profession changes this answer` : "a question of its own", questions: [] };
    tp.questions.push(g); topics.set(key, tp);
  }
  /* a country's own page only with SEARCH evidence (owner); its other questions are answered on its profession pages or wait */
  for (const h of hubs.values()) { if (h.questions.some(searched)) requirement.push(h); else for (const g of h.questions) unused.push({ question: g.question, why: `about ${subject} in ${h.country} in general — no search evidence yet for a page of its own${h.professions.length ? "; its profession pages answer it" : ""}` }); }
  /* an origin country's own page only where people SEARCH for taking it there (owner); the others are sections of one page */
  const own = taking.filter((p) => p.questions.some(searched)), lone = taking.filter((p) => !own.includes(p));
  const where = lone.length ? [{ kind: "taking", title: `Where to take ${subject}: venues, dates and fees by country`, countries: lone.map((p) => p.country), fees: lone.map((p) => `${p.country}: ${p.fee ?? "no fee read"}`), claims: [feeClaim(null)].filter(Boolean), why: `${lone.length} countr${lone.length === 1 ? "y" : "ies"} where ${subject}'s own pages name a venue — no search asks about taking it in one of them yet, so one page with a section per country`, source: lone[0].source, checkedOn: lone[0].checkedOn, questions: lone.flatMap((p) => p.questions) }] : [];
  taking.splice(0, taking.length, ...own, ...where);
  const topic = [...topics.values()];
  for (const p of university) for (const s of p.searchedBy ?? []) if (!p.questions.some((g) => g.question === s)) p.questions.push({ question: s, also: [], sources: [{ kind: "search", source: "your Search Console" }], weight: 10 });
  const pages = [...requirement, ...university, ...taking, ...topic];
  const mainOf = (p, g) => (p.hub ? !g.section : !g.section || (p.professions ?? []).includes(g.section));
  for (const p of pages) { p.questions ??= []; p.weak = p.questions.length === 0; p.searched = p.questions.some(searched); p.main = p.questions.find((g) => mainOf(p, g))?.question ?? null; }
  const kinds = { requirement, university, taking, topic };
  const count = (xs) => ({ total: xs.length, withQuestions: xs.filter((p) => !p.weak).length, opportunity: xs.filter((p) => p.weak).length, searched: xs.filter((p) => p.searched).length });
  const funnels = funnelsOf({ r, formula, countries, professions, requirement, gaps, taking: { own, lone, all: kept("origins") }, university, uniDropped, factsFor, subject });
  return { kinds, counts: Object.fromEntries(Object.entries(kinds).map(([k, xs]) => [k, count(xs)])), total: pages.length, unused, gaps, questionsTotal: questions.length, funnels, perPart: formula ? (formula.parts ?? []).map((p) => ({ part: p.text, kind: p.kind, funnel: { profession: "professions", university: "universities", questions: "questions", roles: "professions" }[p.kind] ?? null })) : [], rollout: rolloutOf(pages), whyNotMore: whyNotMore(r, funnels, subject, formula), demandNote };
}

/* ── RR-320 · the first batch: 50–100 pages, the ones people search for first; the next only once Google shows them ── */
export const BATCH = Object.freeze({ min: 50, max: 100 });
export function rolloutOf(pages) {
  const score = (p) => (p.searched ? 1000 : 0) + (p.questions?.length ?? 0) * 10 + ({ requirement: 5, university: 3, taking: 2, topic: 1 }[p.kind] ?? 0) + (p.namesSubject ? 2 : 0) + (p.destinations?.filter((d) => d.facts.length).length ?? 0);
  const order = [...pages].sort((a, b) => score(b) - score(a));
  const first = order.slice(0, BATCH.max);
  return { first: first.map((p) => p.title), size: first.length, later: order.length - first.length, byKind: Object.fromEntries(["requirement", "university", "taking", "topic"].map((k) => [k, first.filter((p) => p.kind === k).length])),
    line: `${order.length <= BATCH.max ? `All ${order.length} pages` : `The first ${first.length} of ${order.length} pages`} in the first batch${order.length < BATCH.min ? ` (fewer than ${BATCH.min} — every page that is real now)` : ""}. The next batch is made only when your Search Console shows Google is showing these pages (their impressions) — Visibility checks it each week.` };
}

const fmtN = (n) => (n === null || n === undefined ? "—" : fmt(n));
/** one table per dimension (owner, RR-320 C): every combination → real pages → why, with the real number at every step */
function funnelsOf({ r, formula, countries, professions, requirement, gaps, taking, university, uniDropped, factsFor, subject }) {
  const D = r.dims, nums = formula?.parts?.flatMap((p) => p.dims) ?? [], has = (dim, role) => nums.find((d) => d.dim === dim && (!role || d.role === role))?.n;
  const out = {};
  if (D.countries || D.roles) {
    const o = has("countries", "origin") ?? D.origins?.candidates ?? 197, pr = has("roles") ?? D.roles?.candidates ?? professions.length, de = has("countries", "destination") ?? D.countries?.candidates ?? countries.length;
    const by = (k) => gaps.filter((g) => g.reason === k).length;
    const pairs = (xs) => xs.filter((p) => !p.hub).reduce((n, p) => n + p.professions.length, 0), merged = requirement.reduce((n, p) => n + (p.merged ?? 0), 0);
    const per = countries.map((c) => `${c} ${pairs(requirement.filter((p) => p.country === c))}`).join(", ");
    out.professions = { title: `Professions — who needs ${subject}, for which job, where`, rows: [
      { step: "Every combination of your numbers", n: o * pr * de, why: `${fmt(o)} countries people come from × ${fmt(pr)} professions × ${fmt(de)} destination countries — what multiplying gives` },
      { step: `Destination countries where ${subject}'s own site says it is recognised`, n: countries.length, why: `of ${fmt(D.countries?.candidates ?? 0)} checked on ${subject}'s own pages` },
      { step: `Professions ${subject} has a test for (its own site)`, n: professions.length, why: `of ${fmt(D.roles?.candidates ?? 0)} in your list` },
      { step: "Destination × profession", n: countries.length * professions.length, why: "the country a person comes FROM does not change what a destination's regulator asks (the sameness rule), so it never multiplies these" },
      { step: `…where that country's regulator accepts ${subject} for that profession (its own page, read)`, n: pairs(requirement), why: per || "none" },
      { step: "…sharing one regulator and one rule with another profession — a section of that one page", n: merged, why: "the same answer is never two pages (the sameness rule)" },
      { step: "Not a page: no regulator's own page found to read", n: by("no page"), why: "no official page yet — never a guess" },
      { step: "Not a page: official pages checked, they do not say it", n: by("not said") + by("read"), why: `${by("read")} where the regulator's page names ${subject} but not that profession` },
      { step: "Not a page: the regulator's robots.txt refused the reading", n: by("robots"), why: "robots are always obeyed" },
      { step: "Country pages people search for in general", n: requirement.filter((p) => p.hub).length, why: "only where your Search Console shows the search" },
      { step: "Real pages", n: requirement.length, why: "one page per different answer" }] };
  }
  if (D.origins) {
    const local = taking.all.filter((k) => localFee(r.fee, k.name, r.rates)?.currency && localFee(r.fee, k.name, r.rates).currency !== r.fee?.currency).length;
    out.origins = { title: "Origin countries — where people sit it", rows: [
      { step: "Countries people come from", n: D.origins.candidates, why: "every international product starts from all 197" },
      { step: `…where ${subject}'s own site names a venue`, n: taking.all.length, why: `${fmt(D.origins.candidates - taking.all.length)} have no venue page — the answer there is no different` },
      { step: "…where the fee differs in the local currency (ECB rate)", n: local, why: r.fee?.ok ? `${r.fee.currency} ${r.fee.amount} everywhere on ${subject}'s own page; only the currency changes` : "no fee was read" },
      { step: "…with their own council's verification step", n: null, why: "not measured: no official page about a home council's step was read" },
      { step: "…and people search for taking it there (your Search Console)", n: taking.own.length, why: "search evidence is required for a page of its own" },
      { step: "Real pages", n: taking.own.length + (taking.lone.length ? 1 : 0), why: `${taking.own.length} of their own${taking.lone.length ? ` + 1 page with a section for each of the other ${taking.lone.length}` : ""}` }] };
  }
  if (D.universities) {
    const U = D.universities, de = has("countries", "destination") ?? countries.length, un = has("universities") ?? U.candidates;
    const possible = (U.pool ?? []).filter((x) => factsFor(x.professions ?? []).some((d) => d.facts.length)).length;
    out.universities = { title: "Universities — what each one's graduates need", rows: [
      { step: "Every combination of your numbers", n: un * de, why: `${fmt(un)} universities × ${fmt(de)} destination countries — one page per university per country is what multiplying gives` },
      { step: "Universities in your list", n: U.candidates, why: U.from === "your list" ? "the list you gave (AlmiWorld's: AlmiStudy's full data)" : "" },
      { step: "…that teach healthcare (the list's own subjects)", n: U.health ?? null, why: `${fmt(U.specific ?? 0)} name a profession (nursing, pharmacy …); the others say only "medicine & health sciences"` },
      { step: "…whose professions have a destination fact (a regulator's own page)", n: possible, why: "these can each have ONE page, the destinations inside it — never one per country" },
      { step: "Own site read in this run", n: (U.read ?? []).length, why: `${fmt(U.blocked?.robots ?? 0)} refused by robots.txt · ${fmt(U.blocked?.unreadable ?? 0)} could not be read · ${fmt((U.notRead ?? []).length)} not read yet (a few each run, slowly)` },
      { step: "…a health course page found on its own site", n: (U.kept ?? []).length, why: `${fmt(U.namesSubject ?? 0)} of them name ${subject} on their own pages` },
      { step: "Search evidence (your Search Console names it)", n: U.searched ?? 0, why: "read first; a university page without searches is an opportunity page" },
      { step: "Real pages now", n: university.length, why: `${uniDropped.length ? `${uniDropped.length} read with a course page but no destination fact yet · ` : ""}one page per university with its own facts; ${fmt(possible)} possible as the rest are read` }] };
  }
  return out;
}

/** "why not more": the client's numbers multiplied, against what is real and distinct */
function whyNotMore(r, funnels, subject, formula) {
  const naive = Object.values(funnels).map((f) => f.rows[0]?.step === "Every combination of your numbers" ? f.rows[0].n : 0).filter((n) => n > 0);
  const product = naive.reduce((a, b) => a + b, 0);
  const lines = [];
  if (funnels.professions) lines.push(`Professions: ${fmt(funnels.professions.rows[0].n)} combinations → ${funnels.professions.rows.at(-1).n} pages — a page only where a regulator's own page accepts ${subject} for that profession.`);
  if (funnels.origins) lines.push(`Origin countries: ${fmt(funnels.origins.rows[0].n)} → ${funnels.origins.rows.at(-1).n} — a country's own page only where the answer differs AND people search for it.`);
  if (funnels.universities) lines.push(`Universities: ${fmt(funnels.universities.rows[0].n)} combinations → ${funnels.universities.rows.at(-1).n} pages now — one per university, its destinations inside it.`);
  lines.push("Never multiplying every dimension: a page exists only where its answer is really different.");
  return { product, factors: naive, line: product > 1 ? `Not ${fmt(product)} pages (${naive.map(fmt).join(" + ")}): pages that differ only by a name are near-identical, and Google calls that scaled content abuse.` : null, lines };
}
