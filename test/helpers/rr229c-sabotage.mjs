/**
 * 🔴 RR-229 (c) · F19 ACCEPTANCE AMENDMENT 1 · THE REAL CENSUS CAN FAIL — one sabotage per clause of test/f19-a1-real.test.mjs (each clause
 * made a check that never fires); the in-test CONTROL over a corrupted copy of a real record must turn red by an AssertionError. Each span
 * found EXACTLY ONCE, applied ALONE, restored by raw-byte sha256, the production trail hashed before and after. Fixture/real records are
 * only READ. The engine of test/helpers/rr227-sabotage.mjs, without its census-control step.
 *
 *   node test/helpers/rr229c-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SM = "src/crawl/sitemap-collect.mjs", BB = "src/crawl/batch-bodies.mjs", B = "bin/crawl.mjs", AT = "bin/audit-technical.mjs", PF = "src/crawl/preflight.mjs", EA = "src/evidence/evidence-state-adapters.mjs";
const FRONTIER = "src/crawl/frontier.mjs", FETCHER = "src/crawl/fetcher.mjs", ROBOTS = "src/crawl/robots.mjs", CRAWLER = "src/crawl/crawler.mjs", LEDGER = "src/cost/ledger.mjs", CONN = "src/tenancy/connectors.mjs";
const A1 = "test/f19-a1.test.mjs", BOUNDS = "test/f19-crawler-bounds.test.mjs", GENERIC = "test/f19-generic-crawl.test.mjs", APPEND = "test/f19-real-append-path.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr229c-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* [id, limb, [[file, from, to], …], test file, named-test prefix, reason (optional)] */
const REAL = "test/f19-a1-real.test.mjs", REALT = "test/f19-a1-real.test.mjs";
const SABOTAGES = [
  /* RR-229 (c): each clause of F19 A1's REAL census neutralised — its in-test CONTROL must turn red by an AssertionError */
  ["L-WHOLE", "REAL LISTING · the WHOLE clause never fires", [[REAL, "  WHOLE: ({ record: r }) => (r.value.urlsTotal === r.value.urls.length && r.value.urlsStored === r.value.urls.length && r.value.storageBound === null ? [] : [\"the stored listing is not the whole listing read\"]),\n", "  WHOLE: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["L-HASH", "REAL LISTING · the HASH clause never fires", [[REAL, "  HASH: ({ record: r }) => (r.value.urlsSha256 === sha(JSON.stringify(r.value.urls)) && r.content_sha256 === r.value.urlsSha256 ? [] : [\"the hash does not cover the whole stored list\"]),\n", "  HASH: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["L-COVERAGE", "REAL LISTING · the COVERAGE clause never fires", [[REAL, "  COVERAGE: ({ record: r }) => {\n    const open = Object.values(r.value.causes ?? {}).reduce((n, x) => n + x, 0) + (r.value.childrenSkipped ?? 0);\n    return r.value.coverageState === \"COMPLETE\" ? (open === 0 ? [] : [\"COMPLETE with a cause open\"]) : r.value.coverageState === \"PARTIAL\" ? (open > 0 ? [] : [\"PARTIAL with no cause\"]) : r.value.coverageState === \"UNKNOWN\" ? [] : [\"an undeclared coverage state\"];\n  },\n", "  COVERAGE: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["L-BOUNDS", "REAL LISTING · the BOUNDS clause never fires", [[REAL, "  BOUNDS: ({ record: r }) => {\n    const b = r.value.bound ?? {};\n    const f = [];\n    for (const k of [\"maxChildren\", \"maxSitemapBytes\", \"timeoutMs\", \"intervalMs\", \"maxIndexDepth\"]) if (b[k] !== SITEMAP_BOUNDS[k]) f.push(`bound ${k} undeclared or not the declared value`);\n    if (b.robots !== \"HONOURED\") f.push(\"robots not honoured\");\n    if (!(r.value.childrenFetched <= b.maxChildren)) f.push(\"more children fetched than the bound\");\n    if (!(r.value.requests <= 3 + b.maxChildren * 2)) f.push(\"more requests than robots, two root candidates and the children (each with one retry) allow\");\n    if ((r.value.pacing?.breaches ?? 1) !== 0) f.push(\"two requests closer than the declared interval\");\n    return f;\n  },\n", "  BOUNDS: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["L-SITE_HELD", "REAL LISTING · the SITE_HELD clause never fires", [[REAL, "  SITE_HELD: ({ batch, record: r }) => {\n    const own = originsOf(tenantOf(batch));\n    return own.size > 0 && originOf(r.value.origin) && own.has(originOf(r.value.origin)) && r.value.urls.every((u) => own.has(originOf(u))) ? [] : [\"a listed URL or the collected origin is not a site origin of the batch's own tenant\"];\n  },\n", "  SITE_HELD: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["L-CEILING", "REAL LISTING · the CEILING clause never fires", [[REAL, "  CEILING: ({ fileBytes }) => (fileBytes <= BATCH_STORE_CEILING_BYTES ? [] : [\"the sitemap store is past its ceiling\"]),\n", "  CEILING: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["L-COUNT_ONLY", "REAL LISTING · the COUNT_ONLY clause never fires", [[REAL, "  COUNT_ONLY: ({ record: r }) => (/<html|<body|<!doctype/i.test(JSON.stringify(r)) ? [\"the listing record carries page content\"] : []),", "  COUNT_ONLY: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every listing clause fires on a corrupted copy of a real listing"],
  ["B-OWN_OBSERVATION", "REAL BODIES · the OWN_OBSERVATION clause never fires", [[REAL, "  OWN_OBSERVATION: ({ bodies, observations }) => { const ids = new Set(observations.map((o) => o.observation_id)); return bodies.every((b) => ids.has(b.observation_id)) ? [] : [\"a stored body names no observation of its batch\"]; },\n", "  OWN_OBSERVATION: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
  ["B-SAME_HASH", "REAL BODIES · the SAME_HASH clause never fires", [[REAL, "  SAME_HASH: ({ bodies, observations }) => { const m = new Map(observations.map((o) => [o.observation_id, o])); return bodies.every((b) => b.content_sha256 === m.get(b.observation_id)?.content_sha256 && sha(b.body) === b.content_sha256) ? [] : [\"a stored body is not its observation's bytes\"]; },\n", "  SAME_HASH: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
  ["B-TRUNCATED_MARKED", "REAL BODIES · the TRUNCATED_MARKED clause never fires", [[REAL, "  TRUNCATED_MARKED: ({ bodies, observations }) => { const m = new Map(observations.map((o) => [o.observation_id, o])); return bodies.every((b) => b.truncated === (m.get(b.observation_id)?.value?.truncated === true)) ? [] : [\"a body's truncated flag is not its observation's\"]; },\n", "  TRUNCATED_MARKED: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
  ["B-RESPONSE_BOUND", "REAL BODIES · the RESPONSE_BOUND clause never fires", [[REAL, "  RESPONSE_BOUND: ({ bodies }) => (bodies.every((b) => Buffer.byteLength(b.body, \"utf8\") <= MAX_RESPONSE_BYTES) ? [] : [\"a body past the response bound is stored whole\"]),\n", "  RESPONSE_BOUND: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
  ["B-CEILING", "REAL BODIES · the CEILING clause never fires", [[REAL, "  CEILING: ({ fileBytes }) => (fileBytes <= BATCH_STORE_CEILING_BYTES ? [] : [\"the body store is past its ceiling\"]),\n", "  CEILING: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
  ["B-RUN_COUNTS", "REAL BODIES · the RUN_COUNTS clause never fires", [[REAL, "  RUN_COUNTS: ({ bodies, runs }) => { const counted = runs.filter((r) => r.bodies).reduce((n, r) => n + r.bodies.stored, 0); const ok = runs.filter((r) => r.bodies).every((r) => Number.isInteger(r.bodies.stored) && Object.values(r.bodies.notStored ?? {}).every(Number.isInteger)); return ok && counted === bodies.length ? [] : [\"the run records do not count the bodies stored\"]; },\n", "  RUN_COUNTS: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
  ["B-RECORD_COUNT_ONLY", "REAL BODIES · the RECORD_COUNT_ONLY clause never fires", [[REAL, "  RECORD_COUNT_ONLY: ({ runs }) => (runs.some((r) => /<html|<body|<!doctype/i.test(JSON.stringify(r))) ? [\"a run record carries page content\"] : []),", "  RECORD_COUNT_ONLY: () => [],\n"]], REALT, "F19 A1 · CONTROLS · every body clause fires on a corrupted copy of a real body store"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1 && ONLY !== "CENSUS") { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = RUN.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = (testFile) => spawnSync(process.execPath, ["--test", testFile], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
/* BASELINE: every test file the limbs name, before any sabotage; each named test must be seen GREEN */
const testFiles = [...new Set(RUN.map((s) => s[3]))];
const baseOut = new Map(testFiles.map((t) => { const r = run(t); return [t, { ok: r.status === 0, out: `${r.stdout}${r.stderr}` }]; }));
const baselineGreen = [...baseOut.values()].every((x) => x.ok);
const seenGreen = ([, , , t, p]) => new RegExp(`✔ ${esc(p)} `).test(baseOut.get(t).out);
const namedGreen = RUN.every(seenGreen);
const lines = [
  `RR-229 (c) F19 A1 REAL-census sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} source sabotage(s) over ${testFiles.join(" + ")} · each applied ALONE · the real records are only READ; no network`,
  `BASELINE (the named test files before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · files green ${[...baseOut.values()].filter((x) => x.ok).length} of ${testFiles.length} · named tests seen GREEN ${RUN.filter(seenGreen).length} of ${RUN.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, testFile, expect, reason] of baselineGreen && namedGreen ? RUN : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const touched = [...new Set(spans.map((s) => s[0]))];
  for (const f of touched) {
    let text = originals.get(f).toString("utf8");
    for (const [, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); }
    writeFileSync(join(REPO, f), text, "utf8");
  }
  const landed = touched.every((f) => sha(read(f)) !== sha(originals.get(f)));
  let failing = [], out = "";
  try {
    const r = run(testFile);
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const byAssertion = cls === "AssertionError";
  const why = reason ? reason.test(out) : true;
  const syntax = /SyntaxError/.test(out);
  const ok = landed && red && byAssertion && why && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}] → ${testFile}: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"}${reason ? ` · its reason ${why}` : ""} · SyntaxError ${syntax} · failing ${[...new Set(failing.map((n) => n.split(" · ")[0]))].join(",")} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
/* the 10 real-census controls (RR-135), re-run on a COPY of the data root — the real root is never written */
let census = { proved: 0, of: 10, line: "NOT RUN" };
if (false) {
  const r = spawnSync(process.execPath, ["test/helpers/f19-census-controls.mjs"], { cwd: REPO, encoding: "utf8", timeout: 1800000 });
  const m = `${r.stdout}`.match(/proved (\d+) of (\d+)/);
  census = { proved: m ? Number(m[1]) : 0, of: m ? Number(m[2]) : 10, line: `${r.stdout}`.trim().split("\n").map((l) => `  ${l}`).join("\n") };
  lines.push("", "REAL-CENSUS CONTROLS (test/helpers/f19-census-controls.mjs, on a copy of the data root):", census.line);
  console.log(lines.slice(-2).join("\n"));
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
const total = RUN.length;
const totalProved = proved;
lines.push("", `proved ${totalProved} of ${total} (source ${proved} of ${RUN.length}) · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && totalProved === total ? 0 : 1;
