/**
 * 🔴 RR-243 · F78 ACCEPTANCE AMENDMENT 1 — ONE SABOTAGE PER PROTECTION (A1, C8, C9), AND TWO PER ENTRY POINT THAT OPENS A CONNECTOR.
 *
 *   node test/helpers/rr243-sabotage.mjs [--practice] [--only=<id>]      NOT part of `npm test`
 *
 * PRE-FLIGHT FIRST: every span must exist EXACTLY ONCE in the code live now (a span that does not is NOT PROVED, never skipped). Each
 * limb replaces its span ALONE, proves it LANDED, runs test/rr243-f78-cost.test.mjs, and requires its NAMED test to fail by an
 * AssertionError; the file is restored by raw bytes (sha256 checked) and the whole file must be GREEN again at the end. The production
 * trail is hashed before and after. The per-entry-point limbs are DERIVED from the run-cost census (tools/run-cost-census.mjs) — never a
 * list: for each entry point, W removes its recorder (its ledger write) and M removes the metering of its first connector (its "no
 * request without --confirm").
 * --practice writes runs/audit/rr243-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr243-sabotage-<date>T<hhmm>.txt.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { liveRunCostCensus } from "../../tools/run-cost-census.mjs";
import { productionFiles, censusOf } from "../../tools/root-connector-census.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/rr243-f78-cost.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr243-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const GB = "src/cost/gap-boundary.mjs", CB = "src/cost/cost-by-tenant.mjs", RC = "src/cost/run-cost.mjs", TL = "src/cost/tenant-ledger.mjs", TA = "src/cost/tenant-attribution.mjs", CR = "bin/crawl.mjs";

/* [id, limb, file, from, to, named test prefix] */
const MECHANISM = [
  ["S01", "A1 a post-boundary gap disproves C1", GB, "if (!(date < boundary)) return { ref, date, state: GAP_STATE.POST_BOUNDARY, listId: null };", "if (false) return { ref, date, state: GAP_STATE.POST_BOUNDARY, listId: null };", "A1-2 ·"],
  ["S02", "A1 an unlisted pre-boundary gap is refused", GB, ": { ref, date, state: GAP_STATE.UNLISTED, listId: null };", ": { ref, date, state: GAP_STATE.LISTED, listId: null };", "A1-2 ·"],
  ["S03", "A1 a listed gap is reported by name, never hidden", GB, "names: Object.freeze(list.map((g) => g.id))", "names: Object.freeze([])", "A1-2 ·"],
  ["S04", "A1 a list that no longer hashes to its pin disproves C1", GB, "const disproved = !listIntact ||", "const disproved =", "A1-2 ·"],
  ["S05", "A1 every read carries the frozen list", CB, "gapList = PRE_BOUNDARY_GAPS,", "gapList = [],", "A1-3 ·"],
  ["S06", "C8 no request without --confirm", RC, "if (!permission?.mayWrite) {", "if (false) {", "C8-3 ·"],
  ["S07", "C8 one entry for every run (the exit hook)", RC, "  onExit((code) => api.finish(code));", "", "C8-2 ·"],
  ["S08", "C8 never a second entry beside the run's own", RC, "if (written || coveredBy) return null;", "if (written) return null;", "C8-2 ·"],
  ["S09", "C8 every request through the connector is counted", RC, "requests += 1; kinds[kind] = (kinds[kind] ?? 0) + 1;", "kinds[kind] = (kinds[kind] ?? 0) + 1;", "C8-2 ·"],
  ["S10", "C8 a dry crawl makes no network request (no egress probe)", CR, "const egress = live ? await measureIpv6Egress() :", "const egress = true ? await measureIpv6Egress() :", "C8-4 ·"],
  ["S11", "C9 a ledger is a tenant's only when F02 decides it is the same tenant", TL, "if (mine.length !== 1 || !decideResolvedTenants(mine[0].tenantId, tenantId).allowed)", "if (mine.length !== 1)", "C9-3 ·"],
  ["S12", "C9 an entry naming another tenant is counted for nobody", TA, "return decideResolvedTenants(entry.scope?.tenantId, ledgerTenant).allowed ? out(", "return true ? out(", "C9-3 ·"],
  ["S13", "C9 a tenant with no declared ledger is refused before any request (the recorder's layer)", RC, 'if (ledger.state !== "DECLARED") {', "if (false) {", "C9-2b ·"],
  ["S14", "C9 a live crawl names its tenant's own ledger, never the shared one", CR, "RESOURCES.costLedger(ownLedgerRef())] : [])", "RESOURCES.costLedger()] : [])", "C9-4 ·"],
  ["S15", "C9 a test run never writes the real data repository's ledger", RC, 'if (inVerifiedTestContext(env) && (fromTmp.startsWith("..") || isAbsolute(fromTmp))) {', "if (false) {", "C9-2b ·"],
];

/* the per-entry-point limbs, DERIVED from the census: W (the recorder) and M (the first connector's metering) */
const sites = censusOf(productionFiles(REPO).map((file) => ({ file, text: read(file).toString("utf8") }))).sites.filter((s) => s.kind === "CONNECTOR");
const PER_ENTRY = liveRunCostCensus(REPO).flatMap((row, i) => {
  const text = read(row.file).toString("utf8").replace(/\r\n/g, "\n");
  const n = String(i + 1).padStart(2, "0");
  const recorder = text.match(new RegExp(`runCost\\(\\{ entryPoint: "${row.file.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}"`))?.[0] ?? `runCost({ entryPoint: "${row.file}"`;
  const firstLine = text.split("\n")[Math.min(...sites.filter((s) => s.file === row.file).map((s) => s.line)) - 1];
  return [
    [`W${n}`, `C8 ${row.file} writes its run's cost entry (its recorder)`, row.file, recorder, recorder.replace("runCost(", "runCostRemoved("), "C8-1 ·"],
    /* the whole line, from its line break: a line that is a suffix of another (crawl's CONNECTOR within SM_CONNECTOR) stays unique */
    [`M${n}`, `C8 ${row.file} makes no request without --confirm (its connector is metered)`, row.file, `\n${firstLine}`, `\n${firstLine.replace("RUN_COST.metered(openConnector(", "(openConnector(")}`, "C8-1 ·"],
  ];
});
const SABOTAGES = [...MECHANISM, ...PER_ENTRY];
const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }

const FILES = [...new Set(RUN.map((s) => s[2]))];
const originals = new Map(FILES.map((p) => [p, read(p)]));
const restore = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restore);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => (s ? text.split(inEol(text, s)).length - 1 : 0);
const textOf = (p) => originals.get(p).toString("utf8");
const preflight = RUN.map((s) => [s[0], occurrences(textOf(s[2]), s[3])]);
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const start = ls.findIndex((x) => /✖ failing tests:/.test(x));
  const at = ls.findIndex((l, i) => i > start && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baseOut = `${base.stdout}${base.stderr}`;
const baseGreen = base.status === 0 && RUN.every((s) => new RegExp(`✔ ${esc(s[5])} `).test(baseOut)) && !/ℹ skipped [1-9]/.test(baseOut);
const lines = [
  `RR-243 F78 Amendment 1 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) = ${RUN.filter((s) => /^S/.test(s[0])).length} on the mechanism + ${RUN.filter((s) => /^[WM]/.test(s[0])).length} on the ${new Set(RUN.filter((s) => /^[WM]/.test(s[0])).map((s) => s[2])).size} entry points the run-cost census finds · over ${T} · each applied ALONE`,
  `BASELINE: ${baseGreen ? "GREEN (every named test passed, none skipped)" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, named] of baseGreen ? RUN : []) {
  const text0 = textOf(file), original = originals.get(file);
  if (occurrences(text0, from) !== 1 || to === from) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const ff = inEol(text0, from), at = text0.indexOf(ff);
  writeFileSync(join(REPO, file), text0.slice(0, at) + inEol(text0, to) + text0.slice(at + ff.length), "utf8");
  const landed = sha(read(file)) !== sha(original);
  let out = "", failing = [];
  try { const r = run(); out = `${r.stdout}${r.stderr}`; failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]); }
  finally { writeFileSync(join(REPO, file), original); }
  const restored = sha(read(file)) === sha(original);
  const red = failing.some((n) => n.startsWith(`${named} `));
  const cls = failureClassOf(out, named);
  const ok = landed && red && cls === "AssertionError" && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} · ${file}: landed ${landed} · "${named}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
  console.log(lines.at(-1));
}
const after = run();
const greenAgain = after.status === 0;
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `GREEN after restore: ${greenAgain}`, `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.slice(-2).join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length && greenAgain ? 0 : 1;
