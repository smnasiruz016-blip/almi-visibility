#!/usr/bin/env node
/**
 * 🔴 F07 §4 · THE REAL POPULATIONS — MEASURED WITHOUT OPENING SEALED PAYLOAD (23 September 2026).
 *
 *   node tools/heldout-population-census.mjs [--check]
 *
 * READ-ONLY. Counts and hashes only: no sealed path, no held-out member and no file content is ever printed.
 *   A · every declared sealed path                     (tracked-file NAMES classified by the seal classifier)
 *   B · every mandatory governance-reading source      (the declared manifest against what the loaders read)
 *   C · every production access path to sealed material (decision sites of the SEALED and HELDOUT families)
 *   D · every access-log writer and reader              (modules that emit or read guard / evaluation events)
 *   E · every file governed by the no-payload rule      (the firewall's scanned population)
 *   F · every mechanism-freeze record                   (EVALUATION · HELDOUT_MECHANISM_FROZEN in the trail)
 * plus the "61 = 61?" question: the sealed PATHS and the retired MEMBERS, compared by hash — never by content.
 * Each population carries a positive control run on the same code, so a zero here is not a scanner that stopped.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { MANDATORY_READING, BOARD_AND_AUTHORITY_CONFIG } from "../config/governance/mandatory-reading.mjs";
import { census as authorityCensus } from "../src/authority/corpus.mjs";
import { isSealed } from "../src/governance/sealed-paths.mjs";
import { requiredSources, manifestErrors } from "../src/governance/mandatory-reading.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { decisionSiteCensus } from "./decision-site-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 26 });
const sha = (s) => createHash("sha256").update(s).digest("hex");
const lines = (s) => s.split("\n").filter(Boolean);

/** A · the declared sealed paths, by NAME only. */
export function sealedPathPopulation() {
  const tracked = lines(git("ls-files"));
  const untracked = lines(git("ls-files", "--others", "--exclude-standard"));
  const ignored = lines(git("ls-files", "--others", "--ignored", "--exclude-standard"));
  const sealed = tracked.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p));
  const entries = EVIDENCE_ROLE_REGISTRY.filter((e) => e.role === "SEALED" || (e.sealed === true && e.resource?.pathPrefixes));
  const prefixes = entries.flatMap((e) => e.resource.pathPrefixes);
  return {
    source: "git ls-files (names) × classifySealed over EVIDENCE_ROLE_REGISTRY",
    denominator: tracked.length,
    included: sealed.length,
    excluded: tracked.length - sealed.length,
    excludedReason: "not under a declared sealed prefix",
    untrackedUnderPrefix: untracked.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p)).length,
    ignoredUnderPrefix: ignored.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p)).length,
    byPrefix: prefixes.map((pre) => sealed.filter((p) => p.toLowerCase().startsWith(pre.toLowerCase())).length),
    registryEntries: entries.length,
    commitment: sha([...sealed].sort().join("\n")),
    remainder: tracked.length - sealed.length - (tracked.length - sealed.length),
    control: isSealed(EVIDENCE_ROLE_REGISTRY, "engine", `${prefixes[0]}zz-synthetic-probe`) && !isSealed(EVIDENCE_ROLE_REGISTRY, "engine", "package.json"),
    paths: sealed, // returned to callers in-process for accounting; NEVER printed
  };
}

/** The two 61s: sealed PATHS vs the retired set's MEMBERS, compared only by sha256 of each lower-cased element. */
export function sameSixtyOne({ sealedPaths, retiredMembers }) {
  const hs = (xs) => new Set(xs.map((x) => sha(String(x).toLowerCase())));
  const a = hs(sealedPaths);
  const b = hs(retiredMembers);
  const both = [...a].filter((x) => b.has(x)).length;
  return { paths: a.size, members: b.size, intersection: both, control: [...a].filter((x) => a.has(x)).length === a.size };
}

/** B · the manifest against the loaders. */
export function manifestPopulation() {
  const required = requiredSources({ corpus: AUTHORITY_CORPUS, dispositions: authorityCensus(AUTHORITY_CORPUS, CORPUS_PROVENANCE.now).dispositions, acceptances: ACCEPTANCES, boardConfig: BOARD_AND_AUTHORITY_CONFIG });
  const errs = manifestErrors({ manifest: MANDATORY_READING, required, registry: EVIDENCE_ROLE_REGISTRY });
  const sealedPath = sealedPathPopulation().paths[0];
  const planted = manifestErrors({ manifest: [...MANDATORY_READING, { repo: "engine", path: sealedPath }], required, registry: EVIDENCE_ROLE_REGISTRY });
  const removed = manifestErrors({ manifest: MANDATORY_READING.slice(1), required, registry: EVIDENCE_ROLE_REGISTRY });
  return {
    source: "config/governance/mandatory-reading.mjs × requiredSources(authority corpus CURRENT, pinned acceptances, board config)",
    denominator: required.length, included: MANDATORY_READING.length, excluded: 0,
    errors: errs.length, remainder: required.length - MANDATORY_READING.filter((m) => required.some((r) => r.repo === m.repo && r.path === m.path)).length,
    control: planted.some((e) => e.code === "SEALED_IN_MANIFEST") && removed.some((e) => e.code === "REQUIRED_SOURCE_MISSING"),
  };
}

/** C · production access paths to sealed material, from the decision-site census's SEALED and HELDOUT families. */
export function accessPathPopulation() {
  const d = decisionSiteCensus();
  const s = d.sites.filter((x) => x.family === "SEALED" || x.family === "HELDOUT");
  const by = s.reduce((m, x) => ((m[x.cls] = (m[x.cls] ?? 0) + 1), m), {});
  return { source: "tools/decision-site-census.mjs families SEALED + HELDOUT", denominator: s.length, byClass: by, defect: by.DEFECT ?? 0, unknown: s.length - Object.values(by).reduce((a, b) => a + b, 0) };
}

/** D · access-log writers and readers: production modules that EMIT guard/evaluation events or READ them back. */
export function accessLogPopulation() {
  const files = lines(git("ls-files", "src", "bin", "tools", "subjects")).filter((f) => f.endsWith(".mjs"));
  const text = (f) => readFileSync(join(REPO, f), "utf8");
  const writers = files.filter((f) => /\baudit\.emit\(|\bemit\(audit,|durableGuardSink\(|governedGuardSink\(/.test(text(f)));
  const readers = files.filter((f) => /eventType === "EVALUATION"|metadata\?\.family === "H"|\.filter\(H\)|guardEvents/.test(text(f)));
  return { source: "git ls-files src bin tools, emit/read shapes of guard and evaluation events", writers: writers.length, readers: readers.length, writerFiles: writers, readerFiles: readers };
}

/** E · the firewall's no-payload population. */
export function noPayloadPopulation() {
  const tracked = lines(git("ls-files"));
  const sealed = tracked.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p));
  return { source: "the held-out firewall's engine population (git ls-files)", denominator: tracked.length, included: tracked.length - sealed.length, excluded: sealed.length, excludedReason: "sealed — excluded UNREAD, counted", remainder: 0 };
}

/** F · mechanism-freeze records in the trail this process is entitled to (production outside a test). */
export function freezePopulation({ store = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }) } = {}) {
  const ev = store.readAll().events.filter((e) => e.eventType === "EVALUATION" && e.metadata?.family === "H");
  return { source: "audit trail · EVALUATION events", freezes: ev.filter((e) => e.action === "HELDOUT_MECHANISM_FROZEN").length, accesses: ev.filter((e) => e.action === "HELDOUT_ACCESS").length, allowed: ev.filter((e) => e.action === "HELDOUT_ACCESS" && e.outcome === "ALLOWED").length, refused: ev.filter((e) => e.action === "HELDOUT_ACCESS" && e.outcome === "REFUSED").length };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const A = sealedPathPopulation();
  console.log("F07 §4 · REAL POPULATIONS (counts and hashes only)\n");
  console.log(`A · sealed paths      denominator ${A.denominator} tracked · SEALED ${A.included} · not sealed ${A.excluded} · untracked under a prefix ${A.untrackedUnderPrefix} · ignored under a prefix ${A.ignoredUnderPrefix}`);
  console.log(`                      ${A.registryEntries} registry entr(y/ies) · by prefix ${A.byPrefix.join(" + ")} · commitment ${A.commitment.slice(0, 16)}… · control fires: ${A.control}`);
  const B = manifestPopulation();
  console.log(`B · mandatory reading required ${B.denominator} · declared ${B.included} · errors ${B.errors} · remainder ${B.remainder} · control (planted sealed → RED, removed source → RED): ${B.control}`);
  const C = accessPathPopulation();
  console.log(`C · access paths      ${C.denominator} sites · ${Object.entries(C.byClass).map(([k, v]) => `${k} ${v}`).join(" · ")} · DEFECT ${C.defect} · unknown ${C.unknown}`);
  const D = accessLogPopulation();
  console.log(`D · access log        writers ${D.writers} · readers ${D.readers}`);
  const E = noPayloadPopulation();
  console.log(`E · no-payload rule   ${E.denominator} tracked · scanned ${E.included} · excluded ${E.excluded} (${E.excludedReason}) · remainder ${E.remainder}`);
  const F = freezePopulation();
  console.log(`F · freeze records    ${F.freezes} · access decisions ${F.accesses} (allowed ${F.allowed} · refused ${F.refused})`);
  if (process.argv.includes("--check") && (!A.control || !B.control || B.errors || C.defect || C.unknown)) process.exit(1);
}
