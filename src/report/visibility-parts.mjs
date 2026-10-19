/**
 * RR-291 · the parts bin/visibility-parts.mjs prints — one per board row built under light proof. Each part reads the client's own stored
 * records through the `io` the bin hands it (its subject and research batch, already decided by the scope gate) and returns count-only lines.
 * The rules live in each row's own module; this file only wires inputs to them.
 *
 * Generic: it names no client, product or host.
 */
import { demandEvidence } from "../research/demand-observation-evidence.mjs";
import { needMeasure, supplyMeasure, visibilityMeasure, demandMeasure, demandEvidenceOf } from "../research/four-measures.mjs";
import { runMode, findingsOf, evidenceByUrl } from "./visibility-score.mjs";
import { renderReport } from "./visibility-report-html.mjs";
import { KINDS, consentGate, evidenceCounts } from "../intake/client-supplied.mjs";
import { crawlItem, diffRuns } from "./change-and-scale.mjs";
import { admitObservation, perSystem, shareOfVoice, influenceGraph, gapsOf, actionsForGaps } from "../research/ai-visibility.mjs";

/** F66–F68 · the stored evidence of the client's own live pages, by URL */
const storedEvidence = (io) => evidenceByUrl({ pageReads: io.rows("live-pages.jsonl"), securityReads: io.rows("live-security.jsonl"), linkObs: io.rows("link-status.jsonl") });
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
      return renderReport({ title: `Visibility report · ${io.subject}`, run: s, findings: findingsOf(s.results), on: io.on ?? "today", brand: io.brand ?? null, lead: io.lead ?? undefined }).split("\n");
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
      const { loadPlaywright, startDocumentServer, launchOfflineChromium } = await import("../render/renderer.mjs");
      const { runLab, speedFinding, LAB_BOUND, DEVICE, NOT_MEASURED: NM } = await import("../render/lab-speed.mjs");
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
  /* F67 · the quick sample — the same checks */
  "score-quick": Object.freeze({
    title: "F67 · VISIBILITY SCORE (QUICK)",
    run: (io) => scoreLines(runMode({ mode: "quick", evidenceByUrl: storedEvidence(io), sample: 3 }), io.list),
  }),
});
