/**
 * 🔴 F62 · C9 · THE VERDICT JUDGE CAN FAIL — one sabotage per protection of C9 of F62's Acceptance Amendment 1 (_handoffs 94a6d17, RR-283
 * item 9) and of C1–C5 and C9 of its Amendment 2 (RR-287, V9–V14; V1–V8 restated to the refusals' new name, the same protections) in src/research/applicability-verdicts.mjs; the named test of test/f62-verdicts.test.mjs must turn red by an AssertionError.
 * Each span found EXACTLY ONCE, applied ALONE, restored by raw-byte sha256, the production trail hashed before and after. The engine of
 * test/helpers/rr282-batch-append-sabotage.mjs.
 *
 *   node test/helpers/f62-verdicts-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AV = "src/research/applicability-verdicts.mjs", T = "test/f62-verdicts.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `f62-verdicts-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* [id, limb, [[file, from, to], …], test file, named-test prefix, reason (optional)] */
const SABOTAGES = [
  ["V1", "C9 · a paraphrase decides a check", [[AV, "if (!present(v.excerpt) || !quotationIn(v.excerpt, r.text)) return refuse(", "if (!present(v.excerpt)) return refuse("]], T, "C9 · OFFICIAL · FIRING CONTROL:"],
  ["V2", "C9 · another body's page decides a check", [[AV, "if (!cited.includes(v.page)) return refuse(VERDICT_REFUSAL.NOT_A_CITED_PAGE, \"the excerpt's page", "if (false) return refuse(VERDICT_REFUSAL.NOT_A_CITED_PAGE, \"the excerpt's page"]], T, "C9 · OFFICIAL · FIRING CONTROL:"],
  ["V3", "C9 · an outcome not stated decides a check", [[AV, "if (!STATED.includes(v.outcome)) return refuse(", "if (false) return refuse("]], T, "C9 · OFFICIAL · FIRING CONTROL:"],
  ["V4", "C9 · a cited page never read counts as checked", [[AV, "if (cited.length === 0 || unread.length) return refuse(", "if (cited.length === 0) return refuse("]], T, "C9 · CHECKED_NOT_FOUND · FIRING CONTROL:"],
  ["V5", "C9 · a CHECKED_NOT_FOUND line naming nothing stands", [[AV, "if (!present(v.notFound)) return refuse(", "if (false) return refuse("]], T, "C9 · CHECKED_NOT_FOUND · FIRING CONTROL:"],
  ["V6", "C9 · a readable page is taken as BLOCKED", [[AV, "    return refuse(VERDICT_REFUSAL.NOT_BLOCKED,", "    return Object.freeze({ ...base, kind: VERDICT_KIND.BLOCKED, page: v.page, reason: \"x\" }); refuse(VERDICT_REFUSAL.NOT_BLOCKED,"]], T, "C9 · BLOCKED · FIRING CONTROL:"],
  ["V7", "C9 · two verdicts for one check — one is chosen", [[AV, "if (mine.length > 1) return refuse(", "if (false) return refuse("]], T, "C9 · ONE VERDICT PER CHECK:"],
  ["V8", "C9 · read back: another body's verdict decides a check", [[AV, "const mine = v && v.body === c.body && sameScope(v.scope, c.scope);", "const mine = Boolean(v);"]], T, "C9 · READ BACK · FIRING CONTROL (RR-286, Amendment 2):"],
  ["V9", "A2 C3/C9 · a licence-barred page's held text decides a check", [[AV, "if (barred.length && (!v || v.kind !== VERDICT_KIND.OFFICIAL || barred.includes(v.page))) return", "if (false) return"]], T, "A2 · LICENCE · FIRING CONTROL:"],
  ["V10", "A2 C1/C9 · a check's state is named UNKNOWN", [[AV, "if (mine && v.kind) return Object.freeze({ ...c, outcome: v.kind,", "if (mine && v.kind) return Object.freeze({ ...c, outcome: \"UNKNOWN\","]], T, "A2 · NO UNKNOWN:"],
  ["V11", "A2 C4 · one body's verdict decides another body's cell (the body dropped from the key)", [[AV, "const id = JSON.stringify([c.body, keys.map((k) => key[k])]);", "const id = JSON.stringify([keys.map((k) => key[k])]);"]], T, "A2 · THE KEY · FIRING CONTROL:"],
  ["V12", "A2 C4 · a cell NOT NAMED for a key decides a named value", [[AV, "onKey.keys.every((k) => c.key[k] === (key?.[k] ?? NOT_NAMED))", "onKey.keys.every((k) => c.key[k] === NOT_NAMED || c.key[k] === key?.[k])"]], T, "A2 · THE KEY · FIRING CONTROL:"],
  ["V13", "A2 C1 · disagreeing OFFICIAL verdicts in one cell — one is chosen", [[AV, "if (outcomes.length > 1) return Object.freeze({ ...at, fault:", "if (false) return Object.freeze({ ...at, fault:"]], T, "A2 · THE KEY · FIRING CONTROL:"],
  ["V14", "A2 C2 · a fault is not counted apart", [[AV, "FAULTS: rows.filter((r) => !r.kind).length }),\n  });\n}", "FAULTS: 0 }),\n  });\n}"]], T, "C9 · ONE VERDICT PER CHECK:"],
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
  `F62 C9 verdicts sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
const total = RUN.length;
const totalProved = proved;
lines.push("", `proved ${totalProved} of ${total} (source ${proved} of ${RUN.length}) · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && totalProved === total ? 0 : 1;
