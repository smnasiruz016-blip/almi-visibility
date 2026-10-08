/**
 * 🔴 RR-229 · F31 RE-PROVED UNDER ITS SAME ACCEPTANCE (Amendment 1, _handoffs 7805047) AFTER RR-228'S REAL-SIZE FINDING · ONE SABOTAGE PER
 * FAILURE LIMB: F31's 35 limbs of RR-223/RR-225 (S28 re-anchored to the RR-229 loop) plus the two new limbs that put a call-argument spread
 * back (S53, S54) — each must turn test/rr229-f31-scale.test.mjs red by an AssertionError. Each span found EXACTLY ONCE in the code live now,
 * applied ALONE, the named test confirmed GREEN first, every file restored by raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr229-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr229-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr229-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr225-sabotage.mjs, unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SI = "src/crawl/scope-inventory.mjs", SC = "src/crawl/scope-completeness.mjs", POP = "src/page/existing-page-population.mjs";
const BPART = "src/crawl/batch-partition.mjs", CP = "tools/need-coverage-call-paths.mjs", NC = "src/crawl/newer-collections.mjs", DUP = "src/page/duplication-evidence.mjs";
const RBD = "src/tenancy/research-batch-decision.mjs", CEN = "tools/tenant-scope-census.mjs", WIR = "src/audit-trail/wiring.mjs", SR = "src/tenancy/scoped-run.mjs", AD = "src/tenancy/attachment-declaration.mjs";
const T = ["test/f31-inventory.test.mjs", "test/rr223-f31a1.test.mjs", "test/rr229-f31-scale.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr229-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const UNUSABLE = "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED, STATUS.NOT_SERVED]);";
const SABOTAGES = [
  /* ── C1–C8, re-proved on fixture pages (the original 22 limbs, spans re-anchored to the code live now) ── */
  ["S01", "C1 · a URL claimed by two identities is merged silently", [[SI, `if (shared) conflicts.push({ pageId: p.page_id, code: "URL_CLAIMED_BY_TWO_IDENTITIES" });`, "if (false) {}"]], "C1 ·"],
  ["S02", "C1 · an identity not derived from its URL goes unreported", [[SI, `if (derived !== p.page_id) conflicts.push({ pageId: p.page_id, code: "IDENTITY_NOT_DERIVED_FROM_URL" });`, "if (false) {}"]], "C1 ·"],
  ["S03", "C2 · a fingerprint is not checked against the stored bytes", [[SI, "verified: bodies.has(o.observation_id) ? sha(bodies.get(o.observation_id)) === o.content_sha256 : null,", "verified: true,"]], "C2 ·"],
  ["S04", "C2 · a fingerprint is invented where none was recorded", [[SI, `const fingerprints = obs.filter((o) => typeof o.content_sha256 === "string" && o.content_sha256 !== "").map((o) => ({`, "const fingerprints = obs.map((o) => ({"]], "C2 ·"],
  ["S05", "C3 · a served state is inferred for a page never answered", [[SI, "    const last = newest && hasServedState(newest) ? newest : null;", "    const last = newest ?? null;"]], "C3 ·"],
  ["S06", "C4 · another tenant's member enters the client's partition", [[BPART, "const mine = new Set(p.partitions.get(tenantId) ?? []);", "const mine = new Set([...p.partitions.values()].flat());"]], "C4 · OWNERSHIP:"],
  ["S07", "C4 · another client's link is parsed", [[BPART, "    if (!observationIds.has(id)) continue;\n    const e = JSON.parse(line);", "    const e = JSON.parse(line);"]], "C4 · the links read"],
  ["S08", "C5 · a page cites no recorded source", [[SI, "observationIds: Object.freeze(obs.map((o) => o.observation_id)), ...(batchOf", "observationIds: Object.freeze([]), ...(batchOf"]], "C5 ·"],
  ["S09", "C6 · a listed but unobserved URL counts as complete", [[SC, "const listedUnobserved = [...listed].filter((u) => !served.has(u)).length;", "const listedUnobserved = 0;"]], "C6 · each gap"],
  ["S10", "C6 · a linked but unobserved URL counts as complete", [[SC, "const linkedUnobserved = [...linked].filter((u) => !served.has(u)).length;", "const linkedUnobserved = 0;"]], "C6 · each gap"],
  ["S11", "C6 · a sitemap cut short counts as complete", [[SC, `return v.coverageState !== "COMPLETE" || (v.childrenSkipped ?? 0) > 0 || (Number.isInteger(v.urlsTotal) && Number.isInteger(v.urlsStored) && v.urlsStored < v.urlsTotal);`, "return false;"]], "C6 · each gap"],
  ["S12", "C6 · a truncated body counts as complete", [[SC, "const truncated = scoped.filter((o) => o.value?.truncated === true).length;", "const truncated = 0;"]], "C6 · each gap"],
  ["S13", "C6 · a request without a served state counts as complete", [[SC, "const requestedWithoutState = scoped.filter((o) => !hasServedState(o)).length;", "const requestedWithoutState = 0;"]], "C6 · each gap"],
  ["S14", "C6 · COMPLETE is given with no freshness rule", [[SC, "[!rule, R.NO_FRESHNESS_RULE]", "[false, R.NO_FRESHNESS_RULE]"]], "C6 · each gap"],
  ["S15", "C6 · a COMPLETE past its rule does not read STALE", [[SC, "if (now.getTime() > Date.parse(expiresAt)) return verdict(S.STALE, [R.EXPIRED]);", "if (false) return verdict(S.STALE, [R.EXPIRED]);"]], "C6 · each gap"],
  ["S16", "C6 · a scope with no origin is not OUT OF SCOPE", [[SC, "if (scope.length === 0) return verdict(S.OUT_OF_SCOPE, [R.NO_ORIGIN]);", "if (false) return verdict(S.OUT_OF_SCOPE, [R.NO_ORIGIN]);"]], "C6 · each gap"],
  ["S17", "C6 · the freshness rule is not read from the declaration", [[POP, "const rule = d.tenants.find((t) => mine(t?.tenantId))?.existingPageInventory ?? null;", "const rule = null;"]], "C6 · the freshness rule is READ"],
  ["S18", "C6 · the verdict is not recorded", [[POP, "scope.recordDecision?.(completenessEvent(completeness));", "void completenessEvent;"]], "C6 · the verdict is RECORDED"],
  ["S19", "C7 · an incomplete inventory reads COMPLETE to the consumers", [[SC, `if (v?.state === COMPLETENESS.COMPLETE) return "COMPLETE";`, `if (v?.state) return "COMPLETE";`]], "C7 · 5.1"],
  ["S20", "C7 · the loader's coverage does not come from the verdict", [[POP, "coverageState: completeness ? coverageForConsumers(completeness) : derived,", `coverageState: completeness ? "COMPLETE" : derived,`]], "C7 · 5.1"],
  ["S21", "C7 · a genuinely COMPLETE inventory cannot let F33 decide", [[SC, `if (v?.state === COMPLETENESS.COMPLETE) return "COMPLETE";`, `if (v?.state === COMPLETENESS.COMPLETE) return "PARTIAL";`]], "C7 · 5.2"],
  ["S22", "C8 · a network call goes unseen", [[CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`]], "C8 ·"],
  /* ── C9 · newer declared collections ── */
  /* S23/S24 re-anchored (RR-225): F31's batch check now runs through F02 A2's decision (src/tenancy/research-batch-decision.mjs) */
  ["S23", "C9 · a batch of another tenant (or of none) is read: no tenant on the attachment and no subject check", [[NC, "const attached = new Set(d.attachments.filter((a) => a?.resourceKind === \"RESEARCH_BATCH\" && decideResolvedTenants(tenantId, a.tenantId).allowed).map((a) => a.resourceRef));", "const attached = new Set(d.attachments.filter((a) => a?.resourceKind === \"RESEARCH_BATCH\").map((a) => a.resourceRef));"], [RBD, "  const attached = tenant.allowed === true;", "  const attached = true;"], [RBD, "  const member = named.has(batchId);", "  const member = true;"]], "T31-C9-SCOPE"],
  ["S24", "C9 · a batch named by no subject of this tenant is read", [[RBD, "  const member = named.has(batchId);", "  const member = true;"]], "T31-C9-SCOPE"],
  ["S25", "C9 · a batch's records are not partitioned to the tenant", [[NC, "    const mine = partitionRecords({ records: [...crawl, ...sitemapRecs], fileName: `${batchId}/records`, tenantId, resolve });", "    const mine = { records: [...crawl, ...sitemapRecs] };"]], "T31-C9-SCOPE"],
  ["S26", "C9 · the older observation is used instead of the newer", [[NC, "if (!cur || String(x.o.observed_at).localeCompare(String(cur.o.observed_at)) > 0) newest.set(key, x);", "if (!cur || String(x.o.observed_at).localeCompare(String(cur.o.observed_at)) < 0) newest.set(key, x);"]], "T31-C9-NEWER"],
  ["S27", "C9 · an older observation is dropped from the evidence", [[NC, "    if (!pages.has(id)) pages.set(id, { record_type: \"page\", page_id: id, canonical_url: c, observations: [] });", "    pages.set(id, { record_type: \"page\", page_id: id, canonical_url: c, observations: [] });"]], "T31-C9-NEWER"],
  /* S28 re-anchored (RR-229): the earliest time is now taken by a loop */
  ["S28", "C9 · the as-of time is later than the earliest observation used", [[SC, "const asOf = times.length ? new Date(times.reduce((m, t) => (t < m ? t : m), Infinity)).toISOString() : null;", "const asOf = times.length ? new Date(times.reduce((m, t) => (t > m ? t : m), -Infinity)).toISOString() : null;"]], "T31-C9-COMPLETE"],
  ["S29", "C9 · a body is read from an undeclared file", [[NC, "    for (const b of jsonl(join(dir, NEWER_FILES.BODIES))) if (", "    for (const b of [...jsonl(join(dir, NEWER_FILES.BODIES)), ...jsonl(join(dir, \"bodies-extra.jsonl\"))]) if ("]], "T31-C9-BODY"],
  ["S30", "C9 · an older body is read for a changed page (a body invented for the newest observation)", [[POP, "    const latest = newest && bodies.has(newest.observation_id) ? newest : obs.filter(same).at(-1) ?? null;", "    const latest = newest && bodies.has(newest.observation_id) ? newest : obs.filter((o) => bodies.has(o.observation_id)).at(-1) ?? null;"]], "T31-C9-BODY"],
  ["S31", "C9 · a cut-short newer crawl run counts as complete", [[NC, "  const crawlRunsCutShort = newer.reduce((k, n) => k + n.runs.filter((r) => r.coverageState !== \"COMPLETE\").length, 0);", "  const crawlRunsCutShort = 0;"]], "T31-C9-CUT"],
  ["S32", "C9 · a capped newer sitemap listing is ignored for an older complete one", [[NC, "if (!cur || String(s.observed_at).localeCompare(String(cur.observed_at)) > 0) mapByOrigin.set(key, s);", "if (!cur || String(s.observed_at).localeCompare(String(cur.observed_at)) < 0) mapByOrigin.set(key, s);"]], "T31-C9-CUT"],
  ["S33", "C9 · a consumer reads a newer batch outside F31's reader", [[DUP, `import { readExistingPagePopulation } from "./existing-page-population.mjs";`, `import { readExistingPagePopulation } from "./existing-page-population.mjs";\nimport { readNewerCollections } from "../crawl/newer-collections.mjs";`]], "T31-C9-CENSUS"],
  ["S34", "C9 · the newer-collection reader makes a fetch", [[NC, "export const NEWER_FILES = Object.freeze(", "export const probe = (u) => fetch(u);\nexport const NEWER_FILES = Object.freeze("]], "C8 ·"],
  /* S35 re-anchored (RR-225 practice: NOT red with the merge filter alone): the rule binds in TWO layers — the merge keeps only the used
   * observations' links, and the verdict counts links only from its scoped observations — so the limb removes both */
  ["S35", "C9 · a superseded observation's links are still used", [[NC, "  const edges = [...fixed.edges, ...newerEdges].filter((e) => usedIds.has(e.from_observation_id));", "  const edges = [...fixed.edges, ...newerEdges];"], [SC, "  const linked = new Set(edges.filter((e) => scopedIds.has(e.from_observation_id)).map((e) => canon(e.to)).filter((u) => u && inScope(u)));", "  const linked = new Set(edges.map((e) => canon(e.to)).filter((u) => u && inScope(u)));"]], "T31-C9-COMPLETE"],
  /* ── RR-229 · real size: a call-argument spread put back must turn the size test red by an assertion ── */
  ["S53", "C9 at real size · the listing's URLs are spread as call arguments again (RR-228: threw at 240,328)", [[BPART, "  if (Array.isArray(r?.value?.urls)) for (const u of r.value.urls) if (typeof u === \"string\") urls.push(u);", "  if (Array.isArray(r?.value?.urls)) urls.push(...r.value.urls.filter((u) => typeof u === \"string\"));"]], "S1 ·"],
  ["S54", "C6 at real size · the earliest time is taken by a call-argument spread again", [[SC, "const asOf = times.length ? new Date(times.reduce((m, t) => (t < m ? t : m), Infinity)).toISOString() : null;", "const asOf = times.length ? new Date(Math.min(...times)).toISOString() : null;"]], "S4 ·"],
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
  `RR-229 F31 (same acceptance) sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
