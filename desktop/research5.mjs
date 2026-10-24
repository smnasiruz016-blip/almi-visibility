/**
 * 🔴 RR-320 B · THE 5-QUESTION RESEARCH, BEFORE ANY PAGE (owner, 23 Oct 2026, final): every international product is for all 197
 * countries; Visibility asks and SEARCHES these five itself, finds the answers, and only then plans pages from them:
 *   Q1 what is it used for, and how much (how many people take it, from which countries)?
 *   Q2 what do people in the 197 countries ask about it — per country, in their own words?
 *   Q3 in how many countries is it a requirement?
 *   Q4 from how many universities do people need it / apply with it?
 *   Q5 for how many job professions is it used?
 * A question that does not apply to a product says "does not apply"; the client adds his own questions in free text.
 * THE SEARCH METHOD is the one decided on 12 and 15 Oct (F11) — nothing new:
 *   · the client's OWN AI searching Google in the client's OWN browser — client-started, 30 a day, at least 20 s apart, stopping at once on
 *     a captcha. Visibility NEVER searches Google: it prepares the list, the client's AI hands in what it saw, and the F11 rules
 *     (src/discovery/search-phrase-sources.mjs, clientAiHandIn) accept or refuse the run;
 *   · plus the fast sources: Search Console (with its country dimension), Bing Webmaster and Keyword Planner FILES, and the client's AI
 *     (its research, said as an AI estimate). Pages never wait for the browser search — it enriches them later.
 * Every answer carries its source link and date; an official page is preferred; what people say is shown as "people say", never as fact; a
 * fact an official page does not state is "official page checked <date>, does not say".
 */
import { countryOfCode, countriesIn, COUNTRIES } from "./world.mjs";
import { tokens } from "./youtube-advice.mjs";
import { clientAiHandIn, keywordPlannerFile, bingKeywordResearch, CLIENT_AI_POLICY, SOURCES } from "../src/discovery/search-phrase-sources.mjs";

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
export const FIVE = Object.freeze([
  Object.freeze({ id: "q1", ask: "What is it used for, and how much — how many people take it, and from which countries?" }),
  Object.freeze({ id: "q2", ask: "What do people in the 197 countries ask about it — per country, in their own words?" }),
  Object.freeze({ id: "q3", ask: "In how many countries is it a requirement?" }),
  Object.freeze({ id: "q4", ask: "From how many universities do people need it, or apply with it?" }),
  Object.freeze({ id: "q5", ask: "For how many job professions is it used?" }),
]);
/* the label every answer line carries — what kind of source said it */
export const LABEL = Object.freeze({ official: "official page", search: "your Search Console", observed: "seen in Google by your AI, in your browser", tool: "a search tool's own estimate", people: "people say", ai: "AI estimate — not search data" });

/* ── Q2 · Search Console's COUNTRY dimension: which countries ask which questions ── */
/** rows { query, country (ISO alpha-3), impressions, clicks } → [{ country, searches, questions: [{ text, impressions }] }], the most first */
export function questionsByCountry(rows = [], { top = 6 } = {}) {
  const by = new Map();
  for (const r of rows) { const c = countryOfCode(r.country) ?? `other (${String(r.country ?? "").toUpperCase()})`; const x = by.get(c) ?? { country: c, impressions: 0, questions: [] }; x.impressions += r.impressions ?? 0; x.questions.push({ text: r.query, impressions: r.impressions ?? 0, clicks: r.clicks ?? 0 }); by.set(c, x); }
  return [...by.values()].map((x) => ({ ...x, searches: x.questions.length, questions: x.questions.sort((a, b) => b.impressions - a.impressions).slice(0, top) })).sort((a, b) => b.impressions - a.impressions);
}

/**
 * 🔴 RR-321 B1 + B5 + D4 · THE FIVE ANSWERS FROM THE LEDGER (desktop/plan-list.mjs `numbers`): they ALWAYS run, with no tick — for OET the
 * built-in lists apply (197 countries, its 12 professions, AlmiStudy's universities); a question is "does not apply" ONLY when the client
 * says so. Every number here is the ledger's own — the tables, "why not more" and the plan show the same ones (test/rr321).
 */
export function fiveFromList({ subject, plan, stats = null, byCountry = null, sc = null, items = [], own = [], notApply = [] }) {
  const n = plan.numbers, src = (label, title, url, on) => ({ label, title, url: url ?? null, on: on ?? null }), out = [];
  const na = (id) => ({ id, ask: FIVE.find((f) => f.id === id).ask, applies: false, answer: "Does not apply — you said so.", sources: [] });
  const T = plan.tables, rec = T.regulator.rows[0];
  /* Q1 */
  out.push(notApply.includes("q1") ? na("q1") : { id: "q1", ask: FIVE[0].ask, applies: true, n: stats?.nationalities?.length ?? null,
    answer: `For ${n.professions} healthcare professions, to register and work: accepted in ${n.accepted} countries, a registration requirement in ${n.requirement}. ${stats?.line ?? `${subject}'s statistics page was not read.`}`,
    nationalities: stats?.nationalities ?? [], sources: [...(stats?.sources ?? []).map((s) => src(LABEL.official, s.title ?? s.url, s.url, s.on)), src(LABEL.official, `${subject}'s list of recognising organisations`, plan.tables.regulator.rows[0] ? plan.kinds.regulator[0]?.source?.url : null, plan.kinds.regulator[0]?.checkedOn)] });
  /* Q2 */
  { const qc = plan.questionCount, obs = items.filter((x) => x.kind === "observed"), tool = items.filter((x) => x.kind === "tool");
    out.push(notApply.includes("q2") ? na("q2") : { id: "q2", ask: FIVE[1].ask, applies: true, n: byCountry?.length ?? null,
      answer: `${byCountry ? `${byCountry.length} of 197 countries search for it in your Search Console.` : "Search Console's country data is not read yet — connect Google again (it asks for no new permission)."} ${qc ? qc.line : ""}${obs.length ? "" : " Your AI's browser search has not run yet — it is ready (client-started, 30 a day)."}`,
      perCountry: (byCountry ?? []).slice(0, 40).map((c) => ({ country: c.country, searches: c.searches, impressions: c.impressions, questions: c.questions.map((q) => ({ text: q.text, impressions: q.impressions })), label: LABEL.search })),
      observed: obs.slice(0, 60).map((x) => ({ text: x.text, place: x.place, source: x.source, label: LABEL.observed })), tool: tool.slice(0, 60).map((x) => ({ text: x.text, place: x.place, volume: x.volume, source: x.source, label: LABEL.tool })),
      sources: [src(LABEL.search, `Search Console${sc?.window ? ` (${sc.window})` : ""}${byCountry ? ", by country" : ""}`, null, sc?.on)] }); }
  /* Q3 — the requirement countries from the subject's own list, and the regulators' own pages read while building (D4: one ledger) */
  out.push(notApply.includes("q3") ? na("q3") : { id: "q3", ask: FIVE[2].ask, applies: true, n: n.requirement,
    answer: `A registration requirement in ${n.requirement} countries — a health regulator there accepts it (${subject}'s own list). Accepted by a named body in ${n.accepted} countries in all. Regulators' own pages read while building: ${n.regulatorRead} of ${n.regulators ?? n.regulatorPages}${n.regulatorConfirmed !== undefined ? `; a score confirmed for ${n.regulatorConfirmed}, ${n.regulatorWaiting} pages wait for one` : ""}${n.regulatorNotRead ? ` (${n.regulatorNotRead - (n.regulatorNotNamed ?? 0)} could not be read, ${n.regulatorNotNamed ?? 0} do not name ${subject} on the pages reached — their pages are built from ${subject}'s list with "check here")` : ""}.`,
    list: T.regulator.rows[1].kept, sources: [src(LABEL.official, rec.why, plan.kinds.regulator[0]?.source?.url, plan.kinds.regulator[0]?.checkedOn)] });
  /* Q4 */
  out.push(notApply.includes("q4") ? na("q4") : { id: "q4", ask: FIVE[3].ask, applies: true, n: n.uniWithFacts,
    answer: `${n.uniHealth.toLocaleString("en-US")} of ${n.uniAll.toLocaleString("en-US")} universities in AlmiStudy's data teach healthcare; the list names a profession for ${n.uniNamed.toLocaleString("en-US")}, and the light check of their own sites found one for ${(n.uniLightFound ?? 0).toLocaleString("en-US")} more (${(n.uniLightPending ?? 0).toLocaleString("en-US")} not checked yet). ${n.uniWithFacts.toLocaleString("en-US")} teach one a regulator accepts ${subject} for — their graduates need it. ${n.uniPages.toLocaleString("en-US")} university pages, one per university.`,
    sources: [src("your list", "AlmiStudy's full data (read-only)", null, null)] });
  /* Q5 */
  { const pairs = T.regulator.rows[3].kept, per = [...new Set(pairs.map((x) => x.name.replace(/ in .*$/, "")))].map((p) => ({ profession: p, countries: pairs.filter((x) => x.name.startsWith(`${p} in `)).map((x) => x.name.replace(/^.* in /, "")) }));
    out.push(notApply.includes("q5") ? na("q5") : { id: "q5", ask: FIVE[4].ask, applies: true, n: n.professions, answer: `${n.professions} professions (${subject}'s own pages). Where a regulator accepts it: ${per.map((x) => `${x.profession} ${x.countries.length}`).join(" · ")}.`, perProfession: per, sources: [src(LABEL.official, `${subject}'s own profession pages and its list`, null, null)] }); }
  const pool = items.map((x) => ({ text: x.text, source: x.source, label: { search: LABEL.search, observed: LABEL.observed, tool: LABEL.tool, youtube: LABEL.people, "ai research": LABEL.ai, "official FAQ": LABEL.official }[x.kind] ?? x.kind }));
  const ownAnswers = own.map((q) => { const t = new Set(tokens(q.text)); const hits = pool.filter((x) => { const u = tokens(x.text); return u.filter((w) => t.has(w)).length >= Math.max(1, Math.ceil(t.size / 2)); }).slice(0, 8); return { id: q.id, ask: q.text, applies: true, answer: hits.length ? `${hits.length} things people search or ask match it.` : "Not answered yet — it is first on your AI's browser-search list.", matches: hits, sources: [] }; });
  return { questions: out, own: ownAnswers, on: new Date().toISOString().slice(0, 10), fromList: true };
}

/* ── the browser search (source a): the list Visibility PREPARES; the client's AI runs it in the client's browser ── */
export function browserSearchList({ subject, countries = [], origins = [], professions = [], own = [], cap = CLIENT_AI_POLICY.dailyCap }) {
  const seeds = [
    ...own.map((q) => ({ q: q.text, for: "your question" })),
    { q: `how many people take ${subject}`, for: "q1" }, { q: `${subject} test takers by country`, for: "q1" },
    ...origins.slice(0, 8).map((c) => ({ q: `${subject} ${c}`, for: "q2", place: c })),
    { q: `${subject} accepted countries`, for: "q3" }, ...countries.slice(0, 9).map((c) => ({ q: `${subject} requirement ${c}`, for: "q3", place: c })),
    { q: `universities that accept ${subject}`, for: "q4" }, { q: `${subject} for nursing students university`, for: "q4" },
    ...professions.map((p) => ({ q: `${subject} for ${p}`, for: "q5" })),
  ];
  const seen = new Set(), list = seeds.filter((s) => { const k = s.q.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, cap);
  return { list, cap, minPauseSeconds: CLIENT_AI_POLICY.minPauseSeconds, instruction: instructionFor(subject, list) };
}
/** the one instruction the client gives HIS OWN AI in HIS OWN browser (Visibility never runs it) — the F11 run record it must hand back */
export function instructionFor(subject, list) {
  return [`Search Google in this browser for each line below, one at a time, at least ${CLIENT_AI_POLICY.minPauseSeconds} seconds apart, at most ${CLIENT_AI_POLICY.dailyCap} today.`,
    "Before the first search, tell me (the client) you are starting. On a captcha or an \"unusual traffic\" page: STOP at once, tell me, and do not solve it or try again.",
    "For each search, write down Google's autocomplete suggestions and its \"People also ask\" questions — exactly as shown. Do not click results, do not sign in, do not type anything else.",
    `Then give me one file, written exactly like this: { "source": "CLIENT_AI_GOOGLE", "date": "YYYY-MM-DD", "place": "<the country this browser is in>", "language": "<the page language>", "startedBy": { "who": "CLIENT", "record": "<how I started you>" }, "notice": { "text": "<what you told me>", "givenAt": "<ISO time>" }, "policy": { "minPauseSeconds": ${CLIENT_AI_POLICY.minPauseSeconds}, "dailyCap": ${CLIENT_AI_POLICY.dailyCap} }, "runs": [{ "runId": "<any id>", "searches": [{ "n": 1, "query": "…", "action": "AUTOCOMPLETE" or "RESULTS", "at": "<ISO time>" }], "observations": [{ "search": 1, "kind": "AUTOCOMPLETE" or "PEOPLE_ALSO_ASK", "texts": ["…"] }], "stopped": null or { "reason": "CAPTCHA", "at": "<ISO time>", "toldClient": true } }] }`,
    `The searches (about ${subject}):`, ...list.map((s, i) => `${i + 1}. ${s.q}`)].join("\n");
}

/** what the client's AI handed in → accepted phrases (F11 C2 decides) and the run records — a refused run keeps none of its phrases */
export function takeHandIn(handIn, { runsBefore = [] } = {}) {
  const today = handIn?.date, before = runsBefore.filter((r) => r.date === today && r.verdict === "ACCEPTED").reduce((n, r) => n + (r.searchesUsed ?? 0), 0);
  const out = clientAiHandIn(handIn, { searchesBefore: before });
  return { phrases: out.records.map((r) => ({ text: r.phrase, kind: "observed", place: r.place, date: r.date ?? today, source: `${SOURCES.CLIENT_AI_GOOGLE.says}${r.place && r.place !== "NOT REPORTED" ? ` (${r.place})` : ""}, ${today}`, observation: r.kind })), runs: out.runs.map((r) => ({ ...r, date: today })), refused: out.refused, line: out.runs.map((r) => (r.verdict === "ACCEPTED" ? `Run ${r.runId}: accepted — ${r.searchesUsed} searches (${r.searchesOfTheDay} of ${r.dailyCap} today), ${r.phrasesKept} phrases kept.` : `Run ${r.runId ?? "?"}: REFUSED — ${r.refusedFor.join(", ")}. None of its phrases is kept.`)).join(" ") || "The file is not a hand-in of your AI's browser search." };
}
/** a search-data FILE the client exported: a Keyword Planner file, or Bing Webmaster's keyword research (CSV with Keyword + Impressions) */
export function takeSearchFile(text, { country = null, language = null, exportedOn }) {
  const head = String(text ?? "").replace(/^﻿/, "").split(/\r?\n/).find((l) => /keyword/i.test(l)) ?? "";
  if (/Avg\. monthly searches/i.test(head)) { const r = keywordPlannerFile(text, { country, language, exportedOn }); return { kind: "Keyword Planner", phrases: r.records.map((x) => ({ text: x.phrase, kind: "tool", place: country, date: exportedOn, volume: x.volume ?? null, source: `your Keyword Planner file (${exportedOn}) — the tool's own estimate` })), refused: r.refused }; }
  if (/impressions/i.test(head)) {
    const rows = String(text).replace(/^﻿/, "").split(/\r?\n/).filter(Boolean), h = rows.shift().split(/,|\t/).map((x) => x.replace(/"/g, "").trim().toLowerCase()), k = h.findIndex((x) => /keyword|query/.test(x)), im = h.findIndex((x) => /impressions/.test(x));
    const r = bingKeywordResearch({ source: "BING_KEYWORD_RESEARCH", country, language, retrievedOn: exportedOn, keywords: rows.map((l) => l.split(/,|\t/).map((x) => x.replace(/"/g, "").trim())).filter((c) => c[k]).map((c) => ({ Query: c[k], Impressions: Number(c[im]) || 0 })) });
    return { kind: "Bing Webmaster", phrases: r.records.map((x) => ({ text: x.phrase, kind: "tool", place: country, date: exportedOn, volume: x.volume ?? null, source: `your Bing Webmaster file (${exportedOn}) — the tool's own estimate` })), refused: r.refused };
  }
  return { kind: null, phrases: [], refused: [{ code: "NOT_A_SEARCH_DATA_FILE" }] };
}

/* ── Q1 · a figure the subject's OWN pages state ("how many take it") — the number and its noun, never the page's sentence ── */
const FIGURE = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*(?:million|thousand))\+?\s+((?:healthcare\s+)?(?:candidates|test[- ]takers|people|professionals|tests))/i;
export async function figureOf({ urls, subject, reader, lead = null }) {
  const pages = [...(lead ? [lead.url] : []), ...urls.filter((u) => /about|who-we|facts|figures|history|our-story|recogni|why-/i.test(new URL(u).pathname)).sort((a, b) => a.length - b.length)].slice(0, 5), checked = [];
  for (const u of pages) {
    const r = await reader.read(u); checked.push({ url: u, ok: r.ok, on: r.checkedOn });
    if (!r.ok) continue;
    for (const s of r.text.split(/(?<=[.!?])\s+/)) { if (!new RegExp(`\\b${subject}\\b`, "i").test(s) && !/test|exam/i.test(s)) continue; const m = FIGURE.exec(s); if (m) { const own = (() => { try { return new URL(r.url).hostname === new URL(urls[0] ?? r.url).hostname; } catch { return false; } })(); return { ok: true, figure: `${m[1]} ${m[2]}`, url: r.url, on: r.checkedOn, label: own ? LABEL.official : LABEL.people, line: `${own ? `${subject}'s own page` : "A page (not official)"} states a figure of ${m[1]} ${m[2].toLowerCase()}.` }; } }
  }
  return { ok: false, checked, line: `Official page${checked.length === 1 ? "" : "s"} checked ${checked[0]?.on ?? ""} (${checked.length}), ${checked.length === 1 ? "does" : "do"} not say how many people take ${subject}.` };
}

/**
 * THE FIVE ANSWERS, each with its sources (link + date + label), and the client's own questions. Everything is handed in.
 */
export function fiveAnswers({ subject, res, plan, official = {}, byCountry = null, sc = null, items = [], figure = null, own = [], notApply = [], dims = [] }) {
  const D = res?.dims ?? {}, P = plan;
  const src = (label, title, url, on) => ({ label, title, url: url ?? null, on: on ?? null });
  const na = (id, why) => ({ id, ask: FIVE.find((f) => f.id === id).ask, applies: false, answer: `Does not apply${why ? ` — ${why}` : ""}.`, sources: [] });
  const out = [];
  /* Q1 */
  {
    const profs = D.roles?.professions ?? [], venue = D.origins?.kept?.length ?? null, top = (byCountry ?? []).slice(0, 5).map((c) => c.country);
    const s = [];
    if (profs.length) s.push(src(LABEL.official, `${subject}'s own profession pages (${profs.length})`, D.roles.kept[0]?.source?.url, D.roles.kept[0]?.checkedOn));
    if (figure?.ok) s.push(src(figure.label, figure.line, figure.url, figure.on)); else if (figure) s.push(src(LABEL.official, figure.line, null, figure.checked?.[0]?.on));
    if (venue) s.push(src(LABEL.official, `${subject}'s own pages name a venue in ${venue} countries`, D.origins.kept[0]?.source?.url, D.origins.kept[0]?.checkedOn));
    if (top.length) s.push(src(LABEL.search, `the countries your searchers come from: ${top.join(", ")}`, null, sc?.on));
    out.push({ id: "q1", ask: FIVE[0].ask, applies: true, answer: [profs.length ? `Used by ${profs.length} healthcare professions (${profs.join(", ")})${D.countries ? ` to register and work in ${D.countries.kept.length} countries` : ""}.` : `What ${subject} is for: see its own site.`, figure?.ok ? figure.line : figure ? figure.line : "How many people take it: not looked up yet.", venue ? `Taken in ${venue} countries (a venue on its own pages).` : null, top.length ? `Your searchers come most from ${top.join(", ")} (your Search Console, by country).` : byCountry ? null : "From which countries: connect Search Console again to read its country data."].filter(Boolean).join(" "), n: profs.length || null, sources: s });
  }
  /* Q2 */
  {
    const ai = items.filter((x) => x.kind === "ai research"), obs = items.filter((x) => x.kind === "observed"), tool = items.filter((x) => x.kind === "tool"), people = items.filter((x) => x.kind === "youtube");
    const aiBy = new Map(); for (const q of ai) { const c = countriesIn(q.text)[0] ?? "no country named"; aiBy.set(c, [...(aiBy.get(c) ?? []), q.text]); }
    out.push({ id: "q2", ask: FIVE[1].ask, applies: true, n: byCountry?.length ?? null,
      answer: `${byCountry ? `${byCountry.length} of 197 countries search for it in your Search Console (${fmt(byCountry.reduce((n, c) => n + c.searches, 0))} searches with their country).` : "Search Console's country data is not read yet — connect Google again (it asks for no new permission)."}${obs.length ? ` ${obs.length} phrases your AI saw in Google, in your browser.` : " Your AI's browser search has not run yet — it is ready (client-started, 30 a day)."}${tool.length ? ` ${tool.length} from your search-data files (the tool's own estimates).` : ""}${ai.length ? ` ${ai.length} questions from your AI's research — an AI estimate, not search data.` : ""}`,
      perCountry: (byCountry ?? []).slice(0, 40).map((c) => ({ country: c.country, searches: c.searches, impressions: c.impressions, questions: c.questions.map((q) => ({ text: q.text, impressions: q.impressions })), label: LABEL.search })),
      observed: obs.slice(0, 60).map((x) => ({ text: x.text, place: x.place, source: x.source, label: LABEL.observed })), tool: tool.slice(0, 60).map((x) => ({ text: x.text, place: x.place, volume: x.volume, source: x.source, label: LABEL.tool })),
      aiByCountry: [...aiBy.entries()].map(([country, qs]) => ({ country, questions: qs, label: LABEL.ai })), peopleSay: people.slice(0, 20).map((x) => ({ text: x.text, source: x.source, label: LABEL.people })),
      sources: [src(LABEL.search, `Search Console${sc?.window ? ` (${sc.window})` : ""}${byCountry ? ", by country" : ""}`, null, sc?.on), ...(ai.length ? [src(LABEL.ai, "your AI's research", null, ai[0].on)] : [])] });
  }
  /* Q3 */
  if (notApply.includes("q3") || !D.countries) out.push(na("q3", D.countries ? "you said so" : "no countries in the pages you have in mind"));
  else {
    const req = P?.kinds?.requirement?.filter((p) => !p.hub) ?? [], withReg = [...new Set(req.map((p) => p.country))];
    out.push({ id: "q3", ask: FIVE[2].ask, applies: true, n: D.countries.kept.length, answer: `Recognised in ${D.countries.kept.length} of ${fmt(D.countries.candidates)} countries (${subject}'s own pages): ${D.countries.kept.map((k) => k.name).join(", ")}. A regulator's own page was read that accepts it in ${withReg.length}: ${withReg.join(", ") || "none yet"}.`,
      sources: [...D.countries.kept.map((k) => src(LABEL.official, `${subject}'s own page for ${k.name}`, k.source?.url, k.checkedOn)), ...withReg.flatMap((c) => (official[c] ?? []).filter((x) => !/— its page for /.test(x.source ?? "")).slice(0, 2).map((x) => src(LABEL.official, x.text, x.link, x.readOn)))] });
  }
  /* Q4 */
  if (notApply.includes("q4") || !D.universities) out.push(na("q4", D.universities ? "you said so" : "no universities in the pages you have in mind (tick Universities if they matter)"));
  else {
    const U = D.universities, f = P?.funnels?.universities;
    const possible = f?.rows.find((r) => /destination fact/.test(r.step))?.n ?? null;
    out.push({ id: "q4", ask: FIVE[3].ask, applies: true, n: possible, answer: `${fmt(U.health ?? 0)} of ${fmt(U.candidates)} universities in your list teach healthcare; ${fmt(possible)} teach a profession with a destination fact — one page each, its destinations inside. Read so far: ${fmt((U.read ?? []).length)} (${fmt((U.kept ?? []).length)} with a health course page on their own site, ${fmt(U.namesSubject ?? 0)} naming ${subject}).`,
      sources: [src(LABEL.official, "the universities' own course pages, read", U.kept?.[0]?.source?.url, U.kept?.[0]?.checkedOn), src("your list", U.from === "your list" ? "your university list" : "", null, null)] });
  }
  /* Q5 */
  if (notApply.includes("q5") || !D.roles) out.push(na("q5", D.roles ? "you said so" : "no professions in the pages you have in mind"));
  else {
    const req = P?.kinds?.requirement?.filter((p) => !p.hub) ?? [], per = (D.roles.professions ?? []).map((p) => ({ profession: p, countries: req.filter((x) => (x.professions ?? [x.profession]).includes(p)).map((x) => x.country) }));
    out.push({ id: "q5", ask: FIVE[4].ask, applies: true, n: (D.roles.professions ?? []).length, answer: `${(D.roles.professions ?? []).length} professions (${subject}'s own pages). A regulator's own page accepts it — ${per.map((x) => `${x.profession}: ${x.countries.length}`).join(" · ")}.`,
      perProfession: per, sources: D.roles.kept.slice(0, 12).map((k) => src(LABEL.official, `${subject}'s own page for ${k.profession}`, k.source?.url, k.checkedOn)) });
  }
  /* the client's own questions: what the sources already say about them, or "not answered yet" */
  const pool = [...items.map((x) => ({ text: x.text, source: x.source, label: { search: LABEL.search, observed: LABEL.observed, tool: LABEL.tool, youtube: LABEL.people, "ai research": LABEL.ai, "official FAQ": LABEL.official }[x.kind] ?? x.kind, link: x.link ?? null, on: x.on ?? null }))];
  const ownAnswers = own.map((q) => { const t = new Set(tokens(q.text)); const hits = pool.filter((x) => { const u = tokens(x.text); return u.filter((w) => t.has(w)).length >= Math.max(1, Math.ceil(t.size / 2)); }).slice(0, 8); return { id: q.id, ask: q.text, applies: true, answer: hits.length ? `${hits.length} things people search or ask match it.` : "Not answered yet — it is first on your AI's browser-search list.", matches: hits, sources: [] }; });
  return { questions: out, own: ownAnswers, on: new Date().toISOString().slice(0, 10) };
}
