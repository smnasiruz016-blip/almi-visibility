/**
 * 🔴 RR-327 → RR-328 · THE LOCAL PAGE FAMILIES (owner, 26 Oct 2026, final — RR-328 replaces the "8 own data points" gate for these pages):
 *   COUNTRY             "OET in Pakistan" — made only when ALL FIVE PARTS are filled from real data (desktop/country-facts.mjs): 1 the fee in
 *                       the country's own currency, 2 the questions people there ask with their answers, 3 its test centres (or the nearest
 *                       and taking it at home), 4 the council for each profession (name, website, address), 5 a rule of its own. A country
 *                       partly filled is never padded: it is STOPPED, with the parts it misses (the owner's count table, /owner's grid).
 *                       A destination country (a regulator there asks for the subject) has its hub already — never a second page.
 *   COUNTRY × PROFESSION "OET for nurses from Pakistan" — made when that profession's OWN council in that country is found (AlmiWorld's
 *                       country facts, or AlmiOET's records) AND that profession's searches come from that country.
 *   CITY                no pages (owner, RR-328): a city is mentioned inside its country page.
 *   THE GRADE TABLE     only the destinations people from that country search for most (their own keyword data), and a link to the full
 *                       table — so the pages of one profession are less alike.
 * Hard facts only with a source and its date; nothing is guessed. Pure: everything is handed in.
 */
import { PEOPLE_WORD, gradeLine } from "./recognition.mjs";
import { CURRENCY_OF, localShown } from "./rates.mjs";
import { namesOf } from "./world.mjs";
import { PARTS, PART_NAMES, councilWhole } from "./country-facts.mjs";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(text ?? ""));
/* the words a profession is searched by (a keyword about nurses from Pakistan: "oet for nurses in pakistan", "pnmc oet") */
export const PROFESSION_WORDS = Object.freeze({ nursing: ["nurse", "nurses", "nursing", "midwife", "midwives", "midwifery"], medicine: ["doctor", "doctors", "medicine", "medical", "physician", "physicians", "mbbs"], pharmacy: ["pharmacist", "pharmacists", "pharmacy"], dentistry: ["dentist", "dentists", "dental", "dentistry"],
  physiotherapy: ["physiotherapist", "physiotherapists", "physiotherapy", "physio"], "occupational therapy": ["occupational therapist", "occupational therapists", "occupational therapy"], radiography: ["radiographer", "radiographers", "radiography"], dietetics: ["dietitian", "dietitians", "dietetics", "dietician"],
  optometry: ["optometrist", "optometrists", "optometry"], podiatry: ["podiatrist", "podiatrists", "podiatry"], "speech pathology": ["speech pathologist", "speech pathologists", "speech pathology", "speech therapist"], "veterinary science": ["vet", "vets", "veterinary", "veterinarian", "veterinarians"] });
const shortName = (name) => /\(([A-Z]{2,6})\)/.exec(name ?? "")?.[1] ?? name;
const tool = (k, country) => ({ question: k.text, also: [], sources: [{ kind: "tool", volume: { estimate: k.said ?? 0 }, label: `Google Ads Keyword Planner (AlmiWorld keyword service, ${country})` }], weight: k.said ?? 0, local: country });
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
/* a country fact (AlmiWorld's country facts, site/cf-store.mjs) as a page claim: its source page and the day it was read */
const cfClaim = (f, text, fact) => (f?.source && f?.readOn ? { claimId: `cf-${slug(f.key)}`, fact, text, link: f.source, readOn: f.readOn, source: `${f.sourceTitle || hostOf(f.source)} — its own page (AlmiWorld's country facts)`, official: true, body: f.sourceTitle || hostOf(f.source) } : null);

/**
 * → { country: [page], countryprof: [page], city: [], hubPage, sectionsOut: [{ name, why }], stopped: { country: [{ country, missing, why }],
 *     countryprof: [{ country, profession, missing }] }, universe: { country, countryprof, city, destinations } }
 * countries     the world's countries (world.mjs COUNTRIES) — every one is a candidate; a destination is its hub's
 * section(c)    the "Where to take" section of a country (plan-list: venue, fee line, rate steps, council, nearest venues)
 * kwByCountry   country name → its own searches [{ text, said, period, source, on }] (desktop/keyword-db.mjs byLocationOf)
 * originFacts   AlmiOET's records (desktop/lists/almiworld-oet-origin-facts.json): { on, items: [{ country, profession, fact, name, text, link }] }
 * countryFacts  AlmiWorld's country facts for the plan: country → its packet (desktop/country-facts.mjs countryPacket — shown facts only)
 * profHubTitle  a profession → the title of its hub (the full grade table every destination's regulator asks of it)
 */
export function localPages({ subject, reqCountries = [], venues = { countries: [], cities: [], home: null }, section, originFacts = null, kwByCountry = {}, regulator = [], professions = [], whereTitle, feeClaim = null, countryFacts = {}, countries = null, profHubTitle = () => null, on }) {
  const facts = originFacts?.items ?? [], factsOn = originFacts?.on ?? null, venueSet = new Map((venues.countries ?? []).map((v) => [v.name, v]));
  const cities = venues.cities ?? [], home = venues.home ?? null, isDest = (c) => reqCountries.includes(c);
  const factClaim = (f) => ({ claimId: `origin-${slug(f.country)}-${f.profession ?? "all"}-${f.fact}`, fact: f.fact, text: f.text, link: f.link, readOn: factsOn, source: `AlmiOET's record (${f.sourceName ?? "official page"}), compiled ${factsOn}`, official: true, body: f.name ?? f.sourceName ?? f.country, country: f.country, profession: f.profession });
  const searchesOf = (c) => (kwByCountry[c] ?? []).filter((k) => has(k.text, subject));
  /* the destinations people from a country search for most: their searches naming the destination or one of its regulators */
  const destNames = new Map(reqCountries.map((d) => [d, [...new Set([...namesOf(d), ...regulator.filter((p) => p.country === d).map((p) => p.short).filter((s) => s && s.length >= 3)])]]));
  const searchedDest = (c, max = 3) => { const ks = kwByCountry[c] ?? []; return [...destNames].map(([d, ns]) => ({ country: d, volume: ks.filter((k) => ns.some((n) => has(k.text, n))).reduce((a, k) => a + Number(k.said ?? 0), 0) })).filter((x) => x.volume > 0).sort((a, b) => b.volume - a.volume || a.country.localeCompare(b.country)).slice(0, max); };
  const sectionsOut = [], stopped = { country: [], countryprof: [] };
  const all = [...new Set([...(countries ?? []), ...venueSet.keys(), ...cities.map((x) => x.country), ...facts.map((f) => f.country), ...Object.keys(kwByCountry).filter((c) => searchesOf(c).length), ...Object.keys(countryFacts)])].sort();
  const origins = all.filter((c) => !isDest(c));
  for (const c of all.filter(isDest)) sectionsOut.push({ name: `${subject} in ${c}`, why: `${c} is a destination — a regulator there asks for ${subject}; its venue and fee are a section of its hub, never a second page` });
  const country = [];
  for (const c of origins) {
    const s = section(c), v = venueSet.get(c), mine = cities.filter((x) => x.country === c), kw = searchesOf(c), cf = countryFacts[c] ?? null;
    /* RR-329 (rule R8): an AlmiOET record whose page the collector found gone is hidden until it is read again and confirmed */
    const fs = facts.filter((f) => f.country === c && !(cf?.gone ?? []).includes(f.link));
    /* RR-329 (rule R9): the owner's own facts — AlmiWorld's own checked information, shown first */
    const own = (cf?.owner ?? []).filter((o) => o.value?.text).map((o) => ({ part: o.key.split("|")[2] ?? null, text: o.value.text, link: o.value.link ?? null, on: o.value.on ?? o.readOn ?? null }));
    /* 1 · the fee in its own currency — the app's own rates first, then AlmiWorld's (each with its rate's source and date); the owner's own word first */
    const ownFee = own.find((o) => o.part === "fee")?.text ?? null;
    const feeLine = ownFee ?? (localShown(s.fee) ? s.fee : cf?.fee?.value?.local ? cf.fee.value.line : null);
    const feeClaims = localShown(s.fee) ? [feeClaim, ...(s.steps ?? []).map((st) => ({ claimId: `rate-${slug(c)}-${slug(st.short)}-${st.to.toLowerCase()}`, fact: "rate", text: `${st.source}: 1 ${st.from} = ${st.said} ${st.to} on ${st.rateDate}${st.peg ? " (the official peg)" : ""}.`, link: st.link, readOn: st.rateDate, source: st.source, official: true, body: st.short }))]
      : feeLine ? [cfClaim(cf.fee, `${subject}'s own page states the fee: ${cf.fee.value.official}.`, "fee"), cf.fee.value.rate?.link ? { claimId: `rate-${slug(c)}-${slug(cf.fee.value.rate.source)}`, fact: "rate", text: `${cf.fee.value.rate.source}: 1 AUD = ${cf.fee.value.rate.said} ${cf.fee.value.currency} on ${cf.fee.value.rate.date}.`, link: cf.fee.value.rate.link, readOn: cf.fee.value.rate.date, source: cf.fee.value.rate.source, official: !cf.fee.value.rate.open, body: cf.fee.value.rate.source } : null] : [];
    /* 2 · the questions people there ask, each with its answer (AlmiWorld's country facts: their searches, answered from official facts; an AI-written answer says so) */
    const questions = (cf?.questions ?? []).filter((q) => q.value?.question && q.value?.answer).map((q) => ({ question: q.value.question, keywords: q.value.keywords ?? [], volume: q.value.volume ?? 0, answer: q.value.answer, aiWritten: Boolean(q.aiWritten), label: q.value.label ?? null, link: q.source ?? null, on: q.readOn ?? null }));
    /* 3 · its test centres, or the nearest venues and taking it at home */
    const cfc = cf?.centres?.value ?? null;
    const centres = v ? { venue: true, cities: mine.map((x) => x.city), link: v.source?.url, on: v.checkedOn } : cfc?.venue ? { venue: true, cities: mine.map((x) => x.city), link: cf.centres.source, on: cf.centres.readOn }
      : home && (s.nearest ?? []).length ? { venue: false, home: home.says, nearest: s.nearest.slice(0, 4), link: home.url, on: home.checkedOn } : cfc?.home && (cfc.nearest ?? []).length ? { venue: false, home: cfc.home, nearest: cfc.nearest, link: cf.centres.source, on: cf.centres.readOn } : null;
    /* 4 · the council for each profession: name, official website, address */
    const councils = professions.map((p) => ({ profession: p, f: cf?.councils?.[p] ?? null })), whole = councils.filter((x) => x.f && councilWhole(x.f.value));
    /* 5 · a rule of its own: AlmiWorld's country facts, and AlmiOET's official records (good standing, attestation) */
    const rules = [...own.filter((o) => o.part === "rules").map((o) => ({ text: o.text, link: o.link, on: o.on, from: "AlmiWorld's own check" })), ...(cf?.rules ?? []).filter((r) => r.value?.rule).map((r) => ({ text: r.value.rule, link: r.source, on: r.readOn, from: r.sourceTitle || hostOf(r.source) })), ...fs.filter((f) => ["goodStanding", "attestation"].includes(f.fact)).map((f) => ({ text: f.text, link: f.link, on: factsOn, from: `AlmiOET's record (${f.sourceName ?? "official page"})` }))].filter((r) => r.text && (r.link || r.from === "AlmiWorld's own check")) // RR-329: the owner's own fact needs no web page
      .filter((r, i, xs) => xs.findIndex((y) => String(y.text).toLowerCase().replace(/\W+/g, " ").trim() === String(r.text).toLowerCase().replace(/\W+/g, " ").trim()) === i); // RR-328 proof: the collector's confirmed copy of a record and the record itself were listed twice
    const filled = { fee: Boolean(feeLine), questions: questions.length > 0, centres: Boolean(centres), councils: whole.length === professions.length && professions.length > 0, rules: rules.length > 0 };
    const missing = PARTS.filter((p) => !filled[p]);
    if (missing.length) {
      const why = missing.map((p) => p === "councils" ? `${PART_NAMES.councils} (${whole.length} of ${professions.length} whole)` : PART_NAMES[p]).join("; ");
      stopped.country.push({ country: c, missing, why: `missing: ${why}` }); sectionsOut.push({ name: `${subject} in ${c}`, why: `missing: ${why} — never padded; a section of "${whereTitle}" until it is filled` }); continue;
    }
    const cur = CURRENCY_OF[c] ?? null, dests = searchedDest(c);
    const claims = [...feeClaims, centres.venue ? (v ? { claimId: `venue-${slug(c)}`, fact: "venue", text: `${subject}'s own page names a venue in ${c}.`, link: centres.link, readOn: centres.on, source: `${subject} — its own page`, official: true, body: subject } : cfClaim(cf.centres, `${subject}'s own page names a venue in ${c}.`, "venue")) : { claimId: `home-${slug(c)}`, fact: "home", text: `${centres.home}.`, link: centres.link, readOn: centres.on, source: `${subject} — its own page`, official: true, body: subject },
      ...mine.map((x) => ({ claimId: `city-${slug(c)}-${slug(x.city)}`, fact: "city", text: `${subject}'s own page: a venue in ${x.city}${x.operator ? `, managed by ${x.operator}` : ""}.`, link: x.source?.url, readOn: x.checkedOn, source: `${subject} — its own page`, official: true, body: subject, city: x.city })),
      ...whole.map((x) => cfClaim(x.f, `${x.f.value.name} (${x.profession}): ${x.f.value.address}.`, "council")), ...rules.map((r, i) => ({ claimId: `rule-${slug(c)}-${i + 1}`, fact: "rule", text: r.text, link: r.link, readOn: r.on, source: r.from, official: true, body: r.from })),
      ...questions.filter((q) => q.link && q.on && !q.aiWritten).map((q, i) => ({ claimId: `answer-${slug(c)}-${i + 1}`, fact: "answer", text: q.answer, link: q.link, readOn: q.on, source: `${subject} — its own page`, official: true, body: subject }))].filter((x) => x?.link && x.readOn);
    country.push({ kind: "country", key: `country|${c}`, country: c, keepWhole: true /* RR-328: the five-part rule replaces gate 2 */, title: `${subject} in ${c}: ${centres.venue ? "test centres" : "taking it at home"}, the fee${cur ? ` in ${cur}` : ""} and the steps`,
      venue: centres.venue, cities: mine.map((x) => ({ city: x.city, operator: x.operator, link: x.source?.url, on: x.checkedOn })), centres, fee: feeLine, currency: cur, feeLocal: feeLine, home: centres.venue ? null : centres.home, nearest: centres.nearest ?? [],
      councils: whole.map((x) => ({ profession: x.profession, name: x.f.value.name, short: shortName(x.f.value.name), website: x.f.value.website, address: x.f.value.address, link: x.f.source, on: x.f.readOn })), rules, answered: questions, own,
      goodStanding: fs.filter((f) => f.fact === "goodStanding").map((f) => ({ profession: f.profession, text: f.text, link: f.link })), attestation: fs.find((f) => f.fact === "attestation") ?? null,
      destinations: dests, searches: kw.slice(0, 12), searchPeriod: kw.find((k) => k.period)?.period ?? null, whereTitle, claims, questions: kw.map((k) => tool(k, c)),
      why: `${c}: all five parts — the fee in ${cur ?? "its money"}, ${questions.length} question${questions.length === 1 ? "" : "s"} answered, ${centres.venue ? "a venue" : "at home with the nearest venues"}, ${whole.length} councils, ${rules.length} rule${rules.length === 1 ? "" : "s"} of its own` });
  }
  /* ── country × profession: the profession's OWN council in that country is found, AND its searches come from there ── */
  const countryprof = [];
  for (const c of origins) for (const prof of professions) {
    const cf = countryFacts[c] ?? null, cfCouncil = cf?.councils?.[prof] ?? null, rec = facts.find((f) => f.country === c && f.profession === prof && f.fact === "council");
    const words = PROFESSION_WORDS[prof] ?? [prof], kw = (kwByCountry[c] ?? []).filter((k) => has(k.text, subject) && words.some((w) => has(k.text, w)));
    const missing = [...(cfCouncil || rec ? [] : ["council"]), ...(kw.length ? [] : ["searches"])];
    if (missing.length) { stopped.countryprof.push({ country: c, profession: prof, missing }); continue; }
    const people = PEOPLE_WORD[prof] ?? prof, parent = country.find((p) => p.country === c);
    const council = cfCouncil ? { name: cfCouncil.value.name, short: shortName(cfCouncil.value.name), link: cfCouncil.source, website: cfCouncil.value.website, address: cfCouncil.value.address ?? null, on: cfCouncil.readOn } : { name: rec.name ?? rec.text, short: shortName(rec.name), link: rec.link, on: factsOn };
    const gs = facts.find((f) => f.country === c && f.profession === prof && f.fact === "goodStanding"), att = facts.find((f) => f.country === c && f.fact === "attestation");
    const dest = regulator.filter((p) => (p.professions ?? []).includes(prof) && !p.sectionOf).map((p) => ({ country: p.country, body: p.body, short: p.short, grade: p.confirmedGrade ?? p.grade, confirmed: Boolean(p.confirmed), page: p.title, claim: (p.claims ?? []).find((x) => x.fact === "scores") ?? (p.claims ?? []).find((x) => x.fromList) ?? null }));
    const byDest = [...new Map(dest.map((d) => [d.country, d])).values()], searched = searchedDest(c).map((x) => x.country), shown = searched.map((d) => byDest.find((x) => x.country === d)).filter(Boolean);
    const claims = [cfCouncil ? cfClaim(cfCouncil, `${council.name}${council.address ? `: ${council.address}` : ""}.`, "council") : factClaim(rec), gs ? factClaim(gs) : null, att ? factClaim(att) : null].filter(Boolean);
    for (const d of shown) if (d.claim?.link && d.claim.readOn) claims.push({ ...d.claim, claimId: `${d.claim.claimId}-for-${slug(c)}-${slug(prof)}` });
    const sec = section(c), feeLine = localShown(sec.fee) ? sec.fee : parent?.fee ?? (cf?.fee?.value?.local ? cf.fee.value.line : sec.fee);
    if (localShown(sec.fee) && feeClaim) claims.push(feeClaim, ...(sec.steps ?? []).map((st) => ({ claimId: `rate-${slug(c)}-${slug(st.short)}-${st.to.toLowerCase()}`, fact: "rate", text: `${st.source}: 1 ${st.from} = ${st.said} ${st.to} on ${st.rateDate}.`, link: st.link, readOn: st.rateDate, source: st.source, official: true, body: st.short })));
    const full = profHubTitle(prof);
    countryprof.push({ kind: "countryprof", key: `countryprof|${c}|${prof}`, country: c, profession: prof, keepWhole: true /* RR-328: its own council and searches decide */, title: `${subject} for ${people} from ${c}: ${council.short ?? "the home council"}, the grades abroad and the steps`, council, goodStanding: gs ? { text: gs.text, link: gs.link } : null, attestation: att ?? null,
      destinations: shown.map((d) => ({ country: d.country, body: d.body, grade: gradeLine(d.grade) ?? null, confirmed: d.confirmed, page: d.page })), allDestinations: byDest.length, fullTable: full, searchedDestinations: searched,
      fee: feeLine, venue: Boolean(venueSet.get(c)), cities: cities.filter((x) => x.country === c).map((x) => x.city), searches: kw.slice(0, 10), searchPeriod: kw.find((k) => k.period)?.period ?? null,
      whereTitle, parentTitle: parent?.title ?? whereTitle, claims: claims.filter((x) => x?.link && x.readOn), questions: kw.map((k) => tool(k, c)), links: [parent?.title, full, ...shown.slice(0, 3).map((d) => d.page)].filter(Boolean),
      why: `${people} from ${c}: their own council (${council.short ?? council.name}), ${kw.length} search${kw.length === 1 ? "" : "es"} from ${c} about ${people}; the grade table shows the ${shown.length} destination${shown.length === 1 ? "" : "s"} people there search for most (of ${byDest.length})` });
  }
  /* the hub every local page hangs on (home → index → this hub → a page: three clicks) */
  const hubPage = { kind: "hub", key: "local|countries", title: `${subject} by country: test centres, fees and the steps from home`, keepWhole: true, fixedLinks: true, links: [], intro: `${subject} in each country people take it from: its test centres, the fee in that country's money, the councils and the rules there, and what people there ask.`, head: ["Country", "Venue", "The fee"], rows: [], claims: [], questions: [], status: "opportunity", why: "the hub of the country and profession-from-country pages — each within three clicks of the home page" };
  return { country, countryprof, city: [], hubPage, sectionsOut, stopped, searchesBy: Object.fromEntries(all.map((c) => [c, searchesOf(c).length]).filter(([, k]) => k)), universe: { country: origins.length, countryprof: origins.length * professions.length, city: cities.length, destinations: all.length - origins.length } };
}

/* a fee line that shows the local money (rates.mjs localShown: an official estimate, or the open rate's "about") */
export const localFee = localShown; // RR-328: rates.mjs (the open rate's "about" line counts too)
/* ── the facts of a local page (each true only for this page: a name, a figure, a step — never a template line) ── */
export function localDataPoints(p, add) {
  const src = (c) => (c ? { link: c.link, on: c.readOn } : null), cl = (f) => (p.claims ?? []).find((c) => c.fact === f);
  if (p.kind === "country") {
    add("The fee in local money", p.feeLocal, src(cl("rate")) ?? src(cl("fee")));
    add(p.venue ? "Venue in the country" : "Taking it at home", p.venue ? "named on the subject's own page" : p.home, { link: p.centres?.link, on: p.centres?.on });
    for (const x of p.cities ?? []) add("Venue city", `${x.city}${x.operator ? ` (${x.operator})` : ""}`, { link: x.link, on: x.on });
    add("Nearest venues", p.venue ? null : (p.nearest ?? []).slice(0, 4));
    for (const c of p.councils ?? []) add(`Council (${PEOPLE_WORD[c.profession] ?? c.profession})`, `${c.name} — ${c.address}`, { link: c.link, on: c.on });
    for (const r of p.rules ?? []) add("A rule of its own", String(r.text).slice(0, 140), { link: r.link, on: r.on });
    for (const q of (p.answered ?? []).slice(0, 8)) add(`Asked in ${p.country}`, `${q.question}: ${String(q.answer).slice(0, 120)}`, q.link ? { link: q.link, on: q.on } : null);
    for (const d of p.destinations ?? []) add("Destination searched most", `${d.country}: ${Number(d.volume).toLocaleString("en-US")} a month`);
  } else if (p.kind === "countryprof") {
    add("Home council", p.council?.name, { link: p.council?.link, on: p.council?.on ?? null });
    add("Council address", p.council?.address ?? null, { link: p.council?.link, on: p.council?.on ?? null });
    add("Good standing step", p.goodStanding?.text?.slice(0, 140) ?? null, p.goodStanding ? { link: p.goodStanding.link, on: null } : null);
    add("Documents' attestation", p.attestation ? p.attestation.text.slice(0, 140) : null);
    add("The fee in local money", localFee(p.fee) ? p.fee : null, src(cl("rate")));
    add("Venue cities at home", (p.cities ?? []).slice(0, 5));
    for (const d of (p.destinations ?? []).slice(0, 3)) add(`Grade in ${d.country}`, d.grade ? `${d.body}: ${d.grade}` : null);
    for (const k of (p.searches ?? []).slice(0, 4)) add(`Searched from ${p.country}`, `${k.text}: ${Number(k.said ?? 0).toLocaleString("en-US")} a month`);
  }
}

/* ── the content of a local page: the answer first, with a number; the table; each of the five parts as a section with its sources ── */
export function localContent(p, { subject, fit, cta }) {
  const people = PEOPLE_WORD[p.profession] ?? p.profession, sv = (k) => `${Number(k.said ?? 0).toLocaleString("en-US")} a month`;
  /* the answer says the fee short ("AUD 587 ≈ PKR 108,671"); the table keeps the whole line with its rate and date */
  const fee = String(p.fee ?? "").split(" — ")[0] + (/— about [\d,]+ [A-Z]{3}/.test(String(p.fee ?? "")) ? ` (about ${/— about ([\d,]+ [A-Z]{3})/.exec(p.fee)[1]})` : "");
  const line = (text, link = null, on = null, note = null) => ({ text, link, on, note });
  if (p.kind === "country") {
    const venue = p.venue ? `${subject}'s own pages name a venue in ${p.country}${p.cities?.length ? ` — in ${p.cities.map((x) => x.city).join(", ")}` : ""}` : `${subject}'s own pages name no venue in ${p.country}; it can be taken at home, and the nearest venues are in ${(p.nearest ?? []).join(", ")}`;
    const q0 = (p.answered ?? [])[0];
    const answer = fit([`${venue} (checked ${p.centres?.on ?? "recently"}).`, `The test fee is ${fee}.`, `Each of the ${(p.councils ?? []).length} professions registers with its own council in ${p.country}, listed below with its address.`, q0 ? `The most asked: "${q0.question}" — answered below.` : null]);
    const table = [["What", `In ${p.country}`], ["The fee", p.fee], ["Test centres", p.venue ? (p.cities?.length ? p.cities.map((x) => x.city).join(", ") : "named on its own page") : `none — at home; nearest: ${(p.nearest ?? []).join(", ")}`], ["Councils", `${(p.councils ?? []).length} professions, each its own (below)`], ["Rules of its own", `${(p.rules ?? []).length} (below)`],
      ...(p.destinations ?? []).map((d) => [`People in ${p.country} search for`, `${d.country} (${Number(d.volume).toLocaleString("en-US")} a month)`])];
    const sections = [
      /* RR-329 (rule R9): the owner's own facts first, as AlmiWorld's own checked information */
      ...((p.own ?? []).length ? [{ heading: "AlmiWorld's own checks", lines: p.own.map((o) => line(o.text, o.link, o.on, "AlmiWorld's own checked information")) }] : []),
      { heading: `What people in ${p.country} ask`, lines: (p.answered ?? []).map((q) => line(`${q.question} — ${q.answer}`, q.link, q.on, q.aiWritten ? "AI-written from the official facts on this page" : null)) },
      { heading: "Test centres", lines: [p.venue ? line(`${subject}'s own pages name a venue in ${p.country}${p.cities?.length ? `: ${p.cities.map((x) => x.city).join(", ")}` : ""}.`, p.centres?.link, p.centres?.on) : line(`${p.home}. The nearest venues: ${(p.nearest ?? []).join(", ")}.`, p.centres?.link, p.centres?.on)] },
      { heading: `The councils in ${p.country}`, lines: (p.councils ?? []).map((c) => line(`${PEOPLE_WORD[c.profession] ?? c.profession}: ${c.name} — ${c.address} — ${c.website}`, c.link, c.on)) },
      { heading: `Rules of ${p.country}'s own`, lines: (p.rules ?? []).map((r) => line(r.text, r.link, r.on)) },
    ];
    const steps = [`Book ${subject}${p.venue ? ` at a venue in ${p.country}` : " at home"} — see "${p.whereTitle}".`, "Ask your council (below) for your verification or good-standing letter.", ...((p.rules ?? []).length ? ["Do what the rules below ask before you apply abroad."] : []), "Reach the grade your destination's regulator asks for.", `Share your results with that regulator through ${subject}'s online account.`];
    return { answer, table, steps, checklist: ["Your passport", "Your home registration card", "Your attested degree and transcript", "A card for the fee"], tip: "Ask for your good-standing letter early — the council issues it itself, and it can take weeks.", sections };
  }
  if (p.kind === "countryprof") {
    const g = (p.destinations ?? []).filter((d) => d.grade).slice(0, 2);
    const answer = fit([`${people.charAt(0).toUpperCase()}${people.slice(1)} from ${p.country} register at home with the ${p.council.name}${p.council.address ? ` (${p.council.address})` : ""}, which ${p.goodStanding ? "issues the good-standing letter a regulator abroad asks for" : "holds their registration"}.`, g.length ? `In ${g[0].country}, the destination people from ${p.country} search for most, ${g[0].body} asks for ${String(g[0].grade).replace(/ · /g, ", ")}.` : null, `The test fee is ${fee}.`, p.searches?.[0] ? `People in ${p.country} search "${p.searches[0].text}" ${sv(p.searches[0])}.` : null]);
    const table = [["Destination", "Regulator", `Grade for ${people}`], ...(p.destinations ?? []).map((d) => [d.country, d.body, d.grade ?? "see its page"]), ...(p.fullTable ? [["Every destination", `${p.allDestinations} in all`, `see "${p.fullTable}"`]] : [])];
    const steps = [`Ask the ${p.council.short ?? p.council.name} for your verification or good-standing letter.`, ...(p.attestation ? ["Have your degree attested (see below)."] : []), `Book ${subject} — see "${p.whereTitle}".`, "Reach the grade your destination's regulator asks for (the table above).", `Share your results with that regulator through ${subject}'s online account.`];
    return { answer, table, steps, checklist: [`Your ${p.council.short ?? "home council"} registration`, "Your good-standing letter", "Your attested degree", `Your ${subject} results`], tip: `Each destination has its own grade for ${people} — check the regulator's own page on the day you book.`,
      sections: [{ heading: `The council for ${people} in ${p.country}`, lines: [line(`${p.council.name}${p.council.address ? ` — ${p.council.address}` : ""}${p.council.website ? ` — ${p.council.website}` : ""}`, p.council.link, p.council.on)] }] };
  }
  return null;
}
