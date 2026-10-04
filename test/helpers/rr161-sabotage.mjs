/**
 * 🔴 RR-161 · ONE SABOTAGE PER PROTECTION OF test/rr161-provider-adapter.test.mjs and RR-161 P10 (F16 Acceptance Amendment 4, C25–C26) — each on code
 * LIVE NOW, its span found EXACTLY ONCE, applied ALONE, the named test required RED by an AssertionError (never a crash of the TEST), every
 * file restored by raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr161-sabotage.mjs [--practice]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr161-sabotage-practice-<date>.txt; the real run writes runs/audit/rr161-sabotage-<date>.txt. Neither
 * overwrites an earlier file. Method of test/helpers/rr157-sabotage.mjs, with one sharpening: the NAMED test's own failure must be an
 * AssertionError (its first detail line) — a production child that crashes is reported beside it, never counted as the test's crash.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AD = "src/research/ai-providers/anthropic.mjs", REG = "src/research/ai-providers/index.mjs", AC = "src/research/ai-connection.mjs", ALC = "src/research/ai-led-collection.mjs", C = "src/research/collection.mjs", BIN = "bin/collect-public-questions.mjs";
const GPC = "src/governance/governed-provider-call.mjs", SE = "src/research/adapters/stack-exchange.mjs", DC = "src/page/demand-connection.mjs", GATE = "src/cost/paid-provider-gate.mjs", CENSUS = "tools/paid-metered-call-census.mjs";
const T = ["test/rr161-provider-adapter.test.mjs", "test/rr159-ai-led-discovery.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
/* --only=<id>: one sabotage added after the full run, with its own evidence file (the full run's file is never overwritten) */
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 10);
const EVIDENCE = join(REPO, "runs", "audit", `rr161-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["T01", "C25 · the client's key left off the outgoing request", [[AD, '"x-api-key": process.env[credentialName] ?? ""', '"x-api-key": ""']], "A1"],
  ["T02", "C25 · an address the model wrote in its own prose returned as a lead", [[AD, '    if (b?.type !== "web_search_tool_result") continue;', '    if (b?.type === "text") { for (const m of String(b.text).match(/https?:\\/\\/[^\\s]+/g) ?? []) out.push(m); continue; }\n    if (b?.type !== "web_search_tool_result") continue;']], "A1"],
  ["T03", "C25 · the plan's search cap not sent", [[AD, "max_uses: options.maxSearchesPerCall }]", "max_uses: 50 }]"]], "A1"],
  ["T04", "C26 · a provider refusal read as a result", [[AD, '      if (parsed?.stop_reason === "refusal") throw coded("REFUSAL");', ""]], "A2"],
  ["T05", "C26 · an HTTP error read as a result", [[AD, '      if (!res.ok) throw coded(`HTTP_${Number.isInteger(res.status) ? res.status : "UNKNOWN"}`);', ""]], "A2"],
  ["T06", "C26 · a search error read as an empty result", [[AD, '    if (!Array.isArray(b.content)) throw coded(', '    if (!Array.isArray(b.content)) continue; if (false) throw coded(']], "A2"],
  ["T07", "C25 · a search cap above the hard limit accepted", [[AD, '|| o.maxSearchesPerCall > LIMITS.maxSearchesPerCall) r.push("PROVIDER_OPTIONS_SEARCH_CAP");', ') r.push("PROVIDER_OPTIONS_SEARCH_CAP");']], "A3"],
  ["T08", "C25 · a connector that does not admit the record's origin accepted", [[AD, " || !opened.admits(url)) throw coded(\"ORIGIN_NOT_THE_CONNECTORS\");", ") throw coded(\"ORIGIN_NOT_THE_CONNECTORS\");"]], "A4"],
  ["T09", "C26 · a call the provider answered with an error left off the ledger", [[GPC, '        if (e?.name !== "PaidCallRefused") { seq += 1;', '        if (false) { seq += 1;']], "A5"],
  ["T10", "C26 · a money amount reported where the price was not read", [[AC, "const priced = priceMeasured === true && pricePerCall", "const priced = pricePerCall"]], "A5"],
  ["T11", "C25 · an expired authorization not refused", [[BIN, '    if (ai.expiresOn < now) discoveryChecks.push("PLAN_AUTHORIZATION_EXPIRED");', ""]], "P10"],
  ["T12", "C25 · a record withdrawn by a later owner record still permits", [[AC, 'if (b.capability !== PROVIDER_CAPABILITY) r.push("PROVIDER_CAPABILITY_NOT_PERMITTED");', ""]], "P10"],
  ["T13", "C26 · the hard budget removed from the paid-provider controls", [[GATE, "    if (s.spent + p.pricePerCall.amount > auth.budget.amount) return refuse(", "    if (false) return refuse("]], "P10"],
  ["T14", "C25 · the adapter registered (a real paid provider constructible, F77 not reopened)", [[REG, "export const AI_PROVIDER_ADAPTERS = Object.freeze({});", "export const AI_PROVIDER_ADAPTERS = Object.freeze({ anthropic: Object.freeze({}) });"]], "A6"],
  ["T16", "C25 · a built-but-unregistered adapter read as absent (its options unchecked)", [[BIN, "      if (Object.hasOwn(BUILT_ADAPTERS, ai.providerId)) discoveryChecks.push(", "      if (false) discoveryChecks.push("]], "P11"],
  ["T15", "C25 · the client's key VALUE measured", [[AD, '"x-api-key": process.env[credentialName] ?? ""', '"x-api-key": String(process.env[credentialName] ?? "").slice(0)']], "A1"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
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
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${prefix} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baselineGreen = base.status === 0;
const lines = [
  `RR-161 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · a FAKE provider and a FAKE source transport only, zero real requests`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen ? RUN : []) {
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
    const r = run();
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const byAssertion = cls === "AssertionError";
  const syntax = /SyntaxError/.test(out);
  const childCrashed = /\n\s+at .*bin\/|TypeError: |ReferenceError: /.test(out);
  const ok = landed && red && byAssertion && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length ? 0 : 1;
