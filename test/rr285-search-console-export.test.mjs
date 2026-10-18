/**
 * RR-285 task 1 · the client's own Search Console export, read from its files (src/discovery/search-console-export.mjs). Firing controls on
 * fixed texts; REAL over the export the client filed privately in the declared batch and the records kept from it. Nothing fetched; the
 * production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

import { readSearchConsoleExport, csvRows, EXPORT_REFUSAL, EXPORT_RECORD } from "../src/discovery/search-console-export.mjs";
import { privateSourcesRoot } from "../src/facts/private-texts.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const Q = "Top queries,Clicks,Impressions,CTR,Position\nexam fee,0,40,0%,44.25\n\"a, b\",1,3,33%,5\n";
const P = "Top pages,Clicks,Impressions,CTR,Position\nhttps://a.example/x,1,3,33%,2\nhttps://a.example/y,0,37,0%,41\n";
const C = "Date,Clicks,Impressions,CTR,Position\n2026-06-26,0,0,,\n2026-10-15,1,43,,\n";
const META = { exportedOn: "2026-10-18", source: "a named export" };

test("the export: each query a SEARCH_CONSOLE, OBSERVED phrase dated the export day; pages, totals and window summed; a link file with no row is 0 links", () => {
  const r = readSearchConsoleExport({ queries: Q, pages: P, chart: C, links: ["Linking page,Last crawled\n", "Linking page\n"] }, META);
  assert.deepEqual(r.phrases.map((p) => [p.phrase, p.source, p.label, p.recorded_at.slice(0, 10)]), [["exam fee", "SEARCH_CONSOLE", "OBSERVED", "2026-10-18"], ["a, b", "SEARCH_CONSOLE", "OBSERVED", "2026-10-18"]]);
  assert.equal(r.record.record_type, EXPORT_RECORD);
  assert.deepEqual([r.record.window, r.record.totals, r.record.pages.rows, r.record.pages.impressions, r.record.links], [{ from: "2026-06-26", to: "2026-10-15", days: 2 }, { clicks: 1, impressions: 43 }, 2, 40, { files: 2, rows: 0 }]);
  assert.equal(r.record.source, "a named export");
  const withLink = readSearchConsoleExport({ queries: Q, pages: P, chart: C, links: ["Linking page,Last crawled\nhttps://b.example/,2026-10-01\n"] }, META);
  assert.equal(withLink.record.links.rows, 1, "CONTROL: a link row is counted");
});

test("FIRING CONTROLS: no export day, no named source, or a file that is not the named kind refuses the whole import, named", () => {
  assert.equal(readSearchConsoleExport({ queries: Q, pages: P, chart: C }, { ...META, exportedOn: "18 Oct" }).refusal, EXPORT_REFUSAL.NO_DATE);
  assert.equal(readSearchConsoleExport({ queries: Q, pages: P, chart: C }, { ...META, source: " " }).refusal, EXPORT_REFUSAL.NO_SOURCE);
  assert.equal(readSearchConsoleExport({ queries: P, pages: P, chart: C }, META).refusal, EXPORT_REFUSAL.NO_QUERIES);
  assert.equal(readSearchConsoleExport({ queries: Q, pages: Q, chart: C }, META).refusal, EXPORT_REFUSAL.NO_PAGES);
  assert.equal(readSearchConsoleExport({ queries: Q, pages: P, chart: null }, META).refusal, EXPORT_REFUSAL.NO_CHART);
  assert.equal(csvRows("", "Top queries"), null);
});

const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const PRIV = privateSourcesRoot(process.env);
const FOLDER = PRIV.state === "DECLARED" ? join(PRIV.dir, relative(lookupStore(index, "RESEARCH").rootPath, BATCH), "client-files", "search-console-2026-10-18") : null;
const HERE = FOLDER !== null && existsSync(join(FOLDER, "meta.json")) && existsSync(join(BATCH, "search-phrases.jsonl"));
const SKIP = HERE ? false : "the client's export is not filed on this machine (private sources root)";

test("REAL · the export the client filed: 112 days, 1 click, 507 impressions, 50 queries kept once each as observed phrases, 0 links — and the kept summary is this export's", { skip: SKIP }, () => {
  const t = (f) => readFileSync(join(FOLDER, f), "utf8");
  const meta = JSON.parse(t("meta.json"));
  const r = readSearchConsoleExport({ queries: t(meta.files.queries), pages: t(meta.files.pages), chart: t(meta.files.chart), links: meta.files.links.map(t) }, meta);
  assert.deepEqual([r.record.window.days, r.record.totals.clicks, r.record.totals.impressions, r.record.queries.rows, r.record.links.rows], [112, 1, 507, 50, 0]);
  /* a resighting of a phrase carries the phrase's own key; only the records themselves are counted */
  const held = readFileSync(join(BATCH, "search-phrases.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).filter((h) => h.record_type !== "resighting");
  const keys = new Map(held.map((h) => [h.measurement_key, (/** count */ 0)]));
  for (const h of held) keys.set(h.measurement_key, keys.get(h.measurement_key) + 1);
  for (const p of r.phrases) assert.equal(keys.get(p.measurement_key), 1, `${p.phrase} is kept ${keys.get(p.measurement_key) ?? 0} times`);
  assert.equal(keys.get(r.record.measurement_key), 1, "the export's summary is not kept exactly once");
  console.log(`  REAL (count-only): window ${r.record.window.from} – ${r.record.window.to} · clicks ${r.record.totals.clicks} · impressions ${r.record.totals.impressions} · queries ${r.phrases.length} kept once each · pages ${r.record.pages.rows} · links ${r.record.links.rows}`);
});

test("ENTRY · bin/search-console-export.mjs: counts only without --confirm, no trail event; a bad call is a usage exit", { skip: SKIP }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/search-console-export.mjs", "--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--folder=search-console-2026-10-18"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /links {12}0 on 2026-10-18/);
  assert.match(r.stdout, /NOT RECORDED/);
  assert.equal(go(["--folder=other"]).status, 2);
  assert.equal(trailSha(), TRAIL_BEFORE, "a counting run wrote the trail");
});

test("the import names no product and loads no module that can make a network, process, connector or paid call — and the control fires", () => {
  const F = "src/discovery/search-console-export.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
