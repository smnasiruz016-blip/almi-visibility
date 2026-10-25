/**
 * 🔴 RR-327 · THE LOCAL PAGE FAMILIES (owner, 26 Oct 2026, final): a page exists only when it has its OWN data — at least 8 data points true
 * only for it (gate 2, desktop/pseo.mjs) — and a need (demand, or a real opportunity). The same answer is a SECTION of a bigger page, never a copy.
 *   COUNTRY             "OET in Pakistan": the venue and the cities the subject's own pages name there, the fee in that country's money (the
 *                       RBA, its central bank, or the official peg — with source and date), taking it at home, the home councils (nurses,
 *                       doctors) and their good-standing step, the documents' attestation, and the searches people make FROM that country
 *                       (AlmiWorld's keyword service, asked per country). A destination country (a regulator there asks for the subject) has
 *                       its hub already — its local facts are a section of that hub, never a second page.
 *   COUNTRY × PROFESSION "OET for nurses from Pakistan": only where that profession has its OWN home council and steps in AlmiOET's records,
 *                       plus that profession's searches from that country and every destination's grade for that profession.
 *   CITY                "OET centre Lahore": only a city the subject's own pages name a venue in — the venue, its operator, the local fee,
 *                       the booking steps, the other venues in the country, the "near me" searches naming the city.
 * Hard facts only with a source and its date; nothing is guessed — a fact not found is left out and the page says what is missing.
 * Pure: everything is handed in.
 */
import { PEOPLE_WORD, inCountry, gradeLine } from "./recognition.mjs";
import { CURRENCY_OF } from "./rates.mjs";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(text ?? ""));
/* the words a profession is searched by (a keyword about nurses from Pakistan: "oet for nurses in pakistan", "pnmc oet") */
export const PROFESSION_WORDS = Object.freeze({ nursing: ["nurse", "nurses", "nursing", "midwife", "midwives", "midwifery"], medicine: ["doctor", "doctors", "medicine", "medical", "physician", "physicians", "mbbs"], pharmacy: ["pharmacist", "pharmacists", "pharmacy"], dentistry: ["dentist", "dentists", "dental", "dentistry"] });
const shortName = (name) => /\(([A-Z]{2,6})\)/.exec(name ?? "")?.[1] ?? name;
const tool = (k, country) => ({ question: k.text, also: [], sources: [{ kind: "tool", volume: { estimate: k.said ?? 0 }, label: `Google Ads Keyword Planner (AlmiWorld keyword service, ${country})` }], weight: k.said ?? 0, local: country });

/**
 * → { country: [page], countryprof: [page], city: [page], hubPage, sectionsOut: [{ name, why }], universe: { country, countryprof, city } }
 * section(c)   the "Where to take" section of a country (plan-list: venue, fee line, rate steps, council, nearest venues)
 * kwByCountry  country name → its own searches [{ text, said, period, source, on }] (desktop/keyword-db.mjs byLocationOf)
 * originFacts  AlmiOET's records (desktop/lists/almiworld-oet-origin-facts.json): { on, items: [{ country, profession, fact, name, text, link }] }
 */
export function localPages({ subject, reqCountries = [], venues = { countries: [], cities: [], home: null }, section, originFacts = null, kwByCountry = {}, regulator = [], professions = [], universities = [], whereTitle, feeClaim = null, on }) {
  const facts = originFacts?.items ?? [], factsOn = originFacts?.on ?? null, venueSet = new Map((venues.countries ?? []).map((v) => [v.name, v]));
  const cities = venues.cities ?? [], home = venues.home ?? null, isDest = (c) => reqCountries.includes(c);
  const factClaim = (f) => ({ claimId: `origin-${slug(f.country)}-${f.profession ?? "all"}-${f.fact}`, fact: f.fact, text: f.text, link: f.link, readOn: factsOn, source: `AlmiOET's record (${f.sourceName ?? "official page"}), compiled ${factsOn}`, official: true, body: f.name ?? f.sourceName ?? f.country, country: f.country, profession: f.profession });
  const searchesOf = (c) => (kwByCountry[c] ?? []).filter((k) => has(k.text, subject));
  const sectionsOut = [];
  /* ── the universe of countries: a venue, a city, a home council or a country fact, or searches FROM it ── */
  const all = [...new Set([...venueSet.keys(), ...cities.map((x) => x.country), ...facts.map((f) => f.country), ...Object.keys(kwByCountry).filter((c) => searchesOf(c).length)])].sort();
  const country = [];
  for (const c of all) {
    if (isDest(c)) { sectionsOut.push({ name: `${subject} in ${c}`, why: `${c} is a destination — a regulator there asks for ${subject}; its venue and fee are a section of its hub, never a second page` }); continue; }
    const s = section(c), v = venueSet.get(c), mine = cities.filter((x) => x.country === c), fs = facts.filter((f) => f.country === c), kw = searchesOf(c);
    const claims = [];
    if (v) claims.push({ claimId: `venue-${slug(c)}`, fact: "venue", text: `${subject}'s own page names a venue in ${c}.`, link: v.source?.url, readOn: v.checkedOn, source: `${subject} — its own page`, official: true, body: subject });
    for (const x of mine) claims.push({ claimId: `city-${slug(c)}-${slug(x.city)}`, fact: "city", text: `${subject}'s own page: a venue in ${x.city}${x.operator ? `, managed by ${x.operator}` : ""}.`, link: x.source?.url, readOn: x.checkedOn, source: `${subject} — its own page`, official: true, body: subject, city: x.city });
    if (!v && home) claims.push({ claimId: `home-${slug(c)}`, fact: "home", text: `${home.says}.`, link: home.url, readOn: home.checkedOn, source: `${subject} — its own page`, official: true, body: subject });
    if (feeClaim) claims.push(feeClaim);
    for (const st of s.steps ?? []) claims.push({ claimId: `rate-${slug(c)}-${st.short.toLowerCase()}-${st.to.toLowerCase()}`, fact: "rate", text: `${st.source}: 1 ${st.from} = ${st.said} ${st.to} on ${st.rateDate}${st.peg ? " (the official peg)" : ""}.`, link: st.link, readOn: st.rateDate, source: st.source, official: true, body: st.short });
    for (const f of fs) claims.push(factClaim(f));
    /* the title names the local money only when its figure is shown (a bank that refused leaves AUD/USD — never a promise the page cannot keep) */
    const cur = CURRENCY_OF[c] ?? null, shown = cur && (s.steps?.length ?? 0) > 0 && /≈ [A-Z]{3} [\d,]+/.test(s.fee ?? "") && !/≈ USD/.test(s.fee ?? ""), title = `${subject} in ${c}: ${v || mine.length ? "test centres" : "taking it at home"}, the fee${shown ? ` in ${cur}` : ""} and the steps`;
    const councils = fs.filter((f) => f.fact === "council");
    country.push({ kind: "country", key: `country|${c}`, country: c, title, venue: Boolean(v), cities: mine.map((x) => ({ city: x.city, operator: x.operator, link: x.source?.url, on: x.checkedOn })), fee: s.fee, currency: cur, feeLocal: shown ? s.fee : null, /* only a figure in its own money — a USD fallback is not one */ home: !v && home ? home.says : null, nearest: s.nearest ?? [],
      councils: councils.map((f) => ({ profession: f.profession, name: f.name ?? f.text, short: shortName(f.name), link: f.link })), goodStanding: fs.filter((f) => f.fact === "goodStanding").map((f) => ({ profession: f.profession, text: f.text, link: f.link })), attestation: fs.find((f) => f.fact === "attestation") ?? null,
      searches: kw.slice(0, 12), searchPeriod: kw.find((k) => k.period)?.period ?? null, whereTitle, claims: claims.filter((x) => x.link && x.readOn), questions: kw.map((k) => tool(k, c)),
      why: `${c}: ${[v ? "a venue" : null, mine.length ? `${mine.length} cit${mine.length === 1 ? "y" : "ies"} named` : null, councils.length ? `${councils.length} home council${councils.length === 1 ? "" : "s"}` : null, kw.length ? `${kw.length} searches from ${c}` : null].filter(Boolean).join(", ") || "only its fee"}` });
  }
  /* ── country × profession: only where AlmiOET's records name that profession's OWN home council ── */
  const countryprof = [];
  const pairs = [...new Set(facts.filter((f) => f.fact === "council" && f.profession).map((f) => `${f.country}|${f.profession}`))];
  for (const pair of pairs) {
    const [c, prof] = pair.split("|"), people = PEOPLE_WORD[prof] ?? prof, parent = country.find((p) => p.country === c);
    if (isDest(c)) { sectionsOut.push({ name: `${subject} for ${people} from ${c}`, why: `${c} is a destination — a section of its hub` }); continue; }
    const council = facts.find((f) => f.country === c && f.profession === prof && f.fact === "council"), gs = facts.find((f) => f.country === c && f.profession === prof && f.fact === "goodStanding"), att = facts.find((f) => f.country === c && f.fact === "attestation");
    const words = PROFESSION_WORDS[prof] ?? [prof], kw = (kwByCountry[c] ?? []).filter((k) => has(k.text, subject) && words.some((w) => has(k.text, w)));
    const dest = regulator.filter((p) => (p.professions ?? []).includes(prof) && !p.sectionOf).map((p) => ({ country: p.country, body: p.body, short: p.short, grade: p.confirmedGrade ?? p.grade, confirmed: Boolean(p.confirmed), page: p.title, claim: (p.claims ?? []).find((x) => x.fact === "scores") ?? (p.claims ?? []).find((x) => x.fromList) ?? null }));
    const byDest = [...new Map(dest.map((d) => [d.country, d])).values()].sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || a.country.localeCompare(b.country));
    const claims = [council, gs, att].filter(Boolean).map(factClaim);
    for (const d of byDest.slice(0, 6)) if (d.claim?.link && d.claim.readOn) claims.push({ ...d.claim, claimId: `${d.claim.claimId}-for-${slug(c)}-${prof}` });
    if (parent?.feeLocal && feeClaim) claims.push(feeClaim, ...parent.claims.filter((x) => x.fact === "rate")); // the fee in its money: the bank and the date
    countryprof.push({ kind: "countryprof", key: `countryprof|${c}|${prof}`, country: c, profession: prof, title: `${subject} for ${people} from ${c}: ${shortName(council.name) ?? "the home council"}, the grades abroad and the steps`, council: { name: council.name ?? council.text, short: shortName(council.name), link: council.link }, goodStanding: gs ? { text: gs.text, link: gs.link } : null, attestation: att ?? null,
      destinations: byDest.map((d) => ({ country: d.country, body: d.body, grade: gradeLine(d.grade) ?? null, confirmed: d.confirmed, page: d.page })), fee: parent?.fee ?? section(c).fee, venue: Boolean(venueSet.get(c)), cities: (parent?.cities ?? []).map((x) => x.city), searches: kw.slice(0, 10), searchPeriod: kw.find((k) => k.period)?.period ?? null,
      whereTitle, parentTitle: parent?.title ?? whereTitle, claims: claims.filter((x) => x.link && x.readOn), questions: kw.map((k) => tool(k, c)), links: [parent?.title, ...byDest.slice(0, 3).map((d) => d.page)].filter(Boolean),
      why: `${people} from ${c}: their own home council (${shortName(council.name)}) and its good-standing step${gs ? "" : " (not in the records yet)"}, ${byDest.length} destination${byDest.length === 1 ? "" : "s"} with a grade for ${people}${kw.length ? `, ${kw.length} searches from ${c} about ${people}` : ""}` });
  }
  /* ── city: only a city the subject's own pages name a venue in ── */
  const city = [];
  const nearMe = (x) => Object.entries(kwByCountry).flatMap(([loc, ks]) => ks.filter((k) => has(k.text, x.city)).map((k) => ({ ...k, loc })));
  for (const x of cities) {
    if (isDest(x.country)) { sectionsOut.push({ name: `${subject} centre ${x.city}`, why: `${x.country} is a destination — the venue is a line of its hub` }); continue; }
    const parent = country.find((p) => p.country === x.country), s = section(x.country), kw = [...new Map(nearMe(x).map((k) => [k.text, k])).values()], others = cities.filter((y) => y.country === x.country && y.city !== x.city).map((y) => y.city);
    const unis = universities.filter((u) => u.country === x.country && String(u.city ?? "").toLowerCase() === x.city.toLowerCase()).map((u) => u.name);
    const claims = [{ claimId: `city-${slug(x.country)}-${slug(x.city)}`, fact: "city", text: `${subject}'s own page: a venue in ${x.city}${x.operator ? `, managed by ${x.operator}` : ""}.`, link: x.source?.url, readOn: x.checkedOn, source: `${subject} — its own page`, official: true, body: subject, city: x.city }, ...(feeClaim ? [feeClaim] : []), ...(parent?.claims ?? []).filter((c) => c.fact === "rate")];
    city.push({ kind: "city", key: `city|${x.country}|${x.city}`, country: x.country, city: x.city, title: `${subject} centre ${x.city}: the venue, the fee${/≈ [A-Z]{3} /.test(s.fee ?? "") && !/≈ USD/.test(s.fee ?? "") ? ` in ${CURRENCY_OF[x.country]}` : ""} and how to book`, operator: x.operator, said: x.said, sourceOn: x.checkedOn, fee: s.fee, others, universities: unis.slice(0, 12), searches: kw.slice(0, 10), parentTitle: parent?.title ?? whereTitle, whereTitle,
      claims: claims.filter((c) => c.link && c.readOn), questions: kw.map((k) => tool(k, k.loc)), links: [parent?.title, whereTitle].filter(Boolean),
      why: `${x.city}: ${subject}'s own page names a venue there${x.operator ? ` (${x.operator})` : ""}${kw.length ? `, ${kw.length} searches name the city` : ""}` });
  }
  /* the hub every local page hangs on (home → index → this hub → a page: three clicks) */
  const hubPage = { kind: "hub", key: "local|countries", title: `${subject} by country: test centres, fees and the steps from home`, keepWhole: true, fixedLinks: true, links: [], intro: `${subject} in each country people take it from: its test centres and cities, the fee in that country's money, the home council's steps, and what people there search for.`, head: ["Country", "Venue", "The fee"], rows: [], claims: [], questions: [], status: "opportunity", why: "the hub of the country, profession-from-country and city pages — each within three clicks of the home page" };
  return { country, countryprof, city, hubPage, sectionsOut, universe: { country: all.length, countryprof: pairs.length, city: cities.length } };
}

/* a fee line that shows the local money ("AUD 587 ≈ PKR 108,671 — …"); the RBA's US-dollar fallback (a bank refused) is not one */
export const localFee = (line) => /≈ [A-Z]{3} [\d,]+/.test(String(line ?? "")) && !/≈ USD /.test(String(line ?? ""));
/* ── the facts of a local page as gate 2 counts them (each true only for this page: a name, a figure, a step — never a template line) ── */
export function localDataPoints(p, add) {
  const src = (c) => (c ? { link: c.link, on: c.readOn } : null), cl = (f) => (p.claims ?? []).find((c) => c.fact === f);
  if (p.kind === "country") {
    add("Venue in the country", p.venue ? "named on the subject's own page" : null, src(cl("venue")));
    for (const x of p.cities ?? []) add(`Venue city`, `${x.city}${x.operator ? ` (${x.operator})` : ""}`, { link: x.link, on: x.on });
    add("Taking it at home", p.home, src(cl("home")));
    add("The fee in local money", p.feeLocal, src(cl("rate")));
    add("Nearest venues", p.venue ? null : (p.nearest ?? []).slice(0, 4));
    for (const c of p.councils ?? []) add(`Home council (${PEOPLE_WORD[c.profession] ?? c.profession})`, c.name, { link: c.link, on: null });
    for (const g of p.goodStanding ?? []) add(`Good standing (${PEOPLE_WORD[g.profession] ?? g.profession})`, g.text.slice(0, 140), { link: g.link, on: null });
    add("Documents' attestation", p.attestation ? p.attestation.text.slice(0, 140) : null, p.attestation ? { link: p.attestation.link, on: null } : null);
    for (const k of (p.searches ?? []).slice(0, 6)) add(`Searched from ${p.country}`, `${k.text}: ${Number(k.said ?? 0).toLocaleString("en-US")} a month`);
  } else if (p.kind === "countryprof") {
    add("Home council", p.council?.name, { link: p.council?.link, on: null });
    add("Good standing step", p.goodStanding?.text?.slice(0, 140) ?? null, p.goodStanding ? { link: p.goodStanding.link, on: null } : null);
    add("Documents' attestation", p.attestation ? p.attestation.text.slice(0, 140) : null);
    add("The fee in local money", localFee(p.fee) ? p.fee : null, src(cl("rate")));
    add("Venue cities at home", (p.cities ?? []).slice(0, 5));
    for (const d of (p.destinations ?? []).slice(0, 6)) add(`Grade in ${d.country}`, d.grade ? `${d.body}: ${d.grade}` : null);
    for (const k of (p.searches ?? []).slice(0, 4)) add(`Searched from ${p.country}`, `${k.text}: ${Number(k.said ?? 0).toLocaleString("en-US")} a month`);
  } else if (p.kind === "city") {
    add("Venue", `${p.city}, ${p.country}`, src(cl("city")));
    add("Operator", p.operator);
    add("The fee in local money", localFee(p.fee) ? p.fee : null, src(cl("rate")));
    add("Other venues in the country", (p.others ?? []).slice(0, 5));
    add("Healthcare universities in the city", p.universities?.length ? `${p.universities.length}: ${p.universities.slice(0, 3).join("; ")}` : null);
    for (const k of (p.searches ?? []).slice(0, 4)) add("Searched with the city's name", `${k.text}: ${Number(k.said ?? 0).toLocaleString("en-US")} a month`);
  }
}

/* ── the content of a local page (B6–B7): the answer first, with a number; the table; steps; a checklist; one tip ── */
export function localContent(p, { subject, fit, cta }) {
  const people = PEOPLE_WORD[p.profession] ?? p.profession, top = (p.searches ?? [])[0], sv = (k) => `${Number(k.said ?? 0).toLocaleString("en-US")} a month`;
  /* the answer says the fee short ("AUD 587 ≈ PKR 108,671"); the table keeps the whole line with its bank and date */
  const fee = String(p.fee ?? "").split(" — ")[0];
  if (p.kind === "country") {
    const venue = p.venue ? `${subject}'s own pages name a venue in ${p.country}${p.cities?.length ? ` — in ${p.cities.map((x) => x.city).join(", ")}` : ""}` : `${subject}'s own pages name no venue in ${p.country}; taking it at home is offered where no venue exists yet`;
    const council = p.councils?.[0];
    const answer = fit([`${venue} (checked ${(p.claims ?? []).find((c) => c.fact === "venue" || c.fact === "home")?.readOn ?? "recently"}).`, `The test fee is ${fee}.`, council ? `Nurses and doctors from ${p.country} verify their registration with their home council first — for ${PEOPLE_WORD[council.profession] ?? council.profession}, the ${council.name}.` : null, top ? `The top search from ${p.country} is "${top.text}" (${sv(top)}, Google Ads Keyword Planner).` : null]);
    const table = [["What", `In ${p.country}`], ["Venue", p.venue ? (p.cities?.length ? p.cities.map((x) => x.city).join(", ") : "named, city not stated") : "none named — at home"], ["The fee", p.fee], ...(p.councils ?? []).map((c) => [`Home council (${PEOPLE_WORD[c.profession] ?? c.profession})`, c.name]), ...(p.attestation ? [["Attestation", p.attestation.hague ? "apostille (Hague Convention)" : "legalisation through the foreign ministry"]] : []), ...(p.searches ?? []).slice(0, 8).map((k) => [`Searched: ${k.text}`, sv(k)])];
    const steps = [`Book ${subject}${p.venue ? ` at a venue in ${p.country}` : " at home"} — see "${p.whereTitle}".`, ...(p.councils?.length ? [`Ask your home council (${p.councils.map((c) => c.short ?? c.name).join(" or ")}) for your verification or good-standing letter.`] : []), ...(p.attestation ? ["Have your degree attested as the record below says."] : []), "Reach the grade your destination's regulator asks for.", `Share your results with that regulator through ${subject}'s online account.`];
    return { answer, table, steps, checklist: ["Your passport", "Your home registration card", "Your attested degree and transcript", "A card for the fee"], tip: p.goodStanding?.length ? `Ask for your good-standing letter early — the home council issues it itself, and it can take weeks.` : `Book early: venue places fill first in busy months.` };
  }
  if (p.kind === "countryprof") {
    const g = (p.destinations ?? []).filter((d) => d.grade).slice(0, 2);
    const answer = fit([`${people.charAt(0).toUpperCase()}${people.slice(1)} from ${p.country} register at home with the ${p.council.name}, which ${p.goodStanding ? "issues the good-standing letter a regulator abroad asks for" : "holds their registration"}.`, g.length ? `In ${g[0].country}, ${g[0].body} asks for ${String(g[0].grade).replace(/ · /g, ", ")}.` : null, `${p.destinations?.length ?? 0} destinations name a grade for ${people}; the table lists each one.`, `The test fee is ${fee}.`, p.searches?.[0] ? `People in ${p.country} search "${p.searches[0].text}" ${sv(p.searches[0])}.` : null]);
    const table = [["Destination", "Regulator", `Grade for ${people}`], ...(p.destinations ?? []).slice(0, 12).map((d) => [d.country, d.body, d.grade ?? "see its page"])];
    const steps = [`Ask the ${p.council.short ?? p.council.name} for your verification or good-standing letter.`, ...(p.attestation ? ["Have your degree attested (see below)."] : []), `Book ${subject} — see "${p.whereTitle}".`, "Reach the grade your destination's regulator asks for (the table above).", `Share your results with that regulator through ${subject}'s online account.`];
    return { answer, table, steps, checklist: [`Your ${p.council.short ?? "home council"} registration`, "Your good-standing letter", "Your attested degree", `Your ${subject} results`], tip: `Each destination has its own grade for ${people} — check the regulator's own page on the day you book.` };
  }
  if (p.kind === "city") {
    const answer = fit([`${subject} has a test venue in ${p.city}, ${p.country}${p.operator ? `, managed by ${p.operator}` : ""} (${subject}'s own page, ${p.sourceOn}).`, `The test fee is ${fee}.`, p.others?.length ? `Other venues in ${p.country}: ${p.others.slice(0, 4).join(", ")}.` : null, p.searches?.[0] ? `"${p.searches[0].text}" is searched ${sv(p.searches[0])}.` : null, `Book on ${subject}'s own site and choose ${p.city} as the venue.`]);
    const table = [["What", p.city], ["Venue", `${p.city}, ${p.country}`], ["Operator", p.operator ?? "not stated on the page"], ["The fee", p.fee], ["Other venues in the country", p.others?.join(", ") || "none named"], ...(p.searches ?? []).slice(0, 6).map((k) => [`Searched: ${k.text}`, sv(k)])];
    return { answer, table, steps: [`Open ${subject}'s booking page.`, `Choose ${p.city} as the venue and pick a date.`, "Pay the fee and keep the receipt.", "Bring the ID the venue asks for on the day."], checklist: ["Your passport", "Your booking confirmation", "A card for the fee"], tip: `Venues in ${p.country} can fill early — book as soon as your date is fixed.` };
  }
  return null;
}
