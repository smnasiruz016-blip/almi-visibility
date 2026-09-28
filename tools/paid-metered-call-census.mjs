#!/usr/bin/env node
/**
 * 🔴 F77 M4 · THE PAID AND METERED CALL-PATH CENSUS (RR-81; acceptance _handoffs 7042c77 R5; limb map 84f26b9).
 *
 *   node tools/paid-metered-call-census.mjs [--check]
 *
 * READ-ONLY: it reads the COMMITTED tree (git ls-files) and writes nothing. It answers the F77 R5 question for calls: which code
 * paths in production can reach the network, and what kind of call each makes.
 *
 *   1. RAW EGRESS — every raw network primitive in production source (src/, bin/). Each must be a DECLARED egress site;
 *      anything else is UNCLASSIFIED and fails.
 *   2. CONNECTOR KINDS — every egress passes through a declared F03 connector; every connector kind is classified as
 *      METERED (a provider counts it against a quota or a bill) or UNMETERED_PUBLIC (a public page, no account). An
 *      unclassified kind fails; a classified kind that no longer exists is STALE and fails.
 *   3. PAID PROVIDERS — every construction of the paid-provider gate in production source, and whether any provider it is
 *      given is REAL. A fake provider is an exercise, not a paid path.
 *
 * LAW-BOUND-1: the population scanned and the bound are printed beside every result. A zero is printed as a measured zero.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CONNECTOR_KINDS } from "../src/tenancy/root-registry.mjs";
import { DEFERRED_LIMBS } from "../config/fboard/deferred-limbs.mjs";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FILE_BOUND = 2000;

/** A raw network primitive. `fetchImpl(`, `fetchUrl(` and method calls like `x.fetch(` are not raw primitives. */
export const RAW_EGRESS = /(?:^|[^.\w])(?:globalThis\.)?fetch\(|\bhttps?\.(?:request|get)\(|\bnet\.connect\(|\btls\.connect\(|\bnew WebSocket\(/;
export const DECLARED_EGRESS = Object.freeze({
  "src/tenancy/connectors.mjs": "the one connector fetch — every network call leaves through a declared F03 connector",
});
export const CONNECTOR_CALL_CLASS = Object.freeze({
  PUBLIC_SITE: "UNMETERED_PUBLIC",
  CITED_SOURCES: "UNMETERED_PUBLIC",
  SEARCH_CONSOLE_API: "METERED",
});
const GATE = /\bcreatePaidProviderGate\(/;
const FAKE = /\bcreateFakePaidProvider\(/;
const isComment = (line) => /^\s*(\*|\/\/|\/\*)/.test(line);

/** The census over { path: text } — pure, so a control can plant a file. */
export function censusOf(files, { connectorKinds = CONNECTOR_KINDS } = {}) {
  const paths = Object.keys(files).sort();
  if (paths.length > FILE_BOUND) throw new RangeError(`POPULATION_OVER_BOUND: ${paths.length} files exceed ${FILE_BOUND}`);
  const egress = [];
  const unclassified = [];
  const gates = [];
  for (const p of paths) {
    const lines = String(files[p]).split("\n");
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (RAW_EGRESS.test(line)) (Object.hasOwn(DECLARED_EGRESS, p) ? egress : unclassified).push(`${p}:${i + 1}`);
      if (GATE.test(line) && !/export function createPaidProviderGate/.test(line)) gates.push({ site: `${p}:${i + 1}`, file: p });
    });
  }
  const paid = gates.map((g) => ({ site: g.site, provider: FAKE.test(String(files[g.file])) ? "FAKE_EXERCISE" : "REAL_OR_UNKNOWN" }));
  const kinds = [...connectorKinds];
  const unclassifiedKinds = kinds.filter((k) => !Object.hasOwn(CONNECTOR_CALL_CLASS, k));
  const staleKinds = Object.keys(CONNECTOR_CALL_CLASS).filter((k) => !kinds.includes(k));
  const metered = kinds.filter((k) => CONNECTOR_CALL_CLASS[k] === "METERED");
  return {
    population: paths.length,
    bound: FILE_BOUND,
    declaredEgress: egress,
    unclassifiedEgress: unclassified,
    connectorKinds: kinds.length,
    meteredKinds: metered,
    unmeteredKinds: kinds.filter((k) => CONNECTOR_CALL_CLASS[k] === "UNMETERED_PUBLIC"),
    unclassifiedKinds,
    staleKinds,
    paidGateSites: paid,
    realPaidProviders: paid.filter((x) => x.provider !== "FAKE_EXERCISE").length,
    ok: unclassified.length === 0 && unclassifiedKinds.length === 0 && staleKinds.length === 0 && paid.every((x) => x.provider === "FAKE_EXERCISE"),
  };
}

/**
 * 🔴 RR-82 §2.2 · THE REOPENING TRIGGER, CHECKABLE. A limb deferred as NOT MEASURED until a real paid provider exists (config/fboard/
 * deferred-limbs.mjs) FAILS here the moment the census sees one: the row must be reopened and the paid path proved before any
 * PASS claim about that provider.
 */
export function deferredLimbFaults(census, deferred = DEFERRED_LIMBS) {
  return deferred
    .filter((d) => d.reopensWhen === "REAL_PAID_PROVIDER_DECLARED" && d.state === "NOT_MEASURED" && census.realPaidProviders > 0)
    .map((d) => ({ code: "DEFERRED_LIMB_REOPEN_REQUIRED", featureId: d.featureId, limb: d.limb, why: `${census.realPaidProviders} real paid provider(s) declared while ${d.featureId} ${d.limb} stands NOT MEASURED — reopen ${d.featureId} and prove the paid path before any PASS claim about it` }));
}

/** The production population: every committed .mjs under src/ and bin/. */
export function productionFiles() {
  const list = execFileSync("git", ["-C", REPO, "ls-files", "src", "bin"], { encoding: "utf8" }).split("\n").filter((p) => p.endsWith(".mjs"));
  return Object.fromEntries(list.map((p) => [p, readFileSync(join(REPO, p), "utf8")]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const c = censusOf(productionFiles());
  console.log(`PAID AND METERED CALL-PATH CENSUS — population ${c.population} production file(s) · bound ${c.bound}`);
  console.log(`  raw egress: declared ${c.declaredEgress.length} · UNCLASSIFIED ${c.unclassifiedEgress.length}`);
  console.log(`  connector kinds ${c.connectorKinds}: METERED ${c.meteredKinds.length} · UNMETERED_PUBLIC ${c.unmeteredKinds.length} · unclassified ${c.unclassifiedKinds.length} · stale ${c.staleKinds.length}`);
  console.log(`  paid-provider gate sites ${c.paidGateSites.length} · REAL paid providers ${c.realPaidProviders} (a fake provider is an exercise, not a paid path)`);
  for (const u of c.unclassifiedEgress) console.log(`  🔴 UNCLASSIFIED EGRESS ${u}`);
  const deferredFaults = deferredLimbFaults(c);
  for (const d of DEFERRED_LIMBS) console.log(`  deferred limb ${d.featureId} ${d.limb} (${d.name}): ${d.state} — ${d.scopeSentence}`);
  for (const f of deferredFaults) console.log(`  🔴 ${f.code} ${f.featureId} ${f.limb}: ${f.why}`);
  if (process.argv.includes("--check") && (!c.ok || deferredFaults.length > 0)) process.exit(1);
}
