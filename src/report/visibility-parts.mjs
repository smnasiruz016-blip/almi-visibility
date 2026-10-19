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
  /* F67 · the quick sample — the same checks */
  "score-quick": Object.freeze({
    title: "F67 · VISIBILITY SCORE (QUICK)",
    run: (io) => scoreLines(runMode({ mode: "quick", evidenceByUrl: storedEvidence(io), sample: 3 }), io.list),
  }),
});
