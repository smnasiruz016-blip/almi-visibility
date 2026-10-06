#!/usr/bin/env node
/**
 * GATE A — the command line.
 *
 *   node bin/gate-a.mjs --corpus <dir>            measure and report (DRY-RUN)
 *   node bin/gate-a.mjs --corpus <dir> --out <dir>   also write JSON + CSV
 *
 * ⚠️ THE WRITE LAW APPLIES TO --out, at its LOCAL level: dry-run by default, and
 * `--confirm` to actually write. It does NOT ask for ALLOW_PROD_WRITE, because
 * `--out` writes a report file on this machine and nothing else — and a safety
 * flag typed every day stops being a signal. Nothing here touches a database;
 * there is no database yet, deliberately. See src/write-law.mjs.
 *
 * ── THE CORPUS ──────────────────────────────────────────────────────────────
 *
 * A directory of template GROUPS. One sub-directory per group, and inside it one
 * `.html` file per page — the RENDERED HTML as served, never the source. An
 * optional `<page>.facts.json` beside a page carries its fact records.
 *
 *     corpus/
 *       profession/                     <- one template group
 *         nursing.html
 *         nursing.facts.json            <- optional
 *       profession-origin-org/
 *         nursing__from-india__uk-nmc.html
 *
 * Two templates are never compared to each other, which is why the group is a
 * directory rather than a flag.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { runGateA } from "../src/gate-a/run.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

const argv = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = argv.indexOf(name);
  return i === -1 || i + 1 >= argv.length ? fallback : argv[i + 1];
}

const corpusDir = flag("--corpus");
const outDir = flag("--out");
const shellDefinition = flag("--shell", "B");

// The write law is announced BEFORE anything else happens, so a run that is
// about to change something never looks like a run that is about to report.
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:gate-a:${RUN_INSTANT}`;
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/gate-a.mjs", governed: true, resources: [RESOURCES.inputPath(corpusDir, "--corpus")] });

if (!corpusDir) {
  console.error("\nusage: node bin/gate-a.mjs --corpus <dir> [--out <dir>] [--shell A|B] [--confirm]");
  process.exit(2);
}
if (!existsSync(corpusDir)) {
  console.error(`\ncorpus not found: ${corpusDir}`);
  process.exit(2);
}

/** Read one template group from a directory. */
function readGroup(dir) {
  const pages = [];
  for (const name of readdirSync(dir)) {
    if (extname(name) !== ".html") continue;
    const id = basename(name, ".html");
    const factsPath = join(dir, `${id}.facts.json`);
    pages.push({
      id,
      html: readFileSync(join(dir, name), "utf8"),
      facts: existsSync(factsPath) ? JSON.parse(readFileSync(factsPath, "utf8")) : [],
      whyThisUrl: existsSync(join(dir, `${id}.why.txt`))
        ? readFileSync(join(dir, `${id}.why.txt`), "utf8").trim()
        : "",
    });
  }
  return pages;
}

const groups = readdirSync(corpusDir).filter((n) => statSync(join(corpusDir, n)).isDirectory());
if (groups.length === 0) {
  console.error(`\nno template groups (sub-directories) in ${corpusDir}`);
  process.exit(2);
}

/**
 * 🔴 WHICH GROUPS ARE ONLY A SAMPLE — and what that forbids.
 *
 * `uniqueWords` is a function of ONE page, so a sample gives an honest
 * DISTRIBUTION of it. `overlap` is a claim about a PARTICULAR PAIR, and "every
 * sibling, never a sample" was always its rule. A sample does not weaken that
 * rule — it makes overlap INAPPLICABLE: an overlap computed inside a 500-page
 * sample of a 237,413-page group is not that group's overlap and must never be
 * printed as though it were.
 */
const manifestPath = join(corpusDir, "corpus-manifest.json");
const corpusManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
const sampledGroups = new Set();
/* F02 relocation: the corpus manifest NAMES its sampled group (leafGroup) — this runner used to know one subject's group
 * name. A sampled manifest that names none marks EVERY group a sample: overlap stays inapplicable rather than wrongly shown. */
if (corpusManifest && corpusManifest.leafSampled) {
  const leaf = corpusManifest.leafGroup;
  if (typeof leaf === "string") { if (corpusManifest.leafSampled < (corpusManifest.groups?.[leaf] ?? Infinity)) sampledGroups.add(leaf); }
  else for (const g of Object.keys(corpusManifest.groups ?? {})) sampledGroups.add(g);
}

/** min / median / max, plus the two ends of the distribution that matter. */
function distribution(values) {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const at = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, min: v[0], p25: at(0.25), median: at(0.5), p75: at(0.75), p95: at(0.95), max: v[v.length - 1] };
}

const report = { generatedAt: new Date().toISOString(), shellDefinition, corpus: corpusManifest, groups: [] };

for (const g of groups) {
  const pages = readGroup(join(corpusDir, g));
  const sampled = sampledGroups.has(g);
  const out = runGateA(pages, { shellDefinition });
  report.groups.push({ group: g, sampled, ...out });

  console.log(`\n── ${g} — ${out.pages} page(s)${sampled ? "  (A SAMPLE, not the whole group)" : ""} ──`);
  if (out.vacuous) {
    // Count the population BEFORE the guard. An empty group is a finding.
    console.log("  🔴 EMPTY GROUP — nothing was measured. This is not a pass.");
    continue;
  }
  console.log(
    `  shell: A=${out.shell.sizeA} tokens · B=${out.shell.sizeB} tokens · ` +
      `B needs ${out.shell.minPagesForShell}/${out.pages} pages` +
      (out.shell.bEqualsA ? "  (group is small: B IS A here, the definition is doing nothing)" : ""),
  );

  // The DISTRIBUTION, not just pass/fail. On a sampled group this is the honest
  // thing a sample can say, and on a full group it is the whole population.
  const dist = distribution(out.results.map((r) => r.uniqueWords));
  report.groups[report.groups.length - 1].uniqueWordsDistribution = dist;
  console.log(
    `  uniqueWords (review signal ${out.signals.MIN_UNIQUE_WORDS}): ` +
      `min ${dist.min} · p25 ${dist.p25} · median ${dist.median} · p75 ${dist.p75} · p95 ${dist.p95} · MAX ${dist.max}`,
  );
  if (sampled) {
    // The rule the owner set before the run: if even the sample's MAXIMUM is far
    // below the bar, the finding is about the whole group. If anything came
    // CLOSE, the sample has done its job and the group must be counted in full.
    const near = dist.max >= out.signals.MIN_UNIQUE_WORDS * 0.8;
    console.log(
      near
        ? `    🔴 the sample's MAXIMUM (${dist.max}) is within 20% of the review signal — THE SAMPLE HAS DONE ITS JOB. Count this group IN FULL before ruling on it.`
        : `    the sample's MAXIMUM (${dist.max}) is far below ${out.signals.MIN_UNIQUE_WORDS} — one justification covers the whole group; it does not need 237,413 separate ones.`,
    );
  }

  /* RR-192 · T-1: 350 / 5 / 0.40 decide nothing; above 0.40 is REVIEW_REQUIRED, and only a missing why-this-url or an unmeasurable pair REJECTs */
  const by = (v) => out.results.filter((r) => r.verdict === v).length;
  console.log(`  KEEP ${by("KEEP")} · REVIEW_REQUIRED ${by("REVIEW_REQUIRED")} · REJECT ${by("REJECT")}`);
  const byStage = {};
  for (const r of out.results) if (r.rejectedAt) byStage[r.rejectedAt] = (byStage[r.rejectedAt] ?? 0) + 1;
  for (const [stage, n] of Object.entries(byStage)) console.log(`    rejected at ${stage}: ${n}`);

  console.log(`  facts counted on every page (no stop, RR-192 T-1): ${out.results.length} · reaching the five-fact review signal: ${out.results.filter((r) => r.factsReachSignal).length}`);

  // 🔴 The quadratic stage must never be silently empty.
  // 🔴 Both numbers, always. How many pages were SCORED, and what they were
  // scored AGAINST. Showing only the first is how the survivor-population
  // false pass stayed invisible until the first acceptance test.
  console.log(
    `  reached stage 3 (overlap): ${out.reachedOverlap} scored (eliminated before it: ${out.eliminatedBefore})` +
      ` · judged AGAINST the published population of ${out.overlapPopulation}` +
      ` · ${out.overlapComparisons.toLocaleString("en-US")} comparisons`,
  );
  if (sampled) {
    console.log(
      "    🔴 OVERLAP IS NOT REPORTED FOR THIS GROUP. It is a SAMPLE, and overlap is a claim about a\n" +
        "       particular PAIR — 'every sibling, never a sample' does not weaken here, it makes the\n" +
        "       measurement INAPPLICABLE. An overlap inside a sample is not this group's overlap.",
    );
  } else if (out.reachedOverlap === 0) {
    console.log("    🔴 NO PAGE REACHED THE OVERLAP STAGE. That is a finding about this corpus, not a pass.");
  } else {
    console.log(`    strategy: ${out.overlapStrategy.kind} — ${out.overlapStrategy.note}`);
    if (!out.overlapStrategy.complete) {
      console.log("    ⚠️ this strategy is NOT complete — it may miss a pair, and its rate must be stated.");
    }
  }
}

// ── output ──────────────────────────────────────────────────────────────────
if (outDir) {
  /* The CSV is built whether or not the write is permitted, so a dry run reports the same two targets a permitted
   * run would produce. 🔴 CONFINED, WHICH IT WAS NOT BEFORE — a deliberate tightening, recorded. */
  const rows = [
    "group,id,verdict,rejectedAt,totalWords,uniqueWords,qualifyingFacts,residualWords,maxOverlap,overlapAgainst",
  ];
  for (const g of report.groups) {
    for (const r of g.results ?? []) {
      rows.push(
        [
          g.group, r.id, r.verdict, r.rejectedAt ?? "",
          r.totalWords, r.uniqueWords,
          r.facts ? r.facts.qualifying : "",
          r.residualWords ?? "", r.maxOverlap ?? "", r.overlapAgainst ?? "",
        ].join(","),
      );
    }
  }
  const dir = confineToRepo(outDir, { label: "--out" });
  let refused = false;
  let failed = false;
  for (const [name, body, what] of [
    ["gate-a.json", JSON.stringify(report, null, 2), "WRITE_GATE_A_REPORT"],
    ["gate-a.csv", rows.join("\n"), "WRITE_GATE_A_CSV"],
  ]) {
    const governed = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
      repo: REPO, permission, target: join(dir, name), targetClass: "OPERATOR_CHOSEN_OUTPUT", bytes: body,
      action: what, occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    }));
    if (governed.outcome === "REFUSED") refused = true;
    else if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
      console.error(`🔴 ${governed.outcome} — ${join(dir, name)} was not written; the governed attempt is on the audit trail`);
      failed = true;
    }
  }
  if (refused) console.log(`\n[dry-run] --out ${outDir} was given but nothing was written. Add --confirm.`);
  else if (!failed) console.log(`\nwrote ${join(dir, "gate-a.json")} and gate-a.csv`);
  if (failed) process.exitCode = 1;
}

console.log("");
