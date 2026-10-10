/**
 * 🔴 RR-225 · F02 ACCEPTANCE AMENDMENT 2 (_handoffs fb0613a) AND F31 ACCEPTANCE AMENDMENT 1 (_handoffs 7805047: C1–C9) · ONE SABOTAGE PER
 * FAILURE LIMB of both, plus one per TENANT-SCOPE CENSUS EXCLUSION (its reason removed → its control red). F31: the 35 limbs of RR-223 — the
 * original 22 limbs re-anchored to the code live now and re-proved on FIXTURE pages (RR-177), plus C9's — each on LIVE, REACHABLE code, its
 * span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a crash of
 * the TEST), every file restored by raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr225-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr225-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr225-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr188-sabotage.mjs (via rr206, rr210, rr214, rr216, rr223), unchanged.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SI = "src/crawl/scope-inventory.mjs", SC = "src/crawl/scope-completeness.mjs", POP = "src/page/existing-page-population.mjs";
const BPART = "src/crawl/batch-partition.mjs", CP = "tools/need-coverage-call-paths.mjs", NC = "src/crawl/newer-collections.mjs", DUP = "src/page/duplication-evidence.mjs";
const RBD = "src/tenancy/research-batch-decision.mjs", CEN = "tools/tenant-scope-census.mjs", WIR = "src/audit-trail/wiring.mjs", SR = "src/tenancy/scoped-run.mjs", AD = "src/tenancy/attachment-declaration.mjs";
const T = ["test/f31-inventory.test.mjs", "test/rr223-f31a1.test.mjs", "test/f02-tenant-scope.test.mjs", "test/f02-real-prerequisites.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr225-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
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
  ["S28", "C9 · the as-of time is later than the earliest observation used", [[SC, "const asOf = times.length ? new Date(Math.min(...times)).toISOString() : null;", "const asOf = times.length ? new Date(Math.max(...times)).toISOString() : null;"]], "T31-C9-COMPLETE"],
  ["S29", "C9 · a body is read from an undeclared file", [[NC, "    for (const b of jsonl(join(dir, NEWER_FILES.BODIES))) if (", "    for (const b of [...jsonl(join(dir, NEWER_FILES.BODIES)), ...jsonl(join(dir, \"bodies-extra.jsonl\"))]) if ("]], "T31-C9-BODY"],
  ["S30", "C9 · an older body is read for a changed page (a body invented for the newest observation)", [[POP, "    const latest = newest && bodies.has(newest.observation_id) ? newest : obs.filter(same).at(-1) ?? null;", "    const latest = newest && bodies.has(newest.observation_id) ? newest : obs.filter((o) => bodies.has(o.observation_id)).at(-1) ?? null;"]], "T31-C9-BODY"],
  ["S31", "C9 · a cut-short newer crawl run counts as complete", [[NC, "  const crawlRunsCutShort = newer.reduce((k, n) => k + n.runs.filter((r) => r.coverageState !== \"COMPLETE\").length, 0);", "  const crawlRunsCutShort = 0;"]], "T31-C9-CUT"],
  ["S32", "C9 · a capped newer sitemap listing is ignored for an older complete one", [[NC, "if (!cur || String(s.observed_at).localeCompare(String(cur.observed_at)) > 0) mapByOrigin.set(key, s);", "if (!cur || String(s.observed_at).localeCompare(String(cur.observed_at)) < 0) mapByOrigin.set(key, s);"]], "T31-C9-CUT"],
  ["S33", "C9 · a consumer reads a newer batch outside F31's reader", [[DUP, `import { readExistingPagePopulation } from "./existing-page-population.mjs";`, `import { readExistingPagePopulation } from "./existing-page-population.mjs";\nimport { readNewerCollections } from "../crawl/newer-collections.mjs";`]], "T31-C9-CENSUS"],
  ["S34", "C9 · the newer-collection reader makes a fetch", [[NC, "export const NEWER_FILES = Object.freeze(", "export const probe = (u) => fetch(u);\nexport const NEWER_FILES = Object.freeze("]], "C8 ·"],
  /* S35 re-anchored (RR-225 practice: NOT red with the merge filter alone): the rule binds in TWO layers — the merge keeps only the used
   * observations' links, and the verdict counts links only from its scoped observations — so the limb removes both */
  ["S35", "C9 · a superseded observation's links are still used", [[NC, "  const edges = [...fixed.edges, ...newerEdges].filter((e) => usedIds.has(e.from_observation_id));", "  const edges = [...fixed.edges, ...newerEdges];"], [SC, "  const linked = new Set(edges.filter((e) => scopedIds.has(e.from_observation_id)).map((e) => canon(e.to)).filter((u) => u && inScope(u)));", "  const linked = new Set(edges.map((e) => canon(e.to)).filter((u) => u && inScope(u)));"]], "T31-C9-COMPLETE"],
  /* ── F02 Amendment 2 · a research batch read only on F02's recorded decision ── */
  ["S36", "F02 A2 · a batch is read without F02's ALLOWED decision", [[NC, "    batches = decisions.filter((x) => x.allowed).map((x) => x.batchId);", "    batches = decisions.map((x) => x.batchId);"]], "F02-EXCL-4 · A2 [EXPECTED,"],
  ["S37", "F02 A2 · a batch attached to another tenant, or to none, is allowed", [[RBD, "  const attached = tenant.allowed === true;", "  const attached = true;"]], "F02-EXCL-4 · A2 [FAILURE]"],
  ["S38", "F02 A2 · a batch named by no subject of the tenant is allowed", [[RBD, "  const member = named.has(batchId);", "  const member = true;"]], "F02-EXCL-4 · A2 [EXPECTED,"],
  ["S39", "F02 A2 · a refusal is not recorded", [[NC, "    for (const x of decisions) record?.(x.event);", "    for (const x of decisions) if (x.allowed) record?.(x.event);"]], "F02-EXCL-4 · A2 [EXPECTED,"],
  ["S40", "F02 A2 · a batch the tenant's subject names is skipped silently (never located, never decided)", [[NC, "    if (members.some(mineAttached)) for (const b of batches) located.add(b);", "    if (false) for (const b of batches) located.add(b);"]], "F02-EXCL-4 · A2 [FAILURE]"],
  ["S41", "F02 A2 · a refusal is recorded without its reason", [[RBD, "  const outcome = allowed ? BATCH_DECISION.ALLOWED : !attached ? BATCH_DECISION.NOT_ATTACHED : BATCH_DECISION.NOT_A_MEMBER;", "  const outcome = allowed ? BATCH_DECISION.ALLOWED : null;"]], "F02-EXCL-4 · A2 [EXPECTED,"],
  ["S42", "F02 A2 · a decision names the batch itself (payload), not its digest", [[RBD, "resourceRef: tenant.target.resourceRefDigest };", "resourceRef: batchId };"]], "F02-EXCL-4 · A2 [EXPECTED,"],
  ["S43", "F02 A2 · the census excuses a function by its NAME alone", [[CEN, "  const excluded = new Set(EXCLUSIONS.map((e) => `${e.module}#${e.fn}`));", "  const excluded = { has: (k) => EXCLUSIONS.some((e) => k.endsWith(`#${e.fn}`)) };"]], "F02-EXCL-4 · A2 [CENSUS]"],
  ["S44", "F02 A2 · the census excuses another reader", [[CEN, "  ...[\"memberOrigins\", \"batchPageUrls\", \"sitemapListedUrls\"].map((fn) => Object.freeze({", "  Object.freeze({ fn: \"readExistingPagePopulation\", module: \"src/page/existing-page-population.mjs\", why: \"planted\", control: \"test/f02-tenant-scope.test.mjs F02-EXCL-4: planted\" }),\n  ...[\"memberOrigins\", \"batchPageUrls\", \"sitemapListedUrls\"].map((fn) => Object.freeze({"]], "F02-EXCL-META"],
  ["S45", "F02 A2 · another F02 behaviour changes (the RESEARCH family's lawful resources widen)", [[CEN, "  RESEARCH: { resource: \"research|researchBatch\",", "  RESEARCH: { resource: \"research|researchBatch|crawlBatch\","]], "F02-EXCL-4 · A2 [CENSUS]"],
  /* ── the census's existing exclusions: each control fires when the exclusion's REASON is removed ── */
  ["S46", "EXCL-1 · the held-out derivation's output feeds something other than the store's refusal list", [[WIR, "    forbiddenSubstrings: forbiddenSubstrings ?? derivedForbiddenSubstrings(repo, registry),", "    forbiddenSubstrings: forbiddenSubstrings ?? [], allowedSubstrings: derivedForbiddenSubstrings(repo, registry),"]], "F02-EXCL-1"],
  ["S47", "META · a census exclusion cites a control test that does not exist (the RR-224 finding)", [[CEN, "    control: \"test/f02-tenant-scope.test.mjs F02-EXCL-1: the substrings only ever narrow what an append accepts\",", "    control: \"test/f02-tenant-scope.test.mjs F02-EXCL-9: the substrings only ever narrow what an append accepts\","]], "F02-EXCL-META"],
  ["S48", "EXCL-3 · the gate's member read returns more than an origin", [[SR, "  for (const u of urls) { try { origins.add(new URL(u).origin); } catch { /* an unparseable identity is not an origin claim */ } }", "  for (const u of urls) { try { origins.add(new URL(u).href); } catch { /* an unparseable identity is not an origin claim */ } }"]], "F02-EXCL-3"],
  ["S49", "captureSetMembers · a capture's identity is taken from its name, not its recorded URLs", [[AD, "    identities: [...new Set([p?.url, p?.origin].map(originOf).filter(Boolean))].map((o) => ({ resourceKind: \"SITE_ORIGIN\", resourceRef: o })),", "    identities: [...new Set([`https://${captureId}.invalid`].map(originOf).filter(Boolean))].map((o) => ({ resourceKind: \"SITE_ORIGIN\", resourceRef: o })),"]], "A2 · every NOT-ALLOWED"],
  ["S50", "EXCL-3 · batchPageUrls stops reading the pages' identity records (the gate's member read no longer the batch's identities)", [[SR, ".filter((r) => r.record_type === \"page\").map((r) => r.canonical_url);", ".filter((r) => r.record_type !== \"page\").map((r) => r.canonical_url);"]], "F02-EXCL-3"],
  ["S51", "EXCL-3 · sitemapListedUrls stops reading the listed URLs (the gate's member read no longer the collection's identities)", [[SR, ".flatMap((r) => r.value?.urls ?? []);", ".flatMap(() => []);"]], "F02-EXCL-3"],
  ["S52", "F02 A2 · a decision is recorded without the tenant decision", [[RBD, "classification: tenant.outcome, ruleEntry", "classification: \"DECIDED\", ruleEntry"]], "F02-EXCL-4 · A2 [EXPECTED,"],
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
  `RR-225 F02 A2 + F31 A1 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
