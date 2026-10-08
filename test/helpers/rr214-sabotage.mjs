/**
 * 🔴 RR-214 · F93 · ONE SABOTAGE PER FAILURE LIMB of F93's first acceptance (_handoffs 4938f07: C1–C7 and [ALL]) — each on LIVE, REACHABLE code,
 * its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a crash of
 * the TEST), every file restored by raw-byte sha256, the production trail hashed before and after. FIXTURE PAGES ONLY (RR-177).
 *
 *   node test/helpers/rr214-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr214-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr214-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr188-sabotage.mjs (via rr206, rr210), unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TS = "src/page/trust-signals.mjs", TE = "src/page/trust-signals-evidence.mjs", CA = "src/facts/citation-audit.mjs";
const CBE = "src/page/content-brief-evidence.mjs", TF = "test/rr214-f93.test.mjs";
const T = ["test/rr214-f93.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr214-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const UNUSABLE = "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED, STATUS.NOT_SERVED]);";
const SABOTAGES = [
  /* ── C1 ── */
  ["S01", "C1 · an identity marker on the body is missed (meta author)", [[TS, "  if (/<meta\\b[^>]*name\\s*=\\s*[\"']author[\"'][^>]*content", "  if (false && /<meta\\b[^>]*name\\s*=\\s*[\"']author[\"'][^>]*content"]], "T93-C1"],
  ["S02", "C1 · an identity marker is reported that the body does not hold (an empty meta author)", [[TS, "[^>]*content\\s*=\\s*[\"'][^\"'\\s][^\"']*[\"']/i.test(s) ||", "[^>]*content\\s*=\\s*[\"'][^\"']*[\"']/i.test(s) ||"]], "T93-C1"],
  ["S03", "C1 · a missing identity carries no finding", [[TS, "    : { signal: SIGNAL.FINDING, why: \"no identity marker on the page", "    : { signal: SIGNAL.PRESENT, why: \"no identity marker on the page"]], "T93-C1"],
  ["S04", "C1 · an identity's credentials are reported as verified", [[TS, "export const NOT_VERIFIED = \"NOT MEASURED — no record verifies an identity, a credential, expertise or experience\";", "export const NOT_VERIFIED = \"VERIFIED — an expert with first-hand experience\";"]], "T93-C1"],
  ["S05", "C1 · a new page is given an identity no record holds", [[TS, "      : Object.freeze({ signal: SIGNAL.FINDING, why: NO_ORG_RECORD, credentials: NOT_VERIFIED }),", "      : Object.freeze({ signal: SIGNAL.PRESENT, organisation: \"the client's editorial team\", credentials: NOT_VERIFIED }),"]], "T93-C1"],
  /* ── C2 ── */
  ["S06", "C2 · a page is called an about or contact page outside the declared rule", [[TS, "export const kindOf = (url) => { const w = lastSegment(url); return ABOUT_WORDS.includes(w) ? \"about\" : CONTACT_WORDS.includes(w) ? \"contact\" : null; };", "export const kindOf = (url) => { const w = lastSegment(url); return /about/.test(w) ? \"about\" : /contact/.test(w) ? \"contact\" : null; };"]], "T93-C2"],
  ["S07", "C2 · a link to an unobserved about or contact URL is reported reachable", [[TS, "  return list.length ? targetState(list) : \"UNOBSERVED\";", "  return list.length ? targetState(list) : F23.WORKING;"]], "T93-C2"],
  ["S08", "C2 · a target recorded broken, redirected or not served is reported reachable", [[TS, "  if (hits.some((h) => h.status === F23.WORKING)) return", "  if (hits.length) return"]], "T93-C2"],
  ["S09", "C2 · a missing about or contact page carries no finding", [[TS, "  return Object.freeze({ signal: SIGNAL.FINDING, why: `no recorded link from this page to a recorded ${kind} page` });", "  return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: `no recorded link from this page to a recorded ${kind} page` });"]], "T93-C2"],
  ["S10", "C2 · a word outside the declared list is decided", [[TS, "  if (near.length) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why:", "  if (near.length) return Object.freeze({ signal: SIGNAL.REACHABLE, why:"]], "T93-C2"],
  /* ── C3 ── */
  ["S11", "C3 · a visible date is missed (the time element)", [[TS, "  for (const m of s.matchAll(/<time\\b[^>]*datetime\\s*=\\s*[\"']([^\"']+)[\"']/gi)) dates.push(", "  for (const m of [].values()) dates.push("]], "T93-C3"],
  ["S12", "C3 · a date is reported that the body does not hold", [[TS, "  return ok.length ? ok.sort((a, b) => b.date.localeCompare(a.date))[0] : null;", "  return ok.length ? ok.sort((a, b) => b.date.localeCompare(a.date))[0] : { marker: \"assumed\", date: \"2026-09-25\" };"]], "T93-C3"],
  ["S13", "C3 · a date earlier than the latest recorded change is reported as matching", [[TS, "  if (v.date < latestChange) return", "  if (false) return"]], "T93-C3"],
  ["S14", "C3 · a date later than the latest observation is reported as matching", [[TS, "  if (v.date > latestObservation) return", "  if (false) return"]], "T93-C3"],
  ["S15", "C3 · a match is decided with fewer than two recorded fingerprints", [[TS, "  if (distinct.size < 2) return", "  if (distinct.size < 1) return"]], "T93-C3"],
  ["S16", "C3 · a missing date carries no finding", [[TS, "  if (!v) return Object.freeze({ signal: SIGNAL.FINDING, why:", "  if (!v) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why:"]], "T93-C3"],
  ["S17", "C3 · a new page is given a date no record holds", [[TS, "    date: Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: DATE_BEFORE_PUBLICATION }),", "    date: Object.freeze({ signal: SIGNAL.MATCHES, date: new Date().toISOString().slice(0, 10), why: DATE_BEFORE_PUBLICATION }),"]], "T93-C3"],
  /* ── C4 ── */
  ["S18", "C4 · F93 re-judges F37's every-claim-sourced record", [[TS, "  return Object.freeze({ signal: c.state === \"PASS\" ? SIGNAL.PRESENT : SIGNAL.FINDING, record: Object.freeze({ ...c }), why: c.why ?? null });", "  return Object.freeze({ signal: SIGNAL.PRESENT, record: Object.freeze({ state: \"PASS\" }), why: null });"]], "T93-C4"],
  ["S19", "C4 · an existing page's sources are reported transparent with no recorded citation verdict", [[TS, "  if (!v) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_CITATION_RECORD });", "  if (!v) return Object.freeze({ signal: SIGNAL.PRESENT, why: NO_CITATION_RECORD });"]], "T93-C4"],
  /* ── C5 ── */
  ["S20", "C5 · a signal is given a default instead of PRESENT, a FINDING or NOT MEASURED", [[TS, "    if (!present(p.html)) return Object.freeze({ pageId: p.pageId, measured: false,", "    if (p.pageId === \"p-about\") return Object.freeze({ pageId: p.pageId, measured: true, identity: { signal: \"UNKNOWN\" }, about: { signal: \"UNKNOWN\" }, contact: { signal: \"UNKNOWN\" }, date: { signal: \"UNKNOWN\" }, sources: { signal: \"UNKNOWN\" } });\n    if (!present(p.html)) return Object.freeze({ pageId: p.pageId, measured: false,"]], "T93-C5"],
  ["S21", "C5 · F93 writes to a store", [[TS, "import { decideResolvedTenants } from \"../tenancy/scope.mjs\";", "import { decideResolvedTenants } from \"../tenancy/scope.mjs\";\nimport { appendFileSync } from \"node:fs\";"]], "T93-C5"],
  /* ── C6 ── */
  ["S22", "C6 · on an INCOMPLETE inventory a claim is made about pages it does not hold", [[TS, "    siteHasNoAboutPage: recordedAbout > 0 ? false : complete ? true : SIGNAL.NOT_MEASURED,", "    siteHasNoAboutPage: recordedAbout > 0 ? false : true,"]], "T93-C6"],
  ["S23", "C6 · a result lacks its bound", [[TS, "const boundOf = (v) => Object.freeze({ state: present(v?.state) ? v.state : \"UNKNOWN\", text: present(v?.bound) ? v.bound : \"no completeness verdict recorded (F31)\" });", "const boundOf = (v) => Object.freeze({ state: present(v?.state) ? v.state : \"UNKNOWN\", text: null });"]], "T93-C6"],
  ["S24", "C6 · the reader asks for another (no) tenant's records", [[TE, "  const { population, fault } = io.population({ tenantId, resolve, env, now });", "  const { population, fault } = io.population({ tenantId: null, resolve, env, now });"]], "T93-C6"],
  ["S25", "C6 · another tenant's page is read into the audit", [[TS, "  for (const p of pages) (sameTenant(p?.tenantId, tenantId) ? own : refused).push(p);", "  for (const p of pages) own.push(p);"]], "T93-C6"],
  ["S26", "C6 · something is fetched", [[TS, "export const SIGNAL = Object.freeze(", "export const probe = (u) => fetch(u);\nexport const SIGNAL = Object.freeze("]], "T93-C6"],
  ["S27", "C6 · a provider is reachable (a connector is loaded)", [[TE, "import { renderCompiledDraft, DRAFT } from \"./draft-render.mjs\";", "import { renderCompiledDraft, DRAFT } from \"./draft-render.mjs\";\nimport { NO_REQUEST_FETCH } from \"../tenancy/connectors.mjs\";"]], "T93-C6"],
  /* ── C7 ── */
  ["S28", "C7 · F93 changes another row's code (F46's citation audit)", [[CA, " * F46 · SOURCE INTEGRITY AND CITATION AUDIT (acceptance _handoffs 2e76216, RR-96).", " * F46 · SOURCE INTEGRITY AND CITATION AUDIT (acceptance _handoffs 2e76216, RR-96) — read by F93."]], "T93-C7"],
  ["S29", "C7 · F93's plan is wired into F41's brief without F41's own amendment", [[CBE, "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";", "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";\nimport { readClientTrust } from \"./trust-signals-evidence.mjs\";"]], "T93-C7"],
  /* ── [ALL] ── */
  ["S30", "[ALL] · a proof reads a page body (the 27 pages set aside)", [[TF, "const TS = \"src/page/trust-signals.mjs\", TE = \"src/page/trust-signals-evidence.mjs\";", "const TS = \"src/page/trust-signals.mjs\", TE = \"src/page/trust-signals-evidence.mjs\";\nconst bodies = () => readPartitionBodies;"]], "T93-ALL"],
  ["S31", "[ALL] · a run reports counts it did not produce", [[TS, "    counts: Object.freeze({ identity: tally(\"identity\"),", "    counts: Object.freeze({ identity: { ...tally(\"identity\"), PRESENT: 99 },"]], "T93-ALL"],
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
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baselineGreen = base.status === 0;
const named = [...new Set(RUN.map((s) => s[3]))];
const seenGreen = (p) => new RegExp(`✔ ${esc(p)} `).test(`${base.stdout}${base.stderr}`);
const namedGreen = named.every(seenGreen);
const lines = [
  `RR-214 F93 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · no provider, no network, no third-party read`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · named tests seen GREEN: ${named.filter(seenGreen).length} of ${named.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen && namedGreen ? RUN : []) {
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
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing.map((n) => n.split(" ")[0]))].join(",")} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
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
