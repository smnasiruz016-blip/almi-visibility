/**
 * 🔴 RR-206 · R7 · ONE SABOTAGE PER FAILURE LIMB of F94's Acceptance (_handoffs 959ae05: C1–C7 and [ALL]) — each on LIVE, REACHABLE
 * code, its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never
 * a crash of the TEST), every file restored by raw-byte sha256, the production trail hashed before and after. FIXTURE PAGES ONLY (RR-177).
 *
 *   node test/helpers/rr206-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr206-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr206-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr188-sabotage.mjs, unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SP = "src/page/site-plan.mjs", EV = "src/page/site-plan-evidence.mjs", TF = "test/rr206-r7.test.mjs";
const BP = "bin/build-page.mjs", CB = "src/page/content-brief.mjs", CBE = "src/page/content-brief-evidence.mjs";
const T = ["test/rr206-r7.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr206-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const UNUSABLE = "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED, STATUS.NOT_SERVED]);";
const SABOTAGES = [
  /* ── C1 ── */
  ["S01", "C1 · a URL is invented (not built from the recorded pattern)", [[SP, "      const proposed = canon(`${origin}${parent === \"/\" ? \"\" : parent}/${subject.slug}`);", "      const proposed = canon(`${origin}/pages/${subject.slug}`);"]], "T94-C1"],
  ["S02", "C1 · a URL follows no recorded pattern (one page under a path taken as a pattern)", [[SP, "(siblings.length < 2 ? ", "(siblings.length < 1 ? "]], "T94-C1"],
  ["S03", "C1 · a URL collides with a recorded page's URL", [[SP, "      url = holder || listed\n", "      url = false\n"]], "T94-C1"],
  ["S04", "C1 · a URL belongs to an origin not declared to this tenant", [[SP, " : !origins.map(canon).filter(Boolean).map((o) => new URL(o).origin).includes(origin) ? \"an origin declared to this tenant for the pattern's pages\" : null);", " : null);"]], "T94-C1"],
  ["S05", "C1 · a URL is given without the recorded pages its pattern was read from", [[SP, "pattern: `${parent === \"/\" ? \"\" : parent}/{slug}`, readFrom: siblings.map((p) => p.pageId),", "pattern: `${parent === \"/\" ? \"\" : parent}/{slug}`, readFrom: [],"]], "T94-C1"],
  ["S06", "C1 · a missing pattern is filled by default instead of NOT MEASURED", [[SP, "    if (why) url = { state: URL_STATE.NOT_MEASURED, url: null, missing: why, readFrom: [] };", "    if (why) url = { state: URL_STATE.PROPOSED, url: canon(`${spokes[0]?.at.origin ?? origins[0]}/${subject.slug ?? \"page\"}`), missing: why, readFrom: [] };"]], "T94-C1"],
  /* ── C2 ── */
  ["S07", "C2 · a breadcrumb step is a page the tenant's records do not hold at that step", [[SP, "      const p = byUrl.get(stepUrl);", "      const p = byUrl.get(stepUrl) ?? own[0];"]], "T94-C2"],
  ["S08", "C2 · a breadcrumb step carries an invented title", [[SP, "steps.push(p ? { pageId: p.pageId, url: p.url, ref:", "steps.push(p ? { pageId: p.pageId, url: p.url, title: p.pageId, ref:"]], "T94-C2"],
  ["S09", "C2 · a missing step is hidden", [[SP, "    breadcrumb = { state: steps.some((s) => s.state === \"MISSING\") ? \"INCOMPLETE TRAIL\" : \"RECORDED\",", "    breadcrumb = { state: \"RECORDED\","]], "T94-C2"],
  /* ── C3 ── */
  ["S10", "C3 · a planned link naming a page not recorded for this tenant is not refused", [[SP, "      if (!ownIds.has(l.pageId) || own.get(canon(l.url))?.pageId !== l.pageId) add(\"C3\",", "      if (false) add(\"C3\","]], "T94-C3"],
  ["S11", "C3 · another tenant's page is read into the plan", [[SP, "    if (!sameTenant(p?.tenantId, tenantId)) { refused.push(", "    if (false) { refused.push("]], "T94-C3"],
  ["S12", "C3 · a link carries no recorded reason (a page sharing no need is linked)", [[SP, "  const linked = [...peers, ", "  const linked = [...own.filter((p) => p !== self), "]], "T94-C3"],
  ["S13", "C3 · a link is planned to a target recorded as BROKEN", [[SP, UNUSABLE, "export const UNUSABLE = Object.freeze([STATUS.REDIRECTED, STATUS.NOT_SERVED]);"]], "T94-C3"],
  ["S14", "C3 · a link is planned to a target recorded as REDIRECTED", [[SP, UNUSABLE, "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.NOT_SERVED]);"]], "T94-C3"],
  ["S15", "C3 · a link is planned to a target recorded as NOT SERVED", [[SP, UNUSABLE, "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED]);"]], "T94-C3"],
  ["S16", "C3 · a target with no recorded status is reported as working", [[SP, "  return targetState(list);", "  return list.length ? targetState(list) : STATUS.WORKING;"]], "T94-C3"],
  ["S17", "C3 · a maximum decides the number of links", [[SP, "  for (const p of linked) {", "  for (const p of linked.slice(0, 5)) {"]], "T94-C3"],
  /* ── C4 ── */
  ["S18", "C4 · a hub is proposed with no recorded verified need", [[SP, "    const record = hubNeeds.find((r) => HUB_NEED_KINDS.includes(r?.kind) && needs.includes(r.need) && present(r.ref));", "    const record = hubNeeds.find((r) => needs.includes(r.need)) ?? { kind: \"A_GUESS\", need: needs[0], ref: \"\" };"]], "T94-C4"],
  ["S19", "C4 · a page is placed under a hub no recorded page is", [[SP, "hub: { pageId: hubs[0].h.pageId, url: hubs[0].h.url }", "hub: { pageId: `hub:${needs[0]}`, url: hubs[0].h.url }"]], "T94-C4"],
  ["S20", "C4 · the cluster is reported without its evidence", [[SP, "evidence: [coverRef(hubs[0].h), ...hubs[0].spokes.map((s) => `edge:${hubs[0].h.pageId}->${s.pageId}`)] };", "evidence: [] };"]], "T94-C4"],
  /* ── C5 ── */
  ["S21", "C5 · on an INCOMPLETE inventory a plan claims that no other page covers the page", [[SP, "    noOtherPageCovers: complete ? peers.length === 0 : NOT_MEASURED,", "    noOtherPageCovers: peers.length === 0,"]], "T94-C5"],
  ["S22", "C5 · a part that needs completeness is decided anyway (a hub decided on an INCOMPLETE inventory)", [[SP, "  else if (!complete) cluster = {", "  else if (false) cluster = {"]], "T94-C5"],
  ["S23", "C5 · a plan is presented as complete", [[SP, "    presentedAs: complete ? \"PLAN OVER A COMPLETE INVENTORY\" :", "    presentedAs: true ? \"PLAN OVER A COMPLETE INVENTORY\" :"]], "T94-C5"],
  ["S24", "C5 · the bound is missing", [[SP, "text: present(v.bound) ? v.bound : \"no bound recorded (F31)\", counts: c ?", "text: null, counts: null ?"]], "T94-C5"],
  /* ── C6 ── */
  ["S25", "C6 · another tenant's (an unscoped) record is read", [[EV, "  const sitemap = io.partition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve, env });", "  const sitemap = io.partition({ batchId: SITEMAP_BATCH_ID, tenantId: null, resolve, env });"]], "T94-C6"],
  ["S26", "C6 · something is fetched", [[SP, "export const NOT_MEASURED = \"NOT MEASURED\";", "export const NOT_MEASURED = \"NOT MEASURED\";\nexport const probe = (u) => fetch(u);"]], "T94-C6"],
  ["S27", "C6 · something is written (F31's reader handed a scope that records)", [[EV, "readExistingPagePopulation({ scope: { tenantId }, resolve, env, now })", "readExistingPagePopulation({ scope: { tenantId, recordDecision: () => {} }, resolve, env, now })"]], "T94-C6"],
  ["S28", "C6 · a provider is reachable (a connector is loaded)", [[EV, "import { DECISION } from \"./action-decision.mjs\";", "import { DECISION } from \"./action-decision.mjs\";\nimport { NO_REQUEST_FETCH } from \"../tenancy/connectors.mjs\";"]], "T94-C6"],
  /* ── C7 ── */
  ["S29", "C7 · F94 changes another row's code (F41's brief)", [[CB, "internalLinks: \"recorded internal link targets within a COMPLETE inventory (F31)", "internalLinks: \"recorded internal link targets within a COMPLETE inventory (F31) or an F94 plan"]], "T94-C7"],
  ["S30", "C7 · F94 wires its plan into F37's draft", [[BP, "import { writeFileSync, mkdirSync } from \"node:fs\";", "import { writeFileSync, mkdirSync } from \"node:fs\";\nimport { readClientSitePlans } from \"../src/page/site-plan-evidence.mjs\";"]], "T94-C7"],
  ["S31", "C7 · F94 wires its plan into F41's brief", [[CBE, "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";", "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";\nimport { readClientSitePlans } from \"./site-plan-evidence.mjs\";"]], "T94-C7"],
  /* ── [ALL] ── */
  ["S32", "[ALL] · a proof reads a page body (the 27 pages set aside)", [[TF, "const canon = (u) => canonicalUrl(u);", "const canon = (u) => canonicalUrl(u);\nconst bodies = () => readPartitionBodies;"]], "T94-ALL"],
  ["S33", "[ALL] · a run is reported with a plan it did not produce (a refused plan counted)", [[EV, "    plans: plans.length,", "    plans: plans.length + refused.length,"]], "T94-ALL"],
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
  `RR-206 R7 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
