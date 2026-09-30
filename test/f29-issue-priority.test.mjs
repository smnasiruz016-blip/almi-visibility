/**
 * F29 · TECHNICAL ISSUE PRIORITIZATION (acceptance _handoffs c8eee0c, RR-96).
 *
 * Every expected layer below is written by hand from its fixture. Real findings and partitions are read, never written; nothing is fetched;
 * the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { rankIssues, compare, dimensionsOf } from "../src/audit/issue-priority.mjs";
import { readClientIssuePriority, clientPageIds, FINDINGS_STORE } from "../src/audit/issue-priority-reader.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { declaredOrigins } from "../src/evidence/evidence-cache-real.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const issue = (id, over = {}) => ({ id, issueClass: "c", evidence: 2, reach: 10, reachWindow: "w", severity: "high", effort: null, reversibility: null, ...over });
/* the real declared clients that own recorded issues, found by measurement — never typed */
const owners = () => {
  const resolve = createTenantResolver();
  const issues = createJsonlStore(FINDINGS_STORE).readAll().filter((r) => r.record_type === "issue" && r.state === "OPEN");
  const tenants = [...new Set(declaredOrigins().map((o) => o.tenantId))];
  const counts = tenants.map((t) => { const ids = clientPageIds({ tenantId: t, resolve }); return { t, n: issues.filter((i) => ids.has(i.target_page_id)).length }; }).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  return { resolve, issues, counts, client: resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId };
};

/* ================= C3 — dominance only ================= */

test("C3 · FIRING CONTROL: an issue ranks above another only when it dominates it; incomparable issues share a layer; no weight is invented", () => {
  const r = rankIssues([issue("a", { reach: 100, severity: "critical" }), issue("b", { reach: 50 }), issue("c", { reach: 10 })]);
  assert.deepEqual(r.layers, [["a"], ["b"], ["c"]], "a dominated issue was not placed below its dominator");
  /* higher reach but lower severity: neither dominates — same layer, never ordered by a guessed weight */
  const trade = rankIssues([issue("x", { reach: 1000, severity: "low" }), issue("y", { reach: 1, severity: "critical" })]);
  assert.deepEqual(trade.layers, [["x", "y"]], "an order was invented between incomparable issues");
  /* equal on every recorded dimension: one layer, never broken by id */
  assert.deepEqual(rankIssues([issue("z"), issue("a")]).layers, [["z", "a"]], "a tie was broken by id");
});

test("C2/C3 · a dimension recorded for one issue and not the other never decides an order; NOT MEASURED takes no part and is counted", () => {
  /* the pair differs on another dimension, so skipping the missing one WOULD let one issue dominate — it must not */
  const a = dimensionsOf({ ...issue("a", { reach: 100, severity: "critical" }), affectedPopulation: 1 }), b = dimensionsOf({ ...issue("b", { reach: null, severity: "low" }), affectedPopulation: 1 });
  assert.equal(compare(a, b), 0, "a missing reach let one issue outrank another");
  assert.deepEqual(rankIssues([issue("a", { reach: 100, severity: "critical" }), issue("b", { reach: null, severity: "low" })]).layers, [["a", "b"]]);
  /* a recorded but non-numeric effort is not a measurement — it is NOT MEASURED, never estimated */
  assert.equal(rankIssues([issue("s", { effort: "large", reversibility: "easy" })]).notMeasured.effort, 1, "a non-numeric effort was estimated");
  const r = rankIssues([issue("a", { reach: 100 }), issue("b", { reach: null })]);
  assert.deepEqual(r.layers, [["a", "b"]]);
  assert.equal(r.notMeasured.reach, 1);
  assert.deepEqual([r.notMeasured.effort, r.notMeasured.reversibility], [2, 2], "an unrecorded effort or reversibility was estimated");
  /* when recorded, lower effort and greater reversibility rank first */
  assert.deepEqual(rankIssues([issue("hard", { effort: 5, reversibility: 1 }), issue("easy", { effort: 1, reversibility: 5 })]).layers, [["easy"], ["hard"]]);
  /* affected population is this client's issues of the same class */
  assert.deepEqual(rankIssues([issue("p1", { issueClass: "k" }), issue("p2", { issueClass: "k" }), issue("q", { issueClass: "m" })]).layers, [["p1", "p2"], ["q"]]);
});

/* ================= C1 — the client's own issues ================= */

test("C1 · REAL: each client ranks only its own issues; the reference client's population is empty and reported so; no issue is ranked for two clients", () => {
  const { resolve, issues, counts, client } = owners();
  assert.ok(counts.length >= 2, "fewer than two real clients own recorded issues — this proof would be vacuous");
  const ranked = counts.map(({ t }) => readClientIssuePriority({ tenantId: t, resolve }));
  const ids = ranked.flatMap((r) => r.ranking.layers.flat());
  assert.equal(new Set(ids).size, ids.length, "an issue was ranked for two clients");
  assert.ok(ids.length <= issues.length);
  for (const [i, { n }] of counts.entries()) assert.equal(ranked[i].ranking.issues, n, "a client's own issue was dropped, or another client's appeared");
  const ref = readClientIssuePriority({ tenantId: client, resolve });
  assert.deepEqual([ref.ranking.issues, ref.ranking.layers.length], [0, 0]);
  assert.match(ref.bound, /0 in this client's own partition/);
  console.log(`  REAL (count-only): clients owning issues ${counts.length} (issues ${counts.map((c) => c.n).join(", ")}) · unattributed ${issues.length - counts.reduce((s, c) => s + c.n, 0)} · largest: ${JSON.stringify({ layers: ranked[0].ranking.layerSizes, notMeasured: ranked[0].ranking.notMeasured })} · reference client issues 0`);
});

test("C2 · REAL: every ranked issue's recorded dimensions come from its records; reach carries its window", () => {
  const { resolve, counts } = owners();
  const r = readClientIssuePriority({ tenantId: counts[0].t, resolve });
  assert.equal(r.ranking.notMeasured.severity, 0);
  assert.ok(r.ranking.windows.length > 0 && r.ranking.windows.every((w) => /^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(w)), "reach was shown without its window");
  assert.equal(r.ranking.layers.flat().length, r.ranking.issues, "an issue has no layer, or two");
});

/* ================= C4/C5 — nothing changed, recorded data only ================= */

test("C4/C5 · THE ENTRY POINT: in a declared world it prints the ranking with its bound and 'changes nothing', and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const findingsBefore = createHash("sha256").update(readFileSync(FINDINGS_STORE)).digest("hex");
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/issue-priority.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = readClientIssuePriority({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ open issue\(s\) in the findings store/);
    assert.match(ok.stdout, new RegExp(`issues ranked\\s+${r.ranking.issues} in ${r.ranking.layers.length} layer`), "the entry point printed another tenant's ranking");
    assert.match(ok.stdout, /a rank changes nothing and predicts no gain/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(createHash("sha256").update(readFileSync(FINDINGS_STORE)).digest("hex"), findingsBefore, "the findings store was changed");
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the ranking and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/issue-priority.mjs", "src/audit/issue-priority-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
