#!/usr/bin/env node
/**
 * 🔴 RR-135 · F19 · CAN THE REAL CENSUS FAIL? — one corruption per clause, each on a COPY of the data root, each required to turn its named
 * census test red by AssertionError. The real data root is never written; each copy is deleted after its run.
 *
 *   node test/helpers/f19-census-controls.mjs --deliberate        evidence: runs/audit/f19-real-census-controls-rr135-2026-10-02.txt (count-only)
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DATA_ROOT } from "./declared-world.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* GENERIC: the target is the LAST run the census itself discovers — this file names no batch, subject or site */
const { discoverRuns } = await import("../f19-real-run-census.test.mjs");
const DISCOVERED = discoverRuns(DATA_ROOT);
if (DISCOVERED.length < 2) throw new Error("fewer than two real runs: nothing to control");
const LAST = DISCOVERED.length;
const BATCH = join(JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).stores.find((s) => s.store === "RESEARCH").path, DISCOVERED.at(-1).batch);
const rw = (root, file, fn) => {
  const p = join(root, BATCH, file);
  const recs = readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  writeFileSync(p, fn(recs).map((r) => JSON.stringify(r)).join("\n") + "\n");
};
const run = (recs) => recs.find((r) => r.record_type === "crawl_run");
const CONTROLS = [
  ["K1", "a page beyond depth 0 (not a seed) was read", "DEPTH", (root) => rw(root, "crawl.jsonl", (recs) => { const o = recs.find((r) => r.record_type === "observation"); recs.push({ ...o, value: { ...o.value, requested_url: new URL("/not-a-seed", o.value.requested_url).toString() } }); run(recs).urlsFetched += 1; return recs; })],
  ["K2", "two requests closer than the interval", "RATE", (root) => rw(root, "crawl.jsonl", (recs) => { const p = run(recs).pacing; p.breaches = 1; p.fastestGapMs = 999; p.ok = false; return recs; })],
  ["K3", "a body over the size cap stored whole", "RESPONSE SIZE", (root) => rw(root, "crawl.jsonl", (recs) => { recs.find((r) => r.record_type === "observation").value.bytes = 3 * 1024 * 1024; return recs; })],
  ["K4", "a request ran past its timeout", "TIMEOUT", (root) => rw(root, "crawl.jsonl", (recs) => { recs.find((r) => r.record_type === "observation").value.timing_ms = 20000; return recs; })],
  ["K5", "a page fetched without robots allowing it", "ROBOTS", (root) => rw(root, "crawl.jsonl", (recs) => { recs.find((r) => r.record_type === "observation").value.robotsState = "UNKNOWN"; return recs; })],
  ["K6", "a resource of another site was read", "SCOPE", (root) => rw(root, "crawl.jsonl", (recs) => { const o = recs.find((r) => r.record_type === "observation"); o.value.requested_url = "https://another-site.invalid/x"; return recs; })],
  ["K7", "money written as a number nobody measured", "PUBLIC ONLY", (root) => rw(root, "ledger.jsonl", (recs) => { recs[0].money.amount = 0; return recs; })],
  ["K8", "page content in the committed record", "RECORD", (root) => rw(root, "crawl.jsonl", (recs) => { recs.find((r) => r.record_type === "observation").value.note = "<html><body>x</body></html>"; return recs; })],
  ["K9", "more requests to one host than the declared cap", "PAGES", (root) => rw(root, "crawl.jsonl", (recs) => { const r = run(recs); r.perHostRequests = Object.fromEntries(Object.keys(r.perHostRequests).map((h) => [h, r.maxRequestsPerHost + 1])); return recs; })],
  ["K10", "a run record removed (the population falls below two runs)", "POPULATION", (root) => rw(root, "crawl.jsonl", (recs) => recs.filter((r) => r.record_type !== "crawl_run"))],
];

const lines = [`F19 real-census controls · ${new Date().toISOString()} · each corruption on a copy of the data root · count-only`];
let proved = 0;
for (const [id, what, name, corrupt] of CONTROLS) {
  const root = mkdtempSync(join(tmpdir(), "f19-census-control-"));
  try {
    cpSync(DATA_ROOT, root, { recursive: true, filter: (s) => !s.split(sep).includes(".git") });
    corrupt(root);
    const title = name === "POPULATION" ? "F19 · REAL · the population" : `F19 · REAL run ${LAST} · ${name}`;
    const r = spawnSync(process.execPath, ["--test", `--test-name-pattern=${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "test/f19-real-run-census.test.mjs"], { cwd: REPO, encoding: "utf8", env: { ...process.env, F19_CENSUS_ROOT: root }, timeout: 120000 });
    const fail = Number((r.stdout.match(/^ℹ fail (\d+)/m) ?? [])[1] ?? NaN);
    const ran = Number((r.stdout.match(/^ℹ tests (\d+)/m) ?? [])[1] ?? NaN);
    const reason = /AssertionError/.test(r.stdout) ? "AssertionError" : "OTHER";
    /* a pattern that matched NO test proves nothing: K10's first run, and a run on stale names that still reported "tests 1".
     * The NAMED test's own failing line must appear, it must be the only failure, and the reason must be an assertion. */
    const namedFailed = r.stdout.split("\n").some((l) => l.startsWith(`✖ ${title}`));
    const ok = namedFailed && fail === 1 && reason === "AssertionError";
    if (ok) proved += 1;
    lines.push(`${id} ${what}: named test failing ${namedFailed} · tests run ${ran} · failing ${fail} · reason ${reason} · ${ok ? "PROVED" : "NOT PROVED — a FINDING"}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
lines.push(`proved ${proved} of ${CONTROLS.length} · the real data root was not written`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
let out = join(REPO, "runs", "audit", "f19-real-census-controls-rr135-2026-10-02.txt");
if (existsSync(out)) out = out.replace(/\.txt$/, `-${Date.now()}.txt`);
writeFileSync(out, lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(proved === CONTROLS.length ? 0 : 1);
