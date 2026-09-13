#!/usr/bin/env node
/**
 * ITEMS 11, 42 AND 48 — PROVED BY A LOCAL REPLAY OF THE REAL 12 SEPTEMBER CRAWL.
 *
 *   node bin/replay-crawl.mjs                        dry run: replay into a temp store, write nothing
 *   node bin/replay-crawl.mjs --confirm              record the evidence and the ledger entries
 *   node bin/replay-crawl.mjs --recover --confirm    first recover the Actions artifact (timed), then replay
 *
 * ── 🔴 NO CRAWL ─────────────────────────────────────────────────────────────
 *
 * Every request goes to 127.0.0.1. `globalThis.fetch` is replaced before the
 * passes with a guard that THROWS on any other host, and every local URL is
 * recorded, so "zero egress" is measured rather than asserted.
 *
 * ── WHY A REPLAY AND NOT A SECOND LIVE RUN ─────────────────────────────────
 *
 * The D-CRW-5 green for a second live crawl is GRANTED AND UNUSED (see
 * PHASE_0_FROZEN_GAP_REGISTER.md). Items 11, 42 and 48 test engine properties.
 * A live second run would muddy item 11 (a page_id that held on a page that
 * never moved proves nothing), might leave item 42 unprovable (nothing changed
 * tonight), and costs money and minutes to learn less.
 *
 * ── 🔴 WHAT THIS DOES NOT PROVE ─────────────────────────────────────────────
 *
 * That the crawler still reaches the live internet today, or what DNS says
 * today. The evidence file says so in its own words.
 *
 * ── THE CHANGES ARE LOCAL ───────────────────────────────────────────────────
 *
 * The five changed bodies are in-memory copies of recovered bodies, served on
 * 127.0.0.1. No product's real page is changed and nothing is written into any
 * product repository — which would be forbidden. The evidence records which
 * kind of change this is so nobody later mistakes one for the other.
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { sha256Hex, canonicalUrl } from "../src/evidence/ids.mjs";
import { replayEntriesFrom, runReplayPass, comparePasses } from "../src/crawl/replay.mjs";
import { retestChange, headFacts, titleCountsOf } from "../src/audit/retest.mjs";
import { runRobotsAndDnsAudit } from "../src/audit/run-audit.mjs";
import { createCostLedger, entryFromReplay, entryFromArtifactRecovery, formatLedgerLine } from "../src/cost/ledger.mjs";
import { ESTATE_HOSTNAME_LIST } from "../config/estate-hostnames.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));

const RUN_ID = "34662527129";
const ARTIFACT = `crawl-corpus-${RUN_ID}`;
const CORPUS = confineToRepo(arg("corpus") ?? `${REPO}runs/crawl/corpus`, { label: "--corpus" });
const EVIDENCE = confineToRepo(`${REPO}runs/replay/replay-2026-09-13.json`, { label: "the replay evidence" });
const CRAWL_STORE = confineToRepo(`${REPO}runs/replay/replay-crawl-2026-09-13.jsonl`, { label: "the replay crawl store" });
const AUDIT_STORE = confineToRepo(`${REPO}runs/replay/replay-audit-dns-2026-09-13.jsonl`, { label: "the replay audit store" });
const LEDGER = confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" });
const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

const readJsonl = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);

/* ================================================================== *
 * THE NAMED CHANGES — five in-memory copies, everything else byte-identical.
 * ================================================================== */

const CHANGES = [
  {
    id: "C1", kind: "NOINDEX_REMOVED",
    url: "https://almicv.almiworld.com/cv-guide/andorra/housekeeper", observation_id: "7694a4810a7658a2",
    transform: (h) => h.replace(/(<meta\b[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["'])([^"']*)/gi, (m, a, c) => a + c.split(",").map((s) => s.trim()).filter((t) => t.toLowerCase() !== "noindex").join(", ")),
    validate: (b, a) => b.noindexed === true && a.noindexed === false,
    checks: [{ check: "noindex", expectBefore: "FAIL", expectAfter: "PASS" }],
  },
  {
    id: "C2", kind: "NOINDEX_ADDED",
    url: "https://almicv.almiworld.com/cv-guide/ghana/audiologist", observation_id: "47fb3ad24283313c",
    transform: (h) => h.replace(/<head([^>]*)>/i, '<head$1><meta name="robots" content="noindex">'),
    validate: (b, a) => b.noindexed === false && a.noindexed === true,
    checks: [{ check: "noindex", expectBefore: "PASS", expectAfter: "FAIL" }],
  },
  {
    id: "C3", kind: "CANONICAL_REMOVED",
    url: "https://almicv.almiworld.com/cv-guide/india/internal-medicine-doctor", observation_id: "99eaea6e9c6d1d3a",
    transform: (h) => h.replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, ""),
    validate: (b, a) => Boolean(b.canonical) && !a.canonical,
    checks: [{ check: "canonical", expectBefore: "PASS", expectAfter: "FAIL", expectSummaryIncludes: "no rel=canonical" }],
  },
  {
    id: "C4", kind: "TITLE_REMOVED",
    url: "https://almicv.almiworld.com/cv-guide/india/primary-school-teacher", observation_id: "63eeeafa8bf8cf34",
    transform: (h) => h.replace(/<title[^>]*>[\s\S]*?<\/title>/i, ""),
    validate: (b, a) => Boolean(b.title) && !a.title,
    checks: [{ check: "head-elements", expectAfter: "FAIL", expectSummaryIncludes: "no <title>" }],
  },
  {
    id: "C5", kind: "BODY_TEXT_ONLY_ON_A_REDIRECTED_PAGE",
    url: "https://almiworld.com/ielts-band-6-vs-band-7-what-actually-changes", observation_id: "2e2ad6fe30837206",
    transform: (h) => h.replace(/<\/body>/i, '<p data-replay-change="C5">local replay change — body text only</p></body>'),
    validate: (b, a) => b.noindexed === a.noindexed && b.canonical === a.canonical && b.title === a.title,
    checks: [
      { check: "noindex", expectAfter: "SAME" },
      { check: "canonical", expectAfter: "SAME" },
      { check: "head-elements", expectAfter: "SAME" },
    ],
  },
];

const startedAt = new Date().toISOString();
const failures = [];
const must = (cond, msg) => {
  if (!cond) failures.push(msg);
};

/* ================================================================== *
 * 1A — RECOVER THE ARTIFACT (optional, timed, confined).
 * ================================================================== */

let recovery = { recoveredThisRun: false };
if (argv.includes("--recover")) {
  if (!permission.mayWrite) {
    console.error("🔴 REFUSED — --recover replaces the local corpus directory and needs --confirm");
    process.exit(2);
  }
  const t0 = new Date().toISOString();
  if (existsSync(CORPUS)) rmSync(CORPUS, { recursive: true, force: true });
  mkdirSync(CORPUS, { recursive: true });
  execFileSync("gh", ["run", "download", RUN_ID, "-n", ARTIFACT, "-D", CORPUS], { cwd: REPO, stdio: "inherit" });
  const t1 = new Date().toISOString();
  const files = readdirSync(CORPUS);
  const bytes = files.reduce((n, f) => n + statSync(join(CORPUS, f)).size, 0);
  recovery = { recoveredThisRun: true, startedAt: t0, finishedAt: t1, files: files.length, bytes, entry: entryFromArtifactRecovery({ startedAt: t0, finishedAt: t1, artifact: ARTIFACT, files: files.length, bytes }) };
  console.log(`recovered ${ARTIFACT}: ${files.length} files, ${bytes} bytes in ${(Date.parse(t1) - Date.parse(t0)) / 1000}s`);
}

/* ================================================================== *
 * 1B — THE REPLAY SET, VERIFIED BYTE FOR BYTE.
 * ================================================================== */

const crawlRecords = readJsonl(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`);
if (!existsSync(CORPUS)) {
  console.error(`🔴 REFUSED — no corpus at ${CORPUS}. Run with --recover --confirm. A replay with no bodies would report a clean zero.`);
  process.exit(2);
}
const { entries, missing } = replayEntriesFrom({ crawlRecords, corpusDir: CORPUS });
const shaMatches = [...entries.values()].filter((e) => e.shaMatches).length;
console.log(`[bound: ${entries.size} recorded bodies found in ${CORPUS}; ${missing} missing]`);
console.log(`integrity: ${shaMatches}/${entries.size} bodies hash to their observation's content_sha256`);
if (missing > 0 || shaMatches !== entries.size) {
  console.error("🔴 REFUSED — the recovered bodies are not the run's bodies. A replay of the wrong bytes proves nothing.");
  process.exit(1);
}

const robotsRecords = readJsonl(`${REPO}runs/evidence/robots.jsonl`);
const robotsByHost = new Map(robotsRecords.filter((r) => r.record_type === "observation").map((r) => [r.value.host, r]));
const replayHosts = [...new Set([...entries.keys()].map((u) => new URL(u).hostname))].sort();

/* 🔴 ZERO EGRESS — any request to a host that is not local THROWS. */
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (u, init) => {
  const host = new URL(String(u)).hostname;
  if (!LOCAL_HOSTS.includes(host)) throw new Error(`🔴 NETWORK EGRESS ATTEMPTED to ${host} during a replay`);
  return realFetch(u, init);
};

/* stores: recorded files with --confirm, a temp directory otherwise */
let tmp = null;
if (permission.mayWrite) {
  for (const p of [EVIDENCE, CRAWL_STORE, AUDIT_STORE]) {
    if (existsSync(p)) {
      console.error(`🔴 REFUSED — ${p} already exists. Recorded evidence is not re-recorded over itself.`);
      process.exit(2);
    }
  }
  mkdirSync(dirname(EVIDENCE), { recursive: true });
} else {
  tmp = mkdtempSync(join(tmpdir(), "almivis-replay-"));
}
const crawlStore = createJsonlStore(tmp ? join(tmp, "crawl.jsonl") : CRAWL_STORE);
const auditStore = createJsonlStore(tmp ? join(tmp, "audit.jsonl") : AUDIT_STORE);

/* ================================================================== *
 * 2A — TWO PASSES, WITH FIVE NAMED CHANGES BETWEEN THEM.
 * ================================================================== */

const SEED_SOURCE = `REPLAY_OF_RUN_${RUN_ID}`;
const pass1 = await runReplayPass({ entries, robotsByHost, store: crawlStore, seedSource: SEED_SOURCE });
console.log(`pass 1: ${pass1.run.urlsFetched} fetched, ${pass1.run.requestsIssued} requests, ${pass1.persisted.appended} new / ${pass1.persisted.resighted} re-sighted, ${pass1.inventory.pages.length} pages, ${pass1.seconds}s`);

const changedBodies = new Map();
const changeLog = [];
for (const c of CHANGES) {
  const e = entries.get(c.url);
  if (!e || e.observation_id !== c.observation_id) {
    console.error(`🔴 REFUSED — change ${c.id} names ${c.url} (${c.observation_id}), which is not in the replay set as recorded`);
    process.exit(1);
  }
  const after = c.transform(e.body);
  const xr = e.headers["x-robots-tag"] ?? null;
  if (after === e.body || !c.validate(headFacts(e.body, xr), headFacts(after, xr))) {
    console.error(`🔴 REFUSED — change ${c.id} (${c.kind}) did not change the body the way it names. A change that did not land proves nothing.`);
    process.exit(1);
  }
  changedBodies.set(c.url, after);
  changeLog.push({
    id: c.id, kind: c.kind, url: c.url, observation_id: c.observation_id,
    bytesBefore: Buffer.byteLength(e.body, "utf8"), bytesAfter: Buffer.byteLength(after, "utf8"),
    sha256Before: sha256Hex(e.body), sha256After: sha256Hex(after),
  });
}

const pass2 = await runReplayPass({ entries, robotsByHost, bodies: changedBodies, store: crawlStore, seedSource: SEED_SOURCE });
console.log(`pass 2: ${pass2.run.urlsFetched} fetched, ${pass2.run.requestsIssued} requests, ${pass2.persisted.appended} new / ${pass2.persisted.resighted} re-sighted, ${pass2.inventory.pages.length} pages, ${pass2.seconds}s`);

const stored = crawlStore.readAll();
const cmp = comparePasses({ pass1, pass2, changedUrls: CHANGES.map((c) => c.url), storedObservations: stored });
const egress = [...pass1.egress, ...pass2.egress];
const nonLocal = egress.filter((u) => !LOCAL_HOSTS.includes(new URL(u).hostname));

must(nonLocal.length === 0, `${nonLocal.length} request(s) left 127.0.0.1`);
must(cmp.pageIdsMoved.length === 0, `page_id moved for: ${cmp.pageIdsMoved.join(", ")}`);
must(cmp.pagesAcrossBothPasses === cmp.pagesPass1, `a re-seen page became a second record (${cmp.pagesPass1} → ${cmp.pagesAcrossBothPasses})`);
must(cmp.unchanged.newMeasurements === 0, `${cmp.unchanged.newMeasurements} UNCHANGED bodies produced a new measurement record`);
must(cmp.changed.newObservations === CHANGES.length, `${cmp.changed.newObservations} of ${CHANGES.length} changed bodies produced a new observation`);
for (const ch of cmp.changed.chains) must(ch.sameIdBothRuns && ch.pageRecordsWithThisUrl === 1 && ch.observationsOnPage >= 2, `changed page ${ch.url}: its observations did not land on one stable page record`);

/* ================================================================== *
 * 4 — ITEM 42: RE-TEST EVERY CHANGED TARGET.
 * ================================================================== */

const obsOf = (pass, url) => pass.observations.find((o) => o.value.requested_url === url);
const bodyOf = (o) => pass2.bodies.get(o.observation_id) ?? pass1.bodies.get(o.observation_id);
// keyed exactly as bin/audit-technical.mjs keys it, so CANONICAL reads the same map shape
const statusMap = (pass) => new Map(pass.observations.filter((o) => !o.value.skipped).map((o) => [canonicalUrl(o.value.final_url ?? o.value.requested_url).replace(/\/$/, ""), o.value.status]));
const retestOpenedAt = new Date().toISOString();
const retests = [];
for (const c of CHANGES) {
  const before = obsOf(pass1, c.url);
  for (const k of c.checks) {
    const r = await retestChange({
      checkId: k.check, url: c.url,
      before: { observation: before, body: pass1.bodies.get(before.observation_id) },
      storedObservations: stored, bodyOf,
      statusByUrlBefore: statusMap(pass1), statusByUrlAfter: statusMap(pass2),
      titleCountsBefore: titleCountsOf([...pass1.bodies.values()]), titleCountsAfter: titleCountsOf([...pass2.bodies.values()]),
      openedAt: retestOpenedAt,
    });
    const meets =
      (k.expectBefore ? r.before.verdict === k.expectBefore : true) &&
      (k.expectAfter === "SAME" ? r.after.verdict === r.before.verdict : r.after.verdict === k.expectAfter) &&
      (k.expectSummaryIncludes ? (r.after.summary ?? "").includes(k.expectSummaryIncludes) : true);
    retests.push({ change: c.id, kind: c.kind, ...r, expected: k, meetsExpectation: meets });
    must(meets, `re-test ${c.id}/${k.check}: expected ${JSON.stringify(k)}, got ${r.before.verdict} → ${r.after.verdict}`);
    must(r.servedCurrent && r.evidenceBacked, `re-test ${c.id}/${k.check}: not run on the latest stored observation`);
  }
}

/* ================================================================== *
 * 3B — ITEM 48, THE DNS AUDIT HALF: RUN TWICE ON RECORDED RESOLVER ANSWERS.
 * ================================================================== */

const recordedDns = new Map(readJsonl(`${REPO}runs/audit/findings.jsonl`).filter((r) => r.method === "dns.families").map((r) => [r.value.hostname, r.value]));
const recordedFamiliesFor = async (host) => {
  const v = recordedDns.get(host);
  if (!v) throw new Error(`no RECORDED resolver answer for ${host} — refusing to invent one`);
  return v;
};
const auditInputs = { robotsRecords, evidence: readJsonl(`${REPO}runs/evidence/evidence.jsonl`), crawl: crawlRecords, hosts: ESTATE_HOSTNAME_LIST, familiesFor: recordedFamiliesFor };
const audit1 = await runRobotsAndDnsAudit({ store: auditStore, ...auditInputs, openedAt: new Date().toISOString() });
const audit2 = await runRobotsAndDnsAudit({ store: auditStore, ...auditInputs, openedAt: new Date().toISOString() });
must(audit1.writes.appended > 0, "the recorded-DNS audit wrote nothing on its first run — the double run would be vacuous");
must(audit2.writes.appended === 0, `the audit run twice appended ${audit2.writes.appended} new record(s) on its second run`);
console.log(`audit (RECORDED resolver answers): run 1 ${audit1.writes.appended} new / ${audit1.writes.resighted} re-sighted · run 2 ${audit2.writes.appended} new / ${audit2.writes.resighted} re-sighted`);

/* ================================================================== *
 * 5A — THE LEDGER, AND THE EVIDENCE.
 * ================================================================== */

const finishedAt = new Date().toISOString();
const replayEntry = entryFromReplay({ startedAt, finishedAt, passes: [pass1, pass2], egressTotal: egress.length, egressNonLocal: nonLocal.length });

const evidence = {
  recorded: finishedAt,
  kind: `LOCAL REPLAY of Actions run ${RUN_ID} — the real captured bodies, served from 127.0.0.1`,
  notAFixture:
    "These are the bodies the 12 September 2026 crawl captured, recovered from its own Actions artifact and verified byte for byte against each observation's content_sha256. LAW-FIXTURE-1 is satisfied because the double is production's own output, not an imitation of it.",
  doesNotProve: [
    "that the crawler still reaches the live internet today — the 12 September 2026 run proved that, and this replay does not re-prove it",
    "what DNS says today — the audit's double run used RECORDED resolver answers stored on 12 September 2026",
    "robots.txt for hosts whose file was never stored — the replay served a 404 for them, which the crawler reads as 'no robots.txt, allowed'",
  ],
  changeKind: "LOCAL_REPLAY_CHANGE — in-memory copies of recovered bodies, served on 127.0.0.1. NOT a change to any product's real page and NOT a write into any product repository.",
  recovery: {
    artifact: ARTIFACT, runId: RUN_ID, recoveredThisRun: recovery.recoveredThisRun,
    ...(recovery.recoveredThisRun ? { files: recovery.files, bytes: recovery.bytes, seconds: (Date.parse(recovery.finishedAt) - Date.parse(recovery.startedAt)) / 1000 } : {}),
    integrity: { bodies: entries.size, sha256Matches: shaMatches, missing },
  },
  served: { bodies: entries.size, hosts: replayHosts.length, robotsStoredFor: [...robotsByHost.keys()].sort(), robotsServed404For: replayHosts.filter((h) => !robotsByHost.has(h)) },
  egress: { requests: egress.length, nonLocal: nonLocal.length },
  passes: [pass1, pass2].map((p, i) => ({ pass: i + 1, run_id: p.run.run_id, urlsFetched: p.run.urlsFetched, requestsIssued: p.run.requestsIssued, newMeasurements: p.persisted.appended, resightings: p.persisted.resighted, pages: p.inventory.pages.length, seconds: p.seconds })),
  changes: changeLog,
  unchangedByteIdentical: entries.size - CHANGES.length,
  item11: { urls: cmp.urls, pageIdsIdentical: cmp.pageIdsIdentical, pageIdsMoved: cmp.pageIdsMoved, pagesPass1: cmp.pagesPass1, pagesPass2: cmp.pagesPass2, pagesAcrossBothPasses: cmp.pagesAcrossBothPasses, changedChains: cmp.changed.chains },
  item48: {
    crawler: { unchanged: cmp.unchanged, changed: { count: cmp.changed.count, newObservations: cmp.changed.newObservations } },
    dnsAudit: {
      resolver: "RECORDED — the dns.families observations stored on 12 September 2026, not a live query",
      run1: audit1.writes, run2: audit2.writes,
    },
  },
  item42: retests,
  ledger: [replayEntry.entry_id, ...(recovery.recoveredThisRun ? [recovery.entry.entry_id] : [])],
  failures,
  ok: failures.length === 0,
};

console.log(`\nITEM 11 — page_ids identical ${cmp.pageIdsIdentical}/${cmp.urls}, moved ${cmp.pageIdsMoved.length}; pages ${cmp.pagesPass1} → across both passes ${cmp.pagesAcrossBothPasses}`);
console.log(`ITEM 48 — unchanged: ${cmp.unchanged.count} bodies → ${cmp.unchanged.newMeasurements} new measurements, ${cmp.unchanged.resightings} re-sightings · changed: ${cmp.changed.count} → ${cmp.changed.newObservations} new observations`);
for (const r of retests) console.log(`ITEM 42 — ${r.change} ${r.check}: ${r.before.verdict} → ${r.after.verdict}  (read ${r.after.evidence[0]}; meets expectation: ${r.meetsExpectation})`);
console.log(`egress: ${egress.length} requests, ${nonLocal.length} not to 127.0.0.1`);
console.log(`ledger: ${formatLedgerLine(replayEntry)}`);
if (recovery.recoveredThisRun) console.log(`ledger: ${formatLedgerLine(recovery.entry)}`);

if (permission.mayWrite) {
  const ledger = createCostLedger(LEDGER);
  if (recovery.recoveredThisRun) ledger.append(recovery.entry);
  ledger.append(replayEntry);
  writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  console.log(`\nrecorded: ${EVIDENCE}, ${CRAWL_STORE}, ${AUDIT_STORE}, and ${evidence.ledger.length} ledger entr${evidence.ledger.length === 1 ? "y" : "ies"}`);
} else {
  rmSync(tmp, { recursive: true, force: true });
  console.log("\n[dry-run] nothing recorded — add --confirm");
}

globalThis.fetch = realFetch;
console.log(failures.length ? `\n🔴 ${failures.length} assertion(s) FAILED:\n  ${failures.join("\n  ")}` : "\n✅ every assertion held");
process.exit(failures.length ? 1 : 0);
