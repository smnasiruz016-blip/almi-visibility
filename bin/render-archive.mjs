#!/usr/bin/env node
/**
 * RENDER THE 394 STORED BODIES — OFFLINE. THE CAPABILITY ONLY.
 *
 *   node bin/render-archive.mjs                  dry run: render everything, write nothing
 *   node bin/render-archive.mjs --confirm        store the RENDERED observations, the local archive and the ledger entries
 *   node bin/render-archive.mjs --max-pages=N    render at most N (may only LOWER the hard cap)
 *
 * ── 🔴 WHAT THIS DOES NOT DO ────────────────────────────────────────────────
 *
 * It does not compare a render against the served HTML, raise an issue, or say
 * anything about any page. Of the rendered and raw hashes it reports ONE number
 * — how many differ — and nothing about which. A source-versus-render check is a
 * DETECTOR and is written under the sealed exam rule (Owner Ruling 7).
 *
 * It does not fetch. The input is runs/crawl/bodies-2026-09-12.jsonl.br, checked
 * byte for byte against the raw observations before a browser starts. No request
 * reaches any AlmiWorld host, and the D-CRW-5 green for a second crawl stays
 * unspent. The raw observations and the raw archive are hashed before and after
 * the run, and the run refuses to write if either changed.
 *
 * ── WHERE THE RENDERED BODIES GO ────────────────────────────────────────────
 *
 * The observations (hashes, states, resource records, versions, bounds) go into
 * runs/render/ through appendIfNew and are committed. The rendered bodies go into
 * a compressed archive beside them that is NOT committed: they underpin no
 * VERIFIED-PASS row and can be regenerated from the committed raw archive, which
 * is the .gitignore rule's bar. Its size is printed so the owner can rule.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite, governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { readBodyArchive, verifyBodiesAgainstRun, packBodies } from "../src/evidence/body-archive.mjs";
import {
  RENDER_BOUNDS, OFFLINE_CHROMIUM_ARGS, EgressError, LOCAL_ADDRESSES,
  loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument, renderedObservation,
} from "../src/render/renderer.mjs";
import { RENDER_STATES } from "../src/render/render-state.mjs";
import { createCostLedger, entryFromRender, entryFromToolInstall, formatLedgerLine } from "../src/cost/ledger.mjs";
import { batchFile, BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/render-archive.mjs", governed: true, resources: [RESOURCES.crawlBatch(BATCH_ID), RESOURCES.costLedger(), RESOURCES.runArtefacts("render store")] });

const LABEL = "2026-09-13";
const RAW_STORE = batchFile("first-real-crawl-2026-09-12.jsonl");
const RAW_ARCHIVE = batchFile("bodies-2026-09-12.jsonl.br");
const RENDER_STORE = confineToRepo(`${REPO}runs/render/rendered-${LABEL}.jsonl`, { label: "the render store" });
const RENDER_ARCHIVE = confineToRepo(`${REPO}runs/render/rendered-bodies-${LABEL}.jsonl.br`, { label: "the rendered-body archive" });
const EVIDENCE = confineToRepo(`${REPO}runs/render/render-run-${LABEL}.json`, { label: "the render evidence" });
const LEDGER = confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" });
const INSTALL_LOG = `runs/render/npm-install-playwright-core-${LABEL}.log`;

const maxPagesArg = arg("max-pages");
const maxPages = maxPagesArg === null ? RENDER_BOUNDS.maxPages : Number(maxPagesArg);
if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > RENDER_BOUNDS.maxPages) {
  console.error(`🔴 REFUSED — --max-pages must be an integer from 1 to the hard cap ${RENDER_BOUNDS.maxPages}`);
  process.exit(2);
}
const bounds = Object.freeze({ ...RENDER_BOUNDS, maxPages });
const fileSha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

/* 🔴 ZERO EGRESS ON THE NODE SIDE — any fetch to a host that is not local THROWS. */
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (u, init) => {
  const host = new URL(String(u)).hostname;
  if (!LOCAL_ADDRESSES.includes(host)) throw new EgressError(`🔴 NETWORK EGRESS ATTEMPTED to ${host} during a render`);
  return realFetch(u, init);
};

if (permission.mayWrite && existsSync(EVIDENCE)) {
  console.error(`🔴 REFUSED — ${EVIDENCE} already exists. Recorded evidence is not re-recorded over itself.`);
  process.exit(2);
}

/* ================================================================== *
 * 1A — THE INPUT: THE COMMITTED ARCHIVE, VERIFIED BYTE FOR BYTE.
 * ================================================================== */

const rawBefore = { store: fileSha(RAW_STORE), archive: fileSha(RAW_ARCHIVE) };
const crawlRecords = createJsonlStore(RAW_STORE).readAll();
const bodies = readBodyArchive(RAW_ARCHIVE);
const integrity = verifyBodiesAgainstRun({ bodies, crawlRecords });
console.log(`input: ${RAW_ARCHIVE.replace(REPO, "")} (committed archive) · ${integrity.matches}/${integrity.expected} bodies hash to their raw observation · missing ${integrity.missing.length} · mismatched ${integrity.mismatched.length}`);
if (integrity.matches !== integrity.expected || integrity.extra.length) {
  console.error("🔴 REFUSED — the archive is not the run's bodies. A render of the wrong bytes records nothing true.");
  process.exit(1);
}
const raws = crawlRecords.filter((r) => r.record_type === "observation" && !r.value?.skipped);
const planned = raws.slice(0, bounds.maxPages);
const notAttemptedForCap = raws.length - planned.length;

console.log(`\nPLAN — render ${planned.length} of ${raws.length} stored bodies, one at a time, offline`);
console.log(`[bound: per-page timeout ${bounds.perPageTimeoutMs} ms · max total wall clock ${bounds.maxWallClockMs} ms · hard page cap ${bounds.maxPages} · concurrency ${bounds.concurrency}]`);
console.log(`chromium args: ${OFFLINE_CHROMIUM_ARGS.join(" ")}`);

const pw = await loadPlaywright();
if (pw.unavailable) {
  console.error(`🔴 REFUSED — ${pw.unavailable}`);
  process.exit(2);
}

/* ================================================================== *
 * 1B/1C — RENDER, OFFLINE.
 * ================================================================== */

const documents = new Map(planned.map((o) => [o.observation_id, { status: o.value.status, contentType: o.value.response_headers_subset?.["content-type"] ?? "text/html", body: bodies.get(o.observation_id) }]));
const server = await startDocumentServer(documents);
const { browser, environment } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
console.log(`browser: ${environment.browser.name} ${environment.browser.version} (${environment.browser.build}) · ${environment.playwright.package} ${environment.playwright.version}\n`);

const startedAt = new Date().toISOString();
const t0 = Date.now();
const egress = [];
const results = [];
let wallClockHit = false;
let aborted = null;
try {
  for (const raw of planned) {
    if (Date.now() - t0 > bounds.maxWallClockMs) {
      wallClockHit = true;
      break;
    }
    const documentUrl = raw.value.final_url ?? raw.value.requested_url;
    const result = await renderDocument({ browser, origin: server.origin, id: raw.observation_id, documentUrl, bounds, egress });
    results.push({ raw, documentUrl, result, observedAt: new Date().toISOString() });
    if (results.length % 50 === 0) console.log(`  … ${results.length} rendered (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
} catch (e) {
  aborted = e;
} finally {
  await browser.close();
  await server.close();
}
const finishedAt = new Date().toISOString();
globalThis.fetch = realFetch;

if (aborted) {
  console.error(`\n🔴 ABORTED — ${aborted instanceof EgressError ? "EGRESS" : "ERROR"}: ${aborted.message}\nNothing was written.`);
  process.exit(1);
}

/* ================================================================== *
 * 2/3 — WHAT WAS SEEN. COUNTS ONLY.
 * ================================================================== */

const observations = results.map((r) => renderedObservation({ raw: r.raw, result: r.result, environment, bounds, observedAt: r.observedAt, documentUrl: r.documentUrl }));
const states = Object.fromEntries(RENDER_STATES.map((s) => [s, observations.filter((o) => o.value.renderState === s).length]));
const withDom = observations.filter((o) => o.value.bytes !== null);
const differ = withDom.filter((o) => o.content_sha256 !== o.value.raw_content_sha256).length;
const refusedTotal = observations.reduce((n, o) => n + o.value.requests.refused, 0);
const pagesWithRefusal = observations.filter((o) => o.value.requests.refused > 0).length;
const refusedHosts = new Set(observations.flatMap((o) => Object.entries(o.value.requests.byHost).filter(([, h]) => h.refused > 0).map(([host]) => host))).size;
const responses = observations.reduce((n, o) => n + o.value.egressProof.responses, 0);
const nonLocal = observations.reduce((n, o) => n + o.value.egressProof.nonLocal + o.value.egressProof.unverified, 0);
const unaccounted = observations.reduce((n, o) => n + o.value.unaccounted, 0);
const timedOut = observations.filter((o) => o.value.timedOut).length;
const nodeNonLocal = egress.filter((u) => !LOCAL_ADDRESSES.includes(new URL(u).hostname)).length;
const renderedBytes = withDom.reduce((n, o) => n + o.value.bytes, 0);
const rawAfter = { store: fileSha(RAW_STORE), archive: fileSha(RAW_ARCHIVE) };
const rawUntouched = rawAfter.store === rawBefore.store && rawAfter.archive === rawBefore.archive;
const hit = { pagesTimedOut: timedOut, wallClock: wallClockHit, pageCap: notAttemptedForCap > 0, notAttemptedForCap, notAttemptedForWallClock: planned.length - results.length };

const failures = [];
const must = (c, m) => {
  if (!c) failures.push(m);
};
must(nodeNonLocal === 0 && nonLocal === 0, `egress: ${nodeNonLocal} Node request(s) and ${nonLocal} browser response(s) not from 127.0.0.1`);
must(unaccounted === 0 || states.FAILED > 0, "an unaccounted request did not fail its render");
must(rawUntouched, "the raw observations or the raw archive CHANGED during the run");
must(new Set(observations.map((o) => o.value.source_observation_id)).size === observations.length, "two renders point at one raw observation");
for (const o of observations) {
  must(o.value.renderState !== "COMPLETE" || o.value.requests.refused === 0, `${o.observation_id} is COMPLETE with a refused request`);
  must(o.value.requests.refused === 0 || o.value.renderState !== "COMPLETE", `${o.observation_id} refused a request and reads COMPLETE`);
}

console.log(`RENDER STATES over ${observations.length} rendered of ${raws.length} stored bodies`);
console.log(`[bound: per-page timeout ${bounds.perPageTimeoutMs} ms · max total wall clock ${bounds.maxWallClockMs} ms · hard page cap ${bounds.maxPages}]`);
for (const s of RENDER_STATES) console.log(`  ${s.padEnd(8)} ${states[s]}`);
console.log(`bounds hit: per-page timeout on ${timedOut} page(s) · wall clock ${wallClockHit ? "HIT" : "not hit"} · page cap ${hit.pageCap ? `HIT (${notAttemptedForCap} not attempted)` : "not hit"}`);
console.log(`refused requests: ${refusedTotal} across ${pagesWithRefusal} page(s), to ${refusedHosts} distinct host(s) · unaccounted by the interception: ${unaccounted}`);
console.log(`egress: ${egress.length} Node request(s), ${nodeNonLocal} not to 127.0.0.1 · ${responses} browser response(s), ${nonLocal} from any address other than 127.0.0.1`);
console.log(`\nDIFFER — of ${withDom.length} renders with a DOM, rendered content_sha256 ≠ raw content_sha256: ${differ}`);
console.log("   (the hash of the serialised DOM against the hash of the served bytes; any byte of difference counts. Which pages, and why, is not looked at here.)");
console.log(`\nraw observations and raw archive unchanged: ${rawUntouched ? "yes" : "🔴 NO"} (store ${rawAfter.store.slice(0, 16)} · archive ${rawAfter.archive.slice(0, 16)})`);

/* ================================================================== *
 * 4 — THE LEDGER, AND THE EVIDENCE.
 * ================================================================== */

const renderArchive = packBodies(results.flatMap((r, i) => (r.result.html === null ? [] : [{ observation_id: observations[i].observation_id, body: r.result.html }])));
console.log(`rendered-body archive: ${renderedBytes} bytes of DOM → ${renderArchive.length} bytes compressed (NOT committed — regenerable, underpins no VERIFIED-PASS row)`);

const renderEntry = entryFromRender({
  startedAt, finishedAt, pagesPlanned: planned.length, pagesRendered: observations.length, states,
  requestsRefused: refusedTotal, localDocumentRequests: egress.length, browserResponses: responses, nonLocalResponses: nonLocal,
  bounds, hit, sources: observations.map((o) => o.observation_id),
});
console.log(`ledger: ${formatLedgerLine(renderEntry)}`);

let installEntry = null;
if (existsSync(`${REPO}${INSTALL_LOG}`)) {
  const log = readFileSync(`${REPO}${INSTALL_LOG}`, "utf8");
  const head = Object.fromEntries([...log.matchAll(/^# (\w+)=(\S+)/gm)].map((m) => [m[1], m[2]]));
  const walk = (d) => readdirSync(d).reduce((n, f) => n + (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : statSync(join(d, f)).size), 0);
  const browsersJson = JSON.parse(readFileSync(`${REPO}node_modules/playwright-core/browsers.json`, "utf8"));
  const revision = browsersJson.browsers.find((b) => b.name === "chromium-headless-shell").revision;
  const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  const marker = join(cacheRoot, `chromium_headless_shell-${revision}`, "INSTALLATION_COMPLETE");
  const markerAt = existsSync(marker) ? statSync(marker).mtime.toISOString() : null;
  installEntry = entryFromToolInstall({
    startedAt: head.started, finishedAt: head.finished, pkg: head.package,
    registryFetches: (log.match(/^npm http fetch /gm) ?? []).length,
    cacheHits: (log.match(/\(cache hit\)/g) ?? []).length,
    installedBytes: walk(`${REPO}node_modules/playwright-core`),
    browser: {
      revisionDir: `chromium_headless_shell-${revision}`,
      note: markerAt && markerAt < head.started
        ? `NOT downloaded by this run: the browser build Playwright ${head.package} needs was already in the local cache, installed ${markerAt} for other work. That earlier download's cost is not this run's and was never recorded here`
        : "🔴 the browser cache marker is missing or newer than the install — the browser download was not measured",
    },
    logRef: INSTALL_LOG,
  });
  console.log(`ledger: ${formatLedgerLine(installEntry)}`);
  console.log(`        ${installEntry.budget.browserNote}`);
}

const evidence = {
  recorded: finishedAt,
  kind: "OFFLINE RENDER of the 12 September 2026 crawl's committed bodies — the capability only",
  doesNotDo: [
    "compare any render against its served HTML — a source-versus-render check is a DETECTOR, written under the sealed exam rule",
    "say anything about which pages differ, or why",
    "fetch anything: the input is the committed archive and every browser request beyond the local document was refused",
  ],
  input: { archive: `observations/${BATCH_ID}/bodies-2026-09-12.jsonl.br`, integrity, rawBefore, rawAfter, rawUntouched },
  environment,
  bounds, hit,
  states, rendered: observations.length, stored: raws.length,
  requests: { refused: refusedTotal, pagesWithRefusal, refusedHosts, unaccounted },
  egress: { nodeRequests: egress.length, nodeNonLocal, browserResponses: responses, browserNonLocal: nonLocal },
  differ: { of: withDom.length, count: differ, definition: "rendered content_sha256 (serialised DOM) ≠ raw content_sha256 (served bytes)" },
  renderedArchive: { path: RENDER_ARCHIVE.replace(REPO, ""), domBytes: renderedBytes, compressedBytes: renderArchive.length, committed: false },
  ledger: [renderEntry.entry_id, ...(installEntry ? [installEntry.entry_id] : [])],
  failures, ok: failures.length === 0,
};

/* Routed. FOUR targets, four governed occurrences: the observations (re-sighting preserved), the rendered-body
 * archive (BINARY — packBodies returns a brotli buffer, hashed as raw bytes and never decoded), the evidence file
 * (TEXT), and the cost entries (the ledger SKIPS a duplicate entry_id). `failures.length === 0` stays a business
 * condition: a run whose assertions failed records nothing, permission or not. */
if (failures.length === 0) {
  const RA_INSTANT = governedInstant(Date.now());
  const RA_CORRELATION = `run:render-archive:${RA_INSTANT}`;
  const store = createJsonlStore(RENDER_STORE);
  const obsArgs = governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store, records: observations, targetClass: "RUN_EVIDENCE",
    action: "APPEND_RENDER_OBSERVATIONS", occurredAt: RA_INSTANT, correlationId: RA_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: finishedAt,
  });
  const obsGoverned = executeGovernedWrite(obsArgs);
  const appended = (obsArgs.adapter.result ?? []).filter((w) => w?.appended).length;
  const resighted = (obsArgs.adapter.result ?? []).length - appended;
  const raOutcomes = [
    obsGoverned,
    executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
      repo: REPO, permission, target: RENDER_ARCHIVE, targetClass: "RUN_EVIDENCE", bytes: renderArchive,
      action: "WRITE_RENDERED_BODY_ARCHIVE", occurredAt: RA_INSTANT, correlationId: RA_CORRELATION,
    })),
    executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
      repo: REPO, permission, target: EVIDENCE, targetClass: "RUN_EVIDENCE",
      bytes: JSON.stringify({ ...evidence, writes: { appended, resighted } }, null, 2) + "\n",
      action: "WRITE_RENDER_EVIDENCE", occurredAt: RA_INSTANT, correlationId: RA_CORRELATION,
    })),
    executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
      repo: REPO, permission, store: createCostLedger(LEDGER),
      records: [installEntry, renderEntry].filter(Boolean), targetClass: "RUN_EVIDENCE",
      action: "APPEND_RENDER_COST_ENTRIES", occurredAt: RA_INSTANT, correlationId: RA_CORRELATION,
      discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
    })),
  ];
  const raBad = raOutcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
  if (raBad) {
    console.error(`🔴 ${raBad.outcome} — the run was not recorded; the governed attempt is on the audit trail`);
    process.exit(1);
  }
  if (raOutcomes.every((o) => o.outcome === "REFUSED")) {
    console.log("\n[dry-run] nothing recorded — add --confirm");
  } else {
    console.log(`\nrecorded: ${RENDER_STORE.replace(REPO, "")} (${appended} new / ${resighted} re-sighted), ${EVIDENCE.replace(REPO, "")}, the local archive, and ${evidence.ledger.length} ledger entr${evidence.ledger.length === 1 ? "y" : "ies"}`);
  }
} else if (!permission.mayWrite) {
  console.log("\n[dry-run] nothing recorded — add --confirm");
}

console.log(failures.length ? `\n🔴 ${failures.length} assertion(s) FAILED — nothing recorded:\n  ${failures.slice(0, 20).join("\n  ")}` : "\n✅ every assertion held");
process.exit(failures.length ? 1 : 0);
