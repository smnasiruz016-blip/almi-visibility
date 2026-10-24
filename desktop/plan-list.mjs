/**
 * 🔴 RR-321 B · THE PAGE COUNT FROM THE SUBJECT'S OWN LIST — fast, and ONE SOURCE OF TRUTH (owner, 23 Oct 2026):
 *   · counting reads no regulator's or university's site (that is done while pages are BUILT): the lists (197 countries, the subject's 12
 *     professions, AlmiStudy's universities), the subject's own "who recognises it" list, its venue pages and its statistics;
 *   · one table per page type, the total at the top, every number clickable to its list (kept, left out, why):
 *       REGULATOR   countries where a regulator accepts it × the 12 professions → pairs a regulator accepts → ONE page per regulator rule;
 *       UNIVERSITY  the list → teach healthcare → name a profession → a profession some regulator accepts → pages with a DIFFERENT answer
 *                   (country + professions: universities that share one answer are sections of one page — never near-identical pages);
 *       TAKING      ONE "Where to take it" page, a section per country where it can be taken (and per country people ask about);
 *       TOPIC       only real questions about the subject; same-meaning questions make one page; a page only with a sourced answer;
 *   · ORIGIN COUNTRIES NEVER GET PAGES OF THEIR OWN (E1): what is true of a home country goes inside the university pages and "Where to take";
 *   · THE LEDGER (`numbers`) is the one place every number lives: the five answers, the tables, "why not more", the plan and the total all
 *     read it (test/rr321: any two that differ fail).
 * Pure: everything is handed in.
 */
import { destinationsIn, originsIn, countriesIn, neighboursOf, REGIONS_SOURCE } from "./world.mjs";
import { regulatorPagesOf, PEOPLE_WORD, inCountry, gradeLine, countLine, callNames } from "./recognition.mjs";
import { teachesHealth, professionsOfFields } from "./universities.mjs";
import { feeInCurrency } from "./rates.mjs";
import { professionIn, TAKING, UNIVERSITY, TOPICS, searched } from "./page-plan.mjs";
import { questionCount } from "./questions.mjs";

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (s, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(s ?? ""));
const fieldsOf = (u) => u.fields ?? u.subjects ?? [];
const shortOf = (n) => /\(([A-Z][A-Za-z-]{1,9})(?:\s*\/[^)]*)?\)/.exec(n)?.[1] ?? null;
const plainName = (n) => String(n).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
export const BATCH = Object.freeze({ min: 50, max: 100 });

/** a university page's title: its own name for one; "graduates of X and N more universities in C" for a group (≤ 70 characters) */
export function universityTitle(subject, us, country) {
  if (us.length === 1) { const t = `${subject} for ${plainName(us[0].name)} graduates`; return t.length <= 60 || !shortOf(us[0].name) ? t : `${subject} for ${shortOf(us[0].name)} graduates`; }
  const first = shortOf(us[0].name) ?? plainName(us[0].name), more = us.length - 1;
  const tries = [`${subject} for graduates of ${first} and ${more} more universities in ${inCountry(country)}`, `${subject} for graduates of ${us.length} universities in ${inCountry(country)}`];
  return tries.find((t) => t.length <= 70) ?? tries.at(-1);
}

/**
 * THE PLAN. `rec` = recognitionOf(list); `professions` = the subject's 12; `universities` = the list's items; `venues` = venueCountries();
 * `fee` = the subject's fee (its own page); `rates` = readRates(); `stats` = statisticsOf(); `groups` = the grouped questions ABOUT the
 * subject; `sorted` = sortQuestions() (for the question count); `byCountry` = Search Console rows { query, country, impressions };
 * `reads` = the regulator pages read while building (by list id) — they add facts, never pages.
 */
export function planFromList({ subject, rec, professions, universities = [], venues = { countries: [], home: null }, fee = null, rates = null, stats = null, groups = [], sorted = null, byCountry = [], reads = {}, on = null, councils = null }) {
  /* B3 · a home country's council and its official verification page (AlmiOET's records — nursing), as a "check here" fact */
  const councilOf = (country, profs = ["nursing"]) => { const c = (councils?.items ?? []).find((x) => x.country === country && profs.includes(x.profession)); return c ? { ...c, claim: { claimId: `council-${country.toLowerCase().replace(/[^a-z]+/g, "-")}`, text: `To verify a ${c.profession} registration from ${country}, the home council is the ${c.council}: check here — its own verification page.`, link: c.verificationUrl ?? c.councilUrl, readOn: councils.on, source: `AlmiOET's record of the ${c.council}`, official: true, body: c.council } } : null; };
  /* ── REGULATOR: one page per regulator rule ── */
  const R = regulatorPagesOf(rec, { subject, professions });
  const regulator = R.pages.map((p) => ({ ...p, claims: [...p.claims, ...(reads[p.listId]?.claims ?? [])], read: reads[p.listId] ? { ok: reads[p.listId].ok, why: reads[p.listId].why ?? null, on: reads[p.listId].on, url: reads[p.listId].url } : null }));
  const accepts = new Map(); for (const x of R.pairs) accepts.set(`${x.country}|${x.profession}`, x.bodies);
  const reqCountries = rec.requirement.map((c) => c.country);
  /* ── TAKING: ONE page, a section per country where it can be taken ── */
  const vset = new Map(venues.countries.map((v) => [v.name, v]));
  const feeClaim = fee?.ok && fee.source?.url ? { claimId: "fee-own-page", text: `${subject}'s own page states the test fee: ${fee.said ?? `${fee.currency} ${fee.amount}`}.`, link: fee.source.url, readOn: fee.checkedOn, source: `${subject} — its own page`, official: true, body: subject } : null;
  const section = (c, asked = false) => { const v = vset.get(c), f = feeInCurrency(fee, c, rates);
    const council = councilOf(c);
    return v ? { country: c, venue: true, source: v.source, checkedOn: v.checkedOn, fee: f.line, steps: f.steps ?? [], refused: f.refused ?? null, council }
      : { country: c, venue: false, asked, fee: f.line, steps: f.steps ?? [], council, nearest: neighboursOf(c).filter((n) => vset.has(n)), says: `${subject}'s own pages name no venue in ${c} (checked ${venues.checked?.[0]?.on ?? on ?? ""})${venues.home ? "; taking it at home may be offered there — " + venues.home.says : ""}` }; };
  const where = { kind: "taking", title: `Where to take ${subject}: venues, test fees and taking it at home`, sections: [...vset.keys()].map((c) => section(c)), home: venues.home,
    claims: [feeClaim, ...[...vset.values()].slice(0, 3).map((v) => ({ claimId: `venue-${v.name.toLowerCase().replace(/[^a-z]+/g, "-")}`, text: `${subject}'s own page names a venue in ${v.name}.`, link: v.source.url, readOn: v.checkedOn, source: `${subject} — its own page`, official: true, body: subject })),
      ...(venues.home ? [{ claimId: "at-home", text: `${venues.home.says}.`, link: venues.home.url, readOn: venues.home.checkedOn, source: `${subject} — its own page`, official: true, body: subject }] : [])].filter(Boolean),
    why: `one page, a section for each of the ${vset.size} countries where ${subject}'s own pages name a venue — the country a person takes it in never gets a page of its own`, questions: [] };
  /* ── UNIVERSITY: from AlmiStudy's data only — never a slow read while counting ── */
  const health = universities.filter(teachesHealth), named = health.map((u) => ({ u, professions: professionsOfFields(fieldsOf(u)) })).filter((x) => x.professions.length);
  const destFor = (profs) => reqCountries.map((c) => ({ country: c, regulators: regulator.filter((p) => p.country === c && p.professions.some((q) => profs.includes(q))) })).filter((d) => d.regulators.length);
  const withFacts = named.filter((x) => destFor(x.professions).length), noFacts = named.filter((x) => !destFor(x.professions).length);
  const answers = new Map(); for (const x of withFacts) { const k = `${x.u.country}|${[...x.professions].sort().join(",")}`; answers.set(k, [...(answers.get(k) ?? []), x]); }
  const university = [...answers.entries()].map(([k, xs]) => {
    const [country] = k.split("|"), profs = xs[0].professions, dest = destFor(profs), home = section(country);
    return { kind: "university", title: universityTitle(subject, xs.map((x) => x.u), country), country, professions: profs, universities: xs.map((x) => ({ name: x.u.name, city: x.u.city ?? null, page: x.u.page ?? null, accreditation: x.u.accreditation?.body ?? null, verifiedOn: x.u.verifiedOn ?? null })),
      destinations: dest.map((d) => ({ country: d.country, regulators: d.regulators.map((p) => ({ title: p.title, body: p.body, grade: gradeLine(p.grade), professions: p.professions.filter((q) => profs.includes(q)) })) })), home,
      links: dest.flatMap((d) => d.regulators.slice(0, 2).map((p) => p.title)),
      claims: [{ claimId: `uni-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`, text: `${xs.length === 1 ? plainName(xs[0].u.name) : `${xs.length} universities in ${country}`} teach${xs.length === 1 ? "es" : ""} ${profs.join(", ")} (AlmiStudy's data, checked ${xs[0].u.verifiedOn ?? "?"}).`, link: xs[0].u.source?.url ?? xs[0].u.page, readOn: xs[0].u.verifiedOn, source: "AlmiStudy's data", official: false, body: "AlmiStudy" },
        ...dest.slice(0, 2).map((d) => d.regulators[0].claims[0]).filter(Boolean), councilOf(country, profs)?.claim].filter((c) => c?.link && c.readOn),
      why: `${xs.length === 1 ? "its" : "their"} graduates' answer: ${profs.join(", ")} from ${country} — ${dest.length} destination${dest.length === 1 ? "" : "s"} where a regulator accepts ${subject} for ${profs.length === 1 ? "it" : "them"}${xs.length > 1 ? `; the ${xs.length} universities share this one answer, so they are sections of one page` : ""}`, questions: [] };
  });
  /* ── every question to the ONE page whose answer it needs ── */
  const topics = new Map(), unused = [];
  for (const g of groups) {
    const q = [g.question, ...(g.also ?? [])].join(" "), dest = destinationsIn(q).filter((c) => reqCountries.includes(c)), orig = [...new Set([...originsIn(q), ...countriesIn(q)])].filter((c) => !reqCountries.includes(c) || TAKING.test(q)), prof = professionIn(q);
    let page = null, sec = null;
    /* a question naming a regulator ("oet score for nmbi") is that regulator's page */
    page = regulator.find((p) => callNames({ short: p.short, name: p.body }).some((n) => names(q, n))) ?? null;
    if (!page && UNIVERSITY.test(q)) page = university.find((p) => p.universities.some((u) => names(q, plainName(u.name)) || (shortOf(u.name) && names(q, shortOf(u.name))))) ?? null;
    /* taking it in a country (D7: "OET exam in Bangladesh"): a section of "Where to take", never a page of its own */
    if (!page && (TAKING.test(q) || (orig.length && !dest.length && !prof))) { const c = orig[0] ?? null; page = where; if (c) { sec = c; if (!vset.has(c) && !where.sections.some((s) => s.country === c)) where.sections.push(section(c, true)); } }
    if (!page && dest.length) { const cands = regulator.filter((p) => p.country === dest[0] && (!prof || p.professions.includes(prof))); page = cands.sort((a, b) => b.professions.length - a.professions.length)[0] ?? null; if (!page && prof) { unused.push({ name: g.question, why: `no regulator in ${subject}'s list accepts it for ${prof} in ${dest[0]}` }); continue; } }
    if (page) { page.questions.push({ ...g, section: sec ?? prof }); g.page = page.title; continue; }
    const t = TOPICS.find(([, re]) => re.test(q)), key = t ? t[0] : `q:${g.question.toLowerCase()}`;
    const tp = topics.get(key) ?? { kind: "topic", title: t ? t[2](subject) : cap(g.question.replace(/\?$/, "")), claims: [], why: t ? `the questions about ${t[0]} — no country or profession changes this answer` : "a question of its own", questions: [] };
    for (const s of g.sources ?? []) if (s.kind === "official FAQ" && s.link && s.on && !tp.claims.some((c) => c.link === s.link)) tp.claims.push({ claimId: `faq-${tp.claims.length}-${key.replace(/[^a-z]+/g, "-").slice(0, 30)}`, text: `${subject}'s own FAQ answers this question.`, link: s.link, readOn: s.on, source: s.source, official: true, body: subject });
    if (t?.[0] === "fees" && feeClaim && !tp.claims.includes(feeClaim)) tp.claims.unshift(feeClaim);
    tp.questions.push(g); g.page = tp.title; topics.set(key, tp);
  }
  const topicAll = [...topics.values()], topic = topicAll.filter((p) => p.claims.length), topicNoSource = topicAll.filter((p) => !p.claims.length);
  for (const p of topicNoSource) for (const g of p.questions) g.page = null;
  /* D5 · each central bank's rate the page shows is a fact of its own: its source, its link, its date (after the asked-about sections join) */
  const rateClaims = new Map(); for (const s of where.sections) for (const st of s.steps) if (!rateClaims.has(`${st.short}|${st.to}`)) rateClaims.set(`${st.short}|${st.to}`, { claimId: `rate-${st.short.toLowerCase()}-${st.to.toLowerCase()}`, text: `${st.source}: 1 ${st.from} = ${st.said} ${st.to} on ${st.rateDate} (the fee in ${st.to} is an estimate from it, not an official price).`, link: st.link, readOn: st.rateDate, source: st.source, official: true, body: st.short });
  where.claims.push(...rateClaims.values(), ...where.sections.map((s) => s.council?.claim).filter(Boolean));
  /* E3 · internal links: a regulator page links "Where to take" and the topic pages; a university page its regulator pages */
  for (const p of regulator) p.links = [where.title, ...topic.slice(0, 6).map((t) => t.title)];
  where.links = topic.slice(0, 6).map((t) => t.title);
  const pages = [...regulator, ...university, where, ...topic];
  /* E4 · each page shows when its sources were last checked (its OLDEST fact's date) */
  for (const p of pages) { p.questions ??= []; p.weak = p.questions.length === 0; p.searched = p.questions.some(searched); p.main = p.questions[0]?.question ?? null; p.lastChecked = (p.claims ?? []).map((c) => c.readOn).filter(Boolean).sort()[0] ?? null; }

  /* ── THE LEDGER: the one place every number lives ── */
  const n = {
    countries: 197, accepted: rec.accepted.length, requirement: reqCountries.length, professions: professions.length, combos: R.combos, pairs: R.pairs.length, regulatorPages: regulator.length,
    regulatorRead: regulator.filter((p) => p.read?.ok).length, regulatorNotRead: regulator.filter((p) => p.read && !p.read.ok).length,
    uniAll: universities.length, uniHealth: health.length, uniNamed: named.length, uniWithFacts: withFacts.length, uniPages: university.length,
    venueCountries: vset.size, askedNoVenue: where.sections.filter((s) => !s.venue).length, takingPages: 1,
    topicGroups: topicAll.length, topicPages: topic.length,
  };
  n.total = n.regulatorPages + n.uniPages + n.takingPages + n.topicPages;
  const qc = sorted ? questionCount({ sorted, groups, pages, subject }) : null;
  if (qc) Object.assign(n, { questionsFound: qc.found, questionsKept: qc.kept, questionGroups: qc.groups, questionOwnPage: qc.ownPage, questionInside: qc.inside, questionsNotAbout: qc.notAbout, menuLines: qc.menu });
  const tables = tablesOf({ n, subject, rec, R, regulator, universities, health, named, withFacts, noFacts, university, where, vset, venues, topicAll, topic, topicNoSource });
  const kinds = { regulator, university, taking: [where], topic };
  return { list: true, kinds, numbers: n, tables, total: n.total, questionCount: qc, unused, rollout: rolloutOf(pages, byCountry), whyNotMore: whyNotMoreOf(n, subject), stats, venuesHome: venues.home,
    counts: Object.fromEntries(Object.entries(kinds).map(([k, xs]) => [k, { total: xs.length, withQuestions: xs.filter((p) => !p.weak).length, opportunity: xs.filter((p) => p.weak).length, searched: xs.filter((p) => p.searched).length }])), countLine: countLine(rec, subject) };
}

/** B4 + B6 · one table per page type, from the ledger; every row's list: what was kept, what was left out, and why */
function tablesOf({ n, subject, rec, R, regulator, universities, health, named, withFacts, noFacts, university, where, vset, venues, topicAll, topic, topicNoSource }) {
  const row = (step, num, why, kept = [], left = []) => ({ step, n: num, why, kept, left });
  return {
    regulator: { title: "Regulator pages", rows: [
      row(`Countries where ${subject} is accepted (a named body in ${subject}'s own list)`, n.accepted, `of the ${n.countries} countries — ${subject}'s own list, AlmiOET's copy read ${rec.on}`, rec.accepted.map((c) => ({ name: c.country, why: `${c.bodies} named: ${c.kinds}` })), rec.leftOut.map((x) => ({ name: x.name, why: x.why }))),
      row("…where a health regulator accepts it (a registration rule)", n.requirement, "an employer or a school accepting it is not a registration rule", rec.requirement.map((c) => ({ name: c.country, why: `${c.regulators} regulator${c.regulators === 1 ? "" : "s"}` })), rec.notRequirement),
      row(`${n.requirement} countries × ${n.professions} professions`, n.combos, "every combination — what multiplying gives", [], []),
      row(`…where a regulator accepts ${subject} for that profession`, n.pairs, `${subject}'s own list names the regulator and the profession`, R.pairs.map((x) => ({ name: `${x.profession} in ${x.country}`, why: x.bodies.join(", ") })), R.notAccepted),
      row("One page per regulator rule (its professions are sections of its one page)", n.regulatorPages, `${n.regulatorRead} regulator pages read so far while building, ${n.regulatorNotRead} could not be read (built from ${subject}'s list with "check here")`, regulator.map((p) => ({ name: p.title, why: p.why })), R.noProfession)] },
    university: { title: "University pages", rows: [
      row("Universities in the list", n.uniAll, "AlmiStudy's full data (read-only)", [], []),
      row("…that teach healthcare", n.uniHealth, "the list's own subjects", [], universities.filter((u) => !teachesHealth(u)).slice(0, 300).map((u) => ({ name: u.name, why: "teaches no healthcare subject in the list" }))),
      row("…that name a profession (nursing, pharmacy …)", n.uniNamed, `${fmt(n.uniHealth - n.uniNamed)} say only "medicine & health sciences" — no profession, so no regulator fact`, [], health.filter((u) => !professionsOfFields(fieldsOf(u)).length).slice(0, 300).map((u) => ({ name: u.name, why: "the list names no profession for it" }))),
      row(`…whose professions a regulator accepts ${subject} for`, n.uniWithFacts, "these graduates have a destination answer", [], noFacts.slice(0, 300).map((x) => ({ name: x.u.name, why: `no regulator in ${subject}'s list accepts it for ${x.professions.join(", ")}` }))),
      row("Pages with a different answer (country + professions)", n.uniPages, "universities with the same country and professions share one answer — sections of one page, never near-identical pages", university.map((p) => ({ name: p.title, why: `${p.universities.length} universit${p.universities.length === 1 ? "y" : "ies"} · ${p.professions.join(", ")}` })), [])] },
    taking: { title: `Where to take ${subject}`, rows: [
      row(`Countries where ${subject} can be taken (a venue on ${subject}'s own pages)`, n.venueCountries, `${subject}'s own venue pages, read ${venues.checked?.[0]?.on ?? ""}${venues.home ? `; ${venues.home.says}` : ""}`, [...vset.values()].map((v) => ({ name: v.name, why: v.source?.url ?? "" })), []),
      row("…and countries people ask about with no venue named", n.askedNoVenue, `said so, with the nearest venues (${REGIONS_SOURCE})`, where.sections.filter((s) => !s.venue).map((s) => ({ name: s.country, why: s.nearest.length ? `nearest: ${s.nearest.join(", ")}` : "no venue in its region either" })), []),
      row("Pages", 1, "ONE page, a section per country — no country gets a page of its own", [{ name: where.title, why: where.why }], [])] },
    topic: { title: "Topic pages", rows: [
      row(`Groups of real ${subject} questions no other page answers`, n.topicGroups, "same-meaning questions make one group", topicAll.map((p) => ({ name: p.title, why: `${p.questions.length} question group${p.questions.length === 1 ? "" : "s"}` })), []),
      row("Pages (a sourced answer)", n.topicPages, "a topic without an answer on an official page waits", topic.map((p) => ({ name: p.title, why: p.why })), topicNoSource.map((p) => ({ name: p.title, why: "no official page answers it yet" })))] },
  };
}

/* E2 · the first batch: the pages answering the most-searched questions first — searched from the most countries, then the most seen */
export function rolloutOf(pages, byCountry = []) {
  const reach = new Map(); for (const r of byCountry) { const k = String(r.query ?? "").toLowerCase(); const x = reach.get(k) ?? { countries: new Set(), impressions: 0 }; x.countries.add(r.country); x.impressions += r.impressions ?? 0; reach.set(k, x); }
  const of = (p) => { const qs = p.questions.flatMap((g) => [g.question, ...(g.also ?? [])]).map((q) => reach.get(String(q).toLowerCase())).filter(Boolean); return { countries: new Set(qs.flatMap((x) => [...x.countries])).size, impressions: qs.reduce((s, x) => s + x.impressions, 0) }; };
  const score = (p) => { const r = of(p); p.reach = r; return r.countries * 1e6 + r.impressions * 10 + (p.searched ? 5000 : 0) + p.questions.length * 50 + ({ regulator: 4, taking: 3, university: 2, topic: 1 }[p.kind] ?? 0); };
  const order = [...pages].map((p) => [p, score(p)]).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  const first = order.slice(0, BATCH.max);
  return { first: first.map((p) => p.title), firstWhy: first.slice(0, 15).map((p) => ({ title: p.title, why: p.reach.countries ? `searched from ${p.reach.countries} countr${p.reach.countries === 1 ? "y" : "ies"} (${fmt(p.reach.impressions)} times seen)` : p.questions.length ? `${p.questions.length} question${p.questions.length === 1 ? "" : "s"} people ask` : "no search yet" })), size: first.length, later: order.length - first.length,
    byKind: Object.fromEntries(["regulator", "university", "taking", "topic"].map((k) => [k, first.filter((p) => p.kind === k).length])),
    line: `The first ${first.length} of ${order.length} pages${order.length < BATCH.min ? ` (fewer than ${BATCH.min}: every page that is real now)` : ""} — the ones answering the most-searched questions first. The next batch only when your Search Console shows Google showing these.` };
}

/** "why not more", from the ledger */
export function whyNotMoreOf(n, subject) {
  const naive = n.countries * n.professions + n.uniAll * n.requirement;
  return { product: naive, lines: [
    `Regulators: ${fmt(n.combos)} country × profession combinations → ${fmt(n.pairs)} where a regulator accepts ${subject} → ${fmt(n.regulatorPages)} pages, one per regulator rule.`,
    `Universities: ${fmt(n.uniAll)} → ${fmt(n.uniHealth)} teach healthcare → ${fmt(n.uniNamed)} name a profession → ${fmt(n.uniWithFacts)} with a regulator fact → ${fmt(n.uniPages)} different answers.`,
    `Where to take ${subject}: ${fmt(n.venueCountries)} countries with a venue → 1 page, a section each.`,
    `Topics: ${fmt(n.topicGroups)} groups → ${fmt(n.topicPages)} with a sourced answer.`,
    "A page exists only where its answer is really different — never one per name."],
    line: `Not ${fmt(naive)} pages (${fmt(n.countries)} countries × ${fmt(n.professions)} professions + ${fmt(n.uniAll)} universities × ${fmt(n.requirement)} countries): pages that differ only by a name are near-identical, and Google calls that scaled content abuse.` };
}

/** E5 · the material of a regulator page's preview: its facts in order, each with its source and date (the page itself is built from these) */
export const regulatorSections = (p, subject) => [
  { h: "The score for each sub-test", lines: (p.claims ?? []).filter((c) => /Listening|grade|score/i.test(c.text)) },
  { h: "How long a result stays valid", lines: (p.claims ?? []).filter((c) => c.fact === "validity") },
  { h: "Combining results from two sittings", lines: (p.claims ?? []).filter((c) => c.fact === "combining") },
  { h: "The registration steps", lines: (p.claims ?? []).filter((c) => c.fact === "steps") },
  { h: "The official link", lines: (p.claims ?? []).filter((c) => c.fact === "link") },
].map((s) => ({ ...s, lines: s.lines.length ? s.lines : [{ text: `${p.body}'s own page${p.read?.on ? `, checked ${p.read.on},` : ""} ${p.read?.ok ? "does not say this" : "was not read yet"} — check here: ${p.record?.officialUrl ?? p.website ?? ""}`, link: p.record?.officialUrl ?? p.website, readOn: p.read?.on ?? null, missing: true }] }));
export { PEOPLE_WORD };
