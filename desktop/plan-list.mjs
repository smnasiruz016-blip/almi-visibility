/**
 * 🔴 RR-321 B · THE PAGE COUNT FROM THE SUBJECT'S OWN LIST — fast, and ONE SOURCE OF TRUTH (owner, 23 Oct 2026):
 *   · counting reads no regulator's site (that is done while pages are BUILT): the lists (197 countries, the subject's 12 professions,
 *     AlmiStudy's universities), the subject's own "who recognises it" list, its venue, sub-test and statistics pages;
 *   · one table per page family, the total at the top, every number clickable to its list (kept, left out, why);
 *   · ORIGIN COUNTRIES NEVER GET PAGES OF THEIR OWN (E1): what is true of a home country goes inside the university pages and "Where to take";
 *   · THE LEDGER (`numbers`) is the one place every number lives: the five answers, the tables, "why not more", the plan and the total all
 *     read it (test/rr321 + rr322: any two that differ fail).
 * 🔴 RR-322 (owner, 24 Oct 2026: "page quality + quantity") — the families and the three gates of desktop/pseo.mjs:
 *       REGULATOR   one page per regulator rule; a page whose score no regulator page confirms WAITS (never a ready draft);
 *       SUB-TEST    profession × sub-test (12 × 4): the sub-test's facts on the subject's own pages and each regulator's grade for it;
 *       UNIVERSITY  ONE PAGE PER UNIVERSITY (owner): those the list names a profession for, and those the light check found one for;
 *       TAKING      ONE "Where to take it" page, a section per country;
 *       TOPIC       the questions no other page answers — AI may explain, only hard facts need a source;
 *       HUB         one per destination country, one per profession, and the index of hubs (links: ≤ 3 clicks from home);
 *       LANGUAGE    the strongest pages, in a language people ask in (of the client's 10).
 * Pure: everything is handed in.
 */
import { destinationsIn, originsIn, countriesIn, neighboursOf, REGIONS_SOURCE } from "./world.mjs";
import { regulatorPagesOf, PEOPLE_WORD, inCountry, gradeLine, countLine, callNames } from "./recognition.mjs";
import { teachesHealth, professionsOfFields } from "./universities.mjs";
import { feeInCurrency } from "./rates.mjs";
import { professionIn, TAKING, UNIVERSITY, TOPICS, searched } from "./page-plan.mjs";
import { questionCount } from "./questions.mjs";
import { runGates, linkPages, batchesOf, contentOf, languageDemand, strongForLanguage, templateCheck, SUBTESTS, GATES, BATCH_SIZES } from "./pseo.mjs";
import { clusterKeywords, sumRanges } from "./demand.mjs"; // RR-323
import { FACTS_FOR } from "./subject-facts.mjs"; // RR-323
import { labelOf } from "./samples.mjs"; // RR-324 D2

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (s, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(s ?? ""));
const fieldsOf = (u) => u.fields ?? u.subjects ?? [];
const shortOf = (n) => /\(([A-Z][A-Za-z-]{1,9})(?:\s*\/[^)]*)?\)/.exec(n)?.[1] ?? null;
const plainName = (n) => String(n).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
/* RR-322 C3: the first batch is 25, then 50, 100, 200 — each only when the last one is 80% indexed */
export const BATCH = Object.freeze({ min: BATCH_SIZES[0], max: BATCH_SIZES[0] });
/* RR-323 decision 9: a parent body whose one English rule covers its boards — the boards are sections of the parent's page */
export const PARENT_RULES = Object.freeze([{ country: "Australia", parent: /Australian Health Practitioner Regulation Agency|\bAHPRA\b/i, child: /\bBoard of Australia\b/ }]);
const LANG_NAME = { es: "Spanish", de: "German", it: "Italian", fr: "French", pt: "Portuguese", ar: "Arabic", ur: "Urdu", hi: "Hindi", zh: "Chinese" };

/** a university page's title: its own name (≤ 70 characters; its short name when the whole name is long) */
export function universityTitle(subject, us, country) {
  const t = `${subject} for ${plainName(us[0].name)} graduates`; return t.length <= 60 || !shortOf(us[0].name) ? t : `${subject} for ${shortOf(us[0].name)} graduates`;
}
/* the letters a regulator's own page states, per sub-test ("Listening B (350–450) · …"); a page that states only scaled scores keeps the list's */
const lettersOf = (text) => { const g = {}; for (const s of SUBTESTS) { const m = new RegExp(`\\b${s}\\s+([ABC]\\+?)(?![\\w+])`).exec(text ?? ""); if (m) g[s.toLowerCase()] = m[1]; } return Object.keys(g).length === 4 ? g : null; };

/**
 * THE PLAN. `rec` = recognitionOf(list); `professions` = the subject's 12; `universities` = the list's items; `light` = the light check's
 * results (by university name); `venues`, `fee`, `rates`, `stats`, `subtests` = what the subject's own pages and the central banks said;
 * `groups` = the grouped questions ABOUT the subject; `sorted` = sortQuestions(); `byCountry` = Search Console rows; `reads` = the regulator
 * pages read while building (by list id); `ai` = what the client's AI wrote (explanation only: { topics: { title: {…} }, subtests: {…} });
 * `languages` = the client's chosen language codes; `items` = every question found (for the languages people ask in); `cta` = the call to act.
 */
export function planFromList({ subject, rec, professions, universities = [], light = {}, venues = { countries: [], home: null }, fee = null, rates = null, stats = null, subtests = {}, groups = [], sorted = null, byCountry = [], reads = {}, on = null, councils = null, ai = {}, languages = [], items = [], cta = null, subjectPages = {}, facts = {}, translatable = [], by = null }) {
  /* B3 · a home country's council and its official verification page (AlmiOET's records — nursing), as a "check here" fact */
  const councilOf = (country, profs = ["nursing"]) => { const c = (councils?.items ?? []).find((x) => x.country === country && profs.includes(x.profession)); return c ? { ...c, claim: { claimId: `council-${country.toLowerCase().replace(/[^a-z]+/g, "-")}`, text: `To verify a ${c.profession} registration from ${country}, the home council is the ${c.council}: check here — its own verification page.`, link: c.verificationUrl ?? c.councilUrl, readOn: councils.on, source: `AlmiOET's record of the ${c.council}`, official: true, body: c.council } } : null; };
  /* ── REGULATOR: one page per regulator rule; CONFIRMED only where a regulator's own page states the score ── */
  const R = regulatorPagesOf(rec, { subject, professions });
  const regulator = R.pages.map((p) => {
    const rd = reads[p.listId], scores = (rd?.claims ?? []).find((c) => c.fact === "scores");
    return { ...p, claims: [...p.claims, ...(rd?.claims ?? [])], read: rd ? { ok: rd.ok, why: rd.why ?? null, on: rd.on, url: rd.url, browser: rd.browser ?? false, via: rd.via ?? null } : null, confirmed: Boolean(rd?.ok && scores), confirmedGrade: scores ? lettersOf(scores.text) ?? p.grade : null };
  });
  /* RR-323 decisions 9 + 10 · a parent body whose ONE English rule covers its boards (Ahpra for Australia's national boards): each board is a
   * SECTION of the parent's page, and the parent's own page confirms it. The Chinese Medicine Board is never "doctors" (its practitioners). */
  for (const p of regulator) if (/Chinese Medicine/i.test(p.body)) { p.professions = p.professions.filter((x) => x !== "medicine"); p.title = `${subject}: ${p.body} (Chinese medicine practitioners)`; p.peopleSay = "Chinese medicine practitioners"; }
  for (const P of PARENT_RULES) {
    const par = regulator.find((p) => p.country === P.country && P.parent.test(`${p.body} ${p.short ?? ""}`)); if (!par) continue;
    par.boards = [];
    for (const p of regulator.filter((q) => q !== par && q.country === P.country && P.child.test(q.body))) {
      p.sectionOf = par.title; p.sectionWhy = `${par.short ?? par.body}'s one English standard covers it`; par.boards.push(p);
      if (p.confirmed && par.read?.url && p.read?.url === par.read.url) p.confirmedBy = par.short ?? par.body; // its own page IS the parent's (the RR-322 reads)
      if (par.confirmed && !p.confirmed) { p.confirmed = true; p.confirmedBy = par.short ?? par.body; p.confirmedGrade = par.confirmedGrade; p.claims = [...p.claims, ...par.claims.filter((c) => c.fact === "scores").map((c) => ({ ...c, claimId: `${c.claimId}-for-${String(p.listId ?? p.body).replace(/\W+/g, "-")}`, text: `${c.text} (${par.short ?? par.body}'s standard covers ${p.body})` }))]; }
    }
  }
  const reqCountries = rec.requirement.map((c) => c.country);
  /* ── TAKING: ONE page, a section per country where it can be taken ── */
  const vset = new Map(venues.countries.map((v) => [v.name, v]));
  const feeClaim = fee?.ok && fee.source?.url ? { claimId: "fee-own-page", text: `${subject}'s own page states the test fee: ${fee.said ?? `${fee.currency} ${fee.amount}`}.`, link: fee.source.url, readOn: fee.checkedOn, source: `${subject} — its own page`, official: true, body: subject } : null;
  const section = (c, asked = false) => { const v = vset.get(c), f = feeInCurrency(fee, c, rates), council = councilOf(c);
    return v ? { country: c, venue: true, source: v.source, checkedOn: v.checkedOn, fee: f.line, steps: f.steps ?? [], refused: f.refused ?? null, browser: f.browser ?? null, council }
      : { country: c, venue: false, asked, fee: f.line, steps: f.steps ?? [], browser: f.browser ?? null, council, nearest: neighboursOf(c).filter((n) => vset.has(n)), says: `${subject}'s own pages name no venue in ${c} (checked ${venues.checked?.[0]?.on ?? on ?? ""})${venues.home ? "; taking it at home may be offered there — " + venues.home.says : ""}` }; };
  const where = { kind: "taking", title: `Where to take ${subject}: venues, test fees and taking it at home`, sections: [...vset.keys()].map((c) => section(c)), home: venues.home, keepWhole: true,
    claims: [feeClaim, ...(venues.home ? [{ claimId: "at-home", text: `${venues.home.says}.`, link: venues.home.url, readOn: venues.home.checkedOn, source: `${subject} — its own page`, official: true, body: subject }] : [])].filter(Boolean),
    why: `one page, a section for each of the ${vset.size} countries where ${subject}'s own pages name a venue — the country a person takes it in never gets a page of its own`, questions: [] };
  for (const p of regulator) { p.fee = fee?.ok ? fee.said ?? `${fee.currency} ${fee.amount}` : null; p.whereTitle = where.title; }
  /* ── SUB-TEST: profession × sub-test (12 × 4) — the sub-test's own facts and each regulator's grade in it for that profession ── */
  const subtest = professions.flatMap((prof) => SUBTESTS.map((s) => {
    const required = regulator.filter((p) => p.professions.includes(prof) && (p.confirmedGrade ?? p.grade)?.[s.toLowerCase()]).map((p) => { const c = (p.claims ?? []).find((x) => x.fact === "scores") ?? (p.claims ?? []).find((x) => x.fromList); return { body: p.body, short: p.short, country: p.country, grade: (p.confirmedGrade ?? p.grade)[s.toLowerCase()], confirmed: p.confirmed, src: c ? { link: c.link, on: c.readOn } : null, page: p.title }; });
    const f = subtests[s] ?? null, people = PEOPLE_WORD[prof] ?? prof, key = `${s}|${prof}`;
    return { kind: "subtest", key, subtest: s, profession: prof, title: `${subject} ${s} for ${people}`, facts: f, required, ai: ai.subtests?.[key] ?? null, questions: [],
      claims: [f ? { claimId: `subtest-${s.toLowerCase()}`, text: `${subject}'s own page about ${s}: ${[f.minutes && `about ${f.minutes} minutes`, f.parts && `${f.parts} parts`, f.questions && `${f.questions} questions`, f.roleplays && `${f.roleplays} role-plays`, f.criteria && `${f.criteria} assessment criteria`].filter(Boolean).join(", ")}.`, link: f.link, readOn: f.on, source: `${subject} — its own page`, official: true, body: subject } : null, ...required.slice(0, 4).map((r) => r.src ? { claimId: `req-${key}-${r.short ?? r.body}`.replace(/[^\w|-]+/g, "-"), text: `${r.body} (${r.country}) asks ${people} for ${s} ${r.grade}${r.confirmed ? " — its own page" : ` — ${subject}'s list`}.`, link: r.src.link, readOn: r.src.on, source: r.confirmed ? `${r.body} — its own page` : `${subject}'s list`, official: true, body: r.body } : null)].filter(Boolean),
      why: `${people}: ${s} — ${required.length} regulator${required.length === 1 ? "" : "s"} state a ${s} grade for them` };
  }));
  /* ── UNIVERSITY: ONE PAGE PER UNIVERSITY (owner, RR-322 A1) — the list's own professions, or the light check's ── */
  const health = universities.filter(teachesHealth);
  const named = health.map((u) => ({ u, professions: professionsOfFields(fieldsOf(u)), from: "list" })).filter((x) => x.professions.length);
  const generic = health.filter((u) => !professionsOfFields(fieldsOf(u)).length), lightOf = (u) => light[u.name] ?? null;
  const lightFound = generic.filter((u) => lightOf(u)?.state === "FOUND").map((u) => ({ u, professions: lightOf(u).professions, from: "light", light: lightOf(u) }));
  const lightNone = generic.filter((u) => lightOf(u) && lightOf(u).state !== "FOUND"), lightPending = generic.filter((u) => !lightOf(u));
  const destFor = (profs) => reqCountries.map((c) => ({ country: c, regulators: regulator.filter((p) => p.country === c && p.professions.some((q) => profs.includes(q))) })).filter((d) => d.regulators.length);
  const candidates = [...named, ...lightFound], withFacts = candidates.filter((x) => destFor(x.professions).length), noFacts = candidates.filter((x) => !destFor(x.professions).length);
  const titles = new Map(); for (const x of withFacts) { const t = universityTitle(subject, [x.u], x.u.country); titles.set(t, (titles.get(t) ?? 0) + 1); }
  const university = withFacts.map((x) => {
    const profs = x.professions, dest = destFor(profs), home = section(x.u.country), t0 = universityTitle(subject, [x.u], x.u.country), title = titles.get(t0) > 1 ? `${t0} (${x.u.country})` : t0;
    return { kind: "university", title, country: x.u.country, professions: profs, from: x.from, uni: { name: x.u.name, city: x.u.city ?? null, page: x.u.page ?? null, type: x.u.type ?? null, language: x.u.language ?? null, accreditation: x.u.accreditation?.body ? String(x.u.accreditation.body).split(/\s+—\s+/)[0].slice(0, 120) : null, fields: fieldsOf(x.u), verifiedOn: x.u.verifiedOn ?? null },
      destinations: dest.map((d) => ({ country: d.country, count: d.regulators.length, regulators: d.regulators.slice(0, 2).map((p) => ({ title: p.title, grade: gradeLine(p.confirmedGrade ?? p.grade) })) })), home: { country: home.country, venue: home.venue, fee: home.fee, council: home.council ? { council: home.council.council, url: home.council.verificationUrl ?? home.council.councilUrl } : null },
      links: dest.flatMap((d) => d.regulators.slice(0, 1).map((p) => p.title)),
      claims: [{ claimId: `uni-${String(x.u.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`, text: x.from === "list" ? `${plainName(x.u.name)} teaches ${profs.join(", ")} (AlmiStudy's data, checked ${x.u.verifiedOn ?? "?"}).` : `${plainName(x.u.name)}'s own site names ${x.light.words.slice(0, 2).join("; ")} — ${profs.join(", ")} (read ${x.light.checkedOn ?? on}).`, link: x.from === "list" ? x.u.source?.url ?? x.u.page : x.light.source?.url ?? x.u.page, readOn: x.from === "list" ? x.u.verifiedOn : x.light.checkedOn ?? on, source: x.from === "list" ? "AlmiStudy's data" : `${plainName(x.u.name)} — its own site`, official: x.from !== "list", body: x.from === "list" ? "AlmiStudy" : x.u.name },
        ...dest.slice(0, 2).map((d) => d.regulators[0].claims[0]).filter(Boolean), councilOf(x.u.country, profs)?.claim].filter((c) => c?.link && c.readOn),
      why: `its graduates in ${profs.join(", ")} — ${dest.length} destination${dest.length === 1 ? "" : "s"} where a regulator accepts ${subject} for ${profs.length === 1 ? "it" : "them"}${x.from === "light" ? " (its professions found by the light check of its own site)" : ""}`, questions: [] };
  });
  /* ── every question to the ONE page whose answer it needs ── */
  const topics = new Map(), unused = [];
  for (const g of groups) {
    /* RR-323: the client's Keyword Planner keywords are clustered by their need below (desktop/demand.mjs) — not routed one by one here */
    if ((g.sources ?? []).length && g.sources.every((s) => s.kind === "tool")) continue;
    const q = [g.question, ...(g.also ?? [])].join(" "), dest = destinationsIn(q).filter((c) => reqCountries.includes(c)), orig = [...new Set([...originsIn(q), ...countriesIn(q)])].filter((c) => !reqCountries.includes(c) || TAKING.test(q)), prof = professionIn(q), sub = SUBTESTS.find((s) => new RegExp(`\\b${s}\\b`, "i").test(q));
    let page = null, sec = null;
    /* a question naming a regulator ("oet score for nmbi") is that regulator's page */
    page = regulator.find((p) => callNames({ short: p.short, name: p.body }).some((n) => names(q, n))) ?? null;
    if (!page && sub && prof) page = subtest.find((p) => p.subtest === sub && p.profession === prof) ?? null;
    if (!page && UNIVERSITY.test(q)) page = university.find((p) => names(q, plainName(p.uni.name)) || (shortOf(p.uni.name) && names(q, shortOf(p.uni.name)))) ?? null;
    /* taking it in a country (D7: "OET exam in Bangladesh"): a section of "Where to take", never a page of its own */
    if (!page && (TAKING.test(q) || (orig.length && !dest.length && !prof))) { const c = orig[0] ?? null; page = where; if (c) { sec = c; if (!vset.has(c) && !where.sections.some((s) => s.country === c)) where.sections.push(section(c, true)); } }
    if (!page && dest.length) { const cands = regulator.filter((p) => p.country === dest[0] && (!prof || p.professions.includes(prof))); page = cands.sort((a, b) => b.professions.length - a.professions.length)[0] ?? null; if (!page && prof) { unused.push({ name: g.question, why: `no regulator in ${subject}'s list accepts it for ${prof} in ${dest[0]}` }); continue; } }
    if (page) { page.questions.push({ ...g, section: sec ?? prof }); g.page = page.title; continue; }
    const t = TOPICS.find(([, re]) => re.test(q)), key = t ? t[0] : `q:${g.question.toLowerCase()}`;
    const title = t ? t[2](subject) : cap(g.question.replace(/\?$/, ""));
    const tp = topics.get(key) ?? { kind: "topic", title, claims: [], why: t ? `the questions about ${t[0]} — no country or profession changes this answer` : "a question of its own", questions: [] };
    for (const s of g.sources ?? []) if (s.kind === "official FAQ" && s.link && s.on && !tp.claims.some((c) => c.link === s.link)) tp.claims.push({ claimId: `faq-${tp.claims.length}-${key.replace(/[^a-z]+/g, "-").slice(0, 30)}`, text: `${subject}'s own FAQ answers this question.`, link: s.link, readOn: s.on, source: s.source, official: true, body: subject });
    if (t?.[0] === "fees" && feeClaim && !tp.claims.includes(feeClaim)) tp.claims.unshift(feeClaim);
    tp.questions.push(g); g.page = tp.title; topics.set(key, tp);
  }
  /* ── RR-323 · PRACTICE: profession × sub-test × intent (owner decision 4) — the format from the subject's own pages, the grades asked,
   * and an ORIGINAL practice sample written for the client (never an official paper; checked against what was read — desktop/samples.mjs) ── */
  const fact = (k) => facts[k] ?? null, factsOf = (keys) => keys.map(fact).filter(Boolean);
  const sampleLink = (prof) => { const slug = (prof ?? "").replace(/\s+/g, "-"), u = (subjectPages.urls ?? []).filter((x) => /sample-tests/.test(x) && (!prof || x.endsWith(`/${slug}`))).sort((a, b) => a.length - b.length)[0]; return u ? { claimId: `samples-${slug || "all"}`, text: `${subject}'s own free sample tests${prof ? ` for ${PEOPLE_WORD[prof] ?? prof}` : ""} (official — on its own site).`, link: u, readOn: subjectPages.on, source: `${subject} — its own site`, official: true, body: subject, pointer: true } : null; };
  const required = (prof, s) => (prof ? subtest.find((x) => x.profession === prof && x.subtest === s)?.required ?? [] : []);
  const practiceTitle = (intent, s, prof) => { const who = prof ? (PEOPLE_WORD[prof] ?? prof) : null;
    if (intent === "tips") return s ? `${subject} ${s} tips${who ? ` for ${who}` : ""}: the common mistakes` : `${subject} tips: how to pass and the common mistakes`;
    if (!s) return who ? `${subject} practice test for ${who}` : `${subject} practice test: a free sample for every sub-test`;
    if (s === "Writing") return `${subject} Writing sample${who ? ` for ${who}` : ""}: case notes and a model letter`;
    if (s === "Speaking") return `${subject} Speaking sample${who ? ` for ${who}` : ""}: a role-play to practise`;
    return `${subject} ${s} practice test (a free sample)`; };
  const PRACTICE_UNIVERSE = [...["sample", "tips"].flatMap((intent) => [...["Writing", "Speaking"].flatMap((s) => [null, ...professions].map((prof) => [intent, s, prof])), [intent, "Listening", null], [intent, "Reading", null], [intent, null, null]]), ...professions.map((prof) => ["sample", null, prof])];
  const practice = PRACTICE_UNIVERSE.map(([intent, s, prof]) => {
    const key = `practice|${intent}|${s ?? "-"}|${prof ?? "-"}`, sm = ai.samples?.[key] ?? null, hub = intent === "sample" && !s;
    const fs = s ? factsOf(FACTS_FOR[s] ?? []) : factsOf(["listeningMarks", "readingMarks", "writingWords", "speakingRoleplay", "practiceEvery", "gradeB"]);
    const p = { kind: "practice", key, intent, subtest: s, profession: prof, title: practiceTitle(intent, s, prof), required: s ? required(prof, s) : [], ai: ai.practice?.[key] ?? null, sample: sm?.check?.ok ? (by ? { ...sm, label: labelOf(by, subject) } : sm) : null, /* RR-324 D2: labelled in today's display name */ sampleCheck: sm?.check ?? null, questions: [], kpRanges: [],
      claims: [...fs, sampleLink(prof)].filter(Boolean), why: hub ? `the practice hub${prof ? ` for ${PEOPLE_WORD[prof] ?? prof}` : ""}: every sub-test's format and its practice page` : `${intent === "tips" ? "tips and common mistakes" : "an original practice sample"} for ${s}${prof ? ` (${PEOPLE_WORD[prof] ?? prof})` : ""}` };
    if (hub) { p.head = ["Sub-test", "Format (the subject's own pages)"]; p.rows = SUBTESTS.map((x) => [x, factsOf(FACTS_FOR[x] ?? []).slice(0, 2).map((c) => c.text.replace(new RegExp(`^${subject}'s own page:? `), "")).join(" ") || "see its practice page"]); }
    if (intent === "sample" && s) p.waitFor = !sm ? "its practice sample is not written yet — your AI writes it (original, never copied)" : !sm.check?.ok ? `its sample did not pass the originality check: ${sm.check?.why ?? "not checked"}` : null;
    return p;
  });
  /* ── RR-323 · DEMAND FIRST: the client's Keyword Planner keywords, clustered (desktop/demand.mjs) — each cluster to the ONE page it asks for ── */
  const regNames = regulator.map((p) => ({ key: p.listId ?? p.title, page: p, names: callNames({ short: p.short, name: p.body }).map((x) => x.toLowerCase()).filter((x) => x.length >= 3) }));
  const demand = clusterKeywords(items.filter((x) => x.kind === "tool"), { regulators: regNames, subject });
  const DT = { fees: ["fees"], booking: ["booking", `How to book ${subject} and the test dates`], results: ["results", `${subject} results: when they come out`], scores: ["scoring"], computer: ["computer"], prep: ["preparation"], vs: ["versus"], format: ["about", `What is ${subject}: the four sub-tests, the time and the scores`], countries: ["countries", `Which countries accept ${subject}, and the score each asks`] };
  const topicFor = (key, title) => { const t = TOPICS.find(([k]) => k === key); const tp = topics.get(key) ?? { kind: "topic", title: t ? t[2](subject) : title, claims: [], why: `the searches about ${key} — no country or profession changes this answer`, questions: [] }; topics.set(key, tp); return tp; };
  const kwPage = new Map(); // keyword → the page it landed on (the question count's lines)
  for (const c of demand.clusters) {
    let page = null, sec = null;
    if (c.intent === "regulator") page = regNames.find((r) => r.key === c.regulator)?.page ?? null;
    else if (c.intent === "requirement") page = regulator.filter((p) => p.country === c.countries[0] && p.professions.includes(c.profession) && !p.sectionOf).sort((a, b) => b.professions.length - a.professions.length)[0] ?? null;
    else if (c.intent === "where") page = where;
    else if (c.intent === "subtest" && c.profession) page = subtest.find((p) => p.subtest === c.subtest && p.profession === c.profession) ?? null;
    else if (c.intent === "sample" || c.intent === "tips") page = practice.find((p) => p.key === c.key) ?? null;
    else if (c.intent === "profession") page = null; // its hub below (the hubs are built after)
    else if (c.intent === "country") page = null;
    else { const [key, title] = c.key.startsWith("subtest-info|") ? [c.subtest.toLowerCase(), null] : DT[c.intent] ?? [c.intent, cap(c.top)]; page = topicFor(key, title); page.intent = c.key.startsWith("subtest-info|") ? c.subtest : c.intent; }
    if (page?.sectionOf) page = regulator.find((p) => p.title === page.sectionOf) ?? page; // a board's search → its parent's page
    c.page = page?.title ?? null; c.sec = sec;
    if (!page) continue;
    page.questions.push(...c.keywords.map((k) => ({ question: k.text, also: [], sources: [{ kind: "tool", volume: { estimate: k.range?.said ?? 0 }, label: "Keyword Planner" }], weight: k.range?.high ?? 0 })));
    (page.kpRanges ??= []).push(...c.keywords.map((k) => k.range)); (page.clusters ??= []).push(c.key);
    for (const k of c.keywords) kwPage.set(k.text, page.title);
  }
  /* RR-323 proof: "OET Writing" and "OET Writing sample" answered with the same facts — the site planner made one a section of the other
   * ("a second page would compete"). A sub-test's general searches ("oet writing", "oet writing test") go to its ONE practice page */
  for (const s of SUBTESTS) { const tp = topics.get(s.toLowerCase()), pp = practice.find((p) => p.intent === "sample" && p.subtest === s && !p.profession); if (!tp || !pp) continue;
    pp.questions.push(...tp.questions); (pp.kpRanges ??= []).push(...(tp.kpRanges ?? [])); for (const g of tp.questions) if (kwPage.has(g.question)) kwPage.set(g.question, pp.title); for (const c of demand.clusters) if (c.page === tp.title) c.page = pp.title; topics.delete(s.toLowerCase()); }
  const topic = [...topics.values()]; for (const tp of topic) tp.ai = ai.topics?.[tp.title] ?? null;
  /* the demand topics' facts — the subject's own pages, each fact with its page and date (only what a page states) */
  for (const tp of topic) { const keys = FACTS_FOR[tp.intent] ?? (tp.intent && SUBTESTS.includes(tp.intent) ? FACTS_FOR[tp.intent] : null) ?? []; for (const f of factsOf(keys)) if (!tp.claims.some((c) => c.claimId === f.claimId)) tp.claims.push(f); }
  { const ct = topics.get("countries"); if (ct) { ct.lead = `${subject} is accepted by a named body in ${rec.accepted.length} countries, and a health regulator in ${reqCountries.length} of them asks for it to register (${subject}'s own list, read ${rec.on}).`; ct.head = ["Country", "Regulators", "Who"]; ct.rows = rec.requirement.map((r) => [r.country, String(r.regulators), [...new Set(regulator.filter((p) => p.country === r.country).flatMap((p) => p.professions))].map((x) => PEOPLE_WORD[x] ?? x).slice(0, 6).join(", ")]); ct.claims.push({ claimId: "countries-list", fact: "countries", text: `${subject}'s own list of recognising organisations names a body in ${rec.accepted.length} countries (AlmiOET's copy, read ${rec.on}).`, link: rec.page ?? subjectPages.urls?.find((u) => /recogni/.test(u)) ?? null, readOn: rec.on, source: `${subject}'s list`, official: true, body: subject }); ct.claims = ct.claims.filter((c) => c.link); } }
  { const at = topics.get("about"), withMin = SUBTESTS.filter((s) => subtests[s]?.minutes); if (at && withMin.length) { at.lead = `${subject} is the English test for healthcare work, in four sub-tests: ${withMin.map((s) => `${s} (about ${subtests[s].minutes} minutes)`).join(", ")} (${subject}'s own pages, ${subtests[withMin[0]].on}).`; at.head = ["Sub-test", "Time", "What it is"]; at.rows = SUBTESTS.map((s) => [s, subtests[s]?.minutes ? `about ${subtests[s].minutes} minutes` : "see its page", factsOf(FACTS_FOR[s] ?? []).slice(0, 1).map((c) => c.text.replace(new RegExp(`^${subject}'s own page:? `), "")).join("") || "—"]); for (const s of withMin) at.claims.push({ claimId: `about-${s.toLowerCase()}`, fact: "format", text: `${subject}'s own page: ${s} takes about ${subtests[s].minutes} minutes.`, link: subtests[s].link, readOn: subtests[s].on, source: `${subject} — its own page`, official: true, body: subject }); } }
  { const ft = topics.get("fees"); if (ft) { ft.head = ["Country", "The fee"]; ft.rows = where.sections.filter((s) => s.venue).map((s) => [s.country, String(s.fee)]); if (feeClaim && !ft.claims.includes(feeClaim)) ft.claims.unshift(feeClaim); } }
  /* RR-322 A5: a topic page may be explained by the client's AI; its ONE hard pointer is the subject's own page about it (its sitemap) */
  const POINTER = [[/fee|cost|price/i, /fee|price|book-a-test|at-home/], [/scor|result|grade|valid/i, /results-and-scoring|scor/], [/test day|bring/i, /test-day/], [/computer|home|online/i, /on-computer|at-home/], [/listening/i, /ready\/listening/], [/reading/i, /ready\/reading/], [/writing/i, /ready\/writing/], [/speaking/i, /ready\/speaking/], [/prepar|study|practi|tips|sample/i, /sample-tests$|ready$/], [/ielts|pte|toefl|versus|compare/i, /about|why-oet|oet-test$/]];
  for (const tp of topic.filter((x) => !x.claims.length && subjectPages.urls?.length)) {
    const want = POINTER.find(([re]) => re.test(`${tp.title} ${tp.questions.map((g) => g.question).join(" ")}`))?.[1];
    const url = (want ? subjectPages.urls.filter((u) => want.test(u)).sort((a, b) => a.length - b.length)[0] : null) ?? subjectPages.faq ?? null;
    if (url) tp.claims.push({ claimId: `pointer-${tp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`, text: `${subject}'s own page about this: ${new URL(url).pathname}.`, link: url, readOn: subjectPages.on, source: `${subject} — its own site`, official: true, body: subject, pointer: true });
  }
  /* D5 · the Where page: a fact per country section, each central bank's rate, each home council */
  const rateClaims = new Map(); for (const s of where.sections) for (const st of s.steps) if (!rateClaims.has(`${st.short}|${st.to}`)) rateClaims.set(`${st.short}|${st.to}`, { claimId: `rate-${st.short.toLowerCase()}-${st.to.toLowerCase()}`, text: `${st.source}: 1 ${st.from} = ${st.said} ${st.to} on ${st.rateDate}${st.peg ? " (the official peg)" : ""} (the fee in ${st.to} is an estimate from it, not an official price).`, link: st.link, readOn: st.rateDate, source: st.source, official: true, body: st.short });
  const sectionClaims = where.sections.map((s) => ({ claimId: `section-${s.country.toLowerCase().replace(/[^a-z]+/g, "-")}`, text: `${s.country}: ${s.venue ? `${subject}'s own page names a venue there` : s.says}${s.nearest?.length ? ` — the nearest venues: ${s.nearest.join(", ")}` : ""}. The fee: ${s.fee}.`, link: s.venue ? s.source.url : venues.home?.url ?? s.source?.url ?? null, readOn: s.venue ? s.checkedOn : venues.home?.checkedOn ?? on, source: `${subject} — its own page`, official: true, body: subject, section: s.country })).filter((c) => c.link && c.readOn);
  where.claims = [where.claims[0], ...sectionClaims, ...where.claims.slice(1), ...rateClaims.values(), ...where.sections.map((s) => s.council?.claim).filter(Boolean)].filter(Boolean);
  /* ── HUBS: one per destination country, one per profession, and the index of hubs ── */
  const countryHub = reqCountries.map((c) => { const regs = regulator.filter((p) => p.country === c); return { kind: "hub", key: `country|${c}`, country: c, title: `${subject} in ${inCountry(c)}: every regulator and the grades it asks`, keepWhole: true, intro: `${regs.length} regulator${regs.length === 1 ? "" : "s"} in ${inCountry(c)} accept ${subject} — for ${[...new Set(regs.flatMap((p) => p.professions))].map((x) => PEOPLE_WORD[x] ?? x).join(", ")}. Each one's grades are below, with ${subject}'s list or the regulator's own page as the source; open a regulator's page for its steps.`, head: ["Regulator", "Professions", "Grades"], rows: regs.map((p) => [p.body, p.professions.map((x) => PEOPLE_WORD[x] ?? x).join(", "), gradeLine(p.confirmedGrade ?? p.grade) ?? "see its page"]), claims: regs.slice(0, 3).map((p) => p.claims[0]).filter(Boolean), questions: [], why: `the hub of ${c}'s regulator pages` }; });
  const professionHub = professions.map((prof) => { const regs = regulator.filter((p) => p.professions.includes(prof)), people = PEOPLE_WORD[prof] ?? prof; return { kind: "hub", key: `profession|${prof}`, profession: prof, title: `${subject} for ${people}: every country, its regulator and grades`, keepWhole: true, intro: `${cap(people)} can use ${subject} with ${regs.length} regulator${regs.length === 1 ? "" : "s"} in ${new Set(regs.map((p) => p.country)).size} countries. Each regulator's grades are below with their source; the four sub-test pages for ${people} explain how to prepare.`, head: ["Country", "Regulator", "Grades"], rows: regs.map((p) => [p.country, p.body, gradeLine(p.confirmedGrade ?? p.grade) ?? "see its page"]), claims: regs.slice(0, 3).map((p) => p.claims[0]).filter(Boolean), questions: [], why: `the hub of every page for ${people}` }; });
  const hubs = [...countryHub, ...professionHub];
  /* RR-323: "oet for nurses", "oet nhs" — a profession's or a destination's searches are its hub's (a country with no regulator rule: Where to take) */
  for (const c of demand.clusters.filter((x) => (x.intent === "profession" || x.intent === "country") && !x.page)) {
    const page = c.intent === "profession" ? professionHub.find((h) => h.profession === c.profession) : countryHub.find((h) => h.country === c.country) ?? where;
    if (!page) continue; c.page = page.title;
    page.questions.push(...c.keywords.map((k) => ({ question: k.text, also: [], sources: [{ kind: "tool", volume: { estimate: k.range?.said ?? 0 }, label: "Keyword Planner" }], weight: k.range?.high ?? 0 })));
    (page.kpRanges ??= []).push(...c.keywords.map((k) => k.range)); for (const k of c.keywords) kwPage.set(k.text, page.title);
  }
  const index = { kind: "index", title: `${subject} guides: every country and profession`, keepWhole: true, intro: `Every ${subject} guide on this site, by country and by profession.`, head: ["Guide"], rows: hubs.map((h) => [h.title]), claims: hubs.flatMap((h) => h.claims.slice(0, 1)).slice(0, 3), questions: [], why: "the one page linking every hub — every page within three clicks of the home page" };
  /* ── THE THREE GATES (desktop/pseo.mjs) ── */
  /* gate 3's kept page names every page it covers: "OET score for nurses in the United States: 14 regulators"; "OET for graduates of A, B …" */
  const retitle = (p) => {
    const n = p.covers.length, people = (p.professions ?? []).map((x) => PEOPLE_WORD[x] ?? x);
    if (p.kind === "regulator") { p.title = `${subject} ${people.length > 1 ? "scores" : "score"} for ${people.length > 2 ? "health professionals" : people.join(" and ")} in ${inCountry(p.country)}: ${n} regulators`; p.coverNames = p.covers.map((q) => q.body); p.claims = [...p.claims, ...p.covers.slice(1, 20).map((q) => q.claims.find((c) => c.fromList)).filter(Boolean)]; p.why = `${n} regulators in ${inCountry(p.country)} ask the same — one page, a row each`; }
    if (p.kind === "university") { const nm = p.covers.map((q) => shortOf(q.uni.name) ?? plainName(q.uni.name)); p.title = [`${subject} for graduates of ${nm.slice(0, 2).join(" and ")}${n > 2 ? ` and ${n - 2} more` : ""}${p.uni.city ? ` (${p.uni.city})` : ""}`, `${subject} for graduates of ${nm[0]} and ${n - 1} more universities`].find((t) => t.length <= 70) ?? `${subject} for graduates of ${n} universities in ${inCountry(p.country)}`; p.coverNames = p.covers.map((q) => q.uni.name); p.why = `${n} universities with the same answer (city, professions, destinations) — one page, a section each`; }
  };
  const practiceHub = practice.find((p) => p.intent === "sample" && !p.subtest && !p.profession);
  const families = runGates({ regulator, subtest, practice, university, taking: [where], topic, hub: hubs }, { retitle, parentOf: (p) => p.kind === "practice" ? (p.profession ? practice.find((q) => q.intent === "sample" && !q.subtest && q.profession === p.profession)?.title : practiceHub?.title) : p.kind === "regulator" ? countryHub.find((h) => h.country === p.country)?.title : p.kind === "subtest" ? professionHub.find((h) => h.profession === p.profession)?.title : p.kind === "university" ? countryHub[0]?.title : index.title });
  /* C3 · the university pages' own guides, A–Z, 100 a page (never a page per origin country — E1): home → index → A–Z → a university */
  const unis = [...families.university.pages].sort((a, b) => a.title.localeCompare(b.title)), uniIndex = [];
  /* a tail of fewer than 20 joins the part before it (the proof: "part 12" held one university and had 1 link) */
  for (let i = 0, size; i < unis.length; i += size) { size = unis.length - i - 100 < 20 ? unis.length - i : 100; const part = unis.slice(i, i + size), first = part[0].title.replace(new RegExp(`^${subject} for (graduates of )?`), "").charAt(0).toUpperCase(), last = part.at(-1).title.replace(new RegExp(`^${subject} for (graduates of )?`), "").charAt(0).toUpperCase();
    uniIndex.push({ kind: "hub", key: `universities|${i}`, title: `${subject} for university graduates: ${first === last ? first : `${first}–${last}`}${unis.length > 100 ? ` (part ${i / 100 + 1})` : ""}`, keepWhole: true, fixedLinks: true, links: part.map((p) => p.title), intro: `${part.length} universities whose graduates in a health profession can use ${subject} — each one's page gives every destination's regulator and grade.`, head: ["University", "Country"], rows: part.map((p) => [p.title, p.country]), claims: part.slice(0, 2).flatMap((p) => p.claims.slice(0, 1)), questions: [], status: "opportunity", dataPoints: part.map((p) => ({ label: p.title, value: p.country })), why: "a guide of university pages, so each is within three clicks of the home page" }); }
  families.hub.pages.push(...uniIndex); hubs.push(...uniIndex);
  /* RR-323: the practice hub ("OET practice test: a free sample for every sub-test") links every practice page and is linked from the index */
  if (practiceHub?.status && !["section", "merged"].includes(practiceHub.status)) { const kids = families.practice.pages.filter((p) => p !== practiceHub); practiceHub.fixedLinks = true; practiceHub.links = [...kids.map((p) => p.title), ...families.topic.pages.filter((t) => SUBTESTS.includes(t.intent)).map((t) => t.title)]; hubs.push(practiceHub); for (const p of kids) p.links = [practiceHub.title, ...(p.links ?? [])]; }
  index.rows = hubs.map((h) => [h.title]);
  const kept = Object.values(families).flatMap((f) => f.pages);
  /* ── LANGUAGES: the strongest pages, in a language people ask in (of the client's chosen ones) ── */
  const langs = languageDemand(items, languages), language = [];
  /* RR-323 decision 8: English first — a page is made in another language only after its English page is INDEXED and showing impressions */
  const canTranslate = new Set(translatable ?? []);
  for (const l of langs.filter((x) => x.chosen)) for (const base of strongForLanguage(kept, l.questions.length).filter((b) => canTranslate.has(b.title))) language.push({ kind: "language", lang: l.code, base: base.title, title: ai.translations?.[`${l.code}|${base.title}`]?.title ?? `${base.title} (${LANG_NAME[l.code] ?? l.code})`, translated: Boolean(ai.translations?.[`${l.code}|${base.title}`]), country: base.country, profession: base.profession, claims: base.claims, dataPoints: base.dataPoints, questions: l.questions.slice(0, 6).map((q) => ({ question: q, also: [], sources: [{ kind: "search" }] })), status: "demand", why: `${l.questions.length} question${l.questions.length === 1 ? "" : "s"} people ask in ${LANG_NAME[l.code] ?? l.code}; the strongest page made in it (its facts and their sources unchanged)` });
  const pages = [...kept, ...language, index];
  /* ── LINKS + DEPTH ── */
  const linkCheck = linkPages(pages, hubs, families.topic.pages, index);
  /* E4 · each page shows when its sources were last checked (its OLDEST fact's date) */
  for (const p of pages) { p.questions ??= []; p.weak = p.questions.length === 0; p.searched = p.questions.some(searched); p.main = p.questions[0]?.question ?? null; p.lastChecked = (p.claims ?? []).map((c) => c.readOn).filter(Boolean).sort()[0] ?? null; }
  /* ── CONTENT (B6–B7) ── */
  for (const p of pages) p.content = contentOf(p, { subject, fee, where: where.title, cta, on });
  /* a page in another language: its AI translation (facts and sources unchanged), or the English page marked "not translated yet" */
  const byBase = new Map(kept.map((p) => [p.title, p]));
  for (const p of language) { const tr = ai.translations?.[`${p.lang}|${p.base}`]; p.content = tr?.content ? { ...byBase.get(p.base).content, ...tr.content, lang: p.lang } : { ...byBase.get(p.base).content, lang: p.lang, untranslated: true }; }
  for (const p of pages) if (p.covers) p.covers = p.covers.map((q) => ({ title: q.title, body: q.body ?? null, university: q.uni?.name ?? null, grade: q.confirmedGrade ?? q.grade ?? null, confirmed: Boolean(q.confirmed) })); // saved as plain rows
  const reachMap = new Map(); for (const r of byCountry) { const k = String(r.query ?? "").toLowerCase(); const x = reachMap.get(k) ?? { countries: new Set(), impressions: 0 }; x.countries.add(r.country); x.impressions += r.impressions ?? 0; reachMap.set(k, x); }
  const reach = (p) => { const qs = (p.questions ?? []).flatMap((g) => [g.question, ...(g.also ?? [])]).map((q) => reachMap.get(String(q).toLowerCase())).filter(Boolean); return { countries: new Set(qs.flatMap((x) => [...x.countries])).size, impressions: qs.reduce((s, x) => s + x.impressions, 0) }; };
  for (const p of pages) p.reach = reach(p);
  /* RR-323: a page's search demand — the sum of its keywords' Google ranges (never an exact number) */
  for (const p of pages) { p.kp = sumRanges(p.kpRanges ?? []); delete p.kpRanges; }
  const batches = batchesOf(pages, reach);

  /* ── THE LEDGER: the one place every number lives ── */
  const F = families, fam = (k) => F[k] ?? { universe: 0, pages: [], sections: [], merged: [], counts: { demand: 0, opportunity: 0, waiting: 0 }, pattern: { share: 0, sample: 0, withDemand: 0 } };
  const n = {
    countries: 197, accepted: rec.accepted.length, requirement: reqCountries.length, professions: professions.length, combos: R.combos, pairs: R.pairs.length,
    regulators: regulator.length, regulatorPages: fam("regulator").pages.length, regulatorConfirmed: regulator.filter((p) => p.confirmed).length, regulatorWaiting: fam("regulator").counts.waiting,
    regulatorRead: regulator.filter((p) => p.read?.ok).length, regulatorNotRead: regulator.filter((p) => p.read && !p.read.ok).length, regulatorNotNamed: regulator.filter((p) => p.read && !p.read.ok && /does not name/.test(p.read.why ?? "")).length, regulatorBrowser: regulator.filter((p) => p.read?.browser).length,
    subtestUniverse: subtest.length, subtestPages: fam("subtest").pages.length,
    practiceUniverse: practice.length, practicePages: fam("practice").pages.length, practiceWaiting: fam("practice").counts.waiting, practiceDemand: fam("practice").counts.demand,
    kpKeywords: demand.keywords, kpKept: demand.kept, kpClusters: demand.clusters.length, kpOnPages: demand.clusters.filter((c) => c.page).length, kpBrand: demand.setAside.brand.length, kpNotAbout: demand.setAside.notAbout.length, kpUnclear: demand.setAside.unclear.length,
    regulatorByParent: regulator.filter((p) => p.confirmedBy).length, regulatorBoards: regulator.filter((p) => p.sectionOf).length,
    uniAll: universities.length, uniHealth: health.length, uniNamed: named.length, uniGeneric: generic.length, uniLightChecked: generic.length - lightPending.length, uniLightFound: lightFound.length, uniLightNone: lightNone.length, uniLightPending: lightPending.length,
    uniWithFacts: withFacts.length, uniPages: fam("university").pages.length,
    venueCountries: vset.size, askedNoVenue: where.sections.filter((s) => !s.venue).length, takingPages: fam("taking").pages.length,
    topicGroups: topic.length, topicPages: fam("topic").pages.length, hubPages: fam("hub").pages.length + 1, languagePages: language.length,
    sections: Object.values(F).reduce((s, f) => s + f.sections.length, 0), merged: Object.values(F).reduce((s, f) => s + f.merged.length, 0),
    demandPages: Object.values(F).reduce((s, f) => s + f.counts.demand, 0) + language.length, opportunityPages: Object.values(F).reduce((s, f) => s + f.counts.opportunity, 0),
    firstBatch: batches[0]?.length ?? 0, batches: batches.length,
  };
  n.total = n.regulatorPages + n.subtestPages + n.practicePages + n.uniPages + n.takingPages + n.topicPages + n.hubPages + n.languagePages;
  n.waiting = Object.values(F).reduce((s, f) => s + f.counts.waiting, 0);
  n.ready = n.total - n.waiting;
  const qc = sorted ? questionCount({ sorted, groups, pages, subject }) : null;
  if (qc) Object.assign(n, { questionsFound: qc.found, questionsKept: qc.kept, questionGroups: qc.groups, questionOwnPage: qc.ownPage, questionInside: qc.inside, questionsNotAbout: qc.notAbout, menuLines: qc.menu });
  const tables = tablesOf({ n, subject, rec, R, regulator, families: F, universities, health, named, generic, lightFound, lightNone, lightPending, noFacts, where, vset, venues, topic, hubs, language, langs, demand, practice });
  const kinds = { regulator: fam("regulator").pages, subtest: fam("subtest").pages, practice: fam("practice").pages, university: fam("university").pages, taking: fam("taking").pages, topic: fam("topic").pages, hub: [...fam("hub").pages, index], language };
  const byTitle = new Map(pages.map((p) => [p.title, p]));
  const rollout = { batches: batches.map((b) => b.length), batchTitles: batches, first: batches[0] ?? [], firstWhy: (batches[0] ?? []).map((t) => { const p = byTitle.get(t); return { title: t, kind: p.kind, status: p.status, links: p.links ?? [], range: p.kp?.label ?? null, keywords: (p.questions ?? []).filter((g) => g.sources?.some((s) => s.kind === "tool")).length, why: (p.kp ? `Keyword Planner ${p.kp.label} searches a month (Google's ranges, ${(p.questions ?? []).filter((g) => g.sources?.some((s) => s.kind === "tool")).length} keywords) · ` : "") + (p.reach.countries ? `searched from ${p.reach.countries} countr${p.reach.countries === 1 ? "y" : "ies"} (${fmt(p.reach.impressions)} time${p.reach.impressions === 1 ? "" : "s"} seen)` : p.status === "demand" ? `demand: ${(p.demand ?? []).join(", ") || "asked in a language"}` : `${p.status} page · ${p.dataPoints?.length ?? 0} data points`) }; }), size: batches[0]?.length ?? 0, later: n.ready - (batches[0]?.length ?? 0),
    byKind: Object.fromEntries(Object.keys(kinds).map((k) => [k, (batches[0] ?? []).filter((t) => byTitle.get(t)?.kind === k).length])),
    line: `The first ${batches[0]?.length ?? 0} of ${fmt(n.ready)} ready pages — the most-searched first. Then ${BATCH_SIZES.slice(1).join(", ")} …: the next batch only when the last one is 80% indexed within 4 weeks; below 70% at 4 weeks Visibility stops and shows why.` };
  const templates = Object.fromEntries(Object.entries(kinds).filter(([, xs]) => xs.length >= 2).map(([k, xs]) => [k, templateCheck(xs)]));
  return { list: true, kinds, numbers: n, tables, total: n.total, questionCount: qc, unused, rollout, practiceKeys: Object.fromEntries(practice.map((p) => [p.title, p.key])), demand: { line: demand.line, clusters: demand.clusters.map((c) => ({ key: c.key, top: c.top, keywords: c.keywords.length, range: c.demand?.label ?? null, page: c.page })), setAside: demand.setAside }, whyNotMore: whyNotMoreOf(n, subject), stats, venuesHome: venues.home, linkCheck, templates, gates: Object.fromEntries(Object.entries(F).map(([k, f]) => [k, { universe: f.universe, pattern: { sample: f.pattern.sample, withDemand: f.pattern.withDemand, share: f.pattern.share, proven: f.pattern.proven, sampleTitles: f.pattern.sampleTitles }, pages: f.pages.length, sections: f.sections, merged: f.merged, counts: f.counts }])), languages: langs.map((l) => ({ code: l.code, questions: l.questions.length, chosen: l.chosen })),
    counts: Object.fromEntries(Object.entries(kinds).map(([k, xs]) => [k, { total: xs.length, withQuestions: xs.filter((p) => !p.weak).length, opportunity: xs.filter((p) => p.status === "opportunity").length, searched: xs.filter((p) => p.searched).length }])), countLine: countLine(rec, subject) };
}

/** B4 + B6 · one table per family, from the ledger; every row's list: what was kept, what was left out, and why */
function tablesOf({ n, subject, rec, R, regulator, families: F, universities, health, named, generic, lightFound, lightNone, lightPending, noFacts, where, vset, venues, topic, hubs, language, langs, demand = { clusters: [], setAside: { brand: [], notAbout: [], unclear: [] } }, practice = [] }) {
  const row = (step, num, why, kept = [], left = []) => ({ step, n: num, why, kept, left });
  const gateRows = (k) => { const f = F[k]; return [row(`Gate 1 · demand in ${f.pattern.sample} sample combinations`, Math.round(f.pattern.share * 100), `${f.pattern.withDemand} of ${f.pattern.sample} show demand — ${f.pattern.proven ? "the pattern is proven (60% or more)" : "below 60%: these pages are OPPORTUNITY pages, made after the demand pages"}`, f.pattern.sampleTitles.filter((x) => /^demand/.test(x.why)), f.pattern.sampleTitles.filter((x) => !/^demand/.test(x.why))), row(`Gate 2 · fewer than ${GATES.minData} data points → a section of a bigger page`, f.sections.length, "never a thin page", [], f.sections), row(`Gate 3 · more than ${Math.round(GATES.maxAlike * 100)}% alike → one page`, f.merged.length, "never a duplicate page", [], f.merged)]; };
  const pagesRow = (k, why) => row("Pages", F[k].pages.length, why, F[k].pages.map((p) => ({ name: p.title, why: `${p.status} · ${p.dataPoints.length} data points` })), []);
  return {
    regulator: { title: "Regulator pages", rows: [
      row(`Countries where ${subject} is accepted (a named body in ${subject}'s own list)`, n.accepted, `of the ${n.countries} countries — ${subject}'s own list, AlmiOET's copy read ${rec.on}`, rec.accepted.map((c) => ({ name: c.country, why: `${c.bodies} named: ${c.kinds}` })), rec.leftOut.map((x) => ({ name: x.name, why: x.why }))),
      row("…where a health regulator accepts it (a registration rule)", n.requirement, "an employer or a school accepting it is not a registration rule", rec.requirement.map((c) => ({ name: c.country, why: `${c.regulators} regulator${c.regulators === 1 ? "" : "s"}` })), rec.notRequirement),
      row(`${n.requirement} countries × ${n.professions} professions`, n.combos, "every combination — what multiplying gives", [], []),
      row(`…where a regulator accepts ${subject} for that profession`, n.pairs, `${subject}'s own list names the regulator and the profession`, R.pairs.map((x) => ({ name: `${x.profession} in ${x.country}`, why: x.bodies.join(", ") })), R.notAccepted),
      row("One page per regulator rule", R.pages.length, "its professions are sections of its one page", regulator.map((p) => ({ name: p.title, why: p.why })), R.noProfession),
      row("…its score confirmed on the regulator's own page", n.regulatorConfirmed, `${n.regulatorRead} read; ${n.regulatorByParent} confirmed by a parent body's own page whose one rule covers them (Ahpra for Australia's boards); ${n.regulatorNotRead - n.regulatorNotNamed} could not be read (${n.regulatorBrowser} on your AI's browser list) and ${n.regulatorNotNamed} do not name ${subject} on the pages reached`, regulator.filter((p) => p.confirmed).map((p) => ({ name: p.title, why: p.confirmedBy ? `confirmed by ${p.confirmedBy}'s own page` : p.read?.url ?? "" })), regulator.filter((p) => !p.confirmed).map((p) => ({ name: p.title, why: p.read ? p.read.why ?? "its own page names no score" : "not read yet — read while building" }))),
      ...gateRows("regulator"), pagesRow("regulator", `${n.regulatorWaiting} WAIT for a confirmed score — in the plan, never a ready draft`)] },
    /* RR-323 · the client's search-data file: keywords → clusters → pages, and what was set aside (each with its list) */
    demand: { title: "Your search-data file (Keyword Planner) — demand first", rows: [
      row("Keywords in your file", n.kpKeywords, "Google's ranges (an account with no ads sees 0 / 50 / 500 / 5,000 / 50,000) — shown as ranges, never exact", [], []),
      row("…set aside: a brand or a website people go to", n.kpBrand, "not our page (e2, Benchmark, the official site, a login …)", [], demand.setAside.brand),
      row(`…set aside: not about ${subject}`, n.kpNotAbout, `does not name ${subject}`, [], demand.setAside.notAbout),
      row("…set aside: no clear need", n.kpUnclear, "a word we cannot place, or a profession the test does not cover", [], demand.setAside.unclear),
      row("Clusters of the same meaning", n.kpClusters, `${fmt(n.kpKept)} keywords; "oet sample test", "sample oet exam" and "oet practice exam" are one`, demand.clusters.map((c) => ({ name: `${c.top} (+${c.keywords.length - 1})`, why: `${c.demand?.label ?? "0"} a month → ${c.page ?? "no page yet"}` })), []),
      row("…each answered on its one page", n.kpOnPages, "a cluster never gets two pages; a small one is a section of the page that answers it", demand.clusters.filter((c) => c.page).map((c) => ({ name: c.top, why: c.page })), demand.clusters.filter((c) => !c.page).map((c) => ({ name: c.top, why: "no page answers it yet" })))] },
    practice: { title: "Practice pages (profession × sub-test × intent)", rows: [
      row("Profession × sub-test × intent (sample / practice test, tips and mistakes)", n.practiceUniverse, "Writing and Speaking per profession; Listening and Reading are the same for every profession", [], []),
      ...gateRows("practice"), pagesRow("practice", `${n.practiceWaiting} WAIT for their original sample (written by your AI, checked against what was read — never an official paper)`)] },
    subtest: { title: "Sub-test pages (profession × sub-test)", rows: [
      row(`${n.professions} professions × ${SUBTESTS.length} sub-tests`, n.subtestUniverse, `each the sub-test's own facts (${subject}'s pages) and every regulator's grade in it for that profession`, [], []), ...gateRows("subtest"), pagesRow("subtest", "a page each where its data is its own")] },
    university: { title: "University pages (one per university)", rows: [
      row("Universities in the list", n.uniAll, "AlmiStudy's full data (read-only)", [], []),
      row("…that teach healthcare", n.uniHealth, "the list's own subjects", [], universities.filter((u) => !teachesHealth(u)).slice(0, 300).map((u) => ({ name: u.name, why: "teaches no healthcare subject in the list" }))),
      row("…the list names a profession for", n.uniNamed, "nursing, pharmacy … in the list itself", named.slice(0, 300).map((x) => ({ name: x.u.name, why: x.professions.join(", ") })), []),
      row(`…"medicine & health sciences" only — the light check of their own site`, n.uniGeneric, `${fmt(n.uniLightChecked)} checked so far: ${fmt(n.uniLightFound)} found a profession, ${fmt(n.uniLightNone)} not; ${fmt(n.uniLightPending)} wait (checked in the background, a batch at a time)`, lightFound.slice(0, 300).map((x) => ({ name: x.u.name, why: `${x.professions.join(", ")} — ${x.light.words.slice(0, 2).join("; ")}` })), [...lightNone.slice(0, 300).map((u) => ({ name: u.name, why: u.light?.why ?? "no profession found on its own site" })), ...lightPending.slice(0, 50).map((u) => ({ name: u.name, why: "not checked yet" }))]),
      row(`…whose professions a regulator accepts ${subject} for`, n.uniWithFacts, "these graduates have a destination answer", [], noFacts.slice(0, 300).map((x) => ({ name: x.u.name, why: `no regulator in ${subject}'s list accepts it for ${x.professions.join(", ")}` }))),
      ...gateRows("university"), pagesRow("university", "ONE page per university (owner)")] },
    taking: { title: `Where to take ${subject}`, rows: [
      row(`Countries where ${subject} can be taken (a venue on ${subject}'s own pages)`, n.venueCountries, `${subject}'s own venue pages, read ${venues.checked?.[0]?.on ?? ""}${venues.home ? `; ${venues.home.says}` : ""}`, [...vset.values()].map((v) => ({ name: v.name, why: v.source?.url ?? "" })), []),
      row("…and countries people ask about with no venue named", n.askedNoVenue, `said so, with the nearest venues (${REGIONS_SOURCE})`, where.sections.filter((s) => !s.venue).map((s) => ({ name: s.country, why: s.nearest.length ? `nearest: ${s.nearest.join(", ")}` : "no venue in its region either" })), []),
      row("Pages", n.takingPages, "ONE page, a section per country — no country gets a page of its own", [{ name: where.title, why: where.why }], [])] },
    topic: { title: "Topic pages", rows: [
      row(`Groups of real ${subject} questions no other page answers`, n.topicGroups, "same-meaning questions make one group", topic.map((p) => ({ name: p.title, why: `${p.questions.length} question group${p.questions.length === 1 ? "" : "s"}${p.ai ? " · explained by your AI" : ""}` })), []), ...gateRows("topic"), pagesRow("topic", "your AI may explain; only scores, fees, rules and dates need a source")] },
    hub: { title: "Hub pages", rows: [row("A hub per destination country, per profession, and the index", n.hubPages, "every page links its hub; every page within 3 clicks of the home page", hubs.map((h) => ({ name: h.title, why: `${h.links?.length ?? 0} pages linked` })), [])] },
    language: { title: "Pages in other languages", rows: [
      row("Languages people ask in (of your chosen ones)", langs.filter((l) => l.chosen).length, langs.length ? langs.map((l) => `${LANG_NAME[l.code] ?? l.code} ${l.questions.length}${l.chosen ? "" : " (not chosen)"}`).join(", ") : "no question in another language found yet", langs.map((l) => ({ name: LANG_NAME[l.code] ?? l.code, why: l.questions.slice(0, 3).join(" · ") })), []),
      row("Pages (only the strongest pages, where the language has demand)", n.languagePages, "English first (owner): a page is made in another language only after its English page is indexed and showing impressions — thin pages translated at scale are what Google punishes", language.map((p) => ({ name: p.title, why: p.why })), [])] },
  };
}

/** "why not more", from the ledger */
export function whyNotMoreOf(n, subject) {
  const naive = n.countries * n.professions * 4 + n.uniAll * n.requirement;
  return { product: naive, lines: [
    `Regulators: ${fmt(n.combos)} country × profession combinations → ${fmt(n.pairs)} where a regulator accepts ${subject} → ${fmt(n.regulatorPages)} pages, one per regulator rule (${fmt(n.regulatorWaiting)} wait for a confirmed score).`,
    `Sub-tests: ${fmt(n.subtestUniverse)} profession × sub-test combinations → ${fmt(n.subtestPages)} pages.`,
    `Universities: ${fmt(n.uniAll)} → ${fmt(n.uniHealth)} teach healthcare → ${fmt(n.uniNamed)} named + ${fmt(n.uniLightFound)} found by the light check (${fmt(n.uniLightPending)} not checked yet) → ${fmt(n.uniPages)} pages, one per university.`,
    `Topics: ${fmt(n.topicGroups)} groups → ${fmt(n.topicPages)} pages. Hubs: ${fmt(n.hubPages)}. Other languages: ${fmt(n.languagePages)}.`,
    ...(n.kpKeywords ? [`Your search-data file: ${fmt(n.kpKeywords)} keywords → ${fmt(n.kpClusters)} clusters of the same meaning (${fmt(n.kpBrand + n.kpNotAbout + n.kpUnclear)} set aside) → answered on ${fmt(n.kpOnPages)} pages — one page per need, never one per keyword.`] : []),
    `Practice: ${fmt(n.practiceUniverse ?? 0)} profession × sub-test × intent combinations → ${fmt(n.practicePages ?? 0)} pages (${fmt(n.practiceWaiting ?? 0)} wait for their original sample).`,
    `The gates: ${fmt(n.sections)} combinations too thin became sections of a bigger page; ${fmt(n.merged)} too alike became one page.`],
    line: `Not ${fmt(naive)} pages (every country × profession × sub-test, and every university × country): pages that differ only by a name are near-identical, and Google calls that scaled content abuse.` };
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
