/**
 * 🔴 RR-159 · ONE SABOTAGE PER PROTECTION OF test/rr159-ai-led-discovery.test.mjs (F16 Acceptance Amendment 3, C17–C24) — each on code
 * LIVE NOW, its span found EXACTLY ONCE, applied ALONE, the named test required RED by an AssertionError (never a crash of the TEST), every
 * file restored by raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr159-sabotage.mjs [--practice]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr159-sabotage-practice-<date>.txt; the real run writes runs/audit/rr159-sabotage-<date>.txt. Neither
 * overwrites an earlier file. Method of test/helpers/rr157-sabotage.mjs, with one sharpening: the NAMED test's own failure must be an
 * AssertionError (its first detail line) — a production child that crashes is reported beside it, never counted as the test's crash.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AC = "src/research/ai-connection.mjs", ALC = "src/research/ai-led-collection.mjs", C = "src/research/collection.mjs", BIN = "bin/collect-public-questions.mjs";
const GPC = "src/governance/governed-provider-call.mjs", SE = "src/research/adapters/stack-exchange.mjs", DC = "src/page/demand-connection.mjs", GATE = "src/cost/paid-provider-gate.mjs", CENSUS = "tools/paid-metered-call-census.mjs";
const T = ["test/rr159-ai-led-discovery.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const DAY = new Date().toISOString().slice(0, 10);
const EVIDENCE = join(REPO, "runs", "audit", `rr159-sabotage-${PRACTICE ? "practice-" : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S01", "C17 · a provider with NO owner record reached", [[AC, 'if (res.outcome === "ABSENT") return ["PROVIDER_RECORD_ABSENT"];', 'if (res.outcome === "ABSENT") return [];']], "P2"],
  ["S02", "C17 · a capability the record does not permit accepted", [[AC, 'if (b.capability !== PROVIDER_CAPABILITY) r.push("PROVIDER_CAPABILITY_NOT_PERMITTED");', ""]], "P2"],
  ["S03", "C17 · a record that cites no terms accepted", [[AC, 'if (!present(b.cites)) r.push("PROVIDER_RECORD_CITES_NO_TERMS");', ""]], "P2"],
  ["S04", "C17 · a record that states no read date accepted", [[AC, 'if (!DAY.test(b.readOn ?? "")) r.push("PROVIDER_RECORD_STATES_NO_READ_DATE");', 'if (false) r.push("PROVIDER_RECORD_STATES_NO_READ_DATE");']], "P2"],
  ["S05", "C17 · a record for ANOTHER provider accepted", [[AC, "const mine = blocks.filter((b) => b.provider === providerId);", "const mine = blocks.slice(0, 1);"]], "P2"],
  ["S06", "C17 · a record for another ORIGIN accepted", [[AC, 'if (b.origin !== origin) r.push("PROVIDER_ORIGIN_IS_NOT_THE_RECORDS");', ""]], "P2"],
  ["S07", "C17 · the client's credential not required", [[BIN, 'if (aiCredential === null || !Object.hasOwn(process.env, aiCredential)) discoveryChecks.push("AI_CREDENTIAL_ABSENT");', ""]], "P2"],
  ["S08", "C17 · a live provider with NO adapter reached", [[BIN, 'if (!seams.includes(TEST_PROVIDER) && !Object.hasOwn(AI_PROVIDER_ADAPTERS, ai.providerId)) discoveryChecks.push("PROVIDER_ADAPTER_ABSENT");', ""]], "P2"],
  ["S09", "C18 · a disconnected client's run allowed to start", [[BIN, "if (state !== CONNECTION.CONNECTED) discoveryChecks.push(`AI_CONNECTION_${state}`);", ""]], "P3"],
  ["S10", "C18 · a run in flight ignores the disconnect", [[ALC, 'if (!connected()) { stoppedBy = "DISCONNECTED"; break; }', ""]], "P3"],
  ["S11", "C19 · the provider's prose kept as if it were an address", [[AC, 'if (typeof v === "string") { for (const m of v.match(URL_IN_TEXT) ?? []) add(m.replace(/[.,;:!?]+$/, "")); return; }', 'if (typeof v === "string") { found.push(v); return; }']], "P1"],
  ["S12", "C20 · a hand-written query accepted", [[AC, 'if (planQueries.some((q) => !known.has(q))) r.push("QUERY_NOT_FORMED_BY_THE_SUBJECTS_DECLARATION");', ""]], "P4"],
  ["S13", "C20 · origin country splits one need into two (F91's join removed)", [[DC, "} else needId = needOfWording.get(normaliseWording(v.original)) ?? `need:${hash([subject, r.question_id])}`;", "} else needId = `need:${hash([subject, r.question_id, v.country])}`;"]], "P4"],
  ["S14", "C21 · a lead counted as demand by F91", [[DC, 'if (r?.record_type === "research_lead") return REFUSAL.LEAD;', ""]], "P5"],
  ["S15", "C22 · a DEAD lead recorded as read", [[ALC, ": !returned.has(id) ? RESOLUTION.DEAD", ": !returned.has(id) ? RESOLUTION.READ"]], "P1"],
  ["S16", "C22 · an address outside the approved source taken as its post", [[SE, 'u && host && u.protocol === "https:" && u.hostname === host ?', 'u && host && u.protocol === "https:" ?']], "P6"],
  ["S17", "C23 · discovery ABSENT reported as zero", [[C, '"discovery ABSENT — no AI connection and no supplied links: observed questions NOT MEASURED, never zero demand; every other part of the product runs unchanged"', '"observed questions 0 — no AI connection and no supplied links"']], "P6"],
  ["S18", "C23 · discovery ABSENT treated as an error", [[BIN, "    for (const l of reportLines(rec)) console.log(`  ${l}`);\n    process.exit(0);", "    for (const l of reportLines(rec)) console.log(`  ${l}`);\n    process.exit(3);"]], "P6"],
  ["S19", "C24 · the plan's provider-call cap ignored", [[ALC, "if (providerCalls >= callCap) break;", ""]], "P7"],
  ["S20", "C24 · a provider call left off the ledger", [[GPC, "      keep(providerCallEntry({", "      void (providerCallEntry({"]], "P7"],
  ["S21", "C24 · the F04 spend approval bypassed", [[GATE, 'if (!d.allowed) return refuse(provider, "NOT_AUTHORISED_BY_F04", `the one authorisation decision refused this spend: ${d.outcome}`, null, s);', ""]], "P7"],
  ["S22", "C24 · the provider-call ceiling removed", [[C, 'else if (a.providerCalls > PROVIDER_CALL_CEILING) r.push("PLAN_EXCEEDS_PROVIDER_CALL_CEILING");', ""]], "P7"],
  ["S23", "C17 · the client's credential VALUE measured", [[BIN, "if (aiCredential === null || !Object.hasOwn(process.env, aiCredential))", "if (aiCredential === null || String(process.env[aiCredential] ?? \"\").length < 1 || !Object.hasOwn(process.env, aiCredential))"]], "P8"],
  ["S24", "F77 · a registry holding an adapter still counted as no real provider", [[CENSUS, '(registrySize > 0 ? "REAL_FROM_REGISTRY" : "REGISTRY_EMPTY")', '"REGISTRY_EMPTY"']], "P9"],
];

if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
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
  `RR-159 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE · a FAKE provider and a FAKE source transport only, zero real requests`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen ? SABOTAGES : []) {
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
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
