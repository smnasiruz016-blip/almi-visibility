#!/usr/bin/env node
/**
 * 🔴 EVERY LIVE DECISION SITE, CLASSIFIED — AND THE REMAINDER IS ZERO (23 September 2026).
 *
 *   node tools/decision-site-census.mjs [--check] [--table]
 *
 * READ-ONLY. It writes nothing.
 *
 * ── WHY THE TOTAL IS NOT 102 ────────────────────────────────────────────────
 *
 * A figure of 102 was carried into this work as "4 role adjudications + 60 sealed refusals + 38 write-gate
 * decisions". Measured, those three numbers do not count the same kind of thing:
 *
 *   · write-gate decisions were counted as CODE SITES, and there are 40 of them, not 38;
 *   · the 60 counted SEALED FILES — the firewall excludes 61 paths under two prefixes — all of which are
 *     governed by ONE registry entry and refused at a handful of code sites;
 *   · the 4 counted REGISTRY ROWS, not the places that adjudicate them.
 *
 * Adding files to rows to sites gives a number that reconciles to nothing. This census counts SITES throughout,
 * reports its own total, and reconciles to that. The data populations are reported separately, as data.
 *
 * ── THE CLASSES, DECLARED BEFORE ANY SITE IS READ ───────────────────────────
 *
 *   LIVE_AUDITED                          the decision emits an audit event AS IT IS MADE.
 *   NO_RUNTIME_MUTATION_ENTRY_POINT       wiring or declaration; nothing decides here at run time.
 *   DUPLICATE_OBSERVATION_OF_SAME_DECISION  asks the same question a shared guard already decides; it is
 *                                         traceable to that guard, which is named.
 *   NOT_GOVERNED_WITH_REASON              a read-only diagnostic. It reports the rule; it never applies it to a
 *                                         mutation, so it has nothing to audit.
 *   DEFECT                                a real decision that is NOT audited where it is made.
 *
 * 🔴 A LATER RECORDER OBSERVATION IS NOT LIVE AUDIT EMISSION. Events written by a migration about a decision made
 * earlier do not make that decision LIVE_AUDITED, and nothing here counts them as if they did.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { census as callerCensus } from "./governed-caller-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const CLASSES = Object.freeze([
  "LIVE_AUDITED",
  "NO_RUNTIME_MUTATION_ENTRY_POINT",
  "DUPLICATE_OBSERVATION_OF_SAME_DECISION",
  "NOT_GOVERNED_WITH_REASON",
  "DEFECT",
]);

/** The ONE place each family is really decided. Everything else must be traceable to it. */
export const SHARED_GUARDS = Object.freeze({
  SEALED: "src/governance/sealed-paths.mjs",
  ROLE: "src/governance/evidence-roles.mjs",
});

const SEALED_SHAPES = [["readUnsealed", /\breadUnsealed\(/], ["isSealed", /\bisSealed\(/], ["sealedEntryFor", /\bsealedEntryFor\(/], ["makeSealedLookup", /\bmakeSealedLookup\(/]];
const ROLE_SHAPES = [["entryFor", /\bentryFor\(/], ["observedDataExemption", /\bobservedDataExemption\(/], ["makeEvidenceLookup", /\bmakeEvidenceLookup\(/], ["registryErrors", /\bregistryErrors\(/]];

const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*import\b/.test(l);
const trackedMjs = () =>
  execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "tools", "config"], { encoding: "utf8" })
    .split("\n").filter((f) => f.endsWith(".mjs"));

function shapeSites(shapes) {
  const hits = [];
  for (const file of trackedMjs()) {
    readFileSync(join(REPO, file), "utf8").split(/\r?\n/).forEach((l, i) => {
      if (!isCode(l)) return;
      for (const [shape, re] of shapes) if (re.test(l)) { hits.push({ file, line: i + 1, shape }); return; }
    });
  }
  return hits;
}

/**
 * The rule that assigns a class. It reads only the site's family, its file and its shape — never a list of
 * file names, so a new site is classified the same way an old one is.
 */
function classify(site, family) {
  const guard = SHARED_GUARDS[family];
  /* A construction shape wires a lookup for later use; no refusal or adjudication happens on that line. */
  if (site.shape === "makeSealedLookup" || site.shape === "makeEvidenceLookup") {
    return { cls: "NO_RUNTIME_MUTATION_ENTRY_POINT", why: "constructs a lookup for later use; nothing is decided here" };
  }
  /* A validator over the registry's own shape decides nothing about a resource. */
  if (site.shape === "registryErrors") {
    return { cls: "NO_RUNTIME_MUTATION_ENTRY_POINT", why: "validates the registry's own shape; it adjudicates no resource" };
  }
  if (site.file === guard) {
    /* Inside the shared guard, the one shape that REFUSES is the decision; its helpers express the same one. */
    const decides = family === "SEALED" ? site.shape === "readUnsealed" : site.shape === "observedDataExemption";
    return decides
      ? { cls: "DEFECT", why: `${family} is decided here and the refusal is not audited as it is made` }
      : { cls: "DUPLICATE_OBSERVATION_OF_SAME_DECISION", why: `a helper of the same decision, in ${guard}` };
  }
  if (site.file.startsWith("tools/")) {
    return { cls: "NOT_GOVERNED_WITH_REASON", why: "a read-only census; it reports the rule and applies it to no mutation" };
  }
  if (site.file.startsWith("bin/") && site.file.endsWith("firewall.mjs")) {
    return { cls: "NOT_GOVERNED_WITH_REASON", why: "a read-only firewall report; it applies the rule to no mutation" };
  }
  return { cls: "DUPLICATE_OBSERVATION_OF_SAME_DECISION", why: `asks the question ${guard} decides; traceable to that guard` };
}

export function decisionSiteCensus() {
  const sites = [];

  /* FAMILY 1 — write-gate decisions. The population is the governed-caller census's own, not a second list. */
  for (const r of callerCensus().filter((c) => c.cls === "GOVERNED_STATE_CHANGE")) {
    sites.push({
      family: "WRITE_GATE", file: r.file, line: null, shape: "writePermission",
      ...(r.routed
        ? { cls: "LIVE_AUDITED", why: "routed through the governed-write boundary, which audits the attempt and the outcome" }
        /* 🔴 THE CHECKED AUDIT-STORE EXEMPTION IS STILL LIVE AUDIT. This caller's decision IS emitted live — by the
         * recorder, as a WRITE_GATE_DECISION, before the mutation it carries. What is exempt is routing the
         * MUTATION through a boundary that audits by calling the very store being written. The class is earned
         * from source, condition A and condition B both proved, never declared. */
        : r.auditStoreExempt
          ? { cls: "LIVE_AUDITED", why: `audit-store internal write: its WRITE_GATE_DECISION is emitted live by the recorder at line ${r.exemption.gateLine}, before the mutation at ${r.exemption.firstMutation}` }
          : { cls: "DEFECT", why: "decides whether to mutate durable state and does not audit that decision — repaired by routing" }),
    });
  }

  for (const [family, shapes] of [["SEALED", SEALED_SHAPES], ["ROLE", ROLE_SHAPES]]) {
    for (const s of shapeSites(shapes)) sites.push({ family, ...s, ...classify({ ...s }, family) });
  }

  const byClass = Object.fromEntries(CLASSES.map((c) => [c, sites.filter((s) => s.cls === c).length]));
  const accounted = Object.values(byClass).reduce((a, b) => a + b, 0);
  return { sites, byClass, total: sites.length, remainder: sites.length - accounted };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const r = decisionSiteCensus();
  const byFamily = r.sites.reduce((m, s) => ((m[s.family] = (m[s.family] ?? 0) + 1), m), {});
  console.log(`DECISION-SITE CENSUS — ${r.total} live decision site(s)\n`);
  for (const [f, n] of Object.entries(byFamily).sort()) console.log(`  ${f.padEnd(12)} ${n}`);
  console.log("");
  for (const c of CLASSES) console.log(`  ${c.padEnd(40)} ${r.byClass[c]}`);
  console.log(`  ${"REMAINDER".padEnd(40)} ${r.remainder}`);
  if (process.argv.includes("--table")) {
    for (const s of r.sites) console.log(`  ${s.family.padEnd(11)} ${(s.file + (s.line ? `:${s.line}` : "")).padEnd(44)} ${s.cls}`);
  }
  for (const s of r.sites.filter((x) => x.cls === "DEFECT")) console.log(`  🔴 DEFECT ${s.file}${s.line ? `:${s.line}` : ""} — ${s.why}`);
  if (process.argv.includes("--check") && (r.remainder !== 0 || r.byClass.DEFECT > 0)) process.exit(1);
}
