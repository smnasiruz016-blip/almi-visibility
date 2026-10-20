/**
 * RR-291 · the parts bin/visibility-parts.mjs prints — one per board row built under light proof. Each part reads the client's own stored
 * records through the `io` the bin hands it (its subject and research batch, already decided by the scope gate) and returns count-only lines.
 * The rules live in each row's own module; this file only wires inputs to them.
 *
 * Generic: it names no client, product or host.
 */
import { createHash } from "node:crypto";
import { demandEvidence } from "../research/demand-observation-evidence.mjs";
import { needMeasure, supplyMeasure, visibilityMeasure, demandMeasure, demandEvidenceOf } from "../research/four-measures.mjs";
import { runMode, findingsOf, evidenceByUrl } from "./visibility-score.mjs";
import { renderReport } from "./visibility-report-html.mjs";
import { KINDS, consentGate, evidenceCounts } from "../research/client-supplied.mjs";
import { crawlItem, diffRuns } from "./change-and-scale.mjs";
import { loadPlaywright, startDocumentServer, launchOfflineChromium } from "../render/renderer.mjs";
import { runLab, speedFinding, LAB_BOUND, DEVICE, NOT_MEASURED as LAB_NOT_MEASURED } from "../render/lab-speed.mjs";
import { tenantExport, EXPORT_SCHEMA, API_ACTIONS } from "../export/tenant-exports.mjs";
import { searchDataOptions, optionsLines } from "./search-data-options.mjs";
import { allGates, costGate } from "../page/page-gates.mjs";
import { articleSettings, settingsView, articlesForDay } from "../page/articles.mjs";
import { refreshPlan } from "../page/refresh.mjs";
import { LANGUAGES, checkTranslation } from "../page/languages.mjs";
import { postsForArticle, AUTO_POSTING } from "../page/social-posts.mjs";
import { monthlyReport, searchFromExport } from "./monthly-report.mjs";
import { guideItemsByValue, buildGuides, asPublished, gateInput } from "../page/one-builder.mjs";
import { GUIDANCE } from "../../config/guidance/guidance-read.mjs";
import { connectionNow } from "../research/ai-connection.mjs";
import { planCohort, rollback, sitemapXml, submissionState, PUBLISH_COHORT_CAP } from "../page/publishing-control.mjs";
import { inferFollowUps, competitorsOf, inferDifficulty, DIFFICULTY_METHOD, INFERRED, napOf, napConsistency, benchmark } from "../research/follow-ups-and-competitors.mjs";
import { admitObservation, perSystem, shareOfVoice, influenceGraph, gapsOf, actionsForGaps } from "../research/ai-visibility.mjs";

/** F66–F68 · the stored evidence of the client's own live pages, by URL */
const storedEvidence = (io) => evidenceByUrl({ pageReads: io.rows("live-pages.jsonl"), securityReads: io.rows("live-security.jsonl"), linkObs: io.rows("link-status.jsonl") });
/** F76 C3's independent check: the last stored build whose SHA-256 differs from the latest's — computed apart from rollback() itself */
const prevDistinct = (versions) => {
  const h = (s) => createHash("sha256").update(s).digest("hex");
  const last = versions.length ? h(versions.at(-1).html) : null;
  for (let i = versions.length - 2; i >= 0; i -= 1) if (h(versions[i].html) !== last) return versions[i];
  return null;
};
/** RR-294 / RR-295 · the one builder over the stored test data — the 12 guides, the only pages there are (owner decision 3 of RR-295: the
 * 31 plan drafts were made by the wrong builder and are removed; a plan is made afresh when a product is given) — and the five gates over
 * every page in the form it would go live. */
async function oneBuilderRun(io) {
  const on = io.on ?? new Date().toISOString().slice(0, 10);
  /* D · this build is costed before it starts: a local, in-memory build — no request, no paid call */
  const costEntry = { recorded_at: new Date().toISOString(), money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "a local in-memory build of stored test data: no request, no paid call" }, requests: 0 };
  const startedAt = new Date(Date.now() + 1).toISOString();
  const cost = costGate({ entry: costEntry, startedAt, budget: { money: 0, currency: "USD", requests: 0 } });
  /* the client's own design, read by the entry point that names the subject (its questionnaire); none filed is none */
  const design = io.design ?? null;
  const guides = guideItemsByValue(io.rows("joined-pages.jsonl"));
  if (guides.size === 0) return { missing: "no stored guide in the batch" };
  const quotation = new Map((io.json("page-drafts.json")?.pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => [c.claimId, c.quotation ?? null]))));
  const keyFacts = io.json("key-facts.json") ?? [], rates = io.json("conversion-rates.json") ?? [];
  const links = io.json("internal-links-2026-10-18.json");
  const stamp = "TEST PAGE · local build of stored test data · not published";
  const gb = buildGuides({ guides, keyFacts, rates, quotationOf: (id) => quotation.get(id) ?? null, design, stamp, on, relatedFor: (value) => (Array.isArray(links?.pages?.[value]) ? links.pages[value] : []) });
  /* F34 (RR-295): a stored page with no existing address is never built — the one builder refuses it, named */
  const pages = gb.filter((g) => !g.refused).map((g) => ({ ...g, id: g.url }));
  const urls = pages.map((p) => p.url).filter(Boolean);
  const gated = pages.map((p) => ({ id: p.id, url: p.url, html: asPublished(p.html, p.url), needs: [], mainQuery: p.title, questions: p.questions, answer: p.answer, items: p.items, facts: p.items.flatMap((it) => it.claims.map((c) => ({ hasSource: Boolean(c.link), hasDate: /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "") }))) }));
  const sec = io.rows("live-security.jsonl").find((r) => r.kind === "ROBOTS");
  const results = allGates(gated, { guidance: GUIDANCE, on, site: { robotsTxt: sec?.read?.body ?? null, sitemapUrls: urls, serve: (path) => ({ status: urls.some((u) => new URL(u).pathname.replace(/\/$/, "") === path.replace(/\/$/, "")) ? 200 : 404 }) }, cost });
  const cardsRefused = gb.flatMap((p) => (p.cardsRefused ?? []).map((x) => ({ page: p.value, claimId: x.claimId, code: x.code, value: x.value, why: x.why ?? null })));
  return { pages, results, design, cardsRefused: [...new Map(cardsRefused.map((x) => [x.claimId, x])).values()] };
}
/** RR-292 · the client's search-data options, each from its own stored records — nothing fetched */
const setupOf = (io) => {
  const exports = io.rows("search-console-exports.jsonl").filter((r) => r.record_type === "search_console_export").sort((a, b) => String(a.exportedOn).localeCompare(String(b.exportedOn)));
  /* the client's own AI connection: the latest event of each of its connectors (src/research/ai-connection.mjs connectionNow) */
  const conn = io.rows("ai-connection.jsonl");
  const ids = [...new Set(conn.filter((r) => r.value?.subject === io.subject).map((r) => r.value.connectorId))];
  const aiConnected = ids.some((id) => connectionNow(conn, { subject: io.subject, connectorId: id }) === "CONNECTED") ? "CONNECTED" : "NOT CONNECTED";
  /* option 1: no search-API key of the client's is declared, and no price page is read in this round (beta-g decision B) */
  return searchDataOptions({ apiKey: null, price: null, searchConsole: exports.at(-1) ?? null, aiSearch: { state: aiConnected } });
};
/** F66–F68 · one score run printed: every weight, every evaluated check, every NOT MEASURED value, the denominator and its rule */
const scoreLines = (s, list) => [
  `mode ${s.mode.toUpperCase()}  sample ${s.sampleSize} of ${s.of} URL(s)${s.skipped.length ? ` · skipped ${s.skipped.length}: ${s.skipped.join(", ")}` : " · skipped none"}`,
  `score ${s.score ?? "NOT MEASURED"} = ${s.numerator} / ${s.denominator} — the denominator is ${s.denominatorRule}`,
  `by category ${Object.entries(s.byCategory).map(([k, v]) => `${k} ${v ?? "NOT MEASURED"}`).join(" · ")}`,
  `weights ${Object.entries(s.weights).map(([k, v]) => `${k} ${v}`).join(" · ")}`,
  `evaluated checks ${s.evaluated} · NOT MEASURED ${s.notMeasured.length}${list && s.notMeasured.length ? `: ${s.notMeasured.join(" | ")}` : ""}`,
];

const tally = (o) => Object.entries(o).sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";

export const PARTS = Object.freeze({
  /* F14 · src/research/demand-observation-evidence.mjs */
  "demand-evidence": Object.freeze({
    title: "F14 · DEMAND EVIDENCE",
    run: (io) => {
      const phrases = io.rows("search-phrases.jsonl");
      const runs = new Map(phrases.filter((r) => r.record_type === "search_phrase_run").map((r) => [r.runId, r]));
      const sc = io.rows("search-console-exports.jsonl");
      const exports = sc.filter((r) => r.record_type === "search_console_export");
      /* one record once: the same measurement key in two stores is one observation */
      const seen = new Set();
      const records = [...phrases, ...sc.filter((r) => r.record_type === "search_phrase"), ...io.rows("questions.jsonl"), ...io.rows("research-derived-questions.jsonl")]
        .filter((r) => { const k = r.measurement_key ?? JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
      const e = demandEvidence(records, { population: `research batch ${io.batch} of ${io.subject}`, runs, exports });
      return [
        `demand observations ${e.total}: ${tally(e.bySource)}`,
        `C1 five fields      missing by name: ${tally(e.missing)}`,
        `C2 public search    ${e.publicSearch} record(s) · missing by name: ${tally(e.missingSearch)}`,
      ];
    },
  }),
  /* F15 · src/research/four-measures.mjs — four functions, four denominators, printed apart and never added up */
  "four-measures": Object.freeze({
    title: "F15 · SUPPLY / VISIBILITY / DEMAND / NEED",
    run: (io) => {
      const planning = io.rows("planning.jsonl");
      const coverage = planning.filter((r) => r.record_type === "planning_coverage");
      const need = needMeasure(planning.filter((r) => r.record_type === "planning_need"));
      const ids = need.per.map((p) => p.needId);
      const exp = io.rows("search-console-exports.jsonl").find((r) => r.record_type === "search_console_export") ?? null;
      const joins = io.json("observed-question-joins-2026-10-18.json")?.joins ?? [];
      const demandRows = planning.filter((r) => r.record_type === "planning_demand");
      const supply = supplyMeasure(ids, coverage), vis = visibilityMeasure(ids, coverage, exp), demand = demandMeasure(ids, demandEvidenceOf({ demandRows, coverageRows: coverage, joins }));
      return [
        `NEED        over ${need.denominator} need(s): ${tally(need.counts)}`,
        `SUPPLY      over ${supply.denominator} need(s): ${tally(supply.counts)}`,
        `VISIBILITY  over ${vis.denominator} need(s), window ${vis.window ? `${vis.window.from} … ${vis.window.to}` : "NOT MEASURED"}: ${tally(vis.counts)}`,
        `DEMAND      over ${demand.denominator} need(s): ${tally(demand.counts)} · independent categories per need: ${tally(demand.categoriesPerNeed)} · research-derived wordings, not evidence: ${demandRows.filter((r) => r.tier !== "OBSERVED").length}`,
      ];
    },
  }),
  /* F66 · F68 · src/report/visibility-score.mjs — the full check */
  "score": Object.freeze({
    title: "F66 · F68 · VISIBILITY SCORE (FULL)",
    run: (io) => {
      const s = runMode({ mode: "full", evidenceByUrl: storedEvidence(io) });
      const f = findingsOf(s.results);
      return [...scoreLines(s, io.list), `findings ${f.length} (each with its check, evidence id and next action)`, ...f.slice(0, io.list ? f.length : 5).map((x) => `  ${x.url} · ${x.check} (weight ${x.weight}) · ${x.finding} → ${x.action} · evidence ${x.evidenceId}`)];
    },
  }),
  /* F70 · src/report/visibility-report-html.mjs — the one static HTML file, printed whole (save it as a file); bad findings first */
  "report": Object.freeze({
    title: "F70 · DOWNLOADABLE REPORT",
    raw: true,
    run: (io) => {
      const s = runMode({ mode: "full", evidenceByUrl: storedEvidence(io) });
      return renderReport({ title: `Visibility report · ${io.subject}`, run: s, findings: findingsOf(s.results), on: io.on ?? "today", brand: io.brand ?? null, lead: io.lead ?? undefined, setup: setupOf(io) }).split("\n");
    },
  }),
  /* F28 · F65 · F84 · F95 · src/intake/client-supplied.mjs — the client's supplied files, each kind behind its consent gate */
  "client-supplied": Object.freeze({
    title: "F28 · F65 · F84 · F95 · CLIENT-SUPPLIED FILES",
    run: (io) => {
      const manifest = io.json("client-files/manifest.json");
      const line = (label, kind) => { const g = consentGate(manifest, kind); return `${label.padEnd(20)} ${g.state}${g.state === "NOT MEASURED" ? " — the client supplied no such file" : ` · admitted ${g.admitted.length} · refused ${g.refused.length}${g.refused.length ? ` (${g.refused.map((r) => `${r.file}: ${r.reason}`).join(", ")})` : ""}`}`; };
      const counts = evidenceCounts({ publicQuestions: io.rows("questions.jsonl").length, researchDerived: io.rows("research-derived-questions.jsonl").length, ownedSearch: io.rows("search-console-exports.jsonl").filter((r) => r.record_type === "search_phrase").length, clientReceived: [] });
      return [
        `supplied files      ${(manifest?.files ?? []).length} in the manifest · of a kind these parts read: ${(manifest?.files ?? []).filter((f) => Object.values(KINDS).includes(f.kind)).length}`,
        line("F28 server log", KINDS.SERVER_LOG), line("F65 review export", KINDS.REVIEW_EXPORT), line("F84 outcome export", KINDS.OUTCOME_EXPORT), line("F95 questions", KINDS.CUSTOMER_QUESTIONS),
        `F95 evidence apart  ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ")}`,
      ];
    },
  }),
  /* F51 · F52 · F53 · F56 · F57 · src/research/ai-visibility.mjs — the client's filed AI-answer observations (its own AI connection, or by
   * hand); the engine's browser-route observations (RR-291 decision 2, for F16) are offered too, and refused for their route, named */
  "ai-visibility": Object.freeze({
    title: "F51 · F52 · F53 · F56 · F57 · AI VISIBILITY",
    run: (io) => {
      const filed = io.rows("ai-observations.jsonl");
      const route = io.rows("answer-surface-observations.jsonl").filter((r) => r.surface === "AI_ANSWER" && r.state === "OBSERVED")
        .map((r) => ({ observationId: r.observation_id, prompt: r.query, system: r.surfaceId, date: r.on, sampling: "one answer per question", method: "the engine's browser route", citedUrls: (r.leads ?? []).map((l) => l.address), route: r.route }));
      const verdicts = [...filed, ...route].map((o) => ({ o, v: admitObservation(o) }));
      const admitted = verdicts.filter((x) => x.v.state === "ADMITTED").map((x) => x.v.observation);
      const refused = verdicts.filter((x) => x.v.state === "REFUSED");
      const brandDomains = io.own("answer-surfaces.json")?.ownDomains ?? [];
      const gaps = gapsOf(admitted, { brandDomains });
      const planning = io.rows("planning.jsonl");
      const cov = new Map(planning.filter((r) => r.record_type === "planning_coverage").map((r) => [r.needId, r]));
      const actions = actionsForGaps(gaps, { coverageOf: (id) => cov.get(id) ?? null, needOf: (id) => (cov.has(id) ? { needId: id, pageCandidate: id, questions: 1, tier: "OBSERVED", centralSupported: true } : null) });
      const sov = shareOfVoice(admitted, { brand: io.subject });
      const g = influenceGraph(admitted, gaps, actions);
      return [
        `F51 observations    filed ${filed.length} · offered from the browser route ${route.length} · admitted ${admitted.length} · refused ${refused.length}${refused.length ? ` (${[...new Set(refused.map((x) => x.v.missing.join(", ")))].join(" | ")})` : ""}`,
        `F51 per system      ${admitted.length ? JSON.stringify(perSystem(admitted, { brandDomains })) : "NOT MEASURED — no admitted observation"}`,
        `F52 share           ${sov.line}`,
        `F53 graph           nodes ${g.nodes} · links ${g.links} · ${Object.entries(g.kinds).map(([k, v]) => `${k} ${v}`).join(" · ") || "empty (no admitted observation)"}`,
        `F56 descriptions    ${io.rows("ai-brand-descriptions.jsonl").length} filed`,
        `F57 actions         gaps ${gaps.length} · actions ${actions.length}${actions.length ? `: ${Object.entries(actions.reduce((m, a) => ((m[a.action] = (m[a.action] ?? 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(" · ")}` : ""}`,
      ];
    },
  }),
  /* F30 · src/report/change-and-scale.mjs — this batch's crawl against the compared batch's crawl of the same check */
  "changes": Object.freeze({
    title: "F30 · CHANGES SINCE THE LAST RUN",
    run: (io) => {
      const items = (rows) => rows.filter((r) => r.record_type === "observation" && r.method === "crawl.fetch").map(crawlItem);
      const cur = items(io.rows("crawl.jsonl")), prev = items(io.compareRows("crawl.jsonl"));
      /* the same check: only the items this run re-checked are compared — an item the earlier run held but this one did not ask for is not "removed" */
      const asked = new Set(cur.map((i) => i.key));
      const d = diffRuns(prev.filter((i) => asked.has(i.key)), cur);
      return [
        `runs         this ${io.batch} (${cur.length} item(s)) · last ${io.compareBatch ?? "none"} (${prev.length} item(s))`,
        `rule         ${d.rule ?? "-"}: ${d.ruleWords ?? d.claim}`,
        `changes      added ${d.added.length} · removed ${d.removed.length} · changed ${d.changed.length} · unchanged ${d.unchanged} (suppressed)`,
        ...d.changed.map((c) => `  CHANGED ${c.key} · ${c.fields.join(", ")}`),
      ];
    },
  }),
  /* F24 · src/render/lab-speed.mjs — the local lab over the client's own stored page HTML; field data its own kind */
  "page-speed": Object.freeze({
    title: "F24 · PAGE SPEED (LAB, LOCAL)",
    run: async (io) => {
      const NM = LAB_NOT_MEASURED;
      const latest = new Map();
      for (const r of io.rows("live-pages.jsonl").sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)))) if (r.url && r.html) latest.set(r.url, r.html);
      const documents = [...latest].sort(([a], [b]) => a.localeCompare(b)).map(([url, html]) => ({ url, html }));
      const lab = await runLab({ documents, pw: await loadPlaywright(), on: io.on ?? new Date().toISOString().slice(0, 10), startDocumentServer, launchOfflineChromium });
      if (lab.unavailable) return [`LAB  NOT MEASURED — ${lab.unavailable}`];
      const field = io.rows("field-speed.jsonl");
      const findings = documents.map((d) => speedFinding(d.url, [...lab.records, ...field]));
      const med = (k) => { const v = lab.records.map((r) => r.metrics[k]).filter((x) => typeof x === "number").sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : NM; };
      return [
        `LAB    ${lab.records.length} page(s) · tool ${lab.tool} · device ${DEVICE.name} · date ${lab.records[0]?.on ?? "-"}`,
        `bound  ${LAB_BOUND}`,
        `median FCP ${med("fcpMs")} ms · LCP ${med("lcpMs")} ms · CLS ${med("cls")} · load ${med("loadMs")} ms · DOM nodes ${med("domNodes")}`,
        `FIELD  ${field.length ? `${field.length} record(s)` : `${NM} — no field data supplied (it needs the client's own key or export)`}; pages with field data ${findings.filter((f) => f.field !== NM).length} of ${findings.length}`,
        ...(io.list ? findings.map((f) => `  ${f.url} · lab LCP ${f.lab.metrics?.lcpMs ?? NM} ms · field ${f.field === NM ? NM : "present"}`) : []),
      ];
    },
  }),
  /* F17 · src/research/follow-ups-and-competitors.mjs */
  "follow-ups": Object.freeze({
    title: "F17 · FOLLOW-UP NEEDS",
    run: (io) => {
      const f = inferFollowUps(io.rows("planning.jsonl").filter((r) => r.record_type === "planning_coverage"));
      const seqs = io.rows("next-question-sequences.jsonl");
      return [
        `INFERRED follow-ups ${f.length} (each names the two coverage records it is inferred from) over ${new Set(f.map((x) => x.after)).size} need(s) · answered on another page ${f.filter((x) => !x.gap).length} · INFORMATION GAPS (no page answers it) ${f.filter((x) => x.gap).length} across ${new Set(f.filter((x) => x.gap).map((x) => x.next)).size} need(s)`,
        `OBSERVED sequences  ${seqs.length ? `${seqs.length} filed — counted apart` : "NOT MEASURED — none filed (they need a lawful source the client holds)"}`,
        ...(io.list ? f.slice(0, 20).map((x) => `  after ${x.after} → ${x.next} (${x.gap ? "INFORMATION GAP: no page answers it" : `answered by ${x.answeredBy}`})`) : []),
      ];
    },
  }),
  /* F58 · F69 · competitors and the benchmark */
  "competitors": Object.freeze({
    title: "F58 · F69 · COMPETITORS AND BENCHMARK",
    run: (io) => {
      const decl = io.own("answer-surfaces.json");
      const c = competitorsOf({ declared: io.own("competitors.json")?.competitors ?? [], observedSurfaces: io.rows("answer-surface-observations.jsonl").filter((r) => r.surface === "WEB_SEARCH"), ownDomains: decl?.ownDomains ?? [] });
      const queries = [...new Set(io.rows("search-phrases.jsonl").filter((r) => r.record_type === "search_phrase" && r.label === "OBSERVED").map((r) => r.phrase))];
      const d = queries.map(inferDifficulty);
      const s = runMode({ mode: "full", evidenceByUrl: storedEvidence(io) });
      const b = benchmark({ clientScore: s.score, peers: c.competitors.map((x) => ({ ...x, score: null })) });
      return [
        `F58 competitors     ${c.competitors.length} (declared ${c.competitors.filter((x) => x.from === "DECLARED").length} · from observed result surfaces ${c.competitors.filter((x) => x.from === "OBSERVED_RESULT_SURFACE").length}) · refused unsourced ${c.refused.length}`,
        `F58 difficulty      ${d.length} observed queries, each ${INFERRED}: ${Object.entries(d.reduce((m, x) => ((m[x.difficulty] = (m[x.difficulty] ?? 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(" · ")} — method: ${DIFFICULTY_METHOD}`,
        `F58 coverage gap    ${c.competitors.length ? "compared over stored observations" : "NOT MEASURED — no competitor page is in a stored observation"}`,
        `F69 benchmark       ${b.line}`,
      ];
    },
  }),
  /* F63 · local rank from the browser-route observations of the declared locations */
  "local-rank": Object.freeze({
    title: "F63 · LOCAL RANK",
    run: (io) => {
      const decl = io.own("answer-surfaces.json");
      const local = io.rows("answer-surface-observations.jsonl").filter((r) => r.surface === "WEB_SEARCH" && r.location);
      const line = (r) => `${r.location} · "${r.query}" · ${r.surfaceId} · ${r.on} · ${r.state === "OBSERVED" ? (r.own?.state === "RANKED" ? `#${r.own.position} of ${r.own.of}` : `${r.own?.state ?? "NOT MEASURED"}`) : `BLOCKED ${r.reason}`}`;
      return [
        `declared locations  ${(decl?.locations ?? []).join(", ") || "none"}`,
        `rank records        ${local.length}: ${local.length ? Object.entries(local.reduce((m, r) => ((m[r.state === "OBSERVED" ? "RANKED or NOT_IN_THE_RESULTS_SHOWN" : `BLOCKED ${r.reason}`] = (m[r.state === "OBSERVED" ? "RANKED or NOT_IN_THE_RESULTS_SHOWN" : `BLOCKED ${r.reason}`] ?? 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(" · ") : "NOT MEASURED — none filed"}`,
        ...local.map((r) => `  ${line(r)}`),
      ];
    },
  }),
  /* F64 · name, address and phone on the client's own pages */
  "nap": Object.freeze({
    title: "F64 · NAME / ADDRESS / PHONE",
    run: (io) => {
      const latest = new Map();
      for (const r of io.rows("live-pages.jsonl")) if (r.url && r.html) latest.set(r.url, r.html);
      const values = [...latest].flatMap(([url, html]) => napOf(html, url));
      const rep = napConsistency(values);
      const show = (v) => (typeof v === "string" ? v : v.state === "CONSISTENT" ? `CONSISTENT "${v.value}" on ${v.sources} statement(s)` : `MISMATCH ${v.pairs.map((p) => `"${p.a.value}" (${p.a.source}) vs "${p.b.value}" (${p.b.source})`).join("; ")}`);
      return [`own pages read      ${latest.size} · NAP statements ${values.length}`, `name                ${show(rep.name)}`, `address             ${show(rep.address)}`, `phone               ${show(rep.phone)}`];
    },
  }),
  /* F76 · src/page/publishing-control.mjs — the real publication record classed, rollback on the stored builds, the sitemap until connected */
  "publishing": Object.freeze({
    title: "F76 · CONTROLLED PUBLISHING",
    raw: false,
    run: (io) => {
      const list = io.json("published-pages-2026-10-16.json");
      const pages = (list?.pages ?? []).map((p) => p.page);
      /* each listed page stands on the decision record the list names — one approval per page, never one for "all" */
      const approvals = (list?.pages ?? []).map((p) => ({ pageId: p.page, approvedBy: "the owner", on: "2026-10-16", decision: list.decision }));
      const plan = planCohort({ pages, approvals });
      const builds = new Map();
      for (const r of io.rows("joined-pages.jsonl")) if (r.record_type === "joined_page_draft" && typeof r.html === "string") { const k = String(r.value); if (!builds.has(k)) builds.set(k, []); builds.get(k).push({ html: r.html, versionId: r.measurement_key }); }
      const rolled = pages.map((p) => ({ p, r: rollback(builds.get(p) ?? []), prev: prevDistinct(builds.get(p) ?? []) }));
      /* independent of rollback's own output: the restored bytes hash to the previous stored build's own bytes, and differ from the latest */
      const shaOf = (s) => createHash("sha256").update(s).digest("hex");
      const exact = rolled.filter((x) => x.r.state === "RESTORED" && x.prev && x.r.sha256 === shaOf(x.prev.html) && x.r.html !== (builds.get(x.p) ?? []).at(-1).html).length;
      const sub = submissionState(io.own("search-console-connection.json"));
      const map = sitemapXml((list?.pages ?? []).map((p) => p.url));
      return [
        `C1 C2 cohort        ${pages.length} page(s) of the real publication (${list?.decision ?? "no decision"}) → ${plan.state}${plan.refusals ? `: ${plan.refusals.join("; ")}` : ""} · cap ${PUBLISH_COHORT_CAP}`,
        `C3 rollback         ${exact} of ${pages.length} page(s) restored byte for byte to their previous stored build`,
        `C4 submission       ${sub.state}${sub.line ? ` — ${sub.line}` : ""} · sitemap ${(map.match(/<url>/g) ?? []).length} URL(s), ${map.length} bytes`,
      ];
    },
  }),
  /* F80 · src/export/tenant-exports.mjs — the tenant's own results, JSON and CSV, versioned, read-only */
  "export": Object.freeze({
    title: "F80 · READ-ONLY EXPORT",
    run: (io) => {
      const s = runMode({ mode: "full", evidenceByUrl: storedEvidence(io) });
      const e = tenantExport({ tenantId: io.tenantId, results: s.results.map(({ needs, ...r }) => r), generatedAt: io.on ?? "today", bounds: { pages: s.of, checks: s.results.length } });
      if (e.state !== "EXPORTED") return [`REFUSED — ${e.faults.length} schema fault(s): ${e.faults.slice(0, 5).join("; ")}`];
      return [`tenant ${io.tenantId} · schema ${EXPORT_SCHEMA.name} ${EXPORT_SCHEMA.version} · rows ${e.rows} · JSON ${e.json.length} bytes · CSV ${e.csv.length} bytes · actions ${API_ACTIONS.join(", ")} (read-only)`, ...(io.list ? [e.json] : [])];
    },
  }),
  /* RR-292 · src/report/search-data-options.mjs — the client's three search-data options at setup, each from its own stored records */
  "setup-options": Object.freeze({
    title: "CLIENT SETUP · SEARCH-DATA OPTIONS",
    run: (io) => optionsLines(setupOf(io)),
  }),
  /* RR-293 · PAGE-1 · src/page/page-gates.mjs — all five gates over the stored TEST DATA (owner decision 3: no product attached): the live
   * pages as read, the plan's raw drafts, and the owner preview built from the same plan. D (cost) is per build run, shown on its own line. */
  "page-gates": Object.freeze({
    title: "PAGE-1 · THE FIVE PAGE GATES OVER THE STORED TEST DATA",
    run: async (io) => {
      const on = io.on ?? new Date().toISOString().slice(0, 10);
      const sec = io.rows("live-security.jsonl").find((r) => r.kind === "ROBOTS");
      /* the live pages: their needs from the coverage records, their answer from the drafts of their own value */
      const latest = new Map();
      for (const r of io.rows("live-pages.jsonl").sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)))) if (r.url && r.html) latest.set(r.url, r);
      const cov = io.rows("planning.jsonl").filter((r) => r.record_type === "planning_coverage");
      const drafts = io.json("page-drafts.json")?.pages ?? [];
      const live = [...latest.values()].map((r) => {
        const value = r.pageId;
        const draft = drafts.find((d) => Object.values(d.combination ?? {}).includes(value));
        return { id: r.url, url: r.url, html: r.html, needs: [...new Set(cov.filter((c) => (c.pages ?? []).some((p) => p.pageId === r.url)).map((c) => c.needId))], mainQuery: (/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(r.html) ?? [])[1]?.replace(/<[^>]+>/g, "").trim(), answer: (draft?.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => c.claimId)), facts: null };
      });
      /* RR-294 (beta-g decision B): there is no second template — every built page comes from the ONE builder (src/page/one-builder.mjs),
       * the 12 guides (the 31 plan drafts are removed, RR-295), gated in the form they would go live, the build costed before it starts (gate D) */
      const built = await oneBuilderRun(io);
      const sets = [["live pages (the 12 guides and the hub)", live, { robotsTxt: sec?.read?.body ?? null, sitemapUrls: null, serve: null }, Object.freeze({ gate: "COST", pass: true })]];
      const lines = [`guidance ${GUIDANCE.quotes.length} quote(s) from ${GUIDANCE.pages.filter((p) => p.state === "READ").length} page(s) read (BLOCKED ${GUIDANCE.pages.filter((p) => p.state === "BLOCKED").length}) · valid until ${GUIDANCE.quotes.map((q) => q.validUntil).sort()[0]}`];
      for (const [label, pages, site, cost] of sets) {
        const res = allGates(pages, { guidance: GUIDANCE, on, site, cost, existingFirst: () => true });
        const per = (g) => res.filter((r) => r.gates[g].pass).length;
        const reasons = (g) => Object.entries(res.flatMap((r) => r.gates[g].checks ?? []).filter((c) => c.result !== "PASS").reduce((m, c) => { const k = `${c.name}${c.result === "NOT MEASURED" ? " (NOT MEASURED)" : ""}`; m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${n}`).join(" · ");
        lines.push(`${label}: ${pages.length} page(s) · pass A ${per("A")} · B ${per("B")} · C ${per("C")} · E ${per("E")} · all (with D) ${res.filter((r) => r.pass).length}`);
        for (const g of ["A", "B", "C"]) { const r = reasons(g); if (r) lines.push(`  ${g} fails: ${r}`); }
        const signals = res.flatMap((r) => r.gates.A.signals ?? []).length;
        if (signals) lines.push(`  A review signals (not verdicts): ${signals}`);
      }
      if (built.missing) lines.push(`the one builder: NOT MEASURED — ${built.missing}`);
      else {
        const rs = built.results;
        const per = (g) => rs.filter((r) => r.gates[g].pass).length;
        lines.push(`the one builder · the 12 guides rebuilt: ${rs.length} page(s) · pass A ${per("A")} · B ${per("B")} · C ${per("C")} · D ${per("D")} · E ${per("E")} · all ${rs.filter((r) => r.pass).length}`);
      }
      lines.push("the reasons, page by page: --part=one-builder --list");
      return lines;
    },
  }),
  /* RR-294 / RR-295 · ONE PAGE BUILDER (src/page/one-builder.mjs) over the stored TEST DATA: the 12 guides rebuilt by the one renderer with
   * the client's own design; every page gated in the form it would go live (noindex made canonical, stamps out) */
  "one-builder": Object.freeze({
    title: "ONE PAGE BUILDER · THE 12 GUIDES, GATED",
    run: async (io) => {
      const built = await oneBuilderRun(io);
      if (built.missing) return [`NOT MEASURED — ${built.missing}`];
      const { results } = built;
      const reasonsOf = (r) => Object.values(r.gates).flatMap((g) => (g.checks ?? []).filter((c) => c.result !== "PASS").map((c) => c.reason ?? c.name));
      const lines = [`guidance ${GUIDANCE.quotes.length} quote(s) · design ${built.design ? "the client's own (its questionnaire)" : "NOT FILED"} · key-fact cards refused ${built.cardsRefused.length}${built.cardsRefused.length ? ` (${built.cardsRefused.map((x) => `${x.page}:${x.claimId} "${x.value ?? ""}" — ${x.why ?? x.code}`).join(", ")})` : ""}`];
      lines.push(`guides ${results.length}: pass all five ${results.filter((r) => r.pass).length} · A ${results.filter((r) => r.gates.A.pass).length} · B ${results.filter((r) => r.gates.B.pass).length} · C ${results.filter((r) => r.gates.C.pass).length} · D ${results.filter((r) => r.gates.D.pass).length} · E ${results.filter((r) => r.gates.E.pass).length}`);
      const tally = Object.entries(results.filter((r) => !r.pass).flatMap(reasonsOf).reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
      for (const [k, n] of tally.slice(0, 6)) lines.push(`  ${n} × ${k}`);
      if (io.list) for (const r of results) lines.push(`  ${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.pass ? "" : `— ${[...new Set(reasonsOf(r))].join("; ")}`}`);
      return lines;
    },
  }),
  /* RR-296 · DAILY ARTICLES (src/page/articles.mjs): the product's article settings as the client sees them, and the day's articles over the
   * batch's real questions (article-topics.json), beside the stored guides — read-only: nothing is written, fetched or published */
  "articles": Object.freeze({
    title: "ARTICLES · SETTINGS AND THE DAY'S ARTICLES",
    run: async (io) => {
      const own = io.json("article-settings.json");
      const s = articleSettings(own ?? {});
      const lines = [...settingsView(s), `  (${own ? "the client's own settings, article-settings.json" : "no settings filed — the defaults"})${s.valid ? "" : ` — NOT VALID: ${s.faults.join("; ")}`}`];
      const topics = io.json("article-topics.json");
      if (!Array.isArray(topics?.topics)) return [...lines, "today: NOT MEASURED — the batch files no article topics (article-topics.json); nothing is made"];
      const built = await oneBuilderRun(io);
      if (built.missing) return [...lines, `today: NOT MEASURED — ${built.missing}`];
      const existing = built.pages.map((p) => ({ url: p.url, claimIds: p.answer, questions: p.questions, gate: gateInput(p) }));
      const day = io.on ?? new Date().toISOString().slice(0, 10);
      const quotation = new Map((io.json("page-drafts.json")?.pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => [c.claimId, c.quotation ?? null]))));
      const sec = io.rows("live-security.jsonl").find((r) => r.kind === "ROBOTS");
      const r = articlesForDay({ day, settings: own ?? {}, topics: topics.topics, existing, design: built.design, keyFacts: io.json("key-facts.json") ?? [], quotationOf: (id) => quotation.get(id) ?? null,
        site: built.design?.siteAddress ?? "https://preview.invalid", guidance: GUIDANCE, robotsTxt: sec?.read?.body ?? null, cost: costGate({ entry: { recorded_at: new Date().toISOString(), money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "an in-memory article build: no request, no paid call" }, requests: 0 }, startedAt: new Date(Date.now() + 1).toISOString(), budget: { money: 0, currency: "USD", requests: 0 } }) });
      return [...lines, ...(r.articles.length ? r.articles.map((a) => `today ${day}: "${a.question}" · ${a.gates} · ${a.publish.state}`) : [`today ${day}: ${r.none}`])];
    },
  }),
  /* RR-297 · AUTO-REFRESH (src/page/refresh.mjs) over the batch's stored rechecks and its stored guides — read-only: what WOULD be rebuilt,
   * and what is only reported (a BLOCKED or REJECTED recheck, or a CHANGED one with no new wording recorded); nothing is written */
  "refresh": Object.freeze({
    title: "AUTO-REFRESH · WHAT A CHANGED SOURCE FACT REBUILDS",
    run: async (io) => {
      const built = await oneBuilderRun(io);
      if (built.missing) return [`NOT MEASURED — ${built.missing}`];
      const pages = built.pages.map((p) => ({ url: p.url, title: p.title, items: p.items, questions: p.questions, html: p.html, gate: gateInput(p) }));
      const r = refreshPlan({ rechecks: io.rows("fact-rechecks.jsonl"), pages });
      const by = r.reported.reduce((m, x) => ((m[x.reason ?? x.state] = (m[x.reason ?? x.state] ?? 0) + 1), m), {});
      return [`rebuilt ${r.changes.length} change(s) over ${new Set(r.changes.flatMap((c) => c.pages)).size} page(s) · reported, no page changed: ${r.reported.length} (${Object.entries(by).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"})`,
        ...(io.list ? r.reported.map((x) => `  ${x.line}`) : [])];
    },
  }),
  /* RR-297 · SOCIAL POSTS (src/page/social-posts.mjs) — ready to copy; posting is the client's own action (auto-posting DEFERRED) */
  "social-posts": Object.freeze({
    title: "SOCIAL POSTS · READY TO COPY (THE CLIENT POSTS THEM)",
    run: (io) => {
      const articles = io.json("articles.json");
      if (!Array.isArray(articles?.articles)) return [AUTO_POSTING, "NOT MEASURED — the batch files no articles (articles.json); no post is written"];
      return [AUTO_POSTING, ...articles.articles.flatMap((a) => { const r = postsForArticle(a); return [`${a.url}: ${r.posts.length} post(s) · refused ${r.refused.length}`, ...(io.list ? r.posts.map((p) => `  [${p.network}] ${p.text.replace(/\n+/g, " / ")}`) : [])]; })];
    },
  }),
  /* RR-297 · THE MONTHLY CLIENT REPORT (src/report/monthly-report.mjs) — bad news first; search data from the stored Search Console export,
   * or NOT CONNECTED (never zero) */
  "monthly-report": Object.freeze({
    title: "THE MONTHLY CLIENT REPORT",
    run: async (io) => {
      const rows = io.rows("search-console-exports.jsonl");
      const search = searchFromExport(rows.find((r) => r.record_type === "search_console_export"), rows.filter((r) => r.record_type === "search_phrase"));
      const built = await oneBuilderRun(io);
      const refresh = built.missing ? { notes: [], reported: [] } : refreshPlan({ rechecks: io.rows("fact-rechecks.jsonl"), pages: built.pages.map((p) => ({ url: p.url, items: p.items })) });
      return monthlyReport({ product: io.subject, month: io.on ?? new Date().toISOString().slice(0, 7), search, refresh: { notes: [], reported: refresh.reported } }).lines;
    },
  }),
  /* RR-298 · LANGUAGES (src/page/languages.mjs): the ten languages and, when the batch files translations (translations.json), each one's
   * check — the same facts, numbers, currencies and sources; a refused language is not published, and is named */
  "languages": Object.freeze({
    title: "LANGUAGES · ONE ANSWER, MANY LANGUAGES",
    run: (io) => {
      const lines = [`the ten: ${LANGUAGES.map((l) => `${l.name}${l.dir === "rtl" ? " (right-to-left)" : ""}`).join(", ")}`];
      const t = io.json("translations.json");
      if (!Array.isArray(t?.pages)) return [...lines, "NOT MEASURED — the batch files no translations (translations.json); a client's translation runs on the client's own AI connection"];
      for (const p of t.pages) for (const x of p.translations ?? []) { const r = checkTranslation(p.source, x); lines.push(`  ${p.url} · ${x.lang}: ${r.ok ? "OK" : `REFUSED — ${r.why}`}`); }
      return lines;
    },
  }),
  /* F67 · the quick sample — the same checks */
  "score-quick": Object.freeze({
    title: "F67 · VISIBILITY SCORE (QUICK)",
    run: (io) => scoreLines(runMode({ mode: "quick", evidenceByUrl: storedEvidence(io), sample: 3 }), io.list),
  }),
});
