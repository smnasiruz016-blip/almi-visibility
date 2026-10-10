/**
 * 🔴 F81 · SEARCH PERFORMANCE · ONE SABOTAGE PER SAFEGUARD (RR-132 §3).
 *
 *   node test/helpers/f81-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f81-sabotage-rr132-2026-10-02.txt (its own file).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TR = "src/search/performance-tracker.mjs", RD = "src/search/performance-reader.mjs", IN = "src/search/ingest.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f81-search-performance.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · FIRING CONTROL", C2 = "C2 · FIRING CONTROL", C3 = "C3 · FIRING CONTROL", C4 = "C4 · FIRING CONTROL", C5 = "C5 · FIRING CONTROL";
const C6A = "C6 · FIRING CONTROL: the performance set runs", C6B = "C6 · FIRING CONTROL: a property the account", ENTRY = "C7 · THE ENTRY POINT", NET = "the tracker and its reader";

const SABOTAGES = [
  ["P1", "C1 a row reaches only the client its stored origin is declared to", RD, "    const mine = new Set(p.partitions.get(tenantId) ?? []);", "    const mine = new Set([...p.partitions.values()].flat());", C1],
  ["P2", "C1 only a genuine, allowed F02 decision opens a client's partition", RD, "  if (!isGenuineDecision(decision) || !decision.allowed) throw", "  if (false) throw", C1],
  ["P3", "C1 a site-wide row is never a client's row", RD, "out.push({ ...base, clientRows: null, siteWideRows: rows ? rows.length : 0, quarantined: 0 });", "out.push({ ...base, clientRows: rows ?? [], siteWideRows: rows ? rows.length : 0, quarantined: 0 });", C1],
  ["P4", "C2 a dimension is tracked only from a pull carrying it", TR, "    const carrying = clientPulls.filter((o) => o.dims.includes(d));", "    const carrying = clientPulls;", C2],
  ["P5", "C3 CTR over zero impressions is NOT MEASURED", TR, "    ctr: impressions > 0 ?", "    ctr: true ?", C3],
  ["P6", "C3 no position is invented for a pull that records none", TR, "    position: !recordsPosition ? { value: NOT_MEASURED", "    position: false ? { value: NOT_MEASURED", C3],
  ["P7", "C3 position is the impression-weighted mean of recorded positions", TR, "posSum += p * (num(r.impressions) ?? 0);", "posSum += p;", C3],
  ["P8", "C4 a window trend needs two recorded windows", TR, "    if (os.length >= 2) series.push", "    if (os.length >= 1) series.push", C4],
  ["P9", "C4 a dated trend needs two recorded dates", TR, "      if (byDate.size >= 2) series.push", "      if (byDate.size >= 1) series.push", C4],
  ["P10", "C5 a pull not COMPLETE contributes nothing", TR, "  const clientPulls = used.filter((o) => o.complete && Array.isArray(o.clientRows));", "  const clientPulls = used.filter((o) => Array.isArray(o.clientRows));", C5],
  ["P11", "C5 the latest reading of a pull and window is used", TR, "    else { superseded += 1; if (String(o.observedAt) > String(prev.observedAt)) latest.set(k, o); }", "    else { superseded += 1; }", C5],
  ["P12", "C6 a performance pull keeps the ingest's request ceiling", IN, "const res = await provider.queryRows({ propertyId, startDate, endDate, dimensions: dims, rowLimitPerRequest: 25000, maxRequests: 20 });", "const res = await provider.queryRows({ propertyId, startDate, endDate, dimensions: dims, rowLimitPerRequest: 25000, maxRequests: 200 });", C6A],
  ["P13", "C6 every performance row keeps its page", IN, "        url: r.keys?.[1] ?? null,\n", "        url: null,\n", C6A],
  ["P14", "C6 the performance set runs nothing of the estate set", IN, "    return { ...results, pullSet, startDate, endDate };\n", "", C6A],
  ["P15", "C6 an undeclared pull set is refused", IN, "  if (!Object.hasOwn(PULL_SETS, pullSet)) throw", "  if (false) throw", C6A],
  ["P16", "C7 an unrecorded bound prints NOT MEASURED, never NaN", RD, "requests: Number.isInteger(v.requestCount) ? v.requestCount : NOT_MEASURED,", "requests: v.requestCount ?? NaN,", ENTRY],
  ["P17", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, NET],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F81 search performance sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
    reasons = [...new Set([...`${r.stdout}${r.stderr}`.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|Error)\b/gm)].map((m) => m[1]))].join("/") || "none";
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored && !/SyntaxError/.test(reasons);
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f81-sabotage-rr132-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
